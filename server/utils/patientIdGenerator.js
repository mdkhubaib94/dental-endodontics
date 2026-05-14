// server/utils/patientIdGenerator.js
import { User } from '../models/User.js';
import { PatientDetails } from '../models/patientDetails.js';

// Generate next patient ID in format YYMMXXX shared by signup and admin registration
export const generateNextPatientId = async () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2); // e.g., 26
  const mm = String(now.getMonth() + 1).padStart(2, '0'); // 01–12
  const prefix = yy + mm; // e.g., "2601"

  // Find latest IDs from both User (Identity) and PatientDetails (patientId)
  const [lastUser, lastPatient] = await Promise.all([
    User.findOne({ Identity: { $regex: `^${prefix}` }, role: 'patient' })
      .sort({ Identity: -1 })
      .lean(),
    PatientDetails.findOne({ patientId: { $regex: `^${prefix}` } })
      .sort({ patientId: -1 })
      .lean(),
  ]);

  let lastId = null;
  if (lastUser) lastId = lastUser.Identity;
  if (lastPatient && (!lastId || lastPatient.patientId > lastId)) {
    lastId = lastPatient.patientId;
  }

  let nextSeq = 1;
  if (lastId) {
    const lastSeq = parseInt(lastId.slice(4), 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  if (nextSeq > 999) {
    throw new Error('Maximum patient IDs for this month reached (999)');
  }

  const seqStr = String(nextSeq).padStart(3, '0');
  return prefix + seqStr;
};

export default generateNextPatientId;
