const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { generateTokens, blacklistToken, rotateRefreshToken, verifyToken } = require('../utils/token');
const { generateOTP } = require('../utils/otp');
const emailService = require('../services/email.service');
const logger = require('../utils/logger');

// Password validation regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    logger.info('Registration attempt:', { email, role });

    // Validate password strength
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Registration failed: Email already exists', { email });
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate OTP
    const otp = generateOTP();
    logger.info('Generated OTP for registration:', { email, otp });

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'student',
      otp: {
        token: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    await user.save();
    logger.info('User created successfully:', { userId: user._id, email });

    // Send OTP via email
    let emailSent = false;
    try {
      emailSent = await emailService.sendOTPEmail(email, otp);
    } catch (emailError) {
      logger.error('Failed to send OTP email:', { email, error: emailError });
      // In development, continue without email
      if (process.env.NODE_ENV !== 'production') {
        emailSent = true;
      }
    }

    if (!emailSent && process.env.NODE_ENV === 'production') {
      // In production, we need to send the email
      await User.findByIdAndDelete(user._id); // Rollback user creation
      return res.status(500).json({ message: 'Error sending verification email. Please try again.' });
    }

    // Prepare response
    const response = {
      message: 'Registration successful. Please check your email for OTP.',
      userId: user._id,
      email
    };

    // In development, always include OTP
    if (process.env.NODE_ENV === 'development') {
      response.otp = otp;
    }

    res.status(201).json(response);
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    logger.info('Login attempt:', { email });

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Login failed: User not found', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      logger.warn('Login failed: Email not verified', { email });
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    // Check if account is locked
    if (user.loginAttempts >= 5 && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(401).json({
        message: `Account is locked. Please try again in ${remainingTime} minutes`
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
      }
      
      await user.save();
      logger.warn('Login failed: Invalid password', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // Set cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : 'localhost',
      path: '/'
    };

    // Set tokens as HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info('Login successful:', { userId: user._id, email });

    // Return user data and tokens in response
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    logger.info('OTP verification attempt:', { email });

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('OTP verification failed: User not found', { email });
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || !user.otp.token || user.otp.expiresAt < new Date()) {
      logger.warn('OTP verification failed: Invalid or expired OTP', { email });
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (user.otp.token !== otp) {
      logger.warn('OTP verification failed: Incorrect OTP', { email });
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    // Clear OTP and mark email as verified
    user.otp = undefined;
    user.isEmailVerified = true;
    await user.save();

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Set tokens as HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info('OTP verification successful:', { email });
    res.json({
      message: 'Email verified successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: true
      }
    });
  } catch (error) {
    logger.error('OTP verification error:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    user.otp = {
      token: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    await user.save();

    // Send OTP via email
    const emailSent = await emailService.sendOTPEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({ message: 'Error sending verification email' });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    logger.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Error resending OTP' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    logger.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    if (token) {
      // Add token to blacklist
      const decoded = jwt.decode(token);
      await blacklistToken(token, decoded.exp);
    }
    
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    // Verify the refresh token
    const decoded = await verifyToken(oldRefreshToken, true);
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(oldRefreshToken, decoded.userId);

    // Set new cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

const googleAuth = (req, res) => {
  // Implement Google OAuth login
  res.status(501).json({ message: 'Google OAuth not implemented yet' });
};

const googleCallback = async (req, res) => {
  try {
    res.redirect(`${process.env.CLIENT_URL}/auth/success`);
  } catch (error) {
    logger.error('Google callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/error`);
  }
};

module.exports = {
  register,
  login,
  verifyOTP,
  resendOTP,
  getCurrentUser,
  logout,
  refreshToken,
  googleAuth,
  googleCallback
}; 