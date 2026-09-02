const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const questionController = require('../controllers/question.controller');
const { verifyAuth, isTeacher } = require('../middleware/auth');
const { validateRequest } = require('../middleware/security');

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log('Question Route accessed:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body
  });
  next();
});

// Protected routes
router.use(verifyAuth);

// Question validation middleware
const validateQuestion = [
  body('text').trim().notEmpty().withMessage('Question text is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('difficulty').isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
  body('options').isArray().withMessage('Options must be an array'),
  body('options.*').notEmpty().withMessage('Option cannot be empty'),
  body('correctOption').isInt({ min: 0 }).withMessage('Correct option must be a valid index'),
  validateRequest
];

// CRUD operations
router.get('/', questionController.getQuestions);
router.get('/:id', questionController.getQuestionById);
router.post('/', [isTeacher, validateQuestion], questionController.createQuestion);
router.put('/:id', [isTeacher, validateQuestion], questionController.updateQuestion);
router.delete('/:id', isTeacher, questionController.deleteQuestion);

module.exports = router; 