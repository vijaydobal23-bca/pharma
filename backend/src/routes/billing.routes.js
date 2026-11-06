const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authenticateToken);

router.get('/sales', billingController.getAllSales);
router.get('/sales/:id', billingController.getSaleById);

router.post('/create-bill', authorize('employee', 'admin'), billingController.createBill);
router.post('/sales/:id/cancel', authorize('employee', 'admin'), billingController.cancelBill);
router.post('/sales/:id/return', authorize('employee', 'admin'), billingController.processReturn);

module.exports = router;
