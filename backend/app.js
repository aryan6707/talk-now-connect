
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { sequelize, testDbConnection } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const messageRoutes = require('./routes/message.routes');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Test database connection
testDbConnection();

// Sync database models
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database models synced');
  })
  .catch(err => {
    console.error('Unable to sync database models:', err);
  });

// Routes
app.use('/api', authRoutes);
app.use('/api/messages', messageRoutes);

// Simple health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

module.exports = app;
