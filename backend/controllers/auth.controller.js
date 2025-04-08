
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth.middleware');

// Register new user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = await User.create({
      name,
      email,
      password, // Password will be hashed in the model's beforeCreate hook
      online: false
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Update user status to online
    user.online = true;
    await user.save();
    
    // Generate JWT token
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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    // User is already attached to req from the auth middleware
    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      online: req.user.online
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users (for contacts)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'online'],
      where: {
        id: { [User.sequelize.Op.ne]: req.user.id } // Exclude the current user
      }
    });
    
    res.json(users);
    
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
