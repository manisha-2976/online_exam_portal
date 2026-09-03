

const mongoose = require('mongoose');

const SUPPORTED_LANGUAGES = ['c', 'java', 'javascript', 'python'];

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true },
  description: { type: String, required: [true, 'Description is required'], trim: true },
  difficulty: {
    type: String,
    required: [true, 'Difficulty is required'],
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  category: { type: String, required: [true, 'Category is required'], trim: true },
  startDate: { type: Date, required: [true, 'Start date is required'] },
  endDate: { type: Date, required: [true, 'End date is required'] },

  challengeType: {
    type: String,
    enum: ['coding', 'bash'],
    default: 'coding'
  },

  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],

  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },

  allowedLanguages: {
    type: [{ type: String, enum: [...SUPPORTED_LANGUAGES, 'bash'] }],
    required: [true, 'At least one language must be supported'],
    validate: {
      validator: (val) => Array.isArray(val) && val.length > 0,
      message: 'At least one language must be supported'
    },
    default: ['javascript', 'python', 'java', 'c']
  },

  // Keyed by language: { javascript: '...', python: '...' } or { bash: '...' }
  starterCode: {
    type: Map,
    of: String,
    default: () => new Map()
  },

  // Keyed by language, same shape as starterCode. Reference-only, not used for grading.
  solution: {
    type: Map,
    of: String,
    default: () => new Map()
  },

  testCases: [{
    input: { type: String, required: true },
    output: { type: String, required: true }
  }],

  timeLimit: { type: Number, default: 1000, min: 100, max: 5000 },
  memoryLimit: { type: Number, default: 256, min: 16, max: 512 },

  // Defaults ON — admin must explicitly disable.
  proctoring: {
    webcamEnabled: { type: Boolean, default: true },
    tabSwitchingEnabled: { type: Boolean, default: true },
    voiceDetectionEnabled: { type: Boolean, default: true }
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Creator is required'] },
  isActive: { type: Boolean, default: true },

  submissions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    language: { type: String, enum: [...SUPPORTED_LANGUAGES, 'bash'] },
    code: { type: String },
    answers: [{
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
      answer: { type: String, required: true }
    }],
    status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
    score: { type: Number, default: 0 },
    passedTestCases: { type: Number, default: 0 },
    totalTestCases: { type: Number, default: 0 },
    warnings: [{ type: String }],
    tabSwitchCount: { type: Number, default: 0 }
  }]
}, { timestamps: true });

challengeSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Challenge = mongoose.model('Challenge', challengeSchema);
module.exports = Challenge;
module.exports.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;