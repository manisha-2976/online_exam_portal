const Question = require('../models/question.model');

// Get all questions
const getQuestions = async (req, res) => {
  try {
    console.log('Getting questions, query:', req.query);
    const { subject, difficulty } = req.query;
    const query = { isActive: true };
    
    if (subject) query.subject = subject;
    if (difficulty) query.difficulty = difficulty;

    const questions = await Question.find(query).select('-__v');
    console.log('Questions fetched:', questions.length);
    
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

// Get a single question by ID
const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Getting question by ID:', id);

    const question = await Question.findById(id).select('-__v');
    if (!question) {
      console.log('Question not found:', id);
      return res.status(404).json({ message: 'Question not found' });
    }

    console.log('Question fetched:', question._id);
    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ message: 'Error fetching question' });
  }
};

// Create a new question
const createQuestion = async (req, res) => {
  try {
    console.log('Creating question, body:', req.body);
    const { text, subject, difficulty, options, correctOption } = req.body;

    // Validate input
    if (!text || !subject || !options || options.length !== 4 || correctOption === undefined) {
      console.log('Validation failed:', { text, subject, options, correctOption });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      console.log('Invalid difficulty:', difficulty);
      return res.status(400).json({ message: 'Invalid difficulty level' });
    }

    if (correctOption < 0 || correctOption > 3) {
      console.log('Invalid correctOption:', correctOption);
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
    console.log('Question created:', question._id);

    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
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
    console.log('Question updated:', question._id);

    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
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
    console.log('Question deleted:', id);

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

module.exports = {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion
}; 