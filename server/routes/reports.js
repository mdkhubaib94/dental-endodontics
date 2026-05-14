import express from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { User } from '../models/User.js';

const router = express.Router();

const departmentConfig = [
  { key: 'pedodontics', label: 'Pedodontics', modelPath: '../models/PedodonticsCase.js' },
  { key: 'completeDenture', label: 'Complete Denture', modelPath: '../models/CompleteDentureCase.js' },
  { key: 'fpd', label: 'Fixed Partial Denture', modelPath: '../models/Fpd-model.js' },
  { key: 'implant', label: 'Implant', modelPath: '../models/Implant-model.js' },
  { key: 'implantPatient', label: 'Implant Patient', modelPath: '../models/ImplantPatient-model.js' },
  { key: 'partial', label: 'Partial Denture', modelPath: '../models/partial-model.js' }
];

const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '');

const chiefDepartmentScopeMap = {
  pedodontics: ['pedodontics'],
  prosthodontics: ['completeDenture', 'fpd', 'implant', 'implantPatient', 'partial'],
  prothodontics: ['completeDenture', 'fpd', 'implant', 'implantPatient', 'partial'],
  prosthondontics: ['completeDenture', 'fpd', 'implant', 'implantPatient', 'partial'],
  completedenture: ['completeDenture'],
  fixedpartialdenture: ['fpd'],
  fpd: ['fpd'],
  implant: ['implant'],
  implantology: ['implant', 'implantPatient'],
  implantpatient: ['implantPatient'],
  partialdenture: ['partial']
};

const billingDepartmentKeyMap = {
  pedodontics: 'pedodontics',
  completeDenture: 'complete_denture',
  fpd: 'fpd',
  implant: 'implant',
  implantPatient: 'implant_patient',
  partial: 'partial_denture',
};

const getAllowedDepartmentKeysForUser = (user) => {
  const role = normalizeRole(user?.role);
  if (role !== 'chief' && role !== 'chief-doctor') {
    return null;
  }

  const normalizedDepartment = normalizeDepartment(user?.department);
  const allowed = chiefDepartmentScopeMap[normalizedDepartment] || [];
  return Array.from(new Set(allowed));
};

const getDepartmentKeysForDepartmentName = (departmentName) => {
  const normalized = normalizeDepartment(departmentName);
  const allowed = chiefDepartmentScopeMap[normalized] || [];
  return allowed.length ? Array.from(new Set(allowed)) : null;
};

const getDateWindow = (period, dateParam) => {
  const baseDate = dateParam ? new Date(dateParam) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    throw new Error('Invalid date parameter');
  }

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  if (period === 'daily') {
    const start = new Date(year, month, day);
    const end = new Date(year, month, day + 1);
    return { start, end };
  }

  if (period === 'weekly') {
    const normalized = new Date(year, month, day);
    const dayOfWeek = normalized.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(normalized);
    start.setDate(normalized.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  if (period === 'monthly') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return { start, end };
  }

  if (period === 'yearly') {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { start, end };
  }

  throw new Error('Invalid period. Use daily, weekly, monthly, or yearly.');
};

const getChiefDoctorScope = async (user) => {
  if (!user || (user.role !== 'chief' && user.role !== 'chief-doctor')) {
    return null;
  }

  const assignedDoctors = await User.find({
    createdBy: user._id,
    role: { $in: ['doctor', 'chief-doctor'] }
  }).select('Identity -_id');

  const doctorIdentities = assignedDoctors
    .map((doctor) => doctor?.Identity)
    .filter(Boolean);

  if (user.Identity) {
    doctorIdentities.push(user.Identity);
  }

  return Array.from(new Set(doctorIdentities));
};

const normalizePatientId = (value) => String(value ?? '').trim().toLowerCase();

const classifyGender = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'male' || normalized === 'm') return 'male';
  if (normalized === 'female' || normalized === 'f') return 'female';
  return 'other';
};

const classifyApprovalStatus = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'pending';
  if (normalized === 'pending') return 'pending';
  if (normalized === 'approved') return 'approved';
  if (normalized.startsWith('redo') || normalized.startsWith('resend') || normalized.startsWith('rejected')) {
    return 'rejected';
  }
  // Treat any other non-empty state as rejection/redo.
  return 'rejected';
};

const getDateRangeOrDefaultToday = (fromParam, toParam) => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const start = parseDateOnlyOrThrow(String(fromParam || todayIso).trim(), 'from');
  const endInclusive = parseDateOnlyOrThrow(String(toParam || fromParam || todayIso).trim(), 'to');
  if (start > endInclusive) {
    throw new Error("'from' date cannot be later than 'to' date");
  }

  const endExclusive = new Date(endInclusive);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { start, endExclusive };
};

