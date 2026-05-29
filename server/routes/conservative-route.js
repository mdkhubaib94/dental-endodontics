import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import ConservativeCase from '../models/ConservativeCase.js';
import GeneralCase from '../models/GeneralCase.js';
import { User } from '../models/User.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { hasChiefDepartmentAccess, chiefDepartmentAccessDenied } from '../utils/chiefDepartmentAccess.js';
const isGeneralDepartment = (dept) => {
  const d = String(dept || '').toLowerCase();
  return d === 'general' || d.includes('general');
};

const pickPgForDoctor = async (doctor) => {
  if (!doctor || !doctor.Identity) return null;
  const pg = await User.findOne({ 
    role: 'pg', 
    $or: [{ assignedDoctorId: doctor.Identity }, { assignedDoctor: doctor.Identity }] 
  });
  return pg;
};


dotenv.config();
const router = express.Router();

// Configure multer for file uploads (digital signature)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

const parseArrayField = (field) => {
  if (typeof field === 'string') {
    try { return JSON.parse(field); } catch (e) {
      return field.split(',').map(s => s.trim());
    }
  }
  return field;
};

// helpers reused from server/utils/departmentAssignment.js

// Save conservative case sheet
router.post('/save', auth, requireRole(['doctor','chief','pg']), upload.single('digitalSignature'), async (req, res) => {
  try {
    const processedBody = { ...req.body };
    
    // Parse JSON strings
    const parseIfString = (val) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return val; }
      }
      return val;
    };
    
    // Map regNo -> patientId and name -> patientName
    if (processedBody.regNo && !processedBody.patientId) processedBody.patientId = processedBody.regNo;
    if (processedBody.name && !processedBody.patientName) processedBody.patientName = processedBody.name;
    
    if (processedBody.pastMedical) processedBody.pastMedical = parseArrayField(processedBody.pastMedical);
    if (processedBody.habits) processedBody.habits = parseArrayField(processedBody.habits);
    if (processedBody.differentialDiagnosis) processedBody.differentialDiagnosis = parseArrayField(processedBody.differentialDiagnosis);
    if (processedBody.clinicalFindings) processedBody.clinicalFindings = parseIfString(processedBody.clinicalFindings);
    if (processedBody.treatmentPictures) processedBody.treatmentPictures = parseIfString(processedBody.treatmentPictures);
    if (processedBody.treatments) processedBody.treatments = parseIfString(processedBody.treatments);
    if (processedBody.quadrants) processedBody.quadrants = parseIfString(processedBody.quadrants);
    if (processedBody.investigationsDetail) processedBody.investigationsDetail = parseIfString(processedBody.investigationsDetail);

    if (req.file) {
      processedBody.digitalSignature = { data: req.file.buffer, contentType: req.file.mimetype, fileName: req.file.originalname };
    }

    // Set doctor info from token if not provided
    if (!processedBody.doctorId) processedBody.doctorId = req.user.Identity;
    if (!processedBody.doctorName) processedBody.doctorName = req.user.name;

    const newCase = new ConservativeCase(processedBody);
    await newCase.save();
    
    return res.status(201).json({ success: true, message: 'Case saved successfully', caseId: newCase._id });
  } catch (error) {
    console.error('Error saving conservative case:', error);
    res.status(500).json({ success: false, message: 'Server error while saving conservative case', error: error.message });
  }
});

// Get all cases for a patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const cases = await ConservativeCase.find({ patientId }).select('-digitalSignature').sort({ createdAt: -1 });
    res.json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching conservative cases:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching cases', error: error.message });
  }
});

