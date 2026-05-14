// server/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: String,
  Identity: { type: String, unique: true },
  department: { type: String, default: null }, // For doctors
  specialization: { type: String, default: null },
  staffId: { type: String, unique: true, sparse: true }, // For doctors created by chief doctors
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Chief doctor who created this doctor
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
