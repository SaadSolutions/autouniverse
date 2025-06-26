const express = require('express');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const LoanApplication = require('../models/LoanApplication');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure email transporter
const createEmailTransporter = () => {
  // Use service if specified, otherwise use custom SMTP
  if (process.env.EMAIL_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Custom SMTP configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
};

// Submit loan application form (public route)
router.post('/loan-application', [
  // Loan Information validation
  body('desiredLoanAmount').isFloat({ min: 1000 }).withMessage('Desired loan amount must be at least $1,000'),
  body('desiredMonthlyPayment').optional().isFloat({ min: 0 }),
  
  // Personal Information validation
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('middleInitial').optional().trim().isLength({ max: 1 }),
  body('ssn').matches(/^\d{3}-\d{2}-\d{4}$/).withMessage('SSN must be in format XXX-XX-XXXX'),
  body('birthdate').isISO8601().withMessage('Valid birthdate is required'),
  body('driversLicenseNumber').trim().notEmpty().withMessage('Driver\'s license number is required'),
  body('driversLicenseExpDate').isISO8601().withMessage('Valid license expiration date is required'),
  
  // Contact Information validation
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('homePhone').optional().trim(),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  
  // Residence Information validation
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('zip').matches(/^\d{5}(-\d{4})?$/).withMessage('Valid ZIP code is required'),
  body('timeAtResidence').trim().notEmpty().withMessage('Time at residence is required'),
  body('residenceType').isIn(['Rent', 'Own', 'Other']).withMessage('Valid residence type is required'),
  body('mortgageRentPayment').isFloat({ min: 0 }).withMessage('Valid payment amount is required'),
  
  // Employment Information validation
  body('employmentStatus').isIn(['Employed', 'Self-Employed', 'Unemployed', 'Student', 'Retired']).withMessage('Valid employment status is required'),
  body('employerName').trim().notEmpty().withMessage('Employer name is required'),
  body('occupation').trim().notEmpty().withMessage('Job title/occupation is required'),
  body('timeOnJob').trim().notEmpty().withMessage('Time on job is required'),
  body('employerAddress').trim().notEmpty().withMessage('Employer address is required'),
  body('employerCity').trim().notEmpty().withMessage('Employer city is required'),
  body('employerState').trim().notEmpty().withMessage('Employer state is required'),
  body('employerZip').matches(/^\d{5}(-\d{4})?$/).withMessage('Valid employer ZIP code is required'),
  body('businessPhone').optional().trim(),
  body('monthlyIncome').isFloat({ min: 0 }).withMessage('Monthly income is required'),
  body('additionalIncome').optional().isFloat({ min: 0 }),
  
  // Terms validation
  body('termsAccepted').equals('true').withMessage('Terms must be accepted')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors.array().map(err => `${err.param}: ${err.msg}`)
      });
    }

    // Create loan application with proper field mapping
    const applicationData = {
      // Loan Information
      desiredLoanAmount: parseFloat(req.body.desiredLoanAmount),
      desiredMonthlyPayment: req.body.desiredMonthlyPayment ? parseFloat(req.body.desiredMonthlyPayment) : undefined,
      
      // Personal Information
      firstName: req.body.firstName,
      middleInitial: req.body.middleInitial,
      lastName: req.body.lastName,
      ssn: req.body.ssn,
      birthdate: new Date(req.body.birthdate),
      driversLicenseNumber: req.body.driversLicenseNumber,
      driversLicenseExpDate: new Date(req.body.driversLicenseExpDate),
      
      // Contact Information
      phone: req.body.phone,
      homePhone: req.body.homePhone,
      email: req.body.email,
      
      // Residence Information
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      zip: req.body.zip,
      timeAtResidence: req.body.timeAtResidence,
      residenceType: req.body.residenceType,
      mortgageRentPayment: parseFloat(req.body.mortgageRentPayment),
      
      // Employment Information
      employmentStatus: req.body.employmentStatus,
      employerName: req.body.employerName,
      occupation: req.body.occupation,
      timeOnJob: req.body.timeOnJob,
      employerAddress: req.body.employerAddress,
      employerCity: req.body.employerCity,
      employerState: req.body.employerState,
      employerZip: req.body.employerZip,
      businessPhone: req.body.businessPhone,
      monthlyIncome: req.body.monthlyIncome ? parseFloat(req.body.monthlyIncome) : undefined,
      additionalIncome: req.body.additionalIncome ? parseFloat(req.body.additionalIncome) : 0,
      
      // Terms
      termsAccepted: req.body.termsAccepted === true || req.body.termsAccepted === 'true'
    };

    // Handle co-applicant data
    if (req.body.hasCoApplicant === 'true' || req.body.hasCoApplicant === true) {
      applicationData.hasCoApplicant = true;
      applicationData.coApplicant = {
        firstName: req.body.coApplicantFirstName,
        lastName: req.body.coApplicantLastName,
        ssn: req.body.coApplicantSSN,
        phone: req.body.coApplicantPhone,
        relationship: req.body.coApplicantRelationship
      };
    } else {
      applicationData.hasCoApplicant = false;
    }

    // Handle trade-in data
    if (req.body.hasTradeIn === 'true' || req.body.hasTradeIn === true) {
      applicationData.hasTradeIn = true;
      applicationData.tradeIn = {
        make: req.body.tradeInMake,
        model: req.body.tradeInModel,
        year: req.body.tradeInYear ? parseInt(req.body.tradeInYear) : undefined,
        mileage: req.body.tradeInMileage ? parseInt(req.body.tradeInMileage) : undefined,
        condition: req.body.tradeInCondition,
        estimatedValue: req.body.tradeInEstimatedValue ? parseFloat(req.body.tradeInEstimatedValue) : undefined,
        lienInfo: req.body.tradeInLienInfo
      };
    } else {
      applicationData.hasTradeIn = false;
    }

    const application = new LoanApplication(applicationData);
    await application.save();

    // Send email notification
    try {
      await sendLoanApplicationEmail(application);
      application.emailSent = true;
      application.emailSentAt = new Date();
      await application.save();
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: 'Loan application submitted successfully',
      applicationId: application._id,
      status: application.status
    });

  } catch (error) {
    console.error('Loan application submission error:', error);
    res.status(500).json({
      error: 'Application submission failed',
      message: 'Internal server error'
    });
  }
});

