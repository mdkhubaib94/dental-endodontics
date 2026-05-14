import mongoose from 'mongoose';

const OralCaseSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      trim: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
      trim: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    // Chief complaint
    chiefComplaint: {
      type: String,
      trim: true,
    },
    // History of present illness
    historyOfPresentIllness: {
      type: String,
      trim: true,
    },
    // Past medical history
    pastMedicalHistory: {
      type: String,
      trim: true,
    },
    // Past dental history
    pastDentalHistory: {
      type: String,
      trim: true,
    },
    // Clinical examination
    extraOralExamination: {
      type: String,
      trim: true,
    },
    intraOralExamination: {
      type: String,
      trim: true,
    },
    // Investigations
    radiographicFindings: {
      type: String,
      trim: true,
    },
    otherInvestigations: {
      type: String,
      trim: true,
    },
    // Diagnosis
    provisionalDiagnosis: {
      type: String,
      trim: true,
    },
    finalDiagnosis: {
      type: String,
      trim: true,
    },
    // Treatment plan
    treatmentPlan: {
      type: String,
      trim: true,
    },
    // Treatment done
    treatmentDone: {
      type: String,
      trim: true,
    },
    // Procedure details
    procedureType: {
      type: String,
      trim: true,
    },
    anesthesiaUsed: {
      type: String,
      trim: true,
    },
    complications: {
      type: String,
      trim: true,
    },
    // Post-operative instructions
    postOpInstructions: {
      type: String,
      trim: true,
    },
    // Follow-up
    followUpDate: {
      type: Date,
    },
    followUpNotes: {
      type: String,
      trim: true,
    },
    // Approval status
    chiefApproval: {
      type: String,
      default: 'Pending',
    },
    approvedBy: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    // Additional notes
    additionalNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const OralCase = mongoose.model('OralCase', OralCaseSchema);

export default OralCase;
