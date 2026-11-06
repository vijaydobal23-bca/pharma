const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authenticateToken);

// Admin-only endpoints for employee management (supports multer profileImage upload)
router.get('/', authorize('admin'), employeeController.getAllEmployees);
router.post('/', authorize('admin'), upload.single('profileImage'), employeeController.createEmployee);
router.put('/:id', authorize('admin'), upload.single('profileImage'), employeeController.updateEmployee);
router.patch('/:id/toggle-status', authorize('admin'), employeeController.toggleEmployeeStatus);
router.get('/:id/activity', authorize('admin'), employeeController.getEmployeeActivity);

module.exports = router;

