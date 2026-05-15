
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is required to run this seed script. Set it in .env or environment.');
  process.exit(1);
}

const IDENTITY = 'ENDO01';
const PASSWORD = '123456';
const NAME = 'Dr. Endo Test';
const DEPARTMENT = 'Conservative Dentistry and Endodontics';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ Identity: IDENTITY });
    if (existing) {
      console.log(`User with Identity ${IDENTITY} already exists: ${existing.name} <${existing.email || 'no-email'}>`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const hashed = await bcrypt.hash(PASSWORD, 10);

    const user = new User({
      name: NAME,
      email: `${IDENTITY.toLowerCase()}@example.local`,
      phone: '',
      password: hashed,
      role: 'doctor',
      Identity: IDENTITY,
      department: DEPARTMENT,
    });

    await user.save();
    console.log(`Created Endodontics doctor: ${IDENTITY} / password: ${PASSWORD}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    try { await mongoose.disconnect(); } catch {};
    process.exit(1);
  }
};

run();
