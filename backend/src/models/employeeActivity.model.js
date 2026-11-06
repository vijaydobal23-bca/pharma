const mongoose = require('mongoose');

const employeeActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      default: 'employee',
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    referenceId: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

employeeActivitySchema.index({ createdAt: -1 });

const EmployeeActivity = mongoose.model('EmployeeActivity', employeeActivitySchema);

module.exports = EmployeeActivity;
