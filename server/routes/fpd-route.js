import express from 'express';
const router = express.Router();
import Fpd from '../models/Fpd-model.js'; // Adjust path as needed

// Middleware for authentication (customize based on your auth system)
import authenticate from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { hasChiefDepartmentAccess, chiefDepartmentAccessDenied } from '../utils/chiefDepartmentAccess.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

// Email configuration for FPD chief approval / redo
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
    console.error('FPD email error:', err);
  }
};

// ============================================
// ROUTES - Specific routes MUST come before generic ones
// ============================================

// @route   GET /api/fpd/chief/all-cases
// @desc    Get all FPD case sheets for chief review
// @access  Private (Chief Doctor)
router.get('/chief/all-cases', authenticate, requireRole(['doctor','chief']), async (req, res) => {
  try {
    if (!hasChiefDepartmentAccess(req.user, ['prosthodontics', 'fpd', 'fixedpartialdenture'])) {
      return chiefDepartmentAccessDenied(res);
    }

    const fpds = await Fpd.find()
      .select('-digitalSignature')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: fpds,
      count: fpds.length
    });
  } catch (error) {
    console.error('Error fetching all FPD cases for chief:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching FPD case sheets',
      error: error.message
    });
  }
});

// @route   GET /api/fpd/patient/:patientId
// @desc    Get all FPD case sheets for a specific patient
// @access  Private
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const fpds = await Fpd.find({ patientId: req.params.patientId })
      .select('-digitalSignature')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: fpds,
      count: fpds.length
    });
  } catch (error) {
    console.error('Error fetching patient FPD case sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient FPD case sheets',
      error: error.message
    });
  }
});

// @route   GET /api/fpd/get/:id
// @desc    Get a specific FPD case sheet by ID (alias for compatibility)
// @access  Private
router.get('/get/:id', authenticate, async (req, res) => {
  try {
    console.log('FPD GET /get/:id - Fetching case ID:', req.params.id);
    
    const fpd = await Fpd.findById(req.params.id);

    if (!fpd) {
      console.log('FPD GET /get/:id - Case not found in database');
      return res.status(404).json({
        success: false,
        message: 'FPD case sheet not found'
      });
    }

    console.log('FPD GET /get/:id - Case found:', fpd._id);
    
    res.json({
      success: true,
      data: fpd
    });
  } catch (error) {
    console.error('Error fetching FPD case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching FPD case sheet',
      error: error.message
    });
  }
});

// @route   POST /api/fpd
// @desc    Create a new FPD case sheet
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, patientName, doctorId, doctorName } = req.body;

    console.log('FPD POST - Received data:', { patientId, patientName, doctorId, doctorName });

    // Validate required fields
    if (!patientId || !patientName || !doctorId || !doctorName) {
      console.error('FPD POST - Missing required fields:', { patientId, patientName, doctorId, doctorName });
      return res.status(400).json({
        success: false,
        message: 'Patient and Doctor information required'
      });
    }

    const fpdData = {
      ...req.body,
      createdBy: req.user.id, // Assuming req.user is set by authenticate middleware
    };

    const fpd = new Fpd(fpdData);
    await fpd.save();

    console.log('FPD case saved successfully:', fpd._id);

    res.status(201).json({
      success: true,
      message: 'FPD case sheet created successfully',
      data: fpd,
      caseId: fpd._id
    });
  } catch (error) {
    console.error('Error creating FPD case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating FPD case sheet',
      error: error.message
    });
  }
});

// @route   GET /api/fpd
// @desc    Get all FPD case sheets
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { patientId, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (patientId) {
      query.patientId = patientId;
    }

    const fpds = await Fpd.find(query)
      .populate('patientId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Fpd.countDocuments(query);

    res.json({
      success: true,
      data: fpds,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Error fetching FPD case sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching FPD case sheets',
      error: error.message
    });
  }
});

