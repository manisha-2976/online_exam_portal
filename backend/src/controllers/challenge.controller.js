
const Challenge = require('../models/challenge.model');
const { SUPPORTED_LANGUAGES } = require('../models/challenge.model');
const { runCode } = require('../utils/codeRunner');
const logger = require('../utils/logger');

const getChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({ isActive: true })
      .populate('questions', 'text subject difficulty type')
      .populate('createdBy', 'name')
      .select('-__v');
    res.json(challenges);
  } catch (error) {
    logger.error('Error fetching challenges:', error);
    res.status(500).json({ message: 'Error fetching challenges' });
  }
};

const getChallengeById = async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await Challenge.findById(id)
      .populate('questions', 'text subject difficulty type')
      .populate('createdBy', 'name')
      .select('-__v');

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    res.json(challenge);
  } catch (error) {
    logger.error('Error fetching challenge:', error);
    res.status(500).json({ message: 'Error fetching challenge' });
  }
};

// Builds allowedLanguages / starterCode map / solution map together, enforcing
// that every active language has a non-empty reference solution.
const buildLanguagePayload = ({ challengeType, allowedLanguages, starterCode, solution }) => {
  if (challengeType === 'bash') {
    const starter = (starterCode && (starterCode.bash ?? Object.values(starterCode)[0])) || '';
    const sol = (solution && (solution.bash ?? Object.values(solution)[0])) || '';
    if (!sol.trim()) {
      throw new Error('Reference solution is required for the bash script');
    }
    return {
      allowedLanguages: ['bash'],
      starterCode: new Map([['bash', starter]]),
      solution: new Map([['bash', sol]])
    };
  }

  const langs = Array.isArray(allowedLanguages) && allowedLanguages.length > 0
    ? allowedLanguages
    : ['javascript', 'python', 'java',];

  const invalid = langs.filter((l) => !SUPPORTED_LANGUAGES.includes(l));
  if (invalid.length > 0) {
    throw new Error(`Unsupported language(s): ${invalid.join(', ')}`);
  }

  const starterMap = new Map();
  const solutionMap = new Map();

  // langs.forEach((lang) => {
  //   starterMap.set(lang, (starterCode && starterCode[lang]) || '');
  //   const sol = (solution && solution[lang]) || '';
  //   if (!sol.trim()) {
  //     throw new Error(`Reference solution is required for ${lang}`);
  //   }
  //   solutionMap.set(lang, sol);
  // });
  langs.forEach((lang) => {
  starterMap.set(lang, (starterCode && starterCode[lang]) || '');

  const sol = (solution && solution[lang]) || '';

  if (!sol.trim()) {
    throw new Error(`Reference solution is required for ${lang}`);
  }

  solutionMap.set(lang, sol);
});

  return { allowedLanguages: langs, starterCode: starterMap, solution: solutionMap };
};

const resolveProctoring = (proctoring) => ({
  webcamEnabled: proctoring?.webcamEnabled !== false,
  tabSwitchingEnabled: proctoring?.tabSwitchingEnabled !== false,
  voiceDetectionEnabled: proctoring?.voiceDetectionEnabled !== false
});

const createChallenge = async (req, res) => {
  try {
    const {
      title, description, difficulty, category,
      startDate, endDate, questions,
      challengeType, allowedLanguages, starterCode, solution,
      testCases, timeLimit, memoryLimit, proctoring
    } = req.body;

    logger.info('Creating new challenge:', { title, difficulty, category, challengeType, createdBy: req.user._id });

    if (!testCases || testCases.length === 0) {
      return res.status(400).json({ message: 'At least one test case is required' });
    }

    const resolvedType = challengeType === 'bash' ? 'bash' : 'coding';

    let langInfo;
    try {
      langInfo = buildLanguagePayload({ challengeType: resolvedType, allowedLanguages, starterCode, solution });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const challenge = new Challenge({
      title,
      description,
      difficulty,
      category,
      startDate,
      endDate,
      questions: questions || [],
      challengeType: resolvedType,
      allowedLanguages: langInfo.allowedLanguages,
      starterCode: langInfo.starterCode,
      solution: langInfo.solution,
      testCases,
      timeLimit,
      memoryLimit,
      proctoring: resolveProctoring(proctoring),
      createdBy: req.user._id,
      isActive: true,
      status: 'published'
    });

    await challenge.save();
    logger.info(`Challenge created successfully: ${challenge._id}`);

    res.status(201).json(challenge);
  } catch (error) {
    logger.error('Error creating challenge:', error);
    res.status(500).json({ message: error.message || 'Error creating challenge' });
  }
};

const updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, difficulty, category,
      startDate, endDate, questions,
      challengeType, allowedLanguages, starterCode, solution,
      testCases, timeLimit, memoryLimit, proctoring
    } = req.body;

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (title) challenge.title = title;
    if (description) challenge.description = description;
    if (difficulty) challenge.difficulty = difficulty;
    if (category) challenge.category = category;
    if (startDate) challenge.startDate = startDate;
    if (endDate) challenge.endDate = endDate;
    if (questions) challenge.questions = questions;
    if (testCases) challenge.testCases = testCases;
    if (timeLimit) challenge.timeLimit = timeLimit;
    if (memoryLimit) challenge.memoryLimit = memoryLimit;
    if (proctoring) challenge.proctoring = resolveProctoring(proctoring);

    if (challengeType || allowedLanguages || starterCode || solution) {
      const resolvedType = challengeType || challenge.challengeType;
      try {
        const langInfo = buildLanguagePayload({
          challengeType: resolvedType,
          allowedLanguages: allowedLanguages || challenge.allowedLanguages,
          starterCode: starterCode || Object.fromEntries(challenge.starterCode || new Map()),
          solution: solution || Object.fromEntries(challenge.solution || new Map())
        });
        challenge.challengeType = resolvedType;
        challenge.allowedLanguages = langInfo.allowedLanguages;
        challenge.starterCode = langInfo.starterCode;
        challenge.solution = langInfo.solution;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    await challenge.save();
    res.json(challenge);
  } catch (error) {
    logger.error('Error updating challenge:', error);
    res.status(500).json({ message: error.message || 'Error updating challenge' });
  }
};

const deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    await Challenge.findByIdAndDelete(id);
    res.json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    logger.error('Error deleting challenge:', error);
    res.status(500).json({ message: 'Error deleting challenge' });
  }
};

const startChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { language } = req.body;
    const challenge = await Challenge.findById(id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
    if (!challenge.isActive) return res.status(400).json({ message: 'Challenge is not active' });

    const now = new Date();
    if (now < challenge.startDate) return res.status(400).json({ message: 'Challenge has not started yet' });
    if (now > challenge.endDate) return res.status(400).json({ message: 'Challenge has ended' });

    // Block reopening after a completed submission.
    const alreadyCompleted = challenge.submissions.find(
      (sub) => sub.userId.toString() === req.user._id.toString() && sub.status === 'completed'
    );
    if (alreadyCompleted) {
      return res.status(400).json({ message: 'You have already submitted this challenge and cannot reopen it.' });
    }

    // Resume an existing in-progress attempt instead of creating a duplicate.
    const existingInProgress = challenge.submissions.find(
      (sub) => sub.userId.toString() === req.user._id.toString() && sub.status === 'in-progress'
    );
    if (existingInProgress) {
      return res.json({ message: 'Resuming your existing attempt', submission: existingInProgress });
    }

    if (language && !challenge.allowedLanguages.includes(language)) {
      return res.status(400).json({ message: `Language not supported. Allowed: ${challenge.allowedLanguages.join(', ')}` });
    }

    const submission = {
      userId: req.user._id,
      challengeId: challenge._id,
      startTime: now,
      language: language || challenge.allowedLanguages[0],
      status: 'in-progress'
    };

    challenge.submissions.push(submission);
    await challenge.save();

    res.json({ message: 'Challenge started successfully', submission });
  } catch (error) {
    logger.error('Error starting challenge:', error);
    res.status(500).json({ message: 'Error starting challenge' });
  }
};

const submitChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, language, warnings, tabSwitchCount } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const submissionIndex = challenge.submissions.findIndex(
      (sub) => sub.userId.toString() === req.user._id.toString() && sub.status === 'in-progress'
    );

    if (submissionIndex === -1) {
      return res.status(400).json({ message: 'No active submission found. Please start the challenge first.' });
    }

    const runLanguage = language || challenge.submissions[submissionIndex].language;

    // Grade: run the candidate's code against every test case for real.
    const testCases = challenge.testCases || [];
    let passedCount = 0;
    const testResults = [];

    for (const tc of testCases) {
      try {
        const result = await runCode({ code, language: runLanguage, stdin: tc.input || '' });
        const actual = (result.output || '').trim();
        const expected = (tc.output || '').trim();
        const passed = !!result.success && actual === expected;
        if (passed) passedCount += 1;
        testResults.push({ passed, expected, actual: actual.slice(0, 1000) });
      } catch (err) {
        testResults.push({ passed: false, expected: (tc.output || '').trim(), actual: `Error: ${err.message}` });
      }
    }

    const score = testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 0;

    challenge.submissions[submissionIndex].code = code;
    challenge.submissions[submissionIndex].language = runLanguage;
    challenge.submissions[submissionIndex].endTime = new Date();
    challenge.submissions[submissionIndex].status = 'completed';
    challenge.submissions[submissionIndex].score = score;
    challenge.submissions[submissionIndex].passedTestCases = passedCount;
    challenge.submissions[submissionIndex].totalTestCases = testCases.length;
    if (Array.isArray(warnings)) challenge.submissions[submissionIndex].warnings = warnings;
    if (typeof tabSwitchCount === 'number') challenge.submissions[submissionIndex].tabSwitchCount = tabSwitchCount;

    await challenge.save();

    res.json({
      message: 'Challenge submitted successfully',
      score,
      passedTestCases: passedCount,
      totalTestCases: testCases.length,
      testResults
    });
  } catch (error) {
    logger.error('Error submitting challenge:', error);
    res.status(500).json({ message: 'Error submitting challenge' });
  }
};

