import mongoose from "mongoose";

const ImplantSchema = new mongoose.Schema(
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
       ORAL/PERI-ORAL EXAMINATION
    ====================== */
    faceShape: String,
    profile: String,
    lipSupport: String,
    philtrum: String,
    nasolabialSulcus: String,
    edentulism: String,
    kennedyClass: {
      classI: Boolean,
      classII: Boolean,
      classIII: Boolean,
      classIV: Boolean
    },

    /* ======================
       INTRAORAL AND EXTRAORAL EXAM
    ====================== */
    gingiva: String,
    mucosa: String,
    tongue: String,
    floorOfMouth: String,
    salivaryGlands: String,
    tonsils: String,
    palate: String,
    lineaAlba: {
      present: Boolean,
      notes: String
    },
      existingRestoration: {
         restorationType: String,
         otherDetails: String
      },

    /* ======================
       NECKS AND NODES
    ====================== */
    inflammation: String,
    nodeEnlargement: String,
    tenderness: String,
    nodeOtherFindings: String,

    /* ======================
       PERIODONTAL ASSESSMENT
    ====================== */
    oralHygieneStatus: String,
    calculus: String,
    plaque: String,
    stains: String,
    mobilityTeeth: String,
    mobilityGrade: String,
    pockets: Number,
    recession: Number,
    periodontalTenderness: String,
    periodontalOtherFindings: String,

    /* ======================
       OCCLUSAL ASSESSMENT
    ====================== */
    archRelationship: String,
    overjet: Number,
    overbite: Number,
    crossbite: String,
    midlineShift: Number,
    premucosal: {
      labial: Boolean,
      lingual: Boolean,
      buccal: Boolean,
      onCrest: Boolean
    },
    tissueSupport: {
      firmness: String,
      contour: String,
      undercutsPresent: Boolean,
      otherFindings: String
    },

    /* ======================
       RADIOGRAPHIC ASSESSMENT
    ====================== */
    boneLoss: String,
    implantSiteAssessment: String,
    periapicalStatus: String,
    pathology: String,
    uneruptedTeeth: String,
    undercut: {
      present: Boolean,
      description: String
    },
    availableBoneWidth: Number,
    availableBoneHeight: Number,

    /* ======================
       ESTHETIC ANALYSIS
    ====================== */
    smileLine: String,
    highLipLine: String,
    lowLipLine: String,
    archForm: String,

    /* ======================
       PROSTHETIC SPACE ANALYSIS
    ====================== */
    interArchSpace: Number,
    ridgeRelationship: String,
    occlusalPlane: String,
    directionOfForce: String,
    opposingArch: {
      softTissueSupport: Boolean,
      fixedProsthesis: Boolean,
      naturalDentition: Boolean
    },
    tongueSize: String,

    /* ======================
       DENTAL STATUS EVALUATION
    ====================== */
    cariesStatus: String,
    restorationStatus: String,
    endodonticStatus: String,
    periodontalStatus: String,
    softTissueEvaluation: String,
    rootConfiguration: String,
    toothPosition: String,
    crownHeight: String,

    /* ======================
       BONE EVALUATION
    ====================== */
    boneQuality: String,
    boneVolume: String,
    boneDensity: String,
    boneHeight: Number,
    boneWidth: Number,
    ctScanFindings: String,
    otherBoneFindings: String,

    /* ======================
       PROGNOSIS ASSESSMENT
    ====================== */
    oralComfortPotential: String,
    oralFunctionPotential: String,
    oralEstheticPotential: String,
    psychologicalStatus: String,
    patientExpectation: String,

    /* ======================
       TREATMENT PLAN
    ====================== */
    diagnosticImpression: String,
    studyModelAnalysis: String,
    waxUp: String,
    surgicalGuide: String,
    prosthesisType: String,
    fixed: String,
    removable: String,
    overdenture: String,
    hybrid: String,
    materialUsed: {
      ceramicPFM: Boolean,
      allCeramic: Boolean
    },

    /* ======================
       FOLLOW-UP PLAN
    ====================== */
    followUpSequence: String,
    clinical: String,
    radiographic: String,
    osseointegrationStatus: String,
    subjectiveAnalysis: String,
    otherFactors: String,

    /* ======================
       FILE UPLOADS
    ====================== */
    mouthOpeningImage: String,
    radiographImages: [String],

    /* ======================
       STATUS
    ====================== */
    status: {
      type: String,
      enum: ['draft', 'submitted', 'in-progress', 'completed'],
      default: 'draft'
    },
    createdBy: String,
    lastModifiedBy: String,

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
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add virtual for full name if needed
ImplantSchema.virtual('patientFullInfo').get(function() {
   return `${this.patientName} (OPD: ${this.opdNo}, Age: ${this.age})`;
});

// Use a distinct model name to avoid clashing with the Implant case schema
const ImplantPatientCase = mongoose.models.ImplantPatientCase ||
   mongoose.model('ImplantPatientCase', ImplantSchema);

export default ImplantPatientCase;