
const Message = require('../models/message.model');
const User = require('../models/user.model');
const { Op } = require('sequelize');

// Get messages between two users
exports.getMessages = async (req, res) => {
  try {
    const { userId, receiverId } = req.query;
    
    if (!userId || !receiverId) {
      return res.status(400).json({ message: 'User ID and receiver ID are required' });
    }
    
    // Find messages where either user is sender or receiver
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          {
            senderId: userId,
            receiverId: receiverId
          },
          {
            senderId: receiverId,
            receiverId: userId
          }
        ]
      },
      order: [['createdAt', 'ASC']] // Sort by timestamp ascending
    });
    
    res.json(messages);
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { content, receiverId, isGroupMessage } = req.body;
    const senderId = req.user.id; // From auth middleware
    
    if (!content || !receiverId) {
      return res.status(400).json({ message: 'Content and receiver ID are required' });
    }
    
    // Check if receiver exists
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }
    
    // Create new message
    const newMessage = await Message.create({
      senderId,
      receiverId,
      content,
      isRead: false,
      isGroupMessage: isGroupMessage || false,
      file_url: req.body.file_url || null
    });
    
    res.status(201).json(newMessage);
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Update message
    message.isRead = true;
    await message.save();
    
    res.json({ success: true, message: 'Message marked as read' });
    
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
