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
    else if (
      req.user.role === 'faculty' ||
      req.user.role === 'admin'
    ) {
      query = { createdBy: req.user._id };
    }

    const exams = await Exam.find(query)
      .populate('createdBy', 'name email')
      .sort({ startTime: 1 });

    // Update status of all fetched exams
    await Promise.all(
      exams.map((exam) => exam.updateStatus())
    );

    if (req.user.role === 'student') {
      const examsWithSubmissionStatus = await Promise.all(
        exams.map(async (exam) => {
          const submission = await Submission.findOne({
            exam: exam._id,
            student: req.user._id
          });

          return {
            ...exam.toObject(),
            hasSubmitted: !!submission
          };
        })
      );

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
      return res.status(404).json({
        message: 'Exam not found'
      });
    }

    // Update exam status
    await exam.updateStatus();

    // Students can only view published exams
    if (
      req.user.role === 'student' &&
      !exam.isPublished
    ) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Faculty/admin can only view their own exams
    else if (
      ['faculty', 'admin'].includes(req.user.role) &&
      exam.createdBy._id.toString() !==
        req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    res.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({
      message: error.message
    });
  }
};

// Update an exam
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found'
      });
    }

    // Only creator can update the exam
    if (
      exam.createdBy.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Cannot update published exams
    if (exam.isPublished) {
      return res.status(400).json({
        message: 'Cannot update published exam'
      });
    }

    // Update exam fields
    Object.assign(exam, req.body);
    await exam.save();

    res.json(exam);
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(400).json({
      message: error.message
    });
  }
};

// Delete an exam
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found'
      });
    }

    // Only creator or admin can delete
    if (
      exam.createdBy.toString() !==
        req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message:
          'Access denied. Only the creator or admin can delete this exam.'
      });
    }

    // Cannot delete published or ongoing exams
    if (
      exam.isPublished ||
      exam.status === 'ongoing' ||
      exam.status === 'completed'
    ) {
      return res.status(400).json({
        message:
          'Cannot delete published or ongoing exams'
      });
    }

    await Exam.findByIdAndDelete(req.params.id);

    console.log(
      'Exam deleted successfully:',
      req.params.id
    );

    res.json({
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam:', error);

    res.status(500).json({
      message:
        'Error deleting exam. Please try again.'
    });
  }
};

// Publish an exam
exports.publishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found'
      });
    }

    // Only creator can publish
    if (
      exam.createdBy.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    // Cannot publish already published exam
    if (exam.isPublished) {
      return res.status(400).json({
        message: 'Exam is already published'
      });
    }

    // Check required fields
    if (
      !exam.title ||
      !exam.description ||
      !exam.subject ||
      !exam.duration ||
      !exam.totalMarks ||
      !exam.passingPercentage ||
      !exam.startTime ||
      !exam.endTime
    ) {
      return res.status(400).json({
        message:
          'All exam fields must be provided before publishing'
      });
    }

    // Check question criteria
    const totalQuestionsNeeded =
      exam.questionCriteria.easy +
      exam.questionCriteria.medium +
      exam.questionCriteria.hard;

    if (exam.questions.length < totalQuestionsNeeded) {
      const easyQuestions = await Question.aggregate([
        {
          $match: {
            difficulty: 'easy',
            isUsed: false
          }
        },
        {
          $sample: {
            size: exam.questionCriteria.easy
          }
        }
      ]);

      const mediumQuestions = await Question.aggregate([
        {
          $match: {
            difficulty: 'medium',
            isUsed: false
          }
        },
        {
          $sample: {
            size: exam.questionCriteria.medium
          }
        }
      ]);

      const hardQuestions = await Question.aggregate([
        {
          $match: {
            difficulty: 'hard',
            isUsed: false
          }
        },
        {
          $sample: {
            size: exam.questionCriteria.hard
          }
        }
      ]);

      const selectedQuestions = [
        ...easyQuestions,
        ...mediumQuestions,
        ...hardQuestions
      ];

      if (
        selectedQuestions.length <
        totalQuestionsNeeded
      ) {
        return res.status(400).json({
          message:
            'Not enough questions available for the specified criteria'
        });
      }

      exam.questions = selectedQuestions.map(
        (q) => q._id
      );

      await Question.updateMany(
        {
          _id: {
            $in: exam.questions
          }
        },
        {
          isUsed: true
        }
      );
    }

    exam.isPublished = true;

    await exam.updateStatus();
    await exam.save();

    res.json(exam);
  } catch (error) {
    console.error(
      'Error publishing exam:',
      error
    );

    res.status(500).json({
      message: error.message
    });
  }
};

// Get all available students
exports.getAllStudents = async (req, res) => {
  try {
    // Only faculty/admin can fetch students
    if (
      req.user.role !== 'faculty' &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const students = await User.find({
      role: 'student',
      isActive: true
    })
      .select('_id name email')
      .sort({ name: 1 });

    res.json(students);
  } catch (error) {
    console.error(
      'Error fetching students:',
      error
    );

    res.status(500).json({
      message: error.message
    });
  }
};

// Start an exam for a student
exports.startExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('questions');

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found'
      });
    }

    // Check published
    if (!exam.isPublished) {
      return res.status(403).json({
        message:
          'This exam is not published yet'
      });
    }

    // Check exam time window
    const now = new Date();

    if (now < exam.startTime) {
      return res.status(403).json({
        message:
          'This exam has not started yet'
      });
    }

    if (now > exam.endTime) {
      return res.status(403).json({
        message: 'This exam has ended'
      });
    }

    // Return exam without answers
    const examForStudent = {
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      startTime: exam.startTime,
      endTime: exam.endTime,

      questions: exam.questions.map((q) => ({
        _id: q._id,
        text: q.text,
        options: q.options,
        type: q.type
      }))
    };

    res.json(examForStudent);
  } catch (error) {
    console.error(
      'Error starting exam:',
      error
    );

    res.status(500).json({
      message: error.message
    });
  }
};