// @route   GET /api/fpd/:id
// @desc    Get a specific FPD case sheet by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    console.log('FPD GET /:id - Fetching case ID:', req.params.id);
    
    const fpd = await Fpd.findById(req.params.id);

    if (!fpd) {
      console.log('FPD GET /:id - Case not found in database');
      return res.status(404).json({
        success: false,
        message: 'FPD case sheet not found'
      });
    }

    console.log('FPD GET /:id - Case found:', fpd._id);
    
    res.json({
      success: true,
      data: fpd
    });
  } catch (error) {
    console.error('Error fetching FPD case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching FPD case sheet',
      error: error.message
    });
  }
});

// @route   PATCH /api/fpd/:id/approve
// @desc    Approve or request redo for an FPD case sheet
// @access  Private (Chief Doctor)
router.patch('/:id/approve', authenticate, requireRole(['chief','chief-doctor','doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { chiefApproval, approvedBy } = req.body;

    const caseData = await Fpd.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'FPD case sheet not found'
      });
    }

    caseData.chiefApproval = chiefApproval || 'Pending';
    caseData.approvedBy = approvedBy || req.user?.name || '';
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
              <li><b>Department:</b> FPD</li>
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
      console.error('Error sending FPD approval email:', emailError);
    }

    res.json({
      success: true,
      message: 'FPD case sheet approval updated',
      data: caseData
    });
  } catch (error) {
    console.error('Error approving FPD case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating FPD case sheet approval',
      error: error.message
    });
  }
});

// @route   PUT /api/fpd/:id
// @desc    Update an FPD case sheet
// @access  Private
router.put('/:id', authenticate, async (req, res) => {
  try {
    const fpd = await Fpd.findById(req.params.id);

    if (!fpd) {
      return res.status(404).json({
        success: false,
        message: 'FPD case sheet not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'createdBy' && key !== 'createdAt') {
        fpd[key] = req.body[key];
      }
    });

    fpd.updatedAt = Date.now();
    await fpd.save();

    res.json({
      success: true,
      message: 'FPD case sheet updated successfully',
      data: fpd
    });
  } catch (error) {
    console.error('Error updating FPD case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating FPD case sheet',
      error: error.message
    });
  }
});

// @route   PATCH /api/fpd/:id
// @desc    Partially update an FPD case sheet
// @access  Private
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const fpd = await Fpd.findByIdAndUpdate(
      req.params.id,
      { 
        $set: req.body,
        updatedAt: Date.now()
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!fpd) {
      return res.status(404).json({
        success: false,
        message: 'FPD case sheet not found'
      });
    }

    res.json({
      success: true,
      message: 'FPD case sheet updated successfully',
      data: fpd
    });
  } catch (error) {
    console.error('Error updating FPD case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating FPD case sheet',
      error: error.message
    });
  }
});

// @route   DELETE /api/fpd/:id
// @desc    Delete an FPD case sheet
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const fpd = await Fpd.findById(req.params.id);

    if (!fpd) {
      return res.status(404).json({
        success: false,
        message: 'FPD case sheet not found'
      });
    }

    await fpd.deleteOne();

    res.json({
      success: true,
      message: 'FPD case sheet deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting FPD case sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting FPD case sheet',
      error: error.message
    });
  }
});

// @route   POST /api/fpd/:id/procedure
// @desc    Add a treatment procedure to an FPD case sheet
// @access  Private
router.post('/:id/procedure', authenticate, async (req, res) => {
  try {
    const fpd = await Fpd.findById(req.params.id);

    if (!fpd) {
      return res.status(404).json({
        success: false,
        message: 'FPD case sheet not found'
      });
    }

    fpd.treatmentProcedures.push(req.body);
    fpd.updatedAt = Date.now();
    await fpd.save();

    res.json({
      success: true,
      message: 'Treatment procedure added successfully',
      data: fpd
    });
  } catch (error) {
    console.error('Error adding treatment procedure:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding treatment procedure',
      error: error.message
    });
  }
});

export default router;