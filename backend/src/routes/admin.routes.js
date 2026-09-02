const express = require('express');
const router = express.Router();
const { verifyAuth, isAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(verifyAuth, isAdmin);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // TODO: Implement dashboard statistics
    res.json({
      totalUsers: 0,
      totalExams: 0,
      totalQuestions: 0,
      activeExams: 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

module.exports = router; 