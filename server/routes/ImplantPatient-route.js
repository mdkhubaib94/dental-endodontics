import express from "express";
import ImplantPatientCase from "../models/ImplantPatient-model.js";
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { hasChiefDepartmentAccess, chiefDepartmentAccessDenied } from '../utils/chiefDepartmentAccess.js';
import multer from 'multer';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { User } from "../models/User.js";

const router = express.Router();

dotenv.config();

// Email configuration for Implant Patient chief approval / redo
let transporter = null;
if (process.env.MAIL_USER && process.env.MAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });
}

const sendEmail = async (to, subject, html) => {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Implant patient email error:', err);
  }
};

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image uploads are supported'), false);
    }
  }
});

const fileToDataUri = (file) => {
  if (!file) return null;
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
};

// ============================================
// ROUTES - Specific routes MUST come before generic ones
// ============================================

/* =========================
   SAVE WITH AUTH & FILE UPLOAD
========================= */
router.post(
  '/save',
  auth,
  requireRole(['doctor','chief','chief-doctor','pg']),
  upload.fields([
    { name: 'digitalSignature', maxCount: 1 },
    { name: 'mouthOpening', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const data = req.body;

      console.log('[ImplantPatient SAVE] Received data:', {
        patientId: data.patientId || 'MISSING',
        patientName: data.patientName || 'MISSING',
        doctorId: data.doctorId || 'MISSING',
        doctorName: data.doctorName || 'MISSING',
        allBodyKeys: Object.keys(data).slice(0, 10).join(', ')
      });

      const files = req.files || {};
      const digitalSigFile = files.digitalSignature?.[0];
      const mouthOpeningFile = files.mouthOpening?.[0];

      const digitalSignature = fileToDataUri(digitalSigFile);
      const mouthOpeningImage = fileToDataUri(mouthOpeningFile);

      const transformedData = transformFormData(data);
      transformedData.digitalSignature = digitalSignature;
      transformedData.mouthOpeningImage = mouthOpeningImage;
      transformedData.chiefApproval = "";
      transformedData.patientId = data.patientId || req.user?.Identity || '';
      transformedData.doctorId = data.doctorId || req.user?.Identity || '';
      transformedData.doctorName = data.doctorName || '';
      transformedData.patientName = data.patientName || '';
      transformedData.createdBy = req.user?.Identity || data.doctorId || 'system';

      console.log('[ImplantPatient SAVE] Transformed data:', {
        patientId: transformedData.patientId,
        patientName: transformedData.patientName,
        doctorId: transformedData.doctorId,
        doctorName: transformedData.doctorName
      });

      const newCase = new ImplantPatientCase(transformedData);
      await newCase.save();

      console.log('[ImplantPatient SAVE] Case saved successfully:', {
        _id: newCase._id,
        patientName: newCase.patientName,
        patientId: newCase.patientId,
        doctorName: newCase.doctorName
      });

      res.status(201).json({
        success: true,
        message: "Implant patient case saved successfully",
        data: newCase,
        caseId: newCase._id
      });
    } catch (error) {
      console.error("Error saving implant patient case:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save implant patient case",
        error: error.message
      });
    }
  }
);

