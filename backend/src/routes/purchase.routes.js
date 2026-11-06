const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authenticateToken);

router.get('/', purchaseController.getAllPurchases);
router.get('/:id', purchaseController.getPurchaseById);

router.post('/', authorize('employee', 'admin'), purchaseController.createPurchase);
router.post('/:id/receive', authorize('employee', 'admin'), purchaseController.receiveStock);
router.post('/:id/cancel', authorize('employee', 'admin'), purchaseController.cancelPurchase);

module.exports = router;
