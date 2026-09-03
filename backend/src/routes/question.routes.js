
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const questionController = require('../controllers/question.controller');
const { verifyAuth, isAdmin } = require('../middleware/auth');
const { validateRequest } = require('../middleware/security');
const { SUPPORTED_CODING_LANGUAGES } = require('../models/question.model');

router.use((req, res, next) => {
  console.log('Question Route accessed:', {
    method: req.method,
    path: req.path,
    body: req.body
  });
  next();
});

router.use(verifyAuth);

const validateQuestion = [
  body('type').optional().isIn(['mcq', 'coding', 'bash']).withMessage('Invalid question type'),
  body('text').trim().notEmpty().withMessage('Question text is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('difficulty').isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
  body('options')
    .if(body('type').equals('mcq'))
    .isArray({ min: 4, max: 4 }).withMessage('MCQ questions must have exactly 4 options'),
  body('correctOption')
    .if(body('type').equals('mcq'))
    .isInt({ min: 0, max: 3 }).withMessage('Correct option must be a valid index'),
  body('supportedLanguages')
    .if(body('type').equals('coding'))
    .optional()
    .isArray({ min: 1 }).withMessage('Select at least one supported language'),
  body('supportedLanguages.*')
    .if(body('type').equals('coding'))
    .optional()
    .isIn(SUPPORTED_CODING_LANGUAGES).withMessage('Unsupported language'),
  validateRequest
];

router.get('/', questionController.getQuestions);
router.get('/:id', questionController.getQuestionById);
router.post('/', [isAdmin, validateQuestion], questionController.createQuestion);
router.put('/:id', [isAdmin, validateQuestion], questionController.updateQuestion);
router.delete('/:id', isAdmin, questionController.deleteQuestion);

module.exports = router;