// Temporary API endpoint to query database state
import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Appointment } from '../models/AppoitmentBooked.js';
import GeneralCase from '../models/GeneralCase.js';
import { User } from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

router.get('/raw-db-state', async (req, res) => {
  try {
    const bookingId = req.query.bookingId || 'SRMDNT691616';
    
    // Query raw appointment
    const apt = await mongoose.connection.db.collection('appointments').findOne({
      bookingId
    });
    
    // Query raw general case
    const genCase = apt ? await mongoose.connection.db.collection('generalcases').findOne({
      patientId: apt.patientId
    }) : null;
    
    res.json({
      appointment: apt,
      generalCase: genCase,
      bookingId: bookingId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/query-state', async (req, res) => {
  try {
    // Find an appointment with status = 'assigned'
    const assignedAppointment = await Appointment.findOne(
      { status: 'assigned' },
      { bookingId: 1, patientId: 1, status: 1, isProcessed: 1, appointmentDate: 1 }
    ).lean();
    
    // Find corresponding general case
    let assignedCase = null;
    if (assignedAppointment) {
      assignedCase = await GeneralCase.findOne(
        { patientId: assignedAppointment.patientId },
        { patientId: 1, assignedPgId: 1, specialistStatus: 1, specialistDoctorId: 1 }
      ).lean().sort({ createdAt: -1 });
    }
    
    // If we have an assignedCase with assignedPgId, try to resolve that user
    let pgUser = null;
    if (assignedCase && assignedCase.assignedPgId) {
      pgUser = await User.findOne(
        { Identity: String(assignedCase.assignedPgId).trim() },
        { Identity: 1, name: 1, email: 1, department: 1, createdBy: 1 }
      ).lean();
    }

    // Fallback: pick any PG if the assigned PG user wasn't found
    if (!pgUser) {
      pgUser = await User.findOne(
        { role: 'pg' },
        { Identity: 1, name: 1, email: 1, department: 1, createdBy: 1 }
      ).lean();
    }

    res.json({ assignedAppointment, assignedCase, pgUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/all-pgs', async (req, res) => {
  try {
    const allPgs = await User.find(
      { role: { $in: ['pg', 'ug'] } },
      { Identity: 1, name: 1, email: 1, department: 1, role: 1, createdBy: 1 }
    ).lean();

    res.json({ success: true, pgs: allPgs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/assignments-mismatch', async (req, res) => {
  try {
    // Find all assigned general cases
    const cases = await GeneralCase.find(
      { assignedPgId: { $ne: '', $exists: true } },
      { patientId: 1, assignedPgId: 1, specialistStatus: 1 }
    ).lean().limit(5);

    // For each case, check if the assignedPgId matches a real PG's Identity
    const mismatches = [];
    for (const caseItem of cases) {
      const pgId = String(caseItem.assignedPgId || '').trim();
      const pgUser = await User.findOne(
        { Identity: pgId },
        { Identity: 1, name: 1, role: 1 }
      ).lean();

      if (!pgUser) {
        mismatches.push({
          caseId: caseItem._id,
          patientId: caseItem.patientId,
          assignedPgId: caseItem.assignedPgId,
          pgFound: false,
          issue: `No user with Identity="${pgId}"`
        });
      }
    }

    res.json({
      success: true,
      casesChecked: cases.length,
      mismatches: mismatches,
      cases: cases
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Returns doctors and PG/UG users for a given department (defaults to Prosthodontics)
router.get('/prostho-staff', async (req, res) => {
  try {
    const department = req.query.department || 'Prosthodontics';

    const doctors = await User.find(
      { role: 'doctor', department: { $regex: department, $options: 'i' } },
      { Identity: 1, name: 1, email: 1, department: 1, role: 1 }
    ).lean();

    const trainees = await User.find(
      { role: { $in: ['pg', 'ug'] }, department: { $regex: department, $options: 'i' } },
      { Identity: 1, name: 1, email: 1, department: 1, role: 1 }
    ).lean();

    res.json({ success: true, department, doctors, trainees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug: return recent AuditLog entries and tail of approval-audit.log
router.get('/audit-logs', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50')));
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit).lean();

    const outDir = path.join(process.cwd(), 'server', 'audit-output');
    const logFile = path.join(outDir, 'approval-audit.log');
    let fileTail = null;
    if (fs.existsSync(logFile)) {
      try {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);
        fileTail = lines.slice(-Math.min(500, lines.length));
      } catch (e) {
        fileTail = `failed to read file: ${e.message}`;
      }
    }

    res.json({ success: true, count: logs.length, logs, fileTail });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Temporary seed route to create test users and return basic tokens
router.post('/seed-test-users', async (req, res) => {
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const jwt = (await import('jsonwebtoken')).default;
    const User = (await import('../models/User.js')).User;

    const testPassword = 'Test@1234';
    const hashed = await bcrypt.hash(testPassword, 10);

    // Remove existing test users
    await User.deleteMany({ email: { $regex: /^test_.*@clinic\.com$/ } });

    const users = [
      { name: 'Test Patient', email: 'test_patient@clinic.com', password: hashed, role: 'patient', Identity: 'TEST_PATIENT_001' },
      { name: 'Test General Doctor', email: 'test_generaldoc@clinic.com', password: hashed, role: 'doctor', department: 'general', Identity: 'TEST_GENDOC_001', isGeneralDoctor: true, isDeptDoctor: false },
      { name: 'Test Dept Doctor', email: 'test_deptdoc@clinic.com', password: hashed, role: 'doctor', department: 'prosthodontics', Identity: 'TEST_DEPTDOC_001', isGeneralDoctor: false, isDeptDoctor: true },
      { name: 'Test PG', email: 'test_pg@clinic.com', password: hashed, role: 'pg', department: 'prosthodontics', Identity: 'TEST_PG_001' },
    ];

    const created = await User.insertMany(users);
    // Link PG/UG createdBy to the specialist department doctor so referral assignment works
    const specialistDoc = created.find(u => u.role === 'doctor' && String(u.department || '').toLowerCase().includes('prostho'));
    if (specialistDoc) {
      await User.updateMany({ role: 'pg' }, { $set: { createdBy: specialistDoc._id } });
    }

    const tokens = {};
    for (const u of created) {
      const token = jwt.sign({ userId: u._id, role: u.role }, process.env.JWT_SECRET || 'defaultsecret', { expiresIn: '24h' });
      tokens[u.Identity === 'TEST_GENDOC_001' ? 'generalDoctor' : u.Identity === 'TEST_DEPTDOC_001' ? 'deptDoctor' : u.role === 'pg' ? 'pg' : u.role] = token;
    }

    res.json({ success: true, createdCount: created.length, tokens });
  } catch (err) {
    console.error('Seed test users error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Debug helper: mint a JWT for an existing user by Identity (local testing only)
router.post('/token-for-identity', async (req, res) => {
  try {
    const { identity } = req.body || {};
    if (!identity) return res.status(400).json({ success: false, message: 'Missing identity' });

    const { User } = await import('../models/User.js');
    const user = await User.findOne({ Identity: String(identity).trim() }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'defaultsecret', { expiresIn: '24h' });

    res.json({ success: true, identity: user.Identity, userId: user._id, role: user.role, token });
  } catch (err) {
    console.error('Token mint error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Debug helper: mint a JWT for an existing user by MongoDB _id (local testing only)
router.post('/token-for-userid', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });

    const { User } = await import('../models/User.js');
    const user = await User.findById(String(userId).trim()).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const jwt = (await import('jsonwebtoken')).default;
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'defaultsecret', { expiresIn: '24h' });

    res.json({ success: true, userId: user._id, identity: user.Identity, role: user.role, token });
  } catch (err) {
    console.error('Token for userId error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

