const Exam = require('../models/exam.model');
const Result = require('../models/result.model');
const QuestionService = require('../services/question.service');
const { createError } = require('../utils/error');
const logger = require('../utils/logger');
const Question = require('../models/question.model');

// Create a new exam
exports.createExam = async (req, res, next) => {
  try {
    const { title, description, duration, startTime, endTime, subject, questionCriteria } = req.body;

    // Validate question criteria
    const totalQuestions = Object.values(questionCriteria).reduce((sum, count) => sum + count, 0);
    if (totalQuestions === 0) {
      return next(createError(400, 'At least one question is required'));
    }

    // Select random questions based on criteria
    const selectedQuestions = await QuestionService.selectQuestions(subject, questionCriteria);

    // Create exam with selected questions
    const exam = new Exam({
      title,
      description,
      duration,
      startTime,
      endTime,
      subject,
      questionCriteria,
      questions: selectedQuestions,
      createdBy: req.user._id,
      status: 'draft' // Always create as draft first
    });

    await exam.save();
    logger.info(`New exam created: ${exam._id} by user: ${req.user._id}`);

    // Populate questions for response
    await exam.populate('questions', '-is_used -last_used');

    res.status(201).json(exam);
  } catch (err) {
    logger.error(`Error creating exam: ${err.message}`);
    next(createError(500, err.message));
  }
};

// Publish exam
exports.publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return next(createError(404, 'Exam not found'));
    }

    // Check if user is authorized
    if (exam.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(createError(403, 'Not authorized to publish this exam'));
    }

    // Validate exam can be published
    if (exam.status !== 'draft') {
      return next(createError(400, 'Only draft exams can be published'));
    }

    // Check if enough questions are available based on criteria
    const totalQuestionsNeeded = 
      exam.questionCriteria.easy + 
      exam.questionCriteria.medium + 
      exam.questionCriteria.hard;

    // Fetch random questions based on criteria
    const easyQuestions = await Question.aggregate([
      { $match: { 
        difficulty: 'easy', 
        subject: exam.subject,
        isActive: true,
        usedInExams: { $size: 0 } // Only get questions not used in any exam
      }},
      { $sample: { size: exam.questionCriteria.easy } }
    ]);

    const mediumQuestions = await Question.aggregate([
      { $match: { 
        difficulty: 'medium', 
        subject: exam.subject,
        isActive: true,
        usedInExams: { $size: 0 }
      }},
      { $sample: { size: exam.questionCriteria.medium } }
    ]);

    const hardQuestions = await Question.aggregate([
      { $match: { 
        difficulty: 'hard', 
        subject: exam.subject,
        isActive: true,
        usedInExams: { $size: 0 }
      }},
      { $sample: { size: exam.questionCriteria.hard } }
    ]);

    const selectedQuestions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];

    if (selectedQuestions.length < totalQuestionsNeeded) {
      return next(createError(400, 'Not enough questions available for the specified criteria'));
    }

    // Add questions to exam
    exam.questions = selectedQuestions.map(q => q._id);
    
    // Mark questions as used and inactive (effectively removing them from available pool)
    await Question.updateMany(
      { _id: { $in: exam.questions } },
      { 
        $push: { usedInExams: exam._id },
        isActive: false
      }
    );

    // Update exam status and save
    exam.status = new Date() <= new Date(exam.startTime) ? 'upcoming' : 'ongoing';
    await exam.save();

    logger.info(`Exam published: ${exam._id} by user: ${req.user._id}`);
    res.json(exam);
  } catch (err) {
    logger.error(`Error publishing exam: ${err.message}`);
    next(createError(500, 'Error publishing exam'));
  }
};

