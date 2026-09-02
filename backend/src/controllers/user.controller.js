const User = require('../models/user.model');
const logger = require('../utils/logger');

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -otp -loginAttempts -lockUntil');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, department, semester, batch } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (department) user.department = department;
    if (semester) user.semester = semester;
    if (batch) user.batch = batch;

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
        department: user.department,
        semester: user.semester,
        batch: user.batch,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -loginAttempts -lockUntil');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, department, semester, batch } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (department) user.department = department;
    if (semester) user.semester = semester;
    if (batch) user.batch = batch;
    
    await user.save();
    logger.info(`User updated successfully: ${user._id}`);
    
    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        department: user.department,
        semester: user.semester,
        batch: user.batch,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has any exams or submissions
    // This would require additional models and checks
    
    await User.findByIdAndDelete(id);
    logger.info(`User deleted successfully: ${id}`);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

module.exports = {
  getCurrentUser,
  updateProfile,
  getUserById,
  updateUser,
  deleteUser
}; 