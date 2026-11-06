const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    medicineName: {
      type: String,
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryBatch',
      default: null,
    },
    batchNumber: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: [
        'PURCHASE_RECEIVE',
        'SALE',
        'SALE_RETURN',
        'ADJUSTMENT_ADD',
        'ADJUSTMENT_SUBTRACT',
        'EXPIRED_REMOVAL',
        'MANUAL_CORRECTION',
      ],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      default: 0,
    },
    newStock: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      default: '',
    },
    referenceId: {
      type: String,
      default: '',
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    performedByName: {
      type: String,
      default: 'System',
    },
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({ createdAt: -1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

module.exports = StockMovement;
