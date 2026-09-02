const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  options: [{
    type: String,
    required: true
  }],
  correctAnswer: {
    type: Number,
    required: true
  },
  marks: {
    type: Number,
    default: 1
  }
});

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  questionCriteria: {
    easy: {
      type: Number,
      default: 0
    },
    medium: {
      type: Number,
      default: 0
    },
    hard: {
      type: Number,
      default: 0
    }
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  allowedStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'started', 'completed'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    proctoringSessions: [{
      startTime: Date,
      endTime: Date,
      incidents: [{
        type: String,
        details: String,
        timestamp: Date,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'low'
        }
      }]
    }]
  }],
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'ongoing', 'completed'],
    default: 'draft'
  },
  passingPercentage: {
    type: Number,
    default: 40,
    min: 0,
    max: 100
  },
  settings: {
    shuffleQuestions: {
      type: Boolean,
      default: true
    },
    shuffleOptions: {
      type: Boolean,
      default: true
    },
    showResults: {
      type: Boolean,
      default: true
    },
    proctoring: {
      enabled: {
        type: Boolean,
        default: true
      },
      webcam: {
        type: Boolean,
        default: true
      },
      screen: {
        type: Boolean,
        default: true
      },
      audio: {
        type: Boolean,
        default: true
      },
      tabFocus: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Virtual for exam status
examSchema.virtual('currentStatus').get(function() {
  const now = new Date();
  if (now < this.startTime) return 'upcoming';
  if (now > this.endTime) return 'completed';
  return 'ongoing';
});

// Pre-save middleware to update status
examSchema.pre('save', function(next) {
  this.status = this.currentStatus;
  next();
});

// Add index for efficient querying
examSchema.index({ subject: 1, status: 1, startTime: 1 });

const Exam = mongoose.model('Exam', examSchema);
module.exports = Exam; 