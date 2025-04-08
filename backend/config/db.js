
const { Sequelize } = require('sequelize');

// Configure database connection
const sequelize = new Sequelize('chat_app', 'root', 'password', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, // Set to true for debugging
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test the connection
const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, testDbConnection };