// Update exam status based on time
exports.updateExamStatus = async () => {
  try {
    const now = new Date();

    // Update upcoming exams to ongoing
    await Exam.updateMany(
      {
        status: 'upcoming',
        startTime: { $lte: now }
      },
      { $set: { status: 'ongoing' } }
    );

    // Update ongoing exams to completed
    await Exam.updateMany(
      {
        status: 'ongoing',
        endTime: { $lte: now }
      },
      { $set: { status: 'completed' } }
    );

    logger.info('Exam statuses updated successfully');
  } catch (err) {
    logger.error('Error updating exam statuses:', err);
  }
};

// Schedule periodic status updates
const STATUS_UPDATE_INTERVAL = 1 * 60 * 1000; // 1 minute
setInterval(exports.updateExamStatus, STATUS_UPDATE_INTERVAL);

// Get all exams (with filters)
exports.getExams = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Role-based access control
    if (req.user.role === 'student') {
      // Students can only see exams they're allowed to take
      query['allowedStudents.student'] = req.user._id;
    } else if (req.user.role === 'teacher') {
      // Teachers can only see exams they created
      query.createdBy = req.user._id;
    }
    // Admins can see all exams (no additional filter)

    const exams = await Exam.find(query)
      .populate('createdBy', 'name email')
      .sort({ startTime: -1 });

    logger.info(`Exams fetched by user: ${req.user._id}`);
    res.json(exams);
  } catch (err) {
    logger.error(`Error fetching exams: ${err.message}`);
    next(createError(500, 'Error fetching exams'));
  }
};

// Get exam by ID
exports.getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!exam) {
      return next(createError(404, 'Exam not found'));
    }

    // Check if exam is published and within time window
    if (req.user.role === 'student') {
      const now = new Date();
      const startTime = new Date(exam.startTime);
      const endTime = new Date(exam.endTime);

      if (!exam.isPublished) {
        return next(createError(403, 'This exam is not yet published'));
      }

      if (now < startTime) {
        return next(createError(400, 'Exam has not started yet'));
      }

      if (now > endTime) {
        return next(createError(400, 'Exam has already ended'));
      }
    }

    logger.info(`Exam ${exam._id} accessed by user: ${req.user._id}`);
    res.json(exam);
  } catch (err) {
    logger.error(`Error fetching exam: ${err.message}`);
    next(createError(500, 'Error fetching exam'));
  }
};

// Update exam
exports.updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return next(createError(404, 'Exam not found'));
    }

    // Check if user is authorized (creator or admin)
    if (exam.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      logger.warn(`Unauthorized exam update attempt by user: ${req.user._id}`);
      return next(createError(403, 'You are not allowed to update this exam'));
    }

    // Check exam status
    if (exam.status !== 'upcoming') {
      logger.warn(`Attempt to update non-upcoming exam: ${exam._id}`);
      return next(createError(400, 'Cannot update exam after it has started'));
    }

    // Prevent status change through update
    if (req.body.status && req.body.status !== 'upcoming') {
      logger.warn(`Attempt to manually change exam status: ${exam._id}`);
      return next(createError(400, 'Cannot manually change exam status'));
    }

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    logger.info(`Exam updated: ${exam._id} by user: ${req.user._id}`);
    res.json(updatedExam);
  } catch (err) {
    logger.error(`Error updating exam: ${err.message}`);
    next(createError(500, 'Error updating exam'));
  }
};

// Delete exam
exports.deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return next(createError(404, 'Exam not found'));
    }

    // Check if user is authorized (creator or admin)
    if (exam.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      logger.warn(`Unauthorized exam deletion attempt by user: ${req.user._id}`);
      return next(createError(403, 'You are not allowed to delete this exam'));
    }

    // Check exam status
    if (exam.status !== 'upcoming') {
      logger.warn(`Attempt to delete non-upcoming exam: ${exam._id}`);
      return next(createError(400, 'Cannot delete exam after it has started'));
    }

    await exam.remove();
    logger.info(`Exam deleted: ${exam._id} by user: ${req.user._id}`);
    res.status(204).send();
  } catch (err) {
    logger.error(`Error deleting exam: ${err.message}`);
    next(createError(500, 'Error deleting exam'));
  }
};