// --- Referral helpers for Conservative department ---
// Return patients referred to this specialist (backed by GeneralCase referrals)
router.get('/referred-patients', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const doctorDepartment = req.user?.department;
    if (!doctorDepartment) return res.status(400).json({ success: false, message: 'Doctor department not set' });

    // If doctor belongs to General, no specialist referrals
    if (isGeneralDepartment(doctorDepartment)) return res.json({ success: true, data: [] });

    // Find general cases assigned to this specialist
    const cases = await GeneralCase.find({ specialistDoctorId: String(req.user?.Identity || '') }).sort({ createdAt: -1 }).lean();

    const payload = cases.map((caseItem) => ({
      _id: caseItem._id,
      patientId: caseItem.patientId,
      patientName: caseItem.patientName,
      referredAt: caseItem.specialistAssignedAt || caseItem.createdAt,
      generalCaseId: caseItem._id,
      referredDepartment: caseItem.referredDepartment || caseItem.selectedDepartments?.[0] || '',
      chiefComplaint: caseItem.chiefComplaint || '',
      presentIllness: caseItem.presentIllness || '',
      pastMedical: caseItem.pastMedical || '',
      clinicalFindings: caseItem.clinicalFindings || '',
      provisionalDiagnosis: caseItem.provisionalDiagnosis || '',
      finalDiagnosis: caseItem.finalDiagnosis || '',
      treatmentPlan: caseItem.treatmentPlan || '',
      generalDescription: caseItem.generalDescription || '',
      selectedDepartments: Array.isArray(caseItem.selectedDepartments) ? caseItem.selectedDepartments : [],
      generalDoctorId: caseItem.generalDoctorId || caseItem.doctorId || '',
      generalDoctorName: caseItem.generalDoctorName || caseItem.doctorName || '',
      specialistStatus: caseItem.specialistStatus || 'pending',
      specialistRescheduleReason: caseItem.specialistRescheduleReason || '',
      assignedPgId: caseItem.assignedPgId || '',
      assignedPgName: caseItem.assignedPgName || '',
    }));

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching conservative referred patients:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching referred patients', error: error.message });
  }
});

router.patch('/referred-patients/:id/approve', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const caseItem = await GeneralCase.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ success: false, message: 'Referred case not found' });
    if (String(caseItem.specialistDoctorId || '') !== String(req.user?.Identity || '')) return res.status(403).json({ success: false, message: 'You can only approve cases assigned to you.' });

    // pick a PG under the doctor
    const assignedPg = await pickPgForDoctor(req.user);
    if (!assignedPg) return res.status(409).json({ success: false, message: 'No PG is assigned under this doctor. Assign a PG before approving this referral.' });

    caseItem.specialistStatus = 'approved';
    caseItem.specialistRescheduleReason = '';
    caseItem.specialistReviewedBy = req.user?.name || 'Doctor';
    caseItem.specialistReviewedAt = new Date();
    caseItem.assignedPgId = assignedPg.Identity || '';
    caseItem.assignedPgName = assignedPg.name || assignedPg.Identity || '';
    caseItem.pgAssignedAt = new Date();

    await caseItem.save();

    return res.json({ success: true, message: `Referral approved and assigned to ${assignedPg.name || assignedPg.Identity}.`, data: caseItem, assignedPg: { id: assignedPg.Identity || '', name: assignedPg.name || assignedPg.Identity || '' } });
  } catch (error) {
    console.error('Error approving conservative referred patient:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/referred-patients/:id/reschedule', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { reason = '' } = req.body || {};
    const caseItem = await GeneralCase.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ success: false, message: 'Referred case not found' });
    if (String(caseItem.specialistDoctorId || '') !== String(req.user?.Identity || '')) return res.status(403).json({ success: false, message: 'You can only reschedule cases assigned to you.' });

    caseItem.specialistStatus = 'rescheduled';
    caseItem.specialistRescheduleReason = String(reason || '').trim();
    caseItem.specialistReviewedBy = req.user?.name || 'Doctor';
    caseItem.specialistReviewedAt = new Date();
    caseItem.assignedPgId = '';
    caseItem.assignedPgName = '';
    caseItem.pgAssignedAt = null;

    await caseItem.save();

    return res.json({ success: true, message: 'Referral marked as rescheduled.', data: caseItem });
  } catch (error) {
    console.error('Error rescheduling conservative referred patient:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get specific case by ID
router.get('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await ConservativeCase.findById(caseId).select('-digitalSignature');
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });
    if (req.user.role === 'patient' && caseData.patientId !== req.user.Identity) return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, data: caseData });
  } catch (error) {
    console.error('Error fetching conservative case:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching case', error: error.message });
  }
});

