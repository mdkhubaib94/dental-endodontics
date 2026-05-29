// DoctorDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import './ChiefDoctorDashboard.css';
import './DoctorDashboard.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AssignPG from './AssignPG';
import AssignUG from './AssignUG';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { API_BASE_URL, DEV_API_ORIGIN } from '../config/api';
import { downloadCsv, getReportFilename } from '../utils/reportExport';
import { getPatientResumeTarget } from '../utils/caseDraft';
import { getStoredPatientId, setStoredPatientId } from '../utils/patientIdentity';

const DoctorDashboard = () => {
  // State for form data
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const formatDateInput = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseLocalDateInput = (value, endOfDay = false) => {
    if (!value) return null;
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  };

  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const [activeView, setActiveView] = useState('myAppointments'); // 'myAppointments', 'patient', 'myPGs', 'pgAppointments', 'referrals', 'reports', 'analytics', 'caseFiles'
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const hasAutoRestoredPatientRef = useRef(false);

  // My Appointments State
  const [myAppointments, setMyAppointments] = useState([]);
  const [myAppointmentsLoading, setMyAppointmentsLoading] = useState(false);
  const [myAppointmentsError, setMyAppointmentsError] = useState('');

  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');

  const [formData, setFormData] = useState({
    uniqueId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    age: '',
    gender: '',
    maritalStatus: '',
    preferredLanguage: '',
    otherLanguage: '',
    occupation: '',
    income: '',
    religion: '',
    address: '',
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    pastSurgicalHistory: '',
    pastDentalHistory: '',
    currentMedications: 'None',
    knownAllergies: 'None',
    chronicConditions: 'None',
    pastSurgeries: 'None',
    pregnancyStatus: '',
    primaryDentalConcerns: 'None',
    lastDentalVisit: '',
    bloodGroup: '',
    drugAllergies: '',
    dietAllergies: '',
    criticalCondition: '',
    // General Examination — Vitals (individual fields)
    vitalBP: '',
    vitalTemp: '',
    vitalWeight: '',
    vitalHeight: '',
    // General Examination — Constitutional & Other Signs
    constBuilt: '',
    constNourishment: '',
    constPallor: '',
    constIcterus: '',
    constCyanosis: '',
    constClubbing: '',
    constEdema: '',
    constLymphadenopathy: '',
    // Clinical Findings
    extraOralExamination: '',
    intraOralFindings: '',
    tmjExamination: '',
    lymphNodesExamination: '',
  });

  const [showForm, setShowForm] = useState(false);
  const [showUserIdDisplay, setShowUserIdDisplay] = useState(false);
  const [generatedUserId, setGeneratedUserId] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hpiSelections, setHpiSelections] = useState([]);
  const [pastMedicalHistory, setPastMedicalHistory] = useState([]);
  const [personalHabits, setPersonalHabits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canNavigateCases, setCanNavigateCases] = useState(false);
  const [caseStatuses, setCaseStatuses] = useState([]);
  const [caseStatusLoading, setCaseStatusLoading] = useState(false);
  const [caseStatusError, setCaseStatusError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const successToastTimerRef = useRef(null);
  const [showAssignPGModal, setShowAssignPGModal] = useState(false);
  const [assignPGMode, setAssignPGMode] = useState('create');
  const [selectedPGForEdit, setSelectedPGForEdit] = useState(null);
  // Patient search
  const [searchType, setSearchType] = useState('id');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // PG Management State
  const [assignedPGs, setAssignedPGs] = useState([]);
  const [assignedAppointments, setAssignedAppointments] = useState([]);
  const [pgAnalytics, setPGAnalytics] = useState([]);
  const [pgLoading, setPGLoading] = useState(false);
  const [pgError, setPGError] = useState('');
  const [selectedAppointmentPG, setSelectedAppointmentPG] = useState('');
    const [pgSearchTerm, setPGSearchTerm] = useState('');
  const [pgFromDate, setPgFromDate] = useState('');
  const [pgToDate, setPgToDate] = useState('');
  const [manageActionLoadingPGId, setManageActionLoadingPGId] = useState('');

  const [showAssignUGModal, setShowAssignUGModal] = useState(false);
  const [assignUGMode, setAssignUGMode] = useState('create');
  const [selectedUGForEdit, setSelectedUGForEdit] = useState(null);

  // UG Management State
  const [assignedUGs, setAssignedUGs] = useState([]);
  const [ugLoading, setUgLoading] = useState(false);
  const [ugError, setUgError] = useState('');
  const [manageActionLoadingUGId, setManageActionLoadingUGId] = useState('');

  const [analyticsFromDate, setAnalyticsFromDate] = useState(formatDateInput(new Date()));
  const [analyticsToDate, setAnalyticsToDate] = useState(formatDateInput(new Date()));
  const [doctorPgAnalyticsReport, setDoctorPgAnalyticsReport] = useState(null);
  const [doctorPgAnalyticsLoading, setDoctorPgAnalyticsLoading] = useState(false);
  const [doctorPgAnalyticsError, setDoctorPgAnalyticsError] = useState('');

  // Case Management State
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [showRedoBox, setShowRedoBox] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isCompactMessageBox, setIsCompactMessageBox] = useState(false);
  const [redoReason, setRedoReason] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [actionLoadingCaseId, setActionLoadingCaseId] = useState(null);
  const [actionLoadingType, setActionLoadingType] = useState('');

  // Case Sheet Preview (General Case + X-ray)
  const [showCaseSheetPreview, setShowCaseSheetPreview] = useState(false);
  const [caseSheetPreviewItem, setCaseSheetPreviewItem] = useState(null);
  const [caseSheetPreviewLoading, setCaseSheetPreviewLoading] = useState(false);
  const [caseSheetPreviewError, setCaseSheetPreviewError] = useState('');
  const [caseSheetPreviewGeneralCase, setCaseSheetPreviewGeneralCase] = useState(null);
  const [hasOpenedDepartmentCaseSheet, setHasOpenedDepartmentCaseSheet] = useState(false);

  const [referredCases, setReferredCases] = useState([]);
  const [referredLoading, setReferredLoading] = useState(false);
  const [referredError, setReferredError] = useState('');
  const [referredActionCaseId, setReferredActionCaseId] = useState('');
  const [referredActionType, setReferredActionType] = useState('');

  // Reschedule Requests State
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [rescheduleRequestsLoading, setRescheduleRequestsLoading] = useState(false);
  const [rescheduleRequestsError, setRescheduleRequestsError] = useState('');
  const [rescheduleActionLoadingId, setRescheduleActionLoadingId] = useState('');
  const [showRejectReasonBox, setShowRejectReasonBox] = useState(false);
  const [rejectReasonBookingId, setRejectReasonBookingId] = useState('');
  const [rejectReasonText, setRejectReasonText] = useState('');

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  // ================= MY APPOINTMENTS FUNCTIONS =================
  const fetchMyAppointments = async ({ silent = false } = {}) => {
    try {
      if (!silent) setMyAppointmentsLoading(true);
      setMyAppointmentsError('');

      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        setMyAppointmentsError('Authentication token missing');
        return;
      }

      const res = await fetch(buildApiUrl('/api/appointment/my-appointments'), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errJson = await safeReadJson(res);
        const msg = errJson?.message || (await res.text());
        throw new Error(msg || `Failed to load appointments (${res.status})`);
      }

      const json = await res.json();
      setMyAppointments(Array.isArray(json.appointments) ? json.appointments : []);
    } catch (err) {
      setMyAppointmentsError(err.message || 'Unable to load appointments');
      setMyAppointments([]);
    } finally {
      if (!silent) setMyAppointmentsLoading(false);
    }
  };

  const handleSelectPatientFromAppointment = async (appointment) => {
    const patientId = String(appointment?.patientId || '').trim();
    if (!patientId) {
      setMessage('Patient ID missing for this appointment.');
      return;
    }

    // Switch to patient view and load patient details
    setActiveView('patient');
    setFormData((prev) => ({ ...prev, uniqueId: patientId }));
    setShowUserIdDisplay(false);
    setShowForm(false);
    setGeneratedUserId('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await handleGetDetails(patientId);
  };

  const closeMessageBox = () => {
    setShowMessageBox(false);
    setIsCompactMessageBox(false);
  };

  const triggerSuccessToast = (msg) => {
    setSuccessToastMessage(msg);
    setShowSuccessToast(true);

    if (successToastTimerRef.current) {
      clearTimeout(successToastTimerRef.current);
    }

    successToastTimerRef.current = setTimeout(() => {
      setShowSuccessToast(false);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (successToastTimerRef.current) {
        clearTimeout(successToastTimerRef.current);
      }
    };
  }, []);

  const safeReadJson = async (res) => {
    try {
      const contentType = res?.headers?.get?.('content-type') || '';
      if (!String(contentType).toLowerCase().includes('application/json')) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const fetchRegisteredPatientById = async (patientId) => {
    const path = `/api/patient-details/by-patient-id/${encodeURIComponent(patientId)}`;
    const primaryUrl = buildApiUrl(path);

    const primaryRes = await fetch(primaryUrl);
    if (primaryRes.ok) {
      return { res: primaryRes, json: await safeReadJson(primaryRes), url: primaryUrl };
    }

    const primaryJson = await safeReadJson(primaryRes);
    const looksLikeRouteMissing404 =
      primaryRes.status === 404 &&
      (primaryJson == null ||
        Array.isArray(primaryJson?.availableRoutes) ||
        String(primaryJson?.message || '').toLowerCase().startsWith('route '));

    // In dev, a mis-set API base (or missing proxy) can cause the browser to hit the Vite origin
    // and get a generic 404 (route missing). Retry directly against the dev API server.
    const shouldRetryDev = !import.meta.env.PROD && DEV_API_ORIGIN && looksLikeRouteMissing404;

    if (shouldRetryDev && !String(primaryUrl).startsWith(String(DEV_API_ORIGIN))) {
      const fallbackUrl = `${DEV_API_ORIGIN}${path}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        return { res: fallbackRes, json: await safeReadJson(fallbackRes), url: fallbackUrl };
      }
      return {
        res: fallbackRes,
        json: await safeReadJson(fallbackRes),
        url: fallbackUrl,
        primary: { res: primaryRes, json: primaryJson, url: primaryUrl },
      };
    }

    return { res: primaryRes, json: primaryJson, url: primaryUrl };
  };

  const loadDoctorPgAnalytics = async () => {
    const token = user?.token || localStorage.getItem('token');
    if (!token) {
      setDoctorPgAnalyticsError('Authentication token missing. Please log in again.');
      setDoctorPgAnalyticsReport(null);
      return;
    }

    const from = new Date(analyticsFromDate);
    const to = new Date(analyticsToDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setDoctorPgAnalyticsError('Please select a valid date range.');
      setDoctorPgAnalyticsReport(null);
      return;
    }
    if (from > to) {
      setDoctorPgAnalyticsError("'From' date cannot be later than 'To' date.");
      setDoctorPgAnalyticsReport(null);
      return;
    }

    try {
      setDoctorPgAnalyticsLoading(true);
      setDoctorPgAnalyticsError('');

      const url = buildApiUrl(
        `/api/reports/doctor/pg-analytics?from=${encodeURIComponent(analyticsFromDate)}&to=${encodeURIComponent(analyticsToDate)}`
      );

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let msg = '';
        try {
          const errJson = await res.json();
          msg = errJson?.message || '';
        } catch {
          try {
            msg = await res.text();
          } catch {
            msg = '';
          }
        }
        throw new Error(msg || `Failed to load analytics (${res.status})`);
      }

      const json = await res.json();
      if (json?.success === false) {
        throw new Error(json?.message || 'Failed to load analytics');
      }

      setDoctorPgAnalyticsReport(json);
    } catch (err) {
      console.error('Doctor PG analytics load error', err);
      setDoctorPgAnalyticsError(err.message || 'Unable to load analytics');
      setDoctorPgAnalyticsReport(null);
    } finally {
      setDoctorPgAnalyticsLoading(false);
    }
  };

  const downloadDoctorPgAnalytics = () => {
    if (!doctorPgAnalyticsReport || !Array.isArray(doctorPgAnalyticsReport.pgs)) return;

    const periodLabel = `${analyticsFromDate} to ${analyticsToDate}`;
    const totals = doctorPgAnalyticsReport.totals || {};
    const approvalTotals = totals.approvalCounts || {};

    const headerRows = [
      ['Report Title', 'Assigned Students Report'],
      ['Doctor', doctorName || user?.name || user?.Identity || 'Doctor'],
      ['Doctor ID', doctorId || user?.Identity || ''],
      ['Period', periodLabel],
      ['Assigned PG Count', doctorPgAnalyticsReport.assignedPGCount || 0],
      ['Assigned UG Count', assignedUGs.length],
      ['Total Patients', totals.uniquePatients || 0],
      ['Total Case Sheets', totals.totalCaseSheets || 0],
      ['Approved', approvalTotals.approved || 0],
      ['Redo', approvalTotals.rejected || 0],
      ['Pending', approvalTotals.pending || 0],
    ];

    const detailRows = [
      [
        'Student Name',
        'Student ID',
        'Department',
        'Patients',
        'Male',
        'Female',
        'New',
        'Old',
        'Case Sheets',
        'Approved',
        'Redo',
        'Pending',
      ],
      ...doctorPgAnalyticsReport.pgs.map((row) => [
        row.pgName || row.pgIdentity || '-',
        row.pgIdentity || '-',
        row.department || '-',
        row.uniquePatients || 0,
        row.malePatients || 0,
        row.femalePatients || 0,
        row.newPatients || 0,
        row.oldPatients || 0,
        row.totalCaseSheets || 0,
        row.approvalCounts?.approved || 0,
        row.approvalCounts?.rejected || 0,
        row.approvalCounts?.pending || 0,
      ]),
    ];

    downloadCsv({
      filename: getReportFilename('assigned_pgs_report', periodLabel),
      rows: [...headerRows, [], ...detailRows],
    });
  };

  // Options for form fields
  const hpiOptions = ["Diabetes", "Hypertension", "Asthma", "Hyperlipidemia", "Thyroid", "None"];
  const pastMedicalHistoryOptions = ["Diabetes", "Hypertension", "Osteoporosis", "Arthritis", "Heart Disease", "None"];
  const personalHabitsOptions = ["Smoking", "Alcohol", "Betel Nut", "None"];
  const chiefComplaints = [
    "Pain/Toothache", "Dental Caries (Cavities)", "Sensitivity",
    "Gingivitis and Gum Problems", "Aesthetic Concerns", "Post-filling Complaints",
    "Missing Teeth/Tooth Replacement", "Routine Check-up/Cleaning", "Oral Ulcers",
    "Facial/Intra-oral Swelling", "Loose Teeth", "Bad Breath (Halitosis)",
    "Temporomandibular Joint (TMJ) Pain/Disorder", "Fractured Tooth", "Food Impaction"
  ];

  // Helper functions
  const calculateAge = (dob) => {
    if (!dob) return '';

    try {
      // Parse the date string and create a date object
      const birthDate = new Date(dob);

      // Check if the date is valid
      if (isNaN(birthDate.getTime())) {
        return '';
      }

      const today = new Date();

      // Calculate age
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      // If the current month is before the birth month, or
      // if it's the same month but the current day is before the birth day
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Ensure age is not negative
      return age >= 0 ? age : '';
    } catch (error) {
      console.error('Error calculating age:', error);
      return '';
    }
  };

  const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '');

  // Maps any stored department value (short key or full name) to the proper display label
  const DEPT_LABEL_MAP = {
    oral: 'Oral Medicine and Radiology',
    oralmedicine: 'Oral Medicine and Radiology',
    oralmedicineandradiology: 'Oral Medicine and Radiology',
    oralmedicineradiology: 'Oral Medicine and Radiology',
    oralandmaxillofacial: 'Oral and Maxillofacial Surgery',
    oralandmaxillofacialsurgery: 'Oral and Maxillofacial Surgery',
    pedodontics: 'Pedodontics',
    prosthodontics: 'Prosthodontics',
    periodontics: 'Periodontics',
    conservative: 'Conservative Dentistry and Endodontics',
    conservativedentistry: 'Conservative Dentistry and Endodontics',
    endodontics: 'Conservative Dentistry and Endodontics',
    implant: 'Implantology',
    implantology: 'Implantology',
    general: 'General Dentistry',
    generaldentistry: 'General Dentistry',
  };

  const formatDepartmentLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const key = raw.toLowerCase().replace(/[\s_]+/g, '');
    if (DEPT_LABEL_MAP[key]) return DEPT_LABEL_MAP[key];
    // Fallback: title-case but keep small connector words lowercase
    const small = new Set(['and', 'of', 'the', 'in', 'for', 'or']);
    return raw
      .split(/\s+/)
      .map((word, i) => {
        if (!word) return word;
        if (i > 0 && small.has(word.toLowerCase())) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  const doctorDepartmentKey = normalizeDepartment(
    localStorage.getItem('doctorDepartment') || user?.department || ''
  );
  const doctorDepartmentLabel = String(user?.department || localStorage.getItem('doctorDepartment') || '').trim();
  const isPublicHealthDentistry =
    doctorDepartmentKey.includes('publichealthdentistry') ||
    doctorDepartmentKey.includes('publichealth') ||
    doctorDepartmentKey.includes('communitydentistry');
  const currentRoleKey = String(user?.role || localStorage.getItem('role') || '').trim().toLowerCase();
  const isSpecialistDoctor = Boolean(
    doctorDepartmentKey && doctorDepartmentKey !== 'general' && doctorDepartmentKey !== 'generaldentistry'
  );
  const canUseReferralQueue = currentRoleKey === 'doctor' && isSpecialistDoctor;

  const formatSpecialistReferralStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rescheduled') return 'Rescheduled';
    return 'Pending';
  };

  const getSpecialistReferralStatusBadgeClass = (status) => {
    if (status === 'Approved') return 'status-badge approved';
    if (status === 'Rescheduled') return 'status-badge redo';
    return 'status-badge pending';
  };

  const getCaseRouteForDepartment = (departmentValue) => {
    const departmentKey = normalizeDepartment(departmentValue);

    if (departmentKey.includes('publichealthdentistry') || departmentKey.includes('publichealth') || departmentKey.includes('communitydentistry')) return '/general-case-sheet';
    if (departmentKey === 'pedodontics') return '/pedodontics';
    if (departmentKey === 'periodontics') return '/casePortal?dept=periodontics';
    if (departmentKey.includes('oral') || departmentKey.includes('maxillofacial')) return '/oral-medicine';
    if (departmentKey.includes('conservative') || departmentKey.includes('endodontic')) return '/conservative-dentistry';
    if (departmentKey === 'general' || departmentKey === 'generaldentistry') return '/general-case-sheet';
    return '/casePortal?dept=prosthodontics';
  };

  const formatPgCaseCompletionStatus = (appointment) => {
    const normalizedStatus = String(appointment?.status || 'pending').trim().toLowerCase();

    if (normalizedStatus === 'completed') {
      return 'Completed';
    }

    return 'Pending';
  };

  const handleLogout = () => {
    logout(); 
  };

  const toggleLogoutDropdown = () => {
    setShowLogoutDropdown((v) => !v);
  };

  const handleViewProfile = () => {
    setShowLogoutDropdown(false);
    navigate('/doctor-profile');
  };

  const handleChangePassword = () => {
    setShowLogoutDropdown(false);
    navigate('/reset-password');
  };

  const showMessage = (msg, type = 'error') => {
    if (type === 'error') {
      setMessage(msg);
      setSuccessMessage('');
    } else {
      setSuccessMessage(msg);
      setMessage('');
    }
    setTimeout(() => {
      setMessage('');
      setSuccessMessage('');
    }, 5000);
  };

  // Helper to derive a simple status label from chiefApproval
  const deriveStatus = (chiefApproval) => {
    if (!chiefApproval) return 'Pending';
    const lower = chiefApproval.toLowerCase();
    if (lower === 'approved' || lower.includes('approved')) return 'Approved';
    if (lower.includes('redo') || lower.includes('resend')) return 'Resent';
    return chiefApproval;
  };

  // Fetch case-sheet status for the current patient (all departments)
  const fetchCaseStatuses = async (patientId) => {
    if (!patientId) return;

    try {
      setCaseStatusLoading(true);
      setCaseStatusError('');

      const token = localStorage.getItem('token');
      const endpoints = [
        { url: buildApiUrl(`/api/pedodontics/patient/${encodeURIComponent(patientId)}`), department: 'Pedodontics' },
        { url: buildApiUrl(`/api/complete-denture/patient/${encodeURIComponent(patientId)}`), department: 'Complete Denture' },
        { url: buildApiUrl(`/api/fpd/patient/${encodeURIComponent(patientId)}`), department: 'FPD' },
        { url: buildApiUrl(`/api/implant/patient/${encodeURIComponent(patientId)}`), department: 'Implant' },
        { url: buildApiUrl(`/api/ImplantPatient/patient/${encodeURIComponent(patientId)}`), department: 'Implant Patient Surgery' },
        { url: buildApiUrl(`/api/partial/patient/${encodeURIComponent(patientId)}`), department: 'Partial Denture' },
      ];

      const results = await Promise.all(
        endpoints.map(async ({ url, department }) => {
          try {
            const res = await fetch(url, {
              headers: token
                ? {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  }
                : { 'Content-Type': 'application/json' },
            });

            const text = await res.text();
            const parsed = text ? JSON.parse(text) : null;

            if (parsed?.data && Array.isArray(parsed.data)) {
              return parsed.data.map((item) => ({ department, ...item }));
            }

            if (Array.isArray(parsed)) {
              return parsed.map((item) => ({ department, ...item }));
            }

            return [];
          } catch (err) {
            console.error('Error fetching cases for department', department, err);
            return [];
          }
        })
      );

      let merged = [];
      results.forEach((r) => {
        if (Array.isArray(r)) merged.push(...r);
      });

      merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setCaseStatuses(merged);
    } catch (err) {
      console.error('Failed to load case statuses', err);
      setCaseStatusError('Failed to load case sheet status for this patient.');
    } finally {
      setCaseStatusLoading(false);
    }
  };

  // When dashboard mounts, if a current patient is selected, load their case statuses
  useEffect(() => {
    const existingPatientId = getStoredPatientId();
    if (existingPatientId) {
      fetchCaseStatuses(existingPatientId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Return the case-sheet route for the logged-in doctor's department
  const getCaseSheetRoute = () => {
    const dept = String(localStorage.getItem('doctorDepartment') || user?.department || '').trim().toLowerCase().replace(/[\s_]+/g, '');
    return getCaseRouteForDepartment(dept);
  };

  const goToDepartmentCaseSheet = async () => {
    const route = getCaseSheetRoute();
    if (route === '/general-case-sheet') {
      navigate(route);
      return;
    }

    const patientId = getStoredPatientId();
    const resumeTarget = patientId ? await getPatientResumeTarget(patientId) : null;

    // If there is an unfinished draft for this patient, resume — but still request consent.
    if (resumeTarget?.routeKey) {
      navigate(resumeTarget.routeKey, { state: { requestConsentAfterEntry: true } });
      return;
    }

    // Fresh case entry: request consent before department case sheet.
    navigate(route, { state: { requestConsentAfterEntry: true } });
  };

  // Load doctor identity for topbar
  useEffect(() => {
    const storedDoctorId = localStorage.getItem('doctorId');
    const storedDoctorName = localStorage.getItem('doctorName');
    const storedDoctorEmail = localStorage.getItem('doctorEmail') || user?.email || '';

    if (storedDoctorId) setDoctorId(storedDoctorId);
    else if (user?.Identity) setDoctorId(user.Identity);

    if (storedDoctorName) setDoctorName(storedDoctorName);
    else if (user?.name) setDoctorName(user.name);

    if (storedDoctorEmail) setDoctorEmail(storedDoctorEmail);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLogoutDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const populateFormWithPatientData = (patientData) => {
    const preferredLanguage =
      patientData.personalInfo?.preferredLanguage ||
      patientData.preferredLanguage ||
      '';
    const isOtherLanguage = !['English', 'Hindi', 'Tamil'].includes(preferredLanguage);

    // Normalize DOB/age from multiple possible source fields
    const rawDob =
      patientData.personalInfo?.dateOfBirth ||
      patientData.personalInfo?.dob ||
      patientData.dateOfBirth ||
      patientData.dob ||
      '';
    const parsedDob = rawDob ? new Date(rawDob) : null;
    const dob = parsedDob && !Number.isNaN(parsedDob.getTime()) ? parsedDob.toISOString().split('T')[0] : '';

    setFormData((prev) => {
      const resolvedDob = dob || prev.dob || '';
      const resolvedAge = resolvedDob
        ? calculateAge(resolvedDob)
        : (patientData.personalInfo?.age || patientData.age || prev.age || '');

      return {
        // keep any existing keys then merge all known fields from both branches
        ...prev,
        uniqueId: prev.uniqueId || '',
        firstName: patientData.personalInfo?.firstName || patientData.firstName || prev.firstName || '',
        middleName: patientData.personalInfo?.middleName || patientData.middleName || prev.middleName || '',
        lastName: patientData.personalInfo?.lastName || patientData.lastName || prev.lastName || '',
        dob: resolvedDob,
        age: resolvedAge,
        gender: patientData.personalInfo?.gender || patientData.gender || prev.gender || '',
        maritalStatus: patientData.personalInfo?.maritalStatus || patientData.maritalStatus || prev.maritalStatus || '',
        preferredLanguage: preferredLanguage ? (isOtherLanguage ? 'Other' : preferredLanguage) : (prev.preferredLanguage || ''),
        otherLanguage: preferredLanguage ? (isOtherLanguage ? preferredLanguage : '') : (prev.otherLanguage || ''),
        occupation: patientData.personalInfo?.occupation || prev.occupation || '',
        income: patientData.personalInfo?.income || prev.income || '',
        religion: patientData.personalInfo?.religion || prev.religion || '',
        address: patientData.personalInfo?.address || prev.address || '',
        chiefComplaint: patientData.medicalInfo?.chiefComplaint || patientData.chiefComplaint || prev.chiefComplaint || '',
        historyOfPresentIllness: patientData.medicalInfo?.historyOfPresentIllness || prev.historyOfPresentIllness || '',
        diagnosis: patientData.medicalInfo?.diagnosis || patientData.diagnosis || prev.diagnosis || '',
        treatmentPlan: patientData.medicalInfo?.treatmentPlan || patientData.treatmentPlan || prev.treatmentPlan || '',
        currentMedications: patientData.medicalInfo?.currentMedications?.join(', ') || patientData.currentMedications || prev.currentMedications || 'None',
        knownAllergies: patientData.medicalInfo?.knownAllergies?.join(', ') || patientData.knownAllergies || prev.knownAllergies || 'None',
        chronicConditions: patientData.medicalInfo?.chronicConditions?.join(', ') || patientData.chronicConditions || prev.chronicConditions || 'None',
        pastSurgeries: patientData.medicalInfo?.pastSurgeries?.join(', ') || patientData.pastSurgeries || prev.pastSurgeries || 'None',
        pregnancyStatus: patientData.medicalInfo?.pregnancyStatus || patientData.pregnancyStatus || prev.pregnancyStatus || '',
        primaryDentalConcerns: patientData.medicalInfo?.dentalConcerns?.join(', ') || patientData.primaryDentalConcerns || prev.primaryDentalConcerns || 'None',
        lastDentalVisit: patientData.medicalInfo?.lastDentalVisit ? new Date(patientData.medicalInfo.lastDentalVisit).toISOString().split('T')[0] : (patientData.lastDentalVisit || prev.lastDentalVisit || ''),
        bloodGroup: patientData.vitals?.bloodGroup || patientData.bloodGroup || prev.bloodGroup || '',
        drugAllergies: patientData.vitals?.drugAllergies?.join(', ') || patientData.drugAllergies || prev.drugAllergies || '',
        dietAllergies: patientData.vitals?.dietAllergies?.join(', ') || patientData.dietAllergies || prev.dietAllergies || '',
        criticalCondition: patientData.vitals?.criticalCondition || prev.criticalCondition || '',
        vitalBP: patientData.clinicalExam?.vitalBP || prev.vitalBP || '',
        vitalTemp: patientData.clinicalExam?.vitalTemp || prev.vitalTemp || '',
        vitalWeight: patientData.clinicalExam?.vitalWeight || prev.vitalWeight || '',
        vitalHeight: patientData.clinicalExam?.vitalHeight || prev.vitalHeight || '',
        constBuilt: patientData.clinicalExam?.constBuilt || prev.constBuilt || '',
        constNourishment: patientData.clinicalExam?.constNourishment || prev.constNourishment || '',
        constPallor: patientData.clinicalExam?.constPallor || prev.constPallor || '',
        constIcterus: patientData.clinicalExam?.constIcterus || prev.constIcterus || '',
        constCyanosis: patientData.clinicalExam?.constCyanosis || prev.constCyanosis || '',
        constClubbing: patientData.clinicalExam?.constClubbing || prev.constClubbing || '',
        constEdema: patientData.clinicalExam?.constEdema || prev.constEdema || '',
        constLymphadenopathy: patientData.clinicalExam?.constLymphadenopathy || prev.constLymphadenopathy || '',
        extraOralExamination: patientData.clinicalExam?.extraOralExamination || prev.extraOralExamination || '',
        intraOralFindings: patientData.clinicalExam?.intraOralFindings || prev.intraOralFindings || '',
        tmjExamination: patientData.clinicalExam?.tmjExamination || prev.tmjExamination || '',
        lymphNodesExamination: patientData.clinicalExam?.lymphNodesExamination || prev.lymphNodesExamination || '',
      };
    });

    setHpiSelections(patientData.medicalInfo?.hpi || []);
    setPastMedicalHistory(patientData.medicalInfo?.pastMedicalHistory || []);
    setPersonalHabits(patientData.medicalInfo?.personalHabits || []);
  };
  //validate
  const validateForm = () => {
    const errors = {};
    const requiredFields = isPublicHealthDentistry
      ? {
          firstName: 'First Name',
          lastName: 'Last Name',
          dob: 'Date of Birth',
          gender: 'Gender',
          maritalStatus: 'Marital Status',
          preferredLanguage: 'Preferred Language',
          diagnosis: 'Diagnosis',
          treatmentPlan: 'Treatment Plan',
        }
      : {
          firstName: 'First Name',
          lastName: 'Last Name',
          dob: 'Date of Birth',
          gender: 'Gender',
          maritalStatus: 'Marital Status',
          preferredLanguage: 'Preferred Language',
          chiefComplaint: 'Chief Complaint',
          bloodGroup: 'Blood Group'
        };

    // Check required fields
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field] || formData[field].trim() === '') {
        errors[field] = 'This field must be filled';
      }
    }

    // Check if preferred language is "Other" and otherLanguage is empty
    if (formData.preferredLanguage === 'Other' && (!formData.otherLanguage || formData.otherLanguage.trim() === '')) {
      errors.otherLanguage = 'This field must be filled';
    }

    if (isPublicHealthDentistry) {
      if (!formData.diagnosis || formData.diagnosis.trim() === '') {
        errors.diagnosis = 'This field must be filled';
      }
      if (!formData.treatmentPlan || formData.treatmentPlan.trim() === '') {
        errors.treatmentPlan = 'This field must be filled';
      }
    }

    // Check pregnancy status if conditions are met
    const showPregnancyStatus = formData.gender === 'Female' && formData.maritalStatus === 'Married';
    if (showPregnancyStatus && (!formData.pregnancyStatus || formData.pregnancyStatus.trim() === '')) {
      errors.pregnancyStatus = 'This field must be filled';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Multi-criteria patient search (ID / phone / name)
  const handlePatientSearch = async (query) => {
    const q = String(query || '').trim();
    if (!q) { setSearchResults([]); return; }
    try {
      setSearchLoading(true);
      const res = await fetch(buildApiUrl(`/api/patient-details?search=${encodeURIComponent(q)}&limit=8`));
      if (!res.ok) { setSearchResults([]); return; }
      const json = await res.json();
      const patients = Array.isArray(json?.data) ? json.data : (Array.isArray(json?.patients) ? json.patients : []);
      setSearchResults(patients);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  };

  const handleSelectSearchResult = (patient) => {
    const pid = String(patient.patientId || '').trim();
    setSearchResults([]);
    setSearchQuery('');
    setFormData(prev => ({ ...prev, uniqueId: pid }));
    handleGetDetails(pid);
  };

  // Get details for an already-registered patient (must exist in Admin Patient Registration)
  const handleGetDetails = async (patientIdOverride = '') => {
    // When used as an onClick handler, React passes a SyntheticEvent.
    // Ignore that and fall back to the typed patient ID.
    const overrideId = typeof patientIdOverride === 'string' ? patientIdOverride : '';
    const enteredId = String(overrideId || formData.uniqueId || '').trim();

    if (!enteredId) {
      showMessage('Please enter the Patient ID registered in Admin Patient Registration.', 'error');
      return;
    }

    try {
      setIsLoading(true);

      // First, verify that this patient ID exists in Admin Patient Registration
      const verifyAttempt = await fetchRegisteredPatientById(enteredId);
      const verifyRes = verifyAttempt.res;
      const verifyData = verifyAttempt.json;

      if (!verifyRes.ok) {
        if (verifyRes.status === 404) {
          const looksLikeRouteMissing404 =
            verifyData == null ||
            Array.isArray(verifyData?.availableRoutes) ||
            String(verifyData?.message || '').toLowerCase().startsWith('route ');

          if (looksLikeRouteMissing404) {
            showMessage(
              'Patient lookup API route was not found. Check that the backend server is running and VITE_API_BASE_URL points to it.',
              'error'
            );
          } else {
            showMessage(
              'Patient ID not found in Admin Patient Registration. Please ask admin to register this patient.',
              'error'
            );
          }
        } else {
          showMessage(
            verifyData?.message || 'Failed to verify patient ID from Admin Patient Registration.',
            'error'
          );
        }

        setShowUserIdDisplay(false);
        setShowForm(false);
        setGeneratedUserId('');
        return;
      }

      if (!verifyData?.success) {
        showMessage(verifyData?.message || 'Failed to verify patient ID from Admin Patient Registration.', 'error');
        setShowUserIdDisplay(false);
        setShowForm(false);
        setGeneratedUserId('');
        return;
      }
      const registeredPatient = verifyData.data || verifyData.patient || verifyData;
      const resolvedPatientId = String(registeredPatient.patientId || enteredId || '').trim();

      // Populate form with data from Admin Patient Registration
      populateFormWithPatientData(registeredPatient);
      setGeneratedUserId(resolvedPatientId);
      showMessage(`Patient details loaded for ID: ${resolvedPatientId}`, 'success');
      
      // Store patient name for display (no localStorage for patient ID)
      if (registeredPatient?.patientName || registeredPatient?.personalInfo?.firstName) {
        const fallbackName = [
          registeredPatient?.personalInfo?.firstName,
          registeredPatient?.personalInfo?.middleName,
          registeredPatient?.personalInfo?.lastName,
        ]
          .filter(Boolean)
          .join(' ')
          .trim();
        localStorage.setItem('CurrentpatientName', registeredPatient?.patientName || fallbackName);
      }

      // Optional: also merge any existing doctor-patient details for this ID
      try {
        const token = localStorage.getItem('token');
        const existingRes = await fetch(buildApiUrl(`/api/doctor-patient/${encodeURIComponent(enteredId)}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (existingRes.ok) {
          const existingResult = await existingRes.json();
          const existingPatientData = existingResult.data || existingResult;
          populateFormWithPatientData(existingPatientData);
        }
      } catch (mergeErr) {
        console.log('No existing doctor-patient record to merge for ID:', enteredId, mergeErr.message);
      }

      // 🔥 NEW: Check for latest appointment and fetch case statuses
      try {
        const token = localStorage.getItem('token');
        const appointmentRes = await fetch(
          buildApiUrl(`/api/appointment/appointments/patient/${encodeURIComponent(resolvedPatientId)}`),
          {
            headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
          }
        );
        
        if (appointmentRes.ok) {
          const appointmentData = await appointmentRes.json();
          if (appointmentData.success && Array.isArray(appointmentData.appointments) && appointmentData.appointments.length > 0) {
            // Sort by creation date to get the latest appointment
            const sortedAppointments = appointmentData.appointments.sort((a, b) => 
              new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            );
            const latestAppointment = sortedAppointments[0];
            
            // Update chief complaint if there's a new appointment
            if (latestAppointment.chiefComplaint) {
              setFormData(prev => ({
                ...prev,
                chiefComplaint: latestAppointment.chiefComplaint
              }));
            }
            
            console.log('✅ Latest appointment loaded for patient:', resolvedPatientId, latestAppointment);
          }
        }
      } catch (appointmentErr) {
        console.log('Could not fetch latest appointment:', appointmentErr.message);
      }

      // Fetch case statuses for this patient
      await fetchCaseStatuses(resolvedPatientId);

      setShowUserIdDisplay(true);
      setShowForm(true);
      // Require a fresh save before navigating to case sheets for this patient
      setCanNavigateCases(false);
    } catch (error) {
      showMessage(error.message || 'An error occurred while fetching patient data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load appointments on mount
    fetchMyAppointments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'hpi') {
        if (checked && value === 'None') {
          setHpiSelections(['None']);
        } else if (!checked && value === 'None') {
          setHpiSelections([]);
        } else if (checked) {
          setHpiSelections(prev => 
            prev.includes('None') ? [value] : [...prev, value]
          );
        } else {
          setHpiSelections(prev => prev.filter(item => item !== value));
        }
      } else if (name === 'past-medical-history') {
        if (checked && value === 'None') {
          setPastMedicalHistory(['None']);
        } else if (!checked && value === 'None') {
          setPastMedicalHistory([]);
        } else if (checked) {
          setPastMedicalHistory(prev => 
            prev.includes('None') ? [value] : [...prev, value]
          );
        } else {
          setPastMedicalHistory(prev => prev.filter(item => item !== value));
        }
      } else if (name === 'personal-habits') {
        if (checked && value === 'None') {
          setPersonalHabits(['None']);
        } else if (!checked && value === 'None') {
          setPersonalHabits([]);
        } else if (checked) {
          setPersonalHabits(prev => 
            prev.includes('None') ? [value] : [...prev, value]
          );
        } else {
          setPersonalHabits(prev => prev.filter(item => item !== value));
        }
      }
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        
        // Auto-calculate age when DOB changes
        if (name === 'dob') {
          const age = calculateAge(value);
          newData.age = age;
        }
        
        // Handle pregnancy status logic
        if (name === 'gender' || name === 'maritalStatus') {
          const showPregnancyStatus = (name === 'gender' ? value : newData.gender) === 'Female' && 
                                    (name === 'maritalStatus' ? value : newData.maritalStatus) === 'Married';
          if (!showPregnancyStatus) {
            // Must be a valid enum value in the backend schema when not applicable
            newData.pregnancyStatus = 'N/A';
          }
        }
        
        // Handle preferred language logic
        if (name === 'preferredLanguage' && value !== 'Other') {
          newData.otherLanguage = '';
        }
        
        return newData;
      });
      
      // Clear field errors when user starts typing
      if (fieldErrors[name]) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  // FIXED handleSavePatient function
  const handleSavePatient = async () => {
    if (!generatedUserId) {
      showMessage('Please fetch a registered Patient ID before saving.', 'error');
      return;
    }

    if (!validateForm()) return;
    try {
      setIsLoading(true);
      
      // Prepare the data in the format your backend expects
      const shouldIncludePregnancyStatus = formData.gender === 'Female' && formData.maritalStatus === 'Married';

      // Merge both branches' patient payloads: include full personalInfo, medicalInfo, vitals and clinicalExam.
      const patientData = {
        patientId: generatedUserId,
        personalInfo: {
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          dateOfBirth: formData.dob,
          age: parseInt(formData.age) || 0,
          gender: formData.gender,
          maritalStatus: formData.maritalStatus || '',
          preferredLanguage: formData.preferredLanguage === 'Other' ? formData.otherLanguage : formData.preferredLanguage,
          occupation: formData.occupation || '',
          income: formData.income || '',
          religion: formData.religion || '',
          address: formData.address || '',
        },
        medicalInfo: {
          chiefComplaint: formData.chiefComplaint || '',
          historyOfPresentIllness: formData.historyOfPresentIllness || '',
          diagnosis: formData.diagnosis || '',
          treatmentPlan: formData.treatmentPlan || '',
          hpi: hpiSelections,
          pastMedicalHistory: pastMedicalHistory,
          personalHabits: personalHabits,
          currentMedications: formData.currentMedications.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          knownAllergies: formData.knownAllergies.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          chronicConditions: formData.chronicConditions.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          pastSurgeries: formData.pastSurgeries.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          pregnancyStatus: shouldIncludePregnancyStatus ? formData.pregnancyStatus : 'N/A',
          dentalConcerns: formData.primaryDentalConcerns.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          lastDentalVisit: formData.lastDentalVisit || null,
        },
        vitals: {
          bloodGroup: formData.bloodGroup,
          drugAllergies: formData.drugAllergies.split(',').map(item => item.trim()).filter(item => item),
          dietAllergies: formData.dietAllergies.split(',').map(item => item.trim()).filter(item => item),
          criticalCondition: formData.criticalCondition || '',
        },
        clinicalExam: {
          vitalBP: formData.vitalBP || '',
          vitalTemp: formData.vitalTemp || '',
          vitalWeight: formData.vitalWeight || '',
          vitalHeight: formData.vitalHeight || '',
          constBuilt: formData.constBuilt || '',
          constNourishment: formData.constNourishment || '',
          constPallor: formData.constPallor || '',
          constIcterus: formData.constIcterus || '',
          constCyanosis: formData.constCyanosis || '',
          constClubbing: formData.constClubbing || '',
          constEdema: formData.constEdema || '',
          constLymphadenopathy: formData.constLymphadenopathy || '',
          extraOralExamination: formData.extraOralExamination || '',
          intraOralFindings: formData.intraOralFindings || '',
          tmjExamination: formData.tmjExamination || '',
          lymphNodesExamination: formData.lymphNodesExamination || '',
        }
      };
      // Send data to backend
     const response = await fetch(buildApiUrl('/api/doctor-patient'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData)
    });

    if (response.ok) {
      const result = await response.json();
      const id = result.patientId;
      const name = result.patientName;
      localStorage.setItem('CurrentpatientName', name);
      setStoredPatientId(id);
      showMessage('Patient details saved successfully!', 'success');
      console.log('Patient data from localStorage:', {
      });
      triggerSuccessToast('Patient Details Saved Successfully');
      // Allow navigation to case files / history only after successful save
      setCanNavigateCases(true);
      // Refresh case-sheet status panel for this patient
      fetchCaseStatuses(id);
    } else {
      const error = await response.json();
      showMessage(`Error saving patient: ${error.message}`, 'error');
    }
  } catch (error) {
    showMessage('Error saving patient: ' + error.message, 'error');
  } finally {
    setIsLoading(false);
  }
};

  const handleNavigation = (url) => {
    // In a real app, you would use React Router
    console.log('Navigating to:', url);
  };

  // ================= UG MANAGEMENT FUNCTIONS =================

  const fetchAssignedUGs = async ({ silent = false } = {}) => {
    try {
      if (!silent) setUgLoading(true);
      setUgError('');

      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        setUgError('Authentication token missing');
        return;
      }

      const res = await fetch(buildApiUrl('/api/auth/doctor/assigned-ugs'), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errJson = await safeReadJson(res);
        const msg = errJson?.message || (await res.text());
        throw new Error(msg || `Failed to load assigned UGs (${res.status})`);
      }

      const json = await res.json();
      setAssignedUGs(Array.isArray(json.ugs) ? json.ugs : []);
    } catch (err) {
      setUgError(err.message || 'Unable to load assigned UG data');
      setAssignedUGs([]);
    } finally {
      if (!silent) setUgLoading(false);
    }
  };

  const handleUnassignUG = async (ugDbId, ugDisplayName) => {
    setManageActionLoadingUGId(ugDbId);
    try {
      const token = user?.token || localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`/api/auth/doctor/assigned-ugs/${ugDbId}/unassign`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errJson = await safeReadJson(res);
        const text = errJson?.message || (await res.text());
        throw new Error(text || 'Unable to unassign UG');
      }

      setIsCompactMessageBox(true);
      setMessageTitle('');
      setMessageContent('Updated successfully');
      setShowMessageBox(true);
      await fetchAssignedUGs({ silent: true });
    } catch (err) {
      setUgError(err.message || 'Failed to unassign UG');
    } finally {
      setManageActionLoadingUGId('');
    }
  };

  const openCreateUGModal = () => {
    setAssignUGMode('create');
    setSelectedUGForEdit(null);
    setShowAssignUGModal(true);
  };

  const openEditUGModal = (ug) => {
    setAssignUGMode('edit');
    setSelectedUGForEdit(ug || null);
    setShowAssignUGModal(true);
  };

  // ================= PG MANAGEMENT FUNCTIONS =================

  const fetchRescheduleRequests = async ({ silent = false } = {}) => {
    try {
      if (!silent) setRescheduleRequestsLoading(true);
      setRescheduleRequestsError('');
      const token = user?.token || localStorage.getItem('token');
      if (!token) { setRescheduleRequestsError('Authentication token missing'); return; }
      const res = await fetch(buildApiUrl('/api/appointment/reschedule-requests'), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || `Failed to load reschedule requests (${res.status})`);
      }
      const json = await res.json();
      setRescheduleRequests(Array.isArray(json.requests) ? json.requests : []);
    } catch (err) {
      setRescheduleRequestsError(err.message || 'Failed to load reschedule requests');
    } finally {
      if (!silent) setRescheduleRequestsLoading(false);
    }
  };

  const handleApproveReschedule = async (bookingId) => {
    try {
      setRescheduleActionLoadingId(bookingId);
      const token = user?.token || localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`/api/appointment/${encodeURIComponent(bookingId)}/reschedule/approve`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to approve');
      triggerSuccessToast('Reschedule approved. Patient has been notified.');
      fetchRescheduleRequests({ silent: true });
    } catch (err) {
      setShowMessageBox(true);
      setMessageTitle('Error');
      setMessageContent(err.message || 'Failed to approve reschedule request');
    } finally {
      setRescheduleActionLoadingId('');
    }
  };

  const handleRejectReschedule = async () => {
    const bookingId = rejectReasonBookingId;
    if (!bookingId) return;
    try {
      setRescheduleActionLoadingId(bookingId);
      const token = user?.token || localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`/api/appointment/${encodeURIComponent(bookingId)}/reschedule/reject`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReasonText }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to reject');
      triggerSuccessToast('Reschedule rejected. Patient has been notified.');
      setShowRejectReasonBox(false);
      setRejectReasonBookingId('');
      setRejectReasonText('');
      fetchRescheduleRequests({ silent: true });
    } catch (err) {
      setShowMessageBox(true);
      setMessageTitle('Error');
      setMessageContent(err.message || 'Failed to reject reschedule request');
    } finally {
      setRescheduleActionLoadingId('');
    }
  };

  const openRejectBox = (bookingId) => {
    setRejectReasonBookingId(bookingId);
    setRejectReasonText('');
    setShowRejectReasonBox(true);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fetchAssignedPGsOverview = async ({ silent = false } = {}) => {
    try {
      if (!silent) setPGLoading(true);
      setPGError('');

      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        setPGError('Authentication token missing');
        return;
      }

      const res = await fetch(buildApiUrl('/api/auth/doctor/assigned-pgs/overview'), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to load assigned PG overview (${res.status})`);
      }

      const json = await res.json();
      // Defensive client-side filter: ensure department doctors see only PG/UG they supervise
      const rawPgs = Array.isArray(json.pgs) ? json.pgs : [];
      const rawAppointments = Array.isArray(json.appointments) ? json.appointments : [];
      const rawAnalytics = Array.isArray(json.analytics) ? json.analytics : [];

      if (currentRoleKey === 'doctor' && user && user._id) {
        const supervised = rawPgs.filter(p => String(p.createdBy || '') === String(user._id));
        setAssignedPGs(supervised);
      } else {
        setAssignedPGs(rawPgs);
      }

      setAssignedAppointments(rawAppointments);
      setPGAnalytics(rawAnalytics);
    } catch (err) {
      setPGError(err.message || 'Unable to load assigned PG data');
      setAssignedPGs([]);
      setAssignedAppointments([]);
      setPGAnalytics([]);
    } finally {
      if (!silent) setPGLoading(false);
    }
  };

  const handleUnassignPG = async (pgDbId, pgDisplayName) => {
    setManageActionLoadingPGId(pgDbId);
    try {
      const token = user?.token || localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`/api/auth/doctor/assigned-pgs/${pgDbId}/unassign`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Unable to unassign PG');
      }

      setIsCompactMessageBox(true);
      setMessageTitle('');
      setMessageContent('Updated successfully');
      setShowMessageBox(true);
      await fetchAssignedPGsOverview({ silent: true });
    } catch (err) {
      setPGError(err.message || 'Failed to unassign PG');
    } finally {
      setManageActionLoadingPGId('');
    }
  };

  const openCreatePGModal = () => {
    setAssignPGMode('create');
    setSelectedPGForEdit(null);
    setShowAssignPGModal(true);
  };

  const openEditPGModal = (pg) => {
    setAssignPGMode('edit');
    setSelectedPGForEdit(pg || null);
    setShowAssignPGModal(true);
  };

  // ================= SPECIALIST REFERRAL FUNCTIONS =================

  const extractApiErrorMessage = async (response, fallbackMessage) => {
    try {
      const raw = await response.text();
      if (!raw) return fallbackMessage;
      try {
        const parsed = JSON.parse(raw);
        return parsed?.message || raw || fallbackMessage;
      } catch {
        return raw || fallbackMessage;
      }
    } catch {
      return fallbackMessage;
    }
  };

  const fetchReferredPatients = async ({ silent = false } = {}) => {
    try {
      if (!silent) setReferredLoading(true);
      setReferredError('');

      const token = localStorage.getItem('token');
      if (!token) {
        setReferredCases([]);
        setReferredError('Authentication token missing');
        return;
      }

      const response = await fetch(buildApiUrl('/api/general/referred-patients'), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await extractApiErrorMessage(
          response,
          `Failed to load referred patients (${response.status})`
        );
        throw new Error(message);
      }

      const json = await response.json();
      setReferredCases(Array.isArray(json?.data) ? json.data : []);
    } catch (error) {
      setReferredCases([]);
      setReferredError(error.message || 'Unable to load referred patients');
    } finally {
      if (!silent) setReferredLoading(false);
    }
  };

  const handleApproveReferredCase = async (caseItem) => {
    if (!caseItem?._id) return;

    setReferredActionCaseId(caseItem._id);
    setReferredActionType('approve');
    setReferredError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        buildApiUrl(`/api/general/referred-patients/${caseItem._id}/approve`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const message = await extractApiErrorMessage(response, 'Failed to approve referral');
        throw new Error(message);
      }

      await response.json().catch(() => null);
      setIsCompactMessageBox(true);
      setMessageTitle('');
      setMessageContent('Approved successfully');
      setShowMessageBox(true);

      await fetchReferredPatients({ silent: true });
      await fetchAssignedPGsOverview({ silent: true });
    } catch (error) {
      setReferredError(error.message || 'Unable to approve referral');
    } finally {
      setReferredActionCaseId('');
      setReferredActionType('');
    }
  };

  const handleRescheduleReferredCase = async (caseItem) => {
    if (!caseItem?._id) return;

    const enteredReason = window.prompt('Enter reason to reschedule this referral:');
    if (enteredReason === null) {
      return;
    }

    const reason = String(enteredReason || '').trim();
    if (!reason) {
      setReferredError('Reschedule reason is required.');
      return;
    }

    setReferredActionCaseId(caseItem._id);
    setReferredActionType('reschedule');
    setReferredError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        buildApiUrl(`/api/general/referred-patients/${caseItem._id}/reschedule`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        const message = await extractApiErrorMessage(response, 'Failed to reschedule referral');
        throw new Error(message);
      }

      await response.json().catch(() => null);
      setIsCompactMessageBox(true);
      setMessageTitle('');
      setMessageContent('Updated successfully');
      setShowMessageBox(true);

      await fetchReferredPatients({ silent: true });
      await fetchAssignedPGsOverview({ silent: true });
    } catch (error) {
      setReferredError(error.message || 'Unable to reschedule referral');
    } finally {
      setReferredActionCaseId('');
      setReferredActionType('');
    }
  };

  // ================= CASE MANAGEMENT FUNCTIONS =================

  const fetchCases = async ({ silent = false } = {}) => {
    try {
      if (!silent) setCasesLoading(true);
      setCasesError('');

      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('/api/auth/doctor/assigned-pgs/cases'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        console.warn(`Error fetching cases: ${res.status} - ${res.statusText}`);
        throw new Error('Failed to fetch cases');
      }

      const json = await res.json();
      const allCases = json.cases || [];
      setCases(allCases);
    } catch (err) {
      console.error(err);
      setCasesError('Failed to fetch cases from your assigned PGs');
    } finally {
      if (!silent) setCasesLoading(false);
    }
  };

  const updateCaseStatusLocally = (caseId, statusText, approverName) => {
    setCases((prevCases) =>
      prevCases.map((caseItem) => {
        if (caseItem._id !== caseId) return caseItem;
        return {
          ...caseItem,
          chiefApproval: statusText,
          approvedBy: approverName,
          approvedAt: new Date(),
        };
      })
    );
  };

  const handleApprove = async (caseItem) => {
    setActionLoadingCaseId(caseItem._id);
    setActionLoadingType('approve');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        buildApiUrl(`/api/auth/doctor/assigned-pgs/cases/${caseItem._id}/approve`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            department: caseItem.department,
            chiefApproval: 'Approved',
            approvedBy: user?.name || 'Doctor',
          }),
        }
      );

      if (response.ok) {
        updateCaseStatusLocally(
          caseItem._id,
          'Approved',
          user?.name || 'Doctor'
        );
        setIsCompactMessageBox(true);
        setMessageTitle('');
        setMessageContent('Approved successfully');
        setShowMessageBox(true);
        fetchCases({ silent: true });
        fetchAssignedPGsOverview({ silent: true });
      } else {
        const text = await response.text();
        console.error('Approve API failed', response.status, text);
        setCasesError(`Failed to approve case (${response.status})`);
      }
    } catch (error) {
      console.error(error);
      setCasesError('Error approving case');
    } finally {
      setActionLoadingCaseId(null);
      setActionLoadingType('');
    }
  };

  const handleRedo = (caseItem) => {
    setSelectedCase(caseItem);
    setShowRedoBox(true);
  };

  const submitRedoReason = async () => {
    if (!redoReason.trim()) {
      alert('Please enter a reason');
      return;
    }

    if (!selectedCase?._id) {
      setCasesError('No case selected for resend');
      return;
    }

    setActionLoadingCaseId(selectedCase._id);
    setActionLoadingType('redo');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        buildApiUrl(`/api/auth/doctor/assigned-pgs/cases/${selectedCase._id}/approve`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            department: selectedCase.department,
            chiefApproval: `Resend: ${redoReason}`,
            approvedBy: user?.name || 'Doctor',
          }),
        }
      );

      if (response.ok) {
        updateCaseStatusLocally(
          selectedCase._id,
          `Resend: ${redoReason}`,
          user?.name || 'Doctor'
        );
        setShowRedoBox(false);
        setRedoReason('');
        setSelectedCase(null);

        setIsCompactMessageBox(true);
        setMessageTitle('');
        setMessageContent('Redo submitted successfully');
        setShowMessageBox(true);

        fetchCases({ silent: true });
        fetchAssignedPGsOverview({ silent: true });
      } else {
        setCasesError('Failed to submit resend request');
      }
    } catch (error) {
      console.error(error);
      setCasesError('Error submitting resend');
    } finally {
      setActionLoadingCaseId(null);
      setActionLoadingType('');
    }
  };

  const viewCaseSheet = (caseItem) => {
    // Kept for compatibility; now routes through preview-first flow.
    openCaseSheetPreview(caseItem);
  };

  const normalizeXraySrc = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('data:')) return raw;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/')) return raw;
    // Assume base64 payload if no obvious prefix.
    return `data:image/jpeg;base64,${raw}`;
  };

  const openFullCaseSheet = (caseItem) => {
    if (!caseItem?._id) return;
    localStorage.setItem('viewCaseDepartment', caseItem.department);
    window.open(`/case-sheet-view/${caseItem._id}`, '_blank');
  };

  const closeCaseSheetPreview = () => {
    setShowCaseSheetPreview(false);
    setCaseSheetPreviewItem(null);
    setCaseSheetPreviewLoading(false);
    setCaseSheetPreviewError('');
    setCaseSheetPreviewGeneralCase(null);
    setHasOpenedDepartmentCaseSheet(false);
  };

  const openCaseSheetPreview = async (caseItem) => {
    setShowCaseSheetPreview(true);
    setCaseSheetPreviewItem(caseItem || null);
    setCaseSheetPreviewGeneralCase(null);
    setCaseSheetPreviewError('');
    setHasOpenedDepartmentCaseSheet(false);

    const patientId = String(caseItem?.patientId || '').trim();
    if (!patientId) {
      setCaseSheetPreviewError('Patient ID missing for this case.');
      return;
    }

    setCaseSheetPreviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        buildApiUrl(`/api/general/patient/${encodeURIComponent(patientId)}`),
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        setCaseSheetPreviewError('Failed to load General Case Sheet preview.');
        return;
      }

      const json = await response.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      if (!rows.length) {
        setCaseSheetPreviewError('No General Case Sheet found for this patient.');
        return;
      }

      const latest = [...rows].sort((a, b) => {
        const aTime = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const bTime = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
        return bTime - aTime;
      })[0];

      setCaseSheetPreviewGeneralCase(latest);
    } catch (error) {
      console.error('Failed to load general case preview:', error);
      setCaseSheetPreviewError('Error loading General Case Sheet preview.');
    } finally {
      setCaseSheetPreviewLoading(false);
    }
  };

  const viewPrescription = (caseItem) => {
    (async () => {
      try {
        if (caseItem?.patientId) {
          setStoredPatientId(caseItem.patientId);
          localStorage.setItem('CurrentpatientName', caseItem.patientName || '');
        }

        if (caseItem?._id) {
          localStorage.setItem('linkedCaseId', caseItem._id);
          localStorage.setItem('linkedCaseDepartment', caseItem.department);
        }

        const token = localStorage.getItem('token');
        const patientId = caseItem?.patientId;
        const caseId = caseItem?._id;

        if (!patientId) {
          window.open('/prescriptions', '_blank');
          return;
        }

        if (caseId) {
          const resByCase = await fetch(buildApiUrl(`/api/prescriptions/case/${caseId}?page=1&limit=1`), {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });

          if (resByCase.ok) {
            const json = await resByCase.json();
            const prescriptions = json.data || [];
            if (prescriptions.length > 0) {
              const prescId = prescriptions[0]._id;
              window.open(`/prescription-view?id=${prescId}&format=pdf`, '_blank');
              return;
            }
          }
        }

        const res = await fetch(buildApiUrl(`/api/prescriptions/patient/${patientId}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.ok) {
          const json = await res.json();
          const prescriptions = json.data || [];
          if (prescriptions.length > 0) {
            const prescId = prescriptions[0]._id;
            window.open(`/prescription-view?id=${prescId}&format=pdf`, '_blank');
            return;
          }
        }

        localStorage.setItem('linkedCaseId', caseItem._id);
        localStorage.setItem('linkedCaseDepartment', caseItem.department);
        window.open('/prescriptions', '_blank');
      } catch (err) {
        console.error('Error opening prescription view:', err);
        localStorage.setItem('linkedCaseId', caseItem._id);
        localStorage.setItem('linkedCaseDepartment', caseItem.department);
        window.open('/prescriptions', '_blank');
      }
    })();
  };

  const viewPatientDetailsFromCase = async (caseItem) => {
    const patientId = String(caseItem?.patientId || '').trim();
    if (!patientId) {
      setCasesError('Patient ID missing for this case.');
      return;
    }

    setStoredPatientId(patientId);
    if (caseItem?.patientName) {
      localStorage.setItem('CurrentpatientName', caseItem.patientName);
    }

    setActiveView('patient');
    setFormData((prev) => ({ ...prev, uniqueId: patientId }));
    setShowUserIdDisplay(false);
    setShowForm(false);
    setGeneratedUserId('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await handleGetDetails(patientId);
  };

  const getApprovalStatus = (caseItem) => {
    if (!caseItem.chiefApproval) return 'Pending';
    if (caseItem.chiefApproval.toLowerCase().includes('approved'))
      return 'Approved';
    if (
      caseItem.chiefApproval.toLowerCase().includes('redo') ||
      caseItem.chiefApproval.toLowerCase().includes('resend')
    )
      return 'Resent';
    return caseItem.chiefApproval;
  };

  const getCaseDisplayText = (caseItem) => {
    const candidates = [
      caseItem?.chiefComplaint,
      caseItem?.finalDiagnosis,
      caseItem?.provisionalDiagnosis,
      caseItem?.diagnosis,
      caseItem?.clinical_diagnosis,
      caseItem?.definitive_diagnosis,
      caseItem?.chief_complaint,
      caseItem?.caseType,
      caseItem?.department,
    ];

    const matched = candidates
      .map((value) => String(value || '').trim())
      .find((value) => value.length > 0);

    return matched || '—';
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'Approved') return 'status-badge approved';
    if (status === 'Resent') return 'status-badge redo';
    return 'status-badge pending';
  };

    const getCaseFilesStatusIndicator = () => {
      if (!cases || cases.length === 0) return null;
      const allApproved = cases.every((caseItem) => getApprovalStatus(caseItem) === 'Approved');
      if (allApproved) return 'green';
      return 'yellow';
    };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });

  const getInitials = () => {
    const name = doctorName || user?.name || 'Doctor';
    return name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });

  return (
    <div className="chief-layout">
      <header className="chief-topbar">
        <div className="chief-topbar-left">
          <button
            type="button"
            className="chief-nav-toggle"
            aria-label={isSideNavOpen ? 'Collapse navigation' : 'Expand navigation'}
            title="Menu"
            onClick={() => setIsSideNavOpen((v) => !v)}
          >
            ☰
          </button>

          <div className="chief-brand">
            <img
              className="chief-brand-logo"
              src="/images/logo.png"
              alt="Logo"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
            <div className="chief-brand-title">
              Doctor Dashboard
              {doctorDepartmentLabel ? (
                <span className="chief-brand-title-dept">— {formatDepartmentLabel(doctorDepartmentLabel)}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="chief-topbar-right">
          <div
            className="chief-topbar-date"
            style={{ marginRight: 16, color: '#fff', opacity: 0.9, fontSize: 13, fontWeight: 600 }}
          >
            {todayLabel}
          </div>

          <div className="user-profile-dropdown" ref={dropdownRef}>
            <div className="profile-button" onClick={toggleLogoutDropdown}>
              <div className="profile-avatar">{getInitials()}</div>
              <div className="profile-info">
                <span className="profile-name">{doctorName || user?.name || 'Doctor'}</span>
                <span className="profile-email">{doctorEmail || user?.email || ''}</span>
              </div>
              <div className="profile-arrow">{showLogoutDropdown ? '▲' : '▼'}</div>
            </div>

            {showLogoutDropdown && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">{getInitials()}</div>
                  <div className="dropdown-user-info">
                    <div className="dropdown-name">{doctorName || user?.name || 'Doctor'}</div>
                    {doctorId && <div className="dropdown-id">ID: {doctorId}</div>}
                    <div className="dropdown-email">{doctorEmail || user?.email || ''}</div>
                    {doctorDepartmentLabel && (
                      <div className="dropdown-dept">{formatDepartmentLabel(doctorDepartmentLabel)}</div>
                    )}
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                <div className="dropdown-options">
                  <button className="dropdown-item" onClick={handleViewProfile} type="button">
                    <span className="dropdown-icon">👤</span>
                    <span>My Profile</span>
                  </button>

                  <button className="dropdown-item" onClick={handleChangePassword} type="button">
                    <span className="dropdown-icon">🔒</span>
                    <span>Change Password</span>
                  </button>

                  <div className="dropdown-divider"></div>

                  <button
                    className="dropdown-item logout"
                    onClick={() => {
                      setShowLogoutDropdown(false);
                      handleLogout();
                    }}
                    type="button"
                  >
                    <span className="dropdown-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="chief-body">
        {isSideNavOpen && (
          <aside className="chief-sidenav" aria-label="Doctor navigation">
            <div className="chief-sidenav-section">
              <div className="chief-sidenav-title">Menu</div>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'myAppointments' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('myAppointments');
                  fetchMyAppointments({ silent: true });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">📅</span>
                <span>My Appointments</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'patient' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('patient');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">🧾</span>
                <span>Patients</span>
              </button>

              <button
                type="button"
                className="chief-nav-item"
                onClick={() => {
                  navigate('/doctor-schedule');
                }}
              >
                <span className="chief-nav-icon">🗓️</span>
                <span>All Appointments</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'myPGs' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('myPGs');
                  fetchAssignedPGsOverview({ silent: true });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">👨‍🎓</span>
                <span>My PGs</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'myUGs' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('myUGs');
                  fetchAssignedUGs({ silent: true });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">👩‍🎓</span>
                <span>My UGs</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'pgAppointments' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('pgAppointments');
                  fetchAssignedPGsOverview({ silent: true });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">🗓️</span>
                <span>PG Appointments</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'rescheduleRequests' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('rescheduleRequests');
                  fetchRescheduleRequests();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">🔄</span>
                <span>Reschedule Requests</span>
                {rescheduleRequests.length > 0 && (
                  <span style={{
                    background: '#e53e3e', color: '#fff', borderRadius: '50%',
                    fontSize: '11px', fontWeight: 700, minWidth: '18px', height: '18px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginLeft: '6px', padding: '0 4px',
                  }}>
                    {rescheduleRequests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'analytics' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('analytics');
                  fetchAssignedUGs({ silent: true });
                  loadDoctorPgAnalytics();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">📊</span>
                <span>Analytics</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'caseFiles' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('caseFiles');
                  fetchCases({ silent: true });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">📁</span>
                <span>Case Files</span>
                  {getCaseFilesStatusIndicator() && (
                    <span
                      className="case-files-status-indicator"
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: getCaseFilesStatusIndicator(),
                        marginLeft: '6px',
                        verticalAlign: 'middle'
                      }}
                      title={
                        getCaseFilesStatusIndicator() === 'green'
                          ? 'All cases approved'
                          : 'Waiting for approval'
                      }
                    />
                  )}
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'reports' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('reports');
                  fetchAssignedUGs({ silent: true });
                  loadDoctorPgAnalytics();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">📈</span>
                <span>Reports</span>
              </button>
            </div>

            <div className="chief-sidenav-section">
              <div className="chief-sidenav-title">PG Management</div>
              <button
                type="button"
                className="chief-nav-item"
                onClick={openCreatePGModal}
              >
                <span className="chief-nav-icon">👨‍🎓</span>
                <span>Assign PG</span>
              </button>
            </div>

            <div className="chief-sidenav-section">
              <div className="chief-sidenav-title">UG Management</div>
              <button
                type="button"
                className="chief-nav-item"
                onClick={openCreateUGModal}
              >
                <span className="chief-nav-icon">👩‍🎓</span>
                <span>Assign UG</span>
              </button>
            </div>
          </aside>
        )}

        <main className="chief-main" aria-label="Doctor content">
          {/* My Appointments View */}
          {activeView === 'myAppointments' && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>My Appointments</h2>
                <button type="button" className="view-button" onClick={() => fetchMyAppointments()}>
                  Refresh
                </button>
              </div>

              {myAppointmentsError && <div className="error-message">{myAppointmentsError}</div>}

              {myAppointmentsLoading ? (
                <div className="chief-inline-loading">Loading appointments...</div>
              ) : myAppointments.length === 0 ? (
                <div className="chief-empty-state">No appointments assigned to you yet.</div>
              ) : (
                <table className="chief-simple-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Booking ID</th>
                      <th>Patient ID</th>
                      <th>Patient Name</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Chief Complaint</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAppointments.map((appointment, index) => (
                      <tr key={appointment.bookingId}>
                        <td>{index + 1}</td>
                        <td>{appointment.bookingId}</td>
                        <td>{appointment.patientId}</td>
                        <td>{appointment.patientName || '-'}</td>
                        <td>{appointment.appointmentDate}</td>
                        <td>{appointment.appointmentTime}</td>
                        <td>{appointment.chiefComplaint}</td>
                        <td>
                          <button
                            type="button"
                            className="view-button"
                            onClick={() => handleSelectPatientFromAppointment(appointment)}
                          >
                            View Patient
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {/* My PGs View */}
          {activeView === 'myPGs' && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>My Assigned PGs</h2>
                <button type="button" className="view-button" onClick={() => fetchAssignedPGsOverview()}>
                  Refresh
                </button>
              </div>

              {pgError && <div className="error-message">{pgError}</div>}

              {pgLoading ? (
                <div className="chief-inline-loading">Loading assigned PGs...</div>
              ) : assignedPGs.length === 0 ? (
                <div className="chief-empty-state">No PGs currently assigned by you.</div>
              ) : (
                <table className="chief-simple-table">
                  <thead>
                    <tr>
                        <th>S.No</th>
                      <th>Name</th>
                      <th>Number</th>
                      <th>Mail</th>
                      <th>PG ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                      {assignedPGs.map((pg, index) => (
                      <tr key={pg._id}>
                        <td>
                            {index + 1}
                        </td>
                        <td>
                          {pg.name || '-'}
                        </td>
                        <td>
                          {pg.phone || '-'}
                        </td>
                        <td>
                          {pg.email || '-'}
                        </td>
                        <td>{pg.Identity || '-'}</td>
                        <td>
                          <div className="chief-manage-actions">
                            <button
                              type="button"
                              className="view-button"
                              disabled={manageActionLoadingPGId === pg._id}
                              onClick={() => openEditPGModal(pg)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-button redo-btn"
                              disabled={manageActionLoadingPGId === pg._id}
                              onClick={() => handleUnassignPG(pg._id, pg.name || pg.Identity || 'PG')}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {/* My UGs View */}
          {activeView === 'myUGs' && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>My Assigned UGs</h2>
                <button type="button" className="view-button" onClick={() => fetchAssignedUGs()}>
                  Refresh
                </button>
              </div>

              {ugError && <div className="error-message">{ugError}</div>}

              {ugLoading ? (
                <div className="chief-inline-loading">Loading assigned UGs...</div>
              ) : assignedUGs.length === 0 ? (
                <div className="chief-empty-state">No UGs currently assigned by you.</div>
              ) : (
                <table className="chief-simple-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Name</th>
                      <th>Number</th>
                      <th>Mail</th>
                      <th>UG ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedUGs.map((ug, index) => (
                      <tr key={ug._id}>
                        <td>{index + 1}</td>
                        <td>{ug.name || '-'}</td>
                        <td>{ug.phone || '-'}</td>
                        <td>{ug.email || '-'}</td>
                        <td>{ug.Identity || '-'}</td>
                        <td>
                          <div className="chief-manage-actions">
                            <button
                              type="button"
                              className="view-button"
                              disabled={manageActionLoadingUGId === ug._id}
                              onClick={() => openEditUGModal(ug)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-button redo-btn"
                              disabled={manageActionLoadingUGId === ug._id}
                              onClick={() => handleUnassignUG(ug._id, ug.name || ug.Identity || 'UG')}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {/* PG Appointments View */}
          {activeView === 'pgAppointments' && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>Cases Assigned to PGs</h2>
                <button type="button" className="view-button" onClick={() => fetchAssignedPGsOverview()}>
                  Refresh
                </button>
              </div>

              {pgError && <div className="error-message">{pgError}</div>}

              {pgLoading ? (
                <div className="chief-inline-loading">Loading PG case assignments...</div>
              ) : assignedAppointments.length === 0 ? (
                <div className="chief-empty-state">No PG case assignments found yet.</div>
              ) : (
                <>
                  <div className="chief-doctor-selector pg-appointment-selector">
                      <input
                        type="text"
                        placeholder="Search doctor by name or ID..."
                        value={pgSearchTerm}
                        onChange={(e) => setPGSearchTerm(e.target.value)}
                        className="chief-select pg-select-doctor"
                      />
                    <select 
                      id="pg-select"
                      value={selectedAppointmentPG}
                      onChange={(e) => setSelectedAppointmentPG(e.target.value)}
                      className="chief-select pg-select-doctor"
                    >
                      <option value="">All PGs</option>
                        {assignedPGs
                          .filter((pg) => {
                            if (!pgSearchTerm.trim()) return true;
                            const searchLower = pgSearchTerm.toLowerCase();
                            return (
                              (pg.name || '').toLowerCase().includes(searchLower) ||
                              (pg.Identity || '').toLowerCase().includes(searchLower)
                            );
                          })
                          .map((pg) => (
                        <option key={`${pg.Identity}-${pg.department}`} value={pg.Identity}>
                          {pg.name} ({pg.Identity})
                        </option>
                        ))}
                    </select>

                    <label htmlFor="pg-from-date" className="pg-appointment-selector-label">From:</label>
                    <input
                      id="pg-from-date"
                      type="date"
                      value={pgFromDate}
                      onChange={(e) => setPgFromDate(e.target.value)}
                      className="chief-select pg-select-doctor pg-date-input"
                    />

                    <label htmlFor="pg-to-date" className="pg-appointment-selector-label">To:</label>
                    <input
                      id="pg-to-date"
                      type="date"
                      value={pgToDate}
                      onChange={(e) => setPgToDate(e.target.value)}
                      className="chief-select pg-select-doctor pg-date-input"
                    />
                  </div>
                  <table className="chief-simple-table">
                    <thead>
                      <tr>
                          <th>S.No</th>
                        <th>PG Name</th>
                        <th>Booking ID</th>
                        <th>Patient ID</th>
                        <th>Patient Name</th>
                        <th>Appt Date</th>
                        <th>Appt Time</th>
                        <th>Assigned On</th>
                        <th>Complaint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedAppointments
                        .filter((appt) => !selectedAppointmentPG || appt.pgIdentity === selectedAppointmentPG)
                        .filter((appt) => {
                          if (!selectedAppointmentPG && pgSearchTerm.trim()) {
                            const searchLower = pgSearchTerm.toLowerCase();
                            return (
                              (appt.pgName || '').toLowerCase().includes(searchLower) ||
                              (appt.pgIdentity || '').toLowerCase().includes(searchLower)
                            );
                          }
                          return true;
                        })
                        .filter((appt) => {
                          const from = parseLocalDateInput(pgFromDate, false);
                          const to = parseLocalDateInput(pgToDate, true);
                          if (!from && !to) return true;

                          const assigned = appt?.assignedAt ? new Date(appt.assignedAt) : null;
                          if (!assigned || Number.isNaN(assigned.getTime())) return false;
                          if (from && assigned < from) return false;
                          if (to && assigned > to) return false;
                          return true;
                        })
                        .map((appointment, index) => (
                          <tr key={appointment.referralId || `${appointment.pgIdentity}-${appointment.patientId}`}>
                            <td>{index + 1}</td>
                            <td>{appointment.pgName || '-'}</td>
                            <td>{appointment.bookingId || '-'}</td>
                            <td>{appointment.patientId || '-'}</td>
                            <td>{appointment.patientName || '-'}</td>
                            <td>{appointment.appointmentDate || '-'}</td>
                            <td>{appointment.appointmentTime || '-'}</td>
                            <td>{appointment.assignedAt ? formatDate(appointment.assignedAt) : '-'}</td>
                            <td>{appointment.chiefComplaint || '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>
          )}

          {/* Reschedule Requests View */}
          {activeView === 'rescheduleRequests' && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>Reschedule Requests</h2>
                <button type="button" className="view-button" onClick={() => fetchRescheduleRequests()}>
                  Refresh
                </button>
              </div>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                Reschedule requests submitted by PG/UG students. Approve or reject each request. Patient will be notified by email after your decision.
              </p>

              {rescheduleRequestsError && (
                <div className="error-message">{rescheduleRequestsError}</div>
              )}

              {rescheduleRequestsLoading ? (
                <div className="chief-inline-loading">Loading reschedule requests...</div>
              ) : rescheduleRequests.length === 0 ? (
                <div className="chief-empty-state">No pending reschedule requests.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="chief-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Requested By</th>
                        <th>Current Appointment</th>
                        <th>Requested New Time</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rescheduleRequests.map((req) => {
                        const isActing = rescheduleActionLoadingId === req.bookingId;
                        return (
                          <tr key={req.bookingId}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{req.patientName || req.patientId || '—'}</div>
                              <div style={{ fontSize: '12px', color: '#888' }}>{req.patientId || ''}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{req.requestedByName || req.rescheduleRequest?.requestedByName || '—'}</div>
                              <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>{req.requestedByRole || ''}</div>
                            </td>
                            <td>
                              <div>{formatDisplayDate(req.appointmentDate)}</div>
                              <div style={{ fontSize: '12px', color: '#555' }}>{req.appointmentTime || '—'}</div>
                            </td>
                            <td style={{ color: '#2b6cb0', fontWeight: 600 }}>
                              <div>{formatDisplayDate(req.rescheduleRequest?.requestedDate)}</div>
                              <div style={{ fontSize: '12px' }}>{req.rescheduleRequest?.requestedTime || '—'}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  title="Approve"
                                  disabled={isActing}
                                  onClick={() => handleApproveReschedule(req.bookingId)}
                                  style={{ background: '#38a169', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: isActing ? 'not-allowed' : 'pointer', opacity: isActing ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  title="Reject"
                                  disabled={isActing}
                                  onClick={() => openRejectBox(req.bookingId)}
                                  style={{ background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', cursor: isActing ? 'not-allowed' : 'pointer', opacity: isActing ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                >
                                  ✗
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Reject Reason Modal */}
              {showRejectReasonBox && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                }}>
                  <div style={{
                    background: '#fff', borderRadius: '12px', padding: '28px',
                    width: '100%', maxWidth: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>Reject Reschedule Request</h3>
                    <p style={{ color: '#555', fontSize: '14px', marginBottom: '16px' }}>
                      Optionally provide a reason. The patient will be notified by email.
                    </p>
                    <textarea
                      rows={3}
                      placeholder="Reason for rejection (optional)..."
                      value={rejectReasonText}
                      onChange={(e) => setRejectReasonText(e.target.value)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '8px',
                        border: '1px solid #ddd', fontSize: '14px', resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => { setShowRejectReasonBox(false); setRejectReasonBookingId(''); setRejectReasonText(''); }}
                        style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={rescheduleActionLoadingId === rejectReasonBookingId}
                        onClick={handleRejectReschedule}
                        style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#e53e3e', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {rescheduleActionLoadingId === rejectReasonBookingId ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Referral Queue View */}
          {activeView === 'referrals' && canUseReferralQueue && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>General Referral Queue</h2>
                <button type="button" className="view-button" onClick={() => fetchReferredPatients()}>
                  Refresh
                </button>
              </div>

              {referredError && <div className="error-message">{referredError}</div>}

              {referredLoading ? (
                <div className="chief-inline-loading">Loading referrals assigned to you...</div>
              ) : referredCases.length === 0 ? (
                <div className="chief-empty-state">No referrals are currently pending for your review.</div>
              ) : (
                <table className="chief-simple-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Referral ID</th>
                      <th>Patient ID</th>
                      <th>Patient Name</th>
                      <th>Referred On</th>
                      <th>Chief Complaint</th>
                      <th>Assigned PG</th>
                      <th>Reschedule Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referredCases.map((caseItem, index) => {
                      const status = formatSpecialistReferralStatus(caseItem?.specialistStatus);
                      const isApproved = status === 'Approved';

                      return (
                        <tr key={caseItem._id}>
                          <td>{index + 1}</td>
                          <td>{caseItem._id || '-'}</td>
                          <td>{caseItem.patientId || '-'}</td>
                          <td>{caseItem.patientName || '-'}</td>
                          <td>{caseItem.referredAt ? formatDate(caseItem.referredAt) : '-'}</td>
                          <td>{caseItem.chiefComplaint || '-'}</td>
                          <td>{caseItem.assignedPgName || caseItem.assignedPgId || '-'}</td>
                          <td>{caseItem.specialistRescheduleReason || '-'}</td>
                          <td>
                            <div className="chief-manage-actions">
                              <button
                                type="button"
                                className="action-button approve-btn"
                                onClick={() => handleApproveReferredCase(caseItem)}
                                disabled={
                                  isApproved ||
                                  (referredActionCaseId === caseItem._id && referredActionType === 'approve')
                                }
                              >
                                {referredActionCaseId === caseItem._id && referredActionType === 'approve'
                                  ? 'Approving...'
                                  : 'Approve'}
                              </button>
                              <button
                                type="button"
                                className="action-button redo-btn"
                                onClick={() => handleRescheduleReferredCase(caseItem)}
                                disabled={
                                  status === 'Rescheduled' ||
                                  referredActionCaseId === caseItem._id &&
                                  referredActionType === 'reschedule'
                                }
                              >
                                {referredActionCaseId === caseItem._id && referredActionType === 'reschedule'
                                  ? 'Saving...'
                                  : 'Reschedule'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {/* Analytics View */}
          {activeView === 'reports' && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>Assigned Students Reports</h2>
                <div className="chief-analytics-actions">
                  <button
                    type="button"
                    className="view-button"
                    onClick={loadDoctorPgAnalytics}
                    disabled={doctorPgAnalyticsLoading}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="view-button"
                    onClick={downloadDoctorPgAnalytics}
                    disabled={!doctorPgAnalyticsReport || doctorPgAnalyticsLoading}
                  >
                    Download Excel
                  </button>
                </div>
              </div>

              <div className="chief-analytics-controls">
                <div className="chief-analytics-control">
                  <label>From</label>
                  <input
                    className="chief-select"
                    type="date"
                    value={analyticsFromDate}
                    onChange={(e) => setAnalyticsFromDate(e.target.value)}
                  />
                </div>

                <div className="chief-analytics-control">
                  <label>To</label>
                  <input
                    className="chief-select"
                    type="date"
                    value={analyticsToDate}
                    onChange={(e) => setAnalyticsToDate(e.target.value)}
                  />
                </div>
              </div>

              {doctorPgAnalyticsError && <div className="error-message">{doctorPgAnalyticsError}</div>}

              {doctorPgAnalyticsLoading ? (
                <div className="chief-inline-loading">Loading reports...</div>
              ) : !doctorPgAnalyticsReport || !Array.isArray(doctorPgAnalyticsReport.pgs) ? (
                <div className="chief-empty-state">Select a date range and click View.</div>
              ) : doctorPgAnalyticsReport.pgs.length === 0 ? (
                <div className="chief-empty-state">No report data available for assigned students.</div>
              ) : (
                <>
                  <div className="chief-summary-grid" style={{ marginBottom: 16 }}>
                    <div className="chief-summary-card">
                      <h3>PGs</h3>
                      <p>{doctorPgAnalyticsReport.assignedPGCount || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>UGs</h3>
                      <p>{doctorPgAnalyticsReport.assignedUGCount ?? assignedUGs.length}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Total Patients</h3>
                      <p>{doctorPgAnalyticsReport.totals?.uniquePatients || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Approved</h3>
                      <p>{doctorPgAnalyticsReport.totals?.approvalCounts?.approved || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                        <h3>Redo</h3>
                      <p>{doctorPgAnalyticsReport.totals?.approvalCounts?.rejected || 0}</p>
                    </div>
                  </div>

                  <div className="chief-analytics-charts">
                    {/* Patients by PG Pie Chart */}
                    <div className="chief-chart-container">
                      <h3>Patients Distribution by Student</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={doctorPgAnalyticsReport.pgs.map((d) => ({
                              name: d.pgName || d.pgIdentity,
                              value: d.uniquePatients || 0,
                            }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => `${entry.name}: ${entry.value}`}
                          >
                            {doctorPgAnalyticsReport.pgs.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${index * 137.5}, 70%, 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Gender Distribution Pie Chart */}
                    <div className="chief-chart-container">
                      <h3>Gender Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: 'Male',
                                value: doctorPgAnalyticsReport.pgs.reduce(
                                  (sum, d) => sum + (d.malePatients || 0),
                                  0
                                ),
                              },
                              {
                                name: 'Female',
                                value: doctorPgAnalyticsReport.pgs.reduce(
                                  (sum, d) => sum + (d.femalePatients || 0),
                                  0
                                ),
                              },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => `${entry.name}: ${entry.value}`}
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#ec4899" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* New vs Old Patients Pie Chart */}
                    <div className="chief-chart-container">
                      <h3>Old vs New Patients</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: 'New Patients',
                                value: doctorPgAnalyticsReport.pgs.reduce(
                                  (sum, d) => sum + (d.newPatients || 0),
                                  0
                                ),
                              },
                              {
                                name: 'Old Patients',
                                value: doctorPgAnalyticsReport.pgs.reduce(
                                  (sum, d) => sum + (d.oldPatients || 0),
                                  0
                                ),
                              },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => `${entry.name}: ${entry.value}`}
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#f59e0b" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <table className="chief-simple-table" style={{ marginTop: 16 }}>
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Student</th>
                        <th>Patients</th>
                        <th>Male</th>
                        <th>Female</th>
                        <th>New</th>
                        <th>Old</th>
                        <th>Case Sheets</th>
                        <th>Approved</th>
                        <th>Redo</th>
                        <th>Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPgAnalyticsReport.pgs.map((row, index) => (
                        <tr key={row.pgIdentity}>
                          <td>{index + 1}</td>
                          <td>{row.pgName || row.pgIdentity}</td>
                          <td>{row.uniquePatients || 0}</td>
                          <td>{row.malePatients || 0}</td>
                          <td>{row.femalePatients || 0}</td>
                          <td>{row.newPatients || 0}</td>
                          <td>{row.oldPatients || 0}</td>
                          <td>{row.totalCaseSheets || 0}</td>
                          <td>{row.approvalCounts?.approved || 0}</td>
                          <td>{row.approvalCounts?.rejected || 0}</td>
                          <td>{row.approvalCounts?.pending || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>
          )}

          {/* Analytics View */}
          {activeView === 'analytics' && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>Assigned Students Analytics</h2>
                <div className="chief-analytics-actions">
                  <button
                    type="button"
                    className="view-button"
                    onClick={loadDoctorPgAnalytics}
                    disabled={doctorPgAnalyticsLoading}
                  >
                    View
                  </button>
                </div>
              </div>

              <div className="chief-analytics-controls">
                <div className="chief-analytics-control">
                  <label>From</label>
                  <input
                    className="chief-select"
                    type="date"
                    value={analyticsFromDate}
                    onChange={(e) => setAnalyticsFromDate(e.target.value)}
                  />
                </div>

                <div className="chief-analytics-control">
                  <label>To</label>
                  <input
                    className="chief-select"
                    type="date"
                    value={analyticsToDate}
                    onChange={(e) => setAnalyticsToDate(e.target.value)}
                  />
                </div>
              </div>

              {doctorPgAnalyticsError && <div className="error-message">{doctorPgAnalyticsError}</div>}

              {doctorPgAnalyticsLoading ? (
                <div className="chief-inline-loading">Loading analytics...</div>
              ) : !doctorPgAnalyticsReport || !Array.isArray(doctorPgAnalyticsReport.pgs) ? (
                <div className="chief-empty-state">Select a date range and click View.</div>
              ) : doctorPgAnalyticsReport.pgs.length === 0 ? (
                <div className="chief-empty-state">No analytics data available for assigned students.</div>
              ) : (
                <>
                <div className="chief-summary-grid" style={{ marginBottom: 16 }}>
                  <div className="chief-summary-card">
                    <h3>PGs</h3>
                    <p>{doctorPgAnalyticsReport.assignedPGCount || 0}</p>
                  </div>
                  <div className="chief-summary-card">
                    <h3>UGs</h3>
                    <p>{doctorPgAnalyticsReport.assignedUGCount ?? assignedUGs.length}</p>
                  </div>
                  <div className="chief-summary-card">
                    <h3>Total Patients</h3>
                    <p>{doctorPgAnalyticsReport.totals?.uniquePatients || 0}</p>
                  </div>
                  <div className="chief-summary-card">
                    <h3>Approved</h3>
                    <p>{doctorPgAnalyticsReport.totals?.approvalCounts?.approved || 0}</p>
                  </div>
                  <div className="chief-summary-card">
                    <h3>Redo</h3>
                    <p>{doctorPgAnalyticsReport.totals?.approvalCounts?.rejected || 0}</p>
                  </div>
                </div>

                <div className="chief-analytics-charts">
                  {/* Gender Distribution Pie Chart */}
                  <div className="chief-chart-container">
                    <h3>Gender Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { 
                              name: 'Male', 
                              value: doctorPgAnalyticsReport.pgs.reduce((sum, d) => sum + (d.malePatients || 0), 0) 
                            },
                            { 
                              name: 'Female', 
                              value: doctorPgAnalyticsReport.pgs.reduce((sum, d) => sum + (d.femalePatients || 0), 0) 
                            }
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#ec4899" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* New vs Old Patients Pie Chart */}
                  <div className="chief-chart-container">
                    <h3>Old vs New Patients</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { 
                              name: 'New Patients', 
                              value: doctorPgAnalyticsReport.pgs.reduce((sum, d) => sum + (d.newPatients || 0), 0) 
                            },
                            { 
                              name: 'Old Patients', 
                              value: doctorPgAnalyticsReport.pgs.reduce((sum, d) => sum + (d.oldPatients || 0), 0) 
                            }
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                </div>

                <table className="chief-simple-table" style={{ marginTop: 16 }}>
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Student</th>
                      <th>Patients</th>
                      <th>Male</th>
                      <th>Female</th>
                      <th>New</th>
                      <th>Old</th>
                      <th>Case Sheets</th>
                      <th>Approved</th>
                      <th>Redo</th>
                      <th>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorPgAnalyticsReport.pgs.map((row, index) => (
                      <tr key={row.pgIdentity}>
                        <td>{index + 1}</td>
                        <td>{row.pgName || row.pgIdentity}</td>
                        <td>{row.uniquePatients || 0}</td>
                        <td>{row.malePatients || 0}</td>
                        <td>{row.femalePatients || 0}</td>
                        <td>{row.newPatients || 0}</td>
                        <td>{row.oldPatients || 0}</td>
                        <td>{row.totalCaseSheets || 0}</td>
                        <td>{row.approvalCounts?.approved || 0}</td>
                        <td>{row.approvalCounts?.rejected || 0}</td>
                        <td>{row.approvalCounts?.pending || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>
              )}
            </section>
          )}

          {/* Case Files View */}
          {activeView === 'caseFiles' && (
            <>
              <div className="reports-search-top-container">
                <div className="search-container chief-search-only">
                  <div className="search-wrapper">
                    <div className="search-icon">🔍</div>
                    <input
                      type="text"
                      placeholder="Search by Doctor Name"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="chief-case-search-input"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="clear-search-btn"
                        title="Clear search"
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {casesError && (
                <div className="error-message">
                  {casesError}
                  <button onClick={fetchCases} type="button">
                    Retry
                  </button>
                </div>
              )}

              {casesLoading ? (
                <div className="chief-inline-loading">Loading cases...</div>
              ) : (
                <table className="chief-cases-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Patient Name</th>
                      <th>Patient ID</th>
                      <th>Chief Complaint</th>
                      <th>Doctor Name</th>
                      <th>Date</th>
                      <th>Case Sheet</th>
                      <th>Prescription</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases
                      .filter((c) => {
                        if (!searchTerm.trim()) return true;
                        const query = searchTerm.toLowerCase();
                        return (c.doctorName || '').toLowerCase().includes(query);
                      })
                      .sort((a, b) => {
                        const statusA = getApprovalStatus(a);
                        const statusB = getApprovalStatus(b);

                        const priority = {
                          Pending: 0,
                          Resent: 1,
                          Approved: 2,
                        };

                        const priorityA = priority[statusA] ?? 3;
                        const priorityB = priority[statusB] ?? 3;

                        if (priorityA !== priorityB) {
                          return priorityA - priorityB;
                        }

                        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                      })
                      .map((c, i) => {
                        const status = getApprovalStatus(c);
                        return (
                          <tr key={c._id}>
                            <td>{i + 1}</td>
                            <td>{c.patientName || '—'}</td>
                            <td>{c.patientId || '—'}</td>
                            <td>{getCaseDisplayText(c)}</td>
                            <td>{c.doctorName || '-'}</td>
                            <td>{c.createdAt ? formatDate(c.createdAt) : '—'}</td>
                            <td>
                              <button
                                type="button"
                                className="view-button"
                                onClick={() => {
                                  const pid = String(c?.patientId || '').trim();
                                  const cid = String(c?._id || '').trim();
                                  const pname = String(c?.patientName || '').trim();
                                  const dept = String(c?.department || '').trim();
                                  const url = `/general-case-view?patientId=${encodeURIComponent(pid)}&patientName=${encodeURIComponent(pname)}&caseId=${encodeURIComponent(cid)}&department=${encodeURIComponent(dept)}`;
                                  window.open(url, '_blank');
                                }}
                                disabled={!String(c?.patientId || '').trim()}
                              >
                                View
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="view-button"
                                onClick={() => viewPrescription(c)}
                              >
                                View
                              </button>
                            </td>
                            <td>
                                <div className="chief-actions-group">
                                  {isSpecialistDoctor && status === 'Pending' ? (
                                  <div className="action-buttons">
                                    {actionLoadingCaseId === c._id ? (
                                      <div
                                        className="modern-action-loader"
                                        role="status"
                                        aria-live="polite"
                                      >
                                        <span className="modern-spinner" aria-hidden="true" />
                                        <span className="modern-loader-text">
                                          {actionLoadingType === 'approve'
                                            ? 'Approving...'
                                            : 'Submitting...'}
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          className="action-icon approve-icon"
                                          onClick={() => handleApprove(c)}
                                          type="button"
                                          title="Approve"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          className="action-icon redo-icon"
                                          onClick={() => handleRedo(c)}
                                          type="button"
                                          title="Redo"
                                        >
                                          ✕
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : status === 'Approved' ? (
                                  <span className="status-approved"> Approved</span>
                                ) : status === 'Resent' ? (
                                  <span className="status-redo"> Resent</span>
                                ) : (
                                  <span className="no-actions">No Actions</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Patient View (Original Content) */}
          {activeView === 'patient' && (
          <div className="doctor-dashboard-content">
            <h2 className="dashboard-title">Patient Details</h2>

              {/* Message boxes */}
              {message && <div className="error-message">{message}</div>}
              {successMessage && <div className="success-message">{successMessage}</div>}

            {/* Patient Search */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label>Search Patient</label>
              <input
                type="text"
                value={searchQuery || formData.uniqueId || ''}
                onChange={e => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setFormData(p => ({ ...p, uniqueId: val }));
                  setSearchType(/^\d+$/.test(val.trim()) ? 'id' : 'name');
                  if (val.length >= 2) handlePatientSearch(val);
                  else setSearchResults([]);
                }}
                placeholder="Enter name, patient ID or phone number"
                autoComplete="off"
              />
              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
                  background: '#1e2a4a', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: 260, overflowY: 'auto',
                }}>
                  {searchResults.map((p, i) => {
                    const fullName = [p.personalInfo?.firstName, p.personalInfo?.lastName].filter(Boolean).join(' ') || p.patientName || '—';
                    const phone = p.personalInfo?.phone || '—';
                    return (
                      <div key={p.patientId || i}
                        onClick={() => handleSelectSearchResult(p)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.07)',
                          display: 'flex', flexDirection: 'column', gap: 2,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(60,141,255,0.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{fullName}</span>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                          ID: {p.patientId} &nbsp;·&nbsp; 📞 {phone}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {searchLoading && (
                <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#3C8DFF', fontSize: '0.8rem' }}>
                  Searching…
                </div>
              )}
            </div>


            {/* Get Details Button */}
            <button className="get-details-btn" onClick={handleGetDetails} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Verify & Load Patient Details'}
            </button>

            {/* Generated User ID Display */}
            {showUserIdDisplay && (
              <div className="patient-id-display">
                <p>
                  Current Patient ID: <span>{generatedUserId}</span>
                </p>
              </div>
            )}

            {/* Form Section */}
            {showForm && (
              <div className="patient-form">
                <h3>Personal Information</h3>

            {/* Name fields */}
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="first-name">
                  First Name <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  id="first-name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
                {fieldErrors.firstName && <div className="error-message">{fieldErrors.firstName}</div>}
              </div>
              <div className="input-group">
                <label htmlFor="middle-name">
                  Middle Name
                </label>
                <input
                  type="text"
                  id="middle-name"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="last-name">
                Last Name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                id="last-name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
              {fieldErrors.lastName && <div className="error-message">{fieldErrors.lastName}</div>}
            </div>

            {/* DOB and Age */}
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="dob">
                  Date of Birth <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  required
                />
                {fieldErrors.dob && <div className="error-message">{fieldErrors.dob}</div>}
              </div>
              <div className="input-group">
                <label htmlFor="age">
                  Age
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  readOnly
                />
              </div>
            </div>

            {/* Gender */}
            <div className="input-group">
              <label>
                Gender <span style={{ color: "red" }}>*</span>
              </label>
              <div className="radio-options">
                {['Male', 'Female', 'Other'].map((gender) => (
                  <label key={gender} className="radio-option">
                    <input
                      type="radio"
                      name="gender"
                      value={gender}
                      checked={formData.gender === gender}
                      onChange={handleInputChange}
                    />
                    <span>{gender}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.gender && <div className="error-message">{fieldErrors.gender}</div>}
            </div>

            {/* Marital Status */}
            <div className="input-group">
              <label>
                Marital Status <span style={{ color: "red" }}>*</span>
              </label>
              <div className="radio-options">
                {['Single', 'Married', 'Other'].map((status) => (
                  <label key={status} className="radio-option">
                    <input
                      type="radio"
                      name="maritalStatus"
                      value={status}
                      checked={formData.maritalStatus === status}
                      onChange={handleInputChange}
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.maritalStatus && <div className="error-message">{fieldErrors.maritalStatus}</div>}
            </div>

            {/* Pregnancy Status - Show only when Female and Married */}
            {formData.gender === 'Female' && formData.maritalStatus === 'Married' && (
              <div className="input-group">
                <label>
                  Pregnancy Status <span style={{ color: "red" }}>*</span>
                </label>
                <div className="radio-options">
                  {['No', 'Yes', 'N/A'].map((status) => (
                    <label key={status} className="radio-option">
                      <input
                        type="radio"
                        name="pregnancyStatus"
                        value={status}
                        checked={formData.pregnancyStatus === status}
                        onChange={handleInputChange}
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                </div>
                {fieldErrors.pregnancyStatus && <div className="error-message">{fieldErrors.pregnancyStatus}</div>}
              </div>
            )}

            {/* Vitals — right after Marital Status */}
            <h3>Vitals</h3>
            <div className="form-row">
              <div className="input-group">
                <label>Blood Pressure</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="text" name="vitalBP" placeholder="120/80"
                    value={formData.vitalBP} onChange={handleInputChange} />
                  <span style={{ color: '#6b7280', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>mmHg</span>
                </div>
              </div>
              <div className="input-group">
                <label>Temperature</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="text" name="vitalTemp" placeholder="37.0"
                    value={formData.vitalTemp} onChange={handleInputChange} />
                  <span style={{ color: '#6b7280', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>°C</span>
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label>Weight</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="text" name="vitalWeight" placeholder="65"
                    value={formData.vitalWeight} onChange={handleInputChange} />
                  <span style={{ color: '#6b7280', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>kg</span>
                </div>
              </div>
              <div className="input-group">
                <label>Height</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="text" name="vitalHeight" placeholder="165"
                    value={formData.vitalHeight} onChange={handleInputChange} />
                  <span style={{ color: '#6b7280', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>cm</span>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <h3>Additional Information</h3>
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="occupation">Occupation</label>
                <input type="text" id="occupation" name="occupation"
                  value={formData.occupation} onChange={handleInputChange}
                  placeholder="e.g. Teacher, Engineer" />
              </div>
              <div className="input-group">
                <label htmlFor="income">Income</label>
                <input type="text" id="income" name="income"
                  value={formData.income} onChange={handleInputChange}
                  placeholder="e.g. 30,000 / month" />
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="religion">Religion</label>
                <input type="text" id="religion" name="religion"
                  value={formData.religion} onChange={handleInputChange}
                  placeholder="e.g. Hindu, Christian" />
              </div>
              <div className="input-group">
                <label htmlFor="address">Address</label>
                <input type="text" id="address" name="address"
                  value={formData.address} onChange={handleInputChange}
                  placeholder="Full address" />
              </div>
            </div>

            {/* Preferred Language */}
            <div className="input-group">
              <label htmlFor="preferred-language">
                Preferred Language <span style={{ color: "red" }}>*</span>
              </label>
              <select id="preferred-language" name="preferredLanguage"
                value={formData.preferredLanguage} onChange={handleInputChange}>
                <option value="">Select</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Tamil">Tamil</option>
                <option value="Other">Other</option>
              </select>
              {fieldErrors.preferredLanguage && <div className="error-message">{fieldErrors.preferredLanguage}</div>}
            </div>

            {formData.preferredLanguage === 'Other' && (
              <div className="input-group">
                <label htmlFor="other-language">Specify Language <span style={{ color: "red" }}>*</span></label>
                <input type="text" id="other-language" name="otherLanguage"
                  value={formData.otherLanguage} onChange={handleInputChange}
                  placeholder="Enter preferred language" />
                {fieldErrors.otherLanguage && <div className="error-message">{fieldErrors.otherLanguage}</div>}
              </div>
            )}

            {isPublicHealthDentistry && (
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <h3>Public Health Dentistry: Diagnosis & Treatment Plan</h3>
                <p style={{ marginTop: 0, opacity: 0.85 }}>
                  For this department, only personal information plus diagnosis and treatment plan are stored.
                </p>

                <div className="input-group">
                  <label htmlFor="diagnosis">
                    Diagnosis <span style={{ color: 'red' }}>*</span>
                  </label>
                  <textarea
                    id="diagnosis"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Enter diagnosis"
                  />
                  {fieldErrors.diagnosis && <div className="error-message">{fieldErrors.diagnosis}</div>}
                </div>

                <div className="input-group">
                  <label htmlFor="treatment-plan">
                    Treatment Plan <span style={{ color: 'red' }}>*</span>
                  </label>
                  <textarea
                    id="treatment-plan"
                    name="treatmentPlan"
                    value={formData.treatmentPlan}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Enter treatment plan"
                  />
                  {fieldErrors.treatmentPlan && <div className="error-message">{fieldErrors.treatmentPlan}</div>}
                </div>
              </div>
            )}

            {/* Patient Case Entry Section */}
            <h3>Patient Case Entry - Chief Complaint & History</h3>

            {/* Chief Complaint */}
            <div className="input-group">
              <label htmlFor="chief-complaint">
                Chief Complaint <span style={{ color: "red" }}>*</span>
              </label>
              <textarea id="chief-complaint" name="chiefComplaint" rows={2}
                value={formData.chiefComplaint} onChange={handleInputChange}
                placeholder="Describe the chief complaint..." />
              {fieldErrors.chiefComplaint && <div className="error-message">{fieldErrors.chiefComplaint}</div>}
            </div>

            <div className="input-group">
              <label htmlFor="history-of-present-illness">History of Presenting Illness</label>
              <textarea id="history-of-present-illness" name="historyOfPresentIllness" rows={3}
                value={formData.historyOfPresentIllness} onChange={handleInputChange}
                placeholder="Describe the history of the presenting illness..." />
            </div>

            <div className="input-group">
              <label htmlFor="past-medical-history">Past Medical History</label>
              <textarea id="past-medical-history" name="pastMedicalHistory" rows={3}
                value={formData.pastMedicalHistory} onChange={handleInputChange}
                placeholder="e.g. Diabetes, Hypertension, previous illnesses..." />
            </div>

            <div className="input-group">
              <label htmlFor="past-surgical-history">Past Surgical History</label>
              <textarea id="past-surgical-history" name="pastSurgicalHistory" rows={2}
                value={formData.pastSurgicalHistory} onChange={handleInputChange}
                placeholder="e.g. Previous surgeries, procedures..." />
            </div>

            <div className="input-group">
              <label htmlFor="past-dental-history">Past Dental History</label>
              <textarea id="past-dental-history" name="pastDentalHistory" rows={2}
                value={formData.pastDentalHistory} onChange={handleInputChange}
                placeholder="e.g. Previous dental treatments, extractions..." />
            </div>

            {/* HPI, Past Medical History, Personal Habits, Medical History
                — hidden for Oral Medicine and Endodontics departments */}
            {!String(doctorDepartmentLabel).toLowerCase().replace(/[\s_]+/g, '').includes('oral') && 
             !String(doctorDepartmentLabel).toLowerCase().replace(/[\s_]+/g, '').includes('endo') && (<>

            {/* HPI Checkboxes */}
            <div className="input-group">
              <label>
                History of Present Illness (HPI) - Select all that apply
              </label>
              <div className="checkbox-options">
                {hpiOptions.map((option) => (
                  <label key={option} className="checkbox-option">
                    <input
                      type="checkbox"
                      name="hpi"
                      value={option}
                      checked={hpiSelections.includes(option)}
                      onChange={handleInputChange}
                      disabled={hpiSelections.includes('None') && option !== 'None'}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Past Medical History Checkboxes */}
            <div className="input-group">
              <label>
                Past Medical History - Select all that apply
              </label>
              <div className="checkbox-options">
                {pastMedicalHistoryOptions.map((option) => (
                  <label key={option} className="checkbox-option">
                    <input
                      type="checkbox"
                      name="past-medical-history"
                      value={option}
                      checked={pastMedicalHistory.includes(option)}
                      onChange={handleInputChange}
                      disabled={pastMedicalHistory.includes('None') && option !== 'None'}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Personal Habits Checkboxes */}
            <div className="input-group">
              <label>
                Personal Habits - Select all that apply
              </label>
              <div className="checkbox-options">
                {personalHabitsOptions.map((option) => (
                  <label key={option} className="checkbox-option">
                    <input
                      type="checkbox"
                      name="personal-habits"
                      value={option}
                      checked={personalHabits.includes(option)}
                      onChange={handleInputChange}
                      disabled={personalHabits.includes('None') && option !== 'None'}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Text areas for additional information */}
            <div className="input-group">
              <h3>Medical history</h3>
              <label htmlFor="current-medications">
                Current Medications
              </label>
              <textarea
                id="current-medications"
                name="currentMedications"
                value={formData.currentMedications}
                onChange={handleInputChange}
                rows="2"
              />
            </div>

            <div className="input-group">
              <label htmlFor="known-allergies">
                Known Allergies (e.g., latex, medications, anesthetics)
              </label>
              <textarea
                id="known-allergies"
                name="knownAllergies"
                value={formData.knownAllergies}
                onChange={handleInputChange}
                rows="2"
              />
            </div>

            <div className="input-group">
              <label htmlFor="chronic-conditions">
                Chronic Conditions (e.g., diabetes, heart disease)
              </label>
              <textarea
                id="chronic-conditions"
                name="chronicConditions"
                value={formData.chronicConditions}
                onChange={handleInputChange}
                rows="2"
              />
            </div>

            <div className="input-group">
              <label htmlFor="past-surgeries">
                Past Surgeries
              </label>
              <textarea
                id="past-surgeries"
                name="pastSurgeries"
                value={formData.pastSurgeries}
                onChange={handleInputChange}
                rows="2"
              />
            </div>

            <div className="input-group">
              <label htmlFor="primary-dental-concerns">
                Primary Dental Concerns (e.g., pain, sensitivity, bleeding gums)
              </label>
              <textarea
                id="primary-dental-concerns"
                name="primaryDentalConcerns"
                value={formData.primaryDentalConcerns}
                onChange={handleInputChange}
                rows="2"
              />
            </div>

            <div className="input-group">
              <label htmlFor="last-dental-visit">
                Date of Last Dental Visit
              </label>
              <input
                type="date"
                id="last-dental-visit"
                name="lastDentalVisit"
                value={formData.lastDentalVisit}
                onChange={handleInputChange}
              />
            </div>

            </>)}

            {/* Vitals Section */}
            <h3>Other Information</h3>
            
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="blood-group">Blood Group <span style={{ color: "red" }}>*</span></label>
                <select
                  id="blood-group"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
                {fieldErrors.bloodGroup && <div className="error-message">{fieldErrors.bloodGroup}</div>}
              </div>
              <div className="input-group">
                <label htmlFor="drug-allergies">Drug Allergies <span style={{ color: "red" }}>*</span></label>
                <input
                  type="text"
                  id="drug-allergies"
                  name="drugAllergies"
                  value={formData.drugAllergies}
                  onChange={handleInputChange}
                  placeholder="Specify drug allergies"
                />
              </div>
              <div className="input-group">
                <label htmlFor="diet-allergies">Diet Allergies <span style={{ color: "red" }}>*</span></label>
                <input
                  type="text"
                  id="diet-allergies"
                  name="dietAllergies"
                  value={formData.dietAllergies}
                  onChange={handleInputChange}
                  placeholder="Specify diet allergies"
                />
              </div>
              <div className="input-group">
                <label htmlFor="critical-condition">Critical Condition</label>
                <input
                  type="text"
                  id="critical-condition"
                  name="criticalCondition"
                  value={formData.criticalCondition}
                  onChange={handleInputChange}
                  placeholder="e.g. Cardiac arrest risk, Severe allergy, Haemophilia..."
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="form-actions">
              <button
                className="save-btn"
                onClick={handleSavePatient}
                disabled={isLoading}
              >
                {isLoading ? '...Saved...' : 'Save Patient Details'}
              </button>
              <button
                className="case-files-btn"
                onClick={goToDepartmentCaseSheet}
                type="button"
                disabled={!canNavigateCases}
              >
                Go to Case Files
              </button>
              <button
                className="case-history-btn"
                onClick={() => navigate('/case-history')}
                type="button"
                disabled={!canNavigateCases}
              >
                Case History
              </button>
            </div>
              </div>
            )}
          </div>
          )}
        </main>
      </div>


      {/* Assign PG Modal */}
      <AssignPG
        isOpen={showAssignPGModal}
        onClose={() => {
          setShowAssignPGModal(false);
          setAssignPGMode('create');
          setSelectedPGForEdit(null);
        }}
        allowedDepartment={doctorDepartmentLabel}
        mode={assignPGMode}
        initialPG={selectedPGForEdit}
        onPGCreated={(newPG) => {
          console.log('PG Created:', newPG);
          triggerSuccessToast('PG account created successfully');
          fetchAssignedPGsOverview({ silent: true });
        }}
        onPGSaved={async () => {
          setIsCompactMessageBox(true);
          setMessageTitle('');
          setMessageContent('Updated successfully');
          setShowMessageBox(true);
          await fetchAssignedPGsOverview({ silent: true });
        }}
      />

      {/* Assign UG Modal */}
      <AssignUG
        isOpen={showAssignUGModal}
        onClose={() => {
          setShowAssignUGModal(false);
          setAssignUGMode('create');
          setSelectedUGForEdit(null);
        }}
        allowedDepartment={doctorDepartmentLabel}
        mode={assignUGMode}
        initialUG={selectedUGForEdit}
        onUGCreated={(newUG) => {
          console.log('UG Created:', newUG);
          triggerSuccessToast('UG account created successfully');
          fetchAssignedUGs({ silent: true });
        }}
        onUGSaved={async () => {
          setIsCompactMessageBox(true);
          setMessageTitle('');
          setMessageContent('Updated successfully');
          setShowMessageBox(true);
          await fetchAssignedUGs({ silent: true });
        }}
      />

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="success-toast">
          <div className="toast-content">
            <span className="toast-icon">✅</span>
            <span className="toast-message">{successToastMessage}</span>
          </div>
        </div>
      )}

      {/* Message Box */}
      {showMessageBox && (
        <div
          className="chief-overlay"
          onClick={() => {
            if (!isCompactMessageBox) closeMessageBox();
          }}
        >
          <div
            className={`chief-message-box${isCompactMessageBox ? ' compact' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {isCompactMessageBox ? (
              <>
                <button
                  type="button"
                  className="chief-message-close-x"
                  onClick={closeMessageBox}
                  aria-label="Close"
                  title="Close"
                >
                  ✕
                </button>
                <p>{messageContent}</p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="chief-message-close-x"
                  onClick={closeMessageBox}
                  aria-label="Close"
                  title="Close"
                >
                  ✕
                </button>
                <h3>{messageTitle}</h3>
                <p>{messageContent}</p>
                <button
                  type="button"
                  className="chief-close-btn"
                  onClick={closeMessageBox}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Redo Box */}
      {showRedoBox && (
        <div className="chief-overlay" onClick={() => setShowRedoBox(false)}>
          <div className="chief-redo-box" onClick={(e) => e.stopPropagation()}>
            <h3>Request Resend</h3>
            <textarea
              placeholder="Enter reason for resend..."
              value={redoReason}
              onChange={(e) => setRedoReason(e.target.value)}
              rows="4"
            />
            <div className="chief-redo-actions">
              <button
                type="button"
                className="chief-submit-btn"
                onClick={submitRedoReason}
                disabled={actionLoadingCaseId === selectedCase?._id}
              >
                {actionLoadingCaseId === selectedCase?._id ? 'Submitting...' : 'Submit'}
              </button>
              <button
                type="button"
                className="chief-cancel-btn"
                onClick={() => {
                  setShowRedoBox(false);
                  setRedoReason('');
                  setSelectedCase(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Sheet Preview Modal */}
      {showCaseSheetPreview && (
        <div className="chief-overlay" onClick={closeCaseSheetPreview}>
          <div
            className="chief-case-preview-box"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="chief-message-close-x"
              onClick={closeCaseSheetPreview}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>

            <h3>General Case Sheet (View)</h3>

            <div className="chief-case-preview-meta">
              <div><strong>Patient:</strong> {caseSheetPreviewItem?.patientName || '—'}</div>
              <div><strong>Patient ID:</strong> {caseSheetPreviewItem?.patientId || '—'}</div>
              <div><strong>Doctor:</strong> {caseSheetPreviewItem?.doctorName || '—'}</div>
              <div><strong>Department:</strong> {caseSheetPreviewItem?.department || '—'}</div>
            </div>

            {caseSheetPreviewLoading ? (
              <div className="chief-case-preview-loading">Loading preview...</div>
            ) : caseSheetPreviewError ? (
              <div className="chief-case-preview-error">{caseSheetPreviewError}</div>
            ) : (
              <div className="chief-case-preview-grid">
                <div className="chief-case-preview-details">
                  <div className="chief-case-preview-row">
                    <span className="label">Chief Complaint</span>
                    <span className="value">{caseSheetPreviewGeneralCase?.chiefComplaint || '—'}</span>
                  </div>
                  <div className="chief-case-preview-row">
                    <span className="label">Present Illness</span>
                    <span className="value">{caseSheetPreviewGeneralCase?.presentIllness || '—'}</span>
                  </div>
                  <div className="chief-case-preview-row">
                    <span className="label">Clinical Findings</span>
                    <span className="value">{caseSheetPreviewGeneralCase?.clinicalFindings || '—'}</span>
                  </div>
                  <div className="chief-case-preview-row">
                    <span className="label">Final Diagnosis</span>
                    <span className="value">{caseSheetPreviewGeneralCase?.finalDiagnosis || caseSheetPreviewGeneralCase?.provisionalDiagnosis || '—'}</span>
                  </div>
                </div>

                <div className="chief-case-preview-xray">
                  <div className="chief-case-preview-xray-title">X-ray</div>
                  {String(caseSheetPreviewGeneralCase?.xrayImage || '').trim() ? (
                    <img
                      className="chief-case-preview-xray-img"
                      src={normalizeXraySrc(caseSheetPreviewGeneralCase?.xrayImage)}
                      alt="X-ray Preview"
                    />
                  ) : (
                    <div className="chief-case-preview-xray-empty">No X-ray uploaded</div>
                  )}
                </div>
              </div>
            )}

            {isSpecialistDoctor && caseSheetPreviewItem && getApprovalStatus(caseSheetPreviewItem) === 'Pending' && !hasOpenedDepartmentCaseSheet ? (
              <div className="chief-case-preview-error" style={{ marginTop: 10 }}>
                Open the Department Case Sheet to enable Approve/Redo.
              </div>
            ) : null}

            <div className="chief-case-preview-actions">
              <button
                type="button"
                className="chief-close-btn"
                onClick={() => {
                  setHasOpenedDepartmentCaseSheet(true);
                  if (caseSheetPreviewItem) openFullCaseSheet(caseSheetPreviewItem);
                }}
                disabled={!caseSheetPreviewItem?._id}
              >
                Department Case Sheet
              </button>

              {isSpecialistDoctor && caseSheetPreviewItem && getApprovalStatus(caseSheetPreviewItem) === 'Pending' ? (
                <>
                  <button
                    type="button"
                    className="chief-close-btn"
                    onClick={() => {
                      handleApprove(caseSheetPreviewItem);
                      closeCaseSheetPreview();
                    }}
                    disabled={!hasOpenedDepartmentCaseSheet || actionLoadingCaseId === caseSheetPreviewItem._id}
                    title={!hasOpenedDepartmentCaseSheet ? 'Open Department Case Sheet first' : 'Approve'}
                  >
                    {actionLoadingCaseId === caseSheetPreviewItem._id && actionLoadingType === 'approve'
                      ? 'Approving...'
                      : 'Approve'}
                  </button>
                  <button
                    type="button"
                    className="chief-cancel-btn"
                    onClick={() => {
                      handleRedo(caseSheetPreviewItem);
                      closeCaseSheetPreview();
                    }}
                    disabled={!hasOpenedDepartmentCaseSheet || actionLoadingCaseId === caseSheetPreviewItem._id}
                    title={!hasOpenedDepartmentCaseSheet ? 'Open Department Case Sheet first' : 'Redo'}
                  >
                    Redo
                  </button>
                </>
              ) : null}

              <button
                type="button"
                className="chief-cancel-btn"
                onClick={closeCaseSheetPreview}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
