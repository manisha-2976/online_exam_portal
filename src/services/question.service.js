const Question = require('../models/question.model');
const logger = require('../utils/logger');

class QuestionService {
  /**
   * Select random questions based on criteria
   * @param {string} subject - The subject of the exam
   * @param {Object} criteria - Number of questions needed by difficulty
   * @returns {Promise<Array>} Array of selected question IDs
   */
  static async selectQuestions(subject, criteria) {
    try {
      const selectedQuestions = [];
      
      for (const [difficulty, count] of Object.entries(criteria)) {
        if (count > 0) {
          const questions = await Question.aggregate([
            {
              $match: {
                subject,
                difficulty,
                is_used: false
              }
            },
            { $sample: { size: count } }
          ]);

          if (questions.length < count) {
            logger.warn(`Not enough ${difficulty} questions available for ${subject}`);
            throw new Error(`Insufficient ${difficulty} questions available for ${subject}`);
          }

          selectedQuestions.push(...questions.map(q => q._id));

          // Mark selected questions as used
          await Question.updateMany(
            { _id: { $in: questions.map(q => q._id) } },
            { 
              $set: { 
                is_used: true,
                last_used: new Date()
              }
            }
          );
        }
      }

      return selectedQuestions;
    } catch (error) {
      logger.error('Error selecting questions:', error);
      throw error;
    }
  }

  /**
   * Reset is_used status for questions that haven't been used in a while
   * @param {number} days - Number of days after which to reset
   */
  static async resetUsedStatus(days = 30) {
    try {
      const resetDate = new Date();
      resetDate.setDate(resetDate.getDate() - days);

      const result = await Question.updateMany(
        {
          is_used: true,
          last_used: { $lt: resetDate }
        },
        {
          $set: { 
            is_used: false,
            last_used: null
          }
        }
      );

      logger.info(`Reset used status for ${result.modifiedCount} questions`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error resetting question status:', error);
      throw error;
    }
  }

  /**
   * Create a new question
   * @param {Object} questionData - The question data
   * @returns {Promise<Question>} Created question
   */
  static async createQuestion(questionData) {
    try {
      const question = new Question(questionData);
      await question.save();
      return question;
    } catch (error) {
      logger.error('Error creating question:', error);
      throw error;
    }
  }

  /**
   * Get questions by subject and difficulty
   * @param {string} subject - The subject
   * @param {string} difficulty - The difficulty level
   * @returns {Promise<Array>} Array of questions
   */
  static async getQuestions(subject, difficulty) {
    try {
      return await Question.find({ subject, difficulty });
    } catch (error) {
      logger.error('Error fetching questions:', error);
      throw error;
    }
  }
}

module.exports = QuestionService; 