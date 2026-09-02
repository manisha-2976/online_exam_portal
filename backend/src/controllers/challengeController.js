const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const { executeCode } = require('../services/judge0Service');

exports.createChallenge = async (req, res) => {
  try {
    const challenge = new Challenge({
      ...req.body,
      createdBy: req.user._id
    });
    await challenge.save();
    res.status(201).json(challenge);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getChallenges = async (req, res) => {
  try {
    const { difficulty, category, status = 'published' } = req.query;
    const query = { status };
    
    if (difficulty) query.difficulty = difficulty;
    if (category) query.category = category;
    
    const challenges = await Challenge.find(query)
      .select('-solution -testCases.isHidden')
      .populate('createdBy', 'name email');
    
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getChallengeById = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .select('-solution')
      .populate('createdBy', 'name email');
    
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    // Filter out hidden test cases
    challenge.testCases = challenge.testCases.filter(tc => !tc.isHidden);
    
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    if (challenge.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this challenge' });
    }
    
    Object.assign(challenge, req.body);
    await challenge.save();
    
    res.json(challenge);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    if (challenge.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this challenge' });
    }
    
    await challenge.remove();
    res.json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitSolution = async (req, res) => {
  try {
    const { code, language } = req.body;
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    const submission = new Submission({
      challenge: challenge._id,
      user: req.user._id,
      code,
      language
    });
    
    await submission.save();
    
    // Execute code against test cases
    const results = await Promise.all(
      challenge.testCases.map(async (testCase) => {
        const result = await executeCode(code, language, testCase.input);
        return {
          input: testCase.input,
          expectedOutput: testCase.output,
          actualOutput: result.output,
          status: result.output.trim() === testCase.output.trim() ? 'passed' : 'failed',
          executionTime: result.executionTime,
          memoryUsed: result.memoryUsed
        };
      })
    );
    
    submission.testCases = results;
    submission.status = 'completed';
    submission.result = results.every(r => r.status === 'passed') ? 'accepted' : 'wrong_answer';
    submission.executionTime = Math.max(...results.map(r => r.executionTime));
    submission.memoryUsed = Math.max(...results.map(r => r.memoryUsed));
    
    await submission.save();
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 