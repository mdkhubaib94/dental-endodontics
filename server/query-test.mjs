// Query test appointment from database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const Appointment = mongoose.models.Appointment ||
  mongoose.model("Appointment", new mongoose.Schema({}), "appointments");

async function query() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Query the test appointment
    const appointment = await mongoose.connection.db.collection('appointments').findOne(
      { bookingId: 'SRMDNT623069' }
    );
    
    console.log('\n=== PHASE 1 STEP 3: Appointment in Database ===');
    if (appointment) {
      console.log('bookingId:', appointment.bookingId);
      console.log('patientId:', appointment.patientId);
      console.log('status:', appointment.status);
      console.log('isProcessed:', appointment.isProcessed);
      console.log('_id:', appointment._id);
    } else {
      console.log('❌ Appointment not found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

query();
