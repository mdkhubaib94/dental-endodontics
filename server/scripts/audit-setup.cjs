const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Dental';
const JWT_SECRET = 'your_super_secret_key';

async function runAuditSetup() {
  console.log('════════════════════════════════════════════════════════');
  console.log('AUDIT SETUP — Creating Test Users & Generating Tokens');
  console.log('════════════════════════════════════════════════════════\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ PASS — MongoDB connected\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Delete existing test users
    const deleteResult = await usersCollection.deleteMany({ 
      email: { $regex: /^test_.*@clinic\.com$/ } 
    });
    console.log(`Cleaned up ${deleteResult.deletedCount} existing test users\n`);

    // Create password hash
    const testPassword = 'Test@1234';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    const patientId = new mongoose.Types.ObjectId();
    const generalDoctorId = new mongoose.Types.ObjectId();
    const deptDoctorId = new mongoose.Types.ObjectId();
    const pgId = new mongoose.Types.ObjectId();
    const ugId = new mongoose.Types.ObjectId();

    const testUsers = [
      {
        _id: patientId,
        name: 'Test Patient',
        email: 'test_patient@clinic.com',
        phone: '1234567890',
        password: hashedPassword,
        role: 'patient',
        Identity: 'TEST_PATIENT_001',
        createdAt: new Date()
      },
      {
        _id: generalDoctorId,
        name: 'Test General Doctor',
        email: 'test_generaldoc@clinic.com',
        phone: '1234567891',
        password: hashedPassword,
        role: 'doctor',
        department: 'general',
        Identity: 'TEST_GENDOC_001',
        isGeneralDoctor: true,
        isDeptDoctor: false,
        createdAt: new Date()
      },
      {
        _id: deptDoctorId,
        name: 'Test Department Doctor',
        email: 'test_deptdoc@clinic.com',
        phone: '1234567892',
        password: hashedPassword,
        role: 'doctor',
        department: 'prosthodontics',
        Identity: 'TEST_DEPTDOC_001',
        isGeneralDoctor: false,
        isDeptDoctor: true,
        createdAt: new Date()
      },
      {
        _id: pgId,
        name: 'Test PG Doctor',
        email: 'test_pg@clinic.com',
        phone: '1234567893',
        password: hashedPassword,
        role: 'pg',
        department: 'prosthodontics',
        Identity: 'TEST_PG_001',
        createdBy: deptDoctorId,
        createdAt: new Date()
      },
      {
        _id: ugId,
        name: 'Test UG Doctor',
        email: 'test_ug@clinic.com',
        phone: '1234567894',
        password: hashedPassword,
        role: 'ug',
        department: 'prosthodontics',
        Identity: 'TEST_UG_001',
        createdBy: deptDoctorId,
        createdAt: new Date()
      }
    ];

    // Insert users
    console.log('Creating test users:');
    const insertResult = await usersCollection.insertMany(testUsers);
    console.log(`✅ PASS — Created ${insertResult.insertedCount} test users\n`);

    // Fetch created users
    const createdUsers = await usersCollection.find({ 
      email: { $regex: /^test_.*@clinic\.com$/ } 
    }).toArray();

    createdUsers.forEach(u => {
      console.log(`  ✓ ${u.role.toUpperCase()}: ${u.email} (ID: ${u._id})`);
    });

    // Generate tokens
    console.log('\nGenerating auth tokens:');
    const tokens = {};
    const userIds = {};

    createdUsers.forEach(user => {
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
      const roleKey = user.Identity === 'TEST_GENDOC_001'
        ? 'generalDoctor'
        : user.Identity === 'TEST_DEPTDOC_001'
          ? 'deptDoctor'
          : user.role === 'pg'
            ? 'pg'
            : user.role === 'ug'
              ? 'ug'
              : user.role;
      tokens[roleKey] = token;
      userIds[roleKey] = user._id.toString();
      console.log(`  ✓ ${roleKey.toUpperCase()}: ${token.substring(0, 50)}...`);
    });

    console.log('\n✅ PASS — All tokens generated\n');

    // Save audit data
    const auditData = {
      baseUrl: 'http://localhost:5000',
      testPassword: testPassword,
      tokens,
      userIds,
      users: createdUsers.map(u => ({
        id: u._id.toString(),
        email: u.email,
        role: u.role,
        identity: u.Identity,
        department: u.department
      }))
    };

    fs.writeFileSync(
      './server/audit-data.json',
      JSON.stringify(auditData, null, 2)
    );

    console.log('✅ Audit data saved to server/audit-data.json');
    console.log('\n════════════════════════════════════════════════════════');
    console.log('SETUP COMPLETE — Ready for API Testing');
    console.log('════════════════════════════════════════════════════════');
    console.log('\n📋 Test Credentials:');
    console.log('   Password for all users: Test@1234');
    console.log('\n📧 Test User Emails:');
    createdUsers.forEach(u => console.log(`   - ${u.email} (${u.role})`));
    console.log('\n✅ Ready for checkpoint testing!');

  } catch (error) {
    console.error('❌ FAIL — Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

runAuditSetup();
