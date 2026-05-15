// server/routes/general-case.js - General Case Sheet Routes
import express from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import GeneralCase from '../models/GeneralCase.js';
import Appointment from '../models/AppoitmentBooked.js';
import { User } from '../models/User.js';
import AssignmentState from '../models/AssignmentState.js';
import {
  normalizeDepartment,
  normalizeRole,
  XRAY_DATA_URL_PATTERN,
  MAX_XRAY_DATA_URL_LENGTH,
  getDepartmentAliases,
  getSelectedDepartmentLabel,
  pickSpecialistDoctorForDepartment,
  pickPgForDoctor,
  resolveSpecialistDoctorForCase,
  assignReferralToPg,
  isGeneralDepartment,
  normalizeLabelToDepartmentKey,
} from '../utils/departmentAssignment.js';
import { saveGeneralCase, ServiceError } from '../services/caseService.js';

const router = express.Router();


// helpers imported from server/utils/departmentAssignment.js

// assignReferralToPg is provided by server/utils/departmentAssignment.js

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
    const result = await saveGeneralCase({ Model: GeneralCase, payload: req.body, user: req.user });
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error?.httpStatus && error?.payload) {
      return res.status(error.httpStatus).json(error.payload);
    }
    console.error('Error saving General Case Sheet:', error);
    res.status(500).json({ success: false, message: 'Server error while saving General Case Sheet', error: error.message });
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
