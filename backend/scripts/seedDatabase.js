const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Dealer = require('../models/Dealer');
const Car = require('../models/Car');

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-universe');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Dealer.deleteMany({});
    await Car.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin dealer
    const adminDealer = new Dealer({
      email: process.env.ADMIN_EMAIL || 'admin@autouniverse.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      name: 'Admin User',
      role: 'admin'
    });
    await adminDealer.save();
    console.log('👤 Created admin dealer');

    // Create regular dealer
    const regularDealer = new Dealer({
      email: 'dealer@autouniverse.com',
      password: 'dealer123',
      name: 'John Dealer',
      role: 'dealer'
    });
    await regularDealer.save();
    console.log('👤 Created regular dealer');

    // Create sample cars
    const sampleCars = [
      {
        make: 'Honda',
        model: 'Accord Sport',
        year: 2019,
        mileage: 45000,
        price: 22000,
        bodyStyle: 'Sedan',
        fuelType: 'Gasoline',
        transmission: 'Automatic',
        drivetrain: 'FWD',
        engine: '1.5L Turbo',
        exteriorColor: 'Silver',
        interiorColor: 'Black',
        description: 'Sporty and reliable sedan with great fuel economy. Well-maintained with service records.',
        features: ['Backup Camera', 'Bluetooth', 'Heated Seats', 'Sunroof', 'Apple CarPlay'],
        condition: 'Excellent',
        status: 'available',
        addedBy: adminDealer._id,
        tags: ['reliable', 'fuel-efficient', 'sporty']
        // No images array - will fall back to placeholder
      },
      {
        make: 'Toyota',
        model: 'RAV4 LE',
        year: 2020,
        mileage: 35000,
        price: 28500,
        bodyStyle: 'SUV',
        fuelType: 'Hybrid',
        transmission: 'CVT',
        drivetrain: 'AWD',
        engine: '2.5L Hybrid',
        exteriorColor: 'Blue',
        interiorColor: 'Gray',
        description: 'Popular hybrid SUV known for reliability and excellent fuel economy.',
        features: ['All-Wheel Drive', 'Hybrid Engine', 'Safety Sense 2.0', 'Backup Camera'],
        condition: 'Excellent',
        status: 'available',
        addedBy: regularDealer._id,
        isFeatured: true,
        tags: ['hybrid', 'awd', 'reliable']
        // No images array - will fall back to placeholder
      },
      {
        make: 'Ford',
        model: 'F-150 XLT',
        year: 2018,
        mileage: 75000,
        price: 32000,
        bodyStyle: 'Truck',
        fuelType: 'Gasoline',
        transmission: 'Automatic',
        drivetrain: '4WD',
        engine: '3.5L V6',
        exteriorColor: 'White',
        interiorColor: 'Black',
        description: 'Powerful and capable pickup truck perfect for work and play.',
        features: ['4WD', 'Towing Package', 'Bed Liner', 'Running Boards'],
        condition: 'Good',
        status: 'available',
        addedBy: adminDealer._id,
        tags: ['truck', '4wd', 'towing']
        // No images array - will fall back to placeholder
      },
      {
        make: 'BMW',
        model: '330i',
        year: 2019,
        mileage: 42000,
        price: 35000,
        bodyStyle: 'Sedan',
        fuelType: 'Gasoline',
        transmission: 'Automatic',
        drivetrain: 'RWD',
        engine: '2.0L Turbo',
        exteriorColor: 'Black',
        interiorColor: 'Brown',
        description: 'Luxury sports sedan with premium features and engaging driving dynamics.',
        features: ['Premium Package', 'Navigation', 'Heated Seats', 'Sunroof', 'Premium Audio'],
        condition: 'Excellent',
        status: 'available',
        addedBy: regularDealer._id,
        isFeatured: true,
        tags: ['luxury', 'sport', 'premium']
        // No images array - will fall back to placeholder
      },
      {
        make: 'Chevrolet',
        model: 'Impala LT',
        year: 2017,
        mileage: 85000,
        price: 16500,
        bodyStyle: 'Sedan',
        fuelType: 'Gasoline',
        transmission: 'Automatic',
        drivetrain: 'FWD',
        engine: '2.5L 4-Cylinder',
        exteriorColor: 'Red',
        interiorColor: 'Black',
        description: 'Spacious and comfortable full-size sedan with smooth ride quality.',
        features: ['Remote Start', 'Backup Camera', 'Bluetooth', 'Power Seats'],
        condition: 'Good',
        status: 'available',
        addedBy: adminDealer._id,
        tags: ['spacious', 'comfortable', 'value']
        // No images array - will fall back to placeholder
      },
      {
        make: 'Tesla',
        model: 'Model 3',
        year: 2021,
        mileage: 25000,
        price: 42000,
        bodyStyle: 'Sedan',
        fuelType: 'Electric',
        transmission: 'Automatic',
        drivetrain: 'RWD',
        engine: 'Electric Motor',
        exteriorColor: 'White',
        interiorColor: 'Black',
        description: 'Cutting-edge electric vehicle with autopilot and impressive range.',
        features: ['Autopilot', 'Supercharging', 'Premium Interior', 'Over-the-air Updates'],
        condition: 'Excellent',
        status: 'available',
        addedBy: regularDealer._id,
        isFeatured: true,
        tags: ['electric', 'autopilot', 'tech']
        // No images array - will fall back to placeholder
      }
    ];

    await Car.insertMany(sampleCars);
    console.log(`🚗 Created ${sampleCars.length} sample cars`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin: admin@autouniverse.com / admin123');
    console.log('Dealer: dealer@autouniverse.com / dealer123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seed function
seedDatabase();
