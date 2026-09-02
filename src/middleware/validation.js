const { createError } = require('../utils/error');

// Validate exam creation/update
exports.validateExam = (req, res, next) => {
  const { title, description, duration, startTime, endTime, subject, questionCriteria, totalMarks, passingPercentage, proctoring, questions, selectedQuestions } = req.body;
  const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

  // For updates, only validate fields that are present
  if (!isUpdate) {
    if (!title || !description || !subject || !duration || !startTime || !endTime || !questionCriteria) {
      return next(createError(400, 'Missing required fields for exam creation'));
    }
  } else if (Object.keys(req.body).length === 0) {
    return next(createError(400, 'No fields provided for update'));
  }

  // Validate questions array if provided
  if (questions !== undefined) {
    if (!Array.isArray(questions)) {
      return next(createError(400, 'Questions must be an array'));
    }
    // Only validate questions array length for exam creation
    if (!isUpdate && questions.length === 0) {
      return next(createError(400, 'At least one question is required for exam creation'));
    }
  }

  // Validate selectedQuestions array if provided
  if (selectedQuestions !== undefined && !Array.isArray(selectedQuestions)) {
    return next(createError(400, 'Selected questions must be an array'));
  }

  // Title and description length validation only if they are provided
  if (title !== undefined) {
    if (title.length < 3 || title.length > 100) {
      return next(createError(400, 'Title must be between 3 and 100 characters'));
    }
  }
  
  if (description !== undefined) {
    if (description.length < 10 || description.length > 1000) {
      return next(createError(400, 'Description must be between 10 and 1000 characters'));
    }
  }

  // Validate duration, start time, and end time if provided
  if (duration !== undefined) {
    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum < 1) {
      return next(createError(400, 'Duration must be a positive number'));
    }
  } else if (!isUpdate) {
    return next(createError(400, 'Duration is required for exam creation'));
  }

  if (totalMarks !== undefined) {
    const marksNum = Number(totalMarks);
    if (isNaN(marksNum) || marksNum < 1) {
      return next(createError(400, 'Total marks must be a positive number'));
    }
  }

  if (passingPercentage !== undefined) {
    const percentageNum = Number(passingPercentage);
    if (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100) {
      return next(createError(400, 'Passing percentage must be between 0 and 100'));
    }
  }

  if ((startTime && !endTime) || (!startTime && endTime)) {
    return next(createError(400, 'Both start time and end time must be provided together'));
  }

  if (startTime && endTime) {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(createError(400, 'Invalid date format for start time or end time'));
    }

    if (!isUpdate && start <= now) {
      return next(createError(400, 'Start time must be in the future'));
    }

    if (end <= start) {
      return next(createError(400, 'End time must be after start time'));
    }
  } else if (!isUpdate) {
    return next(createError(400, 'Start time and end time are required for exam creation'));
  }

  // Validate questionCriteria if provided
  if (questionCriteria !== undefined) {
    if (typeof questionCriteria !== 'object' || questionCriteria === null) {
      return next(createError(400, 'Question criteria must be an object'));
    }

    const { easy = 0, medium = 0, hard = 0 } = questionCriteria;
    
    const validateCount = (count, type) => {
      const num = Number(count);
      if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
        return next(createError(400, `${type} question count must be a non-negative integer`));
      }
      return num;
    };

    const easyCount = validateCount(easy, 'Easy');
    const mediumCount = validateCount(medium, 'Medium');
    const hardCount = validateCount(hard, 'Hard');

    // For updates, allow zero total questions as it might be a partial update
    if (!isUpdate && (easyCount + mediumCount + hardCount) === 0) {
      return next(createError(400, 'At least one question is required in questionCriteria'));
    }
  } else if (!isUpdate) {
    return next(createError(400, 'Question criteria is required for exam creation'));
  }

  // Validate questions or selectedQuestions array if provided
  if (questions !== undefined && !Array.isArray(questions)) {
    return next(createError(400, 'Questions must be an array'));
  }
  if (selectedQuestions !== undefined) {
    if (!Array.isArray(selectedQuestions)) {
      return next(createError(400, 'Selected questions must be an array'));
    }
    // Validate that each selected question has required properties
    for (const question of selectedQuestions) {
      if (!question || typeof question !== 'object') {
        return next(createError(400, 'Each selected question must be a valid object'));
      }
      if (!question.difficulty || !['easy', 'medium', 'hard'].includes(question.difficulty)) {
        return next(createError(400, 'Each question must have a valid difficulty level (easy, medium, or hard)'));
      }
    }

    // For updates, only validate consistency if both questionCriteria and selectedQuestions are modified
    if (!isUpdate && questionCriteria) {
      const selectedQuestionsByDifficulty = {
        easy: selectedQuestions.filter(q => q.difficulty === 'easy').length,
        medium: selectedQuestions.filter(q => q.difficulty === 'medium').length,
        hard: selectedQuestions.filter(q => q.difficulty === 'hard').length
      };

      if (selectedQuestionsByDifficulty.easy !== questionCriteria.easy ||
          selectedQuestionsByDifficulty.medium !== questionCriteria.medium ||
          selectedQuestionsByDifficulty.hard !== questionCriteria.hard) {
        return next(createError(400, 'Selected questions must match the question distribution criteria'));
      }
    }
  }

  // Additional validation for exam settings if provided
  if (req.body.hasOwnProperty('proctoring')) {
    const { proctoring } = req.body;
    if (typeof proctoring !== 'object' || proctoring === null) {
      return next(createError(400, 'Proctoring settings must be an object'));
    }

    const { webcamEnabled, tabSwitchingEnabled, voiceDetectionEnabled } = proctoring;
    const validateBoolean = (value, fieldName) => {
      if (value !== undefined && typeof value !== 'boolean') {
        return next(createError(400, `${fieldName} must be a boolean value`));
      }
    };

    validateBoolean(webcamEnabled, 'webcamEnabled');
    validateBoolean(tabSwitchingEnabled, 'tabSwitchingEnabled');
    validateBoolean(voiceDetectionEnabled, 'voiceDetectionEnabled');
  }

  next();
};

// Validate user registration
exports.validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(createError(400, 'Missing required fields'));
  }

  // Name validation
  if (name.length < 2 || name.length > 50) {
    return next(createError(400, 'Name must be between 2 and 50 characters'));
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(createError(400, 'Invalid email format'));
  }

  // Password validation
  if (password.length < 6) {
    return next(createError(400, 'Password must be at least 6 characters'));
  }

  next();
};

// Validate profile update
exports.validateProfileUpdate = (req, res, next) => {
  const { name, email, phoneNumber } = req.body;

  if (!name || !email) {
    return next(createError(400, 'Name and email are required'));
  }

  // Name validation
  if (name.length < 2 || name.length > 50) {
    return next(createError(400, 'Name must be between 2 and 50 characters'));
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(createError(400, 'Invalid email format'));
  }

  // Phone number validation (optional)
  if (phoneNumber) {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return next(createError(400, 'Invalid phone number format'));
    }
  }

  next();
};