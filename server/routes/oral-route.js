import express from 'express';
import OralCase from '../models/Oral-model.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';

const router = express.Router();

/**
 * Normalise the raw request body from OralMedicine.jsx into the exact
 * field names the Mongoose model expects.
 *
 * The form sends short aliases (cns, cvs, missingTeeth, sex …) while the
 * model also accepts the canonical names.  We store BOTH so old and new
 * documents are always readable.
 */
const normalisePayload = (body) => {
  const b = { ...body };

  // sex → gender (required enum)
  if (!b.gender && b.sex) b.gender = b.sex;

  // Short review-of-systems aliases → canonical names (stored in both)
  if (b.cns)              b.centralNervousSystem      = b.cns;
  if (b.cvs)              b.cardioVascularSystem       = b.cvs;
  if (b.respiratory)      b.respiratorySystem          = b.respiratory;
  if (b.gastrointestinal) b.gastroIntestinalSystem     = b.gastrointestinal;
  if (b.genitoUrinary)    b.genitoUrinarySystem        = b.genitoUrinary;
  if (b.skeletal)         b.skeletalSystem             = b.skeletal;

  // missingTeeth → missing (stored in both)
  if (b.missingTeeth)     b.missing = b.missingTeeth;

  // Flatten investigation checkboxes into legacy free-text fields so the
  // OralMedicineView can display them regardless of which format was saved.
  const invMap = [
    ['invHematological',    'invHematologicalNotes',     'hematological'],
    ['invUrine',            'invUrineNotes',              'urine'],
    ['invBiochemical',      'invBiochemicalNotes',        'bioChemical'],
    ['invSerological',      'invSerologicalNotes',        'serological'],
    ['invCytological',      'invCytologicalNotes',        'cytological'],
    ['invMicrobiological',  'invMicrobiologicalNotes',    'microbiological'],
    ['invSpecial',          'invSpecialNotes',            'specialInvestigations'],
    ['invRadiological',     'invRadiologicalNotes',       'radiological'],
    ['invBiopsy',           'invBiopsyNotes',             'biopsy'],
    ['invHistopathological','invHistopathologicalNotes',  'histopathologicalExamination'],
    ['invOthers',           'invOthersNotes',             'otherInvestigations'],
  ];

  invMap.forEach(([boolKey, notesKey, legacyKey]) => {
    if (b[boolKey]) {
      // If checked and has notes, mirror into legacy field
      b[legacyKey] = b[notesKey] || 'Yes';
    }
  });

  // Ensure age is a number
  if (b.age !== undefined) b.age = Number(b.age) || 0;

  return b;
};

// ── CREATE ────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const payload = normalisePayload(req.body);
    const oralCase = new OralCase(payload);
    await oralCase.save();
    res.status(201).json({
      success: true,
      message: 'Oral case created successfully',
      data: oralCase,
      caseId: oralCase._id,
    });
  } catch (error) {
    console.error('Error creating oral case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create oral case',
      error: error.message,
    });
  }
});

// ── GET ALL FOR DOCTOR ────────────────────────────────────────────────────
router.get('/doctor/:doctorId', auth, async (req, res) => {
  try {
    const cases = await OralCase.find({ doctorId: req.params.doctorId })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching oral cases:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch oral cases', error: error.message });
  }
});

// ── GET ALL FOR CHIEF ─────────────────────────────────────────────────────
router.get('/chief/all-cases', auth, requireRole('chief_doctor'), async (req, res) => {
  try {
    const cases = await OralCase.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching all oral cases:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch oral cases', error: error.message });
  }
});

// ── GET BY PATIENT ID ─────────────────────────────────────────────────────
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const cases = await OralCase.find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching patient oral cases:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patient oral cases', error: error.message });
  }
});

// ── GET BY CASE ID ────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const oralCase = await OralCase.findById(req.params.id);
    if (!oralCase) {
      return res.status(404).json({ success: false, message: 'Oral case not found' });
    }
    res.status(200).json({ success: true, data: oralCase });
  } catch (error) {
    console.error('Error fetching oral case:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch oral case', error: error.message });
  }
});

// ── UPDATE ────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const payload = normalisePayload(req.body);
    const updatedCase = await OralCase.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );
    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Oral case not found' });
    }
    res.status(200).json({ success: true, message: 'Oral case updated successfully', data: updatedCase });
  } catch (error) {
    console.error('Error updating oral case:', error);
    res.status(500).json({ success: false, message: 'Failed to update oral case', error: error.message });
  }
});

// ── APPROVE / REJECT (CHIEF DOCTOR) ──────────────────────────────────────
router.patch('/:id/approve', auth, requireRole('chief_doctor'), async (req, res) => {
  try {
    const { chiefApproval, approvedBy, approvedAt } = req.body;
    const updatedCase = await OralCase.findByIdAndUpdate(
      req.params.id,
      { chiefApproval, approvedBy, approvedAt: approvedAt || new Date() },
      { new: true }
    );
    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Oral case not found' });
    }
    res.status(200).json({ success: true, message: 'Oral case approval status updated', data: updatedCase });
  } catch (error) {
    console.error('Error approving oral case:', error);
    res.status(500).json({ success: false, message: 'Failed to update approval status', error: error.message });
  }
});

// ── DELETE ────────────────────────────────────────────────────────────────
router.delete('/:id', auth, requireRole(['chief_doctor', 'doctor']), async (req, res) => {
  try {
    const deletedCase = await OralCase.findByIdAndDelete(req.params.id);
    if (!deletedCase) {
      return res.status(404).json({ success: false, message: 'Oral case not found' });
    }
    res.status(200).json({ success: true, message: 'Oral case deleted successfully' });
  } catch (error) {
    console.error('Error deleting oral case:', error);
    res.status(500).json({ success: false, message: 'Failed to delete oral case', error: error.message });
  }
});

export default router;
