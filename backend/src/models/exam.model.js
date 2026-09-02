const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1 // Duration in minutes
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1
  },
  passingPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'ongoing', 'completed'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionCriteria: {
    easy: {
      type: Number,
      required: true,
      min: 0
    },
    medium: {
      type: Number,
      required: true,
      min: 0
    },
    hard: {
      type: Number,
      required: true,
      min: 0
    }
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Pre-save middleware to validate start and end times
examSchema.pre('save', function(next) {
  if (this.startTime >= this.endTime) {
    next(new Error('End time must be after start time'));
  }
  next();
});

// Method to update exam status based on current time
examSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (!this.isPublished) {
    this.status = 'draft';
  } else if (now < this.startTime) {
    this.status = 'upcoming';
  } else if (now >= this.startTime && now <= this.endTime) {
    this.status = 'ongoing';
  } else {
    this.status = 'completed';
  }
  
  return this.save();
};

// Static method to update all exam statuses
examSchema.statics.updateAllStatuses = function() {
  return this.find({})
    .then(exams => {
      return Promise.all(exams.map(exam => exam.updateStatus()));
    });
};

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam; 