// Start exam for a student
exports.startExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('questions') // Make sure questions are populated
      .populate('createdBy', 'name email');

    if (!exam) {
      return next(createError(404, 'Exam not found'));
    }

    // For students, check if exam is published and within time window
    if (req.user.role === 'student') {
      const now = new Date();
      const startTime = new Date(exam.startTime);
      const endTime = new Date(exam.endTime);

      if (!exam.isPublished) {
        return next(createError(403, 'This exam is not yet published'));
      }

      if (now < startTime) {
        return next(createError(400, 'Exam has not started yet'));
      }

      if (now > endTime) {
        return next(createError(400, 'Exam has already ended'));
      }
    }

    // Initialize exam session for student if not exists
    if (!exam.allowedStudents) {
      exam.allowedStudents = [];
    }

    let studentEntry = exam.allowedStudents.find(
      s => s.student && s.student.toString() === req.user._id.toString()
    );

    if (!studentEntry) {
      studentEntry = {
        student: req.user._id,
        status: 'pending',
        startedAt: new Date(),
        proctoringSessions: []
      };
      exam.allowedStudents.push(studentEntry);
    }

    // Check if student has already completed the exam
    if (studentEntry.status === 'completed') {
      return next(createError(400, 'You have already completed this exam'));
    }

    // Update student status and start time
    studentEntry.status = 'started';
    studentEntry.startedAt = new Date();
    await exam.save();

    // Prepare exam questions
    const questions = exam.questions.map(q => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      difficulty: q.difficulty
    }));

    // Shuffle questions if enabled
    if (exam.settings?.shuffleQuestions) {
      questions.sort(() => Math.random() - 0.5);
    }

    // Shuffle options if enabled
    if (exam.settings?.shuffleOptions) {
      questions.forEach(q => {
        q.options.sort(() => Math.random() - 0.5);
      });
    }

    logger.info(`Student ${req.user._id} started exam ${exam._id}`);
    res.json({
      examId: exam._id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      startTime: studentEntry.startedAt,
      endTime: exam.endTime,
      questions: questions
    });
  } catch (err) {
    logger.error(`Error starting exam: ${err.message}`);
    next(createError(500, 'Error starting exam'));
  }
};

// Submit exam
exports.submitExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return next(createError(404, 'Exam not found'));
    }

    const studentEntry = exam.allowedStudents.find(
      s => s.student.toString() === req.user._id.toString()
    );

    if (!studentEntry || studentEntry.status !== 'started') {
      logger.warn(`Invalid exam submission attempt by student: ${req.user._id}`);
      return next(createError(400, 'Invalid exam submission'));
    }

    // Check if exam is still ongoing
    if (exam.status !== 'ongoing') {
      logger.warn(`Late submission attempt for exam: ${exam._id}`);
      return next(createError(400, 'Exam submission period has ended'));
    }

    // Check if submission is within time limit
    const timeSpent = Math.round((new Date() - studentEntry.startedAt) / 60000); // in minutes
    if (timeSpent > exam.duration) {
      logger.warn(`Time limit exceeded for exam submission: ${exam._id}`);
      return next(createError(400, 'Exam time limit exceeded'));
    }

    // Calculate score and create result
    const answers = req.body.answers;
    let score = 0;
    let totalMarks = 0;

    const gradedAnswers = answers.map(answer => {
      const question = exam.questions.id(answer.questionId);
      if (!question) return null;

      totalMarks += question.marks;
      const isCorrect = answer.selectedOption === question.correctAnswer;
      if (isCorrect) score += question.marks;

      return {
        question: question._id,
        selectedOption: answer.selectedOption,
        isCorrect,
        marks: isCorrect ? question.marks : 0
      };
    }).filter(a => a !== null);

    // Create result
    const result = new Result({
      exam: exam._id,
      student: req.user._id,
      answers: gradedAnswers,
      score,
      totalMarks,
      startTime: studentEntry.startedAt,
      endTime: new Date(),
      duration: timeSpent,
      proctoringSummary: {
        totalIncidents: studentEntry.proctoringSessions.reduce(
          (total, session) => total + session.incidents.length,
          0
        ),
        incidents: studentEntry.proctoringSessions.flatMap(session => 
          session.incidents.map(incident => ({
            type: incident.type,
            timestamp: incident.timestamp,
            details: incident.details,
            severity: incident.severity
          }))
        )
      }
    });

    await result.save();

    // Update student status
    studentEntry.status = 'completed';
    studentEntry.completedAt = new Date();
    await exam.save();

    logger.info(`Student ${req.user._id} submitted exam ${exam._id} with score ${score}/${totalMarks}`);
    res.json({
      message: 'Exam submitted successfully',
      result: {
        score,
        totalMarks,
        percentage: (score / totalMarks) * 100,
        status: result.status
      }
    });
  } catch (err) {
    logger.error(`Error submitting exam: ${err.message}`);
    next(createError(500, 'Error submitting exam'));
  }
};

