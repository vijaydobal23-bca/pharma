const mongoose = require('mongoose');
const InventoryBatch = require('../models/inventoryBatch.model');
const Medicine = require('../models/medicine.model');
const StockMovement = require('../models/stockMovement.model');

/**
 * Get aggregated active stock for a medicine
 */
const getMedicineStock = async (medicineId) => {
  const now = new Date();
  const batches = await InventoryBatch.find({
    medicine: medicineId,
    status: 'active',
    quantity: { $gt: 0 },
    expiryDate: { $gt: now },
  });

  const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
  return {
    totalQuantity,
    batchCount: batches.length,
    batches,
  };
};

/**
 * Pick batches for dispensing using FEFO (First Expiry, First Out)
 * Strictly verifies expiryDate > now and sufficient quantity
 */
const pickBatchesFEFO = async (medicineId, requestedQuantity) => {
  const now = new Date();
  const availableBatches = await InventoryBatch.find({
    medicine: medicineId,
    status: 'active',
    quantity: { $gt: 0 },
    expiryDate: { $gt: now },
  }).sort({ expiryDate: 1 });

  const totalAvailable = availableBatches.reduce((acc, b) => acc + b.quantity, 0);
  if (totalAvailable < requestedQuantity) {
    throw new Error(
      `Insufficient non-expired stock. Requested: ${requestedQuantity}, Available: ${totalAvailable}`
    );
  }

  let remainingToDeduct = requestedQuantity;
  const pickedAllocations = [];

  for (const batch of availableBatches) {
    if (remainingToDeduct <= 0) break;

    const deductFromBatch = Math.min(batch.quantity, remainingToDeduct);
    pickedAllocations.push({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      purchasePrice: batch.purchasePrice,
      sellingPrice: batch.sellingPrice,
      quantityToDeduct: deductFromBatch,
      currentBatchQuantity: batch.quantity,
    });

    remainingToDeduct -= deductFromBatch;
  }

  return pickedAllocations;
};

/**
 * Deduct stock from an inventory batch safely
 */
const deductBatchStock = async ({
  batchId,
  quantity,
  reason = 'SALE',
  referenceId = '',
  performedBy = null,
  performedByName = 'System',
}) => {
  // Use atomic findOneAndUpdate with condition quantity >= toDeduct to prevent negative stock race conditions
  const batch = await InventoryBatch.findOneAndUpdate(
    { _id: batchId, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true }
  ).populate('medicine', 'name');

  if (!batch) {
    throw new Error(`Failed to deduct ${quantity} items from batch ${batchId}. Insufficient stock.`);
  }

  // Update status if depleted
  if (batch.quantity === 0) {
    batch.status = 'depleted';
    await batch.save();
  }

  // Record Stock Movement
  await StockMovement.create({
    medicine: batch.medicine._id,
    medicineName: batch.medicine.name || 'Unknown',
    batch: batch._id,
    batchNumber: batch.batchNumber,
    type: reason === 'SALE' ? 'SALE' : 'ADJUSTMENT_SUBTRACT',
    quantity: -quantity,
    previousStock: batch.quantity + quantity,
    newStock: batch.quantity,
    reason,
    referenceId,
    performedBy,
    performedByName,
  });

  return batch;
};

/**
 * Restore stock to a batch (used for refunds / cancellations)
 */
const restoreBatchStock = async ({
  batchId,
  quantity,
  reason = 'SALE_RETURN',
  referenceId = '',
  performedBy = null,
  performedByName = 'System',
}) => {
  const batch = await InventoryBatch.findById(batchId).populate('medicine', 'name');
  if (!batch) {
    throw new Error(`Batch with ID ${batchId} not found for stock restoration`);
  }

  const prev = batch.quantity;
  batch.quantity += quantity;
  if (batch.status === 'depleted' && batch.quantity > 0) {
    batch.status = 'active';
  }
  await batch.save();

  // Record Stock Movement
  await StockMovement.create({
    medicine: batch.medicine._id,
    medicineName: batch.medicine.name || 'Unknown',
    batch: batch._id,
    batchNumber: batch.batchNumber,
    type: 'SALE_RETURN',
    quantity,
    previousStock: prev,
    newStock: batch.quantity,
    reason,
    referenceId,
    performedBy,
    performedByName,
  });

  return batch;
};

/**
 * Adjust stock manually
 */
const adjustStock = async ({
  batchId,
  adjustmentType, // 'add' or 'subtract'
  quantity,
  reason,
  performedBy,
  performedByName,
}) => {
  const batch = await InventoryBatch.findById(batchId).populate('medicine', 'name');
  if (!batch) {
    throw new Error('Batch not found');
  }

  const prev = batch.quantity;
  let newQuantity;

  if (adjustmentType === 'add') {
    newQuantity = prev + quantity;
    batch.quantity = newQuantity;
    if (batch.status === 'depleted') batch.status = 'active';
  } else {
    if (prev < quantity) {
      throw new Error(`Cannot subtract ${quantity}. Only ${prev} available in batch.`);
    }
    newQuantity = prev - quantity;
    batch.quantity = newQuantity;
    if (newQuantity === 0) batch.status = 'depleted';
  }

  await batch.save();

  await StockMovement.create({
    medicine: batch.medicine._id,
    medicineName: batch.medicine.name || 'Unknown',
    batch: batch._id,
    batchNumber: batch.batchNumber,
    type: adjustmentType === 'add' ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUBTRACT',
    quantity: adjustmentType === 'add' ? quantity : -quantity,
    previousStock: prev,
    newStock: newQuantity,
    reason: reason || 'Manual adjustment',
    referenceId: `ADJ_${Date.now()}`,
    performedBy,
    performedByName,
  });

  return batch;
};

/**
 * Fetch Low-Stock and Expiring Batch Alerts
 */
const getInventoryAlerts = async () => {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(now.getDate() + 60);

  // Expiring soon batches (within 60 days)
  const expiringBatches = await InventoryBatch.find({
    status: 'active',
    quantity: { $gt: 0 },
    expiryDate: { $lte: sixtyDaysFromNow },
  })
    .populate('medicine', 'name category unit')
    .sort({ expiryDate: 1 });

  // Expired batches that still have quantity > 0
  const expiredBatches = await InventoryBatch.find({
    status: { $ne: 'expired' },
    quantity: { $gt: 0 },
    expiryDate: { $lte: now },
  }).populate('medicine', 'name category unit');

  // Low stock medicines
  const medicines = await Medicine.find({ status: 'active' });
  const lowStockMedicines = [];
  const outOfStockMedicines = [];

  for (const med of medicines) {
    const stockInfo = await getMedicineStock(med._id);
    if (stockInfo.totalQuantity === 0) {
      outOfStockMedicines.push({
        medicine: med,
        currentStock: 0,
        minStockLevel: med.minStockLevel,
      });
    } else if (stockInfo.totalQuantity <= med.minStockLevel) {
      lowStockMedicines.push({
        medicine: med,
        currentStock: stockInfo.totalQuantity,
        minStockLevel: med.minStockLevel,
      });
    }
  }

  return {
    expiringBatches,
    expiredBatches,
    lowStockMedicines,
    outOfStockMedicines,
  };
};

module.exports = {
  getMedicineStock,
  pickBatchesFEFO,
  deductBatchStock,
  restoreBatchStock,
  adjustStock,
  getInventoryAlerts,
};
