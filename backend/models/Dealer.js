const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const dealerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'dealer'],
    default: 'dealer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2592000 // 30 days in seconds
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
dealerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
dealerSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Generate access token
dealerSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email, 
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );
};

// Generate refresh token
dealerSchema.methods.generateRefreshToken = function() {
  return crypto.randomBytes(40).toString('hex');
};

// Add refresh token to dealer
dealerSchema.methods.addRefreshToken = async function(refreshToken) {
  // Remove old refresh tokens (keep only last 5)
  if (this.refreshTokens.length >= 5) {
    this.refreshTokens = this.refreshTokens.slice(-4);
  }
  
  this.refreshTokens.push({ token: refreshToken });
  await this.save();
};

// Remove refresh token
dealerSchema.methods.removeRefreshToken = async function(refreshToken) {
  this.refreshTokens = this.refreshTokens.filter(
    tokenObj => tokenObj.token !== refreshToken
  );
  await this.save();
};

// Remove all refresh tokens (for logout all devices)
dealerSchema.methods.removeAllRefreshTokens = async function() {
  this.refreshTokens = [];
  await this.save();
};

// Remove password from JSON output
dealerSchema.methods.toJSON = function() {
  const dealer = this.toObject();
  delete dealer.password;
  return dealer;
};

module.exports = mongoose.model('Dealer', dealerSchema);
