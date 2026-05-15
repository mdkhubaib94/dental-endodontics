// Check patient data
import mongoose from 'mongoose';
import { PatientDetails } from './models/patientDetails.js';

const checkPatient = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://DentalUser:DentalUser%40123@cluster0.6iyogx8.mongodb.net/Dental?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Find the patient
    const patient = await PatientDetails.findOne({ patientId: 'C1026' });
    
    if (patient) {
      console.log('Patient found:');
      console.log('Patient ID:', patient.patientId);
      console.log('Personal Info:', JSON.stringify(patient.personalInfo, null, 2));
      console.log('Institution Info:', JSON.stringify(patient.institutionInfo, null, 2));
      console.log('Medical Info:', JSON.stringify(patient.medicalInfo, null, 2));
    } else {
      console.log('Patient not found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

checkPatient();