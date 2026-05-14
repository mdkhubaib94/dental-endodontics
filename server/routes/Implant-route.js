// routes/Implant-route.js - Implant Case Routes
import express from 'express';
import ImplantCase from '../models/Implant-model.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { hasChiefDepartmentAccess, chiefDepartmentAccessDenied } from '../utils/chiefDepartmentAccess.js';
import multer from 'multer';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

const router = express.Router();

dotenv.config();

// Email configuration for Implant chief approval / redo
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
    console.error('Implant email error:', err);
  }
};

// ============================================
// Multer Configuration for File Uploads
// ============================================
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ============================================
// ROUTES - Specific routes MUST come before generic ones
// ============================================

/**
 * @route   POST /api/implant/save
 * @desc    Save a new Implant case sheet (with file upload support)
 * @access  Private (Doctor, Chief)
 */
router.post('/save', auth, requireRole(['doctor','chief','pg']), upload.single('digitalSignature'), async (req, res) => {
  try {
    const { patientId, patientName, doctorId, doctorName } = req.body;

    console.log('Implant POST /save - Received data:', { patientId, patientName, doctorId, doctorName, hasFile: !!req.file });

    // Validate required fields
    if (!patientId || !patientName || !doctorId || !doctorName) {
      console.error('Implant POST /save - Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Patient and Doctor information required' 
      });
    }

    // Handle digital signature file
    let digitalSignature = null;
    if (req.file) {
      digitalSignature = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        fileName: req.file.originalname
      };
    }

    // Create new case sheet
    const implant = new ImplantCase({
      ...req.body,
      digitalSignature,
      chiefApproval: "" // Initialize as empty for pending approval
    });

    await implant.save();
    
    console.log('Implant case saved successfully:', implant._id);
    
    res.status(201).json({ 
      success: true, 
      message: 'Implant case sheet saved successfully', 
      caseId: implant._id,
      data: implant
    });
  } catch (error) {
    console.error('Error saving Implant case:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while saving case sheet',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/implant/chief/all-cases
 * @desc    Get all Implant case sheets for chief review
 * @access  Private (Chief Doctor)
 */
router.get('/chief/all-cases', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    if (!hasChiefDepartmentAccess(req.user, ['prosthodontics', 'implantology', 'implant'])) {
      return chiefDepartmentAccessDenied(res);
    }

    const implants = await ImplantCase.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: implants,
      count: implants.length
    });
  } catch (error) {
    console.error('Error fetching all Implant cases for chief:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Implant case sheets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/implant/patient/:patientId
 * @desc    Get all Implant case sheets for a specific patient
 * @access  Private
 */
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const implants = await ImplantCase.find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: implants,
      count: implants.length
    });
  } catch (error) {
    console.error('Error fetching patient Implant case sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient Implant case sheets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/implant/get/:id
 * @desc    Get a specific Implant case sheet by ID (alias for compatibility)
 * @access  Private
 */
router.get('/get/:id', auth, async (req, res) => {
  try {
    console.log('Implant GET /get/:id - Fetching case ID:', req.params.id);
    
    const implant = await ImplantCase.findById(req.params.id);

    if (!implant) {
      console.log('Implant GET /get/:id - Case not found in database');
      return res.status(404).json({
        success: false,
        message: 'Implant case sheet not found'
      });
    }

    console.log('Implant GET /get/:id - Case found:', implant._id);
    
    res.json({
      success: true,
      data: implant
    });
  } catch (error) {
    console.error('Error fetching Implant case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Implant case sheet',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/implant
 * @desc    Create a new Implant case sheet
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { patientId, patientName, doctorId, doctorName } = req.body;

    console.log('Implant POST - Received data:', { patientId, patientName, doctorId, doctorName });

    // Validate required fields
    if (!patientId || !patientName || !doctorId || !doctorName) {
      console.error('Implant POST - Missing required fields:', { patientId, patientName, doctorId, doctorName });
      return res.status(400).json({
        success: false,
        message: 'Patient and Doctor information required'
      });
    }

    const implantData = {
      ...req.body,
      createdBy: req.user.id, // Assuming req.user is set by authenticate middleware
    };

    const implant = new ImplantCase(implantData);
    await implant.save();

    console.log('Implant case saved successfully:', implant._id);

    res.status(201).json({
      success: true,
      message: 'Implant case sheet created successfully',
      data: implant,
      caseId: implant._id
    });
  } catch (error) {
    console.error('Error creating Implant case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating Implant case sheet',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/implant/:id
 * @desc    Get a specific Implant case sheet by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Implant GET /:id - Fetching case ID:', req.params.id);
    
    const implant = await ImplantCase.findById(req.params.id);

    if (!implant) {
      console.log('Implant GET /:id - Case not found in database');
      return res.status(404).json({
        success: false,
        message: 'Implant case sheet not found'
      });
    }

    console.log('Implant GET /:id - Case found:', implant._id);
    
    res.json({
      success: true,
      data: implant
    });
  } catch (error) {
    console.error('Error fetching Implant case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Implant case sheet',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/implant/:id/signature
 * @desc    Get digital signature image for an Implant case
 * @access  Private
 */
router.get('/:id/signature', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const implant = await ImplantCase.findById(id).select('digitalSignature patientId');

    if (!implant || !implant.digitalSignature) {
      return res.status(404).json({
        success: false,
        message: 'Signature not found'
      });
    }

    // Patients can only see their own case signatures
    if (req.user.role === 'patient' && implant.patientId && implant.patientId !== req.user.Identity) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const sig = implant.digitalSignature;

    // Support both { data, contentType } objects and raw buffers/strings
    if (sig && sig.data && sig.contentType) {
      res.set('Content-Type', sig.contentType);
      return res.send(sig.data);
    }

    // If stored as a base64 string/data URI, redirect client to use it directly
    if (typeof sig === 'string') {
      // For data URLs, just send it back as JSON; frontend will treat as src
      return res.json({ success: true, dataUrl: sig });
    }

    return res.status(415).json({
      success: false,
      message: 'Unsupported signature format'
    });
  } catch (error) {
    console.error('Error fetching Implant signature:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Implant signature',
      error: error.message
    });
  }
});

/**
 * @route   PATCH /api/implant/:id/approve
 * @desc    Approve or request redo for an Implant case sheet
 * @access  Private (Chief Doctor)
 */
router.patch('/:id/approve', auth, requireRole(['chief','chief-doctor','doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { chiefApproval, approvedBy, remarks } = req.body;
    
    const implant = await ImplantCase.findById(id);
    
    if (!implant) {
      return res.status(404).json({
        success: false,
        message: 'Implant case sheet not found'
      });
    }
    
    // Update approval status
    implant.chiefApproval = chiefApproval || 'pending';
    implant.approvedBy = approvedBy || '';
    implant.approvalRemarks = remarks || '';
    implant.approvalDate = new Date();
    
    await implant.save();

    // Send email notification to the doctor who created the case
    try {
      const doctor = await User.findOne({ Identity: implant.doctorId });
      if (doctor && doctor.email) {
        const statusText = (chiefApproval || '').toLowerCase();
        const isApproved = statusText === 'approved';
        const subject = isApproved
          ? 'Case Approved by Chief Doctor'
          : 'Case Requires Redo';

        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>${isApproved ? '✅ Case Approved' : '🔄 Case Requires Redo'}</h2>
            <p>Dear Dr. ${implant.doctorName || implant.doctorId || 'Doctor'},</p>
            <p>Your case has been reviewed by the Chief Doctor.</p>
            <ul>
              <li><b>Department:</b> Implant</li>
              <li><b>Patient ID:</b> ${implant.patientId || 'N/A'}</li>
              <li><b>Patient Name:</b> ${implant.patientName || 'N/A'}</li>
              <li><b>Status:</b> ${isApproved ? 'Approved' : 'Redo Required'}</li>
              ${!isApproved ? `<li><b>Reason:</b> ${(chiefApproval || '').replace('Redo: ', '')}</li>` : ''}
              <li><b>Reviewed By:</b> ${implant.approvedBy || approvedBy || 'Chief Doctor'}</li>
              <li><b>Date:</b> ${new Date().toLocaleDateString()}</li>
            </ul>
            ${!isApproved ? '<p>Please review and resubmit the case sheet with the necessary corrections.</p>' : ''}
            <p>Thank you,<br/><b>SRM Dental College</b></p>
          </div>
        `;

        await sendEmail(doctor.email, subject, html);
      }
    } catch (emailError) {
      console.error('Error sending Implant approval email:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Implant case sheet approval updated',
      data: implant
    });
  } catch (error) {
    console.error('Error approving Implant case:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating case approval',
      error: error.message
    });
  }
});

/**
 * @route   PATCH /api/implant/:id
 * @desc    Update an Implant case sheet
 * @access  Private
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const implant = await ImplantCase.findById(req.params.id);

    if (!implant) {
      return res.status(404).json({
        success: false,
        message: 'Implant case sheet not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'createdBy' && key !== 'createdAt') {
        implant[key] = req.body[key];
      }
    });

    implant.updatedAt = Date.now();
    await implant.save();

    res.json({
      success: true,
      message: 'Implant case sheet updated successfully',
      data: implant
    });
  } catch (error) {
    console.error('Error updating Implant case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating Implant case sheet',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/implant/:id
 * @desc    Delete an Implant case sheet
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const implant = await ImplantCase.findById(req.params.id);

    if (!implant) {
      return res.status(404).json({
        success: false,
        message: 'Implant case sheet not found'
      });
    }

    await implant.deleteOne();

    res.json({
      success: true,
      message: 'Implant case sheet deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Implant case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting Implant case sheet',
      error: error.message
    });
  }
});

export default router;