const express = require('express');
const { body, validationResult, query } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const Car = require('../models/Car');
const { auth, adminOnly } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Get all cars (public route with filtering)
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['available', 'sold', 'pending']),
  query('make').optional().trim(),
  query('model').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('bodyStyle').optional().isIn(['Sedan', 'SUV', 'Truck', 'Hatchback', 'Coupe', 'Convertible', 'Wagon', 'Van', 'Other']),
  query('fuelType').optional().isIn(['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Other']),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors.array().map(err => err.msg)
      });
    }

    const {
      page = 1,
      limit = 12,
      status = 'available',
      make,
      model,
      minPrice,
      maxPrice,
      bodyStyle,
      fuelType,
      search
    } = req.query;

    // Build filter object
    const filter = { status };

    if (make) {
      filter.make = new RegExp(make, 'i');
    }
    if (model) {
      filter.model = new RegExp(model, 'i');
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (bodyStyle) {
      filter.bodyStyle = bodyStyle;
    }
    if (fuelType) {
      filter.fuelType = fuelType;
    }
    if (search) {
      filter.$or = [
        { make: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { features: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get cars with pagination
    const [cars, total] = await Promise.all([
      Car.find(filter)
        .populate('addedBy', 'name email')
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Car.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      cars,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        status,
        make,
        model,
        minPrice,
        maxPrice,
        bodyStyle,
        fuelType,
        search
      }
    });
  } catch (error) {
    console.error('Get cars error:', error);
    res.status(500).json({
      error: 'Failed to get cars',
      message: 'Internal server error'
    });
  }
});

// Get cars by dealer (for dealer dashboard)
router.get('/dealer/:dealerId?', auth, async (req, res) => {
  try {
    const { dealerId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // All authenticated dealers and admins can view all cars
    const filter = {};
    
    // If a specific dealerId is provided, filter by that dealer
    if (dealerId) {
      filter.addedBy = dealerId;
    }
    
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [cars, total] = await Promise.all([
      Car.find(filter)
        .populate('addedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Car.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      cars,
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
    console.error('Get dealer cars error:', error);
    res.status(500).json({
      error: 'Failed to get cars',
      message: 'Internal server error'
    });
  }
});

// Get single car by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    let car = await Car.findById(identifier).populate('addedBy', 'name email');
    
    if (!car) {
      car = await Car.findOne({ slug: identifier }).populate('addedBy', 'name email');
    }

    if (!car) {
      return res.status(404).json({
        error: 'Car not found',
        message: 'The requested car does not exist'
      });
    }

    // Increment views for available cars
    if (car.status === 'available') {
      await car.incrementViews();
    }

    res.json({ car });
  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({
      error: 'Failed to get car',
      message: 'Internal server error'
    });
  }
});

// Increment car view count
router.post('/:id/view', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({
        error: 'Car not found',
        message: 'The requested car does not exist'
      });
    }

    if (car.status === 'available') {
      await car.incrementViews();
    }

    res.json({ 
      success: true, 
      views: car.views 
    });
  } catch (error) {
    console.error('Increment view error:', error);
    res.status(500).json({
      error: 'Failed to increment view',
      message: 'Internal server error'
    });
  }
});

// Create new car (dealers only)
router.post('/', [auth, upload.array('images', 10), [
  body('make').trim().notEmpty().withMessage('Make is required'),
  body('model').trim().notEmpty().withMessage('Model is required'),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required'),
  body('mileage').isFloat({ min: 0 }).withMessage('Valid mileage is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('bodyStyle').optional().isIn(['Sedan', 'SUV', 'Truck', 'Hatchback', 'Coupe', 'Convertible', 'Wagon', 'Van', 'Other']).withMessage('Invalid body style'),
  body('fuelType').optional().isIn(['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Other']).withMessage('Invalid fuel type'),
  body('transmission').optional().isIn(['Manual', 'Automatic', 'CVT']),
  body('drivetrain').optional().isIn(['FWD', 'RWD', 'AWD', '4WD']),
  body('vin').optional().isLength({ min: 17, max: 17 }).matches(/^[A-HJ-NPR-Z0-9]{17}$/),
  body('description').optional().isLength({ max: 1000 }),
  body('condition').optional().isIn(['Excellent', 'Good', 'Fair', 'Poor']),
  body('status').optional().isIn(['available', 'sold', 'pending', 'draft'])
]], async (req, res) => {
  try {
    // Log received data for debugging
    console.log('=== ADD CAR REQUEST ===');
    console.log('Body:', req.body);
    console.log('Files:', req.files?.length || 0);
    console.log('User:', req.dealer?.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors.array().map(err => `${err.path}: ${err.msg}`),
        details: errors.array()
      });
    }

    const carData = {
      ...req.body,
      addedBy: req.dealer._id
    };

    // Parse features if it's a string (from form data)
    if (typeof carData.features === 'string') {
      carData.features = carData.features.split(',').map(f => f.trim()).filter(f => f);
    }

    // Parse tags if it's a string
    if (typeof carData.tags === 'string') {
      carData.tags = carData.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    }

    // Handle uploaded images (with error handling for Render)
    if (req.files && req.files.length > 0) {
      try {
        carData.images = req.files.map((file, index) => ({
          url: `/uploads/cars/${file.filename}`,
          isPrimary: index === 0 // First image is primary
        }));
        console.log('Images processed:', carData.images.length);
      } catch (imageError) {
        console.log('Image processing error:', imageError);
        // Continue without images for now
        carData.images = [];
      }
    } else {
      console.log('No files uploaded');
      carData.images = [];
    }

    const car = new Car(carData);
    await car.save();

    await car.populate('addedBy', 'name email');

    res.status(201).json({
      message: 'Car added successfully',
      car
    });
  } catch (error) {
    console.error('Create car error:', error);
    
    // Clean up uploaded files if car creation failed
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path).catch(console.error);
      });
    }

    res.status(500).json({
      error: 'Failed to create car',
      message: 'Internal server error'
    });
  }
}, handleMulterError);

