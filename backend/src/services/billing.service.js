const Sale = require('../models/sale.model');
const Customer = require('../models/customer.model');
const InventoryBatch = require('../models/inventoryBatch.model');
const EmployeeActivity = require('../models/employeeActivity.model');
const inventoryService = require('./inventory.service');

/**
 * Generate Next Unique Invoice Number: INV-YYYY-XXXXX
 */
const generateInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear + 1, 0, 1);

  const count = await Sale.countDocuments({
    createdAt: { $gte: startOfYear, $lt: endOfYear },
  });

  const sequentialNumber = String(count + 1).padStart(5, '0');
  return `INV-${currentYear}-${sequentialNumber}`;
};

/**
 * Create a new bill / sale
 */
const createBill = async ({
  customerData, // { customerId, name, phone, address, allergies }
  items, // [ { medicineId, medicineName, requestedQuantity, customBatchId, discountPercent, taxPercent, unitPrice } ]
  paymentMethod = 'Cash',
  paymentDetails = {},
  notes = '',
  user,
}) => {
  if (!items || items.length === 0) {
    throw new Error('At least one medicine is required to generate a bill');
  }

  // 1. Resolve or Create Customer
  let customerId = customerData?.customerId || null;
  let customerName = customerData?.name?.trim() || 'Walk-in Customer';
  let customerPhone = customerData?.phone?.trim() || '';
  let customerAddress = customerData?.address?.trim() || '';

  if (customerPhone) {
    let existingCustomer = await Customer.findOne({ phone: customerPhone });
    if (!existingCustomer && customerName !== 'Walk-in Customer') {
      existingCustomer = await Customer.create({
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        allergies: customerData?.allergies || [],
      });
    }
    if (existingCustomer) {
      customerId = existingCustomer._id;
      customerName = existingCustomer.name;
    }
  }

  // 2. Validate and Allocate Batches (FEFO or explicit batch)
  const preparedItems = [];
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalProfit = 0;

  for (const item of items) {
    const qty = Number(item.requestedQuantity || item.quantity);
    if (!qty || qty <= 0) {
      throw new Error(`Invalid quantity for medicine ${item.medicineName || item.medicineId}`);
    }

    if (item.customBatchId) {
      // Pharmacist explicitly specified a specific batch
      const batch = await InventoryBatch.findById(item.customBatchId).populate('medicine');
      if (!batch) {
        throw new Error(`Selected batch ${item.customBatchId} not found`);
      }
      if (batch.quantity < qty) {
        throw new Error(
          `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${qty}`
        );
      }
      if (batch.expiryDate <= new Date()) {
        throw new Error(`Selected batch ${batch.batchNumber} has expired!`);
      }

      const unitPrice = Number(item.unitPrice || batch.sellingPrice);
      const purchasePrice = Number(batch.purchasePrice);
      const discountPct = Number(item.discountPercent || 0);
      const taxPct = Number(item.taxPercent || 0);

      const baseAmount = unitPrice * qty;
      const discountVal = (baseAmount * discountPct) / 100;
      const taxableAmount = baseAmount - discountVal;
      const taxVal = (taxableAmount * taxPct) / 100;
      const lineTotal = taxableAmount + taxVal;

      // Real Profit: (Selling Price - Purchase Price) * qty - Discount
      const lineProfit = (unitPrice - purchasePrice) * qty - discountVal;

      preparedItems.push({
        batchId: batch._id,
        itemRecord: {
          medicine: batch.medicine._id,
          medicineName: batch.medicine.name,
          batch: batch._id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          quantity: qty,
          unitPrice,
          purchasePrice,
          discountPercent: discountPct,
          taxPercent: taxPct,
          totalPrice: Number(lineTotal.toFixed(2)),
          returnedQuantity: 0,
        },
        deductQty: qty,
        lineProfit,
        lineDiscount: discountVal,
        lineTax: taxVal,
        baseAmount,
      });

      subtotal += baseAmount;
      totalDiscount += discountVal;
      totalTax += taxVal;
      totalProfit += lineProfit;
    } else {
      // Automatic FEFO Allocation
      const allocations = await inventoryService.pickBatchesFEFO(item.medicineId, qty);

      for (const alloc of allocations) {
        const unitPrice = Number(item.unitPrice || alloc.sellingPrice);
        const purchasePrice = Number(alloc.purchasePrice);
        const discountPct = Number(item.discountPercent || 0);
        const taxPct = Number(item.taxPercent || 0);

        const baseAmount = unitPrice * alloc.quantityToDeduct;
        const discountVal = (baseAmount * discountPct) / 100;
        const taxableAmount = baseAmount - discountVal;
        const taxVal = (taxableAmount * taxPct) / 100;
        const lineTotal = taxableAmount + taxVal;
        const lineProfit = (unitPrice - purchasePrice) * alloc.quantityToDeduct - discountVal;

        preparedItems.push({
          batchId: alloc.batchId,
          itemRecord: {
            medicine: item.medicineId,
            medicineName: item.medicineName,
            batch: alloc.batchId,
            batchNumber: alloc.batchNumber,
            expiryDate: alloc.expiryDate,
            quantity: alloc.quantityToDeduct,
            unitPrice,
            purchasePrice,
            discountPercent: discountPct,
            taxPercent: taxPct,
            totalPrice: Number(lineTotal.toFixed(2)),
            returnedQuantity: 0,
          },
          deductQty: alloc.quantityToDeduct,
          lineProfit,
          lineDiscount: discountVal,
          lineTax: taxVal,
          baseAmount,
        });

        subtotal += baseAmount;
        totalDiscount += discountVal;
        totalTax += taxVal;
        totalProfit += lineProfit;
      }
    }
  }

  const grandTotal = Number((subtotal - totalDiscount + totalTax).toFixed(2));
  const invoiceNumber = await generateInvoiceNumber();

  // 3. Atomically Deduct Stock from Batches
  const deductedBatches = [];
  try {
    for (const prep of preparedItems) {
      await inventoryService.deductBatchStock({
        batchId: prep.batchId,
        quantity: prep.deductQty,
        reason: 'SALE',
        referenceId: invoiceNumber,
        performedBy: user?._id || user?.id,
        performedByName: user?.name || 'Staff',
      });
      deductedBatches.push(prep);
    }
  } catch (deductError) {
    // Rollback any batches that were already deducted
    for (const rolled of deductedBatches) {
      try {
        await inventoryService.restoreBatchStock({
          batchId: rolled.batchId,
          quantity: rolled.deductQty,
          reason: 'SALE_ROLLBACK',
          referenceId: invoiceNumber,
          performedBy: user?._id || user?.id,
          performedByName: user?.name || 'Staff',
        });
      } catch (rbErr) {
        console.error('Critical Rollback Error:', rbErr);
      }
    }
    throw deductError;
  }

  // 4. Create Sale Record
  const sale = await Sale.create({
    invoiceNumber,
    customer: customerId,
    customerName,
    customerPhone,
    customerAddress,
    items: preparedItems.map((p) => p.itemRecord),
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(totalDiscount.toFixed(2)),
    taxAmount: Number(totalTax.toFixed(2)),
    grandTotal,
    totalProfit: Number(totalProfit.toFixed(2)),
    paymentMethod,
    paymentDetails: {
      amountTendered: Number(paymentDetails.amountTendered || grandTotal),
      changeDue: Number(
        Math.max(0, (paymentDetails.amountTendered || grandTotal) - grandTotal).toFixed(2)
      ),
      transactionRef: paymentDetails.transactionRef || '',
    },
    status: 'completed',
    soldBy: user?._id || user?.id,
    soldByName: user?.name || 'Pharmacist',
    notes,
  });

  // 5. Update Customer Statistics
  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: {
        totalSpent: grandTotal,
        totalVisits: 1,
      },
    });
  }

  // 6. Log Employee Activity
  await EmployeeActivity.create({
    user: user?._id || user?.id,
    userName: user?.name || 'Staff',
    userRole: user?.role || 'employee',
    action: 'CREATED_BILL',
    description: `Generated bill ${invoiceNumber} for ${customerName} ($${grandTotal})`,
    referenceId: invoiceNumber,
    amount: grandTotal,
  });

  return sale;
};

