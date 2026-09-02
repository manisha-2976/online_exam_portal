const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Proctoring = require('../models/proctoring.model');
const Result = require('../models/result.model');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all users with filters
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const { role, department, course, isActive, search } = req.query;
    const filter = {};

    // Apply filters
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (course) filter.course = course;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get user details by ID
router.get('/users/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('examHistory');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// Update user status (activate/deactivate)
router.patch('/users/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status', error: error.message });
  }
});

// Get proctoring reports with filters
router.get('/reports', verifyToken, isAdmin, async (req, res) => {
  try {
    const { examId, studentId, hasViolations, severity, startDate, endDate } = req.query;
    const filter = {};

    // Apply filters
    if (examId) filter.exam = examId;
    if (studentId) filter.student = studentId;
    if (hasViolations === 'true') {
      filter['violations.0'] = { $exists: true };
    }
    if (severity) {
      filter['violations.severity'] = severity;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    const reports = await Proctoring.find(filter)
      .populate('exam', 'title')
      .populate('student', 'name email')
      .sort({ startTime: -1 });

    // Aggregate violation statistics
    const violationStats = await Proctoring.aggregate([
      { $match: filter },
      { $unwind: '$violations' },
      {
        $group: {
          _id: '$violations.type',
          count: { $sum: 1 },
          highSeverity: {
            $sum: { $cond: [{ $eq: ['$violations.severity', 'high'] }, 1, 0] }
          },
          mediumSeverity: {
            $sum: { $cond: [{ $eq: ['$violations.severity', 'medium'] }, 1, 0] }
          },
          lowSeverity: {
            $sum: { $cond: [{ $eq: ['$violations.severity', 'low'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      reports,
      statistics: {
        totalSessions: reports.length,
        violationStats
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// Get detailed report by ID
router.get('/reports/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const report = await Proctoring.findById(req.params.id)
      .populate('exam', 'title description duration')
      .populate('student', 'name email')
      .populate({
        path: 'exam',
        populate: {
          path: 'createdBy',
          select: 'name email'
        }
      });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Get exam result for this session
    const result = await Result.findOne({
      exam: report.exam._id,
      student: report.student._id
    });

    res.json({
      report,
      result
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report', error: error.message });
  }
});

module.exports = router; 