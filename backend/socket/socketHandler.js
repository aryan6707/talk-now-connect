
const Message = require('../models/message.model');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth.middleware');

// Map to track online users: userId -> socketId
const onlineUsers = new Map();

const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      // Get token from handshake auth
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      // Verify token
      jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
          return next(new Error('Authentication error'));
        }
        
        // Attach user to socket
        socket.userId = decoded.id;
        next();
      });
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log('New client connected:', socket.id);
    
    try {
      // Update user status to online in database
      if (socket.userId) {
        console.log('User online:', socket.userId);
        
        const user = await User.findByPk(socket.userId);
        if (user) {
          user.online = true;
          await user.save();
          
          // Add to online users map
          onlineUsers.set(socket.userId, socket.id);
          
          // Broadcast to all other users that this user is online
          socket.broadcast.emit('user_status', { userId: socket.userId, online: true });
        }
      }
    } catch (error) {
      console.error('Socket connection error:', error);
    }
    
    // Handle typing indicator
    socket.on('typing', ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing_indicator', { senderId, isTyping: true });
      }
    });
    
    socket.on('stop_typing', ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing_indicator', { senderId, isTyping: false });
      }
    });
    
    // Handle private messaging
    socket.on('private_message', async (message) => {
      try {
        // Save message to database
        const newMessage = await Message.create({
          senderId: socket.userId,
          receiverId: message.receiverId,
          content: message.content,
          isRead: false,
          isGroupMessage: message.isGroupMessage || false,
          file_url: message.file_url || null
        });
        
        // Send to recipient if online
        const receiverSocketId = onlineUsers.get(message.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new_message', {
            id: newMessage.id,
            senderId: newMessage.senderId,
            receiverId: newMessage.receiverId,
            content: newMessage.content,
            isRead: newMessage.isRead,
            isGroupMessage: newMessage.isGroupMessage,
            file_url: newMessage.file_url,
            createdAt: newMessage.createdAt
          });
        }
      } catch (error) {
        console.error('Error saving private message:', error);
      }
    });
    
    // Handle read receipts
    socket.on('mark_read', async ({ messageId }) => {
      try {
        const message = await Message.findByPk(messageId);
        if (message) {
          message.isRead = true;
          await message.save();
          
          // Notify sender that message was read
          const senderSocketId = onlineUsers.get(message.senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit('message_read', { messageId });
          }
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      
      try {
        if (socket.userId) {
          // Update user status to offline
          const user = await User.findByPk(socket.userId);
          if (user) {
            user.online = false;
            await user.save();
          }
          
          // Remove from online users map
          onlineUsers.delete(socket.userId);
          
          // Broadcast to all users that this user is offline
          socket.broadcast.emit('user_status', { userId: socket.userId, online: false });
        }
      } catch (error) {
        console.error('Socket disconnection error:', error);
      }
    });
  });
};

module.exports = { setupSocketHandlers };
