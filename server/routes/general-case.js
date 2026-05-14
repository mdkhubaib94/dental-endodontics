// server/routes/general-case.js - General Case Sheet Routes
import express from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import GeneralCase from '../models/GeneralCase.js';
import Appointment from '../models/AppoitmentBooked.js';
import { User } from '../models/User.js';
import AssignmentState from '../models/AssignmentState.js';

const router = express.Router();

const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '');
const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
const XRAY_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg);base64,/i;
const MAX_XRAY_DATA_URL_LENGTH = 8 * 1024 * 1024;

const GENERAL_DEPARTMENT_KEYS = new Set(['general', 'generaldentistry']);

const departmentAliasMap = {
  prosthodontics: ['prosthodontics', 'prothodontics', 'prosthondontics'],
  pedodontics: ['pedodontics'],
  periodontics: ['periodontics'],
  conservativedentistryandendodontics: ['conservativedentistryandendodontics', 'conservativedentistry', 'endodontics'],
  oralandmaxillofacial: ['oralandmaxillofacial', 'oralmaxillofacial', 'oralsurgery'],
  general: ['general', 'generaldentistry'],
};

const normalizeLabelToDepartmentKey = (departmentLabel) => {
  const normalized = normalizeDepartment(departmentLabel);

  if (normalized.startsWith('prostho') || normalized.startsWith('protho') || normalized.startsWith('prosth')) {
    return 'prosthodontics';
  }
  if (normalized === 'pedodontics') return 'pedodontics';
  if (normalized === 'periodontics') return 'periodontics';
  if (normalized.includes('conservative') || normalized.includes('endodontic')) {
    return 'conservativedentistryandendodontics';
  }
  if (normalized.includes('oral') || normalized.includes('maxillofacial')) {
    return 'oralandmaxillofacial';
  }
  if (GENERAL_DEPARTMENT_KEYS.has(normalized)) return 'general';

  return normalized;
};

const getDepartmentBucket = (departmentLabel) => {
  const normalized = normalizeLabelToDepartmentKey(departmentLabel);

  if (!normalized) return 'all';
  if (normalized === 'pedodontics') return 'pedodontics';
  if (
    normalized === 'prosthodontics' ||
    normalized === 'fpd' ||
    normalized === 'fixedpartialdenture' ||
    normalized.includes('implant') ||
    normalized.includes('partial')
  ) {
    return 'prosthodontics';
  }

  return 'all';
};

const extractResendReason = (chiefApprovalText) => {
  const rawText = String(chiefApprovalText || '').trim();
  if (!rawText) return '';

  const match = rawText.match(/(?:redo|resend)\s*:?\s*(.*)$/i);
  if (!match) return '';

  return String(match[1] || '').trim();
};

const isGeneralDepartment = (departmentLabel) => {
  return GENERAL_DEPARTMENT_KEYS.has(normalizeDepartment(departmentLabel));
};

const getDepartmentAliases = (departmentLabel) => {
  const departmentKey = normalizeLabelToDepartmentKey(departmentLabel);
  return departmentAliasMap[departmentKey] || [departmentKey];
};

const getSelectedDepartmentLabel = (selectedDepartments) => {
  if (Array.isArray(selectedDepartments)) {
    return String(selectedDepartments[0] || '').trim();
  }

  return String(selectedDepartments || '').trim();
};

const getNextRoundRobinStartIndex = async (key, length) => {
  if (!length) return 0;

  const state = await AssignmentState.findOneAndUpdate(
    { key },
    {
      $setOnInsert: { key },
      $inc: { counter: 1 },
    },
    { new: true, upsert: true }
  ).lean();

  const counter = typeof state?.counter === 'number' ? state.counter : 1;
  const startCounter = counter - 1;
  return ((startCounter % length) + length) % length;
};

const sortUsersForAssignment = (users) => {
  return users.sort((left, right) => {
    const leftId = String(left.Identity || '');
    const rightId = String(right.Identity || '');
    const byIdentity = leftId.localeCompare(rightId, 'en', { numeric: true, sensitivity: 'base' });
    if (byIdentity !== 0) return byIdentity;
    return String(left._id).localeCompare(String(right._id));
  });
};