// Update car (dealers can update their own cars, admins can update any)
router.put('/:id', [auth, upload.array('images', 10), [
  body('make').optional().trim().notEmpty(),
  body('model').optional().trim().notEmpty(),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('mileage').optional().isFloat({ min: 0 }),
  body('price').optional().isFloat({ min: 0 }),
  body('bodyStyle').optional().isIn(['Sedan', 'SUV', 'Truck', 'Hatchback', 'Coupe', 'Convertible', 'Wagon', 'Van', 'Other']),
  body('fuelType').optional().isIn(['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Other']),
  body('transmission').optional().isIn(['Manual', 'Automatic', 'CVT']),
  body('drivetrain').optional().isIn(['FWD', 'RWD', 'AWD', '4WD']),
  body('vin').optional().isLength({ min: 17, max: 17 }).matches(/^[A-HJ-NPR-Z0-9]{17}$/),
  body('description').optional().isLength({ max: 1000 }),
  body('condition').optional().isIn(['Excellent', 'Good', 'Fair', 'Poor']),
  body('status').optional().isIn(['available', 'sold', 'pending', 'draft'])
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors.array().map(err => err.msg)
      });
    }

    const { id } = req.params;
    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({
        error: 'Car not found',
        message: 'The requested car does not exist'
      });
    }

    // All authenticated dealers and admins can edit any car
    // No permission restriction based on who added the car

    const updateData = { ...req.body };

    // Parse features if it's a string
    if (typeof updateData.features === 'string') {
      updateData.features = updateData.features.split(',').map(f => f.trim()).filter(f => f);
    }

    // Parse tags if it's a string
    if (typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    }

    // Handle new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/cars/${file.filename}`,
        isPrimary: false // Will be set properly by pre-save hook
      }));
      
      // Add new images to existing ones
      updateData.images = [...(car.images || []), ...newImages];
    }

    const updatedCar = await Car.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('addedBy', 'name email');

    res.json({
      message: 'Car updated successfully',
      car: updatedCar
    });
  } catch (error) {
    console.error('Update car error:', error);
    
    // Clean up uploaded files if update failed
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path).catch(console.error);
      });
    }

    res.status(500).json({
      error: 'Failed to update car',
      message: 'Internal server error'
    });
  }
}, handleMulterError);

// Delete car image
router.delete('/:id/images/:imageIndex', auth, async (req, res) => {
  try {
    const { id, imageIndex } = req.params;
    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({
        error: 'Car not found',
        message: 'The requested car does not exist'
      });
    }

    // All authenticated dealers and admins can delete images from any car
    // No permission restriction based on who added the car

    const index = parseInt(imageIndex);
    if (index < 0 || index >= car.images.length) {
      return res.status(400).json({
        error: 'Invalid image index',
        message: 'The specified image does not exist'
      });
    }

    const imageToDelete = car.images[index];
    
    // Delete physical file
    const imagePath = path.join(__dirname, '..', imageToDelete.url);
    try {
      await fs.unlink(imagePath);
    } catch (fileError) {
      console.error('Failed to delete image file:', fileError);
    }

    // Remove from array
    car.images.splice(index, 1);
    
    // If deleted image was primary and there are other images, make first one primary
    if (imageToDelete.isPrimary && car.images.length > 0) {
      car.images[0].isPrimary = true;
    }

    await car.save();

    res.json({
      message: 'Image deleted successfully',
      car
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      message: 'Internal server error'
    });
  }
});

// Set primary image
router.put('/:id/images/:imageIndex/primary', auth, async (req, res) => {
  try {
    const { id, imageIndex } = req.params;
    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({
        error: 'Car not found',
        message: 'The requested car does not exist'
      });
    }

    // All authenticated dealers and admins can set primary images for any car
    // No permission restriction based on who added the car

    const index = parseInt(imageIndex);
    if (index < 0 || index >= car.images.length) {
      return res.status(400).json({
        error: 'Invalid image index',
        message: 'The specified image does not exist'
      });
    }

    // Reset all images to not primary
    car.images.forEach(img => img.isPrimary = false);
    // Set selected image as primary
    car.images[index].isPrimary = true;

    await car.save();

    res.json({
      message: 'Primary image updated successfully',
      car
    });
  } catch (error) {
    console.error('Set primary image error:', error);
    res.status(500).json({
      error: 'Failed to set primary image',
      message: 'Internal server error'
    });
  }
});

// Delete car (all authenticated dealers and admins can delete any car)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({
        error: 'Car not found',
        message: 'The requested car does not exist'
      });
    }

    // All authenticated dealers and admins can delete any car
    // No permission restriction based on who added the car

    // Delete associated images
    for (const image of car.images) {
      const imagePath = path.join(__dirname, '..', image.url);
      try {
        await fs.unlink(imagePath);
      } catch (fileError) {
        console.error('Failed to delete image file:', fileError);
      }
    }

    await Car.findByIdAndDelete(id);

    res.json({
      message: 'Car deleted successfully'
    });
  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({
      error: 'Failed to delete car',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
