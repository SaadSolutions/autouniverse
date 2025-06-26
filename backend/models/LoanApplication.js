const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
  // Loan Information
  desiredLoanAmount: {
    type: Number,
    required: [true, 'Desired loan amount is required'],
    min: [1000, 'Loan amount must be at least $1,000']
  },
  desiredMonthlyPayment: {
    type: Number,
    min: [0, 'Monthly payment cannot be negative']
  },
  
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  middleInitial: {
    type: String,
    trim: true,
    maxlength: 1
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  ssn: {
    type: String,
    required: [true, 'Social Security Number is required'],
    match: [/^\d{3}-\d{2}-\d{4}$/, 'SSN must be in format XXX-XX-XXXX']
  },
  birthdate: {
    type: Date,
    required: [true, 'Birthdate is required']
  },
  driversLicenseNumber: {
    type: String,
    required: [true, 'Driver\'s license number is required'],
    trim: true
  },
  driversLicenseExpDate: {
    type: Date,
    required: [true, 'Driver\'s license expiration date is required']
  },
  
  // Contact Information
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  homePhone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // Residence Information
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  zip: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true,
    match: [/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code']
  },
  timeAtResidence: {
    type: String,
    required: [true, 'Time at residence is required'],
    trim: true
  },
  residenceType: {
    type: String,
    required: [true, 'Residence type is required'],
    enum: ['Rent', 'Own', 'Other']
  },
  mortgageRentPayment: {
    type: Number,
    required: [true, 'Monthly mortgage/rent payment is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  
  // Employment Information
  employmentStatus: {
    type: String,
    required: [true, 'Employment status is required'],
    enum: ['Employed', 'Self-Employed', 'Unemployed', 'Student', 'Retired']
  },
  employerName: {
    type: String,
    required: [true, 'Employer name is required'],
    trim: true
  },
  occupation: {
    type: String,
    required: [true, 'Job title/occupation is required'],
    trim: true
  },
  timeOnJob: {
    type: String,
    required: [true, 'Time on job is required'],
    trim: true
  },
  employerAddress: {
    type: String,
    required: [true, 'Employer address is required'],
    trim: true
  },
  employerCity: {
    type: String,
    required: [true, 'Employer city is required'],
    trim: true
  },
  employerState: {
    type: String,
    required: [true, 'Employer state is required'],
    trim: true
  },
  employerZip: {
    type: String,
    required: [true, 'Employer ZIP code is required'],
    trim: true,
    match: [/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code']
  },
  businessPhone: {
    type: String,
    trim: true
  },
  monthlyIncome: {
    type: Number,
    required: [true, 'Monthly income is required'],
    min: [0, 'Income cannot be negative']
  },
  additionalIncome: {
    type: Number,
    min: [0, 'Additional income cannot be negative'],
    default: 0
  },
  
  // Co-applicant Information (optional)
  hasCoApplicant: {
    type: Boolean,
    default: false
  },
  coApplicant: {
    firstName: String,
    lastName: String,
    ssn: String,
    phone: String,
    relationship: String
  },
  
  // Trade-in Information (optional)
  hasTradeIn: {
    type: Boolean,
    default: false
  },
  tradeIn: {
    make: String,
    model: String,
    year: Number,
    mileage: Number,
    condition: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor']
    },
    estimatedValue: Number,
    lienInfo: String
  },
  
  // Application Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'under_review'],
    default: 'pending'
  },
  
  // Internal Notes
  internalNotes: {
    type: String,
    trim: true
  },
  
  // Email tracking
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  
  // Terms acceptance
  termsAccepted: {
    type: Boolean,
    required: [true, 'Terms must be accepted'],
    validate: {
      validator: function(v) {
        return v === true;
      },
      message: 'Terms and conditions must be accepted'
    }
  }
}, {
  timestamps: true
});

// Virtual for full name
loanApplicationSchema.virtual('fullName').get(function() {
  return this.middleInitial 
    ? `${this.firstName} ${this.middleInitial}. ${this.lastName}`
    : `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
loanApplicationSchema.virtual('age').get(function() {
  if (!this.birthdate) return null;
  const today = new Date();
  const birth = new Date(this.birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
});

// Virtual for full address
loanApplicationSchema.virtual('fullAddress').get(function() {
  return `${this.address}, ${this.city}, ${this.state} ${this.zip}`;
});

// Index for search performance
loanApplicationSchema.index({ email: 1 });
loanApplicationSchema.index({ status: 1 });
loanApplicationSchema.index({ createdAt: -1 });
loanApplicationSchema.index({ firstName: 1, lastName: 1 });

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
