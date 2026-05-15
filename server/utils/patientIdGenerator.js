// server/utils/patientIdGenerator.js
import { User } from '../models/User.js';
import { PatientDetails } from '../models/patientDetails.js';

// Generate next patient ID in format C1000, C1001, C1002, etc.
export const generateNextPatientId = async () => {
  const prefix = 'C';
  const startingNumber = 1000;

  // Find latest IDs from both User (Identity) and PatientDetails (patientId)
  const [lastUser, lastPatient] = await Promise.all([
    User.findOne({ 
      Identity: { $regex: `^${prefix}\\d+$` }, 
      role: 'patient' 
    })
      .sort({ Identity: -1 })
      .lean(),
    PatientDetails.findOne({ 
      patientId: { $regex: `^${prefix}\\d+$` } 
    })
      .sort({ patientId: -1 })
      .lean(),
  ]);

  let lastId = null;
  if (lastUser) lastId = lastUser.Identity;
  if (lastPatient && (!lastId || lastPatient.patientId > lastId)) {
    lastId = lastPatient.patientId;
  }

  let nextNumber = startingNumber;
  if (lastId) {
    const lastNumber = parseInt(lastId.slice(1), 10); // Remove 'C' prefix and parse number
    if (!isNaN(lastNumber) && lastNumber >= startingNumber) {
      nextNumber = lastNumber + 1;
    }
  }

  if (nextNumber > 99999) {
    throw new Error('Maximum patient IDs reached (C99999)');
  }

  return prefix + nextNumber;
};

export default generateNextPatientId;