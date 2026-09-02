const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/tokenBlacklist.model');
const logger = require('./logger');

// Validate JWT secrets
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET; // Fallback to main secret if refresh secret not set
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Validate required secrets
if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not set in environment variables');
  throw new Error('JWT_SECRET is required for authentication');
}

const generateTokens = async (userId) => {
  try {
    if (!userId) {
      throw new Error('userId is required for token generation');
    }

    logger.info('Generating tokens for user:', { userId });

    const accessToken = jwt.sign(
      { userId },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    logger.info('Tokens generated successfully');
    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Error generating tokens:', error);
    throw new Error('Failed to generate tokens: ' + error.message);
  }
};

const verifyToken = async (token, isRefresh = false) => {
  try {
    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    logger.error('Token verification failed:', error);
    throw new Error('Invalid token');
  }
};

const blacklistToken = async (token, expiresAt) => {
  try {
    await TokenBlacklist.create({
      token,
      expiresAt: new Date(expiresAt * 1000) // Convert JWT expiry to Date
    });
  } catch (error) {
    logger.error('Error blacklisting token:', error);
    throw new Error('Failed to blacklist token');
  }
};

const rotateRefreshToken = async (oldRefreshToken, userId) => {
  try {
    // Blacklist the old refresh token
    const decoded = jwt.decode(oldRefreshToken);
    await blacklistToken(oldRefreshToken, decoded.exp);

    // Generate new tokens
    return await generateTokens(userId);
  } catch (error) {
    logger.error('Error rotating refresh token:', error);
    throw new Error('Failed to rotate refresh token');
  }
};

module.exports = {
  generateTokens,
  verifyToken,
  blacklistToken,
  rotateRefreshToken
}; 