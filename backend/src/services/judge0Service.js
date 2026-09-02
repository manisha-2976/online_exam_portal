const axios = require('axios');

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const LANGUAGE_IDS = {
  python: 71,    // Python 3.8
  javascript: 63, // Node.js 12
  cpp: 54,       // C++ (GCC 9.2.0)
  java: 62       // Java 13
};

exports.executeCode = async (code, language, input = '') => {
  try {
    // Create submission
    const createResponse = await axios.post(
      `${JUDGE0_API_URL}/submissions`,
      {
        source_code: code,
        language_id: LANGUAGE_IDS[language.toLowerCase()],
        stdin: input
      },
      {
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-host': process.env.JUDGE0_API_HOST,
          'x-rapidapi-key': process.env.JUDGE0_API_KEY
        }
      }
    );

    const token = createResponse.data.token;

    // Wait for a short time to allow processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get submission result
    const resultResponse = await axios.get(
      `${JUDGE0_API_URL}/submissions/${token}`,
      {
        headers: {
          'x-rapidapi-host': process.env.JUDGE0_API_HOST,
          'x-rapidapi-key': process.env.JUDGE0_API_KEY
        }
      }
    );

    const result = resultResponse.data;

    // Handle different status codes
    switch (result.status.id) {
      case 1: // In Queue
      case 2: // Processing
        return { status: 'running' };
      case 3: // Accepted
        return {
          status: 'completed',
          output: result.stdout || '',
          error: result.stderr || '',
          executionTime: result.time,
          memoryUsed: result.memory
        };
      case 4: // Wrong Answer
        return {
          status: 'completed',
          output: result.stdout || '',
          error: result.stderr || '',
          executionTime: result.time,
          memoryUsed: result.memory,
          result: 'wrong_answer'
        };
      case 5: // Time Limit Exceeded
        return {
          status: 'completed',
          error: 'Time limit exceeded',
          result: 'time_limit'
        };
      case 6: // Memory Limit Exceeded
        return {
          status: 'completed',
          error: 'Memory limit exceeded',
          result: 'memory_limit'
        };
      case 7: // Runtime Error
        return {
          status: 'completed',
          error: result.stderr || 'Runtime error',
          result: 'runtime_error'
        };
      case 8: // Compilation Error
        return {
          status: 'completed',
          error: result.compile_output || 'Compilation error',
          result: 'compilation_error'
        };
      default:
        return {
          status: 'error',
          error: 'Unknown error occurred'
        };
    }
  } catch (error) {
    console.error('Judge0 API Error:', error);
    return {
      status: 'error',
      error: 'Failed to execute code'
    };
  }
}; 