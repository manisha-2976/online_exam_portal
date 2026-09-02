const { body, param, query } = require('express-validator');
const User = require('../models/user.model');

// Common validation chains
const emailValidation = body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')
  .normalizeEmail();

const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const nameValidation = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Name must be between 2 and 50 characters long')
  .matches(/^[a-zA-Z\s]*$/)
  .withMessage('Name can only contain letters and spaces');

const roleValidation = body('role')
  .isIn(['student', 'teacher', 'faculty', 'admin'])
  .withMessage('Invalid role specified');

// Registration validation
const registerValidation = [
  nameValidation,
  emailValidation,
  passwordValidation,
  roleValidation,
  body('email').custom(async (value) => {
    const user = await User.findOne({ email: value });
    if (user) {
      throw new Error('Email is already registered');
    }
    return true;
  })
];

// Login validation
const loginValidation = [
  emailValidation,
  body('password').notEmpty().withMessage('Password is required')
];

// Update profile validation
const updateProfileValidation = [
  nameValidation.optional(),
  emailValidation.optional(),
  body('phoneNumber')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('profilePicture')
    .optional()
    .isURL()
    .withMessage('Profile picture must be a valid URL')
];

// Exam validation
const examValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters long'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters long'),
  body('duration')
    .isInt({ min: 5, max: 180 })
    .withMessage('Duration must be between 5 and 180 minutes'),
  body('startTime')
    .isISO8601()
    .withMessage('Invalid start time format')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  body('endTime')
    .isISO8601()
    .withMessage('Invalid end time format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    })
];

// Question validation
const questionValidation = [
  body('text')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Question text must be between 10 and 1000 characters long'),
  body('type')
    .isIn(['multiple_choice', 'true_false', 'short_answer', 'essay'])
    .withMessage('Invalid question type'),
  body('points')
    .isInt({ min: 1, max: 100 })
    .withMessage('Points must be between 1 and 100'),
  body('options')
    .if(body('type').equals('multiple_choice'))
    .isArray({ min: 2, max: 5 })
    .withMessage('Multiple choice questions must have between 2 and 5 options'),
  body('correctAnswer')
    .notEmpty()
    .withMessage('Correct answer is required')
];

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// ID validation
const idValidation = param('id')
  .isMongoId()
  .withMessage('Invalid ID format');

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  examValidation,
  questionValidation,
  paginationValidation,
  idValidation
}; 