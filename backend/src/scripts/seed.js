const User = require('../models/user.model');
const Question = require('../models/question.model');
const Exam = require('../models/exam.model');
const Result = require('../models/result.model');
const Proctoring = require('../models/proctoring.model');
const { connectDB } = require('../config/database');
const logger = require('../utils/logger');
require('dotenv').config();

const seedData = async () => {
  try {
    // Connect to MongoDB using the centralized configuration
    await connectDB();
    logger.info('Starting database seeding...');

    // Your seeding logic here
    // ...

    logger.info('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeding
seedData(); 