const pickSpecialistDoctorForDepartment = async (departmentLabel) => {
  const aliases = getDepartmentAliases(departmentLabel);
  const doctors = await User.find(
    { role: 'doctor' },
    { _id: 1, name: 1, Identity: 1, department: 1 }
  ).lean();

  const eligibleDoctors = sortUsersForAssignment(
    doctors.filter((doctor) => {
      const departmentKey = normalizeDepartment(doctor.department);
      return !GENERAL_DEPARTMENT_KEYS.has(departmentKey) && aliases.includes(departmentKey);
    })
  );

  if (!eligibleDoctors.length) {
    return null;
  }

  const startIndex = await getNextRoundRobinStartIndex(`specialistReferral:${aliases[0]}`, eligibleDoctors.length);
  return eligibleDoctors[startIndex];
};

const pickPgForDoctor = async (doctor) => {
  const pgs = await User.find(
    { role: 'pg', createdBy: doctor._id },
    { _id: 1, name: 1, Identity: 1, department: 1 }
  ).lean();

  const eligiblePgs = sortUsersForAssignment(pgs);
  if (!eligiblePgs.length) {
    return null;
  }

  const startIndex = await getNextRoundRobinStartIndex(`pgReferral:${String(doctor._id)}`, eligiblePgs.length);
  return eligiblePgs[startIndex];
};

const findDoctorByIdentity = async (identity) => {
  const normalizedIdentity = String(identity || '').trim();
  if (!normalizedIdentity) {
    return null;
  }

  return User.findOne(
    { role: 'doctor', Identity: normalizedIdentity },
    { _id: 1, name: 1, Identity: 1, department: 1 }
  ).lean();
};

const findPgByIdentity = async (identity) => {
  const normalizedIdentity = String(identity || '').trim();
  if (!normalizedIdentity) {
    return null;
  }

  return User.findOne(
    { role: 'pg', Identity: normalizedIdentity },
    { _id: 1, name: 1, Identity: 1, department: 1 }
  ).lean();
};

const resolveSpecialistDoctorForCase = async (caseItem, preferredSpecialistDoctor = null) => {
  if (preferredSpecialistDoctor?._id) {
    return preferredSpecialistDoctor;
  }

  const existingDoctor = await findDoctorByIdentity(caseItem?.specialistDoctorId);
  if (existingDoctor?._id) {
    return existingDoctor;
  }

  const referredDepartment = caseItem?.referredDepartment || getSelectedDepartmentLabel(caseItem?.selectedDepartments);
  if (!referredDepartment || isGeneralDepartment(referredDepartment)) {
    return null;
  }

  return pickSpecialistDoctorForDepartment(referredDepartment);
};

const assignReferralToPg = async (caseItem, preferredSpecialistDoctor = null) => {
  const referredDepartment = caseItem?.referredDepartment || getSelectedDepartmentLabel(caseItem?.selectedDepartments);
  if (!referredDepartment || isGeneralDepartment(referredDepartment)) {
    return { specialistDoctor: null, assignedPg: null };
  }

  const specialistDoctor = await resolveSpecialistDoctorForCase(caseItem, preferredSpecialistDoctor);
  if (!specialistDoctor?._id) {
    return { specialistDoctor: null, assignedPg: null };
  }

  let assignedPg = await findPgByIdentity(caseItem?.assignedPgId);
  if (!assignedPg?._id) {
    assignedPg = await pickPgForDoctor(specialistDoctor);
  }

  if (!assignedPg?._id) {
    return { specialistDoctor, assignedPg: null };
  }

  const assignmentTimestamp = new Date();

  caseItem.referredDepartment = referredDepartment;
  caseItem.specialistDoctorId = specialistDoctor.Identity || '';
  caseItem.specialistDoctorName = specialistDoctor.name || '';
  caseItem.specialistAssignedAt = caseItem.specialistAssignedAt || assignmentTimestamp;
  caseItem.specialistStatus = 'approved';
  caseItem.specialistRescheduleReason = '';
  caseItem.specialistReviewedBy = 'System Auto-Transfer';
  caseItem.specialistReviewedAt = assignmentTimestamp;
  caseItem.assignedPgId = assignedPg.Identity || '';
  caseItem.assignedPgName = assignedPg.name || assignedPg.Identity || '';
  caseItem.pgAssignedAt = caseItem.pgAssignedAt || assignmentTimestamp;

  return { specialistDoctor, assignedPg };
};

