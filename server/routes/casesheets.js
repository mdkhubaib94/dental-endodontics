import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';

// Import models
import PedodonticsCase from '../models/PedodonticsCase.js';
import CompleteDentureCase from '../models/CompleteDentureCase.js';
import Fpd from '../models/Fpd-model.js';
import Implant from '../models/Implant-model.js';
import ImplantPatientCase from '../models/ImplantPatient-model.js';
import PartialDentureCase from '../models/partial-model.js';
import GeneralCase from '../models/GeneralCase.js';

const router = express.Router();

const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '');

const doctorDepartmentCaseScope = {
  pedodontics: ['pedodontics'],
  prosthodontics: ['complete_denture', 'fpd', 'implant', 'implant_patient', 'partial_denture'],
  prothodontics: ['complete_denture', 'fpd', 'implant', 'implant_patient', 'partial_denture'],
  prosthondontics: ['complete_denture', 'fpd', 'implant', 'implant_patient', 'partial_denture'],
  completedenture: ['complete_denture'],
  fixedpartialdenture: ['fpd'],
  fpd: ['fpd'],
  implantology: ['implant', 'implant_patient'],
  implant: ['implant'],
  implantpatient: ['implant_patient'],
  partialdenture: ['partial_denture'],
  partial: ['partial_denture'],
  general: []
};

const canDoctorAccessDepartment = (user, caseDepartmentKey) => {
  if (normalizeRole(user?.role) !== 'doctor') return true;
  const dept = normalizeDepartment(user?.department);
  const allowed = doctorDepartmentCaseScope[dept] || [];
  return allowed.includes(caseDepartmentKey);
};

const isRedoOrResendApproval = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return false;
  return raw.startsWith('redo') || raw.startsWith('resend') || raw.startsWith('rejected');
};

const applySafeUpdates = (targetDoc, updates) => {
  const reservedKeys = new Set([
    '_id',
    'id',
    '__v',
    'doctorId',
    'doctorName',
    'patientId',
    'patientName',
    'createdAt',
    'createdBy',
    'approvedBy',
    'approvedAt',
    'chiefApproval',
    'updatedAt',
  ]);

  Object.entries(updates || {}).forEach(([key, val]) => {
    if (reservedKeys.has(key)) return;
    if (val === undefined) return;
    targetDoc[key] = val;
  });
};

