const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../utils/token');

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const verifyAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = await verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

const verifyRefresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const decoded = await verifyToken(token, true);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn(`Non-admin access attempt by user: ${req.user?._id}`);
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

const isTeacher = (req, res, next) => {
  if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'faculty' && req.user.role !== 'admin')) {
    logger.warn(`Non-teacher/faculty/admin access attempt by user: ${req.user?._id}`);
    return res.status(403).json({ message: 'Access denied. Teachers, faculty, and admin only.' });
  }
  next();
};

const isStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'student') {
    logger.warn(`Non-student access attempt by user: ${req.user?._id}`);
    return res.status(403).json({ message: 'Access denied. Students only.' });
  }
  next();
};

const isOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Access denied. Authentication required.' });
  }
  
  if (req.user.role === 'admin' || req.user._id.toString() === req.params.id) {
    next();
  } else {
    logger.warn(`Unauthorized access attempt by user: ${req.user._id}`);
    res.status(403).json({ message: 'Access denied. Owner or admin only.' });
  }
};

module.exports = {
  authLimiter,
  verifyAuth,
  verifyRefresh,
  isAdmin,
  isTeacher,
  isStudent,
  isOwnerOrAdmin
}; 