const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    medicineName: {
      type: String,
      required: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    manufacturingDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseOrderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    supplierPhone: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: [
        (items) => items && items.length > 0,
        'At least one medicine item is required for a purchase order',
      ],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled'],
      default: 'Draft',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdByName: {
      type: String,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    receivedByName: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

purchaseSchema.index({ createdAt: -1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;

