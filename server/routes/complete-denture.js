// server/routes/completeDenture.js
import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import CompleteDentureCase from '../models/CompleteDentureCase.js';
import { User } from '../models/User.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { hasChiefDepartmentAccess, chiefDepartmentAccessDenied } from '../utils/chiefDepartmentAccess.js';
import multer from 'multer';

dotenv.config();
const router = express.Router();

// ============================================
// Email Configuration
// ============================================
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
  if (!transporter) {
    console.log('⚠️ Email transporter not configured');
    return;
  }
  try {
    console.log('📨 Attempting to send email to:', to);
    const result = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to,
      subject,
      html,
    });
    console.log('✅ Email sent successfully:', result.response);
    return result;
  } catch (err) {
    console.error('❌ Email error:', err.message);
  }
};

// ============================================
// Multer Configuration for File Uploads
// ============================================
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

// ============================================
// Helper Function to Parse Array Fields
// ============================================
const parseArrayField = (field) => {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      return field.split(',').map((item) => item.trim());
    }
  }
  return field;
};

// ============================================
// SAVE CASE
// ============================================
router.post('/save', auth, requireRole(['doctor','chief','pg']), upload.single('digitalSignature'), async (req, res) => {
  try {
    const arrayFields = [
      'medicalHistory', 'mentalAttitude', 'habits', 'toothLossReason',
      'facialProfile', 'facialForm', 'mandibleDeviationOpening',
      'mandibleDeviationOpeningDirection', 'mandibleDeviationClosingDirection',
      'lipLine', 'muscleTone', 'hardPalateArch', 'hardPalateShape',
      'softPalateForm', 'palateSensitivity', 'lateralThroatForm',
      'palatalThroatForm', 'tongueSize', 'tonguePosition', 'tongueMobility',
      'maxillaAttachedGingival', 'mandibleAttachedGingival',
      'maxillaSoftTissueRidge', 'mandibleSoftTissueRidge',
      'maxillaMucosaCondition', 'mandibleMucosaCondition',
      'maxillaAntRidgeForm', 'maxillaPostRidgeForm',
      'mandibleAntRidgeForm', 'mandiblePostRidgeForm',
      'ridgeContour', 'ridgeRelation', 'ridgeParallelism',
      'salivaQuantity', 'salivaConsistency'
    ];

    const processedBody = { ...req.body };
    arrayFields.forEach((field) => {
      if (req.body[field]) processedBody[field] = parseArrayField(req.body[field]);
    });

    const {
      patientId, patientName, doctorId, doctorName,
      // ... other non-array fields can be destructured here if needed
    } = processedBody;

    if (!patientId || !patientName || !doctorId || !doctorName) {
      return res.status(400).json({ success: false, message: 'Patient and Doctor information required' });
    }

    let digitalSignature = null;
    if (req.file) {
      digitalSignature = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        fileName: req.file.originalname,
      };
    }

    const completeDentureCase = new CompleteDentureCase({
      ...processedBody,
      digitalSignature,
      chiefApproval: "",
    });

    await completeDentureCase.save();

    res.status(201).json({ 
      success: true, 
      message: 'Case sheet saved successfully', 
      caseId: completeDentureCase._id 
    });
  } catch (error) {
    console.error('Error saving complete denture case:', error);
    res.status(500).json({ success: false, message: 'Server error while saving case sheet' });
  }
});

// ============================================
// GET CASES FOR A PATIENT
// ============================================
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const cases = await CompleteDentureCase.find({ patientId })
      .select('-digitalSignature')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching patient cases:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching cases' });
  }
});

// ============================================
// GET CASE BY ID
// ============================================
router.get('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await CompleteDentureCase.findById(caseId).select('-digitalSignature');

    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });

    if (req.user.role === 'patient' && caseData.patientId !== req.user.Identity) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: caseData });
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching case' });
  }
});

// ============================================
// GET DIGITAL SIGNATURE
// ============================================
router.get('/:caseId/signature', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await CompleteDentureCase.findById(caseId).select('digitalSignature patientId');

    if (!caseData || !caseData.digitalSignature) return res.status(404).json({ success: false, message: 'Signature not found' });

    if (req.user.role === 'patient' && caseData.patientId !== req.user.Identity) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.set('Content-Type', caseData.digitalSignature.contentType);
    res.send(caseData.digitalSignature.data);
  } catch (error) {
    console.error('Error fetching signature:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching signature' });
  }
});

