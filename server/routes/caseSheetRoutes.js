// server/routes/pedodontics.js
import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import PedodonticsCase from '../models/PedodonticsCase.js';
import { User } from '../models/User.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { hasChiefDepartmentAccess, chiefDepartmentAccessDenied } from '../utils/chiefDepartmentAccess.js';
import multer from 'multer';

dotenv.config();
const router = express.Router();

// Email Configuration
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
    console.error('Email error:', err);
  }
};

// Configure multer for file uploads (digital signature)
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

const parseArrayField = (field) => {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      return field.split(',').map(item => item.trim());
    }
  }
  return field;
};
// Save pedodontics case sheet - Only doctors can access
router.post('/save', auth, requireRole(['doctor','chief','pg']), upload.single('digitalSignature'), async (req, res) => {
  try {
    const arrayFields = ['bodyType', 'dietInference', 'profile', 'face', 'spacing', 'primary', 'permanent'];
    
    const processedBody = {...req.body};
    
    arrayFields.forEach(field => {
      if (req.body[field]) {
        processedBody[field] = parseArrayField(req.body[field]);
      }
    });

    const {
      medicalHistory, dentalHistory, currentMedications, recentMedications,
      allergies, breastfeeding, bottleUsage, bottlePeriod, bottleContents,
      brushingHabits, wright, lampshire, bodyType,
      dietTime1, dietFood1, dietSugar1,
      dietTime2, dietFood2, dietSugar2,
      dietTime3, dietFood3, dietSugar3,
      dietTime4, dietFood4, dietSugar4,
      dietTime5, dietFood5, dietSugar5,
      dietInference, oralHabits, profile, face, lips, swallowing, tmj,
      lymphNodes, labialMucosa, buccalMucosa, vestibule, floorOfMouth,
      gingiva, tongue, palate, pharynxTonsils, numberOfTeeth, dentalAge,
      fdiNumbering, decayed, mobility, missing, filled, otherFindings,
      spacing, overjet, overbite, crossbite, midline, molarRelationships,
      canineRelationship, primary, permanent, crowdingRotation,
      differentialDiagnosis, investigation, finalDiagnosis, systemicPhase,
      preventivePhase, preparatoryPhase, correctivePhase, maintenancePhase,
      patientId, patientName, doctorId, doctorName
    } = processedBody;

    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient ID is required' 
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
    const pedodonticsCase = new PedodonticsCase({
      patientId,
      patientName,
      doctorId,
      doctorName, 
      medicalHistory, dentalHistory, currentMedications, recentMedications,
      allergies, breastfeeding, bottleUsage, bottlePeriod, bottleContents,
      brushingHabits, wright, lampshire, bodyType,
      dietTime1, dietFood1, dietSugar1,
      dietTime2, dietFood2, dietSugar2,
      dietTime3, dietFood3, dietSugar3,
      dietTime4, dietFood4, dietSugar4,
      dietTime5, dietFood5, dietSugar5,
      dietInference, oralHabits, profile, face, lips, swallowing, tmj,
      lymphNodes, labialMucosa, buccalMucosa, vestibule, floorOfMouth,
      gingiva, tongue, palate, pharynxTonsils, numberOfTeeth, dentalAge,
      fdiNumbering, decayed, mobility, missing, filled, otherFindings,
      spacing, overjet, overbite, crossbite, midline, molarRelationships,
      canineRelationship, primary, permanent, crowdingRotation,
      differentialDiagnosis, investigation, finalDiagnosis, systemicPhase,
      preventivePhase, preparatoryPhase, correctivePhase, maintenancePhase,
      digitalSignature
    });
    pedodonticsCase.chiefApproval = "";
    await pedodonticsCase.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Case sheet saved successfully', 
      caseId: pedodonticsCase._id 
    });
    console.log('Received form data:', req.body);
    console.log('Received file:', req.file);
  } catch (error) {
    console.error('Error saving pedodontics case:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while saving case sheet' 
    });
  }
});

// Get all pedodontics cases for a patient
// Get cases for specific doctor and patient combination
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    const cases = await PedodonticsCase.find({ 
      patientId
    })
      .select('-digitalSignature')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: cases 
    });
  } catch (error) {
    console.error('Error fetching doctor-patient cases:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching cases' 
    });
  }
});

