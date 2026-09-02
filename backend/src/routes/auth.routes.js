const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { verifyAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

// Validation middleware
const validateRegistration = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name').notEmpty().withMessage('Name is required'),
  body('role').isIn(['student', 'faculty', 'admin']).withMessage('Invalid role')
];

const validateLogin = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const validateOTP = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

// Auth routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/verify-otp', validateOTP, authController.verifyOTP);
router.post('/resend-otp', body('email').isEmail(), authController.resendOTP);
router.post('/logout', verifyAuth, authController.logout);
router.get('/me', verifyAuth, authController.getCurrentUser);
router.post('/refresh-token', authController.refreshToken);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

module.exports = router; 