// ============================================
// UPDATE CASE
// ============================================
router.patch('/:caseId', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const updates = req.body;

    const caseData = await CompleteDentureCase.findById(caseId);
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });

    if (req.user.role === 'doctor' && caseData.doctorId !== req.user.Identity) {
      return res.status(403).json({ success: false, message: 'You can only update your own cases' });
    }

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) caseData[key] = updates[key];
    });

    await caseData.save();
    res.json({ success: true, message: 'Case updated successfully', data: caseData });
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ success: false, message: 'Server error while updating case' });
  }
});

// ============================================
// DELETE CASE
// ============================================
router.delete('/:caseId', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await CompleteDentureCase.findById(caseId);
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });

    if (req.user.role === 'doctor' && caseData.doctorId !== req.user.Identity) {
      return res.status(403).json({ success: false, message: 'You can only delete your own cases' });
    }

    await CompleteDentureCase.findByIdAndDelete(caseId);
    res.json({ success: true, message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting case' });
  }
});

// ============================================
// CHIEF APPROVAL
// ============================================
router.patch('/:caseId/approve', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { chiefApproval, approvedBy } = req.body;

    if (!chiefApproval) return res.status(400).json({ success: false, message: 'Approval status is required' });

    const caseData = await CompleteDentureCase.findById(caseId);
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });

    caseData.chiefApproval = chiefApproval;
    caseData.approvedBy = approvedBy || req.user.name;
    caseData.approvedAt = new Date();

    await caseData.save();
    
    // Send email to doctor
    try {
      console.log('🔍 Looking for doctor with Identity:', caseData.doctorId);
      const doctor = await User.findOne({ Identity: caseData.doctorId });
      console.log('👨‍⚕️ Doctor found:', doctor);
      
      if (doctor && doctor.email) {
        console.log('📧 Sending email to:', doctor.email);
        const isApproved = chiefApproval.toLowerCase() === 'approved';
        const subject = isApproved ? 'Case Approved by Chief Doctor' : 'Case Requires Redo';
        
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>${isApproved ? '✅ Case Approved' : '🔄 Case Requires Redo'}</h2>
            <p>Dear Dr. ${caseData.doctorName},</p>
            <p>Your case has been reviewed by the Chief Doctor.</p>
            <ul>
              <li><b>Department:</b> Complete Denture</li>
              <li><b>Patient ID:</b> ${caseData.patientId || 'N/A'}</li>
              <li><b>Patient Name:</b> ${caseData.patientName || 'N/A'}</li>
              <li><b>Status:</b> ${isApproved ? 'Approved' : 'Redo Required'}</li>
              ${!isApproved ? `<li><b>Reason:</b> ${chiefApproval.replace('Redo: ', '')}</li>` : ''}
              <li><b>Reviewed By:</b> ${approvedBy}</li>
              <li><b>Date:</b> ${new Date().toLocaleDateString()}</li>
            </ul>
            ${!isApproved ? '<p>Please review and resubmit the case sheet with necessary corrections.</p>' : ''}
            <p>Thank you,<br/><b>SRM Dental College</b></p>
          </div>
        `;
        
        const emailResult = await sendEmail(doctor.email, subject, html);
        console.log('✅ Email sent successfully to', doctor.email);
      } else {
        console.log('⚠️ Doctor not found or no email address');
      }
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
    }
    
    res.json({ success: true, message: `Case ${chiefApproval === 'approved' || chiefApproval.toLowerCase() === 'approved' ? 'approved' : 'marked for redo'} successfully`, data: caseData });
  } catch (error) {
    console.error('Error updating case approval:', error);
    res.status(500).json({ success: false, message: 'Server error while updating case approval' });
  }
});

// ============================================
// GET ALL CASES FOR CHIEF
// ============================================
router.get('/chief/all-cases', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    if (!hasChiefDepartmentAccess(req.user, ['prosthodontics', 'completedenture'])) {
      return chiefDepartmentAccessDenied(res);
    }

    const cases = await CompleteDentureCase.find({}).select('-digitalSignature').sort({ createdAt: -1 });
    res.json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching all cases:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching cases' });
  }
});

// ============================================
// GET PENDING CASES FOR CHIEF
// ============================================
router.get('/chief/pending', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const cases = await CompleteDentureCase.find({ $or: [{ chiefApproval: "" }, { chiefApproval: { $exists: false } }] })
      .select('-digitalSignature')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching pending cases:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching pending cases' });
  }
});

export default router;
