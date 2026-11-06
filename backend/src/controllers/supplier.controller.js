const Supplier = require('../models/supplier.model');

const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    return res.status(200).json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch suppliers',
    });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, companyName, email, phone, address, taxNumber } = req.body;
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name and phone are required',
      });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      companyName: companyName?.trim() || '',
      email: email?.trim() || '',
      phone: phone.trim(),
      address: address?.trim() || '',
      taxNumber: taxNumber?.trim() || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create supplier',
    });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await Supplier.findByIdAndUpdate(id, { status: 'inactive' });
    return res.status(200).json({
      success: true,
      message: 'Supplier deactivated successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};

