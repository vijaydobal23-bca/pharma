const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authenticateToken);

router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);

router.post('/', authorize('employee', 'admin'), customerController.createCustomer);
router.put('/:id', authorize('employee', 'admin'), customerController.updateCustomer);

module.exports = router;

