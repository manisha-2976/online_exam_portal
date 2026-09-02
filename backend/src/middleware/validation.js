const { createError } = require('../utils/error');
const logger = require('../utils/logger');

// Validate exam creation/update data
exports.validateExam = (req, res, next) => {
  try {
    const { title, description, duration, startTime, endTime, totalMarks } = req.body;

    if (!title || !description || !duration || !startTime || !endTime || !totalMarks) {
      logger.warn('Invalid exam data provided');
      return next(createError(400, 'All required fields must be provided'));
    }

    // Validate time constraints
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start < now) {
      return next(createError(400, 'Start time cannot be in the past'));
    }

    if (end <= start) {
      return next(createError(400, 'End time must be after start time'));
    }

    // Validate duration and marks
    if (duration <= 0) {
      return next(createError(400, 'Duration must be greater than 0'));
    }

    if (totalMarks <= 0) {
      return next(createError(400, 'Total marks must be greater than 0'));
    }

    next();
  } catch (error) {
    logger.error(`Validation error: ${error.message}`);
    next(createError(400, 'Invalid exam data'));
  }
}; 