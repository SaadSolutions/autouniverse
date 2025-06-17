const mongoose = require('mongoose');
require('dotenv').config();

const Car = require('../models/Car');

const removeHondaCars = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-universe');
    console.log('✅ Connected to MongoDB');

    // Find all Honda cars
    const hondaCars = await Car.find({ make: /^Honda$/i });
    console.log(`📊 Found ${hondaCars.length} Honda cars in database`);

    if (hondaCars.length === 0) {
      console.log('🎉 No Honda cars found - nothing to delete');
    } else {
      // Display Honda cars found
      console.log('\n🚗 Honda cars to be deleted:');
      hondaCars.forEach((car, index) => {
        console.log(`${index + 1}. ${car.year} ${car.make} ${car.model} - $${car.price.toLocaleString()} (ID: ${car._id})`);
      });

      // Delete all Honda cars
      const result = await Car.deleteMany({ make: /^Honda$/i });
      console.log(`\n🗑️  Deleted ${result.deletedCount} Honda cars from database`);
      console.log('✅ Honda cars removed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error removing Honda cars from database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the remove function
removeHondaCars();