// --- Referral helpers for Conservative department ---
// Return patients referred to this specialist (backed by GeneralCase referrals)
router.get('/referred-patients', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const doctorDepartment = req.user?.department;
    if (!doctorDepartment) return res.status(400).json({ success: false, message: 'Doctor department not set' });

    // If doctor belongs to General, no specialist referrals
    if (isGeneralDepartment(doctorDepartment)) return res.json({ success: true, data: [] });

    // Find general cases assigned to this specialist
    const cases = await GeneralCase.find({ specialistDoctorId: String(req.user?.Identity || '') }).sort({ createdAt: -1 }).lean();

    const payload = cases.map((caseItem) => ({
      _id: caseItem._id,
      patientId: caseItem.patientId,
      patientName: caseItem.patientName,
      referredAt: caseItem.specialistAssignedAt || caseItem.createdAt,
      generalCaseId: caseItem._id,
      referredDepartment: caseItem.referredDepartment || caseItem.selectedDepartments?.[0] || '',
      chiefComplaint: caseItem.chiefComplaint || '',
      presentIllness: caseItem.presentIllness || '',
      pastMedical: caseItem.pastMedical || '',
      clinicalFindings: caseItem.clinicalFindings || '',
      provisionalDiagnosis: caseItem.provisionalDiagnosis || '',
      finalDiagnosis: caseItem.finalDiagnosis || '',
      treatmentPlan: caseItem.treatmentPlan || '',
      generalDescription: caseItem.generalDescription || '',
      selectedDepartments: Array.isArray(caseItem.selectedDepartments) ? caseItem.selectedDepartments : [],
      generalDoctorId: caseItem.generalDoctorId || caseItem.doctorId || '',
      generalDoctorName: caseItem.generalDoctorName || caseItem.doctorName || '',
      specialistStatus: caseItem.specialistStatus || 'pending',
      specialistRescheduleReason: caseItem.specialistRescheduleReason || '',
      assignedPgId: caseItem.assignedPgId || '',
      assignedPgName: caseItem.assignedPgName || '',
    }));

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching conservative referred patients:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching referred patients', error: error.message });
  }
});

