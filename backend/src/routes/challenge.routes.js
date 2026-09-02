const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const challengeController = require('../controllers/challenge.controller');
const { verifyAuth, isTeacher } = require('../middleware/auth');
const { validateRequest } = require('../middleware/security');

// Protected routes - all routes require authentication
router.use(verifyAuth);

// Challenge validation middleware
const validateChallenge = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('difficulty').isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('startDate').isISO8601().withMessage('Invalid start date format'),
  body('endDate').isISO8601().withMessage('Invalid end date format'),
  body('questions').isArray().withMessage('Questions must be an array'),
  body('questions.*').isMongoId().withMessage('Invalid question ID'),
  validateRequest
];

// CRUD operations
router.get('/', challengeController.getChallenges);
router.get('/:id', challengeController.getChallengeById);
router.post('/', [isTeacher, validateChallenge], challengeController.createChallenge);
router.put('/:id', [isTeacher, validateChallenge], challengeController.updateChallenge);
router.delete('/:id', isTeacher, challengeController.deleteChallenge);

// Challenge participation routes
router.post('/:id/start', challengeController.startChallenge);
router.post('/:id/submit', [
  body('answers').isArray().withMessage('Answers must be an array'),
  validateRequest
], challengeController.submitChallenge);

module.exports = router; 