// Latest submission for the current user on this challenge — used by the
// frontend to show a "Submitted" badge and block reopening.
const getChallengeSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const challenge = await Challenge.findById(id).select('submissions');
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const mine = challenge.submissions
      .filter((s) => s.userId.toString() === req.user._id.toString())
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    const latest = mine[0];
    if (!latest) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({
      status: latest.status,
      score: latest.score,
      passedTestCases: latest.passedTestCases,
      totalTestCases: latest.totalTestCases,
      language: latest.language,
      startTime: latest.startTime,
      endTime: latest.endTime
    });
  } catch (error) {
    logger.error('Error fetching challenge submission:', error);
    res.status(500).json({ message: 'Error fetching submission' });
  }
};
// ============================================================
// GET ALL SUBMISSIONS - ADMIN
// GET /api/submissions
// ============================================================
const getAllSubmissions = async (req, res) => {
  try {
    const challenges = await Challenge.find({})
      .populate('submissions.userId', 'name email')
      .select('title submissions');

    const submissions = [];

    for (const challenge of challenges) {
      for (const submission of challenge.submissions || []) {
        submissions.push({
          _id: submission._id,
          challenge: {
            _id: challenge._id,
            title: challenge.title
          },
          user: submission.userId
            ? {
                _id: submission.userId._id,
                name: submission.userId.name,
                email: submission.userId.email
              }
            : {
                _id: submission.userId,
                name: 'Unknown User',
                email: ''
              },
          code: submission.code || '',
          language: submission.language || '',
          status: submission.status || 'pending',
          result: {
            passed: submission.status === 'completed' && (submission.score || 0) === 100,
            testCasesPassed: submission.passedTestCases || 0,
            totalTestCases: submission.totalTestCases || 0,
            executionTime: submission.executionTime || 0,
            memoryUsed: submission.memoryUsed || 0
          },
          createdAt: submission.startTime || challenge.createdAt
        });
      }
    }

    // Latest submissions first
    submissions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    res.json(submissions);
  } catch (error) {
    logger.error('Error fetching all submissions:', error);

    res.status(500).json({
      message: 'Error fetching submissions'
    });
  }
};


// ============================================================
// GET MY SUBMISSIONS - STUDENT
// GET /api/submissions/my
// ============================================================
const getMySubmissions = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      'submissions.userId': req.user._id
    })
      .populate('submissions.userId', 'name email')
      .select('title submissions');

    const submissions = [];

    for (const challenge of challenges) {
      for (const submission of challenge.submissions || []) {

        // Only current student's submissions
        if (
          submission.userId?._id?.toString() !==
          req.user._id.toString()
        ) {
          continue;
        }

        submissions.push({
          _id: submission._id,

          challenge: {
            _id: challenge._id,
            title: challenge.title
          },

          user: submission.userId
            ? {
                _id: submission.userId._id,
                name: submission.userId.name,
                email: submission.userId.email
              }
            : {
                _id: req.user._id,
                name: req.user.name || 'Student',
                email: req.user.email || ''
              },

          code: submission.code || '',

          language: submission.language || '',

          status: submission.status || 'pending',

          result: {
            passed:
              submission.status === 'completed' &&
              (submission.score || 0) === 100,

            testCasesPassed:
              submission.passedTestCases || 0,

            totalTestCases:
              submission.totalTestCases || 0,

            executionTime:
              submission.executionTime || 0,

            memoryUsed:
              submission.memoryUsed || 0
          },

          createdAt:
            submission.startTime || challenge.createdAt
        });
      }
    }

    // Latest first
    submissions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    res.json(submissions);
  } catch (error) {
    logger.error('Error fetching my submissions:', error);

    res.status(500).json({
      message: 'Error fetching my submissions'
    });
  }
};

module.exports = {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  startChallenge,
  submitChallenge,
  getChallengeSubmission,
  getAllSubmissions,
  getMySubmissions
};