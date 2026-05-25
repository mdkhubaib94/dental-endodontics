// server/scripts/create-test-users.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const createTestUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Import User model
    const { default: User } = await import('../models/User.js');

    // Hash password
    const password = 'Test@1234';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if test users already exist
    const existingUsers = await User.find({ email: /test_.*@clinic\.com/ });
    if (existingUsers.length > 0) {
      console.log(`Found ${existingUsers.length} existing test users. Deleting...`);
      await User.deleteMany({ email: /test_.*@clinic\.com/ });
      console.log('✅ Existing test users deleted');
    }

    // Create test users
    const testUsers = [
      {
        name: 'Test Patient',
        email: 'test_patient@clinic.com',
        password: hashedPassword,
        role: 'patient',
        Identity: 'TEST_PATIENT_001',
        department: null,
      },
      {
        name: 'Test General Doctor',
        email: 'test_generaldoc@clinic.com',
        password: hashedPassword,
        role: 'doctor',
        Identity: 'TEST_GENDOC_001',
        department: 'general',
        isGeneralDoctor: true,
        isDeptDoctor: false,
      },
      {
        name: 'Test Department Doctor',
        email: 'test_deptdoc@clinic.com',
        password: hashedPassword,
        role: 'doctor',
        Identity: 'TEST_DEPTDOC_001',
        department: 'prosthodontics',
        isGeneralDoctor: false,
        isDeptDoctor: true,
      },
      {
        name: 'Test PG Doctor',
        email: 'test_pg@clinic.com',
        password: hashedPassword,
        role: 'pg',
        Identity: 'TEST_PG_001',
        department: 'prosthodontics',
      },
      {
        name: 'Test Consent Admin',
        email: 'test_consent@clinic.com',
        password: hashedPassword,
        role: 'admin',
        Identity: 'TEST_ADMIN_001',
        department: 'admin',
      },
    ];

    console.log('Creating test users...');
    const createdUsers = await User.insertMany(testUsers);
    console.log(`✅ Created ${createdUsers.length} test users`);

    // Link PG to General Doctor (createdBy relationship)
    const generalDoc = createdUsers.find(u => u.email === 'test_generaldoc@clinic.com');
    const pgDoc = createdUsers.find(u => u.email === 'test_pg@clinic.com');

    if (generalDoc && pgDoc) {
      pgDoc.createdBy = generalDoc._id;
      await pgDoc.save();
      console.log('✅ Linked PG to General Doctor');
    }

    // Display created users
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST USERS CREATED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    createdUsers.forEach(user => {
      console.log(`\n${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Identity: ${user.Identity}`);
      console.log(`  Password: Test@1234`);
    });
    console.log('\n═══════════════════════════════════════════════════════');

    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    process.exit(1);
  }
};

createTestUsers();
