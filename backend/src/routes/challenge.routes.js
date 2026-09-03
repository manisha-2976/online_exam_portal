

const express = require('express');

const router = express.Router();

const { body } = require('express-validator');

const challengeController = require('../controllers/challenge.controller');

const {
  verifyAuth,
  isAdmin,
  isStudent
} = require('../middleware/auth');

const {
  validateRequest
} = require('../middleware/security');

const {
  SUPPORTED_LANGUAGES
} = require('../models/challenge.model');


// ============================================================
// VALIDATION
// ============================================================

const validateChallenge = [

  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),

  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),

  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date'),

  body('endDate')
    .isISO8601()
    .withMessage('Invalid end date'),

  body('challengeType')
    .optional()
    .isIn(['coding', 'bash'])
    .withMessage('Invalid challenge type'),

  body('allowedLanguages')
    .if(body('challengeType').not().equals('bash'))
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one language must be selected'),

  body('allowedLanguages.*')
    .if(body('challengeType').not().equals('bash'))
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage('Unsupported language'),

  body('testCases')
    .isArray({ min: 1 })
    .withMessage('At least one test case is required'),

  validateRequest
];


// ============================================================
// PUBLIC / GENERAL CHALLENGE ROUTES
// ============================================================

// Get all active challenges
router.get(
  '/',
  challengeController.getChallenges
);


// ============================================================
// AUTHENTICATION
// ============================================================

router.use(verifyAuth);


// ============================================================
// SUBMISSION ROUTES
// IMPORTANT: These MUST come before /:id
// ============================================================

// Admin → all challenge submissions
router.get(
  '/submissions',
  isAdmin,
  challengeController.getAllSubmissions
);

// Student → only their own submissions
router.get(
  '/submissions/my',
  isStudent,
  challengeController.getMySubmissions
);


// ============================================================
// CHALLENGE ROUTES
// ============================================================

// Get single challenge
router.get(
  '/:id',
  challengeController.getChallengeById
);

// Create challenge
router.post(
  '/',
  [isAdmin, validateChallenge],
  challengeController.createChallenge
);

// Update challenge
router.put(
  '/:id',
  [isAdmin, validateChallenge],
  challengeController.updateChallenge
);

// Delete challenge
router.delete(
  '/:id',
  isAdmin,
  challengeController.deleteChallenge
);


// ============================================================
// STUDENT CHALLENGE ACTIONS
// ============================================================

// Start challenge
router.post(
  '/:id/start',
  isStudent,
  challengeController.startChallenge
);

// Submit challenge
router.post(
  '/:id/submit',
  isStudent,
  challengeController.submitChallenge
);

// Get student's submission for one challenge
router.get(
  '/:id/submission',
  isStudent,
  challengeController.getChallengeSubmission
);


module.exports = router;