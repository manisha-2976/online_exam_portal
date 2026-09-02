const Exam = require('../models/exam.model');
const Question = require('../models/question.model');
const User = require('../models/user.model');
const Result = require('../models/result.model');
const Submission = require('../models/submission.model');
const createError = require('http-errors');
const logger = require('../utils/logger');

// Create a new exam
exports.createExam = async (req, res) => {
  try {
    const examData = {
      ...req.body,
      createdBy: req.user._id,
      status: 'draft',
      isPublished: false
    };

    const exam = new Exam(examData);
    await exam.save();

    res.status(201).json(exam);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(400).json({ message: error.message });
  }
};

// Get all exams (with role-based filtering)
exports.getExams = async (req, res) => {
  try {
    let query = {};
    // Students can only see published exams
    if (req.user.role === 'student') {
      query = { isPublished: true };
    }
    // Faculty/admin can see all exams they created
    else if (req.user.role === 'faculty' || req.user.role === 'admin') {
      query = { createdBy: req.user._id };
    }
    const exams = await Exam.find(query)
      .populate('createdBy', 'name email')
      .sort({ startTime: 1 });
    // Update status of all fetched exams
    await Promise.all(exams.map(exam => exam.updateStatus()));
    
    if (req.user.role === 'student') {
      const examsWithSubmissionStatus = await Promise.all(exams.map(async (exam) => {
        const submission = await Submission.findOne({
          exam: exam._id,
          student: req.user._id
        });
        return { ...exam.toObject(), hasSubmitted: !!submission };
      }));
      res.json(examsWithSubmissionStatus);
    } else {
      res.json(exams);
    }
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single exam by ID
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('questions');
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    // Update exam status
    await exam.updateStatus();
    // Students can only view published exams
    if (req.user.role === 'student' && !exam.isPublished) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Faculty/admin can only view their own exams
    else if (['faculty', 'admin'].includes(req.user.role) && 
        exam.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update an exam
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Only creator can update the exam
    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Cannot update published exams
    if (exam.isPublished) {
      return res.status(400).json({ message: 'Cannot update published exam' });
    }

    // Update exam fields
    Object.assign(exam, req.body);
    await exam.save();
    
    res.json(exam);
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete an exam
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Only creator can delete the exam
    if (exam.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only the creator or admin can delete this exam.' });
    }

    // Cannot delete published or ongoing exams
    if (exam.isPublished || exam.status === 'ongoing' || exam.status === 'completed') {
      return res.status(400).json({ message: 'Cannot delete published or ongoing exams' });
    }

    await Exam.findByIdAndDelete(req.params.id);
    console.log('Exam deleted successfully:', req.params.id);
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ message: 'Error deleting exam. Please try again.' });
  }
};

// Publish an exam
exports.publishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Only creator can publish the exam
    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Cannot publish already published exam
    if (exam.isPublished) {
      return res.status(400).json({ message: 'Exam is already published' });
    }

    // Check if exam has all required fields
    if (!exam.title || !exam.description || !exam.subject || !exam.duration || 
        !exam.totalMarks || !exam.passingPercentage || !exam.startTime || !exam.endTime) {
      return res.status(400).json({ message: 'All exam fields must be provided before publishing' });
    }

    // Check if enough questions are available
    const totalQuestionsNeeded = 
      exam.questionCriteria.easy + 
      exam.questionCriteria.medium + 
      exam.questionCriteria.hard;

    if (exam.questions.length < totalQuestionsNeeded) {
      // Fetch random questions based on criteria
      const easyQuestions = await Question.aggregate([
        { $match: { difficulty: 'easy', isUsed: false } },
        { $sample: { size: exam.questionCriteria.easy } }
      ]);

      const mediumQuestions = await Question.aggregate([
        { $match: { difficulty: 'medium', isUsed: false } },
        { $sample: { size: exam.questionCriteria.medium } }
      ]);

      const hardQuestions = await Question.aggregate([
        { $match: { difficulty: 'hard', isUsed: false } },
        { $sample: { size: exam.questionCriteria.hard } }
      ]);

      const selectedQuestions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];

      if (selectedQuestions.length < totalQuestionsNeeded) {
        return res.status(400).json({ 
          message: 'Not enough questions available for the specified criteria' 
        });
      }

      // Mark questions as used and add them to the exam
      exam.questions = selectedQuestions.map(q => q._id);
      await Question.updateMany(
        { _id: { $in: exam.questions } },
        { isUsed: true }
      );
    }

    exam.isPublished = true;
    await exam.updateStatus();
    await exam.save();

    res.json(exam);
  } catch (error) {
    console.error('Error publishing exam:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all available students
exports.getAllStudents = async (req, res) => {
  try {
    // Only faculty and admin can fetch all students
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const students = await User.find({ 
      role: 'student',
      isActive: true 
    })
    .select('_id name email')
    .sort({ name: 1 });

    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: error.message });
  }
};

