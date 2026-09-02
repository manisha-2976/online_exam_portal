const express = require('express');
const router = express.Router();
const { verifyAuth } = require('../middleware/auth');

// Protect all proctoring routes
router.use(verifyAuth);

// Report an incident
router.post('/incident', async (req, res) => {
  try {
    // TODO: Implement incident reporting
    res.status(201).json({ message: 'Incident reported successfully' });
  } catch (error) {
    console.error('Proctoring error:', error);
    res.status(500).json({ message: 'Error reporting incident' });
  }
});

module.exports = router; 