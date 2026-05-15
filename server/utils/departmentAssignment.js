import { User } from '../models/User.js';
import AssignmentState from '../models/AssignmentState.js';

// Department normalization, aliasing, and assignment helpers shared by case routes
const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '');
const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
const XRAY_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg);base64,/i;
const MAX_XRAY_DATA_URL_LENGTH = 8 * 1024 * 1024;

const GENERAL_DEPARTMENT_KEYS = new Set(['general', 'generaldentistry']);

const departmentAliasMap = {
  prosthodontics: ['prosthodontics', 'prothodontics', 'prosthondontics'],
  pedodontics: ['pedodontics'],
  periodontics: ['periodontics'],
  conservativedentistryandendodontics: ['conservativedentistryandendodontics', 'conservativedentistry', 'endodontics'],
  oralandmaxillofacial: ['oralandmaxillofacial', 'oralmaxillofacial', 'oralsurgery'],
  general: ['general', 'generaldentistry'],
};

const normalizeLabelToDepartmentKey = (departmentLabel) => {
  const normalized = normalizeDepartment(departmentLabel);

  if (normalized.startsWith('prostho') || normalized.startsWith('protho') || normalized.startsWith('prosth')) {
    return 'prosthodontics';
  }
  if (normalized === 'pedodontics') return 'pedodontics';
  if (normalized === 'periodontics') return 'periodontics';
  if (normalized.includes('conservative') || normalized.includes('endodontic')) {
    return 'conservativedentistryandendodontics';
  }
  if (normalized.includes('oral') || normalized.includes('maxillofacial')) {
    return 'oralandmaxillofacial';
  }
  if (GENERAL_DEPARTMENT_KEYS.has(normalized)) return 'general';

  return normalized;
};

const getDepartmentAliases = (departmentLabel) => {
  const departmentKey = normalizeLabelToDepartmentKey(departmentLabel);
  return departmentAliasMap[departmentKey] || [departmentKey];
};

const getSelectedDepartmentLabel = (selectedDepartments) => {
  if (Array.isArray(selectedDepartments)) {
    return String(selectedDepartments[0] || '').trim();
  }

  return String(selectedDepartments || '').trim();
};

const getNextRoundRobinStartIndex = async (key, length) => {
  if (!length) return 0;

  const state = await AssignmentState.findOneAndUpdate(
    { key },
    {
      $setOnInsert: { key },
      $inc: { counter: 1 },
    },
    { new: true, upsert: true }
  ).lean();

  const counter = typeof state?.counter === 'number' ? state.counter : 1;
  const startCounter = counter - 1;
  return ((startCounter % length) + length) % length;
};

const sortUsersForAssignment = (users) => {
  return users.sort((left, right) => {
    const leftId = String(left.Identity || '');
    const rightId = String(right.Identity || '');
    const byIdentity = leftId.localeCompare(rightId, 'en', { numeric: true, sensitivity: 'base' });
    if (byIdentity !== 0) return byIdentity;
    return String(left._id).localeCompare(String(right._id));
  });
};

const pickSpecialistDoctorForDepartment = async (departmentLabel) => {
  const aliases = getDepartmentAliases(departmentLabel);
  const doctors = await User.find(
    { role: 'doctor' },
    { _id: 1, name: 1, Identity: 1, department: 1 }
  ).lean();

  const eligibleDoctors = sortUsersForAssignment(
    doctors.filter((doctor) => {
      const departmentKey = normalizeDepartment(doctor.department);
      return !GENERAL_DEPARTMENT_KEYS.has(departmentKey) && aliases.includes(departmentKey);
    })
  );

  if (!eligibleDoctors.length) {
    return null;
  }

  const startIndex = await getNextRoundRobinStartIndex(`specialistReferral:${aliases[0]}`, eligibleDoctors.length);
  return eligibleDoctors[startIndex];
};

const pickPgForDoctor = async (doctor) => {
  const pgs = await User.find(
    { role: 'pg', createdBy: doctor._id },
    { _id: 1, name: 1, Identity: 1, department: 1 }
  ).lean();

  const eligiblePgs = sortUsersForAssignment(pgs);
  if (!eligiblePgs.length) {
    return null;
  }

  const startIndex = await getNextRoundRobinStartIndex(`pgReferral:${String(doctor._id)}`, eligiblePgs.length);
  return eligiblePgs[startIndex];
};

