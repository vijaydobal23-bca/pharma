const Purchase = require('../models/purchase.model');
const InventoryBatch = require('../models/inventoryBatch.model');
const StockMovement = require('../models/stockMovement.model');
const EmployeeActivity = require('../models/employeeActivity.model');
const Medicine = require('../models/medicine.model');

/**
 * Generate Next Purchase Order Number: PO-YYYY-XXXXX
 */
const generatePurchaseOrderNumber = async () => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear + 1, 0, 1);

  const count = await Purchase.countDocuments({
    createdAt: { $gte: startOfYear, $lt: endOfYear },
  });

  const sequentialNumber = String(count + 1).padStart(5, '0');
  return `PO-${currentYear}-${sequentialNumber}`;
};

/**
 * Create a new Purchase Order (Does NOT update inventory)
 */
const createPurchaseOrder = async ({
  supplierId,
  supplierName,
  supplierPhone = '',
  items, // [ { medicineId, medicineName, batchNumber, manufacturingDate, expiryDate, quantity, purchasePrice, sellingPrice } ]
  status = 'Ordered',
  notes = '',
  user,
}) => {
  if (!items || items.length === 0) {
    throw new Error('At least one item is required for a purchase order');
  }

  const purchaseOrderNumber = await generatePurchaseOrderNumber();

  let totalAmount = 0;
  const processedItems = items.map((item) => {
    const qty = Number(item.quantity);
    const cost = Number(item.purchasePrice);
    const lineTotal = Number((qty * cost).toFixed(2));
    totalAmount += lineTotal;

    return {
      medicine: item.medicineId || item.medicine,
      medicineName: item.medicineName,
      batchNumber: item.batchNumber?.trim() || `BATCH-${Date.now().toString().slice(-6)}`,
      manufacturingDate: item.manufacturingDate || null,
      expiryDate: item.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // default 1 yr
      quantity: qty,
      receivedQuantity: 0,
      purchasePrice: cost,
      sellingPrice: Number(item.sellingPrice || cost * 1.3),
      totalAmount: lineTotal,
    };
  });

  const purchase = await Purchase.create({
    purchaseOrderNumber,
    supplier: supplierId || null,
    supplierName,
    supplierPhone,
    items: processedItems,
    totalAmount: Number(totalAmount.toFixed(2)),
    status: status || 'Ordered',
    createdBy: user?._id || user?.id,
    createdByName: user?.name || 'Staff',
    notes,
  });

  // Log activity
  await EmployeeActivity.create({
    user: user?._id || user?.id,
    userName: user?.name || 'Staff',
    userRole: user?.role || 'employee',
    action: 'CREATED_PURCHASE',
    description: `Created purchase order ${purchaseOrderNumber} from ${supplierName} ($${purchase.totalAmount})`,
    referenceId: purchaseOrderNumber,
    amount: purchase.totalAmount,
  });

  return purchase;
};

/**
 * Receive Purchase Order Stock: Updates inventory and creates InventoryBatches
 */
const receivePurchaseStock = async (purchaseId, receivedDetails = [], user) => {
  const purchase = await Purchase.findById(purchaseId);
  if (!purchase) {
    throw new Error('Purchase order not found');
  }

  if (purchase.status === 'Received') {
    throw new Error('This purchase order has already been fully received');
  }
  if (purchase.status === 'Cancelled') {
    throw new Error('Cannot receive a cancelled purchase order');
  }

  // Iterate over items and update inventory
  for (let i = 0; i < purchase.items.length; i++) {
    const item = purchase.items[i];
    const itemDetail = receivedDetails.find(
      (d) => d.batchNumber === item.batchNumber || d.medicineId?.toString() === item.medicine?.toString()
    );

    // Quantity to receive this turn
    const qtyToReceive = itemDetail
      ? Number(itemDetail.quantity)
      : item.quantity - (item.receivedQuantity || 0);

    if (qtyToReceive <= 0) continue;

    // 1. Create or Find Batch in Inventory
    let batch = await InventoryBatch.findOne({
      medicine: item.medicine,
      batchNumber: item.batchNumber,
    });

    if (batch) {
      batch.quantity += qtyToReceive;
      batch.initialQuantity += qtyToReceive;
      if (batch.status === 'depleted') batch.status = 'active';
      await batch.save();
    } else {
      batch = await InventoryBatch.create({
        medicine: item.medicine,
        batchNumber: item.batchNumber,
        manufacturingDate: item.manufacturingDate,
        expiryDate: item.expiryDate,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        initialQuantity: qtyToReceive,
        quantity: qtyToReceive,
        supplier: purchase.supplier,
        supplierName: purchase.supplierName,
        purchaseOrder: purchase._id,
        status: 'active',
      });
    }

    // Update Medicine default purchase/selling price
    await Medicine.findByIdAndUpdate(item.medicine, {
      $set: {
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
      },
    });

    // 2. Log Stock Movement
    await StockMovement.create({
      medicine: item.medicine,
      medicineName: item.medicineName,
      batch: batch._id,
      batchNumber: batch.batchNumber,
      type: 'PURCHASE_RECEIVE',
      quantity: qtyToReceive,
      previousStock: batch.quantity - qtyToReceive,
      newStock: batch.quantity,
      reason: `Received from PO ${purchase.purchaseOrderNumber}`,
      referenceId: purchase.purchaseOrderNumber,
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Staff',
    });

    item.receivedQuantity = (item.receivedQuantity || 0) + qtyToReceive;
  }

  // Determine overall status
  const allFullyReceived = purchase.items.every((it) => it.receivedQuantity >= it.quantity);
  purchase.status = allFullyReceived ? 'Received' : 'Partially Received';
  purchase.receivedAt = new Date();
  purchase.receivedBy = user?._id || user?.id;
  purchase.receivedByName = user?.name || 'Staff';
  await purchase.save();

  // Log Activity
  await EmployeeActivity.create({
    user: user?._id || user?.id,
    userName: user?.name || 'Staff',
    userRole: user?.role || 'employee',
    action: 'RECEIVED_PURCHASE',
    description: `Received stock for purchase order ${purchase.purchaseOrderNumber} (Status: ${purchase.status})`,
    referenceId: purchase.purchaseOrderNumber,
    amount: purchase.totalAmount,
  });

  return purchase;
};

module.exports = {
  createPurchaseOrder,
  receivePurchaseStock,
  generatePurchaseOrderNumber,
};

