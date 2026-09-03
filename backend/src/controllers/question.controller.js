

const Question = require('../models/question.model');
const { SUPPORTED_CODING_LANGUAGES } = require('../models/question.model');

const getQuestions = async (req, res) => {
  try {
    const { subject, difficulty, type } = req.query;
    const query = { isActive: true };

    if (subject) query.subject = subject;
    if (difficulty) query.difficulty = difficulty;
    if (type) query.type = type;

    const questions = await Question.find(query).select('-__v');
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id).select('-__v');
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ message: 'Error fetching question' });
  }
};

const createQuestion = async (req, res) => {
  try {
    console.log('Creating question, body:', req.body);
    const {
      type = 'mcq',
      text,
      subject,
      difficulty,
      options,
      correctOption,
      supportedLanguages
    } = req.body;

    if (!text || !subject) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ message: 'Invalid difficulty level' });
    }

    if (!['mcq', 'coding', 'bash'].includes(type)) {
      return res.status(400).json({ message: 'Invalid question type' });
    }

    const questionData = {
      type,
      text,
      subject,
      difficulty,
      createdBy: req.user._id
    };

    if (type === 'mcq') {
      if (!options || options.length !== 4 || correctOption === undefined) {
        return res.status(400).json({ message: 'MCQ questions require 4 options and a correct option' });
      }
      if (correctOption < 0 || correctOption > 3) {
        return res.status(400).json({ message: 'Invalid correct option index' });
      }
      questionData.options = options;
      questionData.correctOption = correctOption;
    }

    if (type === 'coding') {
      // Default: all four languages supported, unless admin explicitly narrows it down.
      const langs = Array.isArray(supportedLanguages) && supportedLanguages.length > 0
        ? supportedLanguages
        : [...SUPPORTED_CODING_LANGUAGES];

      const invalid = langs.filter((l) => !SUPPORTED_CODING_LANGUAGES.includes(l));
      if (invalid.length > 0) {
        return res.status(400).json({ message: `Unsupported language(s): ${invalid.join(', ')}` });
      }
      questionData.supportedLanguages = langs;
    }
    // type === 'bash' → just text/subject/difficulty. Test cases/starter script live on the Challenge.

    const question = new Question(questionData);
    await question.save();
    console.log('Question created:', question._id, 'type:', type);

    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ message: error.message || 'Error creating question' });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, text, subject, difficulty, options, correctOption, supportedLanguages } = req.body;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.usedInExams.length > 0) {
      return res.status(400).json({ message: 'Cannot update question that has been used in exams' });
    }

    const nextType = type || question.type;

    question.type = nextType;
    question.text = text || question.text;
    question.subject = subject || question.subject;
    question.difficulty = difficulty || question.difficulty;

    if (nextType === 'mcq') {
      if (options) question.options = options;
      if (correctOption !== undefined) question.correctOption = correctOption;
      if (!question.options || question.options.length !== 4 || question.correctOption === undefined) {
        return res.status(400).json({ message: 'MCQ questions require 4 options and a correct option' });
      }
      question.supportedLanguages = undefined;
    } else if (nextType === 'coding') {
      const langs = Array.isArray(supportedLanguages) && supportedLanguages.length > 0
        ? supportedLanguages
        : (question.supportedLanguages && question.supportedLanguages.length > 0
            ? question.supportedLanguages
            : [...SUPPORTED_CODING_LANGUAGES]);
      const invalid = langs.filter((l) => !SUPPORTED_CODING_LANGUAGES.includes(l));
      if (invalid.length > 0) {
        return res.status(400).json({ message: `Unsupported language(s): ${invalid.join(', ')}` });
      }
      question.supportedLanguages = langs;
      question.options = undefined;
      question.correctOption = undefined;
    } else {
      // bash
      question.options = undefined;
      question.correctOption = undefined;
      question.supportedLanguages = undefined;
    }

    await question.save();
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Error updating question' });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.usedInExams.length > 0) {
      return res.status(400).json({ message: 'Cannot delete question that has been used in exams' });
    }

    await Question.findByIdAndDelete(id);
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