/**
 * Cancel Bill and Restore Stock
 */
const cancelBill = async (saleId, reason = 'Customer Cancellation', user) => {
  const sale = await Sale.findById(saleId);
  if (!sale) {
    throw new Error('Sale not found');
  }

  if (sale.status === 'cancelled') {
    throw new Error('This bill has already been cancelled');
  }

  // Restore stock for all non-returned items
  for (const item of sale.items) {
    const unreturnedQty = item.quantity - (item.returnedQuantity || 0);
    if (unreturnedQty > 0) {
      await inventoryService.restoreBatchStock({
        batchId: item.batch,
        quantity: unreturnedQty,
        reason: 'BILL_CANCELLED',
        referenceId: sale.invoiceNumber,
        performedBy: user?._id || user?.id,
        performedByName: user?.name || 'Staff',
      });
      item.returnedQuantity = item.quantity;
    }
  }

  sale.status = 'cancelled';
  sale.notes = `${sale.notes ? sale.notes + ' | ' : ''}Cancelled: ${reason}`;
  await sale.save();

  // Deduct from customer totalSpent if applicable
  if (sale.customer) {
    await Customer.findByIdAndUpdate(sale.customer, {
      $inc: { totalSpent: -sale.grandTotal },
    });
  }

  // Log Activity
  await EmployeeActivity.create({
    user: user?._id || user?.id,
    userName: user?.name || 'Staff',
    userRole: user?.role || 'employee',
    action: 'CANCELLED_BILL',
    description: `Cancelled bill ${sale.invoiceNumber}: ${reason}`,
    referenceId: sale.invoiceNumber,
    amount: -sale.grandTotal,
  });

  return sale;
};

