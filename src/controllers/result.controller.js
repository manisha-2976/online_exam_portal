const Result = require('../models/result.model');
const Exam = require('../models/exam.model');
const { createError } = require('../utils/error');
const logger = require('../utils/logger');

// Get all results for current user
exports.getUserResults = async (req, res, next) => {
  try {
    const results = await Result.find({ student: req.user._id })
      .populate('exam', 'title description')
      .sort({ createdAt: -1 });

    logger.info(`Retrieved ${results.length} results for user ${req.user._id}`);
    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (err) {
    logger.error(`Error getting user results: ${err.message}`);
    next(createError(500, 'Error retrieving results'));
  }
};

// Get result by ID
exports.getResultById = async (req, res, next) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('exam', 'title description questions')
      .populate('student', 'name email');

    if (!result) {
      logger.warn(`Result not found: ${req.params.id}`);
      return next(createError(404, 'Result not found'));
    }

    // Check if user has permission to view this result
    if (req.user.role !== 'admin' && 
        req.user.role !== 'teacher' && 
        result.student._id.toString() !== req.user._id.toString()) {
      logger.warn(`Unauthorized result access attempt by user ${req.user._id}`);
      return next(createError(403, 'You do not have permission to view this result'));
    }

    logger.info(`Retrieved result ${result._id} for user ${req.user._id}`);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    logger.error(`Error getting result by ID: ${err.message}`);
    next(createError(500, 'Error retrieving result'));
  }
};

// Get all results for an exam
exports.getExamResults = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      logger.warn(`Exam not found: ${req.params.examId}`);
      return next(createError(404, 'Exam not found'));
    }

    const results = await Result.find({ exam: req.params.examId })
      .populate('student', 'name email')
      .sort({ score: -1 });

    logger.info(`Retrieved ${results.length} results for exam ${exam._id}`);
    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (err) {
    logger.error(`Error getting exam results: ${err.message}`);
    next(createError(500, 'Error retrieving exam results'));
  }
};

// Get result analytics
exports.getResultAnalytics = async (req, res, next) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('exam', 'title questions');

    if (!result) {
      logger.warn(`Result not found: ${req.params.id}`);
      return next(createError(404, 'Result not found'));
    }

    // Check permission
    if (req.user.role !== 'admin' && 
        req.user.role !== 'teacher' && 
        result.student.toString() !== req.user._id.toString()) {
      logger.warn(`Unauthorized analytics access attempt by user ${req.user._id}`);
      return next(createError(403, 'You do not have permission to view these analytics'));
    }

    // Calculate analytics
    const analytics = {
      totalQuestions: result.answers.length,
      correctAnswers: result.answers.filter(a => a.isCorrect).length,
      incorrectAnswers: result.answers.filter(a => !a.isCorrect).length,
      score: result.score,
      percentage: result.percentage,
      timeTaken: result.endTime - result.startTime,
      questionAnalytics: result.answers.map((answer, index) => ({
        questionNumber: index + 1,
        question: result.exam.questions[index].text,
        isCorrect: answer.isCorrect,
        selectedOption: answer.selectedOption,
        marks: answer.marks
      })),
      proctoringSummary: result.proctoringSummary
    };

    logger.info(`Generated analytics for result ${result._id}`);
    res.status(200).json({
      status: 'success',
      data: analytics
    });
  } catch (err) {
    logger.error(`Error generating result analytics: ${err.message}`);
    next(createError(500, 'Error generating analytics'));
  }
};

// Update result (admin only)
exports.updateResult = async (req, res, next) => {
  try {
    const result = await Result.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!result) {
      logger.warn(`Result not found for update: ${req.params.id}`);
      return next(createError(404, 'Result not found'));
    }

    logger.info(`Updated result ${result._id}`);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    logger.error(`Error updating result: ${err.message}`);
    next(createError(500, 'Error updating result'));
  }
};

// Delete result (admin only)
exports.deleteResult = async (req, res, next) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);

    if (!result) {
      logger.warn(`Result not found for deletion: ${req.params.id}`);
      return next(createError(404, 'Result not found'));
    }

    logger.info(`Deleted result ${result._id}`);
    res.status(200).json({
      status: 'success',
      message: 'Result deleted successfully'
    });
  } catch (err) {
    logger.error(`Error deleting result: ${err.message}`);
    next(createError(500, 'Error deleting result'));
  }
}; 