// Get specific case by ID
router.get('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const caseData = await PedodonticsCase.findById(caseId)
      .select('-digitalSignature'); // Exclude binary data by default
    
    if (!caseData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Case not found' 
      });
    }
    
    // Patients can only see their own cases
    // Doctors can see any case
    if (req.user.role === 'patient' && caseData.patientId !== req.user.Identity) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.json({ 
      success: true, 
      data: caseData 
    });
  } catch (error) {
    console.error('Error fetching pedodontics case:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching case' 
    });
  }
});

// Get digital signature image
router.get('/:caseId/signature', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const caseData = await PedodonticsCase.findById(caseId)
      .select('digitalSignature doctorName');
    
    if (!caseData || !caseData.digitalSignature) {
      return res.status(404).json({ 
        success: false, 
        message: 'Signature not found' 
      });
    }
    
    // Patients can only see their own case signatures
    // Doctors can see any signature
    if (req.user.role === 'patient' && caseData.patientId !== req.user.Identity) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.set('Content-Type', caseData.digitalSignature.contentType);
    res.send(caseData.digitalSignature.data);
  } catch (error) {
    console.error('Error fetching signature:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching signature' 
    });
  }
});

// Update a case (partial update)
router.patch('/:caseId', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const updates = req.body;
    
    const caseData = await PedodonticsCase.findById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Case not found' 
      });
    }
    
    // Ensure the doctor owns this case
    if (caseData.doctorId !== req.user.Identity) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only update your own cases' 
      });
    }
    
    // Update the case
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        caseData[key] = updates[key];
      }
    });
    
    await caseData.save();
    
    res.json({ 
      success: true, 
      message: 'Case updated successfully', 
      data: caseData 
    });
  } catch (error) {
    console.error('Error updating pedodontics case:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating case' 
    });
  }
});

// Delete a case
router.delete('/:caseId', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    
    const caseData = await PedodonticsCase.findById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Case not found' 
      });
    }
    
    // Ensure the doctor owns this case
    if (caseData.doctorId !== req.user.Identity) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own cases' 
      });
    }
    
    await PedodonticsCase.findByIdAndDelete(caseId);
    
    res.json({ 
      success: true, 
      message: 'Case deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting pedodontics case:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting case' 
    });
  }
});

// Get all pending cases for chief approval
router.get('/chief/pending', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const cases = await PedodonticsCase.find({ 
      chiefApproval: { $exists: false } 
    })
      .select('-digitalSignature')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: cases 
    });
  } catch (error) {
    console.error('Error fetching pending cases:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching pending cases' 
    });
  }
});
// Get all cases
router.get('/chief/all-cases', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    if (!hasChiefDepartmentAccess(req.user, ['pedodontics'])) {
      return chiefDepartmentAccessDenied(res);
    }

    // Find all cases without any filters
    const cases = await PedodonticsCase.find({})
      .select('-digitalSignature')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: cases 
    });
  } catch (error) {
    console.error('Error fetching all cases:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching cases' 
    });
  }
});
// Approve or request redo for a case
router.patch('/:caseId/approve', auth, requireRole(['doctor','chief']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { chiefApproval, approvedBy } = req.body;
    
    const caseData = await PedodonticsCase.findById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Case not found' 
      });
    }
    
    // Update the case with chief's approval decision
    caseData.chiefApproval = chiefApproval;
    caseData.approvedBy = approvedBy;
    caseData.approvedAt = new Date();
    
    await caseData.save();
    
    // Send email to doctor
    try {
      const doctor = await User.findOne({ Identity: caseData.doctorId });
      if (doctor && doctor.email) {
        const isApproved = chiefApproval.toLowerCase() === 'approved';
        const subject = isApproved ? 'Case Approved by Chief Doctor' : 'Case Requires Redo';
        
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>${isApproved ? '✅ Case Approved' : '🔄 Case Requires Redo'}</h2>
            <p>Dear Dr. ${caseData.doctorName},</p>
            <p>Your case has been reviewed by the Chief Doctor.</p>
            <ul>
              <li><b>Department:</b> Pedodontics</li>
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
        
        await sendEmail(doctor.email, subject, html);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: 'Case approval status updated successfully', 
      data: caseData 
    });
  } catch (error) {
    console.error('Error updating case approval:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating case approval' 
    });
  }
});

export default router;