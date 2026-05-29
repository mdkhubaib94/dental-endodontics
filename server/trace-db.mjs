// Direct database query for the test appointment
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function query() {
  try {
    const db = mongoose.connection;
    
    // Connect
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Query the appointment
    const apt = await db.collection('appointments').findOne({
      bookingId: 'SRMDNT691616'
    });
    
    console.log('\n=== RAW DATABASE ROW ===');
    console.log(JSON.stringify(apt, null, 2));
    
    // Query the general case
    const genCase = await db.collection('generalcases').findOne({
      patientId: apt?.patientId
    });
    
    console.log('\n=== GENERAL CASE FOR SAME PATIENT ===');
    console.log(JSON.stringify(genCase, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

query();
