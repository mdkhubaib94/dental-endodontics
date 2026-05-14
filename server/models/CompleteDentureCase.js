// models/CompleteDentureCase.js
import mongoose from 'mongoose';

const CompleteDentureCaseSchema = new mongoose.Schema({
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
  
  // Page 1 - Medical History & General Examination
  medicalHistory: [String],
  medicalHistoryOthers: String,
  treatmentDetails: String,
  gait: String,
  built: String,
  weight: String,
  height: String,
  bloodPressure: String,
  respiratoryRate: String,
  heartRate: String,
  bodyTemperature: String,
  nutritionalStatus: String,
  mentalAttitude: [String],
  habits: [String],
  habitsOthers: String,
  habitDuration: String,
  paraHabits: String,
  
  // Page 2 - Dental History
  prevDentalTreatment: String,
  maxillaryDentureNum: String,
  maxillaryDentureType: String,
  mandibularDentureNum: String,
  mandibularDentureType: String,
  patientCommentsDenture: String,
  
  // Denture Evaluation Ratings
  vdRating: String,
  retentionRating: String,
  stabilityRating: String,
  occlusionRating: String,
  occlusalPlaneRating: String,
  dentureBordersRating: String,
  tissueCoverageRating: String,
  estheticsRating: String,
  midlineRating: String,
  buccalCorridorRating: String,
  articulationRating: String,
  ppsRating: String,
  hygieneRating: String,
  
  occlusalSchemeExisting: String,
  dentureBaseExisting: String,
  dentureTeethExisting: String,
  toothLossReason: [String],
  toothLossReasonOthers: String,
  maxAnteriorLoss: String,
  maxPosteriorLoss: String,
  mandAnteriorLoss: String,
  mandPosteriorLoss: String,
  edentulousDuration: String,
  preExtractionRecords: String,
  
  // Page 3 - Extra Oral Examination
  facialSymmetry: String,
  facialProfile: [String],
  facialForm: [String],
  maxMouthOpening: String,
  mandibleDeviationOpening: [String],
  mandibleDeviationOpeningDirection: [String],
  mandibleDeviationClosingDirection: [String],
  tmjPainTenderness: String,
  tmjClicking: String,
  tmjCrepitus: String,
  lymphNodes: String,
  lipCompetency: String,
  lipLength: String,
  lipLine: [String],
  lipPathology: String,
  muscleTone: [String],
  
  // Page 4 - Intra Oral Examination - Soft Tissue
  buccalMucosaColor: String,
  buccalMucosaTexture: String,
  buccalMucosaOthers: String,
  floorMouthColor: String,
  floorMouthOthers: String,
  hardPalateArch: [String],
  hardPalateShape: [String],
  hyperplasia: String,
  wch: String,
  inflammation: String,
  hardPalateOthers: String,
  softPalateForm: [String],
  softPalateColor: String,
  softPalateOthers: String,
  palateSensitivity: [String],
  lateralThroatForm: [String],
  palatalThroatForm: [String],
  tongueSize: [String],
  tonguePosition: [String],
  tongueMobility: [String],
  tongueOthers: String,
  
  // Page 5 - Frenum & Attached Tissue Examination
  maxLabialFrenumNum: String,
  maxLabialFrenumProminence: String,
  maxLabialFrenumClass: String,
  maxLeftBuccalFrenumNum: String,
  maxLeftBuccalFrenumProminence: String,
  maxLeftBuccalFrenumClass: String,
  maxRightBuccalFrenumNum: String,
  maxRightBuccalFrenumProminence: String,
  maxRightBuccalFrenumClass: String,
  mandLabialFrenumNum: String,
  mandLabialFrenumProminence: String,
  mandLabialFrenumClass: String,
  mandLeftBuccalFrenumNum: String,
  mandLeftBuccalFrenumProminence: String,
  mandLeftBuccalFrenumClass: String,
  mandRightBuccalFrenumNum: String,
  mandRightBuccalFrenumProminence: String,
  mandRightBuccalFrenumClass: String,
  maxillaAttachedGingival: [String],
  mandibleAttachedGingival: [String],
  maxillaSoftTissueRidge: [String],
  mandibleSoftTissueRidge: [String],
  maxillaMucosaCondition: [String],
  mandibleMucosaCondition: [String],
  
  // Page 6 - Ridge & Saliva Examination
  maxillaAntRidgeForm: [String],
  maxillaPostRidgeForm: [String],
  mandibleAntRidgeForm: [String],
  mandiblePostRidgeForm: [String],
  ridgeContour: [String],
  ridgeRelation: [String],
  ridgeParallelism: [String],
  ridgeHeight: String,
  ridgeWidth: String,
  undercuts: String,
  exostosis: String,
  torus: String,
  salivaQuantity: [String],
  salivaConsistency: [String],
  
  // Page 7 - Diagnosis & Treatment Plan
  finalDiagnosis: String,
  treatmentPlan: String,
  prostheticPrognosis: String,
  recall: String,
  
  // Digital Signature
  digitalSignature: {
    data: Buffer,
    contentType: String,
    fileName: String
  },
  
  // Approval System
  chiefApproval: String,
  approvedBy: String,
  approvedAt: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update the updatedAt field before saving
CompleteDentureCaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better query performance
CompleteDentureCaseSchema.index({ patientId: 1, createdAt: -1 });
CompleteDentureCaseSchema.index({ doctorId: 1, createdAt: -1 });
CompleteDentureCaseSchema.index({ chiefApproval: 1 });

export default mongoose.models.CompleteDentureCase || 
  mongoose.model('CompleteDentureCase', CompleteDentureCaseSchema);