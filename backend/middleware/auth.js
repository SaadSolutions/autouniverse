const jwt = require('jsonwebtoken');
const Dealer = require('../models/Dealer');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dealer = await Dealer.findById(decoded.id).select('-password');
    
    if (!dealer) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (!dealer.isActive) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    req.dealer = dealer;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    res.status(401).json({ 
      error: 'Access denied', 
      message: 'Invalid token',
      code: 'AUTH_ERROR'
    });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.dealer.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin access required'
    });
  }
  next();
};

module.exports = { auth, adminOnly };