const autoTransferPendingReferralsToPgQueue = async () => {
  const pendingCases = await GeneralCase.find({
    $and: [
      {
        $or: [
          { specialistStatus: 'pending' },
          { specialistStatus: { $exists: false } },
          { specialistStatus: null },
        ],
      },
      {
        $or: [
          { assignedPgId: { $exists: false } },
          { assignedPgId: '' },
          { assignedPgId: null },
        ],
      },
    ],
  });

  for (const caseItem of pendingCases) {
    const { assignedPg } = await assignReferralToPg(caseItem);
    if (!assignedPg?._id) {
      continue;
    }

    await caseItem.save();
  }
};

const assignLegacySpecialistReferrals = async (departmentLabel) => {
  const unassignedCases = await GeneralCase.find({
    $or: [
      { specialistDoctorId: { $exists: false } },
      { specialistDoctorId: '' },
      { specialistDoctorId: null },
    ],
  });

  for (const caseItem of unassignedCases) {
    const referredDepartment = caseItem.referredDepartment || getSelectedDepartmentLabel(caseItem.selectedDepartments);
    if (!referredDepartment || isGeneralDepartment(referredDepartment)) {
      continue;
    }

    const departmentKey = normalizeLabelToDepartmentKey(referredDepartment);
    const requestedDepartmentKey = normalizeLabelToDepartmentKey(departmentLabel);
    if (departmentKey !== requestedDepartmentKey) {
      continue;
    }

    const specialistDoctor = await pickSpecialistDoctorForDepartment(referredDepartment);
    if (!specialistDoctor) {
      continue;
    }

    caseItem.referredDepartment = caseItem.referredDepartment || referredDepartment;
    caseItem.specialistDoctorId = specialistDoctor.Identity || '';
    caseItem.specialistDoctorName = specialistDoctor.name || '';
    caseItem.specialistAssignedAt = caseItem.specialistAssignedAt || caseItem.createdAt || new Date();
    caseItem.specialistStatus = caseItem.specialistStatus && caseItem.specialistStatus !== 'not-required'
      ? caseItem.specialistStatus
      : 'pending';

    await caseItem.save();
  }
};