const loadDepartmentModels = async (allowedDepartmentKeys = null) => {
  const scopedDepartmentConfig = Array.isArray(allowedDepartmentKeys)
    ? departmentConfig.filter((dept) => allowedDepartmentKeys.includes(dept.key))
    : departmentConfig;

  const modelEntries = await Promise.all(
    scopedDepartmentConfig.map(async (dept) => {
      const model = (await import(dept.modelPath)).default;
      return { ...dept, model };
    })
  );

  return modelEntries;
};

const getPatientBreakdown = async ({ start, endExclusive, patientIds }) => {
  const { PatientDetails } = await import('../models/patientDetails.js');
  const patients = await getPatientsByNormalizedIds(PatientDetails, patientIds);

  let malePatients = 0;
  let femalePatients = 0;
  let newPatients = 0;
  let oldPatients = 0;

  patients.forEach((patient) => {
    const gender = classifyGender(patient?.personalInfo?.gender);
    const createdAt = patient?.createdAt ? new Date(patient.createdAt) : null;
    if (gender === 'male') malePatients += 1;
    else if (gender === 'female') femalePatients += 1;

    if (createdAt && createdAt >= start && createdAt < endExclusive) newPatients += 1;
    else oldPatients += 1;
  });

  return { malePatients, femalePatients, newPatients, oldPatients };
};

const computeCaseAndPatientStats = async ({
  modelEntries,
  start,
  endExclusive,
  doctorScope,
}) => {
  const approvalCounts = { approved: 0, rejected: 0, pending: 0 };
  const patientSet = new Set();
  let totalCaseSheets = 0;

  await Promise.all(
    modelEntries.map(async (dept) => {
      const query = { createdAt: { $gte: start, $lt: endExclusive } };
      if (Array.isArray(doctorScope) && doctorScope.length) {
        query.doctorId = { $in: doctorScope };
      }

      const rows = await dept.model
        .find(query)
        .select('patientId chiefApproval -_id')
        .lean();

      totalCaseSheets += rows.length;

      rows.forEach((row) => {
        const pid = normalizePatientId(row?.patientId);
        if (pid) patientSet.add(pid);

        const status = classifyApprovalStatus(row?.chiefApproval);
        approvalCounts[status] += 1;
      });
    })
  );

  const patientIds = Array.from(patientSet);
  const patientBreakdown = await getPatientBreakdown({
    start,
    endExclusive,
    patientIds,
  });

  return {
    uniquePatients: patientIds.length,
    totalCaseSheets,
    approvalCounts,
    ...patientBreakdown,
  };
};

const getPatientsByNormalizedIds = async (PatientDetails, ids) => {
  const normalizedIds = Array.from(new Set(ids.map(normalizePatientId).filter(Boolean)));
  if (!normalizedIds.length) return [];

  return PatientDetails.aggregate([
    {
      $addFields: {
        __pidNorm: {
          $toLower: {
            $trim: { input: '$patientId' }
          }
        }
      }
    },
    {
      $match: {
        __pidNorm: { $in: normalizedIds }
      }
    },
    {
      $project: {
        patientId: 1,
        personalInfo: 1,
        createdAt: 1
      }
    }
  ]);
};

