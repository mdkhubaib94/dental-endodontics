// models/GeneralCase.js - General Case Sheet Model
import mongoose from 'mongoose';

const GeneralCaseSchema = new mongoose.Schema({
  // Patient & Doctor Information
  patientId: {
    type: String,
    required: true,
    ref: 'patientDetails'
  },
  patientName: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true,
    ref: 'User'
  },
  doctorName: {
    type: String,
    required: true
  },
  generalDoctorId: {
    type: String,
    default: ''
  },
  generalDoctorName: {
    type: String,
    default: ''
  },

  // General Information section
  chiefComplaint: String,
  presentIllness: String,
  pastMedical: String,
  pastDental: String,
  personalHistory: String,
  familyHistory: String,

  // Clinical Findings
  clinicalFindings: String,

  // Diagnosis section
  provisionalDiagnosis: String,
  investigations: String,
  finalDiagnosis: String,

  // Treatment selection and plan
  description: String,
  generalDescription: String,
  selectedDepartments: [String],
  treatmentPlan: String,
  xrayImage: {
    type: String,
    default: ''
  },
  referredDepartment: {
    type: String,
    default: ''
  },
  specialistDoctorId: {
    type: String,
    default: ''
  },
  specialistDoctorName: {
    type: String,
    default: ''
  },
  specialistAssignedAt: Date,
  specialistStatus: {
    type: String,
    enum: ['not-required', 'pending', 'approved', 'rescheduled'],
    default: 'not-required'
  },
  specialistRescheduleReason: {
    type: String,
    default: ''
  },
  specialistReviewedBy: {
    type: String,
    default: ''
  },
  specialistReviewedAt: Date,
  assignedPgId: {
    type: String,
    default: ''
  },
  assignedPgName: {
    type: String,
    default: ''
  },
  pgAssignedAt: Date,

  // Approval fields for future use
  chiefApproval: String,
  approvedBy: String,
  approvedAt: Date
}, {
  timestamps: true
});

GeneralCaseSchema.index({ patientId: 1, createdAt: -1 });
GeneralCaseSchema.index({ specialistDoctorId: 1, createdAt: -1 });
GeneralCaseSchema.index({ assignedPgId: 1, createdAt: -1 });
GeneralCaseSchema.index({ assignedPgId: 1, specialistStatus: 1, pgAssignedAt: -1, createdAt: -1 });

export default mongoose.models.GeneralCase || mongoose.model('GeneralCase', GeneralCaseSchema);
