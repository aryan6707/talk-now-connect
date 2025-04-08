
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes - require authentication
router.get('/users/me', authenticateToken, authController.getCurrentUser);
router.get('/users', authenticateToken, authController.getAllUsers);
router.get('/users/:userId', authenticateToken, authController.getUserById);

module.exports = router;
