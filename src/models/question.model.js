const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  options: [{
    type: String,
    required: true
  }],
  correctOption: {
    type: Number,
    required: true,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usedInExams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add index for efficient querying
questionSchema.index({ subject: 1, difficulty: 1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question; 