/* =========================
   GET ALL CASES FOR CHIEF REVIEW
========================= */
router.get('/chief/all-cases', auth, requireRole(['doctor','chief','chief-doctor']), async (req, res) => {
  try {
    if (!hasChiefDepartmentAccess(req.user, ['prosthodontics', 'implantology', 'implant', 'implantpatient'])) {
      return chiefDepartmentAccessDenied(res);
    }

    const cases = await ImplantPatientCase.find()
      .select('-digitalSignature -mouthOpeningImage')
      .sort({ createdAt: -1 })
      .lean();
    
    // Enrich cases with fallback values for missing patient data
    const enrichedCases = cases.map(c => {
      const enriched = {
        ...c,
        patientName: c.patientName || c.patientId || 'Unknown Patient',
        patientId: c.patientId || 'Unknown ID',
        doctorName: c.doctorName || c.doctorId || 'Unknown Doctor',
        doctorId: c.doctorId || 'Unknown'
      };
      return enriched;
    });
    
    console.log('[ImplantPatient] Cases fetched:', cases.length);
    if (enrichedCases.length > 0) {
      console.log('[ImplantPatient] First 3 cases:', enrichedCases.slice(0, 3).map(c => ({
        _id: c._id,
        patientName: c.patientName,
        patientId: c.patientId,
        doctorName: c.doctorName,
        hasPatientName: !!cases[enrichedCases.indexOf(c)].patientName,
        hasPatientId: !!cases[enrichedCases.indexOf(c)].patientId
      })));
    }
    
    res.json({ success: true, data: enrichedCases });
  } catch (error) {
    console.error('Error fetching all cases:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching cases' });
  }
});

/* =========================
   GET CASES FOR A PATIENT
========================= */
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const cases = await ImplantPatientCase.find({ patientId })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching patient cases:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching cases' });
  }
});

/* =========================
   GET CASE BY ID (ALIAS)
========================= */
router.get('/get/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await ImplantPatientCase.findById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    res.json({ success: true, data: caseData });
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching case' });
  }
});

/* =========================
   SEARCH IMPLANT CASES
========================= */
router.get("/search/:query", async (req, res) => {
  try {
    const query = req.params.query;
    
    const cases = await ImplantPatientCase.find({
      $or: [
        { patientName: { $regex: query, $options: 'i' } },
        { opdNo: { $regex: query, $options: 'i' } },
        { diagnosis: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: cases.length,
      data: cases
    });
  } catch (error) {
    console.error("Error searching implant cases:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search implant cases",
      error: error.message
    });
  }
});

/* =========================
   CREATE IMPLANT CASE
========================= */
router.post("/implant", async (req, res) => {
  try {
    const data = req.body;
    
    // Transform form data to match model structure
    const transformedData = transformFormData(data);
    
    const newCase = new ImplantPatientCase(transformedData);
    await newCase.save();

    res.status(201).json({
      success: true,
      message: "Implant case saved successfully",
      data: newCase,
      caseId: newCase._id
    });
  } catch (error) {
    console.error("Error saving implant case:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save implant case",
      error: error.message
    });
  }
});

/* =========================
   GET ALL IMPLANT CASES
========================= */
router.get("/implant", async (req, res) => {
  try {
    const { status, patientName, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (patientName) filter.patientName = { $regex: patientName, $options: 'i' };
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const cases = await ImplantPatientCase.find(filter)
      .sort(sortOptions)
      .select('-__v');
    
    res.json({
      success: true,
      count: cases.length,
      data: cases
    });
  } catch (error) {
    console.error("Error fetching implant cases:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch implant cases",
      error: error.message
    });
  }
});

/* =========================
   GET SINGLE IMPLANT CASE
========================= */
router.get("/implant/:id", async (req, res) => {
  try {
    const caseId = req.params.id;
    
    const implantCase = await ImplantPatientCase.findById(caseId);
    
    if (!implantCase) {
      return res.status(404).json({
        success: false,
        message: "Implant case not found"
      });
    }
    
    res.json({
      success: true,
      data: implantCase
    });
  } catch (error) {
    console.error("Error fetching implant case:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch implant case",
      error: error.message
    });
  }
});

/* =========================
   UPDATE IMPLANT CASE
========================= */
router.put("/implant/:id", async (req, res) => {
  try {
    const caseId = req.params.id;
    const updates = req.body;
    
    const implantCase = await ImplantPatientCase.findByIdAndUpdate(
      caseId,
      { 
        ...updates,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!implantCase) {
      return res.status(404).json({
        success: false,
        message: "Implant case not found"
      });
    }
    
    res.json({
      success: true,
      message: "Implant case updated successfully",
      data: implantCase
    });
  } catch (error) {
    console.error("Error updating implant case:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update implant case",
      error: error.message
    });
  }
});

