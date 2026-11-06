const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    manufacturer: {
      type: String,
      required: [true, 'Manufacturer / Brand is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    composition: {
      type: String,
      required: [true, 'Active composition is required'],
      trim: true,
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Reference purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Base selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    image: {
      type: String,
      default: '',
    },
    imageFileId: {
      type: String,
      default: '',
    },
    prescriptionRequired: {
      type: Boolean,
      default: false,
    },
    minStockLevel: {
      type: Number,
      default: 20,
      min: 0,
    },
    unit: {
      type: String,
      default: 'Strip',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

medicineSchema.index({ name: 'text', composition: 'text', manufacturer: 'text' });

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
