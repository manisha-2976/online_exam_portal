const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('../utils/logger');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('No token provided or invalid token format');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    logger.info('Verifying token:', { token: token.substring(0, 10) + '...' }); // Log token prefix
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.info('Token decoded successfully:', { userId: decoded.userId });
      
      // Find user and check if they still exist and are active
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        logger.warn(`User not found for token: ${decoded.userId}`);
        return res.status(401).json({ message: 'User no longer exists' });
      }

      if (!user.isEmailVerified) {
        logger.warn(`Unverified user attempting access: ${user._id}`);
        return res.status(401).json({ message: 'Please verify your email first' });
      }

      // Attach user to request object
      req.user = user;
      logger.info('User authenticated successfully:', { 
        userId: user._id,
        role: user.role,
        email: user.email 
      });
      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn(`Non-admin access attempt by user: ${req.user?._id}`);
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const isTeacher = (req, res, next) => {
  if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'faculty')) {
    logger.warn(`Non-teacher access attempt by user: ${req.user?._id}`);
    return res.status(403).json({ message: 'Teacher access required' });
  }
  next();
};

const isStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'student') {
    logger.warn(`Non-student access attempt by user: ${req.user?._id}`);
    return res.status(403).json({ message: 'Student access required' });
  }
  next();
};

const isOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // For profile updates, the user is updating their own profile
  if (req.path === '/profile' && req.method === 'PUT') {
    return next();
  }

  const resourceId = req.params.id || req.body.userId;
  if (req.user.role === 'admin' || req.user._id.toString() === resourceId) {
    next();
  } else {
    logger.warn(`Unauthorized access attempt by user: ${req.user._id}`);
    return res.status(403).json({ message: 'Access denied' });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isTeacher,
  isStudent,
  isOwnerOrAdmin
}; 