const Challenge = require('../models/challenge.model');
const logger = require('../utils/logger');

// Get all challenges
const getChallenges = async (req, res) => {
  try {
    logger.info('Getting all challenges');
    const challenges = await Challenge.find({ isActive: true })
      .populate('questions', 'title difficulty category')
      .select('-__v');
    
    logger.info(`Found ${challenges.length} challenges`);
    res.json(challenges);
  } catch (error) {
    logger.error('Error fetching challenges:', error);
    res.status(500).json({ message: 'Error fetching challenges' });
  }
};

// Get a single challenge by ID
const getChallengeById = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Getting challenge by ID: ${id}`);
    
    const challenge = await Challenge.findById(id)
      .populate('questions', 'title difficulty category')
      .select('-__v');
    
    if (!challenge) {
      logger.warn(`Challenge not found: ${id}`);
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    logger.info(`Found challenge: ${id}`);
    res.json(challenge);
  } catch (error) {
    logger.error('Error fetching challenge:', error);
    res.status(500).json({ message: 'Error fetching challenge' });
  }
};

// Create a new challenge
const createChallenge = async (req, res) => {
  try {
    const { title, description, difficulty, category, startDate, endDate, questions } = req.body;
    logger.info('Creating new challenge:', { title, difficulty, category });
    
    const challenge = new Challenge({
      title,
      description,
      difficulty,
      category,
      startDate,
      endDate,
      questions,
      createdBy: req.user._id
    });
    
    await challenge.save();
    logger.info(`Challenge created successfully: ${challenge._id}`);
    
    res.status(201).json(challenge);
  } catch (error) {
    logger.error('Error creating challenge:', error);
    res.status(500).json({ message: 'Error creating challenge' });
  }
};

// Update a challenge
const updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, difficulty, category, startDate, endDate, questions } = req.body;
    logger.info(`Updating challenge: ${id}`);
    
    const challenge = await Challenge.findById(id);
    if (!challenge) {
      logger.warn(`Challenge not found: ${id}`);
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    // Update fields if provided
    if (title) challenge.title = title;
    if (description) challenge.description = description;
    if (difficulty) challenge.difficulty = difficulty;
    if (category) challenge.category = category;
    if (startDate) challenge.startDate = startDate;
    if (endDate) challenge.endDate = endDate;
    if (questions) challenge.questions = questions;
    
    await challenge.save();
    logger.info(`Challenge updated successfully: ${id}`);
    
    res.json(challenge);
  } catch (error) {
    logger.error('Error updating challenge:', error);
    res.status(500).json({ message: 'Error updating challenge' });
  }
};

// Delete a challenge
const deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Deleting challenge: ${id}`);
    
    const challenge = await Challenge.findById(id);
    if (!challenge) {
      logger.warn(`Challenge not found: ${id}`);
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    await Challenge.findByIdAndDelete(id);
    logger.info(`Challenge deleted successfully: ${id}`);
    
    res.json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    logger.error('Error deleting challenge:', error);
    res.status(500).json({ message: 'Error deleting challenge' });
  }
};

// Start a challenge
const startChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Starting challenge: ${id}`);
    
    const challenge = await Challenge.findById(id);
    if (!challenge) {
      logger.warn(`Challenge not found: ${id}`);
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    // Check if challenge is active
    if (!challenge.isActive) {
      logger.warn(`Challenge is not active: ${id}`);
      return res.status(400).json({ message: 'Challenge is not active' });
    }
    
    // Check if challenge has started
    const now = new Date();
    if (now < challenge.startDate) {
      logger.warn(`Challenge has not started yet: ${id}`);
      return res.status(400).json({ message: 'Challenge has not started yet' });
    }
    
    // Check if challenge has ended
    if (now > challenge.endDate) {
      logger.warn(`Challenge has ended: ${id}`);
      return res.status(400).json({ message: 'Challenge has ended' });
    }
    
    // Create a submission for the user
    const submission = {
      userId: req.user._id,
      challengeId: challenge._id,
      startTime: now,
      status: 'in-progress'
    };
    
    // Add submission to challenge
    challenge.submissions.push(submission);
    await challenge.save();
    
    logger.info(`Challenge started successfully: ${id}`);
    res.json({ message: 'Challenge started successfully', submission });
  } catch (error) {
    logger.error('Error starting challenge:', error);
    res.status(500).json({ message: 'Error starting challenge' });
  }
};

// Submit a challenge
const submitChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    logger.info(`Submitting challenge: ${id}`);
    
    const challenge = await Challenge.findById(id);
    if (!challenge) {
      logger.warn(`Challenge not found: ${id}`);
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    // Find the user's submission
    const submissionIndex = challenge.submissions.findIndex(
      sub => sub.userId.toString() === req.user._id.toString() && sub.status === 'in-progress'
    );
    
    if (submissionIndex === -1) {
      logger.warn(`No active submission found for user: ${req.user._id}`);
      return res.status(400).json({ message: 'No active submission found' });
    }
    
    // Update submission
    challenge.submissions[submissionIndex].answers = answers;
    challenge.submissions[submissionIndex].endTime = new Date();
    challenge.submissions[submissionIndex].status = 'completed';
    
    await challenge.save();
    logger.info(`Challenge submitted successfully: ${id}`);
    
    res.json({ message: 'Challenge submitted successfully' });
  } catch (error) {
    logger.error('Error submitting challenge:', error);
    res.status(500).json({ message: 'Error submitting challenge' });
  }
};

module.exports = {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  startChallenge,
  submitChallenge
}; 