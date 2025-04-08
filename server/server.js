
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());

// In-memory storage (replace with MySQL in production)
const users = [];
const messages = [];
const onlineUsers = new Map();

// JWT Secret (use env variable in production)
const JWT_SECRET = "your-secret-key-here";

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    if (users.find(user => user.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      online: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    users.push(newUser);
    
    // Create JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Message Routes
app.get('/api/messages', authenticateToken, (req, res) => {
  try {
    const { userId, receiverId } = req.query;
    
    // Filter messages based on sender and receiver
    const filteredMessages = messages.filter(message => 
      (message.senderId === userId && message.receiverId === receiverId) ||
      (message.senderId === receiverId && message.receiverId === userId)
    );
    
    res.json(filteredMessages);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/send-message', authenticateToken, (req, res) => {
  try {
    const { content, receiverId, isGroupMessage } = req.body;
    const senderId = req.user.id;
    
    // Create new message
    const newMessage = {
      id: uuidv4(),
      senderId,
      receiverId,
      content,
      timestamp: new Date(),
      isRead: false,
      isGroupMessage: isGroupMessage || false
    };
    
    messages.push(newMessage);
    
    // Emit message to receiver via Socket.IO
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new_message', newMessage);
    }
    
    res.status(201).json(newMessage);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (for contacts list)
app.get('/api/users', authenticateToken, (req, res) => {
  const usersList = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    online: onlineUsers.has(user.id)
  })).filter(user => user.id !== req.user.id);
  
  res.json(usersList);
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Handle user coming online
  socket.on('user_online', (userId) => {
    if (userId) {
      console.log('User online:', userId);
      onlineUsers.set(userId, socket.id);
      
      // Broadcast to all other users that this user is online
      socket.broadcast.emit('user_status', { userId, online: true });
    }
  });
  
  // Handle typing indicator
  socket.on('typing', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit('typing_indicator', { senderId, isTyping: true });
    }
  });
  
  socket.on('stop_typing', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit('typing_indicator', { senderId, isTyping: false });
    }
  });
  
  // Handle private messaging
  socket.on('private_message', (message) => {
    const newMessage = {
      id: uuidv4(),
      ...message,
      timestamp: new Date(),
      isRead: false
    };
    
    messages.push(newMessage);
    
    // Send to recipient if online
    const receiverSocketId = onlineUsers.get(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new_message', newMessage);
    }
  });
  
  // Handle read receipts
  socket.on('mark_read', ({ messageId, userId }) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.isRead = true;
      
      // Notify sender that message was read
      const senderSocketId = onlineUsers.get(message.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message_read', { messageId });
      }
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find and remove user from online users
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        
        // Broadcast to all users that this user is offline
        socket.broadcast.emit('user_status', { userId, online: false });
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server };