router.patch('/referred-patients/:id/approve', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const caseItem = await GeneralCase.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ success: false, message: 'Referred case not found' });
    if (String(caseItem.specialistDoctorId || '') !== String(req.user?.Identity || '')) return res.status(403).json({ success: false, message: 'You can only approve cases assigned to you.' });

    // pick a PG under the doctor
    const assignedPg = await pickPgForDoctor(req.user);
    if (!assignedPg) return res.status(409).json({ success: false, message: 'No PG is assigned under this doctor. Assign a PG before approving this referral.' });

    caseItem.specialistStatus = 'approved';
    caseItem.specialistRescheduleReason = '';
    caseItem.specialistReviewedBy = req.user?.name || 'Doctor';
    caseItem.specialistReviewedAt = new Date();
    caseItem.assignedPgId = assignedPg.Identity || '';
    caseItem.assignedPgName = assignedPg.name || assignedPg.Identity || '';
    caseItem.pgAssignedAt = new Date();

    await caseItem.save();

    return res.json({ success: true, message: `Referral approved and assigned to ${assignedPg.name || assignedPg.Identity}.`, data: caseItem, assignedPg: { id: assignedPg.Identity || '', name: assignedPg.name || assignedPg.Identity || '' } });
  } catch (error) {
    console.error('Error approving conservative referred patient:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/referred-patients/:id/reschedule', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { reason = '' } = req.body || {};
    const caseItem = await GeneralCase.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ success: false, message: 'Referred case not found' });
    if (String(caseItem.specialistDoctorId || '') !== String(req.user?.Identity || '')) return res.status(403).json({ success: false, message: 'You can only reschedule cases assigned to you.' });

    caseItem.specialistStatus = 'rescheduled';
    caseItem.specialistRescheduleReason = String(reason || '').trim();
    caseItem.specialistReviewedBy = req.user?.name || 'Doctor';
    caseItem.specialistReviewedAt = new Date();
    caseItem.assignedPgId = '';
    caseItem.assignedPgName = '';
    caseItem.pgAssignedAt = null;

    await caseItem.save();

    return res.json({ success: true, message: 'Referral marked as rescheduled.', data: caseItem });
  } catch (error) {
    console.error('Error rescheduling conservative referred patient:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get digital signature image
router.get('/:caseId/signature', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await ConservativeCase.findById(caseId).select('digitalSignature doctorName');
    if (!caseData || !caseData.digitalSignature) return res.status(404).json({ success: false, message: 'Signature not found' });
    if (req.user.role === 'patient' && caseData.patientId !== req.user.Identity) return res.status(403).json({ success: false, message: 'Access denied' });
    res.set('Content-Type', caseData.digitalSignature.contentType);
    res.send(caseData.digitalSignature.data);
  } catch (error) {
    console.error('Error fetching signature:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching signature', error: error.message });
  }
});

// Update a case (partial update)
router.patch('/:caseId', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const updates = req.body;
    const caseData = await ConservativeCase.findById(caseId);
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });
    if (caseData.doctorId !== req.user.Identity) return res.status(403).json({ success: false, message: 'You can only update your own cases' });
    Object.keys(updates).forEach(key => { if (updates[key] !== undefined) caseData[key] = updates[key]; });
    await caseData.save();
    res.json({ success: true, message: 'Case updated successfully', data: caseData });
  } catch (error) {
    console.error('Error updating conservative case:', error);
    res.status(500).json({ success: false, message: 'Server error while updating case', error: error.message });
  }
});

// Delete a case
router.delete('/:caseId', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await ConservativeCase.findById(caseId);
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });
    if (caseData.doctorId !== req.user.Identity) return res.status(403).json({ success: false, message: 'You can only delete your own cases' });
    await ConservativeCase.findByIdAndDelete(caseId);
    res.json({ success: true, message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Error deleting conservative case:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting case', error: error.message });
  }
});

// Chief endpoints
router.get('/chief/pending', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const cases = await ConservativeCase.find({ chiefApproval: { $exists: false } }).select('-digitalSignature').sort({ createdAt: -1 });
    res.json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching pending cases:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching pending cases', error: error.message });
  }
});

router.get('/chief/all-cases', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    if (!hasChiefDepartmentAccess(req.user, ['conservativedentistryandendodontics'])) return chiefDepartmentAccessDenied(res);
    const cases = await ConservativeCase.find({}).select('-digitalSignature').sort({ createdAt: -1 });
    res.json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching all cases:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching cases', error: error.message });
  }
});

// Approve or request redo for a case
router.patch('/:caseId/approve', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { chiefApproval, approvedBy } = req.body;
    const caseData = await ConservativeCase.findById(caseId);
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });
    caseData.chiefApproval = String(chiefApproval || '').trim();
    caseData.approvedBy = approvedBy || req.user?.name || 'Chief';
    caseData.approvedAt = new Date();
    await caseData.save();
    res.json({ success: true, message: 'Case approval updated', data: caseData });
  } catch (error) {
    console.error('Error approving conservative case:', error);
    res.status(500).json({ success: false, message: 'Server error while approving case', error: error.message });
  }
});

export default router;
