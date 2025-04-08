
const http = require('http');
const app = require('./app');
const { setupSocketHandlers } = require('./socket/socketHandler');
const socketIo = require('socket.io');

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.IO with CORS config
const io = socketIo(server, {
  cors: {
    origin: "*", // In production, specify allowed origins
    methods: ["GET", "POST"]
  }
});

// Set up socket handlers
setupSocketHandlers(io);

// Set port and start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