// Create / Save a General Case Sheet
router.post('/save', auth, requireRole(['doctor', 'chief', 'pg']), async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      doctorId,
      doctorName,
      chiefComplaint,
      presentIllness,
      pastMedical,
      pastDental,
      personalHistory,
      familyHistory,
      clinicalFindings,
      provisionalDiagnosis,
      investigations,
      finalDiagnosis,
      description,
      generalDescription,
      selectedDepartments,
      treatmentPlan,
      xrayImage,
    } = req.body;

    const requesterRole = normalizeRole(req.user?.role);
    const requesterDepartment = normalizeDepartment(req.user?.department);

    if (requesterRole === 'doctor' && !GENERAL_DEPARTMENT_KEYS.has(requesterDepartment)) {
      return res.status(403).json({
        success: false,
        message: 'Only general doctors can create referral case sheets.'
      });
    }

    if (!patientId || !patientName || !doctorId || !doctorName) {
      return res.status(400).json({
        success: false,
        message: 'Patient and Doctor information are required'
      });
    }

    if (!treatmentPlan) {
      return res.status(400).json({
        success: false,
        message: 'Treatment plan is required to save the General Case Sheet'
      });
    }

    if (!String(chiefComplaint || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Chief complaint is required to save the General Case Sheet'
      });
    }

    if (!Array.isArray(selectedDepartments) || selectedDepartments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select a specialist case sheet department.'
      });
    }

    const referredDepartment = getSelectedDepartmentLabel(selectedDepartments);
    const normalizedXrayImage = String(xrayImage || '').trim();

    if (normalizedXrayImage) {
      if (!XRAY_DATA_URL_PATTERN.test(normalizedXrayImage)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid X-ray image format. Please upload a PNG or JPEG image.'
        });
      }

      if (normalizedXrayImage.length > MAX_XRAY_DATA_URL_LENGTH) {
        return res.status(413).json({
          success: false,
          message: 'X-ray image is too large. Please upload a smaller image.'
        });
      }
    }

    if (!referredDepartment || isGeneralDepartment(referredDepartment)) {
      return res.status(400).json({
        success: false,
        message: 'General is not a referral case-sheet department. Please select a specialist department.'
      });
    }

    let specialistDoctor = null;

    if (referredDepartment) {
      specialistDoctor = await pickSpecialistDoctorForDepartment(referredDepartment);

      if (!specialistDoctor) {
        return res.status(409).json({
          success: false,
          message: `No specialist doctor is available in ${referredDepartment}.`
        });
      }
    }

    const generalCase = new GeneralCase({
      patientId,
      patientName,
      doctorId,
      doctorName,
      generalDoctorId: doctorId,
      generalDoctorName: doctorName,
      chiefComplaint,
      presentIllness,
      pastMedical,
      pastDental,
      personalHistory,
      familyHistory,
      clinicalFindings,
      provisionalDiagnosis,
      investigations,
      finalDiagnosis,
      description,
      generalDescription,
      selectedDepartments,
      treatmentPlan,
      xrayImage: normalizedXrayImage,
      referredDepartment,
      specialistDoctorId: specialistDoctor?.Identity || '',
      specialistDoctorName: specialistDoctor?.name || '',
      specialistAssignedAt: specialistDoctor ? new Date() : null,
      specialistStatus: specialistDoctor ? 'pending' : 'not-required',
      chiefApproval: ''
    });

    const { assignedPg } = await assignReferralToPg(generalCase, specialistDoctor);
    if (!assignedPg?._id) {
      return res.status(409).json({
        success: false,
        message: `No PG is assigned under ${specialistDoctor?.name || referredDepartment}. Assign a PG before saving this referral.`,
      });
    }

    await generalCase.save();

    res.status(201).json({
      success: true,
      message: 'General Case Sheet saved successfully',
      caseId: generalCase._id,
      data: generalCase,
      assignment: specialistDoctor
        ? {
            referredDepartment,
            specialistDoctorId: specialistDoctor.Identity,
            specialistDoctorName: specialistDoctor.name,
            specialistStatus: generalCase.specialistStatus,
            assignedPgId: generalCase.assignedPgId,
            assignedPgName: generalCase.assignedPgName,
          }
        : {
            referredDepartment,
            specialistStatus: 'not-required'
          }
    });
  } catch (error) {
    console.error('Error saving General Case Sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving General Case Sheet',
      error: error.message
    });
  }
});

// Get all General Case Sheets for a patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    const cases = await GeneralCase.find({ patientId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: cases
    });
  } catch (error) {
    console.error('Error fetching General Case Sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching General Case Sheets',
      error: error.message
    });
  }
});

// ── helper: map a doctor's stored department to the canonical name used in
//    GeneralCase.selectedDepartments (matching the UI department list).
const toCaseSheetDeptName = (dept) => {
  const n = String(dept || '').trim().toLowerCase().replace(/[\s_]+/g, '');
  if (n.startsWith('prostho') || n.startsWith('protho') || n.startsWith('prosthon')) return 'Prosthodontics';
  if (n === 'pedodontics') return 'Pedodontics';
  if (n === 'periodontics') return 'Periodontics';
  if (n.includes('conservative') || n.includes('endodontic')) return 'Conservative Dentistry and Endodontics';
  if (n.includes('oral') || n.includes('maxillofacial')) return 'Oral and Maxillofacial';
  if (n === 'general' || n === 'generaldentistry') return 'General';
  return dept;
};

