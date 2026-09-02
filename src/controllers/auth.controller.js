const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { generateOTP, verifyOTP } = require('../utils/otp');
const emailService = require('../services/email.service');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate OTP
    const { secret, token } = generateOTP();
    logger.info('Generated OTP for registration:', { email, token, secret });

    // Create new user with OTP
    const user = new User({
      name,
      email,
      password,
      role,
      otp: {
        token,
        secret,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    await user.save();

    // Send OTP via email
    const emailSent = await emailService.sendOTPEmail(email, token);
    if (!emailSent) {
      logger.error('Failed to send OTP email');
      return res.status(500).json({ message: 'Error sending verification email' });
    }

    logger.info('User registered successfully:', { email, userId: user._id });
    res.status(201).json({
      message: 'Registration successful. Please check your email for OTP.',
      userId: user._id,
      email
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Error during registration' });
  }
};

const verifyOTPHandler = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Log the incoming request
    logger.info('OTP verification request received:', { email, otp });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`OTP verification failed: User not found for email ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has OTP
    if (!user.otp) {
      logger.warn(`OTP verification failed: No OTP found for user ${email}`);
      return res.status(400).json({ message: 'No OTP found. Please request a new OTP.' });
    }

    // Log the OTP details for debugging
    logger.info('OTP verification attempt:', {
      email,
      receivedOTP: otp,
      storedOTP: user.otp.token,
      storedSecret: user.otp.secret,
      expiresAt: user.otp.expiresAt,
      currentTime: new Date()
    });

    // Verify OTP
    const isValid = verifyOTP(user.otp.token, otp);
    if (!isValid) {
      logger.warn(`Invalid OTP attempt for user ${email}:`, {
        received: otp,
        expected: user.otp.token,
        type: typeof otp,
        length: otp?.length
      });
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if OTP is expired
    if (user.otp.expiresAt < new Date()) {
      logger.warn(`OTP verification failed: OTP expired for user ${email}`);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
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
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`OTP verification successful for user ${email}`);
    res.json({
      message: 'Email verified successfully',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture
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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new OTP
    const { secret, token } = generateOTP();
    user.otp = {
      token,
      secret,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };

    await user.save();

    // Send new OTP via email
    const emailSent = await emailService.sendOTPEmail(email, token);
    if (!emailSent) {
      return res.status(500).json({ message: 'Error sending verification email' });
    }

    res.json({ message: 'New OTP sent successfully' });
  } catch (error) {
    logger.error('Error resending OTP:', error);
    res.status(500).json({ message: 'Error resending OTP' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Log login attempt
    logger.info('Login attempt:', { email });

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login failed: User not found for email ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      logger.warn(`Login failed: Email not verified for user ${email}`);
      return res.status(401).json({ message: 'Please verify your email first' });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn(`Login failed: Invalid password for user ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateToken(user);

    // Log successful login
    logger.info(`Login successful for user ${email}`, {
      userId: user._id,
      role: user.role
    });

    // Return user data and tokens
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture
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

const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    // Implement Google OAuth verification here
    res.status(501).json({ error: 'Google OAuth not implemented yet' });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Error during Google authentication' });
  }
};

const logout = async (req, res) => {
  try {
    // For now, just return success as token invalidation would be handled client-side
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Error during logout' });
  }
};

const generateToken = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tokens = generateToken(user);
    res.json(tokens);
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = user.generateResetToken();
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendEmail(email, 'Reset Password', `Click here to reset your password: ${resetUrl}`);

    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    res.status(500).json({ error: 'Error processing forgot password request' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Error resetting password' });
  }
};

const googleCallback = async (req, res) => {
  try {
    const token = req.user.generateAuthToken();
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  } catch (error) {
    logger.error('Google callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/error`);
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber || '',
      isEmailVerified: user.isEmailVerified,
      profilePicture: user.profilePicture
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      logger.warn(`User not found for profile update: ${req.user._id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    await user.save();
    logger.info(`Profile updated successfully for user ${user._id}`);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed successfully for user ${user.email}`);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
};

module.exports = {
  register,
  login,
  verifyOTPHandler,
  resendOTP,
  googleAuth,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  googleCallback,
  getProfile,
  updateProfile,
  changePassword
};