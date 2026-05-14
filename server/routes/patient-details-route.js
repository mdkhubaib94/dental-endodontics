// server/routes/patient-details-route.js
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PatientDetails } from '../models/patientDetails.js';
import { User } from '../models/User.js';
import generateNextPatientId from '../utils/patientIdGenerator.js';
import { hash } from 'bcryptjs';
 

const router = express.Router();

const DEFAULT_PATIENT_PASSWORD = '123456';
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const STAFF_ROLE_REGEX = /^(admin|doctor|chief-doctor|pg)$/i;
const PATIENT_ROLE_REGEX = /^patient$/i;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEGACY_PATIENTS_FILE = path.resolve(__dirname, '../all-patients.json');
let legacyPatientsCache = null;

const mapUserToFallbackPatient = (userDoc, fallbackIdentity = '') => {
  const fullName = String(userDoc?.name || '').trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  return {
    patientId: String(userDoc?.Identity || fallbackIdentity || '').trim(),
    personalInfo: {
      firstName: nameParts[0] || fullName || '',
      middleName: '',
      lastName: nameParts.slice(1).join(' '),
      phone: userDoc?.phone || '',
      email: userDoc?.email || '',
    },
    medicalInfo: {},
    vitals: {},
    status: 'active',
    createdAt: userDoc?.createdAt || new Date(),
    source: 'user-fallback',
  };
};

const isLikelyPatientIdentity = (identity = '') => /^\d{5,}$/.test(String(identity || '').trim());

const mapLegacyPatientToFallback = (entry) => ({
  patientId: String(entry?.patientId || '').trim(),
  personalInfo: {
    firstName: String(entry?.firstName || '').trim(),
    middleName: String(entry?.middleName || '').trim(),
    lastName: String(entry?.lastName || '').trim(),
    age: Number.isFinite(Number(entry?.age)) ? Number(entry?.age) : undefined,
    gender: String(entry?.gender || '').trim(),
    phone: String(entry?.phone || '').trim(),
    email: String(entry?.email || '').trim(),
    address: String(entry?.address || '').trim(),
  },
  medicalInfo: {},
  vitals: {},
  status: String(entry?.status || 'active').trim() || 'active',
  createdAt: entry?.createdAt || new Date().toISOString(),
  source: 'legacy-json-fallback',
});

const loadLegacyPatients = async () => {
  if (legacyPatientsCache) return legacyPatientsCache;

  try {
    const raw = await fs.readFile(LEGACY_PATIENTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    legacyPatientsCache = Array.isArray(parsed?.patients) ? parsed.patients : [];
  } catch (error) {
    console.warn('[Patient Details] Could not load legacy patient JSON fallback:', error.message);
    legacyPatientsCache = [];
  }

  return legacyPatientsCache;
};

const findLegacyPatientById = async ({ normalizedId, compactId }) => {
  const entries = await loadLegacyPatients();
  if (!entries.length) return null;

  const normalizedLower = String(normalizedId || '').trim().toLowerCase();
  const compactLower = String(compactId || '').trim().toLowerCase();

  const matched = entries.find((entry) => {
    const rawId = String(entry?.patientId || '').trim();
    if (!rawId) return false;

    const rawLower = rawId.toLowerCase();
    const rawCompactLower = rawId.replace(/\s+/g, '').toLowerCase();

    return rawLower === normalizedLower || (compactLower && rawCompactLower === compactLower);
  });

  return matched ? mapLegacyPatientToFallback(matched) : null;
};

const findLinkedPatientUser = async ({ normalizedId, compactId }) => {
  let linkedPatientUser = await User.findOne({
    Identity: normalizedId,
    role: { $regex: PATIENT_ROLE_REGEX },
  }).lean();

  if (!linkedPatientUser && compactId) {
    const escapedIdentity = escapeRegex(compactId);
    linkedPatientUser = await User.findOne({
      Identity: { $regex: `^${escapedIdentity}$`, $options: 'i' },
      role: { $regex: PATIENT_ROLE_REGEX },
    }).lean();
  }

  if (!linkedPatientUser && isLikelyPatientIdentity(compactId || normalizedId)) {
    linkedPatientUser = await User.findOne({ Identity: normalizedId }).lean();

    if (!linkedPatientUser && compactId) {
      const escapedIdentity = escapeRegex(compactId);
      linkedPatientUser = await User.findOne({
        Identity: { $regex: `^${escapedIdentity}$`, $options: 'i' },
      }).lean();
    }

    if (linkedPatientUser && STAFF_ROLE_REGEX.test(String(linkedPatientUser.role || '').trim())) {
      linkedPatientUser = null;
    }
  }

  return linkedPatientUser;
};

// GET /api/patient-details/next-id - generate next available patient ID
router.get('/next-id', async (req, res) => {
  try {
    const patientId = await generateNextPatientId();
    return res.status(200).json({ success: true, patientId });
  } catch (error) {
    console.error('Error generating next patient ID:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate patient ID',
    });
  }
});

