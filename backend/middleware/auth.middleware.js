
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      
      // Find the user by ID from the token
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { authenticateToken, JWT_SECRET };
