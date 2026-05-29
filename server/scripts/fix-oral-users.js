import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const fixOralUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Delete the incorrectly created chief_doctor role user
    const deletedChief = await User.findOneAndDelete({ 
      role: 'chief_doctor', 
      department: 'Oral' 
    });

    if (deletedChief) {
      console.log('🗑️  Deleted incorrect chief_doctor user:', deletedChief.email);
    }

    // Check if correct oral doctor already exists
    const existingDoctor = await User.findOne({ 
      role: 'doctor', 
      department: 'Oral',
      email: 'oral.chief@dental.com'
    });

    if (existingDoctor) {
      console.log('✅ Oral Doctor (Chief) already exists correctly:');
      console.log('   Email:', existingDoctor.email);
      console.log('   Identity:', existingDoctor.Identity);
      console.log('   Role:', existingDoctor.role);
    } else {
      // Create password hash
      const password = 'Oral@123';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new doctor for Oral department
      const oralChief = new User({
        name: 'Dr. Oral Chief',
        email: 'oral.chief@dental.com',
        phone: '9876543210',
        password: hashedPassword,
        role: 'doctor',
        Identity: 'ORAL_CHIEF_001',
        department: 'Oral',
        specialization: 'Oral and Maxillofacial Surgery',
        staffId: 'STAFF_ORAL_CHIEF',
        createdAt: new Date()
      });

      await oralChief.save();
      console.log('✅ Created correct Oral Doctor (Chief)');
    }

    // Check second doctor
    const existingDoctor2 = await User.findOne({ 
      role: 'doctor', 
      department: 'Oral',
      email: 'oral.doctor@dental.com'
    });

    if (existingDoctor2) {
      console.log('✅ Oral Doctor already exists correctly:');
      console.log('   Email:', existingDoctor2.email);
      console.log('   Identity:', existingDoctor2.Identity);
    }

    console.log('\n📋 Final Oral Department Users:');
    const oralUsers = await User.find({ department: 'Oral' });
    oralUsers.forEach(user => {
      console.log(`\n   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Identity: ${user.Identity}`);
      console.log(`   Department: ${user.department}`);
    });

    console.log('\n✅ Oral users fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing Oral users:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

fixOralUsers();
