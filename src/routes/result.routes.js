const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');
const { verifyToken, isAdmin, isTeacher } = require('../middleware/auth');

// Get all results for current user
router.get('/my-results', 
  verifyToken, 
  resultController.getUserResults
);

// Get result by ID
router.get('/:id', 
  verifyToken, 
  resultController.getResultById
);

// Get all results for an exam (teachers and admin only)
router.get('/exam/:examId', 
  verifyToken, 
  isTeacher,
  resultController.getExamResults
);

// Get result analytics
router.get('/:id/analytics', 
  verifyToken, 
  resultController.getResultAnalytics
);

// Update result (admin only)
router.put('/:id', 
  verifyToken, 
  isAdmin,
  resultController.updateResult
);

// Delete result (admin only)
router.delete('/:id', 
  verifyToken, 
  isAdmin,
  resultController.deleteResult
);

module.exports = router; 