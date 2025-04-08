
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All message routes require authentication
router.use(authenticateToken);

// Get messages
router.get('/', messageController.getMessages);

// Send a message
router.post('/send', messageController.sendMessage);

// Mark message as read
router.put('/:messageId/read', messageController.markAsRead);

module.exports = router;
