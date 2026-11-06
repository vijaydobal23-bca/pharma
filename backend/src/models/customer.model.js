const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    allergies: {
      type: [String],
      default: [],
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalVisits: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ phone: 1, name: 1 });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;