// Record proctoring incident
exports.recordProctoring = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { type, details, severity } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return next(createError(404, 'Exam not found'));
    }

    const studentEntry = exam.allowedStudents.find(
      s => s.student.toString() === req.user._id.toString()
    );

    if (!studentEntry || studentEntry.status !== 'started') {
      logger.warn(`Invalid proctoring update attempt by student: ${req.user._id}`);
      return next(createError(400, 'Invalid proctoring update'));
    }

    // Check if proctoring is enabled for this exam
    if (!exam.settings.proctoring.enabled) {
      logger.warn(`Proctoring update attempt for non-proctored exam: ${examId}`);
      return next(createError(400, 'Proctoring is not enabled for this exam'));
    }

    // Get or create current proctoring session
    let currentSession = studentEntry.proctoringSessions[studentEntry.proctoringSessions.length - 1];
    if (!currentSession || currentSession.endTime) {
      currentSession = {
        startTime: new Date(),
        incidents: []
      };
      studentEntry.proctoringSessions.push(currentSession);
    }

    // Add incident
    currentSession.incidents.push({
      type,
      details,
      timestamp: new Date(),
      severity
    });

    await exam.save();
    logger.info(`Proctoring incident recorded for student ${req.user._id} in exam ${examId}`);
    res.status(200).json({ message: 'Proctoring incident recorded' });
  } catch (err) {
    logger.error(`Error recording proctoring incident: ${err.message}`);
    next(createError(500, 'Error recording proctoring incident'));
  }
};

// End proctoring session
exports.endProctoring = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return next(createError(404, 'Exam not found'));
    }

    const studentEntry = exam.allowedStudents.find(
      s => s.student.toString() === req.user._id.toString()
    );

    if (!studentEntry || studentEntry.status !== 'started') {
      logger.warn(`Invalid proctoring end attempt by student: ${req.user._id}`);
      return next(createError(400, 'Invalid proctoring update'));
    }

    // Check if proctoring is enabled for this exam
    if (!exam.settings.proctoring.enabled) {
      logger.warn(`Proctoring end attempt for non-proctored exam: ${examId}`);
      return next(createError(400, 'Proctoring is not enabled for this exam'));
    }

    // End current session
    const currentSession = studentEntry.proctoringSessions[studentEntry.proctoringSessions.length - 1];
    if (currentSession && !currentSession.endTime) {
      currentSession.endTime = new Date();
      await exam.save();
    }

    logger.info(`Proctoring session ended for student ${req.user._id} in exam ${examId}`);
    res.status(200).json({ message: 'Proctoring session ended' });
  } catch (err) {
    logger.error(`Error ending proctoring session: ${err.message}`);
    next(createError(500, 'Error ending proctoring session'));
  }
}; 