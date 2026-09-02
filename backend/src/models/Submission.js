const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'error'],
    default: 'pending'
  },
  result: {
    type: String,
    enum: ['accepted', 'wrong_answer', 'time_limit', 'memory_limit', 'runtime_error', 'compilation_error'],
    default: null
  },
  executionTime: {
    type: Number,
    default: null
  },
  memoryUsed: {
    type: Number,
    default: null
  },
  testCases: [{
    input: String,
    expectedOutput: String,
    actualOutput: String,
    status: {
      type: String,
      enum: ['passed', 'failed', 'error'],
      default: 'pending'
    },
    executionTime: Number,
    memoryUsed: Number
  }],
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Submission', submissionSchema); 