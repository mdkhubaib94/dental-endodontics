// server/routes/prescription.js - Enhanced with debugging
import express from 'express';
import Prescription from '../models/Prescription.js';
import { User } from '../models/User.js';
import Appointment from '../models/AppoitmentBooked.js';
import { PatientDetails } from '../models/patientDetails.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';

const router = express.Router();

const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');

const isGeneralDoctorUser = (user) => {
  if (!user) return false;
  if (user.isGeneralDoctor === true) return true;
  if (user.isDeptDoctor === true) return false;
  return normalizeRole(user.role) === 'doctor' && String(user.department || '').trim().toLowerCase() === 'general';
};

const buildPatientData = async (appointment, overrides = {}) => {
  const patientId = String(overrides.patientId || appointment.patientId || '').trim();
  const patientDetails = patientId ? await PatientDetails.findOne({ patientId }).lean() : null;
  const patientUser = patientId ? await User.findOne({ Identity: patientId }, { name: 1, email: 1 }).lean() : null;

  const derivedName =
    String(overrides.patientData?.name || '').trim() ||
    String(patientDetails?.personalInfo?.fullName || '').trim() ||
    [patientDetails?.personalInfo?.firstName, patientDetails?.personalInfo?.middleName, patientDetails?.personalInfo?.lastName].filter(Boolean).join(' ').trim() ||
    String(patientUser?.name || '').trim() ||
    patientId;

  const derivedAge = Number.isFinite(Number(overrides.patientData?.age))
    ? Number(overrides.patientData.age)
    : Number.isFinite(Number(patientDetails?.personalInfo?.age))
      ? Number(patientDetails.personalInfo.age)
      : 0;

  const rawGender = String(overrides.patientData?.gender || patientDetails?.personalInfo?.gender || 'other').trim().toLowerCase();
  const derivedGender = ['male', 'female', 'other'].includes(rawGender) ? rawGender : 'other';

  return {
    name: derivedName,
    age: derivedAge,
    gender: derivedGender,
    date: overrides.patientData?.date ? new Date(overrides.patientData.date) : new Date(),
  };
};

