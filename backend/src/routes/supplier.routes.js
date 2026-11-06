const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authenticateToken);

router.get('/', supplierController.getAllSuppliers);
router.post('/', authorize('employee', 'admin'), supplierController.createSupplier);
router.put('/:id', authorize('employee', 'admin'), supplierController.updateSupplier);
router.delete('/:id', authorize('employee', 'admin'), supplierController.deleteSupplier);

module.exports = router;
