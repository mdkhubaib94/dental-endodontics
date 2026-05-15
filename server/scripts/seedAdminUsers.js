// server/scripts/seedAdminUsers.js
// Run with: node server/scripts/seedAdminUsers.js
// Creates test users for admin, phc1, phc2, and c roles

import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: String,
  Identity: { type: String, unique: true },
  department: { type: String, default: null },
  specialization: { type: String, default: null },
  staffId: { type: String, unique: true, sparse: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const users = [
  {
    name: 'Admin User',
    email: 'admin@srmdental.com',
    phone: '9000000001',
    role: 'admin',
    Identity: 'ad001',
    staffId: 'ad001',
    password: 'Admin@123',
  },
  {
    name: 'PHC Admin 1',
    email: 'phc1@srmdental.com',
    phone: '9000000002',
    role: 'phc1',
    Identity: 'phc1001',
    staffId: 'phc1001',
    password: 'Phc1@123',
  },
  {
    name: 'PHC Admin 2',
    email: 'phc2@srmdental.com',
    phone: '9000000003',
    role: 'phc2',
    Identity: 'phc2001',
    staffId: 'phc2001',
    password: 'Phc2@123',
  },
  {
    name: 'Camp Admin',
    email: 'camp@srmdental.com',
    phone: '9000000004',
    role: 'c',
    Identity: 'c001',
    staffId: 'c001',
    password: 'Camp@123',
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const u of users) {
      const existing = await User.findOne({ Identity: u.Identity });
      if (existing) {
        console.log(`⚠️  Skipped (already exists): ${u.Identity} [${u.role}]`);
        continue;
      }

      const hashedPassword = await hash(u.password, 10);
      await User.create({ ...u, password: hashedPassword });
      console.log(`✅ Created: ${u.Identity} [${u.role}] — password: ${u.password}`);
    }

    console.log('\n📋 Login credentials summary:');
    console.log('─────────────────────────────────────────');
    users.forEach(u => {
      console.log(`Role: ${u.role.padEnd(6)} | ID: ${u.Identity.padEnd(8)} | Password: ${u.password}`);
    });
    console.log('─────────────────────────────────────────');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seed();
