import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'faculty' | 'admin';
  isEmailVerified: boolean;
  phoneNumber: string;
  department?: string;
  studentId?: string;
  course?: string;
  semester?: number;
  batch?: string;
  examHistory: Array<{
    examId: mongoose.Types.ObjectId;
    score: number;
    totalMarks: number;
    percentage: number;
    submittedAt: Date;
    status: 'completed' | 'incomplete' | 'disqualified';
  }>;
  createdExams?: Array<mongoose.Types.ObjectId>; // For faculty
  isActive: boolean;
  lastLogin: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  studentId: {
    type: String,
    sparse: true,
    trim: true
  },
  course: {
    type: String,
    trim: true
  },
  semester: {
    type: Number
  },
  batch: {
    type: String,
    trim: true
  },
  examHistory: [{
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam'
    },
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
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['completed', 'incomplete', 'disqualified'],
      default: 'completed'
    }
  }],
  createdExams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema); 