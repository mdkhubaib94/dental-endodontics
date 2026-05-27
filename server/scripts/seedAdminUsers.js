// server/scripts/seedAdminUsers.js
// Run with: node server/scripts/seedAdminUsers.js
// Creates test users for admin, phc1, phc2, c, pg, and ug roles

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
    Identity: 'AD001',
    staffId: 'AD001',
    password: 'Admin@123',
  },
  {
    name: 'PHC Admin 1',
    email: 'phc1@srmdental.com',
    phone: '9000000002',
    role: 'phc1',
    Identity: 'PHC1001',
    staffId: 'PHC1001',
    password: 'Phc1@123',
  },
  {
    name: 'PHC Admin 2',
    email: 'phc2@srmdental.com',
    phone: '9000000003',
    role: 'phc2',
    Identity: 'PHC2001',
    staffId: 'PHC2001',
    password: 'Phc2@123',
  },
  {
    name: 'Camp Admin',
    email: 'camp@srmdental.com',
    phone: '9000000004',
    role: 'c',
    Identity: 'C001',
    staffId: 'C001',
    password: 'Camp@123',
  },
  {
    name: 'PG Doctor',
    email: 'pg@srmdental.com',
    phone: '9000000005',
    role: 'pg',
    Identity: 'PG001',
    staffId: 'PG001',
    department: 'public health dentistry',
    password: 'Pg@123',
  },
  {
    name: 'UG Doctor',
    email: 'ug@srmdental.com',
    phone: '9000000006',
    role: 'ug',
    Identity: 'UG001',
    staffId: 'UG001',
    department: 'public health dentistry',
    password: 'Ug@123',
  },
  {
    name: 'UG Doctor 2',
    email: 'ug2@srmdental.com',
    phone: '9000000007',
    role: 'ug',
    Identity: 'UG002',
    staffId: 'UG002',
    department: 'public health dentistry',
    password: 'Ug2@123',
  },
];

// Old lowercase IDs to clean up
const oldIds = ['ad001', 'phc1001', 'phc2001', 'c001', 'pg001', 'ug001'];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Remove old lowercase records if they exist
    const deleted = await User.deleteMany({ Identity: { $in: oldIds } });
    if (deleted.deletedCount > 0) {
      console.log(`🗑️  Removed ${deleted.deletedCount} old lowercase record(s)`);
    }

    for (const u of users) {
      const existing = await User.findOne({ Identity: u.Identity });

      const hashedPassword = await hash(u.password, 10);
      if (existing) {
        await User.updateOne(
          { _id: existing._id },
          {
            $set: {
              name: u.name,
              email: u.email,
              phone: u.phone,
              role: u.role,
              staffId: u.staffId,
              department: u.department,
              specialization: u.specialization || null,
              password: hashedPassword,
            },
          }
        );
        console.log(`✅ Updated: ${u.Identity} [${u.role}] — password: ${u.password}`);
        continue;
      }

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