// GET /api/casesheets/pg/history
// GET /api/casesheets/pg/history
// Returns completed case sheets created by the logged-in PG/UG across departments
router.get('/pg/history', auth, requireRole(['pg', 'ug']), async (req, res) => {
  try {
    const pgIdentity = String(req.user?.Identity || '').trim();
    if (!pgIdentity) {
      return res.status(400).json({ success: false, message: 'PG/UG identity missing' });
    }

    const projections = {
      patientId: 1,
      patientName: 1,
      doctorId: 1,
      doctorName: 1,
      chiefApproval: 1,
      approvedBy: 1,
      approvedAt: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    const sources = [
      { model: PedodonticsCase, department: 'Pedodontics', departmentKey: 'pedodontics' },
      { model: CompleteDentureCase, department: 'Complete Denture', departmentKey: 'complete_denture' },
      { model: Fpd, department: 'FPD', departmentKey: 'fpd' },
      { model: Implant, department: 'Implant', departmentKey: 'implant' },
      { model: ImplantPatientCase, department: 'Implant Patient Surgery', departmentKey: 'implant_patient' },
      { model: PartialDentureCase, department: 'Partial Denture', departmentKey: 'partial_denture' },
      {
        model: GeneralCase,
        department: 'General Case',
        departmentKey: 'general',
        query: { $or: [{ doctorId: pgIdentity }, { assignedPgId: pgIdentity }] },
      },
    ];

    const results = await Promise.all(
      sources.map(async ({ model, department, departmentKey, query }) => {
        try {
          const rows = await model
            .find(query || { doctorId: pgIdentity }, projections)
            .sort({ createdAt: -1 })
            .lean();

          return (Array.isArray(rows) ? rows : []).map((row) => ({
            caseId: String(row?._id || ''),
            department,
            departmentKey,
            patientId: String(row?.patientId || '').trim(),
            patientName: String(row?.patientName || '').trim(),
            doctorId: String(row?.doctorId || '').trim(),
            doctorName: String(row?.doctorName || '').trim(),
            chiefApproval: String(row?.chiefApproval || ''),
            approvedBy: String(row?.approvedBy || ''),
            approvedAt: row?.approvedAt || null,
            createdAt: row?.createdAt || null,
            updatedAt: row?.updatedAt || null,
          }));
        } catch (error) {
          console.error(`Error fetching PG history for ${departmentKey}:`, error);
          return [];
        }
      })
    );

    const merged = results.flat().filter((row) => row.caseId);
    merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return res.json({ success: true, data: merged });
  } catch (error) {
    console.error('Error fetching PG casesheet history:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/casesheets/:caseId
// Searches known case collections for the given ID and returns the case and department
router.get('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid case id' });
    }

    // Try pedodontics
    let doc = await PedodonticsCase.findById(caseId);
    if (doc) {
      if (!canDoctorAccessDepartment(req.user, 'pedodontics')) {
        return res.status(403).json({ success: false, message: 'Access denied for this department' });
      }
      return res.json({ success: true, data: doc, department: 'pedodontics' });
    }

    // Try complete denture
    doc = await CompleteDentureCase.findById(caseId);
    if (doc) {
      if (!canDoctorAccessDepartment(req.user, 'complete_denture')) {
        return res.status(403).json({ success: false, message: 'Access denied for this department' });
      }
      return res.json({ success: true, data: doc, department: 'complete_denture' });
    }

    // Try fpd
    doc = await Fpd.findById(caseId);
    if (doc) {
      if (!canDoctorAccessDepartment(req.user, 'fpd')) {
        return res.status(403).json({ success: false, message: 'Access denied for this department' });
      }
      return res.json({ success: true, data: doc, department: 'fpd' });
    }

    // Try implant
    doc = await Implant.findById(caseId);
    if (doc) {
      if (!canDoctorAccessDepartment(req.user, 'implant')) {
        return res.status(403).json({ success: false, message: 'Access denied for this department' });
      }
      return res.json({ success: true, data: doc, department: 'implant' });
    }

    // Try implant patient
    doc = await ImplantPatientCase.findById(caseId);
    if (doc) {
      if (!canDoctorAccessDepartment(req.user, 'implant_patient')) {
        return res.status(403).json({ success: false, message: 'Access denied for this department' });
      }
      return res.json({ success: true, data: doc, department: 'implant_patient' });
    }

    // Try partial denture
    doc = await PartialDentureCase.findById(caseId);
    if (doc) {
      if (!canDoctorAccessDepartment(req.user, 'partial_denture')) {
        return res.status(403).json({ success: false, message: 'Access denied for this department' });
      }
      return res.json({ success: true, data: doc, department: 'partial_denture' });
    }

    // Try general case
    doc = await GeneralCase.findById(caseId);
    if (doc) {
      return res.json({ success: true, data: doc, department: 'general' });
    }

    return res.status(404).json({ success: false, message: 'Case not found' });
  } catch (error) {
    console.error('Error searching casesheets:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/casesheets/:caseId
// Allows a PG to update a case sheet ONLY when it is marked as redo/resend.
// The case must belong to that PG (stored in doctorId), and after update the approval is reset.
router.put('/:caseId', auth, requireRole(['pg']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const pgIdentity = String(req.user?.Identity || '').trim();

    if (!pgIdentity) {
      return res.status(400).json({ success: false, message: 'PG identity missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid case id' });
    }

    const sources = [
      { model: PedodonticsCase, departmentKey: 'pedodontics' },
      { model: CompleteDentureCase, departmentKey: 'complete_denture' },
      { model: Fpd, departmentKey: 'fpd' },
      { model: Implant, departmentKey: 'implant' },
      { model: ImplantPatientCase, departmentKey: 'implant_patient' },
      { model: PartialDentureCase, departmentKey: 'partial_denture' },
    ];

    let found = null;
    for (const source of sources) {
      const doc = await source.model.findById(caseId);
      if (doc) {
        found = { doc, departmentKey: source.departmentKey };
        break;
      }
    }

    if (!found?.doc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const caseDoc = found.doc;

    // PG can only edit their own cases
    if (String(caseDoc.doctorId || '').trim() !== pgIdentity) {
      return res.status(403).json({ success: false, message: 'You can only edit your own case sheets' });
    }

    // Only allow editing when doctor requested redo/resend
    if (!isRedoOrResendApproval(caseDoc.chiefApproval)) {
      return res.status(400).json({
        success: false,
        message: 'This case is not marked for redo. Editing is allowed only for redo cases.',
      });
    }

    applySafeUpdates(caseDoc, req.body);

    // Reset approval status after resubmission
    caseDoc.chiefApproval = '';
    caseDoc.approvedBy = '';
    caseDoc.approvedAt = null;
    caseDoc.updatedAt = new Date();

    await caseDoc.save();

    return res.json({
      success: true,
      message: 'Case sheet updated and resubmitted successfully.',
      data: caseDoc,
      department: found.departmentKey,
    });
  } catch (error) {
    console.error('Error updating casesheet (PG redo edit):', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