const buildDepartmentBreakdownReport = async ({ start, end, doctorScope = null, allowedDepartmentKeys = null }) => {
  const { PatientDetails } = await import('../models/patientDetails.js');

  const scopedDepartmentConfig = Array.isArray(allowedDepartmentKeys)
    ? departmentConfig.filter((dept) => allowedDepartmentKeys.includes(dept.key))
    : departmentConfig;

  const modelEntries = await Promise.all(
    scopedDepartmentConfig.map(async (dept) => {
      const model = (await import(dept.modelPath)).default;
      return { ...dept, model };
    })
  );

  const caseSheetCounts = {};
  const departmentBreakdown = [];
  const overallPatientSet = new Set();

  for (const dept of modelEntries) {
    const query = { createdAt: { $gte: start, $lt: end } };
    if (Array.isArray(doctorScope)) {
      query.doctorId = { $in: doctorScope };
    }

    const [caseCount, records] = await Promise.all([
      dept.model.countDocuments(query),
      dept.model.find(query).select('patientId -_id')
    ]);

    caseSheetCounts[dept.key] = caseCount || 0;

    // Get UNIQUE patient IDs for this department
    const patientIds = Array.from(new Set(records.map((record) => normalizePatientId(record?.patientId)).filter(Boolean)));

    // Add to overall set of unique patients
    patientIds.forEach((id) => overallPatientSet.add(id));

    let malePatients = 0;
    let femalePatients = 0;
    let newPatients = 0;
    let oldPatients = 0;

    // Count unique patients only (patient visits, not case sheets)
    if (patientIds.length > 0) {
      const patients = await getPatientsByNormalizedIds(PatientDetails, patientIds);

      // Count each UNIQUE patient once
      patients.forEach((patient) => {
        const gender = classifyGender(patient?.personalInfo?.gender);
        const createdAt = patient?.createdAt ? new Date(patient.createdAt) : null;

        // Count by gender - each unique patient counted once
        if (gender === 'male') malePatients += 1;
        else if (gender === 'female') femalePatients += 1;

        // Count new vs old - each unique patient counted once
        if (createdAt && createdAt >= start && createdAt < end) newPatients += 1;
        else oldPatients += 1;
      });

      if (patients.length !== patientIds.length) {
        console.warn(`[${dept.label}] Patient mapping mismatch: case-sheet IDs=${patientIds.length}, matched details=${patients.length}`);
      }
    }

    departmentBreakdown.push({
      key: dept.key,
      department: dept.label,
      totalPatients: patientIds.length,
      malePatients,
      femalePatients,
      newPatients,
      oldPatients,
      totalCaseSheets: caseCount || 0
    });
  }

  // Count overall UNIQUE patients only (patient visits)
  let malePatients = 0;
  let femalePatients = 0;
  let newPatientsVisited = 0;
  let oldPatientsVisited = 0;

  const overallIds = Array.from(overallPatientSet);
  
  if (overallIds.length > 0) {
    const overallPatients = await getPatientsByNormalizedIds(PatientDetails, overallIds);

    // Count each UNIQUE patient once
    overallPatients.forEach((patient) => {
      const gender = classifyGender(patient?.personalInfo?.gender);
      const createdAt = patient?.createdAt ? new Date(patient.createdAt) : null;

      if (gender === 'male') malePatients += 1;
      else if (gender === 'female') femalePatients += 1;

      if (createdAt && createdAt >= start && createdAt < end) newPatientsVisited += 1;
      else oldPatientsVisited += 1;
    });

    if (overallPatients.length !== overallIds.length) {
      console.warn(`Overall patient mapping mismatch: case-sheet IDs=${overallIds.length}, matched details=${overallPatients.length}`);
    }
  }

  const totalCaseSheets = Object.values(caseSheetCounts).reduce((sum, val) => sum + (val || 0), 0);

  return {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    uniqueSeenCount: overallPatientSet.size,
    malePatients,
    femalePatients,
    newPatientsVisited,
    oldPatientsVisited,
    totalCaseSheets,
    caseSheetCounts,
    departmentBreakdown
  };
};

