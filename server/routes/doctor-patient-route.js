// server/routes/doctor-patient-route.js
import { Router } from 'express';
import { PatientDetails } from '../models/patientDetails.js';  
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
const router = Router();

router.get('/:patientId', async (req, res) => {
  try {
    // Attempt to populate req.user if a Bearer token was supplied, but do not fail when absent.
    const authHeader = req.header('Authorization') || req.header('authorization');
    if (authHeader && String(authHeader || '').startsWith('Bearer ')) {
      const token = String(authHeader).replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
        const caller = await User.findOne({ _id: decoded.userId }).select('-password').lean();
        if (caller) req.user = caller;
      } catch (err) {
        // Ignore token errors — route remains usable without auth for basic lookups
        console.log('[doctor-patient-route] Token parse failed (continuing unauthenticated):', err.message);
      }
    }

    const patient = await PatientDetails.findOne({ patientId: req.params.patientId });

    if (!patient) {
      // If not found in PatientDetails, allow an authenticated doctor from Public Health Dentistry
      // to look up camp-registered patients that exist as User records (Identity starting with 'C').
      const normalizedId = String(req.params.patientId || '').trim();
      const looksLikeCampId = /^c/i.test(normalizedId);

      if (looksLikeCampId && req.user && String(req.user.department || '').toLowerCase().includes('public health')) {
        const linked = await User.findOne({ Identity: normalizedId }).lean();
        if (linked) {
          const fullName = String(linked?.name || '').trim();
          const nameParts = fullName.split(/\s+/).filter(Boolean);
          const fallbackPatient = {
            patientId: String(linked.Identity || normalizedId).trim(),
            personalInfo: {
              firstName: nameParts[0] || fullName || '',
              middleName: '',
              lastName: nameParts.slice(1).join(' '),
              phone: linked?.phone || '',
              email: linked?.email || '',
            },
            medicalInfo: {},
            vitals: {},
            status: 'active',
            createdAt: linked?.createdAt || new Date(),
            source: 'user-fallback',
          };

          return res.json({ success: true, data: fallbackPatient, patient: fallbackPatient, source: 'user-fallback' });
        }
      }

      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Check if patient ID exists
router.get('/check-id/:patientId', async (req, res) => {
  try {
    const patient = await PatientDetails.findOne({ patientId: req.params.patientId });
    res.json({ 
      success: true,
      exists: !!patient 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Create or update patient
router.post('/', async (req, res) => {
  try {
    const { patientId, ...patientData } = req.body;
     console.log('Received data:', req.body);

    if (!patientId || String(patientId).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'patientId is required'
      });
    }

    // Ensure pregnancyStatus is always a valid enum value when not applicable
    if (patientData?.medicalInfo) {
      const status = patientData.medicalInfo.pregnancyStatus;
      if (!status || String(status).trim() === '') {
        patientData.medicalInfo.pregnancyStatus = 'N/A';
      }
    }
    // Check if patient already exists
    let patient = await PatientDetails.findOne({ patientId });
    
    if (patient) {
  // UPDATE EXISTING PATIENT
  patient = await PatientDetails.findOneAndUpdate(
    { patientId },
    { 
      ...patientData,
      updatedAt: new Date()
    },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Patient updated successfully',
    patientId: patient.patientId,
    patientName: `${patient.personalInfo.firstName} ${patient.personalInfo.lastName}`,
  });
} else {
  // CREATE NEW PATIENT
  patient = new PatientDetails({
    patientId,
    userId: new mongoose.Types.ObjectId(),
    ...patientData
  });

  await patient.save();

  res.status(201).json({
    success: true,
    message: 'Patient created successfully',
    patientId: patient.patientId,
    patientName: `${patient.personalInfo.firstName} ${patient.personalInfo.lastName}`,
    age: patient.personalInfo.age
  });
}
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;
