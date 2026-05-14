// models/Implant-model.js - Implant Case Model
import mongoose from 'mongoose';

const ImplantCaseSchema = new mongoose.Schema({
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
  
  // Page 0 - Extra Oral Examination
  facial_symmetry: String,
  facial_profile: String,
  facial_form: String,
  max_mouth_opening: String,
  deviation_mandible: String,
  deviation_opening: String,
  deviation_closing: String,
  pain_tenderness: String,
  clicking: String,
  crepitus: String,
  lymph_nodes: String,

  // Page 1 - Intra Oral Examination
  soft_tissue: String,
  hard_tissue: String,
  gingival_condition: String,
  periodontal_pockets: String,
  mobility: String,
  furcation_involvement: String,
  missing_teeth: String,
  carious_teeth: String,
  filled_teeth: String,
  fractured_teeth: String,
  abrasion: String,
  attrition: String,
  erosion: String,
  hypersensitivity: String,

  // Page 2 - Occlusion
  molar_relation: String,
  canine_relation: String,
  overjet: String,
  overbite: String,
  midline_shift: String,
  open_bite: String,
  crossbite: String,

  // Page 3 - Diagnostic Cast Evaluation
  arch_form: String,
  curve_of_spee: String,
  curve_of_wilson: String,
  arch_alignment: String,
  arch_spacing: String,
  arch_crowding: String,

  // Page 4 - Radiographic & Tests
  radiographs_taken: String,
  radiographic_findings: String,
  vitality_test: String,
  centric_relation: String,
  centric_occlusion: String,
  excursive_movements: String,

  // Page 5 - Diagnosis
  chief_complaint: String,
  clinical_diagnosis: String,
  radiographic_diagnosis: String,
  definitive_diagnosis: String,

  // Page 6 - Treatment Planning
  treatment_options: String,
  abutment_teeth: String,
  connector_design: String,
  pontic_design: String,
  margin_design: String,
  material_choice: String,

  // Page 7 - Tooth Preparation Notes
  occlusal_reduction: String,
  axial_reduction: String,
  finish_line: String,
  path_of_insertion: String,
  retention_features: String,

  // Page 8 - Provisional Restoration
  provisional_material: String,
  provisional_method: String,
  provisional_fit: String,
  provisional_occlusion: String,

  // Page 9 - Final Prosthesis Evaluation
  final_fit: String,
  final_occlusion: String,
  final_contour: String,
  final_esthetics: String,
  patient_feedback: String,
  followup_instructions: String,
  recall_schedule: String,
  
  // Digital Signature - flexible type to accept base64 strings or file objects
  digitalSignature: mongoose.Schema.Types.Mixed,
  
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
}, {
  timestamps: true,
  strict: false // allow the flat underscore case fields from the React form to be stored
});

// Middleware to update the updatedAt field before saving
ImplantCaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better query performance
ImplantCaseSchema.index({ patientId: 1, createdAt: -1 });
ImplantCaseSchema.index({ doctorId: 1, createdAt: -1 });
ImplantCaseSchema.index({ chiefApproval: 1 });

export default mongoose.models.ImplantCase || 
  mongoose.model('ImplantCase', ImplantCaseSchema);