// Start an exam for a student
exports.startExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('questions');

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if exam is published
    if (!exam.isPublished) {
      return res.status(403).json({ message: 'This exam is not published yet' });
    }

    // Check if exam is within the time window
    const now = new Date();
    if (now < exam.startTime) {
      return res.status(403).json({ message: 'This exam has not started yet' });
    }
    if (now > exam.endTime) {
      return res.status(403).json({ message: 'This exam has ended' });
    }

    // Return exam details without answers
    const examForStudent = {
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      startTime: exam.startTime,
      endTime: exam.endTime,
      questions: exam.questions.map(q => ({
        _id: q._id,
        text: q.text,
        options: q.options,
        type: q.type
      }))
    };

    res.json(examForStudent);
  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).json({ message: error.message });
  }
};

// Submit exam answers
exports.submitExam = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const exam = await Exam.findById(req.params.id).populate('questions');

    if (!exam) {
      return next(createError(404, 'Exam not found'));
    }

    // Check if exam is ongoing
    const now = new Date();
    if (!exam.isPublished || now < exam.startTime || now > exam.endTime) {
      return next(createError(403, 'Exam is not active'));
    }

    // Calculate score
    let score = 0;
    let totalMarks = 0;

    // Answers are expected as an object: { questionId: selectedOptionIndex }
    const gradedAnswers = Object.keys(answers).map(questionId => {
      // Find the question in the populated questions array by its ID
      const question = exam.questions.find(q => q._id.toString() === questionId);
      if (!question) {
           console.warn(`Question with ID ${questionId} not found in exam ${exam._id}`);
           return null; // Skip if question not found (shouldn't happen if data is consistent)
      }

      totalMarks += question.marks;
      const selectedOption = answers[questionId];

      // Assuming selectedOption is the index of the chosen option (0, 1, 2, ...)
      // And question.correctAnswer is the index of the correct option
      const isCorrect = selectedOption === question.correctAnswer;

      if (isCorrect) score += question.marks;

      return {
        question: questionId,
        selectedOption: selectedOption, // Store the index
        isCorrect: isCorrect,
        marksEarned: isCorrect ? question.marks : 0
      };
    }).filter(a => a !== null);

    // Calculate percentage and determine status before creating Result
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    // Assuming passing percentage is stored in exam.passingPercentage
    const status = percentage >= exam.passingPercentage ? 'passed' : 'failed';

    // Create result
    const result = new Result({
      exam: exam._id,
      student: req.user._id,
      answers: gradedAnswers,
      score: score,
      totalMarks: totalMarks,
      percentage: percentage, // Explicitly set percentage
      status: status, // Explicitly set status
      startTime: new Date(exam.startTime), // Use exam start time for result consistency
      endTime: now,
      duration: Math.round((now.getTime() - new Date(exam.startTime).getTime()) / 60000), // Duration in minutes
      // Proctoring summary can be added here if needed from frontend payload
      // proctoringSummary: req.body.proctoringSummary
    });

    await result.save();

    // Note: Student status update logic removed as exams are open

    logger.info(`Student ${req.user._id} submitted exam ${exam._id} with score ${score}/${totalMarks}`);
    res.json({
      message: 'Exam submitted successfully',
      result: {
        score: score,
        totalMarks: totalMarks,
        percentage: percentage,
        status: status // Include status in the response
      }
    });
  } catch (err) {
    logger.error(`Error submitting exam: ${err.message}`);
    next(createError(500, 'Error submitting exam'));
  }
};

// Get a student's submission for a specific exam
exports.getStudentSubmission = async (req, res) => {
  try {
    const examId = req.params.examId;
    const userId = req.user._id;

    const submission = await Submission.findOne({
      exam: examId,
      student: userId
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found for this exam and student.' });
    }

    res.status(200).json(submission);
  } catch (error) {
    console.error('Error fetching student submission:', error);
    res.status(500).json({ message: 'Error fetching student submission.' });
  }
}; 