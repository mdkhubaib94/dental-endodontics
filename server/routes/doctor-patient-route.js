// server/routes/doctor-patient-route.js
import { Router } from 'express';
import { PatientDetails } from '../models/patientDetails.js';  
import mongoose from 'mongoose';
const router = Router();

router.get('/:patientId', async (req, res) => {
  try {
    const patient = await PatientDetails.findOne({ patientId: req.params.patientId });
    
    if (!patient) {
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
