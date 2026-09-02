const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  selectedOption: {
    type: Number,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  marks: {
    type: Number,
    required: true
  }
});

const resultSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [answerSchema],
  score: {
    type: Number,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['passed', 'failed'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  proctoringSummary: {
    totalIncidents: {
      type: Number,
      default: 0
    },
    incidents: [{
      type: {
        type: String,
        enum: ['tab_switch', 'face_not_visible', 'multiple_faces', 'audio_detection', 'screen_share_stopped'],
        required: true
      },
      timestamp: {
        type: Date,
        required: true
      },
      details: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
      }
    }],
    recordings: {
      video: String, // URL to stored video recording
      screen: String, // URL to stored screen recording
      audio: String // URL to stored audio recording
    }
  }
}, {
  timestamps: true
});

// Virtual for calculating percentage
resultSchema.virtual('calculatePercentage').get(function() {
  return (this.score / this.totalMarks) * 100;
});

// Pre-save middleware to update percentage and status
resultSchema.pre('save', function(next) {
  this.percentage = this.calculatePercentage;
  this.status = this.percentage >= 40 ? 'passed' : 'failed';
  next();
});

const Result = mongoose.model('Result', resultSchema);
module.exports = Result; 