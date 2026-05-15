import mongoose from 'mongoose';

const OralCaseSchema = new mongoose.Schema(
  {
    // Basic Patient Information
    caseSheetNumber: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
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
    opNo: {
      type: String,
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
    occupation: {
      type: String,
      trim: true,
    },
    income: {
      type: String,
      trim: true,
    },
    religion: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
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

    // History Section
    chiefComplaint: {
      type: String,
      trim: true,
    },
    historyOfPresentIllness: {
      type: String,
      trim: true,
    },
    pastMedicalHistory: {
      type: String,
      trim: true,
    },
    pastSurgicalHistory: {
      type: String,
      trim: true,
    },
    pastDentalHistory: {
      type: String,
      trim: true,
    },
    personalHistory: {
      type: String,
      trim: true,
    },
    familyHistory: {
      type: String,
      trim: true,
    },

    // Clinical Examination - General
    generalExamination: {
      type: String,
      trim: true,
    },

    // Review of Systems
    centralNervousSystem: {
      type: String,
      trim: true,
    },
    cardioVascularSystem: {
      type: String,
      trim: true,
    },
    respiratorySystem: {
      type: String,
      trim: true,
    },
    gastroIntestinalSystem: {
      type: String,
      trim: true,
    },
    genitoUrinarySystem: {
      type: String,
      trim: true,
    },
    skeletalSystem: {
      type: String,
      trim: true,
    },

    // Local Examination - Extra Oral
    facialSymmetry: {
      type: String,
      trim: true,
    },
    facialProfile: {
      type: String,
      trim: true,
    },
    earNoseEyes: {
      type: String,
      trim: true,
    },
    tmjInspection: {
      type: String,
      trim: true,
    },
    tmjPalpation: {
      type: String,
      trim: true,
    },
    tmjPercussionAuscultation: {
      type: String,
      trim: true,
    },
    lymphNodeExamination: {
      type: String,
      trim: true,
    },

    // Intra Oral Examination
    siteShapeOfMouth: {
      type: String,
      trim: true,
    },
    mouthOpening: {
      type: String,
      trim: true,
    },
    jawMovements: {
      type: String,
      trim: true,
    },

    // Hard Tissue Examination
    teethPresent: {
      type: String,
      trim: true,
    },
    sizeShapeColor: {
      type: String,
      trim: true,
    },
    dentalCaries: {
      type: String,
      trim: true,
    },
    missing: {
      type: String,
      trim: true,
    },
    mobility: {
      type: String,
      trim: true,
    },
    occlusion: {
      type: String,
      trim: true,
    },
    recession: {
      type: String,
      trim: true,
    },
    attrition: {
      type: String,
      trim: true,
    },
    calculusAndStains: {
      type: String,
      trim: true,
    },
    hardTissueOthers: {
      type: String,
      trim: true,
    },

    // Soft Tissue Examination
    gingival: {
      type: String,
      trim: true,
    },
    alveolarMucosa: {
      type: String,
      trim: true,
    },
    buccalMucosa: {
      type: String,
      trim: true,
    },
    labialMucosa: {
      type: String,
      trim: true,
    },
    tongue: {
      type: String,
      trim: true,
    },
    floorOfOralCavity: {
      type: String,
      trim: true,
    },
    palate: {
      type: String,
      trim: true,
    },
    pillarOfFaucesAndTonsils: {
      type: String,
      trim: true,
    },
    retroMolarArea: {
      type: String,
      trim: true,
    },

    // Examination of Lesion
    lesionInspection: {
      type: String,
      trim: true,
    },
    lesionPalpation: {
      type: String,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },

    // Diagnosis
    provisionalDiagnosis: {
      type: String,
      trim: true,
    },
    differentialDiagnosis: {
      type: String,
      trim: true,
    },
    clinicalDiagnosis: {
      type: String,
      trim: true,
    },

    // Investigations
    hematological: {
      type: String,
      trim: true,
    },
    urine: {
      type: String,
      trim: true,
    },
    bioChemical: {
      type: String,
      trim: true,
    },
    serological: {
      type: String,
      trim: true,
    },
    cytological: {
      type: String,
      trim: true,
    },
    microbiological: {
      type: String,
      trim: true,
    },
    specialInvestigations: {
      type: String,
      trim: true,
    },
    radiological: {
      type: String,
      trim: true,
    },
    biopsy: {
      type: String,
      trim: true,
    },
    histopathologicalExamination: {
      type: String,
      trim: true,
    },
    otherInvestigations: {
      type: String,
      trim: true,
    },

    // Treatment Planning
    treatmentPlan: {
      type: String,
      trim: true,
    },
    prognosis: {
      type: String,
      trim: true,
    },

    // Treatment Done (for tracking)
    treatmentDone: {
      type: String,
      trim: true,
    },
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
