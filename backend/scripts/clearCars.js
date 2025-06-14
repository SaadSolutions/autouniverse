const mongoose = require('mongoose');
require('dotenv').config();

const Car = require('../models/Car');

const clearCars = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-universe');
    console.log('✅ Connected to MongoDB');

    // Count existing cars
    const count = await Car.countDocuments();
    console.log(`📊 Found ${count} cars in database`);

    if (count === 0) {
      console.log('🎉 No cars to delete - database is already clean');
    } else {
      // Delete all cars
      const result = await Car.deleteMany({});
      console.log(`🗑️  Deleted ${result.deletedCount} cars from database`);
      console.log('✅ All cars removed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error clearing cars from database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the clear function
clearCars();