/**
 * Process Medicine Return / Partial Refund
 */
const processReturn = async (saleId, returnedItems, returnReason, user) => {
  // returnedItems: [ { batchId, quantity } ]
  const sale = await Sale.findById(saleId);
  if (!sale) {
    throw new Error('Sale record not found');
  }

  if (sale.status === 'cancelled') {
    throw new Error('Cannot process return on an already cancelled bill');
  }

  let totalRefundAmount = 0;

  for (const ret of returnedItems) {
    const saleItem = sale.items.find(
      (it) => it.batch.toString() === ret.batchId.toString() || it.medicine.toString() === ret.medicineId?.toString()
    );

    if (!saleItem) {
      throw new Error(`Item with batch ${ret.batchId} not found in this invoice`);
    }

    const availableToReturn = saleItem.quantity - (saleItem.returnedQuantity || 0);
    if (ret.quantity > availableToReturn) {
      throw new Error(
        `Cannot return ${ret.quantity}. Only ${availableToReturn} eligible for return.`
      );
    }

    // Restore stock to the batch
    await inventoryService.restoreBatchStock({
      batchId: saleItem.batch,
      quantity: ret.quantity,
      reason: `RETURN: ${returnReason || 'Customer return'}`,
      referenceId: sale.invoiceNumber,
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Staff',
    });

    saleItem.returnedQuantity = (saleItem.returnedQuantity || 0) + ret.quantity;

    // Calculate line refund amount
    const unitPriceAfterDiscount =
      saleItem.unitPrice * (1 - (saleItem.discountPercent || 0) / 100);
    const lineRefund = unitPriceAfterDiscount * ret.quantity * (1 + (saleItem.taxPercent || 0) / 100);
    totalRefundAmount += lineRefund;
  }

  // Update sale status
  const allFullyReturned = sale.items.every((it) => it.returnedQuantity >= it.quantity);
  sale.status = allFullyReturned ? 'refunded' : 'partially_refunded';
  await sale.save();

  if (sale.customer) {
    await Customer.findByIdAndUpdate(sale.customer, {
      $inc: { totalSpent: -Number(totalRefundAmount.toFixed(2)) },
    });
  }

  // Log Activity
  await EmployeeActivity.create({
    user: user?._id || user?.id,
    userName: user?.name || 'Staff',
    userRole: user?.role || 'employee',
    action: 'PROCESSED_REFUND',
    description: `Processed return on ${sale.invoiceNumber} ($${totalRefundAmount.toFixed(2)})`,
    referenceId: sale.invoiceNumber,
    amount: -Number(totalRefundAmount.toFixed(2)),
  });

  return {
    sale,
    refundAmount: Number(totalRefundAmount.toFixed(2)),
  };
};

module.exports = {
  createBill,
  cancelBill,
  processReturn,
  generateInvoiceNumber,
};

