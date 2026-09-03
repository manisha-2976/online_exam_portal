
const express = require('express');
const router = express.Router();

const { body } = require('express-validator');

const examController = require('../controllers/exam.controller');
const { verifyAuth, isAdmin, isStudent } = require('../middleware/auth');
const { validateRequest } = require('../middleware/security');

// All exam routes require authentication
router.use(verifyAuth);

// Exam validation
const validateExam = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),

  body('duration')
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),

  body('startTime')
    .isISO8601()
    .withMessage('Invalid start time format'),

  body('endTime')
    .isISO8601()
    .withMessage('Invalid end time format'),

  body('questions')
    .isArray()
    .withMessage('Questions must be an array'),

  body('questions.*')
    .isMongoId()
    .withMessage('Invalid question ID'),

  validateRequest
];


// ============================================
// ADMIN ROUTES
// ============================================

// Get all exams
router.get('/', examController.getExams);

// Create exam
router.post(
  '/',
  [isAdmin, validateExam],
  examController.createExam
);

router.get('/results', examController.getResults);
// Get single exam
router.get('/:id', examController.getExamById);

// Update exam
router.put(
  '/:id',
  [isAdmin, validateExam],
  examController.updateExam
);

// Delete exam
router.delete(
  '/:id',
  isAdmin,
  examController.deleteExam
);

// Publish exam
router.post(
  '/:id/publish',
  isAdmin,
  examController.publishExam
);


// ============================================
// STUDENT ROUTES
// ============================================

// Start exam
router.post(
  '/:id/start',
  isStudent,
  examController.startExam
);

// Submit exam
router.post(
  '/:id/submit',
  [
    isStudent,
    validateRequest
  ],
  examController.submitExam
);

// Get student's submission for an exam
router.get(
  '/:examId/submission',
  isStudent,
  examController.getStudentSubmission
);



module.exports = router;