// Create new patient
router.post('/', async (req, res) => {
  try {
    console.log('Creating new patient with data:', req.body);

    const {
      patientId,
      personalInfo,
      status = 'active',
      walkIn,
      createAccount = true,
    } = req.body;

    let finalPatientId = String(patientId || '').trim();

    // Case 1: No patientId -> pure walk-in, backend generates ID
    if (!finalPatientId) {
      finalPatientId = await generateNextPatientId();
    }

    // Validate required fields
    if (!finalPatientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    if (!personalInfo || !personalInfo.firstName || !personalInfo.lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    const firstName = String(personalInfo.firstName || '').trim();
    const lastName = String(personalInfo.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const normalizedEmail = String(personalInfo?.email || '').trim().toLowerCase();
    const normalizedPhone = String(personalInfo?.phone || '').trim();

    // Check if patient ID already exists
    const existingPatient = await PatientDetails.findOne({ patientId: finalPatientId });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: `Patient with ID ${finalPatientId} already exists`
      });
    }

    let linkedUser = await User.findOne({ Identity: finalPatientId });
    let accountMeta = {
      created: false,
      linked: Boolean(linkedUser),
      email: linkedUser?.email || normalizedEmail || '',
      generatedPassword: null,
    };

    if (linkedUser && linkedUser.role !== 'patient') {
      return res.status(409).json({
        success: false,
        message: `Identity ${finalPatientId} is already assigned to a non-patient account.`,
      });
    }

    // Legacy behavior: if admin enters non-walk-in ID, require signup unless createAccount is enabled.
    if (!linkedUser && !walkIn && !createAccount) {
      return res.status(400).json({
        success: false,
        message:
          'Patient ID not found from signup. For walk-in patients, use the Generate ID option instead of typing a random ID.',
      });
    }

    if (!linkedUser && createAccount) {
      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email is required to create a patient login account.',
        });
      }

      // Walk-in registrations no longer require OTP verification for admin registration.

      const emailRegex = new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i');
      const existingEmailUser = await User.findOne({ email: { $regex: emailRegex } });
      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message: 'Email is already registered with another account.',
        });
      }

      if (normalizedPhone) {
        const existingPhoneUser = await User.findOne({ phone: normalizedPhone });
        if (existingPhoneUser) {
          return res.status(409).json({
            success: false,
            message: 'Phone is already registered with another account.',
          });
        }
      }

      const generatedPassword = DEFAULT_PATIENT_PASSWORD;
      const hashedPassword = await hash(generatedPassword, 10);

      linkedUser = await User.create({
        name: fullName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashedPassword,
        role: 'patient',
        Identity: finalPatientId,
      });

      accountMeta = {
        created: true,
        linked: true,
        email: linkedUser.email,
        generatedPassword,
      };
    } else if (linkedUser) {
      let hasUserUpdates = false;

      if (fullName && fullName !== String(linkedUser.name || '')) {
        linkedUser.name = fullName;
        hasUserUpdates = true;
      }

      if (normalizedEmail && normalizedEmail !== String(linkedUser.email || '').trim().toLowerCase()) {
        const emailRegex = new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i');
        const existingEmailUser = await User.findOne({
          _id: { $ne: linkedUser._id },
          email: { $regex: emailRegex },
        });

        if (existingEmailUser) {
          return res.status(409).json({
            success: false,
            message: 'Email is already registered with another account.',
          });
        }

        linkedUser.email = normalizedEmail;
        hasUserUpdates = true;
      }

      if (normalizedPhone && normalizedPhone !== String(linkedUser.phone || '').trim()) {
        const existingPhoneUser = await User.findOne({
          _id: { $ne: linkedUser._id },
          phone: normalizedPhone,
        });

        if (existingPhoneUser) {
          return res.status(409).json({
            success: false,
            message: 'Phone is already registered with another account.',
          });
        }

        linkedUser.phone = normalizedPhone;
        hasUserUpdates = true;
      }

      if (hasUserUpdates) {
        await linkedUser.save();
      }

      accountMeta = {
        created: false,
        linked: true,
        email: linkedUser.email || normalizedEmail || '',
        generatedPassword: null,
      };
    }

    // Create new patient
    const newPatient = new PatientDetails({
      patientId: finalPatientId,
      userId: linkedUser?._id,
      personalInfo: {
        ...personalInfo,
        email: normalizedEmail || '',
        phone: normalizedPhone || '',
      },
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedPatient = await newPatient.save();

    console.log('Patient created successfully:', savedPatient.patientId);

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      patient: savedPatient,
      data: savedPatient, // Include both for compatibility
      account: accountMeta,
    });

  } catch (error) {
    console.error('Error creating patient:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Patient ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update existing patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`Updating patient ${id} with data:`, updateData);

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const updatedPatient = await PatientDetails.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      patient: updatedPatient,
      data: updatedPatient
    });

  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update patient by patientId (not _id)
