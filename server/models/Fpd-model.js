

import mongoose from 'mongoose';

// Use a flexible schema so we can persist the flat form fields coming from the UI
const FpdSchema = new mongoose.Schema({
  // Page 1 - Clinical examination
  clinicalExamination: {
    extraOralExamination: {
      facialSymmetry: String,
      facialProfile: {
        type: String,
        enum: ['Normal', 'Retrognathic', 'Prognathic']
      },
      facialForm: {
        type: String,
        enum: ['Square', 'Square-tapering', 'Tapering', 'Ovoid']
      },
      tmjExamination: {
        inspection: {
          maxMouthOpening: String,
          deviationMandible: {
            type: String,
            enum: ['Yes', 'No']
          },
          deviationOpening: {
            type: String,
            enum: ['left', 'right']
          },
          deviationClosing: {
            type: String,
            enum: ['left', 'right']
          }
        },
        palpation: {
          painTenderness: String,
          clicking: String
        },
        auscultation: {
          crepitus: String
        }
      },
      lymphNodes: String
    },
    
    // Page 2 - Oral examination
    lips: {
      description: String,
      competency: String,
      lipLength: String,
      lipLine: {
        type: String,
        enum: ['High', 'Medium', 'Low']
      },
      pathology: String
    },
    extraOralMuscleTone: {
      type: String,
      enum: ['Class I', 'Class II', 'Class III']
    },
    
    intraOralExamination: {
      buccalMucosa: {
        colour: String,
        texture: String,
        others: String
      },
      floorOfMouth: {
        colour: String,
        others: String
      },
      hardPalate: {
        arch: String,
        tori: String,
        hyperplasia: String,
        inflammation: String,
        others: String
      },
      softPalate: {
        form: {
          type: String,
          enum: ['Class I', 'Class II', 'Class III']
        },
        colour: String,
        others: String
      },
      
      // Page 3
      tongue: {
        size: {
          type: String,
          enum: ['Class I', 'Class II', 'Class III']
        },
        position: {
          type: String,
          enum: ['Class I', 'Class II', 'Class III']
        },
        mobility: {
          type: String,
          enum: ['Normal', 'Reduced (tongue tie)']
        },
        others: String
      },
      saliva: {
        type: String,
        enum: ['Class I', 'Class II', 'Class III']
      }
    },
    
    // Page 3 - Gingival index
    gingivalIndex: {
      buccalInputs: [String],
      palatalInputs: [String],
      buccalFields: [String],
      lingualFields: [String],
      calculatedIndex: String
    },
    
    // Page 4 - Oral hygiene and DMF index
    oralHygieneIndex: {
      debrisScore: {
        top: [String],
        bottom: [String]
      },
      calculusScore: {
        top: [String],
        bottom: [String]
      },
      totalIndex: String
    },
    
    dmfIndex: {
      maxillary: [String],
      mandibular: [String]
    },
    
    periodontalStatus: {
      mobility: {
        maxillary: [String],
        mandibular: [String]
      },
      
      // Page 5
      furcationInvolvement: {
        maxillary: [String],
        mandibular: [String]
      },
      recession: {
        maxillary: [String],
        mandibular: [String]
      },
      periodontalPockets: {
        maxillary: [String],
        mandibular: [String]
      },
      otherFindings: String
    },
    
    toothStructureLoss: {
      abrasion: Boolean,
      occlusalWear: Boolean,
      erosion: Boolean,
      abfraction: Boolean
    },
    
    // Page 6 - Edentulous ridge
    edentulousRidge: {
      mucosa: {
        description: String,
        colour: String,
        consistency: String,
        thickness: String
      },
      ridgeClassification: {
        type: String,
        enum: ['Class I', 'Class II', 'Class III']
      },
      ridgeHeight: String,
      ridgeLength: String,
      ridgeWidth: String
    },
    
    occlusion: {
      molarRelation: String,
      occlusalPlaneDiscrepancies: String,
      driftingOfTeeth: String,
      supraEruptionIntrusion: String,
      rotation: String,
      overjet: String,
      overbite: String,
      existingOcclusalScheme: {
        type: String,
        enum: ['Group function', 'Canine guided', 'Bilateral balanced']
      },
      others: String
    }
  },
  
  // Page 7 - Abutment evaluation
  abutmentEvaluation: {
    clinical: {
      clinicalCrownHeight: String,
      crownMorphology: String,
      vitality: String,
      mobility: String,
      probingDepth: String,
      bleedingOnProbing: String,
      recession: String,
      furcationInvolvement: String,
      axialInclination: String,
      rotations: String,
      painOnPercussion: String,
      presenceOfRestorations: String,
      caries: String,
      supraEruptionIntrusion: String
    },
    radiographic: {
      periapicalStatus: String,
      laminaDura: String,
      crownHeight: String,
      rootLength: String,
      bone: String,
      crownRootRatio: String,
      coronalProximalRadioleucency: String
    }
  },
  
  otherInvestigations: {
    opg: String,
    others: String
  },
  
  treatmentPlanning: {
    surgery: String,
    endodonticRestorations: String,
    periodontalTreatment: String,
    orthodonticTreatment: String,
    prosthodontic: {
      typeOfFpd: String,
      abutments: String,
      typeOfRetainers: String,
      typeOfPontic: String,
      proposedOcclusalScheme: String
    }
  },
  
  // Page 8 - Treatment procedures
  treatmentProcedures: [{
    procedure: String,
    date: Date,
    grade: String,
    staffInCharge: String
  }],
  
  // Metadata
  patientId: {
    type: String,
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  doctorId: {
    type: String,
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  // Store any signature representation (base64 string from the client or file meta)
  digitalSignature: mongoose.Schema.Types.Mixed,
  chiefApproval: {
    type: String,
    default: ""
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
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

// Indexes for better query performance
FpdSchema.index({ patientId: 1 });
FpdSchema.index({ createdBy: 1 });
FpdSchema.index({ createdAt: -1 });

const Fpd = mongoose.model('Fpd', FpdSchema);
export default Fpd;