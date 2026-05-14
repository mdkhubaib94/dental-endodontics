// models/patientDetails.js
import { Schema } from 'mongoose';
import mongoose from "mongoose";

const patientDetailsSchema = new Schema({
  patientId: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make optional for admin creation
  },

  // Personal Information
  personalInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    middleName: {
      type: String,
      trim: true,
      default: ''
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: Date
    },
    age: {
      type: Number,
      min: 0,
      max: 150
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Other'
    },
    maritalStatus: {
      type: String,
      enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Other'],
      default: 'Single'
    },
    preferredLanguage: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    emergencyContact: {
      type: String,
      trim: true,
      default: ''
    }
  },

  // Medical Information
  medicalInfo: {
    chiefComplaint: {
      type: String,
      trim: true,
      default: ''
    },
    hpi: [{
      type: String,
      trim: true
    }], // History of Present Illness
    pastMedicalHistory: [{
      type: String,
      trim: true
    }],
    personalHabits: [{
      type: String,
      trim: true
    }],
    currentMedications: [{
      type: String,
      trim: true
    }],
    knownAllergies: [{
      type: String,
      trim: true
    }],
    chronicConditions: [{
      type: String,
      trim: true
    }],
    pastSurgeries: [{
      type: String,
      trim: true
    }],
    pregnancyStatus: {
      type: String,
      enum: ['No', 'Yes', 'N/A'],
      default: 'N/A'
    },
    dentalConcerns: [{
      type: String,
      trim: true
    }],
    lastDentalVisit: {
      type: Date
    }
  },

  // Vitals
  vitals: {
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
      default: ''
    },
    drugAllergies: [{
      type: String,
      trim: true
    }],
    dietAllergies: [{
      type: String,
      trim: true
    }]
  },

  // System Fields
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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
  timestamps: true // This will automatically handle createdAt and updatedAt
});

// Update timestamp before saving
patientDetailsSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Add indexes for better performance (note: patientId already has unique index from field definition)
patientDetailsSchema.index({ 'personalInfo.firstName': 1 });
patientDetailsSchema.index({ 'personalInfo.lastName': 1 });
patientDetailsSchema.index({ 'personalInfo.phone': 1 });
patientDetailsSchema.index({ status: 1 });

// Virtual for full name
patientDetailsSchema.virtual('personalInfo.fullName').get(function () {
  return `${this.personalInfo.firstName} ${this.personalInfo.middleName ? this.personalInfo.middleName + ' ' : ''}${this.personalInfo.lastName}`;
});

// Ensure virtual fields are serialized
patientDetailsSchema.set('toJSON', {
  virtuals: true
});

export const PatientDetails = mongoose.models.PatientDetails ||
  mongoose.model('PatientDetails', patientDetailsSchema);