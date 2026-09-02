const express = require('express');
const router = express.Router();
const Proctoring = require('../models/proctoring.model');
const Exam = require('../models/exam.model');
const { verifyToken, isStudent } = require('../middleware/auth');

// Start proctoring session
router.post('/start', verifyToken, isStudent, async (req, res) => {
  try {
    const { examId } = req.body;
    
    // Check if exam exists and requires proctoring
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!exam.settings.requireProctoring) {
      return res.status(400).json({ message: 'This exam does not require proctoring' });
    }

    // Check if student is allowed to take this exam
    const studentExam = exam.allowedStudents.find(
      s => s.student.toString() === req.user._id.toString()
    );
    if (!studentExam) {
      return res.status(403).json({ message: 'You are not registered for this exam' });
    }

    // Create proctoring session
    const proctoring = new Proctoring({
      exam: examId,
      student: req.user._id,
      session: req.body.session,
      startTime: new Date(),
      settings: {
        faceDetectionEnabled: exam.settings.requireFaceDetection || true,
        eyeTrackingEnabled: exam.settings.requireEyeTracking || true,
        audioMonitoringEnabled: exam.settings.requireAudioMonitoring || true,
        tabSwitchingEnabled: exam.settings.requireTabMonitoring || true,
        systemMonitoringEnabled: exam.settings.requireSystemMonitoring || true,
        violationThresholds: {
          face: 0.8,
          eye: 0.7,
          audio: 0.6,
          tab: 3,
          system: 80
        }
      }
    });

    await proctoring.save();

    // Update student status in exam
    await exam.updateStudentStatus(
      req.user._id, 
      'started',
      req.body.ipAddress,
      req.body.browserInfo
    );

    res.status(201).json(proctoring);
  } catch (error) {
    res.status(500).json({ message: 'Error starting proctoring', error: error.message });
  }
});

// Report suspicious activity
router.post('/report', verifyToken, isStudent, async (req, res) => {
  try {
    const { examId, session } = req.body;
    
    // Find active proctoring session
    const proctoring = await Proctoring.findOne({
      exam: examId,
      student: req.user._id,
      session,
      status: { $ne: 'completed' }
    });

    if (!proctoring) {
      return res.status(404).json({ message: 'Active proctoring session not found' });
    }

    // Update proctoring data
    const updates = {
      $push: {}
    };

    // Face detection data
    if (req.body.faceDetection) {
      updates.$push.faceDetection = {
        timestamp: new Date(),
        ...req.body.faceDetection
      };
    }

    // Eye tracking data
    if (req.body.eyeTracking) {
      updates.$push.eyeTracking = {
        timestamp: new Date(),
        ...req.body.eyeTracking
      };
    }

    // Audio monitoring data
    if (req.body.audioMonitoring) {
      updates.$push.audioMonitoring = {
        timestamp: new Date(),
        ...req.body.audioMonitoring
      };
    }

    // Tab switching data
    if (req.body.tabSwitching) {
      updates.$push.tabSwitching = {
        timestamp: new Date(),
        ...req.body.tabSwitching
      };
    }

    // System monitoring data
    if (req.body.systemMonitoring) {
      updates.$push.systemMonitoring = {
        timestamp: new Date(),
        ...req.body.systemMonitoring
      };
    }

    // Check for violations
    const violations = [];
    
    if (req.body.faceDetection?.isViolation) {
      violations.push({
        type: 'face',
        timestamp: new Date(),
        details: 'Face not detected or multiple faces detected',
        severity: 'high'
      });
    }

    if (req.body.eyeTracking?.isViolation) {
      violations.push({
        type: 'eye',
        timestamp: new Date(),
        details: 'Suspicious eye movement detected',
        severity: 'medium'
      });
    }

    if (req.body.audioMonitoring?.isViolation) {
      violations.push({
        type: 'audio',
        timestamp: new Date(),
        details: 'Suspicious audio activity detected',
        severity: 'medium'
      });
    }

    if (req.body.tabSwitching?.isViolation) {
      violations.push({
        type: 'tab',
        timestamp: new Date(),
        details: 'Unauthorized tab switching detected',
        severity: 'high'
      });
    }

    if (req.body.systemMonitoring?.isViolation) {
      violations.push({
        type: 'system',
        timestamp: new Date(),
        details: 'Suspicious system activity detected',
        severity: 'high'
      });
    }

    if (violations.length > 0) {
      updates.$push.violations = { $each: violations };
    }

    await Proctoring.updateOne(
      { _id: proctoring._id },
      updates
    );

    res.json({ message: 'Proctoring data updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error reporting proctoring data', error: error.message });
  }
});

// End proctoring session
router.post('/end', verifyToken, isStudent, async (req, res) => {
  try {
    const { examId, session } = req.body;
    
    const proctoring = await Proctoring.findOne({
      exam: examId,
      student: req.user._id,
      session,
      status: { $ne: 'completed' }
    });

    if (!proctoring) {
      return res.status(404).json({ message: 'Active proctoring session not found' });
    }

    proctoring.endTime = new Date();
    proctoring.status = 'completed';
    await proctoring.save();

    res.json({ message: 'Proctoring session ended successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error ending proctoring session', error: error.message });
  }
});

module.exports = router; 