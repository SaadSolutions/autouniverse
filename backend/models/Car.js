const mongoose = require('mongoose');
const slugify = require('slugify');

const carSchema = new mongoose.Schema({
  make: {
    type: String,
    required: [true, 'Make is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1900, 'Year must be after 1900'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  mileage: {
    type: Number,
    required: [true, 'Mileage is required'],
    min: [0, 'Mileage cannot be negative']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  bodyStyle: {
    type: String,
    required: [true, 'Body style is required'],
    enum: ['Sedan', 'SUV', 'Truck', 'Hatchback', 'Coupe', 'Convertible', 'Wagon', 'Van', 'Other']
  },
  fuelType: {
    type: String,
    required: [true, 'Fuel type is required'],
    enum: ['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Other']
  },
  transmission: {
    type: String,
    enum: ['Manual', 'Automatic', 'CVT'],
    default: 'Automatic'
  },
  drivetrain: {
    type: String,
    enum: ['FWD', 'RWD', 'AWD', '4WD'],
    default: 'FWD'
  },
  engine: {
    type: String,
    trim: true
  },
  exteriorColor: {
    type: String,
    trim: true
  },
  interiorColor: {
    type: String,
    trim: true
  },
  vin: {
    type: String,
    unique: true,
    sparse: true, // Allow null values but ensure uniqueness when present
    trim: true,
    uppercase: true,
    match: [/^[A-HJ-NPR-Z0-9]{17}$/, 'VIN must be 17 characters and contain no I, O, or Q']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  features: [{
    type: String,
    trim: true
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String, // For Cloudinary
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor'],
    default: 'Good'
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'pending', 'draft'],
    default: 'available'
  },
  slug: {
    type: String,
    unique: true,
    sparse: true // Allow null values but ensure uniqueness when present
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  soldDate: Date,
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Create slug before saving
carSchema.pre('save', function(next) {
  if (this.isModified('make') || this.isModified('model') || this.isModified('year') || !this.slug) {
    this.slug = slugify(`${this.year}-${this.make}-${this.model}`, {
      lower: true,
      strict: true
    });
  }
  next();
});

// Ensure only one primary image
carSchema.pre('save', function(next) {
  const primaryImages = this.images.filter(img => img.isPrimary);
  if (primaryImages.length > 1) {
    // Reset all to false and set first one as primary
    this.images.forEach((img, index) => {
      img.isPrimary = index === 0;
    });
  } else if (primaryImages.length === 0 && this.images.length > 0) {
    // Set first image as primary if none selected
    this.images[0].isPrimary = true;
  }
  next();
});

// Index for search performance
carSchema.index({ make: 1, model: 1, year: 1 });
carSchema.index({ price: 1 });
carSchema.index({ status: 1 });
carSchema.index({ slug: 1 });
carSchema.index({ createdAt: -1 });

// Virtual for display name
carSchema.virtual('displayName').get(function() {
  return `${this.year} ${this.make} ${this.model}`;
});

// Virtual for primary image
carSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary || (this.images.length > 0 ? this.images[0] : null);
});

// Method to increment views
carSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method to find available cars
carSchema.statics.findAvailable = function() {
  return this.find({ status: 'available' });
};

module.exports = mongoose.model('Car', carSchema);
