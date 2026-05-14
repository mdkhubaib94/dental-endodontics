import express from 'express';
import OralCase from '../models/Oral-model.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';

const router = express.Router();

// ==================== CREATE ORAL CASE ====================
router.post('/', auth, async (req, res) => {
  try {
    const oralCase = new OralCase(req.body);
    await oralCase.save();
    res.status(201).json({
      success: true,
      message: 'Oral case created successfully',
      data: oralCase,
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

// ==================== GET ALL ORAL CASES (FOR DOCTOR) ====================
router.get('/doctor/:doctorId', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const cases = await OralCase.find({ doctorId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error) {
    console.error('Error fetching oral cases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch oral cases',
      error: error.message,
    });
  }
});

// ==================== GET ALL ORAL CASES (FOR CHIEF) ====================
router.get('/chief/all-cases', auth, requireRole('chief_doctor'), async (req, res) => {
  try {
    const cases = await OralCase.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error) {
    console.error('Error fetching all oral cases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch oral cases',
      error: error.message,
    });
  }
});

// ==================== GET ORAL CASE BY ID ====================
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const oralCase = await OralCase.findById(id);
    
    if (!oralCase) {
      return res.status(404).json({
        success: false,
        message: 'Oral case not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: oralCase,
    });
  } catch (error) {
    console.error('Error fetching oral case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch oral case',
      error: error.message,
    });
  }
});

// ==================== GET ORAL CASES BY PATIENT ID ====================
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const cases = await OralCase.find({ patientId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error) {
    console.error('Error fetching patient oral cases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient oral cases',
      error: error.message,
    });
  }
});

// ==================== UPDATE ORAL CASE ====================
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCase = await OralCase.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        message: 'Oral case not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Oral case updated successfully',
      data: updatedCase,
    });
  } catch (error) {
    console.error('Error updating oral case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update oral case',
      error: error.message,
    });
  }
});

// ==================== APPROVE/REJECT ORAL CASE (CHIEF DOCTOR) ====================
router.patch('/:id/approve', auth, requireRole('chief_doctor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { chiefApproval, approvedBy, approvedAt } = req.body;
    
    const updatedCase = await OralCase.findByIdAndUpdate(
      id,
      {
        chiefApproval,
        approvedBy,
        approvedAt: approvedAt || new Date(),
      },
      { new: true }
    );
    
    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        message: 'Oral case not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Oral case approval status updated',
      data: updatedCase,
    });
  } catch (error) {
    console.error('Error approving oral case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update approval status',
      error: error.message,
    });
  }
});

// ==================== DELETE ORAL CASE ====================
router.delete('/:id', auth, requireRole(['chief_doctor', 'doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCase = await OralCase.findByIdAndDelete(id);
    
    if (!deletedCase) {
      return res.status(404).json({
        success: false,
        message: 'Oral case not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Oral case deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting oral case:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete oral case',
      error: error.message,
    });
  }
});

export default router;
