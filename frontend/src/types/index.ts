export * from './proctoring';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'faculty' | 'student' | 'proctor';
  isActive: boolean;
  department?: string;
  studentId?: string;
  course?: string;
  semester?: string;
  batch?: string;
  lastLogin?: Date;
}

export interface Faculty extends User {
  createdExams?: Exam[];
}

export interface Student extends User {
  examHistory?: ExamHistory[];
}

export interface Exam {
  _id: string;
  title: string;
  description: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  startTime: Date;
  endTime: Date;
  createdBy: string;
  questions: Question[];
  isActive: boolean;
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  allowedDepartments?: string[];
  allowedCourses?: string[];
  allowedBatches?: string[];
  proctoringSettings: {
    faceDetection: boolean;
    browserLock: boolean;
    screenRecording: boolean;
    audioMonitoring: boolean;
  };
}

export interface Question {
  text: string;
  options: string[];
  correctAnswer: string;
  marks: number;
}

export interface ExamHistory {
  examId: string | Exam;
  score: number;
  totalMarks: number;
  percentage: number;
  submissionDate: Date;
  status: 'completed' | 'incomplete' | 'disqualified';
} 