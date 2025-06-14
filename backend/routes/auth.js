const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Dealer = require('../models/Dealer');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register new dealer (Admin only)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('role').optional().isIn(['admin', 'dealer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors.array().map(err => err.msg)
      });
    }

    const { email, password, name, role } = req.body;

    // Check if dealer already exists
    const existingDealer = await Dealer.findOne({ email });
    if (existingDealer) {
      return res.status(400).json({
        error: 'Registration failed',
        message: 'Email already registered'
      });
    }

    // Create new dealer
    const dealer = new Dealer({
      email,
      password,
      name,
      role: role || 'dealer'
    });

    await dealer.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: dealer._id, email: dealer.email, role: dealer.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Dealer registered successfully',
      token,
      dealer: {
        id: dealer._id,
        email: dealer.email,
        name: dealer.name,
        role: dealer.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors.array().map(err => err.msg)
      });
    }

    const { email, password } = req.body;

    // Find dealer by email
    const dealer = await Dealer.findOne({ email });
    if (!dealer) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!dealer.isActive) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Account is inactive'
      });
    }

    // Verify password
    const isPasswordValid = await dealer.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password'
      });
    }

    // Update last login
    dealer.lastLogin = new Date();
    await dealer.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: dealer._id, email: dealer.email, role: dealer.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      dealer: {
        id: dealer._id,
        email: dealer.email,
        name: dealer.name,
        role: dealer.role,
        lastLogin: dealer.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    });
  }
});

// Get current dealer profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      dealer: {
        id: req.dealer._id,
        email: req.dealer.email,
        name: req.dealer.name,
        role: req.dealer.role,
        lastLogin: req.dealer.lastLogin,
        createdAt: req.dealer.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'Internal server error'
    });
  }
});

// Update dealer profile
router.put('/profile', [auth, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors.array().map(err => err.msg)
      });
    }

    const { name, email } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (email && email !== req.dealer.email) {
      // Check if new email is already taken
      const existingDealer = await Dealer.findOne({ email });
      if (existingDealer) {
        return res.status(400).json({
          error: 'Update failed',
          message: 'Email already in use'
        });
      }
      updates.email = email;
    }

    const dealer = await Dealer.findByIdAndUpdate(
      req.dealer._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully',
      dealer: {
        id: dealer._id,
        email: dealer.email,
        name: dealer.name,
        role: dealer.role
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'Internal server error'
    });
  }
});

// Change password
router.put('/change-password', [auth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors.array().map(err => err.msg)
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const dealer = await Dealer.findById(req.dealer._id);
    const isCurrentPasswordValid = await dealer.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Password change failed',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    dealer.password = newPassword;
    await dealer.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'Internal server error'
    });
  }
});

// Verify token
router.get('/verify', auth, (req, res) => {
  res.json({
    valid: true,
    dealer: {
      id: req.dealer._id,
      email: req.dealer.email,
      name: req.dealer.name,
      role: req.dealer.role
    }
  });
});

// Logout (client-side token removal)
router.post('/logout', auth, (req, res) => {
  res.json({
    message: 'Logged out successfully'
  });
});

module.exports = router;
