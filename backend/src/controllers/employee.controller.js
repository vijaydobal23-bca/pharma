const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Sale = require('../models/sale.model');
const EmployeeActivity = require('../models/employeeActivity.model');
const { uploadImage } = require('../services/imagekit.service');

/**
 * Get all employees (Admin only)
 */
const getAllEmployees = async (req, res) => {
  try {
    const { search = '', status = 'all' } = req.query;
    const query = { role: { $in: ['employee', 'user'] } };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const employees = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });

    // Enrich with total sales metrics
    const enriched = await Promise.all(
      employees.map(async (emp) => {
        const salesCount = await Sale.countDocuments({ soldBy: emp._id, status: 'completed' });
        return {
          ...emp.toObject(),
          salesCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch employees',
    });
  }
};

/**
 * Create Employee (Admin only - reuses User model and bcrypt auth)
 */
const createEmployee = async (req, res) => {
  try {
    const { name, email, password, phone, address, profileImage, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    let finalImageUrl = profileImage || '';
    if (req.file) {
      const uploadRes = await uploadImage(
        req.file.buffer,
        `emp_${Date.now()}_${req.file.originalname || 'avatar.jpg'}`,
        '/employees'
      );
      finalImageUrl = uploadRes.url;
    } else if (profileImage && profileImage.startsWith('data:image')) {
      const uploadRes = await uploadImage(
        profileImage,
        `emp_${Date.now()}.jpg`,
        '/employees'
      );
      finalImageUrl = uploadRes.url;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone?.trim() || '',
      address: address?.trim() || '',
      profileImage: finalImageUrl,
      role: role === 'admin' ? 'admin' : 'employee',
      joiningDate: new Date(),
      status: 'active',
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Employee account created successfully',
      data: employee,
    });
  } catch (error) {
    console.error('Create Employee Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create employee account',
    });
  }
};

/**
 * Update Employee details
 */
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, profileImage, status, isActive, role, password } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (address !== undefined) updateFields.address = address.trim();
    if (status) updateFields.status = status;
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (role) updateFields.role = role;

    if (req.file) {
      const uploadRes = await uploadImage(
        req.file.buffer,
        `emp_${id}_${Date.now()}.jpg`,
        '/employees'
      );
      updateFields.profileImage = uploadRes.url;
    } else if (profileImage && profileImage.startsWith('data:image')) {
      const uploadRes = await uploadImage(profileImage, `emp_${id}.jpg`, '/employees');
      updateFields.profileImage = uploadRes.url;
    }

    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(password, salt);
    }

    const updated = await User.findByIdAndUpdate(id, updateFields, { new: true }).select(
      '-password -refreshToken'
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Employee profile updated successfully',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update employee',
    });
  }
};

/**
 * Toggle Employee Active / Inactive Status
 */
const toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await User.findById(id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    employee.status = newStatus;
    employee.isActive = newStatus === 'active';
    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Employee account is now ${newStatus}`,
      data: employee,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Employee Sales & Purchase Activity
 */
const getEmployeeActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await User.findById(id).select('-password -refreshToken');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const sales = await Sale.find({ soldBy: id }).sort({ createdAt: -1 }).limit(25);
    const auditLogs = await EmployeeActivity.find({ user: id }).sort({ createdAt: -1 }).limit(50);

    const totalSalesAmount = sales
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + s.grandTotal, 0);

    return res.status(200).json({
      success: true,
      data: {
        employee,
        totalSalesAmount: Number(totalSalesAmount.toFixed(2)),
        totalSalesCount: sales.length,
        recentSales: sales,
        auditLogs,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch employee activity',
    });
  }
};

module.exports = {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getEmployeeActivity,
};