// Test endpoint - MUST come before parameterized routes
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Prescription routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Debug: try saving a syrup prescription with arbitrary ml values
router.post('/test-syrup', async (req, res) => {
  try {
    const { m = '5', n = '2', e = '0', n2 = '0' } = req.body || {};
    const Prescription = (await import('../models/Prescription.js')).default;
    const doc = new Prescription({
      patientId: 'TEST-SYRUP-1',
      patientData: { name: 'Debug Patient', age: 30, gender: 'male', date: new Date() },
      symptoms: 'Debug syrup test',
      diagnosis: 'N/A',
      medicines: [{ type: 'syrup', name: 'Debug Syrup', dosage: { m: String(m), n: String(n), e: String(e), n2: String(n2) }, foodIntake: 'after', duration: 5 }],
      doctorId: 'DOC-DEBUG',
      doctorName: 'Dr Debug'
    });

    console.log('Attempting to save test-syrup prescription with dosage:', doc.medicines[0].dosage);
    const saved = await doc.save();
    res.json({ success: true, message: 'Test syrup saved', data: saved });
  } catch (error) {
    console.error('Test-syrup save error:', error);
    if (error.name === 'ValidationError') {
      const fieldErrs = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation failed', errors: fieldErrs, raw: error.errors });
    }
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
});

// Create new prescription - Enhanced with detailed logging and validation
router.post('/', auth, requireRole(['doctor', 'chief-doctor', 'pg', 'ug']), async (req, res) => {
  console.log('\n=== PRESCRIPTION CREATION START ===');
  console.log('Raw request body:', JSON.stringify(req.body, null, 2));

  try {
    const bookingId = String(req.body?.bookingId || '').trim();
    let appointment = null;
    if (bookingId) {
      appointment = await Appointment.findOne({ bookingId }).lean();
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found for bookingId' });
      }
    }

    const requesterRole = normalizeRole(req.user?.role);
    const requesterIdentity = String(req.user?.Identity || '').trim();
    const isGeneralDoctor = isGeneralDoctorUser(req.user);
    const isPgRequester = requesterRole === 'pg' || requesterRole === 'ug';

    if (appointment) {
      if (isPgRequester) {
        const { default: GeneralCase } = await import('../models/GeneralCase.js');
        const assignment = await GeneralCase.findOne({
          patientId: appointment.patientId,
          assignedPgId: requesterIdentity,
          specialistStatus: 'approved',
        }).lean();

        const fallbackPgIds = [appointment.assignedPgUgId, appointment.assigned_pg_ug_id, appointment.pgDoctorId]
          .map((value) => String(value || '').trim())
          .filter(Boolean);

        if (!assignment && !fallbackPgIds.includes(requesterIdentity)) {
          return res.status(403).json({ success: false, message: 'You are not assigned to this appointment' });
        }
      } else if (!isGeneralDoctor) {
        return res.status(403).json({ success: false, message: 'Only assigned doctors can create prescriptions for this appointment' });
      }
    }

    const {
      caseId,
      patientId,
      patientData,
      symptoms,
      diagnosis,
      medicines,
      advice,
      nextVisitDate,
      doctorId,
      doctorName
    } = req.body;

    console.log('Extracted fields:');
    console.log('- caseId:', caseId);
    console.log('- patientId:', patientId);
    console.log('- patientData:', patientData);
    console.log('- symptoms:', symptoms);
    console.log('- diagnosis:', diagnosis);
    console.log('- medicines:', medicines);
    console.log('- doctorId:', doctorId);
    console.log('- doctorName:', doctorName);

    const effectivePatientId = String(patientId || appointment?.patientId || '').trim();
    const effectivePatientData = patientData && typeof patientData === 'object'
      ? patientData
      : appointment
        ? await buildPatientData(appointment, { patientId: effectivePatientId, patientData: null })
        : null;

    const effectiveDoctorId = String(doctorId || req.user?._id || req.user?.Identity || appointment?.doctorId || '').trim();
    const effectiveDoctorName = String(doctorName || req.user?.name || req.user?.Identity || appointment?.doctorName || 'Doctor').trim();
    const effectiveSymptoms = String(symptoms || appointment?.chiefComplaint || diagnosis || '').trim();
    const fallbackMedicineType = appointment ? 'syrup' : '';

    // Detailed validation with specific error messages
    const errors = [];

    if (!effectivePatientId) {
      errors.push('Patient ID is required and must be a non-empty string');
    }

    if (!effectiveSymptoms) {
      errors.push('Symptoms are required and must be a non-empty string');
    }

    if (!diagnosis || typeof diagnosis !== 'string' || !diagnosis.trim()) {
      errors.push('Diagnosis is required and must be a non-empty string');
    }

    if (!effectiveDoctorId) {
      errors.push('Doctor ID is required and must be a non-empty string');
    }

    if (!effectiveDoctorName) {
      errors.push('Doctor name is required and must be a non-empty string');
    }

    if (!effectivePatientData || typeof effectivePatientData !== 'object') {
      errors.push('Patient data is required and must be an object');
    } else {
      if (!effectivePatientData.name || typeof effectivePatientData.name !== 'string' || !effectivePatientData.name.trim()) {
        errors.push('Patient name is required in patientData');
      }
      if (effectivePatientData.age === undefined || effectivePatientData.age === null || Number.isNaN(Number(effectivePatientData.age))) {
        errors.push('Patient age is required and must be a number');
      }
      if (!effectivePatientData.gender || !['male', 'female', 'other'].includes(String(effectivePatientData.gender).toLowerCase())) {
        errors.push('Patient gender must be male, female, or other');
      }
    }

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      errors.push('At least one medicine is required');
    } else {
      // Allow common synonyms from client (e.g., "Tablets") by normalizing types
      const TYPE_MAP = {
        injection: 'injection',
        syrup: 'syrup',
        pills: 'pills',
        pill: 'pills',
        tablets: 'pills',
        tablet: 'pills',
        capsule: 'pills',
        ointment: 'ointment'
      };

      medicines.forEach((med, index) => {
        const rawType = med && med.type ? String(med.type).toLowerCase() : fallbackMedicineType;
        const normalized = TYPE_MAP[rawType] || null;

        if (!normalized) {
          errors.push(`Medicine ${index + 1}: Invalid type '${med && med.type ? med.type : ''}'. Allowed: injection, syrup, pills, ointment`);
        }

        if (!med.name || typeof med.name !== 'string' || !med.name.trim()) {
          errors.push(`Medicine ${index + 1}: Name is required`);
        }

        // Duration is optional for non-injection medicines; if provided, it must be numeric
        if (med.duration && isNaN(parseInt(med.duration))) {
          errors.push(`Medicine ${index + 1}: Duration must be a number if provided`);
        }
      });
    }

    if (errors.length > 0) {
      console.log('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Create prescription with validated and processed data
    const prescriptionData = {
      caseId: caseId && String(caseId).trim() ? String(caseId).trim() : null,
      patientId: effectivePatientId,
      patientData: {
        name: String(effectivePatientData.name).trim(),
        age: parseInt(effectivePatientData.age),
        gender: String(effectivePatientData.gender).toLowerCase(),
        date: effectivePatientData.date ? new Date(effectivePatientData.date) : new Date()
      },
      symptoms: effectiveSymptoms,
      diagnosis: diagnosis.trim(),
      medicines: (medicines || [])
        .filter(med => med && med.name) // Keep medicines that have at least a name
        .map(med => {
          // Normalize type mapping (same map as validation)
          const TYPE_MAP = {
            injection: 'injection',
            syrup: 'syrup',
            pills: 'pills',
            pill: 'pills',
            tablets: 'pills',
            tablet: 'pills',
            capsule: 'pills',
            ointment: 'ointment'
          };

          const rawType = med && med.type ? String(med.type).toLowerCase() : fallbackMedicineType;
          const normalizedType = TYPE_MAP[rawType] || rawType;

          const processedMedicine = {
            type: normalizedType,
            name: String(med.name || '').trim(),
            dosage: {
              m: String(med.dosage?.m ?? '0'),
              n: String(med.dosage?.n ?? '0'),
              e: String(med.dosage?.e ?? '0'),
              n2: String(med.dosage?.n2 ?? '0')
            },
            foodIntake: med.foodIntake || 'after',
            asNeeded: Boolean(med.asNeeded)
          };

          // Handle duration based on medicine type
          if (normalizedType === 'injection') {
            processedMedicine.duration = 1;
            processedMedicine.dosage.m = '1';
            processedMedicine.dosage.n = '0';
            processedMedicine.dosage.e = '0';
            processedMedicine.dosage.n2 = '0';
          } else {
            processedMedicine.duration = parseInt(med.duration) || 0;
          }

          return processedMedicine;
        }),
      advice: advice ? advice.trim() : '',
      nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null,
        doctorId: effectiveDoctorId,
        doctorName: effectiveDoctorName,
      status: 'active'
    };

    console.log('Processed prescription data:');
    console.log(JSON.stringify(prescriptionData, null, 2));

    // Create and save prescription
    console.log('Creating new Prescription instance...');
    const prescription = new Prescription(prescriptionData);

    console.log('Calling save()...');
    const savedPrescription = await prescription.save();

    if (appointment) {
      await Appointment.findOneAndUpdate(
        { bookingId: appointment.bookingId },
        { $set: { status: 'completed', needsGeneralApproval: false, needsPgApproval: false } },
        { new: true }
      );
    }

    // 📅 Auto-schedule Revisit Appointment
    if (nextVisitDate) {
      try {
        const visitDateStr = new Date(nextVisitDate).toISOString().split('T')[0];
        const patientUser = await User.findOne({ Identity: effectivePatientId }, { email: 1 });
        
        const revisitAppt = new Appointment({
          bookingId: "SRMDNT" + Math.floor(100000 + Math.random() * 900000).toString(),
          patientId: effectivePatientId,
          patientEmail: patientUser?.email || "patient@example.com",
          chiefComplaint: `Revisit: ${diagnosis || symptoms}`,
          appointmentDate: visitDateStr,
          appointmentTime: "9:00 AM", // Default slot
          doctorId: effectiveDoctorId,
          status: "pending",
          needsGeneralApproval: true
        });
        
        await revisitAppt.save();
        console.log(`📅 Revisit appointment scheduled for ${visitDateStr}`);
      } catch (apptErr) {
        console.error("❌ Failed to auto-schedule revisit appointment:", apptErr);
      }
    }

    console.log('Prescription saved successfully!');
    console.log('Saved prescription ID:', savedPrescription._id);
    console.log('=== PRESCRIPTION CREATION END ===\n');

    res.status(201).json({
      success: true,
      message: 'Prescription saved successfully',
      data: savedPrescription,
      appointmentStatus: appointment ? 'completed' : null
    });

  } catch (error) {
    console.error('\n=== PRESCRIPTION CREATION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.error('Validation errors:', validationErrors);
      console.error('=== END ERROR ===\n');

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        field_errors: error.errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      console.error('Duplicate key error:', error.keyPattern);
      console.error('=== END ERROR ===\n');

      return res.status(400).json({
        success: false,
        message: 'Duplicate prescription detected',
        duplicate_field: error.keyPattern
      });
    }

    // Handle MongoDB connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
      console.error('Database connection error');
      console.error('=== END ERROR ===\n');

      return res.status(503).json({
        success: false,
        message: 'Database connection error. Please try again.',
        error_type: 'database_error'
      });
    }

    console.error('=== END ERROR ===\n');

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Failed to save prescription. Please try again.',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      } : 'Internal server error'
    });
  }
});

// Get prescriptions by case ID (case-sheet linked)
router.get('/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!caseId || !String(caseId).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Case ID is required'
      });
    }

    const query = { caseId: String(caseId).trim() };

    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Prescription.countDocuments(query);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching case prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch case prescriptions',
      error: error.message
    });
  }
});

// Get prescriptions by patient ID
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const { caseId } = req.query;

    console.log(`Fetching prescriptions for patient: ${patientId}`);

    const query = {
      patientId,
      ...(caseId && String(caseId).trim() ? { caseId: String(caseId).trim() } : {})
    };

    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Prescription.countDocuments(query);

    console.log(`Found ${prescriptions.length} prescriptions for patient ${patientId}`);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message
    });
  }
});

// Get prescription by ID
router.get('/:prescriptionId', async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    if (!prescriptionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prescription ID format'
      });
    }

    const prescription = await Prescription.findById(prescriptionId);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription',
      error: error.message
    });
  }
});

// Debug endpoint to test database connection
router.get('/debug/db-test', async (req, res) => {
  try {
    const count = await Prescription.countDocuments();
    const sample = await Prescription.find({}).limit(3);

    res.json({
      success: true,
      message: 'Database connection working',
      prescription_count: count,
      sample_prescriptions: sample,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
