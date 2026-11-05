const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
} = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshAccessToken);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);

module.exports = router;

