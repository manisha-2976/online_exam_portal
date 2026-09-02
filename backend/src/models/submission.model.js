const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
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
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  },
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    selectedOption: Number,
    isCorrect: Boolean
  }],
  score: {
    type: Number,
    min: 0
  },
  proctoringData: {
    faceDetectionEvents: [{
      timestamp: Date,
      confidence: Number,
      violation: Boolean
    }],
    eyeTrackingEvents: [{
      timestamp: Date,
      confidence: Number,
      violation: Boolean
    }],
    audioEvents: [{
      timestamp: Date,
      level: Number,
      violation: Boolean
    }],
    tabSwitchEvents: [{
      timestamp: Date,
      count: Number,
      violation: Boolean
    }],
    systemEvents: [{
      timestamp: Date,
      type: String,
      details: String,
      violation: Boolean
    }]
  }
}, {
  timestamps: true
});

// Index for efficient querying
submissionSchema.index({ exam: 1, student: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission; 