// Get patients referred to the requesting doctor's department from general case sheets
router.get('/referred-patients', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const doctorDepartment = req.user?.department;
    if (!doctorDepartment) {
      return res.status(400).json({ success: false, message: 'Doctor department not set' });
    }

    if (isGeneralDepartment(doctorDepartment)) {
      return res.json({ success: true, data: [] });
    }

    await assignLegacySpecialistReferrals(doctorDepartment);
    await autoTransferPendingReferralsToPgQueue();

    const cases = await GeneralCase.find({ specialistDoctorId: String(req.user?.Identity || '') })
      .sort({ createdAt: -1 })
      .lean();

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

    const dedupedPayloadMap = new Map();

    payload.forEach((item) => {
      const latestCaseId = String(item?.latestCaseId || '').trim();
      const patientId = String(item?.patientId || '').trim();
      const chiefComplaint = String(item?.chiefComplaint || '').trim().toLowerCase();
      const referredDepartment = String(item?.referredDepartment || '').trim().toLowerCase();
      const latestCaseDepartment = String(item?.latestCaseDepartment || '').trim().toLowerCase();
      const pgCaseStatus = String(item?.pgCaseStatus || '').trim().toLowerCase();

      const dedupeKey = latestCaseId
        ? `latest:${latestCaseId}`
        : `meta:${patientId}|${chiefComplaint}|${referredDepartment}|${latestCaseDepartment}|${pgCaseStatus}`;

      const existing = dedupedPayloadMap.get(dedupeKey);
      const existingTime = new Date(existing?.pgAssignedAt || existing?.createdAt || 0).getTime() || 0;
      const currentTime = new Date(item?.pgAssignedAt || item?.createdAt || 0).getTime() || 0;

      if (!existing || currentTime >= existingTime) {
        dedupedPayloadMap.set(dedupeKey, item);
      }
    });

    const dedupedPayload = Array.from(dedupedPayloadMap.values()).sort(
      (left, right) =>
        (new Date(right?.pgAssignedAt || right?.createdAt || 0).getTime() || 0) -
        (new Date(left?.pgAssignedAt || left?.createdAt || 0).getTime() || 0)
    );

    res.json({ success: true, data: dedupedPayload });
  } catch (error) {
    console.error('Error fetching referred patients:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/referred-patients/:id/approve', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const caseItem = await GeneralCase.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Referred case not found' });
    }

    if (String(caseItem.specialistDoctorId || '') !== String(req.user?.Identity || '')) {
      return res.status(403).json({ success: false, message: 'You can only approve cases assigned to you.' });
    }

    if (caseItem.specialistStatus === 'approved' && caseItem.assignedPgId) {
      return res.json({
        success: true,
        message: 'Case already approved and assigned to a PG.',
        data: caseItem,
      });
    }

    const assignedPg = await pickPgForDoctor(req.user);
    if (!assignedPg) {
      return res.status(409).json({
        success: false,
        message: 'No PG is assigned under this doctor. Assign a PG before approving this referral.'
      });
    }

    caseItem.specialistStatus = 'approved';
    caseItem.specialistRescheduleReason = '';
    caseItem.specialistReviewedBy = req.user?.name || 'Doctor';
    caseItem.specialistReviewedAt = new Date();
    caseItem.assignedPgId = assignedPg.Identity || '';
    caseItem.assignedPgName = assignedPg.name || assignedPg.Identity || '';
    caseItem.pgAssignedAt = new Date();

    await caseItem.save();

    res.json({
      success: true,
      message: `Referral approved and assigned to ${assignedPg.name || assignedPg.Identity}.`,
      data: caseItem,
      assignedPg: {
        id: assignedPg.Identity || '',
        name: assignedPg.name || assignedPg.Identity || '',
      },
    });
  } catch (error) {
    console.error('Error approving referred patient:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/referred-patients/:id/reschedule', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { reason = '' } = req.body || {};
    const caseItem = await GeneralCase.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Referred case not found' });
    }

    if (String(caseItem.specialistDoctorId || '') !== String(req.user?.Identity || '')) {
      return res.status(403).json({ success: false, message: 'You can only reschedule cases assigned to you.' });
    }

    caseItem.specialistStatus = 'rescheduled';
    caseItem.specialistRescheduleReason = String(reason || '').trim();
    caseItem.specialistReviewedBy = req.user?.name || 'Doctor';
    caseItem.specialistReviewedAt = new Date();
    caseItem.assignedPgId = '';
    caseItem.assignedPgName = '';
    caseItem.pgAssignedAt = null;

    await caseItem.save();

    res.json({
      success: true,
      message: 'Referral marked as rescheduled.',
      data: caseItem,
    });
  } catch (error) {
    console.error('Error rescheduling referred patient:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/assigned-pg-cases', auth, requireRole(['pg']), async (req, res) => {
  try {
    const pgIdentity = String(req.user?.Identity || '').trim();

    await autoTransferPendingReferralsToPgQueue();

    const cases = await GeneralCase.find({
      assignedPgId: pgIdentity,
      specialistStatus: 'approved',
    })
      .sort({ pgAssignedAt: -1, createdAt: -1 })
      .lean();

    if (!cases.length) {
      return res.json({ success: true, data: [] });
    }

    const patientIds = Array.from(
      new Set(
        cases
          .map((caseItem) => String(caseItem.patientId || '').trim())
          .filter(Boolean)
      )
    );

    const appointments = await Appointment.find(
      {
        patientId: { $in: patientIds },
        status: { $ne: 'cancelled' },
      },
      {
        patientId: 1,
        appointmentDate: 1,
        appointmentTime: 1,
        createdAt: 1,
      }
    )
      .sort({ appointmentDate: -1, createdAt: -1 })
      .lean();

    const latestAppointmentByPatientId = new Map();
    appointments.forEach((appt) => {
      const patientId = String(appt?.patientId || '').trim();
      if (!patientId || latestAppointmentByPatientId.has(patientId)) return;
      latestAppointmentByPatientId.set(patientId, {
        appointmentDate: String(appt?.appointmentDate || '').trim(),
        appointmentTime: String(appt?.appointmentTime || '').trim(),
      });
    });

    const pedodonticsModule = await import('../models/PedodonticsCase.js');
    const completeDentureModule = await import('../models/CompleteDentureCase.js');
    const fpdModule = await import('../models/Fpd-model.js');
    const implantModule = await import('../models/Implant-model.js');
    const implantPatientModule = await import('../models/ImplantPatient-model.js');
    const partialModule = await import('../models/partial-model.js');

    const PedodonticsCase = pedodonticsModule.default;
    const CompleteDentureCase = completeDentureModule.default;
    const FPD = fpdModule.default;
    const Implant = implantModule.default;
    const ImplantPatient = implantPatientModule.default;
    const PartialDenture = partialModule.default;

    const caseSources = [
      { model: PedodonticsCase, department: 'Pedodontics', bucket: 'pedodontics' },
      { model: CompleteDentureCase, department: 'Complete Denture', bucket: 'prosthodontics' },
      { model: FPD, department: 'FPD', bucket: 'prosthodontics' },
      { model: Implant, department: 'Implant', bucket: 'prosthodontics' },
      { model: ImplantPatient, department: 'Implant Patient Surgery', bucket: 'prosthodontics' },
      { model: PartialDenture, department: 'Partial Denture', bucket: 'prosthodontics' },
    ];

    const departmentCases = (
      await Promise.all(
        caseSources.map(async ({ model, department, bucket }) => {
          try {
            const modelCases = await model.find(
              {
                doctorId: pgIdentity,
                patientId: { $in: patientIds },
              },
              {
                _id: 1,
                patientId: 1,
                chiefApproval: 1,
                createdAt: 1,
              }
            ).lean();

            return modelCases.map((item) => ({
              caseId: String(item._id),
              patientId: String(item.patientId || '').trim(),
              chiefApproval: String(item.chiefApproval || ''),
              createdAt: item.createdAt,
              caseDepartment: department,
              caseBucket: bucket,
            }));
          } catch (error) {
            console.error(`Error fetching ${department} cases for PG assigned list:`, error.message || error);
            return [];
          }
        })
      )
    ).flat();

    const casesByPatient = new Map();
    departmentCases.forEach((caseItem) => {
      if (!casesByPatient.has(caseItem.patientId)) {
        casesByPatient.set(caseItem.patientId, []);
      }
      casesByPatient.get(caseItem.patientId).push(caseItem);
    });

    casesByPatient.forEach((caseList) => {
      caseList.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    });

    const payload = cases.map((caseItem) => ({
      ...(() => {
        const patientId = String(caseItem.patientId || '').trim();
        const preferredBucket = getDepartmentBucket(
          caseItem.referredDepartment || caseItem.selectedDepartments?.[0] || ''
        );

        const patientCases = casesByPatient.get(patientId) || [];
        const preferredCases = preferredBucket === 'all'
          ? patientCases
          : patientCases.filter((item) => item.caseBucket === preferredBucket);

        const latestCase = preferredCases[0] || patientCases[0] || null;
        const approvalText = String(latestCase?.chiefApproval || '').trim();
        const approvalLower = approvalText.toLowerCase();
        const resendReason = extractResendReason(approvalText);

        let pgCaseStatus = 'pending';
        if (!latestCase) {
          pgCaseStatus = 'assigned';
        } else if (approvalLower === 'approved' || approvalLower.includes('approved')) {
          pgCaseStatus = 'approved';
        } else if (resendReason) {
          pgCaseStatus = 'resent';
        }

        return {
          pgCaseStatus,
          resendReason,
          chiefApproval: approvalText,
          latestCaseId: latestCase?.caseId || '',
          latestCaseDepartment: latestCase?.caseDepartment || '',
          appointmentDate: latestAppointmentByPatientId.get(patientId)?.appointmentDate || '',
          appointmentTime: latestAppointmentByPatientId.get(patientId)?.appointmentTime || '',
        };
      })(),
      _id: caseItem._id,
      patientId: caseItem.patientId,
      patientName: caseItem.patientName,
      chiefComplaint: caseItem.chiefComplaint || '',
      presentIllness: caseItem.presentIllness || '',
      pastMedical: caseItem.pastMedical || '',
      clinicalFindings: caseItem.clinicalFindings || '',
      provisionalDiagnosis: caseItem.provisionalDiagnosis || '',
      finalDiagnosis: caseItem.finalDiagnosis || '',
      treatmentPlan: caseItem.treatmentPlan || '',
      generalDescription: caseItem.generalDescription || '',
      selectedDepartments: Array.isArray(caseItem.selectedDepartments) ? caseItem.selectedDepartments : [],
      referredDepartment: caseItem.referredDepartment || caseItem.selectedDepartments?.[0] || '',
      generalDoctorId: caseItem.generalDoctorId || caseItem.doctorId || '',
      generalDoctorName: caseItem.generalDoctorName || caseItem.doctorName || '',
      specialistDoctorId: caseItem.specialistDoctorId || '',
      specialistDoctorName: caseItem.specialistDoctorName || '',
      assignedPgId: caseItem.assignedPgId || '',
      assignedPgName: caseItem.assignedPgName || '',
      pgAssignedAt: caseItem.pgAssignedAt || caseItem.specialistReviewedAt || caseItem.createdAt,
    }));

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error fetching assigned PG cases:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PG: Approve an assigned referral case
router.patch('/pg-cases/:id/approve', auth, requireRole(['pg']), async (req, res) => {
  try {
    const caseItem = await GeneralCase.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (String(caseItem.assignedPgId || '') !== String(req.user?.Identity || '')) {
      return res.status(403).json({ success: false, message: 'You can only approve cases assigned to you.' });
    }

    caseItem.specialistStatus = 'approved';
    caseItem.specialistRescheduleReason = '';
    caseItem.specialistReviewedBy = req.user?.name || 'PG';
    caseItem.specialistReviewedAt = new Date();

    await caseItem.save();
    res.json({ success: true, message: 'Referral approved.', data: caseItem });
  } catch (error) {
    console.error('Error approving PG case:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PG: Reschedule an assigned referral case
router.patch('/pg-cases/:id/reschedule', auth, requireRole(['pg']), async (req, res) => {
  try {
    const { reason = '' } = req.body || {};
    const caseItem = await GeneralCase.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (String(caseItem.assignedPgId || '') !== String(req.user?.Identity || '')) {
      return res.status(403).json({ success: false, message: 'You can only reschedule cases assigned to you.' });
    }

    caseItem.specialistStatus = 'rescheduled';
    caseItem.specialistRescheduleReason = String(reason || '').trim();
    caseItem.specialistReviewedBy = req.user?.name || 'PG';
    caseItem.specialistReviewedAt = new Date();
    caseItem.assignedPgId = '';
    caseItem.assignedPgName = '';
    caseItem.pgAssignedAt = null;

    await caseItem.save();
    res.json({ success: true, message: 'Referral marked as rescheduled.', data: caseItem });
  } catch (error) {
    console.error('Error rescheduling PG case:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a specific General Case Sheet by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const caseData = await GeneralCase.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'General Case Sheet not found'
      });
    }

    res.json({
      success: true,
      data: caseData
    });
  } catch (error) {
    console.error('Error fetching General Case Sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching General Case Sheet',
      error: error.message
    });
  }
});

export default router;