// Get all loan applications (dealers only)
router.get('/loan-applications', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [applications, total] = await Promise.all([
      LoanApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-ssn'), // Don't return SSN in list view
      LoanApplication.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get loan applications error:', error);
    res.status(500).json({
      error: 'Failed to get applications',
      message: 'Internal server error'
    });
  }
});

// Get single loan application (dealers only)
router.get('/loan-applications/:id', auth, async (req, res) => {
  try {
    const application = await LoanApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: 'The requested application does not exist'
      });
    }

    res.json({ application });
  } catch (error) {
    console.error('Get loan application error:', error);
    res.status(500).json({
      error: 'Failed to get application',
      message: 'Internal server error'
    });
  }
});

// Update loan application status (dealers only)
router.put('/loan-applications/:id/status', [auth, [
  body('status').isIn(['pending', 'approved', 'denied', 'under_review']),
  body('internalNotes').optional().trim()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors.array().map(err => err.msg)
      });
    }

    const { status, internalNotes } = req.body;
    
    const application = await LoanApplication.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        ...(internalNotes !== undefined && { internalNotes })
      },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: 'The requested application does not exist'
      });
    }

    res.json({
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      error: 'Failed to update application',
      message: 'Internal server error'
    });
  }
});

// Delete loan application (admins only)
router.delete('/loan-applications/:id', [auth], async (req, res) => {
  try {
    if (req.dealer.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
      });
    }

    const application = await LoanApplication.findByIdAndDelete(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: 'The requested application does not exist'
      });
    }

    res.json({
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      error: 'Failed to delete application',
      message: 'Internal server error'
    });
  }
});

