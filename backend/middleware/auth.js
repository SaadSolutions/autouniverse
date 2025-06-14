const jwt = require('jsonwebtoken');
const Dealer = require('../models/Dealer');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dealer = await Dealer.findById(decoded.id).select('-password');
    
    if (!dealer) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'Invalid token' 
      });
    }

    if (!dealer.isActive) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'Account is inactive' 
      });
    }

    req.dealer = dealer;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      error: 'Access denied', 
      message: 'Invalid token' 
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
