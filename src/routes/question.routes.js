const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');
const { verifyToken } = require('../middleware/auth');

// Protected routes
router.use(verifyToken);

// Routes for teachers/faculty and admins
const isTeacherOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'faculty' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// CRUD operations
router.get('/', questionController.getQuestions);
router.post('/', isTeacherOrAdmin, questionController.createQuestion);
router.put('/:id', isTeacherOrAdmin, questionController.updateQuestion);
router.delete('/:id', isTeacherOrAdmin, questionController.deleteQuestion);

module.exports = router; 