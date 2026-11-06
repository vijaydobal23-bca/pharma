const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authenticateToken);

router.get('/', categoryController.getAllCategories);
router.post('/', authorize('employee', 'admin'), categoryController.createCategory);
router.put('/:id', authorize('employee', 'admin'), categoryController.updateCategory);
router.delete('/:id', authorize('employee', 'admin'), categoryController.deleteCategory);

module.exports = router;
