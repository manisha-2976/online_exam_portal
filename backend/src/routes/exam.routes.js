const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const examController = require('../controllers/exam.controller');
const { verifyAuth, isTeacher, isStudent } = require('../middleware/auth');
const { validateRequest } = require('../middleware/security');
const Exam = require('../models/exam.model');
const Submission = require('../models/submission.model');
const Proctoring = require('../models/proctoring.model');

// Protected routes - all routes require authentication
router.use(verifyAuth);

// Exam validation middleware
const validateExam = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
  body('startTime').isISO8601().withMessage('Invalid start time format'),
  body('endTime').isISO8601().withMessage('Invalid end time format'),
  body('questions').isArray().withMessage('Questions must be an array'),
  body('questions.*').isMongoId().withMessage('Invalid question ID'),
  validateRequest
];

// Routes that don't need specific exam ID
router.get('/', examController.getExams);
router.post('/', [isTeacher, validateExam], examController.createExam);

// Routes that need specific exam ID
router.get('/:id', examController.getExamById);
router.put('/:id', [isTeacher, validateExam], examController.updateExam);
router.delete('/:id', isTeacher, examController.deleteExam);

// Exam participation routes
router.post('/:id/start', isStudent, examController.startExam);
router.post('/:id/submit', [
  isStudent,
  // Update validation to expect an object for answers
  // For example:
  // body('answers').isObject().withMessage('Answers must be an object'),
  // Consider more specific validation if needed, e.g., checking object keys/values
  validateRequest
], examController.submitExam);
router.post('/:id/publish', isTeacher, examController.publishExam);

// New endpoint to get a student's submission for a specific exam
router.get('/:examId/submission', isStudent, examController.getStudentSubmission);

module.exports = router; 