// Function to send loan application email
async function sendLoanApplicationEmail(application) {
  const transporter = createEmailTransporter();

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #dc2626;">New Loan Application - Auto Universe Inc.</h2>
      
      <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Applicant Information</h3>
        <p><strong>Name:</strong> ${application.fullName}</p>
        <p><strong>Email:</strong> ${application.email}</p>
        <p><strong>Phone:</strong> ${application.phone}</p>
        <p><strong>Date of Birth:</strong> ${new Date(application.birthdate).toLocaleDateString()}</p>
        <p><strong>Address:</strong> ${application.fullAddress}</p>
      </div>

      <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Loan Details</h3>
        <p><strong>Desired Loan Amount:</strong> $${application.desiredLoanAmount.toLocaleString()}</p>
        ${application.desiredMonthlyPayment ? `<p><strong>Desired Monthly Payment:</strong> $${application.desiredMonthlyPayment.toLocaleString()}</p>` : ''}
      </div>

      <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Employment Information</h3>
        <p><strong>Employment Status:</strong> ${application.employmentStatus}</p>
        ${application.employerName ? `<p><strong>Employer:</strong> ${application.employerName}</p>` : ''}
        ${application.occupation ? `<p><strong>Job Title:</strong> ${application.occupation}</p>` : ''}
        ${application.timeOnJob ? `<p><strong>Time on Job:</strong> ${application.timeOnJob}</p>` : ''}
        ${application.businessPhone ? `<p><strong>Work Phone:</strong> ${application.businessPhone}</p>` : ''}
        ${application.monthlyIncome ? `<p><strong>Monthly Income:</strong> $${application.monthlyIncome.toLocaleString()}</p>` : ''}
        ${application.additionalIncome ? `<p><strong>Additional Income:</strong> $${application.additionalIncome.toLocaleString()}</p>` : ''}
        ${application.employerAddress ? `<p><strong>Employer Address:</strong> ${application.employerAddress}, ${application.employerCity}, ${application.employerState} ${application.employerZip}</p>` : ''}
      </div>

      <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Residence Information</h3>
        <p><strong>Residence Type:</strong> ${application.residenceType}</p>
        <p><strong>Time at Residence:</strong> ${application.timeAtResidence}</p>
        <p><strong>Monthly Mortgage/Rent:</strong> $${application.mortgageRentPayment.toLocaleString()}</p>
      </div>

      ${application.hasCoApplicant ? `
      <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Co-Applicant Information</h3>
        <p><strong>Name:</strong> ${application.coApplicant.firstName} ${application.coApplicant.lastName}</p>
        <p><strong>Phone:</strong> ${application.coApplicant.phone}</p>
        <p><strong>Relationship:</strong> ${application.coApplicant.relationship}</p>
      </div>
      ` : ''}

      ${application.hasTradeIn ? `
      <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Trade-In Information</h3>
        <p><strong>Vehicle:</strong> ${application.tradeIn.year} ${application.tradeIn.make} ${application.tradeIn.model}</p>
        <p><strong>Mileage:</strong> ${application.tradeIn.mileage?.toLocaleString()} miles</p>
        <p><strong>Condition:</strong> ${application.tradeIn.condition}</p>
        ${application.tradeIn.estimatedValue ? `<p><strong>Estimated Value:</strong> $${application.tradeIn.estimatedValue.toLocaleString()}</p>` : ''}
      </div>
      ` : ''}

      <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Application Details</h3>
        <p><strong>Application ID:</strong> ${application._id}</p>
        <p><strong>Submitted:</strong> ${new Date(application.createdAt).toLocaleString()}</p>
        <p><strong>Status:</strong> ${application.status}</p>
      </div>

      <p style="margin-top: 30px; color: #666;">
        This application was submitted through the Auto Universe Inc. website.
        Please review and respond to the customer promptly.
      </p>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO || 'dealer@autouniverse.com',
    subject: `New Loan Application - ${application.fullName}`,
    html: emailHtml,
    text: `New loan application received from ${application.fullName} (${application.email}). 
           Loan Amount: $${application.desiredLoanAmount.toLocaleString()}. 
           Please log in to the dealer portal to review the full application.`
  };

  await transporter.sendMail(mailOptions);
}

module.exports = router;
