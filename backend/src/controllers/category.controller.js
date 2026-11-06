const Category = require('../models/category.model');

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch categories',
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create category',
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, req.body, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Category updated',
      data: category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};

