const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challengeController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', challengeController.getChallenges);
router.get('/:id', challengeController.getChallengeById);

// Protected routes
router.use(protect);

// Student routes
router.post('/:id/submit', challengeController.submitSolution);

// Faculty routes
router.use(authorize('faculty'));
router.post('/', challengeController.createChallenge);
router.put('/:id', challengeController.updateChallenge);
router.delete('/:id', challengeController.deleteChallenge);

module.exports = router; 