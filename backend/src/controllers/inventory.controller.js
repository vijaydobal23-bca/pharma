const InventoryBatch = require('../models/inventoryBatch.model');
const Medicine = require('../models/medicine.model');
const StockMovement = require('../models/stockMovement.model');
const inventoryService = require('../services/inventory.service');

/**
 * Get all inventory batches with filters
 */
const getAllBatches = async (req, res) => {
  try {
    const {
      medicineId,
      status = 'all',
      search = '',
      expiringWithinDays,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (medicineId) query.medicine = medicineId;
    if (status && status !== 'all') query.status = status;

    if (search.trim()) {
      query.batchNumber = new RegExp(search.trim(), 'i');
    }

    if (expiringWithinDays) {
      const now = new Date();
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + Number(expiringWithinDays));
      query.expiryDate = { $gte: now, $lte: targetDate };
      query.quantity = { $gt: 0 };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await InventoryBatch.countDocuments(query);
    const batches = await InventoryBatch.find(query)
      .populate('medicine', 'name category manufacturer unit minStockLevel')
      .populate('supplier', 'name companyName phone')
      .sort({ expiryDate: 1 })
      .skip(skip)
      .limit(Number(limit));

    const now = new Date();
    const enrichedBatches = batches.map((batch) => {
      const obj = batch.toObject();
      const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate) - now) / (1000 * 60 * 60 * 24));
      return {
        ...obj,
        daysUntilExpiry,
        isExpired: daysUntilExpiry <= 0,
        isNearExpiry: daysUntilExpiry > 0 && daysUntilExpiry <= 60,
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedBatches,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get Batches Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch inventory batches',
    });
  }
};

/**
 * Add a new Stock Batch directly
 * Supports both calendar expiryDate and expiry in days (e.g. expiryDays: 30)
 */
const addStockBatch = async (req, res) => {
  try {
    let {
      medicineId,
      batchNumber,
      manufacturingDate,
      expiryDate,
      expiryDays,
      purchasePrice,
      sellingPrice,
      quantity,
      supplierId,
      supplierName,
      location,
    } = req.body;

    // If expiryDays was supplied (e.g. 30, "30", or "30days"), calculate absolute expiryDate
    if (expiryDays !== undefined && expiryDays !== null && expiryDays !== '') {
      const parsedDays = parseInt(String(expiryDays).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedDays) && parsedDays > 0) {
        const calculatedDate = new Date();
        calculatedDate.setDate(calculatedDate.getDate() + parsedDays);
        expiryDate = calculatedDate.toISOString();
      }
    }

    if (!medicineId || !batchNumber || !expiryDate || quantity === undefined || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Medicine, batch number, expiry date (or expiry in days, e.g. 30 days), quantity, purchase price, and selling price are required',
      });
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    const targetExpiry = new Date(expiryDate);
    if (isNaN(targetExpiry.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expiry date format. Please specify a valid date or days (e.g. 30).',
      });
    }

    if (targetExpiry <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add a batch with past expiry date. Expiry must be in the future.',
      });
    }

    const daysUntilExpiry = Math.ceil((targetExpiry - new Date()) / (1000 * 60 * 60 * 24));

    const batch = await InventoryBatch.create({
      medicine: medicineId,
      batchNumber: batchNumber.trim(),
      manufacturingDate: manufacturingDate || null,
      expiryDate: targetExpiry,
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      initialQuantity: Number(quantity),
      quantity: Number(quantity),
      supplier: supplierId || null,
      supplierName: supplierName || '',
      location: location || 'Aisle 1',
      status: 'active',
    });

    // Record Stock Movement
    await StockMovement.create({
      medicine: medicine._id,
      medicineName: medicine.name,
      batch: batch._id,
      batchNumber: batch.batchNumber,
      type: 'PURCHASE_RECEIVE',
      quantity: Number(quantity),
      previousStock: 0,
      newStock: Number(quantity),
      reason: `Batch Entry (${daysUntilExpiry} days shelf life)`,
      referenceId: batch.batchNumber,
      performedBy: req.user?._id || req.user?.id,
      performedByName: req.user?.name || 'Staff',
    });

    return res.status(201).json({
      success: true,
      message: `Batch added successfully (Expires in ${daysUntilExpiry} days on ${targetExpiry.toLocaleDateString()})`,
      data: {
        ...batch.toObject(),
        daysUntilExpiry,
      },
    });
  } catch (error) {
    console.error('Add Batch Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add inventory batch',
    });
  }
};

/**
 * Update Batch Details
 */
const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // If expiryDays was supplied in update, calculate expiryDate
    if (updateData.expiryDays !== undefined && updateData.expiryDays !== null && updateData.expiryDays !== '') {
      const parsedDays = parseInt(String(updateData.expiryDays).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedDays) && parsedDays > 0) {
        const calculatedDate = new Date();
        calculatedDate.setDate(calculatedDate.getDate() + parsedDays);
        updateData.expiryDate = calculatedDate;
      }
    }

    const batch = await InventoryBatch.findByIdAndUpdate(id, updateData, { new: true });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: batch,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Adjust Stock (Add / Subtract / Damaged / Audit)
 */
const adjustStock = async (req, res) => {
  try {
    const { batchId, adjustmentType, quantity, reason } = req.body;

    if (!batchId || !adjustmentType || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID, adjustment type (add/subtract), and quantity are required',
      });
    }

    const updatedBatch = await inventoryService.adjustStock({
      batchId,
      adjustmentType,
      quantity: Number(quantity),
      reason,
      performedBy: req.user?._id || req.user?.id,
      performedByName: req.user?.name || 'Staff',
    });

    return res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: updatedBatch,
    });
  } catch (error) {
    console.error('Adjust Stock Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to adjust stock',
    });
  }
};

/**
 * Get Low-Stock, Out-of-Stock, and Expiring Alerts (configurable days, e.g. 30 or 60 days)
 */
const getAlerts = async (req, res) => {
  try {
    const daysThreshold = req.query.days ? Number(req.query.days) : 60;
    const alerts = await inventoryService.getInventoryAlerts(daysThreshold);
    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch inventory alerts',
    });
  }
};

/**
 * Get Stock Movement History / Audit Log
 */
const getStockMovements = async (req, res) => {
  try {
    const { medicineId, type, page = 1, limit = 50 } = req.query;
    const query = {};
    if (medicineId) query.medicine = medicineId;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await StockMovement.countDocuments(query);
    const movements = await StockMovement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      data: movements,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock movements',
    });
  }
};

module.exports = {
  getAllBatches,
  addStockBatch,
  updateBatch,
  adjustStock,
  getAlerts,
  getStockMovements,
};

