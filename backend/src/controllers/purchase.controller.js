const Purchase = require('../models/purchase.model');
const purchaseService = require('../services/purchase.service');

/**
 * Get all purchase orders with filters
 */
const getAllPurchases = async (req, res) => {
  try {
    const { status = 'all', search = '', page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ purchaseOrderNumber: regex }, { supplierName: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .populate('supplier')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      data: purchases,
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
      message: error.message || 'Failed to fetch purchase orders',
    });
  }
};

/**
 * Get Single Purchase Details
 */
const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findById(id).populate('supplier');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch purchase details',
    });
  }
};

/**
 * Create Purchase Order (Draft or Ordered, does not update stock)
 */
const createPurchase = async (req, res) => {
  try {
    const { supplierId, supplierName, supplierPhone, items, status, notes } = req.body;

    const purchase = await purchaseService.createPurchaseOrder({
      supplierId,
      supplierName,
      supplierPhone,
      items,
      status,
      notes,
      user: req.user,
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: purchase,
    });
  } catch (error) {
    console.error('Create Purchase Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create purchase order',
    });
  }
};

/**
 * Receive Stock for Purchase Order (Updates Inventory batches and stock movement)
 */
const receiveStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedDetails } = req.body;

    const updatedPurchase = await purchaseService.receivePurchaseStock(
      id,
      receivedDetails,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: 'Stock received and inventory successfully updated',
      data: updatedPurchase,
    });
  } catch (error) {
    console.error('Receive Stock Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to receive stock',
    });
  }
};

/**
 * Cancel Purchase Order
 */
const cancelPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    if (purchase.status === 'Received') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a purchase order that has already been received',
      });
    }

    purchase.status = 'Cancelled';
    await purchase.save();

    return res.status(200).json({
      success: true,
      message: 'Purchase order cancelled successfully',
      data: purchase,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  receiveStock,
  cancelPurchase,
};

