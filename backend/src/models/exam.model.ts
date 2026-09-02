import mongoose from 'mongoose';

export interface IExam extends mongoose.Document {
  title: string;
  description: string;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  startTime: Date;
  endTime: Date;
  createdBy: mongoose.Types.ObjectId;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    marks: number;
  }>;
  isActive: boolean;
  status: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  allowedDepartments: string[];
  allowedCourses: string[];
  allowedBatches: string[];
  proctoringSettings: {
    faceDetection: boolean;
    browserLock: boolean;
    audioMonitoring: boolean;
    screenRecording: boolean;
  };
}

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
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  passingMarks: {
    type: Number,
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctAnswer: {
      type: String,
      required: true
    },
    marks: {
      type: Number,
      required: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  allowedDepartments: [{
    type: String,
    trim: true
  }],
  allowedCourses: [{
    type: String,
    trim: true
  }],
  allowedBatches: [{
    type: String,
    trim: true
  }],
  proctoringSettings: {
    faceDetection: {
      type: Boolean,
      default: true
    },
    browserLock: {
      type: Boolean,
      default: true
    },
    audioMonitoring: {
      type: Boolean,
      default: true
    },
    screenRecording: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
examSchema.index({ createdBy: 1 });
examSchema.index({ status: 1 });
examSchema.index({ startTime: 1, endTime: 1 });

export const Exam = mongoose.model<IExam>('Exam', examSchema); 