router.put('/by-patient-id/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const updateData = req.body;

    console.log(`Updating patient ${patientId} with data:`, updateData);

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const updatedPatient = await PatientDetails.findOneAndUpdate(
      { patientId: patientId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      patient: updatedPatient,
      data: updatedPatient
    });

  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get patient details by patientId (not _id)
router.get('/by-patient-id/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const normalizedId = String(patientId).trim();
    const compactId = normalizedId.replace(/\s+/g, '');
    
    console.log(`[Patient Details] Fetching patient with ID: ${normalizedId}`);

    let patient = await PatientDetails.findOne({ patientId: normalizedId });

    // Fallback: tolerate casing/spacing differences entered in UI.
    if (!patient && compactId) {
      const escaped = compactId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      patient = await PatientDetails.findOne({
        patientId: { $regex: `^${escaped}$`, $options: 'i' },
      });
    }

    if (!patient) {
      // Fallback: some legacy/sign-up-only patients exist in User but not in PatientDetails.
      const linkedPatientUser = await findLinkedPatientUser({ normalizedId, compactId });

      if (linkedPatientUser) {
        const fallbackPatient = mapUserToFallbackPatient(linkedPatientUser, normalizedId);

        console.log(`[Patient Details] Fallback user match found for ID: ${normalizedId}`);
        return res.status(200).json({
          success: true,
          data: fallbackPatient,
          patient: fallbackPatient,
          source: 'user-fallback',
          message: 'Patient found from signup records',
        });
      }

      const legacyPatient = await findLegacyPatientById({ normalizedId, compactId });
      if (legacyPatient) {
        console.log(`[Patient Details] Legacy JSON fallback match found for ID: ${normalizedId}`);
        return res.status(200).json({
          success: true,
          data: legacyPatient,
          patient: legacyPatient,
          source: 'legacy-json-fallback',
          message: 'Patient found from legacy registration records',
        });
      }

      console.log(`[Patient Details] Patient not found for ID: ${normalizedId}`);
      return res.status(404).json({
        success: false,
        message: `Patient not found for ID: ${normalizedId}`
      });
    }

    console.log(`[Patient Details] Found patient: ${normalizedId} - Name: ${patient.personalInfo?.firstName} ${patient.personalInfo?.lastName}`);
    
    res.status(200).json({
      success: true,
      data: patient,
      patient: patient, // Include both for compatibility
      message: 'Patient details retrieved successfully'
    });
  } catch (error) {
    console.error('[Patient Details] Error fetching patient details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all patient details
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all patients...');

    // Get query parameters for filtering and pagination
    const { page = 1, limit = 50, status, search } = req.query;

    // Build filter object
    let filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { patientId: { $regex: search, $options: 'i' } },
        { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
        { 'personalInfo.phone': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    let patients = await PatientDetails.find(filter)
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    let total = await PatientDetails.countDocuments(filter);

    // Fallback for deployments where legacy users exist without PatientDetails records.
    if ((!total || !patients.length) && !status) {
      let userFilter = {};

      if (search) {
        userFilter = {
          $or: [
            { Identity: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        };
      }

      const users = await User.find(userFilter)
        .select('Identity name email phone role createdAt')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const fallbackPatients = users
        .filter((u) => String(u?.Identity || '').trim())
        .filter((u) => {
          const role = String(u?.role || '').trim();
          if (!role) return isLikelyPatientIdentity(u?.Identity);
          if (PATIENT_ROLE_REGEX.test(role)) return true;
          if (STAFF_ROLE_REGEX.test(role)) return false;
          return isLikelyPatientIdentity(u?.Identity);
        })
        .map((u) => mapUserToFallbackPatient(u, u?.Identity));

      if (fallbackPatients.length) {
        patients = fallbackPatients;
        total = fallbackPatients.length;
      }

      if (!patients.length) {
        const legacyEntries = await loadLegacyPatients();
        const filteredLegacy = legacyEntries
          .filter((entry) => String(entry?.patientId || '').trim())
          .filter((entry) => {
            if (!search) return true;
            const haystack = [
              entry.patientId,
              entry.firstName,
              entry.middleName,
              entry.lastName,
              entry.fullName,
              entry.phone,
              entry.email,
            ]
              .map((v) => String(v || '').toLowerCase())
              .join(' ');

            return haystack.includes(String(search || '').toLowerCase());
          })
          .map(mapLegacyPatientToFallback);

        if (filteredLegacy.length) {
          patients = filteredLegacy.slice((page - 1) * limit, (page - 1) * limit + Number(limit));
          total = filteredLegacy.length;
        }
      }
    }

    console.log(`Found ${patients.length} patients (total: ${total})`);

    res.status(200).json({
      success: true,
      patients: patients, // Frontend expects 'patients' key
      data: patients, // Include both for compatibility
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total,
        limit: parseInt(limit)
      },
      message: 'All patient details retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching all patient details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get patient details by _id (existing functionality)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await PatientDetails.findById(id).populate('userId', 'email');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient,
      patient: patient, // Include both for compatibility
      message: 'Patient details retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPatient = await PatientDetails.findByIdAndDelete(id);

    if (!deletedPatient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully',
      patient: deletedPatient
    });

  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete patient by patientId
router.delete('/by-patient-id/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const deletedPatient = await PatientDetails.findOneAndDelete({ patientId: patientId });

    if (!deletedPatient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient deleted successfully',
      patient: deletedPatient
    });

  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get patient statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalPatients = await PatientDetails.countDocuments();
    const activePatients = await PatientDetails.countDocuments({ status: 'active' });
    const inactivePatients = await PatientDetails.countDocuments({ status: 'inactive' });

    // Get patients created today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const newToday = await PatientDetails.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalPatients,
        active: activePatients,
        inactive: inactivePatients,
        newToday: newToday
      },
      message: 'Patient statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching patient statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
