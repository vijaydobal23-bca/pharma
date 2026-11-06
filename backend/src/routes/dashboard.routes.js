const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authenticateToken);

// Admin-only dashboard analytics
router.get('/admin', authorize('admin'), dashboardController.getAdminDashboard);

// Employee dashboard overview
router.get('/employee', authorize('employee', 'admin'), dashboardController.getEmployeeDashboard);

module.exports = router;

