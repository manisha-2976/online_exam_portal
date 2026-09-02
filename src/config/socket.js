const socketIO = require('socket.io');
const logger = require('../utils/logger');

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  // Store connected users
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    logger.info('New client connected');

    // Handle user authentication
    socket.on('authenticate', (userData) => {
      const { userId, role } = userData;
      connectedUsers.set(userId, { socketId: socket.id, role });
      socket.userId = userId;
      socket.role = role;
      logger.info(`User ${userId} (${role}) connected`);
    });

    // Handle cheating detection events
    socket.on('cheating_detected', (data) => {
      const { studentId, examId, type, details } = data;
      
      // Notify faculty members
      connectedUsers.forEach((user, id) => {
        if (user.role === 'faculty') {
          io.to(user.socketId).emit('cheating_alert', {
            studentId,
            examId,
            type,
            details,
            timestamp: new Date()
          });
        }
      });

      // Notify admin
      connectedUsers.forEach((user, id) => {
        if (user.role === 'admin') {
          io.to(user.socketId).emit('cheating_alert', {
            studentId,
            examId,
            type,
            details,
            timestamp: new Date()
          });
        }
      });

      // Send warning to student
      const studentSocket = connectedUsers.get(studentId);
      if (studentSocket) {
        io.to(studentSocket.socketId).emit('cheating_warning', {
          type,
          details,
          timestamp: new Date()
        });
      }
    });

    // Handle exam status updates
    socket.on('exam_status_update', (data) => {
      const { examId, status, details } = data;
      
      // Broadcast to all connected users
      io.emit('exam_status', {
        examId,
        status,
        details,
        timestamp: new Date()
      });
    });

    socket.on('join-exam', (_id) => {
      socket.join(`exam-${_id}`);
      logger.info(`Client joined exam room: ${_id}`);
    });

    socket.on('leave-exam', (_id) => {
      socket.leave(`exam-${_id}`);
      logger.info(`Client left exam room: ${_id}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        logger.info(`User ${socket.userId} disconnected`);
      }
      logger.info('Client disconnected');
    });
  });

  return io;
};

module.exports = initializeSocket; 