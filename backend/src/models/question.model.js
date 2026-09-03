

const mongoose = require('mongoose');

const SUPPORTED_CODING_LANGUAGES = ['javascript', 'python', 'java', 'c'];

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['mcq', 'coding', 'bash'],
    default: 'mcq'
  },
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
  options: {
    type: [String],
    required: function () { return this.type === 'mcq'; },
    validate: {
      validator: function (val) {
        if (this.type !== 'mcq') return true;
        return Array.isArray(val) && val.length === 4;
      },
      message: 'MCQ questions must have exactly 4 options'
    }
  },
  correctOption: {
    type: Number,
    required: function () { return this.type === 'mcq'; },
    min: 0,
    max: 3
  },
  // Only used when type === 'coding'. Which languages this problem can be attempted in.
  supportedLanguages: {
    type: [{ type: String, enum: SUPPORTED_CODING_LANGUAGES }],
    validate: {
      validator: function (val) {
        if (this.type !== 'coding') return true;
        return Array.isArray(val) && val.length > 0;
      },
      message: 'Select at least one supported language'
    },
    default: undefined
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

questionSchema.index({ subject: 1, difficulty: 1 });
questionSchema.index({ type: 1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
module.exports.SUPPORTED_CODING_LANGUAGES = SUPPORTED_CODING_LANGUAGES;