import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const createOralChief = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if oral doctor already exists
    const existingDoctor = await User.findOne({ 
      role: 'doctor', 
      department: 'Oral',
      email: 'oral.chief@dental.com'
    });

    if (existingDoctor) {
      console.log('⚠️  Oral Chief Doctor already exists:');
      console.log('   Email:', existingDoctor.email);
      console.log('   Identity:', existingDoctor.Identity);
      return;
    }

    // Create password hash
    const password = 'Oral@123'; // Default password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new doctor for Oral department (with chief privileges)
    const oralChief = new User({
      name: 'Dr. Oral Chief',
      email: 'oral.chief@dental.com',
      phone: '9876543210',
      password: hashedPassword,
      role: 'doctor',  // Using doctor role, not chief_doctor
      Identity: 'ORAL_CHIEF_001',
      department: 'Oral',
      specialization: 'Oral and Maxillofacial Surgery',
      staffId: 'STAFF_ORAL_CHIEF',
      createdAt: new Date()
    });

    await oralChief.save();

    console.log('\n✅ Oral Chief Doctor created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email: oral.chief@dental.com');
    console.log('   Password: Oral@123');
    console.log('   Identity: ORAL_CHIEF_001');
    console.log('   Department: Oral');
    console.log('   Role: doctor');
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating Oral Chief Doctor:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

createOralChief();
