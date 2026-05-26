import { pickSpecialistDoctorForDepartment, assignReferralToPg, getSelectedDepartmentLabel, XRAY_DATA_URL_PATTERN, MAX_XRAY_DATA_URL_LENGTH, isGeneralDepartment, normalizeLabelToDepartmentKey } from '../utils/departmentAssignment.js';

// Generic error helper used to signal HTTP-like errors from the service
class ServiceError extends Error {
  constructor(status, payload) {
    super(payload?.message || 'Service error');
    this.httpStatus = status;
    this.payload = payload;
  }
}

// Save handler for general referral-style case sheets (mirrors previous general-case logic)
const saveGeneralCase = async ({ Model, payload, user }) => {
  const {
    patientId,
    patientName,
    doctorId,
    doctorName,
    chiefComplaint,
    presentIllness,
    pastMedical,
    pastDental,
    personalHistory,
    familyHistory,
    clinicalFindings,
    provisionalDiagnosis,
    investigations,
    finalDiagnosis,
    description,
    generalDescription,
    selectedDepartments,
    treatmentPlan,
    xrayImage,
  } = payload || {};

  const requesterRole = String(user?.role || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  const requesterDepartment = String(user?.department || '').trim().toLowerCase().replace(/[\s_]+/g, '');

  if (requesterRole === 'doctor' && !['general', 'generaldentistry'].includes(requesterDepartment)) {
    throw new ServiceError(403, { success: false, message: 'Only general doctors can create referral case sheets.' });
  }

  if (!patientId || !patientName || !doctorId || !doctorName) {
    throw new ServiceError(400, { success: false, message: 'Patient and Doctor information are required' });
  }

  if (!treatmentPlan) {
    throw new ServiceError(400, { success: false, message: 'Treatment plan is required to save the General Case Sheet' });
  }

  if (!String(chiefComplaint || '').trim()) {
    throw new ServiceError(400, { success: false, message: 'Chief complaint is required to save the General Case Sheet' });
  }

  if (!Array.isArray(selectedDepartments) || selectedDepartments.length === 0) {
    throw new ServiceError(400, { success: false, message: 'Please select a specialist case sheet department.' });
  }

  const referredDepartment = getSelectedDepartmentLabel(selectedDepartments);
  const normalizedXrayImage = String(xrayImage || '').trim();

  if (normalizedXrayImage) {
    if (!XRAY_DATA_URL_PATTERN.test(normalizedXrayImage)) {
      throw new ServiceError(400, { success: false, message: 'Invalid X-ray image format. Please upload a PNG or JPEG image.' });
    }

    if (normalizedXrayImage.length > MAX_XRAY_DATA_URL_LENGTH) {
      throw new ServiceError(413, { success: false, message: 'X-ray image is too large. Please upload a smaller image.' });
    }
  }

  if (!referredDepartment || isGeneralDepartment(referredDepartment)) {
    throw new ServiceError(400, { success: false, message: 'General is not a referral case-sheet department. Please select a specialist department.' });
  }

  let specialistDoctor = null;
  if (referredDepartment) {
    // If the requester is a doctor and their department matches the target department,
    // prefer the requesting doctor as the specialist. This avoids assigning the case to
    // a different specialist who may not have PGs and prevents accidental failures.
    try {
      const requesterRole = String(user?.role || '').trim().toLowerCase();
      if (requesterRole === 'doctor') {
        const requesterDeptKey = normalizeLabelToDepartmentKey(String(user?.department || ''));
        const targetDeptKey = normalizeLabelToDepartmentKey(String(referredDepartment || ''));
        if (requesterDeptKey && requesterDeptKey === targetDeptKey) {
          // Use the requesting doctor as the specialist
          specialistDoctor = { _id: user._id, name: user.name, Identity: user.Identity };
        }
      }
    } catch (e) {
      // fall back to normal selection below
      specialistDoctor = null;
    }

    if (!specialistDoctor) {
      specialistDoctor = await pickSpecialistDoctorForDepartment(referredDepartment);
      if (!specialistDoctor) {
        throw new ServiceError(409, { success: false, message: `No specialist doctor is available in ${referredDepartment}.` });
      }
    }
  }

  const caseDoc = new Model({
    patientId,
    patientName,
    doctorId,
    doctorName,
    generalDoctorId: doctorId,
    generalDoctorName: doctorName,
    chiefComplaint,
    presentIllness,
    pastMedical,
    pastDental,
    personalHistory,
    familyHistory,
    clinicalFindings,
    provisionalDiagnosis,
    investigations,
    finalDiagnosis,
    description,
    generalDescription,
    selectedDepartments,
    treatmentPlan,
    xrayImage: normalizedXrayImage,
    referredDepartment,
    specialistDoctorId: specialistDoctor?.Identity || '',
    specialistDoctorName: specialistDoctor?.name || '',
    specialistAssignedAt: specialistDoctor ? new Date() : null,
    specialistStatus: specialistDoctor ? 'pending' : 'not-required',
    chiefApproval: ''
  });

  const { assignedPg } = await assignReferralToPg(caseDoc, specialistDoctor);
  // Do not block saving when there is no PG assigned. Save the case and leave PG fields empty.
  if (!assignedPg?._id) {
    caseDoc.assignedPgId = '';
    caseDoc.assignedPgName = '';
    // keep specialistStatus as-is (pending/not-required depending on specialistDoctor)
  } else {
    // populate assigned PG details on the case document when available
    caseDoc.assignedPgId = assignedPg._id || assignedPg.Identity || '';
    caseDoc.assignedPgName = assignedPg.name || assignedPg.Identity || '';
    caseDoc.pgAssignedAt = caseDoc.pgAssignedAt || new Date();
    caseDoc.specialistStatus = 'approved';
  }

  await caseDoc.save();

  return {
    status: 201,
    body: {
      success: true,
      message: 'General Case Sheet saved successfully',
      caseId: caseDoc._id,
      data: caseDoc,
      assignment: specialistDoctor
        ? {
            referredDepartment,
            specialistDoctorId: specialistDoctor.Identity,
            specialistDoctorName: specialistDoctor.name,
            specialistStatus: caseDoc.specialistStatus,
            assignedPgId: caseDoc.assignedPgId,
            assignedPgName: caseDoc.assignedPgName,
          }
        : { referredDepartment, specialistStatus: 'not-required' }
    }
  };
};

// Save handler for department-specific case sheets (e.g., Conservative)
const saveSpecialistCase = async ({ Model, payload, user, departmentLabel }) => {
  const {
    patientId,
    patientName,
    doctorId,
    doctorName,
    chiefComplaint,
    presentIllness,
    pastMedical,
    pastDental,
    clinicalFindings,
    provisionalDiagnosis,
    investigations,
    finalDiagnosis,
    treatmentPlan,
    xrayImage,
    digitalSignature,
    criticalMedicalIllness,
    treatmentPictures,
  } = payload || {};

  if (!patientId || !patientName) {
    throw new ServiceError(400, { success: false, message: 'Patient ID and name are required' });
  }

  const referredDepartment = departmentLabel;

  let specialistDoctor = null;
  if (referredDepartment) {
    specialistDoctor = await pickSpecialistDoctorForDepartment(referredDepartment);
    if (!specialistDoctor) {
      throw new ServiceError(409, { success: false, message: `No specialist doctor is available in ${referredDepartment}.` });
    }
  }

  const caseDoc = new Model({
    patientId,
    patientName,
    doctorId,
    doctorName,
    chiefComplaint: chiefComplaint || '',
    presentIllness: presentIllness || '',
    criticalMedicalIllness: criticalMedicalIllness || '',
    pastMedical: pastMedical || '',
    pastDental: pastDental || '',
    clinicalFindings: clinicalFindings || '',
    provisionalDiagnosis: provisionalDiagnosis || '',
    investigations: investigations || '',
    finalDiagnosis: finalDiagnosis || '',
    treatmentPlan: treatmentPlan || '',
    xrayImage: String(xrayImage || '').trim(),
    digitalSignature: digitalSignature || null,
    treatmentPictures: (() => {
      if (Array.isArray(treatmentPictures)) return treatmentPictures;
      if (!treatmentPictures) return [];
      try {
        const parsed = typeof treatmentPictures === 'string' ? JSON.parse(treatmentPictures) : treatmentPictures;
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // ignore parse errors
      }
      return [];
    })(),
    referredDepartment,
    specialistDoctorId: specialistDoctor?.Identity || '',
    specialistDoctorName: specialistDoctor?.name || '',
    specialistAssignedAt: specialistDoctor ? new Date() : null,
    specialistStatus: specialistDoctor ? 'pending' : 'not-required',
    chiefApproval: ''
  });

  const { assignedPg } = await assignReferralToPg(caseDoc, specialistDoctor);
  // For specialist case sheets (doctor-submitted), do not auto-assign PGs here.
  // Match Implant behavior: save the case sheet as-is and let assignment/approval be handled separately.
  caseDoc.assignedPgId = caseDoc.assignedPgId || '';
  caseDoc.assignedPgName = caseDoc.assignedPgName || '';

  await caseDoc.save();

  return {
    status: 201,
    body: {
      success: true,
      message: 'Case sheet saved successfully',
      caseId: caseDoc._id,
      data: caseDoc,
      assignment: specialistDoctor
        ? {
            referredDepartment,
            specialistDoctorId: specialistDoctor.Identity,
            specialistDoctorName: specialistDoctor.name,
            specialistStatus: caseDoc.specialistStatus,
            assignedPgId: caseDoc.assignedPgId,
            assignedPgName: caseDoc.assignedPgName,
          }
        : { referredDepartment, specialistStatus: 'not-required' }
    }
  };
};

export { saveGeneralCase, saveSpecialistCase, ServiceError };
