// server/models/Prescription.js - Fixed version
import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Medicine type is required'],
    enum: {
      values: ['injection', 'syrup', 'pills', 'ointment'],
      message: 'Medicine type must be one of: injection, syrup, pills, ointment'
    }
  },
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    maxlength: [200, 'Medicine name cannot exceed 200 characters']
  },
  dosage: {
    m: {
      type: String,
      default: '0',
      set: v => (v === undefined || v === null ? '0' : String(v)),
      validate: {
        validator: function (v) {
          if (v === undefined || v === null) return true;
          const s = String(v).trim();
          // If this medicine is syrup, accept any value (doctor-entered ml)
          if (this && this.type === 'syrup') {
            return true;
          }
          const allowed = ['0', '1', '2', '3', '4', '5', '6', '7', '7.5', '15', '10'];
          if (allowed.includes(s)) return true;
          return /^\d+(\.\d+)?$/.test(s);
        },
        message: 'Dosage.m must be a fraction or numeric ml value'
      }
    }, // Morning
    n: {
      type: String,
      default: '0',
      set: v => (v === undefined || v === null ? '0' : String(v)),
      validate: {
        validator: function (v) {
          if (v === undefined || v === null) return true;
          const s = String(v).trim();
          if (this && this.type === 'syrup') {
            return true;
          }
          const allowed = ['0', '1/4', '1/2', '1', '2'];
          if (allowed.includes(s)) return true;
          return /^\d+(\.\d+)?$/.test(s);
        },
        message: 'Dosage.n must be a fraction or numeric ml value'
      }
    }, // Noon
    e: {
      type: String,
      default: '0',
      set: v => (v === undefined || v === null ? '0' : String(v)),
      validate: {
        validator: function (v) {
          if (v === undefined || v === null) return true;
          const s = String(v).trim();
          if (this && this.type === 'syrup') {
            return true;
          }
          const allowed = ['0', '1/4', '1/2', '1', '2'];
          if (allowed.includes(s)) return true;
          return /^\d+(\.\d+)?$/.test(s);
        },
        message: 'Dosage.e must be a fraction or numeric ml value'
      }
    }, // Evening
    n2: {
      type: String,
      default: '0',
      set: v => (v === undefined || v === null ? '0' : String(v)),
      validate: {
        validator: function (v) {
          if (v === undefined || v === null) return true;
          const s = String(v).trim();
          if (this && this.type === 'syrup') {
            return true;
          }
          const allowed = ['0', '1/4', '1/2', '1', '2'];
          if (allowed.includes(s)) return true;
          return /^\d+(\.\d+)?$/.test(s);
        },
        message: 'Dosage.n2 must be a fraction or numeric ml value'
      }
    } // Night
  },
  foodIntake: {
    type: String,
    enum: {
      values: ['after', 'before'],
      message: 'Food intake must be either "after" or "before"'
    },
    default: 'after'
  },
  duration: {
    type: Number,
    default: 0,
    min: [0, 'Duration cannot be negative'],
    max: [365, 'Duration cannot exceed 365 days']
  },
  // Remove durationType from schema - handle in application logic
  asNeeded: {
    type: Boolean,
    default: false
  }
}, {
  _id: true,
  timestamps: false
});

const prescriptionSchema = new mongoose.Schema({
  caseId: {
    type: String,
    default: null,
    trim: true,
    index: true
  },
  patientId: {
    type: String,
    required: [true, 'Patient ID is required'],
    trim: true,
    index: true
  },
  patientData: {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      maxlength: [100, 'Patient name cannot exceed 100 characters']
    },
    age: {
      type: Number,
      required: [true, 'Patient age is required'],
      min: [0, 'Age cannot be negative'],
      max: [150, 'Age cannot exceed 150']
    },
    gender: {
      type: String,
      required: [true, 'Patient gender is required'],
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be one of: male, female, other'
      }
    },
    date: {
      type: Date,
      required: [true, 'Prescription date is required'],
      default: Date.now
    }
  },
  symptoms: {
    type: String,
    required: [true, 'Symptoms are required'],
    trim: true,
    maxlength: [1000, 'Symptoms cannot exceed 1000 characters']
  },
  diagnosis: {
    type: String,
    required: [true, 'Diagnosis is required'],
    trim: true,
    maxlength: [1000, 'Diagnosis cannot exceed 1000 characters']
  },
  medicines: {
    type: [medicineSchema],
    validate: {
      validator: function (medicines) {
        return medicines && medicines.length > 0;
      },
      message: 'At least one medicine is required'
    }
  },
  advice: {
    type: String,
    default: '',
    trim: true,
    maxlength: [1000, 'Advice cannot exceed 1000 characters']
  },
  drugAllergies: {
    type: String,
    default: 'None',
    trim: true,
    maxlength: [500, 'Drug allergies cannot exceed 500 characters']
  },
  dietAllergies: {
    type: String,
    default: 'None',
    trim: true,
    maxlength: [500, 'Diet allergies cannot exceed 500 characters']
  },
  nextVisitDate: {
    type: Date,
    default: null
  },
  nextVisitTime: {
    type: String,
    default: null,
    trim: true
  },
  doctorId: {
    type: String,
    required: [true, 'Doctor ID is required'],
    trim: true,
    index: true
  },
  doctorName: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true,
    maxlength: [100, 'Doctor name cannot exceed 100 characters']
  },
  clinicName: {
    type: String,
    default: 'SRM Dental College',
    trim: true,
    maxlength: [200, 'Clinic name cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'completed', 'cancelled'],
      message: 'Status must be one of: active, completed, cancelled'
    },
    default: 'active',
    index: true
  },
  billing: {
    isGenerated: {
      type: Boolean,
      default: false,
      index: true
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative']
    },
    billingDate: {
      type: Date,
      default: null
    },
    items: [{
      medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine'
      },
      medicineName: String,
      medicineType: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      dosage: String,
      foodIntake: String,
      duration: Number
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ 'billing.isGenerated': 1, status: 1 });
prescriptionSchema.index({ createdAt: -1 });

// Pre-save middleware with better error handling
prescriptionSchema.pre('save', function (next) {
  try {
    console.log('Pre-save middleware executing for prescription:', this._id);

    // Ensure injections have duration set to 1, but do not overwrite client-provided dosage
    this.medicines.forEach(medicine => {
      if (medicine.type === 'injection') {
        if (!medicine.duration) medicine.duration = 1; // ensure duration is 1 if missing
      }
    });

    console.log('Pre-save validation completed successfully');
    next();
  } catch (error) {
    console.error('Pre-save middleware error:', error);
    next(error);
  }
});

// Post-save middleware for logging
prescriptionSchema.post('save', function (doc, next) {
  console.log('Prescription saved successfully with ID:', doc._id);
  next();
});

// Error handling middleware
prescriptionSchema.post('save', function (error, doc, next) {
  console.error('Post-save error middleware triggered:', error);
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Duplicate prescription detected'));
  } else {
    next(error);
  }
});

export default mongoose.model('Prescription', prescriptionSchema);
