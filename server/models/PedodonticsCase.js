///models/PedodonticsCase.js
import mongoose from 'mongoose';

const PedodonticsCaseSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    ref: 'patientDetails'
  },
  patientName:{
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
  // Medical History
  medicalHistory: String,
  dentalHistory: String,
  currentMedications: String,
  recentMedications: String,
  allergies: String,
  
  // Feeding Patterns
  breastfeeding: String,
  bottleUsage: String,
  bottlePeriod: String,
  bottleContents: String,
  brushingHabits: String,
  
  // Behavioral Assessment
  wright: String,
  lampshire: String,
  bodyType: [String],
  
  // Diet History
  dietTime1: String, dietFood1: String, dietSugar1: String,
  dietTime2: String, dietFood2: String, dietSugar2: String,
  dietTime3: String, dietFood3: String, dietSugar3: String,
  dietTime4: String, dietFood4: String, dietSugar4: String,
  dietTime5: String, dietFood5: String, dietSugar5: String,
  dietInference: [String],
  oralHabits: String,
  
  // Extra Oral Examination
  profile: [String],
  face: [String],
  lips: String,
  swallowing: String,
  tmj: String,
  lymphNodes: String,
  
  // Intra Oral Examination - Soft Tissue
  labialMucosa: String,
  buccalMucosa: String,
  vestibule: String,
  floorOfMouth: String,
  gingiva: String,
  tongue: String,
  palate: String,
  pharynxTonsils: String,
  
  // Hard Tissue Examination
  numberOfTeeth: String,
  dentalAge: String,
  fdiNumbering: String,
  decayed: String,
  mobility: String,
  missing: String,
  filled: String,
  otherFindings: String,
  
  // Occlusal Analysis
  spacing: [String],
  overjet: String,
  overbite: String,
  crossbite: String,
  midline: String,
  molarRelationships: String,
  canineRelationship: String,
  primary: [String],
  permanent: [String],
  crowdingRotation: String,
  
  // Diagnosis & Treatment
  differentialDiagnosis: String,
  investigation: String,
  finalDiagnosis: String,
  systemicPhase: String,
  preventivePhase: String,
  preparatoryPhase: String,
  correctivePhase: String,
  maintenancePhase: String,
  
  // Digital Signature
  digitalSignature: {
    data: Buffer,
    contentType: String,
    fileName: String
  },
  
  chiefApproval: String,
  approvedBy: {
  type: String
},
approvedAt: {
  type: Date
},
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

// Update the updatedAt field before saving
PedodonticsCaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.PedodonticsCase || mongoose.model('PedodonticsCase', PedodonticsCaseSchema);