const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { verifyAuth, isOwnerOrAdmin } = require('../middleware/auth');
const { validateRequest } = require('../middleware/security');

// Profile routes
router.get('/me', verifyAuth, userController.getCurrentUser);
router.put('/me', [
  verifyAuth,
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('currentPassword').optional().notEmpty().withMessage('Current password is required for password change'),
  body('newPassword').optional().matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  validateRequest
], userController.updateProfile);

// User management routes
router.get('/:id', verifyAuth, isOwnerOrAdmin, userController.getUserById);
router.put('/:id', verifyAuth, isOwnerOrAdmin, userController.updateUser);
router.delete('/:id', verifyAuth, isOwnerOrAdmin, userController.deleteUser);

module.exports = router; 