// Submit exam answers
exports.submitExam = async (req, res, next) => {
  try {
    const { answers } = req.body;

    // Validate answers
    if (
      !answers ||
      typeof answers !== 'object'
    ) {
      return next(
        createError(
          400,
          'Answers are required'
        )
      );
    }

    // Get exam with questions
    const exam = await Exam.findById(
      req.params.id
    ).populate('questions');

    if (!exam) {
      return next(
        createError(
          404,
          'Exam not found'
        )
      );
    }

    // Check if exam is active
    const now = new Date();

    if (
      !exam.isPublished ||
      now < exam.startTime ||
      now > exam.endTime
    ) {
      return next(
        createError(
          403,
          'Exam is not active'
        )
      );
    }

    // ---------------------------------------
    // CALCULATE SCORE
    // ---------------------------------------

    let score = 0;
    let totalMarks = 0;

    /*
      Frontend sends answers like:

      {
        "questionId1": "2",
        "questionId2": "4"
      }

      Database stores correctOption as an INDEX.

      Example:
      options: ["2", "3", "4", "5"]
      correctOption: 0

      Therefore:
      options[correctOption] = "2"
    */

    const gradedAnswers = Object.keys(answers)
      .map((questionId) => {
        const question =
          exam.questions.find(
            (q) =>
              q._id.toString() ===
              questionId
          );

        if (!question) {
          console.warn(
            `Question with ID ${questionId} not found in exam ${exam._id}`
          );

          return null;
        }

        const questionMarks =
          question.marks ?? 1;

        totalMarks += questionMarks;

        // Answer received from frontend
        const selectedOption = String(
          answers[questionId]
        );

        // Correct answer stored as an index
        const correctOptionText = String(
          question.options[
            question.correctOption
          ]
        );

        // Compare selected answer with correct answer
        const isCorrect =
          selectedOption ===
          correctOptionText;

        if (isCorrect) {
          score += questionMarks;
        }

        return {
          question: questionId,
          selectedOption,
          isCorrect,
          marks: questionMarks,
          marksEarned: isCorrect
            ? questionMarks
            : 0
        };
      })
      .filter(
        (answer) => answer !== null
      );

    // ---------------------------------------
    // CALCULATE PERCENTAGE
    // ---------------------------------------

    const percentage =
      totalMarks > 0
        ? (score / totalMarks) * 100
        : 0;

    // ---------------------------------------
    // PASS / FAIL
    // ---------------------------------------

    const passingPercentage =
      exam.passingPercentage ?? 40;

    const status =
      percentage >= passingPercentage
        ? 'passed'
        : 'failed';

    // ---------------------------------------
    // CREATE RESULT
    // ---------------------------------------

    const result = new Result({
      exam: exam._id,
      student: req.user._id,
      answers: gradedAnswers,
      score: score,
      totalMarks: totalMarks,
      percentage: percentage,
      status: status,
      startTime: new Date(
        exam.startTime
      ),
      endTime: now,
      duration: Math.round(
        (
          now.getTime() -
          new Date(
            exam.startTime
          ).getTime()
        ) / 60000
      )
    });

    await result.save();

    // ---------------------------------------
    // LOG
    // ---------------------------------------

    logger.info(
      `Student ${req.user._id} submitted exam ${exam._id} with score ${score}/${totalMarks}`
    );

    // ---------------------------------------
    // RESPONSE
    // ---------------------------------------

    return res.status(201).json({
      message:
        'Exam submitted successfully',

      result: {
        _id: result._id,
        exam: result.exam,
        student: result.student,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        status: result.status
      }
    });
  } catch (err) {
    console.error(
      '========== SUBMIT EXAM ERROR =========='
    );

    console.error(
      'Message:',
      err.message
    );

    console.error(
      'Name:',
      err.name
    );

    console.error(
      'Stack:',
      err.stack
    );

    console.error(
      '========================================'
    );

    logger.error(
      `Error submitting exam: ${err.message}`
    );

    next(
      createError(
        500,
        'Error submitting exam'
      )
    );
  }
};

// Get a student's submission for a specific exam
exports.getStudentSubmission = async (
  req,
  res
) => {
  try {
    const examId = req.params.examId;
    const userId = req.user._id;

    const submission =
      await Submission.findOne({
        exam: examId,
        student: userId
      });

    if (!submission) {
      return res.status(404).json({
        message:
          'Submission not found for this exam and student.'
      });
    }

    res.status(200).json(submission);
  } catch (error) {
    console.error(
      'Error fetching student submission:',
      error
    );

    res.status(500).json({
      message:
        'Error fetching student submission.'
    });
  }
};

// Get exam results
// Student -> only their own results
// Admin/Faculty -> all results
exports.getResults = async (req, res) => {
  try {
    let query = {};

    // Student can only see their own results
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    // Admin and faculty can see all results
    else if (
      req.user.role === 'admin' ||
      req.user.role === 'faculty'
    ) {
      query = {};
    }

    // Any other role is not allowed
    else {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    const results = await Result.find(query)
      .populate(
        'exam',
        'title subject totalMarks passingPercentage'
      )
      .populate(
        'student',
        'name email'
      )
      .sort({
        createdAt: -1
      });

    res.status(200).json(results);
  } catch (error) {
    console.error(
      'Error fetching results:',
      error
    );

    res.status(500).json({
      message: 'Failed to fetch results'
    });
  }
};