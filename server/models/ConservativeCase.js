import mongoose from 'mongoose';

const ConservativeCaseSchema = new mongoose.Schema({
  patientId: { type: String, required: true, ref: 'patientDetails' },
  patientName: { type: String, required: true },
  doctorId: { type: String, required: true, ref: 'User' },
  doctorName: { type: String, required: true },
  // History & Examination
  medicalHistory: String,
  dentalHistory: String,
  currentMedications: String,
  allergies: String,
  criticalMedicalIllness: String,

  // Clinical Findings
  chiefComplaint: String,
  intraOralFindings: String,
  extraOralFindings: String,
  perioStatus: String,

  // Endodontic-specific
  pulpalStatus: String,
  periapicalStatus: String,
  rootCanalTreatmentPlanned: String,

  // Diagnosis & Treatment Plan
  provisionalDiagnosis: String,
  finalDiagnosis: String,
  investigations: String,
  treatmentPlan: String,

  // Digital Signature / attachments
  digitalSignature: {
    data: Buffer,
    contentType: String,
    fileName: String,
  },

  // Treatment pictures (stored as data URLs for easy preview in frontend)
  treatmentPictures: [
    {
      fileName: String,
      dataUrl: String,
    }
  ],

  chiefApproval: String,
  approvedBy: String,
  approvedAt: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

ConservativeCaseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.ConservativeCase || mongoose.model('ConservativeCase', ConservativeCaseSchema);
