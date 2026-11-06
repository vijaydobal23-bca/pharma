const Sale = require('../models/sale.model');
const billingService = require('../services/billing.service');

/**
 * Create a new bill / POS transaction
 */
const createBill = async (req, res) => {
  try {
    const { customerData, items, paymentMethod, paymentDetails, notes } = req.body;

    const sale = await billingService.createBill({
      customerData,
      items,
      paymentMethod,
      paymentDetails,
      notes,
      user: req.user,
    });

    return res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: sale,
    });
  } catch (error) {
    console.error('Create Bill Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate bill',
    });
  }
};

/**
 * Get all sales history with filters and role authorization
 * Admins can view all; employees view all or can filter by themselves
 */
const getAllSales = async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      paymentMethod = 'all',
      startDate,
      endDate,
      soldBy,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    // If regular employee requests only their sales, or admin filters by employee
    const userRole = req.user.role === 'user' ? 'employee' : req.user.role;
    if (userRole === 'employee' && req.query.mineOnly === 'true') {
      query.soldBy = req.user._id;
    } else if (soldBy) {
      query.soldBy = soldBy;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get Sales Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch sales history',
    });
  }
};

/**
 * Get Single Sale Invoice Details
 */
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id).populate('customer');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch invoice',
    });
  }
};

/**
 * Cancel a Bill and Restore Stock
 */
const cancelBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const cancelledSale = await billingService.cancelBill(id, reason, req.user);

    return res.status(200).json({
      success: true,
      message: 'Bill cancelled and stock restored successfully',
      data: cancelledSale,
    });
  } catch (error) {
    console.error('Cancel Bill Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel bill',
    });
  }
};

/**
 * Process Return / Partial Refund
 */
const processReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnedItems, reason } = req.body;

    if (!returnedItems || !returnedItems.length) {
      return res.status(400).json({
        success: false,
        message: 'Returned items list is required',
      });
    }

    const result = await billingService.processReturn(id, returnedItems, reason, req.user);

    return res.status(200).json({
      success: true,
      message: 'Refund and return processed successfully',
      data: result,
    });
  } catch (error) {
    console.error('Process Return Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to process return',
    });
  }
};

module.exports = {
  createBill,
  getAllSales,
  getSaleById,
  cancelBill,
  processReturn,
};

