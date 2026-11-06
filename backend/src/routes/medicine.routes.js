const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicine.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

// All medicine routes require authentication
router.use(authenticateToken);

router.get('/filters', medicineController.getFiltersData);
router.get('/', medicineController.getAllMedicines);
router.get('/:id', medicineController.getMedicineById);

// Employees and Admins can manage medicines
router.post('/', authorize('employee', 'admin'), medicineController.createMedicine);
router.put('/:id', authorize('employee', 'admin'), medicineController.updateMedicine);
router.delete('/:id', authorize('employee', 'admin'), medicineController.deleteMedicine);

module.exports = router;

