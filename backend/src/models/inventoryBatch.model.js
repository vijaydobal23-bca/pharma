const mongoose = require('mongoose');

const inventoryBatchSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'Medicine reference is required'],
      index: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
      index: true,
    },
    manufacturingDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Batch purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Batch selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    initialQuantity: {
      type: Number,
      required: [true, 'Initial quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    supplierName: {
      type: String,
      trim: true,
      default: '',
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'depleted', 'recalled'],
      default: 'active',
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: 'Aisle 1',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for FEFO queries: find available batches for medicine sorted by earliest expiry
inventoryBatchSchema.index({ medicine: 1, status: 1, quantity: 1, expiryDate: 1 });

const InventoryBatch = mongoose.model('InventoryBatch', inventoryBatchSchema);

module.exports = InventoryBatch;
