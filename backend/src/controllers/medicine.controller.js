const Medicine = require('../models/medicine.model');
const InventoryBatch = require('../models/inventoryBatch.model');
const Category = require('../models/category.model');
const { uploadImage } = require('../services/imagekit.service');

/**
 * Get all medicines with search, category/manufacturer filter, and live stock calculation
 */
const getAllMedicines = async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      manufacturer = '',
      status = 'active',
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (manufacturer && manufacturer !== 'all') {
      query.manufacturer = new RegExp(manufacturer, 'i');
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { composition: searchRegex },
        { manufacturer: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    // Calculate live aggregated stock from active unexpired batches for each medicine
    const now = new Date();
    const medicineIds = medicines.map((m) => m._id);

    const batchAggregation = await InventoryBatch.aggregate([
      {
        $match: {
          medicine: { $in: medicineIds },
          status: 'active',
          quantity: { $gt: 0 },
          expiryDate: { $gt: now },
        },
      },
      {
        $group: {
          _id: '$medicine',
          totalStock: { $sum: '$quantity' },
          batchCount: { $sum: 1 },
          nearestExpiry: { $min: '$expiryDate' },
        },
      },
    ]);

    const stockMap = {};
    batchAggregation.forEach((item) => {
      stockMap[item._id.toString()] = {
        totalStock: item.totalStock,
        batchCount: item.batchCount,
        nearestExpiry: item.nearestExpiry,
      };
    });

    const enrichedMedicines = medicines.map((med) => {
      const stockInfo = stockMap[med._id.toString()] || {
        totalStock: 0,
        batchCount: 0,
        nearestExpiry: null,
      };
      return {
        ...med.toObject(),
        totalStock: stockInfo.totalStock,
        batchCount: stockInfo.batchCount,
        nearestExpiry: stockInfo.nearestExpiry,
        isLowStock: stockInfo.totalStock <= med.minStockLevel && stockInfo.totalStock > 0,
        isOutOfStock: stockInfo.totalStock === 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedMedicines,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get Medicines Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch medicines',
    });
  }
};

/**
 * Get single medicine details including batch history
 */
const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
    }

    const batches = await InventoryBatch.find({ medicine: id })
      .populate('supplier', 'name companyName phone')
      .sort({ expiryDate: 1 });

    const now = new Date();
    const activeBatches = batches.filter(
      (b) => b.status === 'active' && b.quantity > 0 && b.expiryDate > now
    );
    const totalStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0);

    return res.status(200).json({
      success: true,
      data: {
        medicine,
        totalStock,
        batches,
      },
    });
  } catch (error) {
    console.error('Get Medicine By Id Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch medicine details',
    });
  }
};

/**
 * Create a new medicine
 */
const createMedicine = async (req, res) => {
  try {
    const {
      name,
      category,
      manufacturer,
      description,
      composition,
      purchasePrice,
      sellingPrice,
      prescriptionRequired,
      minStockLevel,
      unit,
      status,
      image,
    } = req.body;

    if (!name || !category || !manufacturer || !composition || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, manufacturer, composition, purchase price, and selling price are required',
      });
    }

    // Handle ImageKit upload if image is provided as base64/data URI
    let imageUrl = image || '';
    let imageFileId = '';

    if (image && image.startsWith('data:image')) {
      const uploadRes = await uploadImage(image, `${name.toLowerCase().replace(/\s+/g, '_')}.jpg`, '/medicines');
      imageUrl = uploadRes.url;
      imageFileId = uploadRes.fileId;
    }

    const medicine = await Medicine.create({
      name: name.trim(),
      category: category.trim(),
      manufacturer: manufacturer.trim(),
      description: description?.trim() || '',
      composition: composition.trim(),
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      prescriptionRequired: Boolean(prescriptionRequired),
      minStockLevel: minStockLevel !== undefined ? Number(minStockLevel) : 20,
      unit: unit || 'Strip',
      status: status || 'active',
      image: imageUrl,
      imageFileId,
    });

    // Ensure category exists in Category collection
    await Category.findOneAndUpdate(
      { name: category.trim() },
      { $setOnInsert: { name: category.trim(), status: 'active' } },
      { upsert: true }
    );

    return res.status(201).json({
      success: true,
      message: 'Medicine created successfully',
      data: medicine,
    });
  } catch (error) {
    console.error('Create Medicine Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create medicine',
    });
  }
};

/**
 * Update medicine details
 */
const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.image && updateData.image.startsWith('data:image')) {
      const uploadRes = await uploadImage(updateData.image, `med_${id}.jpg`, '/medicines');
      updateData.image = uploadRes.url;
      updateData.imageFileId = uploadRes.fileId;
    }

    const medicine = await Medicine.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: medicine,
    });
  } catch (error) {
    console.error('Update Medicine Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update medicine',
    });
  }
};

/**
 * Delete or Deactivate Medicine
 */
const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
    }

    // Soft delete / deactivate
    medicine.status = 'inactive';
    await medicine.save();

    return res.status(200).json({
      success: true,
      message: 'Medicine deactivated successfully',
    });
  } catch (error) {
    console.error('Delete Medicine Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete medicine',
    });
  }
};

/**
 * Get distinct categories and manufacturers for filters
 */
const getFiltersData = async (req, res) => {
  try {
    const categories = await Medicine.distinct('category', { status: 'active' });
    const manufacturers = await Medicine.distinct('manufacturer', { status: 'active' });

    return res.status(200).json({
      success: true,
      data: {
        categories: categories.sort(),
        manufacturers: manufacturers.sort(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get filter metadata',
    });
  }
};

module.exports = {
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getFiltersData,
};
