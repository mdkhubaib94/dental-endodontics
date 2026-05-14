import express from "express";
import PartialDentureCase from "../models/partial-model.js";
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { hasChiefDepartmentAccess, chiefDepartmentAccessDenied } from '../utils/chiefDepartmentAccess.js';
import multer from 'multer';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

const router = express.Router();

dotenv.config();

// Email configuration for Partial Denture chief approval / redo
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
    console.error('Partial denture email error:', err);
  }
};

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ============================================
// ROUTES - Specific routes MUST come before generic ones
// ============================================

/* =========================
   SAVE PARTIAL CASE WITH AUTH
========================= */
router.post('/save', auth, requireRole(['doctor','chief','chief-doctor','pg']), upload.single('digitalSignature'), async (req, res) => {
  try {
    const { patientId, patientName, doctorId, doctorName } = req.body;

    console.log('[Partial SAVE] Received data:', {
      patientId: patientId || 'MISSING',
      patientName: patientName || 'MISSING',
      doctorId: doctorId || 'MISSING',
      doctorName: doctorName || 'MISSING',
      allBodyKeys: Object.keys(req.body).join(', ')
    });

    if (!patientId || !patientName || !doctorId || !doctorName) {
      console.error('[Partial SAVE] Validation failed - missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Patient and Doctor information required' 
      });
    }

    let digitalSignature = null;
    if (req.file) {
      digitalSignature = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const newCase = new PartialDentureCase({
      ...req.body,
      digitalSignature,
      chiefApproval: ""
    });
    await newCase.save();

    console.log('[Partial SAVE] Case saved successfully:', {
      _id: newCase._id,
      patientName: newCase.patientName,
      patientId: newCase.patientId,
      doctorName: newCase.doctorName
    });

    res.status(201).json({
      success: true,
      message: 'Partial case sheet saved successfully',
      caseId: newCase._id,
      data: newCase
    });
  } catch (error) {
    console.error('Error saving Partial case:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving case sheet',
      error: error.message
    });
  }
});

/* =========================
   GET ALL CASES FOR CHIEF REVIEW
========================= */
router.get('/chief/all-cases', auth, requireRole(['doctor','chief','chief-doctor']), async (req, res) => {
  try {
    if (!hasChiefDepartmentAccess(req.user, ['prosthodontics', 'partialdenture', 'partial'])) {
      return chiefDepartmentAccessDenied(res);
    }

    const cases = await PartialDentureCase.find()
      .select('-digitalSignature')
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
    
    console.log('[Partial] Cases fetched:', cases.length);
    if (enrichedCases.length > 0) {
      console.log('[Partial] First 3 cases:', enrichedCases.slice(0, 3).map(c => ({
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
    const cases = await PartialDentureCase.find({ patientId })
      .select('-digitalSignature')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: cases });
  } catch (error) {
    console.error('Error fetching patient cases:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching cases' });
  }
});

/* =========================
   GET PARTIAL CASE BY ID (ALIAS)
========================= */
router.get('/get/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await PartialDentureCase.findById(caseId);
    
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
   CREATE PARTIAL CASE SHEET (no-auth fallback)
   NOTE: this route is mounted at /api/partial, so use POST /api/partial
========================= */
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    const newCase = new PartialDentureCase(data);
    await newCase.save();

    res.status(201).json({
      success: true,
      message: "Partial denture case saved",
      data: newCase,
      caseId: newCase._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/* =========================
   GET ALL PARTIAL CASES
========================= */
router.get("/partial", async (req, res) => {
  try {
    const cases = await PartialDentureCase.find().sort({ createdAt: -1 });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   GET PARTIAL CASE BY ID
========================= */
router.get('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await PartialDentureCase.findById(caseId);
    
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
    
    const caseData = await PartialDentureCase.findById(caseId);
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
              <li><b>Department:</b> Partial Denture</li>
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
      console.error('Error sending Partial Denture approval email:', emailError);
    }

    res.json({ success: true, message: 'Case approval status updated successfully', data: caseData });
  } catch (error) {
    console.error('Error updating case approval:', error);
    res.status(500).json({ success: false, message: 'Server error while updating approval' });
  }
});

/* =========================
   DELETE CASE
========================= */
router.delete('/:caseId', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await PartialDentureCase.findById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    await PartialDentureCase.findByIdAndDelete(caseId);
    res.json({ success: true, message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting case' });
  }
});

export default router;
