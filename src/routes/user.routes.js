const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { verifyToken, verifyOTP, isOwnerOrAdmin } = require('../middleware/auth');
const passport = require('passport');
const emailService = require('../services/email.service');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const logger = require('../utils/logger');
require('../config/passport-google');

// Validation middleware
const validateRegistration = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const validateLogin = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const validateOTP = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

// Routes
router.post('/register', validateRegistration, authController.register);
router.post('/verify-otp', validateOTP, authController.verifyOTPHandler);
router.post('/resend-otp', body('email').isEmail(), authController.resendOTP);
router.post('/login', validateLogin, authController.login);
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, isOwnerOrAdmin, authController.updateProfile);
router.put('/change-password', verifyToken, isOwnerOrAdmin, authController.changePassword);

// Google OAuth routes
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  authController.googleCallback
);

// Error handling middleware
router.use((err, req, res, next) => {
  logger.error('Route error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = router; 