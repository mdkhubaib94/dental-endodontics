import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const createOralDoctor = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if oral doctor already exists
    const existingDoctor = await User.findOne({ 
      role: 'doctor', 
      department: 'Oral',
      email: 'oral.doctor@dental.com'
    });

    if (existingDoctor) {
      console.log('⚠️  Oral Doctor already exists:');
      console.log('   Email:', existingDoctor.email);
      console.log('   Identity:', existingDoctor.Identity);
      return;
    }

    // Create password hash
    const password = 'Oral@456'; // Default password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new doctor for Oral department
    const oralDoctor = new User({
      name: 'Dr. Oral Surgeon',
      email: 'oral.doctor@dental.com',
      phone: '9876543211',
      password: hashedPassword,
      role: 'doctor',
      Identity: 'ORAL_DOC_001',
      department: 'Oral',
      specialization: 'Oral Surgery',
      staffId: 'STAFF_ORAL_001',
      createdAt: new Date()
    });

    await oralDoctor.save();

    console.log('\n✅ Oral Doctor created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email: oral.doctor@dental.com');
    console.log('   Password: Oral@456');
    console.log('   Identity: ORAL_DOC_001');
    console.log('   Department: Oral');
    console.log('   Staff ID: STAFF_ORAL_001');
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating Oral Doctor:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

createOralDoctor();
