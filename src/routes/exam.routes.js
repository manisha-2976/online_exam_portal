const express = require('express');
const router = express.Router();
const examController = require('../controllers/exam.controller');
const { verifyToken, isTeacher, isStudent } = require('../middleware/auth');
const { validateExam } = require('../middleware/validation');
const Exam = require('../models/exam.model');

// Protected routes
router.use(verifyToken);

// Routes for teachers/faculty and admins
const isTeacherOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'faculty' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Routes for teachers/faculty and admins
router.post('/', isTeacherOrAdmin, examController.createExam);
router.put('/:id', isTeacherOrAdmin, examController.updateExam);
router.delete('/:id', isTeacherOrAdmin, examController.deleteExam);
router.post('/:id/publish', isTeacherOrAdmin, examController.publishExam);

// Routes for all authenticated users
router.get('/', examController.getExams);
router.get('/:id', examController.getExamById);

// Student specific routes
router.post('/:id/start', verifyToken, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can start exams' });
    }

    console.log('Starting exam for student:', req.user._id);

    const exam = await Exam.findById(req.params.id)
      .populate({
        path: 'questions',
        select: '_id text options difficulty' // Only select needed fields
      });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    console.log('Found exam:', exam._id);

    // Check if exam is published
    if (!exam.isPublished) {
      return res.status(403).json({ message: 'This exam is not yet published' });
    }

    // Check time window
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    if (now < startTime) {
      return res.status(400).json({ 
        message: `Exam starts at ${startTime.toLocaleString()}` 
      });
    }

    if (now > endTime) {
      return res.status(400).json({ 
        message: `Exam ended at ${endTime.toLocaleString()}` 
      });
    }

    // Initialize student session
    if (!exam.allowedStudents) {
      exam.allowedStudents = [];
    }

    let studentEntry = exam.allowedStudents.find(
      s => s.student && s.student.toString() === req.user._id.toString()
    );

    if (studentEntry?.status === 'completed') {
      return res.status(400).json({ message: 'You have already completed this exam' });
    }

    if (!studentEntry) {
      studentEntry = {
        student: req.user._id,
        status: 'started',
        startedAt: now
      };
      exam.allowedStudents.push(studentEntry);
    }

    // Prepare questions
    let questions = exam.questions.map(q => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      difficulty: q.difficulty
    }));

    // Shuffle questions if enabled
    if (exam.settings?.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Save exam state
    await exam.save();

    console.log('Exam started successfully for student:', req.user._id);

    // Send response
    res.json({
      examId: exam._id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      startTime: studentEntry.startedAt,
      endTime: exam.endTime,
      questions: questions,
      timeLeft: Math.floor((endTime.getTime() - now.getTime()) / 1000) // Time left in seconds
    });

  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).json({ 
      message: 'Failed to start exam. Please try again.',
      error: error.message 
    });
  }
});

router.post('/:id/submit', verifyToken, isStudent, examController.submitExam);

// Record proctoring incident
router.post('/:examId/proctoring', 
  verifyToken, 
  examController.recordProctoring
);

// End proctoring session
router.post('/:examId/proctoring/end', 
  verifyToken, 
  examController.endProctoring
);

module.exports = router; 