const parseDateOnlyOrThrow = (value, label) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} date`);
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

// GET /api/reports/pg/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns analytics for the currently logged-in PG/UG for a date range.
router.get('/pg/analytics', auth, requireRole(['pg', 'ug']), async (req, res) => {
  try {
    const pgIdentity = String(req.user?.Identity || '').trim();
    if (!pgIdentity) {
      return res.status(400).json({
        success: false,
        message: 'PG/UG Identity not found on account',
      });
    }

    const { start, endExclusive } = getDateRangeOrDefaultToday(req.query.from, req.query.to);
    const allowedDepartmentKeys = getDepartmentKeysForDepartmentName(req.user?.department);
    const modelEntries = await loadDepartmentModels(allowedDepartmentKeys);

    const stats = await computeCaseAndPatientStats({
      modelEntries,
      start,
      endExclusive,
      doctorScope: [pgIdentity],
    });

    return res.json({
      success: true,
      windowStart: start.toISOString(),
      windowEnd: endExclusive.toISOString(),
      pgIdentity,
      department: req.user?.department || '',
      ...stats,
    });
  } catch (error) {
    console.error('PG analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate PG analytics',
    });
  }
});

// GET /api/reports/doctor/pg-analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns analytics for all PGs assigned to the currently logged-in doctor within a date range.
router.get('/doctor/pg-analytics', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { start, endExclusive } = getDateRangeOrDefaultToday(req.query.from, req.query.to);

    const assignedStudents = await User.find(
      { role: { $in: ['pg', 'ug'] }, createdBy: req.user._id },
      { _id: 1, name: 1, Identity: 1, department: 1, role: 1 }
    ).lean();

    const studentIdentities = assignedStudents
      .map((student) => String(student.Identity || '').trim())
      .filter(Boolean);

    const assignedPGCount = assignedStudents.filter((s) => s.role === 'pg').length;
    const assignedUGCount = assignedStudents.filter((s) => s.role === 'ug').length;

    if (!studentIdentities.length) {
      return res.json({
        success: true,
        windowStart: start.toISOString(),
        windowEnd: endExclusive.toISOString(),
        assignedPGCount,
        assignedUGCount,
        totals: {
          uniquePatients: 0,
          malePatients: 0,
          femalePatients: 0,
          newPatients: 0,
          oldPatients: 0,
          totalCaseSheets: 0,
          approvalCounts: { approved: 0, rejected: 0, pending: 0 },
        },
        students: [],
        pgs: [],
      });
    }

    const allowedDepartmentKeys = getDepartmentKeysForDepartmentName(req.user?.department);
    const modelEntries = await loadDepartmentModels(allowedDepartmentKeys);

    // Pull all cases for all assigned students (PG + UG), then compute per-student breakdown.
    const allCasesByStudent = new Map();
    studentIdentities.forEach((id) => allCasesByStudent.set(id, []));

    await Promise.all(
      modelEntries.map(async (dept) => {
        const rows = await dept.model
          .find({
            doctorId: { $in: studentIdentities },
            createdAt: { $gte: start, $lt: endExclusive },
          })
          .select('doctorId patientId chiefApproval createdAt')
          .lean();

        rows.forEach((row) => {
          const doctorId = String(row?.doctorId || '').trim();
          if (!doctorId) return;
          if (!allCasesByStudent.has(doctorId)) allCasesByStudent.set(doctorId, []);
          allCasesByStudent.get(doctorId).push(row);
        });
      })
    );

    const { PatientDetails } = await import('../models/patientDetails.js');

    // Build a single patient lookup for all assigned students in this window.
    const overallPatientSet = new Set();
    allCasesByStudent.forEach((rows) => {
      rows.forEach((row) => {
        const pid = normalizePatientId(row?.patientId);
        if (pid) overallPatientSet.add(pid);
      });
    });

    const allPatientIds = Array.from(overallPatientSet);
    const patientDetails = await getPatientsByNormalizedIds(PatientDetails, allPatientIds);
    const patientLookup = new Map(patientDetails.map((p) => [normalizePatientId(p.patientId), p]));

    const perStudent = assignedStudents.map((student) => {
      const identity = String(student.Identity || '').trim();
      const rows = allCasesByStudent.get(identity) || [];

      const approvalCounts = { approved: 0, rejected: 0, pending: 0 };
      const patientSet = new Set();
      rows.forEach((row) => {
        const pid = normalizePatientId(row?.patientId);
        if (pid) patientSet.add(pid);
        approvalCounts[classifyApprovalStatus(row?.chiefApproval)] += 1;
      });

      let malePatients = 0;
      let femalePatients = 0;
      let newPatients = 0;
      let oldPatients = 0;

      Array.from(patientSet).forEach((pid) => {
        const patient = patientLookup.get(pid);
        const gender = classifyGender(patient?.personalInfo?.gender);
        const createdAt = patient?.createdAt ? new Date(patient.createdAt) : null;

        if (gender === 'male') malePatients += 1;
        else if (gender === 'female') femalePatients += 1;

        if (createdAt && createdAt >= start && createdAt < endExclusive) newPatients += 1;
        else oldPatients += 1;
      });

      const name = student.name || identity;

      return {
        identity,
        name,
        role: student.role || '',
        department: student.department || '',
        uniquePatients: patientSet.size,
        malePatients,
        femalePatients,
        newPatients,
        oldPatients,
        totalCaseSheets: rows.length,
        approvalCounts,

        // Backward-compatible keys used by existing client screens.
        pgIdentity: identity,
        pgName: name,
      };
    });

    const totals = perStudent.reduce(
      (acc, row) => {
        acc.uniquePatients += row.uniquePatients;
        acc.malePatients += row.malePatients;
        acc.femalePatients += row.femalePatients;
        acc.newPatients += row.newPatients;
        acc.oldPatients += row.oldPatients;
        acc.totalCaseSheets += row.totalCaseSheets;
        acc.approvalCounts.approved += row.approvalCounts.approved;
        acc.approvalCounts.rejected += row.approvalCounts.rejected;
        acc.approvalCounts.pending += row.approvalCounts.pending;
        return acc;
      },
      {
        uniquePatients: 0,
        malePatients: 0,
        femalePatients: 0,
        newPatients: 0,
        oldPatients: 0,
        totalCaseSheets: 0,
        approvalCounts: { approved: 0, rejected: 0, pending: 0 },
      }
    );

    return res.json({
      success: true,
      windowStart: start.toISOString(),
      windowEnd: endExclusive.toISOString(),
      assignedPGCount,
      assignedUGCount,
      totals,
      students: perStudent,
      pgs: perStudent,
    });
  } catch (error) {
    console.error('Doctor PG analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate doctor PG analytics',
    });
  }
});

// GET /api/reports/chief/department-analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns overall department analytics for the chief doctor, scoped to their department.
router.get('/chief/department-analytics', auth, requireRole(['chief', 'chief-doctor']), async (req, res) => {
  try {
    const { start, endExclusive } = getDateRangeOrDefaultToday(req.query.from, req.query.to);
    const allowedDepartmentKeys = getAllowedDepartmentKeysForUser(req.user);

    if (Array.isArray(allowedDepartmentKeys) && !allowedDepartmentKeys.length) {
      return res.status(403).json({
        success: false,
        message: 'No department is assigned to this chief doctor account',
      });
    }

    const assignedDoctors = await User.find(
      {
        createdBy: req.user._id,
        role: { $in: ['doctor'] },
        ...(req.user?.department ? { department: req.user.department } : {}),
      },
      { _id: 1, name: 1, Identity: 1, department: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    const doctorIdentityScope = assignedDoctors
      .map((doctor) => String(doctor.Identity || '').trim())
      .filter(Boolean);

    if (req.user?.Identity) {
      doctorIdentityScope.push(String(req.user.Identity).trim());
    }

    const uniqueDoctorIdentities = Array.from(new Set(doctorIdentityScope));

    const doctorDbIds = assignedDoctors.map((d) => d._id).filter(Boolean);
    if (req.user?._id) doctorDbIds.push(req.user._id);

    const assignedPgs = doctorDbIds.length
      ? await User.find(
          { role: 'pg', createdBy: { $in: doctorDbIds } },
          { _id: 1, name: 1, Identity: 1, createdBy: 1 }
        ).lean()
      : [];

    const assignedUgs = doctorDbIds.length
      ? await User.find(
          { role: 'ug', createdBy: { $in: doctorDbIds } },
          { _id: 1, name: 1, Identity: 1, createdBy: 1 }
        ).lean()
      : [];

    const pgIdentities = assignedPgs
      .map((pg) => String(pg.Identity || '').trim())
      .filter(Boolean);

    const ugIdentities = assignedUgs
      .map((ug) => String(ug.Identity || '').trim())
      .filter(Boolean);

    const pgCountByDoctorDbId = new Map();
    assignedPgs.forEach((pg) => {
      const key = String(pg.createdBy || '');
      if (!key) return;
      pgCountByDoctorDbId.set(key, (pgCountByDoctorDbId.get(key) || 0) + 1);
    });

    const ugCountByDoctorDbId = new Map();
    assignedUgs.forEach((ug) => {
      const key = String(ug.createdBy || '');
      if (!key) return;
      ugCountByDoctorDbId.set(key, (ugCountByDoctorDbId.get(key) || 0) + 1);
    });

    const doctorsWithPgCount = assignedDoctors.map((doctor) => ({
      doctorId: doctor.Identity || '',
      doctorName: doctor.name || doctor.Identity || '',
      department: doctor.department || '',
      pgCount: pgCountByDoctorDbId.get(String(doctor._id)) || 0,
      ugCount: ugCountByDoctorDbId.get(String(doctor._id)) || 0,
    }));

    const identityScope = Array.from(new Set([...uniqueDoctorIdentities, ...pgIdentities, ...ugIdentities]));
    const modelEntries = await loadDepartmentModels(allowedDepartmentKeys);

    const deptReport = await buildDepartmentBreakdownReport({
      start,
      end: endExclusive,
      doctorScope: identityScope.length ? identityScope : null,
      allowedDepartmentKeys,
    });

    const approvalStats = await computeCaseAndPatientStats({
      modelEntries,
      start,
      endExclusive,
      doctorScope: identityScope.length ? identityScope : null,
    });

    // Billing totals for department.
    const Bill = (await import('../models/bill-model.js')).default;
    const billingDepts = (Array.isArray(allowedDepartmentKeys) ? allowedDepartmentKeys : departmentConfig.map((d) => d.key))
      .map((key) => billingDepartmentKeyMap[key])
      .filter(Boolean);

    const billingAgg = billingDepts.length
      ? await Bill.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lt: endExclusive },
              'cases.department': { $in: billingDepts },
            },
          },
          {
            $group: {
              _id: null,
              billCount: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
            },
          },
        ])
      : [];

    const billing = {
      billCount: billingAgg?.[0]?.billCount || 0,
      totalAmount: billingAgg?.[0]?.totalAmount || 0,
    };

    return res.json({
      success: true,
      windowStart: start.toISOString(),
      windowEnd: endExclusive.toISOString(),
      department: req.user?.department || '',
      totalDoctors: assignedDoctors.length + (req.user?.Identity ? 1 : 0),
      totalPGs: assignedPgs.length,
      totalUGs: assignedUgs.length,
      doctors: doctorsWithPgCount,
      billing,
      // Patient + case-sheet breakdown for the department
      ...deptReport,
      // Approval/rejection counts (and duplicates of patient stats from computeCaseAndPatientStats)
      approvalCounts: approvalStats.approvalCounts,
      totalCaseSheetsWithApprovalField: approvalStats.totalCaseSheets,
    });
  } catch (error) {
    console.error('Chief department analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate department analytics',
    });
  }
});

// GET /api/reports/chief/doctor-analytics?doctorIdentity=ID&from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns analytics for a SINGLE doctor assigned to the chief within a date range.
router.get('/chief/doctor-analytics', auth, requireRole(['chief', 'chief-doctor']), async (req, res) => {
  try {
    const doctorIdentity = String(req.query.doctorIdentity || '').trim();
    if (!doctorIdentity) {
      return res.status(400).json({
        success: false,
        message: 'doctorIdentity is required'
      });
    }

    const fromParam = String(req.query.from || '').trim();
    const toParam = String(req.query.to || '').trim();
    const todayIso = new Date().toISOString().slice(0, 10);

    const start = parseDateOnlyOrThrow(fromParam || todayIso, 'from');
    const endInclusive = parseDateOnlyOrThrow(toParam || fromParam || todayIso, 'to');
    if (start > endInclusive) {
      return res.status(400).json({
        success: false,
        message: "'from' date cannot be later than 'to' date"
      });
    }

    const endExclusive = new Date(endInclusive);
    endExclusive.setDate(endExclusive.getDate() + 1);

    const allowedScope = await getChiefDoctorScope(req.user);
    const allowedDepartmentKeys = getAllowedDepartmentKeysForUser(req.user);

    if (Array.isArray(allowedDepartmentKeys) && !allowedDepartmentKeys.length) {
      return res.status(403).json({
        success: false,
        message: 'No department is assigned to this chief doctor account'
      });
    }

    if (!Array.isArray(allowedScope) || !allowedScope.length) {
      return res.status(403).json({
        success: false,
        message: 'No assigned doctors found for this chief doctor'
      });
    }

    if (!allowedScope.includes(doctorIdentity)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for the requested doctor'
      });
    }

    const doctorUser = await User.findOne({ Identity: doctorIdentity })
      .select('_id')
      .lean();

    const doctorDbId = doctorUser?._id;

    const [assignedPGCount, assignedUGCount] = doctorDbId
      ? await Promise.all([
          User.countDocuments({ role: 'pg', createdBy: doctorDbId }),
          User.countDocuments({ role: 'ug', createdBy: doctorDbId }),
        ])
      : [0, 0];

    const report = await buildDepartmentBreakdownReport({
      start,
      end: endExclusive,
      doctorScope: [doctorIdentity],
      allowedDepartmentKeys
    });

    return res.json({
      success: true,
      doctorIdentity,
      assignedPGCount,
      assignedUGCount,
      ...report,
      totalPatientsVisited: report.uniqueSeenCount
    });
  } catch (error) {
    console.error('Chief doctor analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate doctor analytics'
    });
  }
});

// GET /api/reports/weekly
// Supports optional ?weeks=N (default 1) to fetch multiple past weeks.
router.get('/weekly', auth, requireRole(['admin', 'chief', 'chief-doctor', 'doctor']), async (req, res) => {
  try {
    const { PatientDetails } = await import('../models/patientDetails.js');
    const PedodonticsCase = (await import('../models/PedodonticsCase.js')).default;
    const CompleteDentureCase = (await import('../models/CompleteDentureCase.js')).default;
    const Fpd = (await import('../models/Fpd-model.js')).default;
    const Implant = (await import('../models/Implant-model.js')).default;
    const ImplantPatientCase = (await import('../models/ImplantPatient-model.js')).default;
    const Partial = (await import('../models/partial-model.js')).default;

    // Allow up to 52 weeks for yearly/monthly aggregation
    const weeksRequested = Math.max(1, Math.min(parseInt(req.query.weeks, 10) || 1, 52));
    const now = new Date();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const allowedDepartmentKeys = getAllowedDepartmentKeysForUser(req.user);

    if (Array.isArray(allowedDepartmentKeys) && !allowedDepartmentKeys.length) {
      return res.status(403).json({
        success: false,
        message: 'No department is assigned to this chief doctor account'
      });
    }

    const canUseDepartment = (key) => {
      if (!Array.isArray(allowedDepartmentKeys)) return true;
      return allowedDepartmentKeys.includes(key);
    };

    const buildWeekPayload = async (start, end) => {
      // New patients registered in window
      const newPatients = await PatientDetails.countDocuments({ createdAt: { $gte: start, $lt: end } });

      // Case sheet counts per department in window
      const [pedCount, completeDentureCount, fpdCount, implantCount, implantPatientCount, partialCount] = await Promise.all([
        canUseDepartment('pedodontics') ? PedodonticsCase.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
        canUseDepartment('completeDenture') ? CompleteDentureCase.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
        canUseDepartment('fpd') ? Fpd.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
        canUseDepartment('implant') ? Implant.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
        canUseDepartment('implantPatient') ? ImplantPatientCase.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
        canUseDepartment('partial') ? Partial.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0
      ]);

      console.log(`Case sheet counts - Implant: ${implantCount}, ImplantPatient: ${implantPatientCount}`);


      // Combine implant counts for legacy field, but also expose implantPatient separately
      const totalImplantCount = implantCount + implantPatientCount;

      // Unique patientIds seen in case-sheets in window
      const idsArrays = await Promise.all([
        canUseDepartment('pedodontics') ? PedodonticsCase.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
        canUseDepartment('completeDenture') ? CompleteDentureCase.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
        canUseDepartment('fpd') ? Fpd.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
        canUseDepartment('implant') ? Implant.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
        canUseDepartment('implantPatient') ? ImplantPatientCase.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
        canUseDepartment('partial') ? Partial.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : []
      ]);

      const idSet = new Set();
      idsArrays.forEach(list => {
        list.forEach(item => {
          if (!item || !item.patientId) return;
          idSet.add(String(item.patientId));
        });
      });

      const uniqueSeen = Array.from(idSet);

      let newAmongSeen = 0;
      if (uniqueSeen.length) {
        newAmongSeen = await PatientDetails.countDocuments({ patientId: { $in: uniqueSeen }, createdAt: { $gte: start, $lt: end } });
      }

      const uniqueSeenCount = uniqueSeen.length;
      const returningPatients = Math.max(0, uniqueSeenCount - newAmongSeen);

      // Get gender breakdown for patients who visited (had case sheets)
      let maleCount = 0;
      let femaleCount = 0;
      let newPatientsCount = 0;
      let oldPatientsCount = 0;

      if (uniqueSeen.length) {
        const patientDetails = await PatientDetails.find({ patientId: { $in: uniqueSeen } }).select('patientId personalInfo createdAt');
        
        console.log(`Found ${patientDetails.length} patient details for ${uniqueSeen.length} unique patient IDs`);
        
        patientDetails.forEach(patient => {
          // Count by gender
          const gender = patient.personalInfo?.gender;
          console.log(`Patient ${patient.patientId}: gender=${gender}, created=${patient.createdAt}`);
          
          if (gender === 'Male') {
            maleCount++;
          } else if (gender === 'Female') {
            femaleCount++;
          }

          // Count new vs old patients - every patient must be counted as either new or old
          const patientCreatedDate = new Date(patient.createdAt);
          if (patientCreatedDate >= start && patientCreatedDate < end) {
            newPatientsCount++;
          } else {
            // All other patients (created before period or invalid dates) are old
            oldPatientsCount++;
          }
        });
        
        console.log(`Gender counts - Male: ${maleCount}, Female: ${femaleCount}`);
        console.log(`Patient type counts - New: ${newPatientsCount}, Old: ${oldPatientsCount}`);
      }

      return {
        weekStart: start.toISOString(),
        weekEnd: end.toISOString(),
        newPatients,
        returningPatients,
        uniqueSeenCount,
        malePatients: maleCount,
        femalePatients: femaleCount,
        newPatientsVisited: newPatientsCount,
        oldPatientsVisited: oldPatientsCount,
        caseSheetCounts: {
          pedodontics: pedCount,
          completeDenture: completeDentureCount,
          fpd: fpdCount,
          implant: implantCount, // show implant and implantPatient separately
          implantPatient: implantPatientCount,
          partial: partialCount
        },
        // For backward compatibility, keep totalImplantCount if needed elsewhere
        totalImplantCount
      };
    };

    // Build weeks array: index 0 = latest week (last 7 days), then previous weeks
    const weekPromises = [];
    for (let i = 0; i < weeksRequested; i += 1) {
      const end = new Date(now.getTime() - i * oneWeekMs);
      const start = new Date(end.getTime() - oneWeekMs);
      weekPromises.push(buildWeekPayload(start, end));
    }

    const weeks = await Promise.all(weekPromises);
    const latest = weeks[0] || null;

    res.json({
      success: true,
      weeks,
      // keep legacy fields for existing consumers (latest week)
      ...(latest || {})
    });
  } catch (error) {
    console.error('Weekly reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate weekly report', error: error.message });
  }
});

// GET /api/reports/today
// Uses the same logic as weekly reports but for the current day only
router.get('/today', auth, requireRole(['admin', 'chief', 'chief-doctor', 'doctor']), async (req, res) => {
  try {
    const { PatientDetails } = await import('../models/patientDetails.js');
    const PedodonticsCase = (await import('../models/PedodonticsCase.js')).default;
    const CompleteDentureCase = (await import('../models/CompleteDentureCase.js')).default;
    const Fpd = (await import('../models/Fpd-model.js')).default;
    const Implant = (await import('../models/Implant-model.js')).default;
    const ImplantPatientCase = (await import('../models/ImplantPatient-model.js')).default;
    const Partial = (await import('../models/partial-model.js')).default;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const allowedDepartmentKeys = getAllowedDepartmentKeysForUser(req.user);

    if (Array.isArray(allowedDepartmentKeys) && !allowedDepartmentKeys.length) {
      return res.status(403).json({
        success: false,
        message: 'No department is assigned to this chief doctor account'
      });
    }

    const canUseDepartment = (key) => {
      if (!Array.isArray(allowedDepartmentKeys)) return true;
      return allowedDepartmentKeys.includes(key);
    };

    // Reuse the same logic as buildWeekPayload but inline for this day window
    const newPatients = await PatientDetails.countDocuments({ createdAt: { $gte: start, $lt: end } });

    const [pedCount, completeDentureCount, fpdCount, implantCount, implantPatientCount, partialCount] = await Promise.all([
      canUseDepartment('pedodontics') ? PedodonticsCase.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
      canUseDepartment('completeDenture') ? CompleteDentureCase.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
      canUseDepartment('fpd') ? Fpd.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
      canUseDepartment('implant') ? Implant.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
      canUseDepartment('implantPatient') ? ImplantPatientCase.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0,
      canUseDepartment('partial') ? Partial.countDocuments({ createdAt: { $gte: start, $lt: end } }) : 0
    ]);

    const idsArrays = await Promise.all([
      canUseDepartment('pedodontics') ? PedodonticsCase.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
      canUseDepartment('completeDenture') ? CompleteDentureCase.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
      canUseDepartment('fpd') ? Fpd.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
      canUseDepartment('implant') ? Implant.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
      canUseDepartment('implantPatient') ? ImplantPatientCase.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : [],
      canUseDepartment('partial') ? Partial.find({ createdAt: { $gte: start, $lt: end } }).select('patientId -_id') : []
    ]);

    const idSet = new Set();
    idsArrays.forEach(list => {
      list.forEach(item => {
        if (!item || !item.patientId) return;
        idSet.add(String(item.patientId));
      });
    });

    const uniqueSeen = Array.from(idSet);

    let newAmongSeen = 0;
    if (uniqueSeen.length) {
      newAmongSeen = await PatientDetails.countDocuments({ patientId: { $in: uniqueSeen }, createdAt: { $gte: start, $lt: end } });
    }

    const uniqueSeenCount = uniqueSeen.length;
    const returningPatients = Math.max(0, uniqueSeenCount - newAmongSeen);

    let maleCount = 0;
    let femaleCount = 0;
    let newPatientsVisited = 0;
    let oldPatientsVisited = 0;

    if (uniqueSeen.length) {
      const patientDetails = await PatientDetails.find({ patientId: { $in: uniqueSeen } }).select('patientId personalInfo createdAt');

      patientDetails.forEach(patient => {
        const gender = patient.personalInfo?.gender;
        if (gender === 'Male') maleCount++;
        else if (gender === 'Female') femaleCount++;

        // Count new vs old patients - every patient must be counted as either new or old
        const createdAt = new Date(patient.createdAt);
        if (createdAt >= start && createdAt < end) {
          newPatientsVisited++;
        } else {
          // All other patients (created before period or invalid dates) are old
          oldPatientsVisited++;
        }
      });
    }

    res.json({
      success: true,
      period: 'today',
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      newPatients,
      returningPatients,
      uniqueSeenCount,
      malePatients: maleCount,
      femalePatients: femaleCount,
      newPatientsVisited,
      oldPatientsVisited,
      caseSheetCounts: {
        pedodontics: pedCount,
        completeDenture: completeDentureCount,
        fpd: fpdCount,
        implant: implantCount,
        implantPatient: implantPatientCount,
        partial: partialCount
      }
    });
  } catch (error) {
    console.error('Today reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate today report', error: error.message });
  }
});

// GET /api/reports/advanced?period=daily|weekly|monthly|yearly&date=YYYY-MM-DD
router.get('/advanced', auth, requireRole(['admin', 'chief', 'chief-doctor', 'doctor']), async (req, res) => {
  try {
    const period = String(req.query.period || 'daily').toLowerCase();
    const { start, end } = getDateWindow(period, req.query.date);
    const doctorScope = await getChiefDoctorScope(req.user);
    const allowedDepartmentKeys = getAllowedDepartmentKeysForUser(req.user);

    if (Array.isArray(allowedDepartmentKeys) && !allowedDepartmentKeys.length) {
      return res.status(403).json({
        success: false,
        message: 'No department is assigned to this chief doctor account'
      });
    }

    const report = await buildDepartmentBreakdownReport({
      start,
      end,
      doctorScope,
      allowedDepartmentKeys
    });

    res.json({
      success: true,
      period,
      ...report
    });
  } catch (error) {
    console.error('Advanced report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate advanced report'
    });
  }
});

export default router;
