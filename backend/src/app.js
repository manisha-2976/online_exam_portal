const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const {
  securityHeaders,
  apiLimiter,
  compressResponse,
  validateRequest,
  corsOptions
} = require('./middleware/security');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const questionRoutes = require('./routes/question.routes');
const examRoutes = require('./routes/exam.routes');
const userRoutes = require('./routes/user.routes');
const proctoringRoutes = require('./routes/proctoring.routes');
const adminRoutes = require('./routes/admin.routes');
const challengeRoutes = require('./routes/challenge.routes');

// Create Express app
const app = express();

// Enable CORS first
app.use(cors(corsOptions));

// Basic middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Security middleware
app.use(securityHeaders);
app.use(compressResponse);

// Request logging middleware
app.use((req, res, next) => {
  // Remove duplicate /api prefixes
  if (req.path.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }
  
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    ip: req.ip
  });
  next();
});

// Mount routes directly
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/users', userRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/challenges', challengeRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rate limiting after routes
app.use(apiLimiter);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  logger.error('Route not found:', {
    path: req.path,
    method: req.method,
    body: req.body,
    headers: req.headers
  });
  res.status(404).json({
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Export the app
module.exports = app; 