const findDoctorByIdentity = async (identity) => {
  const normalizedIdentity = String(identity || '').trim();
  if (!normalizedIdentity) {
    return null;
  }

  return User.findOne(
    { role: 'doctor', Identity: normalizedIdentity },
    { _id: 1, name: 1, Identity: 1, department: 1 }
  ).lean();
};

const findPgByIdentity = async (identity) => {
  const normalizedIdentity = String(identity || '').trim();
  if (!normalizedIdentity) {
    return null;
  }

  return User.findOne(
    { role: 'pg', Identity: normalizedIdentity },
    { _id: 1, name: 1, Identity: 1, department: 1 }
  ).lean();
};

const resolveSpecialistDoctorForCase = async (caseItem, preferredSpecialistDoctor = null) => {
  if (preferredSpecialistDoctor?._id) {
    return preferredSpecialistDoctor;
  }

  const existingDoctor = await findDoctorByIdentity(caseItem?.specialistDoctorId);
  if (existingDoctor?._id) {
    return existingDoctor;
  }

  const referredDepartment = caseItem?.referredDepartment || getSelectedDepartmentLabel(caseItem?.selectedDepartments);
  if (!referredDepartment || GENERAL_DEPARTMENT_KEYS.has(normalizeDepartment(referredDepartment))) {
    return null;
  }

  return pickSpecialistDoctorForDepartment(referredDepartment);
};

const assignReferralToPg = async (caseItem, preferredSpecialistDoctor = null) => {
  const referredDepartment = caseItem?.referredDepartment || getSelectedDepartmentLabel(caseItem?.selectedDepartments);
  if (!referredDepartment || GENERAL_DEPARTMENT_KEYS.has(normalizeDepartment(referredDepartment))) {
    return { specialistDoctor: null, assignedPg: null };
  }

  const specialistDoctor = await resolveSpecialistDoctorForCase(caseItem, preferredSpecialistDoctor);
  if (!specialistDoctor?._id) {
    return { specialistDoctor: null, assignedPg: null };
  }

  let assignedPg = await findPgByIdentity(caseItem?.assignedPgId);
  if (!assignedPg?._id) {
    assignedPg = await pickPgForDoctor(specialistDoctor);
  }

  if (!assignedPg?._id) {
    return { specialistDoctor, assignedPg: null };
  }

  const assignmentTimestamp = new Date();

  caseItem.referredDepartment = referredDepartment;
  caseItem.specialistDoctorId = specialistDoctor.Identity || '';
  caseItem.specialistDoctorName = specialistDoctor.name || '';
  caseItem.specialistAssignedAt = caseItem.specialistAssignedAt || assignmentTimestamp;
  caseItem.specialistStatus = 'approved';
  caseItem.specialistRescheduleReason = '';
  caseItem.specialistReviewedBy = 'System Auto-Transfer';
  caseItem.specialistReviewedAt = assignmentTimestamp;
  caseItem.assignedPgId = assignedPg.Identity || '';
  caseItem.assignedPgName = assignedPg.name || assignedPg.Identity || '';
  caseItem.pgAssignedAt = caseItem.pgAssignedAt || assignmentTimestamp;

  // end assignment updates

  return { specialistDoctor, assignedPg };
};

const isGeneralDepartment = (departmentLabel) => {
  return GENERAL_DEPARTMENT_KEYS.has(normalizeDepartment(departmentLabel));
};

export {
  normalizeDepartment,
  normalizeRole,
  XRAY_DATA_URL_PATTERN,
  MAX_XRAY_DATA_URL_LENGTH,
  getDepartmentAliases,
  getSelectedDepartmentLabel,
  pickSpecialistDoctorForDepartment,
  pickPgForDoctor,
  resolveSpecialistDoctorForCase,
  assignReferralToPg,
  isGeneralDepartment,
  normalizeLabelToDepartmentKey,
};
