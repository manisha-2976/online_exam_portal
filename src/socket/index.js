const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const setupSocketHandlers = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    // Join exam room
    socket.on('join-exam', (examId) => {
      socket.join(`exam:${examId}`);
      console.log(`User ${socket.user._id} joined exam ${examId}`);
    });

    // Leave exam room
    socket.on('leave-exam', (examId) => {
      socket.leave(`exam:${examId}`);
      console.log(`User ${socket.user._id} left exam ${examId}`);
    });

    // Handle proctoring alerts
    socket.on('proctoring-alert', (data) => {
      const { examId, alertType, details } = data;
      
      // Emit alert to exam room (excluding the student who triggered it)
      socket.to(`exam:${examId}`).emit('proctoring-violation', {
        studentId: socket.user._id,
        studentName: socket.user.name,
        alertType,
        details,
        timestamp: new Date()
      });

      console.log(`Proctoring alert from ${socket.user._id} in exam ${examId}: ${alertType}`);
    });

    // Handle face detection data
    socket.on('face-detection', (data) => {
      const { examId, confidence } = data;
      
      if (confidence < 0.5) {
        socket.to(`exam:${examId}`).emit('face-detection-alert', {
          studentId: socket.user._id,
          studentName: socket.user.name,
          confidence,
          timestamp: new Date()
        });
      }
    });

    // Handle browser tab changes
    socket.on('browser-tab-change', (data) => {
      const { examId, url } = data;
      
      socket.to(`exam:${examId}`).emit('tab-change-alert', {
        studentId: socket.user._id,
        studentName: socket.user.name,
        url,
        timestamp: new Date()
      });
    });

    // Handle audio level changes
    socket.on('audio-level', (data) => {
      const { examId, level } = data;
      
      if (level > 0.8) {
        socket.to(`exam:${examId}`).emit('audio-alert', {
          studentId: socket.user._id,
          studentName: socket.user.name,
          level,
          timestamp: new Date()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user._id}`);
    });
  });
};

module.exports = {
  setupSocketHandlers
}; 