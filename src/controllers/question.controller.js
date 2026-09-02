const Question = require('../models/question.model');
const logger = require('../utils/logger');

// Get all questions
const getQuestions = async (req, res) => {
  try {
    const { subject, difficulty } = req.query;
    const query = { isActive: true };
    
    if (subject) query.subject = subject;
    if (difficulty) query.difficulty = difficulty;

    const questions = await Question.find(query).select('-__v');
    logger.info(`Questions fetched by user: ${req.user._id}`);
    
    res.json(questions);
  } catch (error) {
    logger.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

// Create a new question
const createQuestion = async (req, res) => {
  try {
    const { text, subject, difficulty, options, correctOption } = req.body;

    // Validate input
    if (!text || !subject || !options || options.length !== 4 || correctOption === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ message: 'Invalid difficulty level' });
    }

    if (correctOption < 0 || correctOption > 3) {
      return res.status(400).json({ message: 'Invalid correct option index' });
    }

    const question = new Question({
      text,
      subject,
      difficulty,
      options,
      correctOption,
      createdBy: req.user._id
    });

    await question.save();
    logger.info(`Question created by user: ${req.user._id}`);

    res.status(201).json(question);
  } catch (error) {
    logger.error('Error creating question:', error);
    res.status(500).json({ message: 'Error creating question' });
  }
};

// Update a question
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, subject, difficulty, options, correctOption } = req.body;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if question is used in any exam
    if (question.usedInExams.length > 0) {
      return res.status(400).json({ message: 'Cannot update question that has been used in exams' });
    }

    // Update fields
    question.text = text || question.text;
    question.subject = subject || question.subject;
    question.difficulty = difficulty || question.difficulty;
    question.options = options || question.options;
    question.correctOption = correctOption !== undefined ? correctOption : question.correctOption;

    await question.save();
    logger.info(`Question updated by user: ${req.user._id}`);

    res.json(question);
  } catch (error) {
    logger.error('Error updating question:', error);
    res.status(500).json({ message: 'Error updating question' });
  }
};

// Delete a question
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if question is used in any exam
    if (question.usedInExams.length > 0) {
      return res.status(400).json({ message: 'Cannot delete question that has been used in exams' });
    }

    await Question.findByIdAndDelete(id);
    logger.info(`Question deleted by user: ${req.user._id}`);

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    logger.error('Error deleting question:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

module.exports = {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
}; 