/* =========================
   DELETE IMPLANT CASE
========================= */
router.delete("/implant/:id", async (req, res) => {
  try {
    const caseId = req.params.id;
    
    const implantCase = await ImplantPatientCase.findByIdAndDelete(caseId);
    
    if (!implantCase) {
      return res.status(404).json({
        success: false,
        message: "Implant case not found"
      });
    }
    
    res.json({
      success: true,
      message: "Implant case deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting implant case:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete implant case",
      error: error.message
    });
  }
});

/* =========================
   UPDATE CASE STATUS
========================= */
router.patch("/implant/:id/status", async (req, res) => {
  try {
    const caseId = req.params.id;
    const { status } = req.body;
    
    const validStatuses = ['draft', 'submitted', 'in-progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }
    
    const implantCase = await ImplantPatientCase.findByIdAndUpdate(
      caseId,
      { 
        status,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!implantCase) {
      return res.status(404).json({
        success: false,
        message: "Implant case not found"
      });
    }
    
    res.json({
      success: true,
      message: `Case status updated to ${status}`,
      data: implantCase
    });
  } catch (error) {
    console.error("Error updating case status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update case status",
      error: error.message
    });
  }
});

/* =========================
   GET CASE BY ID
========================= */
router.get('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await ImplantPatientCase.findById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    res.json({ success: true, data: caseData });
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching case' });
  }
});

