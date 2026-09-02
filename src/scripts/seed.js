const mongoose = require('mongoose');
const User = require('../models/user.model');
const Question = require('../models/question.model');
const Exam = require('../models/exam.model');
const Result = require('../models/result.model');
const Proctoring = require('../models/proctoring.model');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Clear existing data
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Question.deleteMany({});
    await Exam.deleteMany({});
    await Result.deleteMany({});
    await Proctoring.deleteMany({});
    console.log('Database cleared successfully');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Create sample users
const createUsers = async () => {
  try {
    const users = await User.create([
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'student',
        phoneNumber: '+1234567890',
        department: 'Computer Science',
        course: 'B.Tech',
        semester: 3,
        batch: '2022-2026',
        subjects: ['Data Structures', 'Algorithms', 'Database Systems']
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        role: 'faculty',
        phoneNumber: '+1234567891',
        department: 'Computer Science',
        isEmailVerified: true,
        isPhoneVerified: true
      },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
        phoneNumber: '+1234567892',
        isEmailVerified: true,
        isPhoneVerified: true
      }
    ]);
    console.log('Sample users created successfully');
    return users;
  } catch (error) {
    console.error('Error creating users:', error);
    throw error;
  }
};

// Create sample questions
const createQuestions = async (facultyId) => {
  try {
    const questions = await Question.create([
      {
        title: 'What is JavaScript?',
        description: 'Explain JavaScript programming language',
        type: 'multiple-choice',
        difficulty: 'easy',
        category: 'Programming',
        subCategory: 'JavaScript',
        points: 2,
        options: [
          { text: 'A programming language', isCorrect: true },
          { text: 'A database', isCorrect: false },
          { text: 'An operating system', isCorrect: false },
          { text: 'A web browser', isCorrect: false }
        ],
        explanation: 'JavaScript is a programming language commonly used for web development',
        tags: ['javascript', 'programming', 'web'],
        createdBy: facultyId
      },
      {
        title: 'Binary Search Implementation',
        description: 'Implement binary search algorithm',
        type: 'coding',
        difficulty: 'medium',
        category: 'Algorithms',
        subCategory: 'Searching',
        points: 5,
        codingQuestion: {
          initialCode: 'function binarySearch(arr, target) {\n  // Your code here\n}',
          testCases: [
            { input: '[1,2,3,4,5], 3', expectedOutput: '2' },
            { input: '[1,2,3,4,5], 6', expectedOutput: '-1' }
          ],
          timeLimit: 30,
          memoryLimit: 256,
          language: 'javascript'
        },
        explanation: 'Binary search is an efficient algorithm for finding an element in a sorted array',
        tags: ['algorithms', 'searching', 'binary-search'],
        createdBy: facultyId
      }
    ]);
    console.log('Sample questions created successfully');
    return questions;
  } catch (error) {
    console.error('Error creating questions:', error);
    throw error;
  }
};

// Create sample exam
const createExam = async (facultyId, questions) => {
  try {
    const exam = await Exam.create({
      title: 'JavaScript and Algorithms Quiz',
      description: 'Test your knowledge of JavaScript and basic algorithms',
      duration: 60,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // 25 hours from now
      questions: questions.map((q, index) => ({
        question: q._id,
        order: index + 1,
        points: q.points
      })),
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      passingScore: 60,
      createdBy: facultyId,
      department: 'Computer Science',
      course: 'Programming Fundamentals',
      category: 'Programming',
      tags: ['javascript', 'algorithms', 'quiz'],
      instructions: 'Read each question carefully. For coding questions, ensure your code is efficient and handles edge cases.',
      syllabus: [
        {
          topic: 'JavaScript Basics',
          description: 'Variables, functions, and control structures'
        },
        {
          topic: 'Algorithms',
          description: 'Basic algorithms and their implementations'
        }
      ]
    });
    console.log('Sample exam created successfully');
    return exam;
  } catch (error) {
    console.error('Error creating exam:', error);
    throw error;
  }
};

// Create sample result
const createResult = async (examId, studentId) => {
  try {
    const result = await Result.create({
      exam: examId,
      student: studentId,
      answers: [
        {
          questionId: examId,
          answer: 'A programming language',
          isCorrect: true,
          pointsEarned: 2,
          timeSpent: 30,
          attempts: [
            {
              answer: 'A programming language',
              timestamp: new Date(),
              isCorrect: true
            }
          ]
        }
      ],
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later
      totalPoints: 2,
      score: 2,
      percentage: 100,
      status: 'passed',
      proctoringData: {
        browserTabs: [
          {
            url: 'http://localhost:3000/exam',
            timestamp: new Date(),
            duration: 1800
          }
        ],
        faceDetection: [
          {
            confidence: 0.95,
            timestamp: new Date(),
            faceCount: 1,
            isViolation: false
          }
        ],
        audioLevels: [
          {
            level: 0.1,
            timestamp: new Date(),
            isViolation: false
          }
        ],
        systemInfo: {
          ipAddress: '127.0.0.1',
          browserInfo: 'Chrome/91.0.4472.124',
          osInfo: 'Windows 10',
          deviceInfo: 'Desktop'
        }
      }
    });
    console.log('Sample result created successfully');
    return result;
  } catch (error) {
    console.error('Error creating result:', error);
    throw error;
  }
};

// Create sample proctoring data
const createProctoring = async (examId, studentId) => {
  try {
    const proctoring = await Proctoring.create({
      exam: examId,
      student: studentId,
      session: 'session123',
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 60 * 1000),
      faceDetection: [
        {
          timestamp: new Date(),
          confidence: 0.95,
          faceCount: 1,
          isViolation: false
        }
      ],
      eyeTracking: [
        {
          timestamp: new Date(),
          gazePoint: { x: 0.5, y: 0.5 },
          eyeOpenness: 0.9,
          isViolation: false
        }
      ],
      audioMonitoring: [
        {
          timestamp: new Date(),
          audioLevel: 0.1,
          isViolation: false
        }
      ],
      tabSwitching: [
        {
          timestamp: new Date(),
          tabTitle: 'Exam Portal',
          url: 'http://localhost:3000/exam',
          isViolation: false
        }
      ],
      systemMonitoring: [
        {
          timestamp: new Date(),
          cpuUsage: 30,
          memoryUsage: 40,
          networkActivity: false,
          isViolation: false
        }
      ],
      status: 'completed',
      settings: {
        faceDetectionEnabled: true,
        eyeTrackingEnabled: true,
        audioMonitoringEnabled: true,
        tabSwitchingEnabled: true,
        systemMonitoringEnabled: true,
        violationThresholds: {
          face: 0.8,
          eye: 0.7,
          audio: 0.6,
          tab: 3,
          system: 80
        }
      }
    });
    console.log('Sample proctoring data created successfully');
    return proctoring;
  } catch (error) {
    console.error('Error creating proctoring data:', error);
    throw error;
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    await clearDatabase();
    const users = await createUsers();
    const questions = await createQuestions(users[1]._id); // faculty user
    const exam = await createExam(users[1]._id, questions);
    await createResult(exam._id, users[0]._id); // student user
    await createProctoring(exam._id, users[0]._id);
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedDatabase(); 