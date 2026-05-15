// Test address fetching
import mongoose from 'mongoose';
import { PatientDetails } from './models/patientDetails.js';

const testAddress = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://DentalUser:DentalUser%40123@cluster0.6iyogx8.mongodb.net/Dental?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Find the patient
    const patient = await PatientDetails.findOne({ patientId: 'C1026' });
    
    if (patient) {
      console.log('=== PATIENT FOUND ===');
      console.log('Patient ID:', patient.patientId);
      console.log('First Name:', patient.personalInfo?.firstName);
      console.log('Address:', patient.personalInfo?.address);
      console.log('Institution Name:', patient.institutionInfo?.institutionName);
      console.log('Institution Address:', patient.institutionInfo?.institutionAddress);
      
      console.log('\n=== FULL PERSONAL INFO ===');
      console.log(JSON.stringify(patient.personalInfo, null, 2));
      
      console.log('\n=== FULL INSTITUTION INFO ===');
      console.log(JSON.stringify(patient.institutionInfo, null, 2));
    } else {
      console.log('Patient not found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

testAddress();