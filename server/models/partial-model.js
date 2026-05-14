import mongoose from "mongoose";

const PartialDentureSchema = new mongoose.Schema(
  {
    /* ======================
       PATIENT DETAILS
    ====================== */
    patientName: String,
    age: Number,
    gender: String,
    opdNo: String,
    date: String,

    /* ======================
       MEDICAL HISTORY
    ====================== */
    cardiovascular: String,
    respiratory: String,
    diabetes: String,
    hypertension: String,
    allergies: String,
    medications: String,

    /* ======================
       DENTAL / ORAL EXAM
    ====================== */
    chiefComplaint: String,
    missingTeeth: String,
    abutmentTeeth: String,
    occlusion: String,
    ridgeCondition: String,
    oralHygieneStatus: String,

    /* ======================
       PERIODONTAL INDICES
    ====================== */
    gingivalIndex: Number,
    debrisScore: Number,
    calculusScore: Number,
    ohis: Number,

    /* ======================
       PERIODONTAL CHART
       (Raw input IDs → values)
    ====================== */
    periodontalData: {
      type: Map,
      of: String
    },

    /* ======================
       PARTIAL DENTURE SPECIFIC
    ====================== */
    kennedyClass: String,
    modificationSpace: String,
    majorConnector: String,
    minorConnector: String,
    claspDesign: String,

    /* ======================
       DIAGNOSIS & PLAN
    ====================== */
    diagnosis: String,
    treatmentPlan: String,
    remarks: String,

    /* ======================
       IDENTIFIERS & APPROVAL
    ====================== */
    patientId: String,
    patientName: String,
    doctorId: String,
    doctorName: String,
    digitalSignature: String,
    chiefApproval: String,
    approvedBy: String,
    approvedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model(
  "PartialDentureCase",
  PartialDentureSchema
);
