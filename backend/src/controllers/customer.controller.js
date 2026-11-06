const Customer = require('../models/customer.model');
const Sale = require('../models/sale.model');

/**
 * Get all customers with search and pagination
 */
const getAllCustomers = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const query = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ totalSpent: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      data: customers,
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
      message: error.message || 'Failed to fetch customers',
    });
  }
};

/**
 * Get Customer Profile and Invoices History
 */
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const invoices = await Sale.find({
      $or: [{ customer: id }, { customerPhone: customer.phone }],
    }).sort({ createdAt: -1 });

    const totalSpending = invoices
      .filter((s) => s.status !== 'cancelled')
      .reduce((sum, s) => sum + s.grandTotal, 0);

    return res.status(200).json({
      success: true,
      data: {
        customer,
        totalSpending: Number(totalSpending.toFixed(2)),
        invoices,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch customer profile',
    });
  }
};

/**
 * Create a new Customer
 */
const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, allergies } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and phone number are required',
      });
    }

    const existing = await Customer.findOne({ phone: phone.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A customer with this phone number already exists',
        data: existing,
      });
    }

    const customer = await Customer.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      address: address?.trim() || '',
      allergies: allergies || [],
    });

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create customer',
    });
  }
};

/**
 * Update Customer details
 */
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, req.body, { new: true });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update customer',
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
};