/* =========================
   APPROVE OR REQUEST REDO
========================= */
router.patch('/:caseId/approve', auth, requireRole(['doctor','chief','chief-doctor']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { chiefApproval, approvedBy } = req.body;
    
    const caseData = await ImplantPatientCase.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    caseData.chiefApproval = chiefApproval;
    caseData.approvedBy = approvedBy;
    caseData.approvedAt = new Date();
    await caseData.save();

    // Send email notification to the doctor who created the case
    try {
      const doctor = await User.findOne({ Identity: caseData.doctorId });
      if (doctor && doctor.email) {
        const statusText = (chiefApproval || '').toLowerCase();
        const isApproved = statusText === 'approved';
        const subject = isApproved
          ? 'Case Approved by Chief Doctor'
          : 'Case Requires Redo';

        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>${isApproved ? '✅ Case Approved' : '🔄 Case Requires Redo'}</h2>
            <p>Dear Dr. ${caseData.doctorName || caseData.doctorId || 'Doctor'},</p>
            <p>Your case has been reviewed by the Chief Doctor.</p>
            <ul>
              <li><b>Department:</b> Implant Patient</li>
              <li><b>Patient ID:</b> ${caseData.patientId || 'N/A'}</li>
              <li><b>Patient Name:</b> ${caseData.patientName || 'N/A'}</li>
              <li><b>Status:</b> ${isApproved ? 'Approved' : 'Redo Required'}</li>
              ${!isApproved ? `<li><b>Reason:</b> ${(chiefApproval || '').replace('Redo: ', '')}</li>` : ''}
              <li><b>Reviewed By:</b> ${caseData.approvedBy || approvedBy || 'Chief Doctor'}</li>
              <li><b>Date:</b> ${new Date().toLocaleDateString()}</li>
            </ul>
            ${!isApproved ? '<p>Please review and resubmit the case sheet with the necessary corrections.</p>' : ''}
            <p>Thank you,<br/><b>SRM Dental College</b></p>
          </div>
        `;

        await sendEmail(doctor.email, subject, html);
      }
    } catch (emailError) {
      console.error('Error sending Implant Patient approval email:', emailError);
    }
    
    res.json({ success: true, message: 'Case approval status updated successfully', data: caseData });
  } catch (error) {
    console.error('Error updating case approval:', error);
    res.status(500).json({ success: false, message: 'Server error while updating approval' });
  }
});

/* =========================
   UPDATE CASE APPROVAL
========================= */
router.patch('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const updates = req.body;
    
    const caseData = await ImplantPatientCase.findByIdAndUpdate(
      caseId,
      {
        ...updates,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!caseData) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    res.json({ success: true, message: 'Case updated successfully', data: caseData });
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ success: false, message: 'Server error while updating case' });
  }
});

/* =========================
   DELETE CASE
========================= */
router.delete('/:caseId', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const caseData = await ImplantPatientCase.findByIdAndDelete(caseId);
    
    if (!caseData) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    res.json({ success: true, message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting case' });
  }
});

const toBool = (value) => value === true || value === 'true' || value === 'on' || value === '1' || value === 1;
const toNumber = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};
const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

/* =========================
   HELPER FUNCTION: Transform form data
========================= */
function transformFormData(formData) {
  const kennedyInput = toList(formData.kennedy);
  const hasKennedy = (marker) =>
    kennedyInput.some((v) => v.toUpperCase().replace('CLASS', '').replace(' ', '') === marker.toUpperCase()) ||
    toBool(formData[`kennedyClass${marker}`]);

  return {
    // Patient Details
    patientName: formData.patientName || '',
    patientId: formData.patientId || '',
    doctorId: formData.doctorId || '',
    doctorName: formData.doctorName || '',
    age: formData.age || null,
    gender: formData.gender || '',
    opdNo: formData.opdNo || '',
    date: formData.date || new Date().toISOString().split('T')[0],
    
    // Oral/Peri-Oral Examination
    faceShape: formData.faceShape || '',
    profile: formData.profile || '',
    lipSupport: formData.lipSupport || '',
    philtrum: formData.philtrum || '',
    nasolabialSulcus: formData.nasolabialSulcus || '',
    edentulism: formData.edentulism || '',
    kennedyClass: {
      classI: hasKennedy('I'),
      classII: hasKennedy('II'),
      classIII: hasKennedy('III'),
      classIV: hasKennedy('IV')
    },
    
    // Intraoral and Extraoral Examination
    gingiva: formData.gingiva || '',
    mucosa: formData.mucosa || '',
    tongue: formData.tongue || '',
    floorOfMouth: formData.floorOfMouth || '',
    salivaryGlands: formData.salivaryGlands || '',
    tonsils: formData.tonsils || '',
    palate: formData.palate || '',
    lineaAlba: {
      present: toBool(formData.lineaAlba),
      notes: formData.lineaNotes || ''
    },
    existingRestoration: {
      restorationType: formData.restoration || '',
      otherDetails: formData.restOther || ''
    },
    
    // Necks and Nodes
    inflammation: formData.inflammation || '',
    nodeEnlargement: formData.nodeEnlargement || '',
    tenderness: formData.tenderness || '',
    nodeOtherFindings: formData.nodeOther || '',
    
    // Periodontal Assessment
    oralHygieneStatus: formData.oralHygiene || '',
    calculus: formData.calculus || '',
    plaque: formData.plaque || '',
    stains: formData.stains || '',
    mobilityTeeth: formData.mobilityTeeth || '',
    mobilityGrade: formData.mobilityGrade || '',
    pockets: toNumber(formData.pockets),
    recession: toNumber(formData.recession),
    periodontalTenderness: formData.periodontalTenderness || '',
    periodontalOtherFindings: formData.periodontalOther || '',
    
    // Occlusal Assessment
    archRelationship: formData.archRelationship || '',
    overjet: toNumber(formData.overjet),
    overbite: toNumber(formData.overbite),
    crossbite: formData.crossbite || '',
    midlineShift: toNumber(formData.midlineShift),
    premucosal: {
      labial: toBool(formData.premucosalLabial),
      lingual: toBool(formData.premucosalLingual),
      buccal: toBool(formData.premucosalBuccal),
      onCrest: toBool(formData.premucosalOncrest)
    },
    tissueSupport: {
      firmness: formData.firmness || '',
      contour: formData.supportContour || '',
      undercutsPresent: toBool(formData.undercuts),
      otherFindings: formData.supportOther || ''
    },
    
    // Radiographic Assessment
    boneLoss: formData.boneLoss || '',
    implantSiteAssessment: formData.implantSite || '',
    periapicalStatus: formData.periapical || '',
    pathology: formData.pathology || '',
    uneruptedTeeth: formData.uneruptedTeeth || '',
    undercut: {
      present: toBool(formData.undercutCheckbox),
      description: formData.undercutDesc || ''
    },
    availableBoneWidth: toNumber(formData.boneWidth),
    availableBoneHeight: toNumber(formData.boneHeight),
    
    // Esthetic Analysis
    smileLine: formData.smileLine || '',
    highLipLine: formData.highLipLine || '',
    lowLipLine: formData.lowLipLine || '',
    archForm: formData.archForm || '',
    
    // Prosthetic Space Analysis
    interArchSpace: toNumber(formData.interArchSpace),
    ridgeRelationship: formData.ridgeRelation || '',
    occlusalPlane: formData.occlusalPlane || '',
    directionOfForce: formData.forceDirection || '',
    opposingArch: {
      softTissueSupport: toBool(formData.opposingArchSoftTissue),
      fixedProsthesis: toBool(formData.opposingArchFixed),
      naturalDentition: toBool(formData.opposingArchNatural)
    },
    tongueSize: formData.tongueSize || '',
    
    // Dental Status Evaluation
    cariesStatus: formData.cariesStatus || '',
    restorationStatus: formData.restorationStatus || '',
    endodonticStatus: formData.endodontic || '',
    periodontalStatus: formData.periodontal || '',
    softTissueEvaluation: formData.softTissue || '',
    rootConfiguration: formData.rootConfig || '',
    toothPosition: formData.toothPosition || '',
    crownHeight: formData.crownHeight || '',
    
    // Bone Evaluation
    boneQuality: formData.boneQuality || '',
    boneVolume: formData.boneVolume || '',
    boneDensity: formData.boneDensity || '',
    boneHeight: toNumber(formData.boneHeightEval),
    boneWidth: toNumber(formData.boneWidthEval),
    ctScanFindings: formData.boneCt || '',
    otherBoneFindings: formData.boneOthers || '',
    
    // Prognosis Assessment
    oralComfortPotential: formData.comfort || '',
    oralFunctionPotential: formData.function || '',
    oralEstheticPotential: formData.esthetic || '',
    psychologicalStatus: formData.psych || '',
    patientExpectation: formData.expectation || '',
    
    // Treatment Plan
    diagnosticImpression: formData.diagnosticImpression || '',
    studyModelAnalysis: formData.studyModelAnalysis || '',
    waxUp: formData.waxUp || '',
    surgicalGuide: formData.surgicalGuide || '',
    prosthesisType: formData.prosthesisType || '',
    fixed: formData.fixed || '',
    removable: formData.removable || '',
    overdenture: formData.overdenture || '',
    hybrid: formData.hybrid || '',
    materialUsed: {
      ceramicPFM: toBool(formData.materialCeramicPFM),
      allCeramic: toBool(formData.materialAllCeramic)
    },
    
    // Follow-Up Plan
    followUpSequence: formData.followUpSequence || '',
    clinical: formData.clinical || '',
    radiographic: formData.radiographic || '',
    osseointegrationStatus: formData.osseointegration || '',
    subjectiveAnalysis: formData.subjective || '',
    otherFactors: formData.otherFactors || '',
    
    // Status
    status: formData.status || 'draft',
    createdBy: formData.createdBy || 'system'
  };
}

export default router;