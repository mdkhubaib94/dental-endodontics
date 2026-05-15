// UGDashboard.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import './ChiefDoctorDashboard.css';
import './PGDashboard.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { API_BASE_URL, DEV_API_ORIGIN } from '../config/api';
import {
  clearStoredGeneralCaseXray,
  storeGeneralCaseXray,
} from '../utils/generalCaseXray';
import { getPatientResumeTarget } from '../utils/caseDraft';

const UGDashboard = () => {
  // State for form data
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const departmentKeyToRoute = {
    pedodontics: '/pedodontics',
    complete_denture: '/complete_denture',
    fpd: '/Fpd',
    implant: '/Implant',
    implant_patient: '/ImplantPatient',
    partial_denture: '/partial_denture',
    oral: '/oral-medicine',
  };

  const formatDateInput = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDepartmentLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw
      .split(/\s+/)
      .map((word) => {
        if (!word) return word;
        if (word.toUpperCase() === word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  const ugDepartmentLabel = String(user?.department || localStorage.getItem('ugDepartment') || '').trim();

  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const [activeView, setActiveView] = useState('patient');
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const sessionExpiryHandledRef = useRef(false);
  const hasAutoRestoredPatientRef = useRef(false);

  const [ugId, setUgId] = useState('');
  const [ugName, setUgName] = useState('');
  const [ugEmail, setUgEmail] = useState('');

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
    currentMedications: 'None',
    knownAllergies: 'None',
    chronicConditions: 'None',
    pastSurgeries: 'None',
    pregnancyStatus: '',
    primaryDentalConcerns: 'None',
    lastDentalVisit: '',
    bloodGroup: '',
    drugAllergies: '',
    dietAllergies: ''
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
  const [assignedCases, setAssignedCases] = useState([]);
  const [assignedCasesLoading, setAssignedCasesLoading] = useState(false);
  const [assignedCasesError, setAssignedCasesError] = useState('');
  const [pgCaseSheetHistory, setPgCaseSheetHistory] = useState([]);
  const [pgCaseSheetHistoryLoading, setPgCaseSheetHistoryLoading] = useState(false);
  const [pgCaseSheetHistoryError, setPgCaseSheetHistoryError] = useState('');
  const [pgAppointments, setPgAppointments] = useState([]);
  const [pgAppointmentsLoading, setPgAppointmentsLoading] = useState(false);
  const [pgAppointmentsError, setPgAppointmentsError] = useState('');
  const [rescheduleDrafts, setRescheduleDrafts] = useState({});
  const [activeRescheduleBookingId, setActiveRescheduleBookingId] = useState('');
  const [rescheduleSubmittingBookingId, setRescheduleSubmittingBookingId] = useState('');
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState({});
  const [bookedSlotsLoadingDate, setBookedSlotsLoadingDate] = useState('');
  const [generalCasePreview, setGeneralCasePreview] = useState(null);
  const [generalCasePreviewLoading, setGeneralCasePreviewLoading] = useState(false);
  const [generalCasePreviewError, setGeneralCasePreviewError] = useState('');
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');

  const [analyticsFromDate, setAnalyticsFromDate] = useState(formatDateInput(new Date()));
  const [analyticsToDate, setAnalyticsToDate] = useState(formatDateInput(new Date()));
  const [analyticsReport, setAnalyticsReport] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  // Calendar state for reschedule modal
  const [rescheduleCalendarMonth, setRescheduleCalendarMonth] = useState(new Date().getMonth());
  const [rescheduleCalendarYear, setRescheduleCalendarYear] = useState(new Date().getFullYear());
  const [rescheduleSelectedDate, setRescheduleSelectedDate] = useState('');
  const [rescheduleAvailableSlots, setRescheduleAvailableSlots] = useState([]);

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

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

  const loadPgAnalytics = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAnalyticsError('Authentication token missing. Please log in again.');
      setAnalyticsReport(null);
      return;
    }

    const from = new Date(analyticsFromDate);
    const to = new Date(analyticsToDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setAnalyticsError('Please select a valid date range.');
      setAnalyticsReport(null);
      return;
    }
    if (from > to) {
      setAnalyticsError("'From' date cannot be later than 'To' date.");
      setAnalyticsReport(null);
      return;
    }

    try {
      setAnalyticsLoading(true);
      setAnalyticsError('');

      const url = buildApiUrl(
        `/api/reports/pg/analytics?from=${encodeURIComponent(analyticsFromDate)}&to=${encodeURIComponent(analyticsToDate)}`
      );

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        await ensureActiveSession(res, 'Token expired');
        return;
      }

      if (!res.ok) {
        const msg = await extractApiErrorMessage(res, `Failed to load analytics (${res.status})`);
        throw new Error(msg);
      }

      const json = await res.json();
      if (json?.success === false) {
        throw new Error(json?.message || 'Failed to load analytics');
      }

      setAnalyticsReport(json);
    } catch (error) {
      console.error('PG analytics load error', error);
      setAnalyticsError(error.message || 'Unable to load analytics');
      setAnalyticsReport(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

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

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });

  const formatAppointmentComplaintDisplay = (value) => {
    const complaint = String(value || '').trim();
    if (!complaint) return '—';

    if (/follow[\s-]*up/i.test(complaint)) {
      return 'Follow up';
    }

    return complaint;
  };

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

  const handleSessionExpired = (apiMessage = '') => {
    if (sessionExpiryHandledRef.current) return;
    sessionExpiryHandledRef.current = true;

    const normalizedMessage = String(apiMessage || '').trim();
    const userMessage = normalizedMessage
      ? normalizedMessage
      : 'Your session has expired. Please log in again.';

    window.alert(userMessage);
    logout();
  };

  const ensureActiveSession = async (response, fallbackMessage = 'Token expired') => {
    if (response?.status !== 401) return '';
    const sessionMessage = await extractApiErrorMessage(response, fallbackMessage);
    handleSessionExpired(sessionMessage || fallbackMessage);
    return sessionMessage;
  };

  const assignedPatientIdSet = useMemo(() => {
    if (!Array.isArray(assignedCases)) return new Set();
    return new Set(
      assignedCases
        .map((caseItem) => String(caseItem?.patientId || '').trim())
        .filter(Boolean)
    );
  }, [assignedCases]);

  const ALLOWED_APPOINTMENT_TIMES = useMemo(
    () => [
      '9:00 AM',
      '9:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:30 AM',
      '12:00 PM',
      '12:30 PM',
      '2:00 PM',
    ],
    []
  );

  const myUpcomingAppointments = useMemo(() => {
    const list = Array.isArray(pgAppointments) ? [...pgAppointments] : [];
    list.sort((a, b) => {
      const dateA = String(a?.appointmentDate || '');
      const dateB = String(b?.appointmentDate || '');
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return String(a?.appointmentTime || '').localeCompare(String(b?.appointmentTime || ''));
    });
    return list;
  }, [pgAppointments]);

  const todayAppointmentDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todaysConfirmedAppointments = useMemo(() => {
    const normalizedToday = String(todayAppointmentDate || '').trim();
    const list = Array.isArray(myUpcomingAppointments) ? [...myUpcomingAppointments] : [];

    return list
      .filter((appointment) => {
        const appointmentDate = String(appointment?.appointmentDate || '').trim();
        const status = String(appointment?.status || '').trim().toLowerCase();
        return appointmentDate === normalizedToday && status === 'confirmed';
      })
      .sort((a, b) => String(a?.appointmentTime || '').localeCompare(String(b?.appointmentTime || '')));
  }, [myUpcomingAppointments, todayAppointmentDate]);

  const activeRescheduleAppointment = useMemo(() => {
    if (!activeRescheduleBookingId) return null;
    return myUpcomingAppointments.find(
      (appointment) => String(appointment?.bookingId || '').trim() === activeRescheduleBookingId
    ) || null;
  }, [activeRescheduleBookingId, myUpcomingAppointments]);

  const upcomingBookingDates = useMemo(() => {
    const dates = [];
    const today = new Date();

    for (let offset = 0; offset < 10; offset += 1) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() + offset);

      const day = candidate.getDay();
      if (day === 0 || day === 6) continue;

      const y = candidate.getFullYear();
      const m = String(candidate.getMonth() + 1).padStart(2, '0');
      const d = String(candidate.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }

    return dates;
  }, []);

  const fetchPgAppointments = async () => {
    try {
      setPgAppointmentsLoading(true);
      setPgAppointmentsError('');
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('/api/appointment/pg-appointments'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        await ensureActiveSession(res, 'Token expired');
        return;
      }

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to load appointments');
      }

      setPgAppointments(Array.isArray(json.appointments) ? json.appointments : []);
    } catch (error) {
      console.error('Failed to fetch PG appointments', error);
      setPgAppointmentsError(error.message || 'Failed to load appointments');
      setPgAppointments([]);
    } finally {
      setPgAppointmentsLoading(false);
    }
  };

  const fetchBookedSlotsForDate = async (appointmentDate) => {
    const resolvedDate = String(appointmentDate || '').trim();
    if (!resolvedDate) return;
    if (bookedSlotsByDate[resolvedDate]) return;

    try {
      setBookedSlotsLoadingDate(resolvedDate);
      const res = await fetch(buildApiUrl(`/api/appointment/booked-slots/${encodeURIComponent(resolvedDate)}`));
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || 'Failed to load slots');
      }

      setBookedSlotsByDate((prev) => ({
        ...prev,
        [resolvedDate]: {
          bookedSlots: json?.bookedSlots || {},
          maxSlotsPerTime: Number(json?.maxSlotsPerTime || 0),
        },
      }));
    } catch (error) {
      console.error('Failed to fetch booked slots', error);
      showMessage(error.message || 'Failed to load available slots', 'error');
    } finally {
      setBookedSlotsLoadingDate('');
    }
  };

  const approveAppointment = async (appointment) => {
    const bookingId = String(appointment?.bookingId || '').trim();
    if (!bookingId) {
      showMessage('Booking ID not found for this appointment.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`/api/appointment/${encodeURIComponent(bookingId)}/approve`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        await ensureActiveSession(res, 'Token expired');
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to approve appointment');
      }

      showMessage('Appointment approved successfully.', 'success');
      fetchPgAppointments();
    } catch (error) {
      showMessage(error.message || 'Failed to approve appointment.', 'error');
    }
  };

  // ✅ Calendar helper functions for reschedule modal
  const generateRescheduleCalendarDates = (month, year) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate 42 days (6 weeks) for calendar grid
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const isCurrentMonth = date.getMonth() === month;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();

      dates.push({
        date: new Date(date),
        day: date.getDate(),
        isCurrentMonth,
        isWeekend,
        isPast,
        isToday,
        isAvailable: isCurrentMonth && !isWeekend && !isPast,
        fullDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      });
    }

    return dates;
  };

  const navigateRescheduleCalendar = (direction) => {
    if (direction === 'prev') {
      if (rescheduleCalendarMonth === 0) {
        setRescheduleCalendarMonth(11);
        setRescheduleCalendarYear(rescheduleCalendarYear - 1);
      } else {
        setRescheduleCalendarMonth(rescheduleCalendarMonth - 1);
      }
    } else {
      if (rescheduleCalendarMonth === 11) {
        setRescheduleCalendarMonth(0);
        setRescheduleCalendarYear(rescheduleCalendarYear + 1);
      } else {
        setRescheduleCalendarMonth(rescheduleCalendarMonth + 1);
      }
    }
  };

  const handleRescheduleCalendarDateSelection = (dateValue) => {
    setRescheduleSelectedDate(dateValue);
    // Fetch booked slots for this date
    fetchBookedSlotsForDate(dateValue);
    // Generate available time slots
    setRescheduleAvailableSlots(ALLOWED_APPOINTMENT_TIMES);
  };

  const beginRescheduleForAppointment = (appointment) => {
    const bookingId = String(appointment?.bookingId || '').trim();
    if (!bookingId) {
      showMessage('Booking ID not found for this appointment.', 'error');
      return;
    }

    const appointmentDate = String(appointment?.appointmentDate || '').trim();

    // Reset calendar to current month
    setRescheduleCalendarMonth(new Date().getMonth());
    setRescheduleCalendarYear(new Date().getFullYear());
    setRescheduleSelectedDate('');
    setRescheduleAvailableSlots([]);

    setRescheduleDrafts((prev) => ({
      ...prev,
      [bookingId]: {
        open: true,
        bookingId,
        appointmentDate: '',
        appointmentTime: '',
        currentAppointmentDate: appointmentDate,
        currentAppointmentTime: String(appointment?.appointmentTime || ''),
      },
    }));
    setActiveRescheduleBookingId(bookingId);
  };

  const cancelRescheduleForBooking = (bookingId) => {
    const resolvedBookingId = String(bookingId || '').trim();
    if (!resolvedBookingId) return;
    setRescheduleDrafts((prev) => ({
      ...prev,
      [resolvedBookingId]: { ...prev[resolvedBookingId], open: false },
    }));
    if (activeRescheduleBookingId === resolvedBookingId) {
      setActiveRescheduleBookingId('');
    }
  };

  const updateRescheduleDraft = (bookingId, patch) => {
    const resolvedBookingId = String(bookingId || '').trim();
    if (!resolvedBookingId) return;
    setRescheduleDrafts((prev) => ({
      ...prev,
      [resolvedBookingId]: { ...(prev[resolvedBookingId] || {}), ...patch },
    }));
  };

  const getAvailableTimesForDraft = (draft) => {
    const appointmentDate = String(draft?.appointmentDate || '').trim();
    if (!appointmentDate) return ALLOWED_APPOINTMENT_TIMES;

    const slotInfo = bookedSlotsByDate[appointmentDate];
    if (!slotInfo) return ALLOWED_APPOINTMENT_TIMES;

    const bookedSlots = slotInfo?.bookedSlots || {};
    const maxSlotsPerTime = Number(slotInfo?.maxSlotsPerTime || 0);

    return ALLOWED_APPOINTMENT_TIMES.filter((timeSlot) => {
      const isCurrentSlot =
        String(draft?.currentAppointmentDate || '').trim() === appointmentDate &&
        String(draft?.currentAppointmentTime || '').trim() === timeSlot;

      if (isCurrentSlot) return true;
      if (!maxSlotsPerTime) return true;

      const bookedCount = Number(bookedSlots?.[timeSlot] || 0);
      return bookedCount < maxSlotsPerTime;
    });
  };

  const getDateOptionsForDraft = (draft, appointmentDate) => {
    return Array.from(new Set([
      String(draft?.appointmentDate || '').trim(),
      String(appointmentDate || '').trim(),
      ...upcomingBookingDates,
    ].filter(Boolean)));
  };

  const isTimeSlotAvailableForDraft = (draft, timeSlot) => {
    const appointmentDate = String(draft?.appointmentDate || '').trim();
    if (!appointmentDate) return false;

    const isCurrentSlot =
      String(draft?.currentAppointmentDate || '').trim() === appointmentDate &&
      String(draft?.currentAppointmentTime || '').trim() === timeSlot;

    if (isCurrentSlot) return true;

    const slotInfo = bookedSlotsByDate[appointmentDate];
    if (!slotInfo) return true;

    const maxSlotsPerTime = Number(slotInfo?.maxSlotsPerTime || 0);
    if (!maxSlotsPerTime) return true;

    const bookedCount = Number(slotInfo?.bookedSlots?.[timeSlot] || 0);
    return bookedCount < maxSlotsPerTime;
  };

  const submitRescheduleForBooking = async (bookingId) => {
    const resolvedBookingId = String(bookingId || '').trim();
    if (!resolvedBookingId) return;
    
    // Use calendar-based selection
    const appointmentDate = rescheduleSelectedDate;
    const appointmentTime = String(rescheduleDrafts[resolvedBookingId]?.appointmentTime || '').trim();

    if (!appointmentDate || !appointmentTime) {
      showMessage('Please select a new appointment date and time.', 'error');
      return;
    }

    try {
      setRescheduleSubmittingBookingId(resolvedBookingId);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`/api/appointment/${encodeURIComponent(resolvedBookingId)}/reschedule`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appointmentDate, appointmentTime }),
      });

      if (res.status === 401) {
        await ensureActiveSession(res, 'Token expired');
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to reschedule appointment');
      }

      // If UG — backend returns requiresApproval: true (pending doctor approval)
      if (json?.requiresApproval) {
        showMessage('Reschedule request submitted. Waiting for doctor approval.', 'success');
      } else {
        showMessage('Appointment rescheduled successfully.', 'success');
      }
      cancelRescheduleForBooking(resolvedBookingId);
      setRescheduleSelectedDate('');
      setRescheduleAvailableSlots([]);
      fetchPgAppointments();
      setBookedSlotsByDate((prev) => {
        const next = { ...prev };
        delete next[appointmentDate];
        return next;
      });
    } catch (error) {
      console.error('Reschedule appointment failed', error);
      showMessage(error.message || 'Failed to reschedule appointment', 'error');
    } finally {
      setRescheduleSubmittingBookingId('');
    }
  };

  const fetchGeneralCasePreview = async (patientId) => {
    const resolvedPatientId = String(patientId || '').trim();
    if (!resolvedPatientId) {
      setGeneralCasePreview(null);
      setGeneralCasePreviewError('Patient ID missing.');
      return;
    }

    setGeneralCasePreviewLoading(true);
    setGeneralCasePreviewError('');
    setGeneralCasePreview(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        buildApiUrl(`/api/general/patient/${encodeURIComponent(resolvedPatientId)}`),
        {
          headers: token
            ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/json' },
        }
      );

      if (res.status === 401) {
        await ensureActiveSession(res, 'Token expired');
        return;
      }

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to load General Case Sheet');
      }

      const cases = Array.isArray(json.data) ? json.data : [];
      const latest = [...cases].sort((a, b) => {
        const aTime = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const bTime = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
        return bTime - aTime;
      })[0] || null;

      setGeneralCasePreview(latest);
    } catch (error) {
      console.error('Failed to load general case preview:', error);
      setGeneralCasePreview(null);
      setGeneralCasePreviewError(error.message || 'Failed to load General Case Sheet');
    } finally {
      setGeneralCasePreviewLoading(false);
    }
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

  const normalizePgCaseStatus = (value) => String(value || '').trim().toLowerCase();

  const getAssignedCaseTimestamp = (caseItem) => {
    const raw = caseItem?.pgAssignedAt || caseItem?.createdAt || 0;
    const time = new Date(raw).getTime();
    return Number.isFinite(time) ? time : 0;
  };

  const getAssignedCaseDedupKey = (caseItem) => {
    const latestCaseId = String(caseItem?.latestCaseId || '').trim();
    if (latestCaseId) return `latest:${latestCaseId}`;

    const patientId = String(caseItem?.patientId || '').trim();
    const chiefComplaint = String(caseItem?.chiefComplaint || '').trim().toLowerCase();
    const referredDepartment = String(caseItem?.referredDepartment || '').trim().toLowerCase();
    const status = normalizePgCaseStatus(caseItem?.pgCaseStatus);
    const latestCaseDepartment = String(caseItem?.latestCaseDepartment || '').trim().toLowerCase();
    return `meta:${patientId}|${chiefComplaint}|${referredDepartment}|${latestCaseDepartment}|${status}`;
  };

  const dedupeAssignedCases = (cases) => {
    const byKey = new Map();

    (Array.isArray(cases) ? cases : []).forEach((caseItem) => {
      const key = getAssignedCaseDedupKey(caseItem);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, caseItem);
        return;
      }

      if (getAssignedCaseTimestamp(caseItem) >= getAssignedCaseTimestamp(existing)) {
        byKey.set(key, caseItem);
      }
    });

    return Array.from(byKey.values()).sort(
      (left, right) => getAssignedCaseTimestamp(right) - getAssignedCaseTimestamp(left)
    );
  };

  const getCaseRouteForDepartment = (departmentValue) => {
    const departmentKey = normalizeDepartment(departmentValue);

    if (departmentKey === 'pedodontics') return '/pedodontics';
    if (departmentKey === 'periodontics') return '/casePortal?dept=periodontics';
    if (departmentKey.includes('oral') || departmentKey.includes('maxillofacial')) return '/casePortal?dept=oral';
    if (departmentKey.includes('conservative') || departmentKey.includes('endodontic')) return '/casePortal';
    if (departmentKey === 'general' || departmentKey === 'generaldentistry') return '/general-case-sheet';
    return '/casePortal?dept=prosthodontics';
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
      setSuccessMessage('Updated successfully');
      setMessage('');
    }
    setTimeout(() => {
      setMessage('');
      setSuccessMessage('');
    }, 5000);
  };

  const historyAlertStatus = useMemo(() => {
    if (!Array.isArray(caseStatuses) || caseStatuses.length === 0) return 'none';
    const hasUnapproved = caseStatuses.some((c) => {
      const s = String(c?.approvalStatus || c?.status || '').trim().toLowerCase();
      return s !== 'approved' && s !== 'completed';
    });
    if (hasUnapproved) return 'pending';
    return 'done';
  }, [caseStatuses]);

  const historyAlertDotStyle = useMemo(() => {
    if (historyAlertStatus === 'pending') return { background: '#ef4444' };
    if (historyAlertStatus === 'done') return { background: '#22c55e' };
    return { background: '#94a3b8' };
  }, [historyAlertStatus]);

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
        { url: buildApiUrl(`/api/oral/patient/${encodeURIComponent(patientId)}`), department: 'Oral Medicine and Radiology' },
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

            if (res.status === 401) {
              await ensureActiveSession(res, 'Token expired');
              return [];
            }

            if (!res.ok) {
              return [];
            }

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
    const existingPatientId = localStorage.getItem('CurrentpatientId');
    if (existingPatientId) {
      fetchCaseStatuses(existingPatientId);
    }
  }, []);

  const fetchAssignedCases = async () => {
    try {
      setAssignedCasesLoading(true);
      setAssignedCasesError('');

      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('/api/general/assigned-pg-cases'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        await ensureActiveSession(res, 'Token expired');
        return [];
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to load assigned cases');
      }

      const normalizedCases = Array.isArray(json.data) ? json.data : [];
      const uniqueCases = dedupeAssignedCases(normalizedCases);
      setAssignedCases(uniqueCases);
      return uniqueCases;
    } catch (error) {
      console.error('Failed to fetch PG assigned cases', error);
      setAssignedCasesError(error.message || 'Failed to load assigned cases');
      setAssignedCases([]);
      return [];
    } finally {
      setAssignedCasesLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedCases();
    fetchPgAppointments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPgCaseSheetHistory = async () => {
    try {
      setPgCaseSheetHistoryLoading(true);
      setPgCaseSheetHistoryError('');

      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('/api/casesheets/pg/history'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        await ensureActiveSession(res, 'Token expired');
        return [];
      }

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to load case sheet history');
      }

      const rows = Array.isArray(json.data) ? json.data : [];
      setPgCaseSheetHistory(rows);
      return rows;
    } catch (error) {
      console.error('Failed to fetch PG case sheet history', error);
      setPgCaseSheetHistoryError(error.message || 'Failed to load case sheet history');
      setPgCaseSheetHistory([]);
      return [];
    } finally {
      setPgCaseSheetHistoryLoading(false);
    }
  };

  const startRedoEditFlow = async (row) => {
    const token = localStorage.getItem('token');
    const caseId = String(row?.caseId || '').trim();
    const departmentKey = String(row?.departmentKey || '').trim();
    const routePath = departmentKeyToRoute[departmentKey];

    if (!token) {
      setPgCaseSheetHistoryError('Authentication token missing. Please log in again.');
      return;
    }

    if (!caseId || !routePath) {
      setPgCaseSheetHistoryError('Unable to start redo edit: missing case details.');
      return;
    }

    try {
      setPgCaseSheetHistoryError('');

      const res = await fetch(buildApiUrl(`/api/casesheets/${encodeURIComponent(caseId)}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        await ensureActiveSession(res, 'Token expired');
        return;
      }

      const json = await safeReadJson(res);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || `Failed to load case sheet (${res.status})`);
      }

      const payload = json?.data;
      if (!payload) {
        throw new Error('Case sheet payload missing');
      }

      // Used by department forms to switch to redo-edit save.
      localStorage.setItem('redoEditCaseId', caseId);
      localStorage.setItem('redoEditDepartmentKey', departmentKey);

      const patientId = String(row?.patientId || payload?.patientId || '').trim();
      const patientName = String(row?.patientName || payload?.patientName || '').trim();
      if (patientId) localStorage.setItem('CurrentpatientId', patientId);
      if (patientName) localStorage.setItem('CurrentpatientName', patientName);

      navigate(routePath, {
        state: {
          redoEdit: true,
          editCaseId: caseId,
          departmentKey,
          prefillCaseData: payload,
        },
      });
    } catch (error) {
      console.error('Failed to start PG redo edit flow', error);
      setPgCaseSheetHistoryError(error.message || 'Failed to start redo edit');
    }
  };

  useEffect(() => {
    fetchPgCaseSheetHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const extractRedoReason = (approvalText) => {
    const rawText = String(approvalText || '').trim();
    if (!rawText) return '';
    const match = rawText.match(/(?:redo|resend)\s*:?\s*(.*)$/i);
    if (!match) return '';
    return String(match[1] || '').trim();
  };

  const normalizeChiefApprovalStatus = (approvalText) => {
    const normalized = String(approvalText || '').trim().toLowerCase();
    if (!normalized) return 'pending';
    if (normalized.includes('approved')) return 'approved';
    if (normalized.startsWith('redo') || normalized.startsWith('resend') || normalized.startsWith('rejected')) return 'redo';
    return 'redo';
  };

  const assignedCasesAlertStatus = useMemo(() => {
    const rows = Array.isArray(pgCaseSheetHistory) ? pgCaseSheetHistory : [];
    if (!rows.length) return 'none';

    const hasRedo = rows.some((row) => normalizeChiefApprovalStatus(row?.chiefApproval) === 'redo');
    if (hasRedo) return 'redo';

    const hasPending = rows.some((row) => normalizeChiefApprovalStatus(row?.chiefApproval) === 'pending');
    if (hasPending) return 'waiting';

    return 'approved';
  }, [pgCaseSheetHistory]);

  const cacheGeneralCaseXrayForPatient = async (patientId) => {
    const normalizedPatientId = String(patientId || '').trim();

    if (!normalizedPatientId) {
      clearStoredGeneralCaseXray();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        buildApiUrl(`/api/general/patient/${encodeURIComponent(normalizedPatientId)}`),
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.status === 401) {
        await ensureActiveSession(response, 'Token expired');
        clearStoredGeneralCaseXray();
        return;
      }

      if (!response.ok) {
        clearStoredGeneralCaseXray();
        return;
      }

      const json = await response.json();
      const generalCases = Array.isArray(json?.data) ? json.data : [];
      const latestCaseWithXray = generalCases.find((caseItem) =>
        String(caseItem?.xrayImage || '').trim()
      );

      if (!latestCaseWithXray) {
        clearStoredGeneralCaseXray();
        return;
      }

      storeGeneralCaseXray({
        patientId: normalizedPatientId,
        imageDataUrl: latestCaseWithXray.xrayImage,
        sourceCaseId: latestCaseWithXray._id || '',
      });
    } catch (error) {
      console.error('Failed to cache General Case X-ray:', error);
      clearStoredGeneralCaseXray();
    }
  };

  // Load UG identity for topbar
  useEffect(() => {
    const storedUgId = localStorage.getItem('ugId');
    const storedUgName = localStorage.getItem('ugName');
    const storedUgEmail = localStorage.getItem('ugEmail') || user?.email || '';

    if (storedUgId) setUgId(storedUgId);
    else if (user?.Identity) setUgId(user.Identity);

    if (storedUgName) setUgName(storedUgName);
    else if (user?.name) setUgName(user.name);

    if (storedUgEmail) setUgEmail(storedUgEmail);
  }, [user]);

  const openAssignedCaseRoute = async (patientIdOverride = '') => {
    const overrideId = typeof patientIdOverride === 'string' ? patientIdOverride : '';
    const currentPatientId = String(
      overrideId || localStorage.getItem('CurrentpatientId') || generatedUserId || formData.uniqueId || ''
    ).trim();

    if (!currentPatientId) {
      showMessage('Patient ID not found for opening the case sheet.', 'error');
      return;
    }

    localStorage.setItem('CurrentpatientId', currentPatientId);

    await cacheGeneralCaseXrayForPatient(currentPatientId);

    const caseRoute = getCaseRouteForDepartment(user?.department || '');

    const resumeTarget = await getPatientResumeTarget(currentPatientId);
    if (resumeTarget?.routeKey) {
      navigate(resumeTarget.routeKey);
      return;
    }

    navigate(caseRoute, { state: { requestConsentAfterEntry: true } });
  };

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
    const preferredLanguage = patientData.personalInfo?.preferredLanguage || '';
    const isOtherLanguage = !['English', 'Hindi', 'Tamil'].includes(preferredLanguage);
    
    const dob = patientData.personalInfo?.dateOfBirth ? new Date(patientData.personalInfo.dateOfBirth).toISOString().split('T')[0] : '';
    const age = dob ? calculateAge(dob) : (patientData.personalInfo?.age || '');
    
    setFormData({
      ...formData,
      firstName: patientData.personalInfo?.firstName || '',
      middleName: patientData.personalInfo?.middleName || '',
      lastName: patientData.personalInfo?.lastName || '',
      dob: dob,
      age: age,
      gender: patientData.personalInfo?.gender || '',
      maritalStatus: patientData.personalInfo?.maritalStatus || '',
      preferredLanguage: isOtherLanguage ? 'Other' : preferredLanguage,
      otherLanguage: isOtherLanguage ? preferredLanguage : '',
      occupation: patientData.personalInfo?.occupation || '',
      income: patientData.personalInfo?.income || '',
      religion: patientData.personalInfo?.religion || '',
      address: patientData.personalInfo?.address || '',
      chiefComplaint: patientData.medicalInfo?.chiefComplaint || '',
      currentMedications: patientData.medicalInfo?.currentMedications?.join(', ') || 'None',
      knownAllergies: patientData.medicalInfo?.knownAllergies?.join(', ') || 'None',
      chronicConditions: patientData.medicalInfo?.chronicConditions?.join(', ') || 'None',
      pastSurgeries: patientData.medicalInfo?.pastSurgeries?.join(', ') || 'None',
      pregnancyStatus: patientData.medicalInfo?.pregnancyStatus || '',
      primaryDentalConcerns: patientData.medicalInfo?.dentalConcerns?.join(', ') || 'None',
      lastDentalVisit: patientData.medicalInfo?.lastDentalVisit ? new Date(patientData.medicalInfo.lastDentalVisit).toISOString().split('T')[0] : '',
      bloodGroup: patientData.vitals?.bloodGroup || '',
      drugAllergies: patientData.vitals?.drugAllergies?.join(', ') || '',
      dietAllergies: patientData.vitals?.dietAllergies?.join(', ') || ''
    });

    setHpiSelections(patientData.medicalInfo?.hpi || []);
    setPastMedicalHistory(patientData.medicalInfo?.pastMedicalHistory || []);
    setPersonalHabits(patientData.medicalInfo?.personalHabits || []);
  };
  //validate
  const validateForm = () => {
    const errors = {};
    const requiredFields = {
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

    // Check pregnancy status if conditions are met
    const showPregnancyStatus = formData.gender === 'Female' && formData.maritalStatus === 'Married';
    if (showPregnancyStatus && (!formData.pregnancyStatus || formData.pregnancyStatus.trim() === '')) {
      errors.pregnancyStatus = 'This field must be filled';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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
            showMessage('Patient ID not found in Admin Patient Registration. Please ask admin to register this patient.', 'error');
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

      // Populate form with data from Admin Patient Registration
      populateFormWithPatientData(registeredPatient);
      setGeneratedUserId(registeredPatient.patientId || enteredId);
      showMessage(`Patient details loaded for ID: ${registeredPatient.patientId || enteredId}`, 'success');

      // Load latest General Case Sheet as a preview
      fetchGeneralCasePreview(registeredPatient.patientId || enteredId);

      // Optional: also merge any existing doctor-patient details for this ID
      try {
        const existingRes = await fetch(buildApiUrl(`/api/doctor-patient/${encodeURIComponent(enteredId)}`));
        if (existingRes.ok) {
          const existingResult = await existingRes.json();
          const existingPatientData = existingResult.data || existingResult;
          populateFormWithPatientData(existingPatientData);
        }
      } catch (mergeErr) {
        console.log('No existing doctor-patient record to merge for ID:', enteredId, mergeErr.message);
      }

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
    if (hasAutoRestoredPatientRef.current) return;
    hasAutoRestoredPatientRef.current = true;

    const existingPatientId = String(localStorage.getItem('CurrentpatientId') || '').trim();
    if (!existingPatientId) return;

    setActiveView('patient');
    setFormData((prev) => ({ ...prev, uniqueId: existingPatientId }));
    handleGetDetails(existingPatientId);
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

      const patientData = {
        patientId: generatedUserId,
        personalInfo: {
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          dateOfBirth: formData.dob,
          age: parseInt(formData.age) || 0,
          gender: formData.gender,
          maritalStatus: formData.maritalStatus,
          preferredLanguage: formData.preferredLanguage === 'Other' ? formData.otherLanguage : formData.preferredLanguage,
          occupation: formData.occupation || '',
          income: formData.income || '',
          religion: formData.religion || '',
          address: formData.address || '',
        },
        medicalInfo: {
          chiefComplaint: formData.chiefComplaint,
          hpi: hpiSelections,
          pastMedicalHistory: pastMedicalHistory,
          personalHabits: personalHabits,
          currentMedications: formData.currentMedications.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          knownAllergies: formData.knownAllergies.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          chronicConditions: formData.chronicConditions.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          pastSurgeries: formData.pastSurgeries.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          pregnancyStatus: shouldIncludePregnancyStatus ? formData.pregnancyStatus : 'N/A',
          dentalConcerns: formData.primaryDentalConcerns.split(',').map(item => item.trim()).filter(item => item && item !== 'None'),
          lastDentalVisit: formData.lastDentalVisit || null
        },
        vitals: {
          bloodGroup: formData.bloodGroup,
          drugAllergies: formData.drugAllergies.split(',').map(item => item.trim()).filter(item => item),
          dietAllergies: formData.dietAllergies.split(',').map(item => item.trim()).filter(item => item)
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

    if (response.status === 401) {
      await ensureActiveSession(response, 'Token expired');
      return;
    }

    if (response.ok) {
      const result = await response.json();
      const id = result.patientId;
      const name = result.patientName;
      localStorage.setItem('CurrentpatientName', name);
      localStorage.setItem('CurrentpatientId', id);
      showMessage('Patient details saved successfully!', 'success');
      console.log('Patient data from localStorage:', {
      });
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

  const getInitials = () => {
    const name = ugName || user?.name || 'UG';
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
              UG Dashboard
              {ugDepartmentLabel ? (
                <span className="chief-brand-title-dept">— {formatDepartmentLabel(ugDepartmentLabel)}</span>
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
                <span className="profile-name">{ugName || user?.name || 'UG'}</span>
                <span className="profile-email">{ugEmail || user?.email || ''}</span>
              </div>
              <div className="profile-arrow">{showLogoutDropdown ? '▲' : '▼'}</div>
            </div>

            {showLogoutDropdown && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">{getInitials()}</div>
                  <div className="dropdown-user-info">
                    <div className="dropdown-name">{ugName || user?.name || 'UG'}</div>
                    {ugId && <div className="dropdown-id">ID: {ugId}</div>}
                    <div className="dropdown-email">{ugEmail || user?.email || ''}</div>
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
          <aside className="chief-sidenav" aria-label="UG navigation">
            <div className="chief-sidenav-section">
              <div className="chief-sidenav-title">Menu</div>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'patient' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('patient');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">🧾</span>
                <span>Patient Management</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'assigned-cases' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('assigned-cases');
                  fetchPgCaseSheetHistory();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">📌</span>
                <span className="pg-nav-label">
                  Case Sheet
                  <span className="pg-nav-alert-dot" data-status={assignedCasesAlertStatus} />
                </span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'my-appointments' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('my-appointments');
                  fetchPgAppointments();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">📅</span>
                <span>My Appointments</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === 'analytics' ? 'active' : ''}`}
                onClick={() => {
                  setActiveView('analytics');
                  loadPgAnalytics();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">📊</span>
                <span>Analytics</span>
              </button>
            </div>
          </aside>
        )}

        <main className="chief-main" aria-label="UG content">
          <div className="doctor-dashboard-content">
              {/* Message boxes */}
              {message && <div className="error-message">{message}</div>}
              {successMessage && (
                <div className="success-message" style={{ position: 'relative', paddingRight: 40 }}>
                  <button
                    type="button"
                    onClick={() => setSuccessMessage('')}
                    aria-label="Close"
                    title="Close"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 10,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 16,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: 'inherit',
                    }}
                  >
                    ✕
                  </button>
                  {successMessage}
                </div>
              )}

            {activeView === 'patient' && (
              <div className="doctor-dashboard-content">
                <h2 className="dashboard-title">Patient Details</h2>

                {/* Unique ID input */}
                <div className="input-group">
                  <label htmlFor="unique-id">Enter Registered Patient ID</label>
                  <input
                    type="text"
                    id="unique-id"
                    name="uniqueId"
                    value={formData.uniqueId}
                    onChange={handleInputChange}
                    placeholder="Enter Patient ID from Admin Patient Registration"
                  />
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

                {/* General Case Sheet Preview */}
                {showUserIdDisplay && (
                  <div className="general-case-preview-section" style={{ margin: '16px 0', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>General Case Sheet Preview</div>
                    {generalCasePreviewLoading ? (
                      <div className="chief-inline-loading">Loading preview...</div>
                    ) : generalCasePreviewError ? (
                      <div className="error-message">{generalCasePreviewError}</div>
                    ) : generalCasePreview ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                        <div>
                          <div style={{ marginBottom: 4 }}><strong>Chief Complaint:</strong> {generalCasePreview.chiefComplaint || '—'}</div>
                          <div style={{ marginBottom: 4 }}><strong>Present Illness:</strong> {generalCasePreview.presentIllness || '—'}</div>
                          <div style={{ marginBottom: 4 }}><strong>Clinical Findings:</strong> {generalCasePreview.clinicalFindings || '—'}</div>
                          <div><strong>Final Diagnosis:</strong> {generalCasePreview.finalDiagnosis || generalCasePreview.provisionalDiagnosis || '—'}</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: 80 }}>
                          <div style={{ fontSize: 12, marginBottom: 4, color: '#64748b' }}>X-ray</div>
                          {String(generalCasePreview.xrayImage || '').trim() ? (
                            <img
                              src={String(generalCasePreview.xrayImage || '').trim()}
                              alt="X-ray"
                              style={{ maxWidth: 80, maxHeight: 80, borderRadius: 4, border: '1px solid #cbd5e1' }}
                            />
                          ) : (
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>No X-ray</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: 13 }}>No General Case Sheet found for this patient.</div>
                    )}
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="view-button"
                        onClick={() => {
                          const pid = String(generatedUserId || '').trim();
                          const pname = String(localStorage.getItem('CurrentpatientName') || '').trim();
                          if (pid) {
                            window.open(`/general-case-view?patientId=${encodeURIComponent(pid)}&patientName=${encodeURIComponent(pname)}`, '_blank');
                          }
                        }}
                        disabled={!generatedUserId}
                      >
                        View Full General Case Sheet
                      </button>
                    </div>
                  </div>
                )}

                {/* Form Section */}
                {showForm && (
                  <div className="patient-form">
                    <h3>Personal Information</h3>

                    {/* Name fields */}
                    <div className="form-row">
                      <div className="input-group">
                        <label htmlFor="first-name">First Name <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" id="first-name" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                        {fieldErrors.firstName && <div className="error-message">{fieldErrors.firstName}</div>}
                      </div>
                      <div className="input-group">
                        <label htmlFor="middle-name">Middle Name</label>
                        <input type="text" id="middle-name" name="middleName" value={formData.middleName} onChange={handleInputChange} />
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="last-name">Last Name <span style={{ color: 'red' }}>*</span></label>
                      <input type="text" id="last-name" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                      {fieldErrors.lastName && <div className="error-message">{fieldErrors.lastName}</div>}
                    </div>

                    {/* DOB and Age */}
                    <div className="form-row">
                      <div className="input-group">
                        <label htmlFor="dob">Date of Birth <span style={{ color: 'red' }}>*</span></label>
                        <input type="date" id="dob" name="dob" value={formData.dob} onChange={handleInputChange} required />
                        {fieldErrors.dob && <div className="error-message">{fieldErrors.dob}</div>}
                      </div>
                      <div className="input-group">
                        <label htmlFor="age">Age</label>
                        <input type="number" id="age" name="age" value={formData.age} readOnly />
                      </div>
                    </div>

                    {/* Gender */}
                    <div className="input-group">
                      <label>Gender <span style={{ color: 'red' }}>*</span></label>
                      <div className="radio-options">
                        {['Male', 'Female', 'Other'].map((gender) => (
                          <label key={gender} className="radio-option">
                            <input type="radio" name="gender" value={gender} checked={formData.gender === gender} onChange={handleInputChange} />
                            <span>{gender}</span>
                          </label>
                        ))}
                      </div>
                      {fieldErrors.gender && <div className="error-message">{fieldErrors.gender}</div>}
                    </div>

                    {/* Marital Status */}
                    <div className="input-group">
                      <label>Marital Status <span style={{ color: 'red' }}>*</span></label>
                      <div className="radio-options">
                        {['Single', 'Married', 'Other'].map((status) => (
                          <label key={status} className="radio-option">
                            <input type="radio" name="maritalStatus" value={status} checked={formData.maritalStatus === status} onChange={handleInputChange} />
                            <span>{status}</span>
                          </label>
                        ))}
                      </div>
                      {fieldErrors.maritalStatus && <div className="error-message">{fieldErrors.maritalStatus}</div>}
                    </div>

                    {/* Pregnancy Status */}
                    {formData.gender === 'Female' && formData.maritalStatus === 'Married' && (
                      <div className="input-group">
                        <label>Pregnancy Status <span style={{ color: 'red' }}>*</span></label>
                        <div className="radio-options">
                          {['No', 'Yes', 'N/A'].map((status) => (
                            <label key={status} className="radio-option">
                              <input type="radio" name="pregnancyStatus" value={status} checked={formData.pregnancyStatus === status} onChange={handleInputChange} />
                              <span>{status}</span>
                            </label>
                          ))}
                        </div>
                        {fieldErrors.pregnancyStatus && <div className="error-message">{fieldErrors.pregnancyStatus}</div>}
                      </div>
                    )}

                    {/* Preferred Language */}
                    <div className="input-group">
                      <label htmlFor="preferred-language">Preferred Language <span style={{ color: 'red' }}>*</span></label>
                      <select id="preferred-language" name="preferredLanguage" value={formData.preferredLanguage} onChange={handleInputChange}>
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
                        <label htmlFor="other-language">Specify Language <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" id="other-language" name="otherLanguage" value={formData.otherLanguage} onChange={handleInputChange} placeholder="Enter preferred language" />
                        {fieldErrors.otherLanguage && <div className="error-message">{fieldErrors.otherLanguage}</div>}
                      </div>
                    )}

                    <h3>Additional Information</h3>

                    <div className="form-row">
                      <div className="input-group">
                        <label htmlFor="occupation">Occupation</label>
                        <input type="text" id="occupation" name="occupation" value={formData.occupation} onChange={handleInputChange} placeholder="e.g. Teacher, Engineer" />
                      </div>
                      <div className="input-group">
                        <label htmlFor="income">Income</label>
                        <input type="text" id="income" name="income" value={formData.income} onChange={handleInputChange} placeholder="e.g. 30,000 / month" />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="input-group">
                        <label htmlFor="religion">Religion</label>
                        <input type="text" id="religion" name="religion" value={formData.religion} onChange={handleInputChange} placeholder="e.g. Hindu, Christian" />
                      </div>
                      <div className="input-group">
                        <label htmlFor="address">Address</label>
                        <input type="text" id="address" name="address" value={formData.address} onChange={handleInputChange} placeholder="Full address" />
                      </div>
                    </div>

                    <h3>Patient Case Entry - Chief Complaint &amp; History</h3>

                    {/* Chief Complaint */}
                    <div className="input-group">
                      <label htmlFor="chief-complaint">Chief Complaint <span style={{ color: 'red' }}>*</span></label>
                      <select id="chief-complaint" name="chiefComplaint" value={formData.chiefComplaint} onChange={handleInputChange}>
                        <option value="">Select a primary issue</option>
                        {chiefComplaints.map((complaint) => (
                          <option key={complaint} value={complaint}>{complaint}</option>
                        ))}
                      </select>
                      {fieldErrors.chiefComplaint && <div className="error-message">{fieldErrors.chiefComplaint}</div>}
                    </div>

                    {/* HPI, Past Medical History, Personal Habits, Medical History
                        — hidden for Oral Medicine department (captured in the oral case sheet) */}
                    {!String(ugDepartmentLabel).toLowerCase().replace(/[\s_]+/g, '').includes('oral') && (<>

                    {/* HPI */}
                    <div className="input-group">
                      <label>History of Present Illness (HPI) - Select all that apply</label>
                      <div className="checkbox-options">
                        {hpiOptions.map((option) => (
                          <label key={option} className="checkbox-option">
                            <input type="checkbox" name="hpi" value={option} checked={hpiSelections.includes(option)} onChange={handleInputChange} disabled={hpiSelections.includes('None') && option !== 'None'} />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Past Medical History */}
                    <div className="input-group">
                      <label>Past Medical History - Select all that apply</label>
                      <div className="checkbox-options">
                        {pastMedicalHistoryOptions.map((option) => (
                          <label key={option} className="checkbox-option">
                            <input type="checkbox" name="past-medical-history" value={option} checked={pastMedicalHistory.includes(option)} onChange={handleInputChange} disabled={pastMedicalHistory.includes('None') && option !== 'None'} />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Personal Habits */}
                    <div className="input-group">
                      <label>Personal Habits - Select all that apply</label>
                      <div className="checkbox-options">
                        {personalHabitsOptions.map((option) => (
                          <label key={option} className="checkbox-option">
                            <input type="checkbox" name="personal-habits" value={option} checked={personalHabits.includes(option)} onChange={handleInputChange} disabled={personalHabits.includes('None') && option !== 'None'} />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="input-group">
                      <h3>Medical history</h3>
                      <label htmlFor="current-medications">Current Medications</label>
                      <textarea id="current-medications" name="currentMedications" value={formData.currentMedications} onChange={handleInputChange} rows="2" />
                    </div>

                    <div className="input-group">
                      <label htmlFor="known-allergies">Known Allergies (e.g., latex, medications, anesthetics)</label>
                      <textarea id="known-allergies" name="knownAllergies" value={formData.knownAllergies} onChange={handleInputChange} rows="2" />
                    </div>

                    <div className="input-group">
                      <label htmlFor="chronic-conditions">Chronic Conditions (e.g., diabetes, heart disease)</label>
                      <textarea id="chronic-conditions" name="chronicConditions" value={formData.chronicConditions} onChange={handleInputChange} rows="2" />
                    </div>

                    <div className="input-group">
                      <label htmlFor="past-surgeries">Past Surgeries</label>
                      <textarea id="past-surgeries" name="pastSurgeries" value={formData.pastSurgeries} onChange={handleInputChange} rows="2" />
                    </div>

                    <div className="input-group">
                      <label htmlFor="primary-dental-concerns">Primary Dental Concerns (e.g., pain, sensitivity, bleeding gums)</label>
                      <textarea id="primary-dental-concerns" name="primaryDentalConcerns" value={formData.primaryDentalConcerns} onChange={handleInputChange} rows="2" />
                    </div>

                    <div className="input-group">
                      <label htmlFor="last-dental-visit">Date of Last Dental Visit</label>
                      <input type="date" id="last-dental-visit" name="lastDentalVisit" value={formData.lastDentalVisit} onChange={handleInputChange} />
                    </div>

                    </>)}

                    <h3>Other Information</h3>
                    <div className="form-grid">
                      <div className="input-group">
                        <label htmlFor="blood-group">Blood Group <span style={{ color: 'red' }}>*</span></label>
                        <select id="blood-group" name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                          <option value="">Select Blood Group</option>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                        {fieldErrors.bloodGroup && <div className="error-message">{fieldErrors.bloodGroup}</div>}
                      </div>
                      <div className="input-group">
                        <label htmlFor="drug-allergies">Drug Allergies</label>
                        <input type="text" id="drug-allergies" name="drugAllergies" value={formData.drugAllergies} onChange={handleInputChange} placeholder="Specify drug allergies" />
                      </div>
                      <div className="input-group">
                        <label htmlFor="diet-allergies">Diet Allergies</label>
                        <input type="text" id="diet-allergies" name="dietAllergies" value={formData.dietAllergies} onChange={handleInputChange} placeholder="Specify diet allergies" />
                      </div>
                    </div>

                    {/* Navigation buttons */}
                    <div className="form-actions">
                      <button className="save-btn" onClick={handleSavePatient} disabled={isLoading}>
                        {isLoading ? '...Saving...' : 'Save Patient Details'}
                      </button>
                      <button
                        className="case-files-btn"
                        onClick={openAssignedCaseRoute}
                        type="button"
                        disabled={!canNavigateCases}
                      >
                        Go to Department Case Sheet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'analytics' && (
              <section className="chief-section-card">
                <div className="chief-section-header-row">
                  <h2>My Analytics</h2>
                  <button
                    type="button"
                    className="view-button"
                    onClick={loadPgAnalytics}
                    disabled={analyticsLoading}
                  >
                    View
                  </button>
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

                {analyticsError && <div className="error-message">{analyticsError}</div>}

                {analyticsLoading ? (
                  <div className="chief-inline-loading">Loading analytics...</div>
                ) : !analyticsReport ? (
                  <div className="chief-empty-state">Select a date range and click View.</div>
                ) : (
                  <div className="chief-summary-grid" style={{ marginBottom: 16 }}>
                    <div className="chief-summary-card">
                      <h3>Total Patients</h3>
                      <p>{analyticsReport.uniquePatients || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Male</h3>
                      <p>{analyticsReport.malePatients || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Female</h3>
                      <p>{analyticsReport.femalePatients || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>New</h3>
                      <p>{analyticsReport.newPatients || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Old</h3>
                      <p>{analyticsReport.oldPatients || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Case Sheets</h3>
                      <p>{analyticsReport.totalCaseSheets || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Approved</h3>
                      <p>{analyticsReport.approvalCounts?.approved || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Redo</h3>
                      <p>{analyticsReport.approvalCounts?.rejected || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Pending</h3>
                      <p>{analyticsReport.approvalCounts?.pending || 0}</p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeView === 'assigned-cases' && (
              <div className="pg-assigned-cases">
                <div className="pg-assigned-cases-toolbar">
                  <button
                    type="button"
                    className="view-button"
                    onClick={() => {
                      fetchPgCaseSheetHistory();
                    }}
                    disabled={pgCaseSheetHistoryLoading}
                  >
                    {pgCaseSheetHistoryLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {pgCaseSheetHistoryError && <div className="error-message">{pgCaseSheetHistoryError}</div>}

                {!pgCaseSheetHistoryLoading && (!Array.isArray(pgCaseSheetHistory) || pgCaseSheetHistory.length === 0) && (
                  <div className="success-message">No case history found.</div>
                )}

                {Array.isArray(pgCaseSheetHistory) && pgCaseSheetHistory.length > 0 && (
                  <div className="pg-assigned-cases-table-wrapper">
                    <table className="pg-assigned-cases-table pg-history-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Date</th>
                          <th>Patient Name</th>
                          <th>Patient ID</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Redo Message</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pgCaseSheetHistory.map((row, index) => {
                          const patientName = String(row?.patientName || '').trim();
                          const patientId = String(row?.patientId || '').trim();
                          const department = String(row?.department || '').trim();
                          const departmentKey = String(row?.departmentKey || '').trim();
                          const approvalText = String(row?.chiefApproval || '').trim();
                          const status = normalizeChiefApprovalStatus(approvalText);
                          const redoReason = extractRedoReason(approvalText);
                          const caseId = String(row?.caseId || '').trim();
                          const createdAt = row?.createdAt ? new Date(row.createdAt) : null;

                          return (
                            <tr key={caseId || `${patientId}-${row?.createdAt || ''}-${index}`}
                              className="pg-assigned-row"
                            >
                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{index + 1}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{createdAt ? formatDate(createdAt) : '—'}</td>
                              <td>{patientName || '—'}</td>
                              <td>{patientId || '—'}</td>
                              <td>{department || '—'}</td>
                              <td>
                                <span className={status === 'approved' ? 'status-badge approved' : status === 'redo' ? 'status-badge redo' : 'status-badge pending'}>
                                  {status === 'approved' ? 'Approved' : status === 'redo' ? 'Redo' : 'Pending'}
                                </span>
                              </td>
                              <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                {status === 'redo' ? (redoReason || approvalText || 'Redo requested by doctor.') : '—'}
                              </td>
                              <td>
                                <div className="pg-assigned-action-buttons">
                                  <button
                                    type="button"
                                    className="view-button"
                                    onClick={() => {
                                      if (caseId) {
                                        window.open(`/case-sheet-view/${encodeURIComponent(caseId)}`, '_blank', 'noopener,noreferrer');
                                      }
                                    }}
                                    disabled={!caseId}
                                  >
                                    View
                                  </button>

                                  {status === 'redo' && (
                                    <button
                                      type="button"
                                      className="view-button"
                                      onClick={() => startRedoEditFlow({
                                        ...row,
                                        caseId,
                                        departmentKey,
                                        patientId,
                                        patientName,
                                      })}
                                      disabled={!caseId || !departmentKeyToRoute[departmentKey]}
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeView === 'my-appointments' && (
              <div className="pg-my-appointments">
                <div className="pg-assigned-cases-toolbar">
                  <button
                    type="button"
                    className="view-button"
                    onClick={() => fetchPgAppointments()}
                    disabled={pgAppointmentsLoading}
                  >
                    {pgAppointmentsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {pgAppointmentsError && <div className="error-message">{pgAppointmentsError}</div>}

                {!pgAppointmentsLoading && (!Array.isArray(myUpcomingAppointments) || myUpcomingAppointments.length === 0) && (
                  <div className="success-message">No upcoming appointments.</div>
                )}

                {Array.isArray(myUpcomingAppointments) && myUpcomingAppointments.length > 0 && (
                  <div className="pg-assigned-cases-table-wrapper">
                    <table className="pg-assigned-cases-table" style={{ fontSize: '0.8em', tableLayout: 'fixed', width: '100%' }}>
                      <thead>
                        <tr style={{ padding: '4px' }}>
                          <th style={{ padding: '6px 6px', textAlign: 'center' }}>S.No</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center' }}>Doctor</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center' }}>Patient Name</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center' }}>Patient ID</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center' }}>Date & Time</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center' }}>Complaint</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myUpcomingAppointments.map((appointment, index) => {
                          const bookingId = String(appointment?.bookingId || '').trim();
                          const isSubmitting = bookingId && rescheduleSubmittingBookingId === bookingId;
                          const appointmentStatus = String(appointment?.status || '').trim().toLowerCase();
                          const rescheduleReqStatus = String(appointment?.rescheduleRequest?.requestStatus || 'none').trim().toLowerCase();
                          const hasPendingReschedule = rescheduleReqStatus === 'pending';
                          const hasApprovedReschedule = rescheduleReqStatus === 'approved';
                          const canApproveAppointment = appointmentStatus === 'pending';
                          const canRescheduleAppointment = appointmentStatus === 'pending' && !hasPendingReschedule;

                          return (
                            <tr key={bookingId || `${appointment?.patientId}-${appointment?.appointmentDate}`} className="pg-assigned-row">
                              <td style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>{index + 1}</td>
                              <td
                                style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}
                                title={appointment?.doctorName || appointment?.doctorId || '—'}
                              >
                                {appointment?.doctorName || appointment?.doctorId || '—'}
                              </td>
                              <td
                                style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word' }}
                                title={appointment?.patientName || '—'}
                              >
                                {appointment?.patientName || '—'}
                              </td>
                              <td
                                style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}
                                title={appointment?.patientId || '—'}
                              >
                                {appointment?.patientId || '—'}
                              </td>
                              <td style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {appointment?.appointmentDate || '—'}
                                {appointment?.appointmentTime ? ` • ${appointment.appointmentTime}` : ''}
                              </td>
                              <td
                                style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word' }}
                              >
                                {formatAppointmentComplaintDisplay(appointment?.chiefComplaint) || '—'}
                              </td>
                              <td style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {appointmentStatus === 'rescheduled' && hasApprovedReschedule ? (
                                  <span style={{ background: '#38a169', color: '#fff', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                                    ✓ Approved
                                  </span>
                                ) : hasPendingReschedule ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ background: '#ed8936', color: '#fff', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                                      ⏳ Pending Approval
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#888' }}>
                                      {appointment?.rescheduleRequest?.requestedDate} {appointment?.rescheduleRequest?.requestedTime}
                                    </span>
                                  </div>
                                ) : appointmentStatus === 'rescheduled' ? (
                                  <span style={{ background: '#3182ce', color: '#fff', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                                    Rescheduled
                                  </span>
                                ) : appointmentStatus === 'confirmed' ? (
                                  <span style={{ background: '#38a169', color: '#fff', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                                    ✓ Approved
                                  </span>
                                ) : (
                                  <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className="view-button"
                                      onClick={() => approveAppointment(appointment)}
                                      disabled={isSubmitting || !canApproveAppointment}
                                      style={{
                                        backgroundColor: '#4CAF50',
                                        cursor: isSubmitting || !canApproveAppointment ? 'not-allowed' : 'pointer',
                                        padding: '4px 6px',
                                        fontSize: '0.75em',
                                        minWidth: '70px',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="view-button"
                                      onClick={() => beginRescheduleForAppointment(appointment)}
                                      disabled={isSubmitting || !canRescheduleAppointment}
                                      title={hasPendingReschedule ? 'A reschedule request is already pending approval' : ''}
                                      style={{
                                        padding: '4px 6px',
                                        fontSize: '0.75em',
                                        minWidth: '78px',
                                        whiteSpace: 'nowrap',
                                        opacity: hasPendingReschedule ? 0.5 : 1,
                                      }}
                                    >
                                      {isSubmitting ? 'Saving...' : 'Reschedule'}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {activeRescheduleBookingId && rescheduleDrafts[activeRescheduleBookingId]?.open && (
        <div className="chief-overlay" onClick={() => cancelRescheduleForBooking(activeRescheduleBookingId)}>
          <div className="pg-reschedule-modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Reschedule Appointment</h3>
            <p>
              {activeRescheduleAppointment?.patientName || 'Patient'} ({activeRescheduleAppointment?.patientId || '—'})
            </p>

            {!rescheduleSelectedDate ? (
              <>
                {/* Calendar View */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '20px',
                  padding: '0 10px'
                }}>
                  <button
                    type="button"
                    onClick={() => navigateRescheduleCalendar('prev')}
                    style={{
                      background: '#1e3a8a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ‹
                  </button>
                  
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {new Date(rescheduleCalendarYear, rescheduleCalendarMonth).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </h4>
                  
                  <button
                    type="button"
                    onClick={() => navigateRescheduleCalendar('next')}
                    style={{
                      background: '#1e3a8a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ›
                  </button>
                </div>

                {/* Day Headers */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)', 
                  gap: '2px',
                  marginBottom: '10px'
                }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} style={{
                      textAlign: 'center',
                      fontWeight: 'bold',
                      padding: '8px',
                      color: '#ccc',
                      fontSize: '0.9em'
                    }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)', 
                  gap: '2px'
                }}>
                  {generateRescheduleCalendarDates(rescheduleCalendarMonth, rescheduleCalendarYear).map((dateObj, index) => {
                    const isSelectable = dateObj.isAvailable;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => isSelectable && handleRescheduleCalendarDateSelection(dateObj.fullDate)}
                        disabled={!isSelectable}
                        style={{
                          padding: '12px 8px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          backgroundColor: dateObj.isToday 
                            ? 'rgba(60, 141, 255, 0.5)' 
                            : dateObj.isCurrentMonth 
                              ? (isSelectable ? 'rgba(60, 141, 255, 0.2)' : 'rgba(107, 114, 128, 0.2)')
                              : 'rgba(0, 0, 0, 0.1)',
                          color: dateObj.isCurrentMonth ? 'white' : 'rgba(255, 255, 255, 0.5)',
                          cursor: isSelectable ? 'pointer' : 'not-allowed',
                          borderRadius: '8px',
                          fontSize: '0.9em',
                          fontWeight: dateObj.isToday ? 'bold' : 'normal',
                          opacity: !isSelectable ? 0.5 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        {dateObj.day}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Time Slot Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '10px' }}>
                    <strong>Selected Date:</strong> <span style={{ color: 'rgba(60, 141, 255, 0.9)' }}>{new Date(rescheduleSelectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                  <div className="pg-slot-section-title">Available Slots</div>
                  {rescheduleAvailableSlots.length > 0 ? (
                    <div className="pg-reschedule-slot-grid">
                      {ALLOWED_APPOINTMENT_TIMES.map((timeSlot) => {
                        const slotInfo = bookedSlotsByDate[rescheduleSelectedDate];
                        const bookedCount = Number(slotInfo?.bookedSlots?.[timeSlot] || 0);
                        const maxSlots = Number(slotInfo?.maxSlotsPerTime || 1);
                        const isBooked = bookedCount >= maxSlots;
                        const isCurrentSlot = activeRescheduleAppointment?.appointmentTime === timeSlot && activeRescheduleAppointment?.appointmentDate === rescheduleSelectedDate;
                        const selected = String(rescheduleDrafts[activeRescheduleBookingId]?.appointmentTime || '') === timeSlot;
                        
                        return (
                          <button
                            key={timeSlot}
                            type="button"
                            className={`pg-slot-chip ${selected ? 'selected' : ''}`}
                            disabled={isBooked && !isCurrentSlot || bookedSlotsLoadingDate === rescheduleSelectedDate}
                            onClick={() => updateRescheduleDraft(activeRescheduleBookingId, { 
                              appointmentDate: rescheduleSelectedDate,
                              appointmentTime: timeSlot 
                            })}
                            style={{
                              opacity: isBooked && !isCurrentSlot ? 0.5 : 1,
                              cursor: isBooked && !isCurrentSlot ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {timeSlot}
                            {isBooked && !isCurrentSlot && <span style={{ fontSize: '10px', display: 'block', marginTop: '4px' }}>Booked</span>}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pg-slot-help">No available slots for this date. Please select another date.</div>
                  )}
                </div>
              </>
            )}

            <div className="pg-reschedule-modal-actions">
              {rescheduleSelectedDate ? (
                <button
                  type="button"
                  className="view-button"
                  onClick={() => {
                    setRescheduleSelectedDate('');
                    setRescheduleAvailableSlots([]);
                  }}
                >
                  Back to Calendar
                </button>
              ) : null}
              
              <button
                type="button"
                className="view-button"
                onClick={() => submitRescheduleForBooking(activeRescheduleBookingId)}
                disabled={
                  rescheduleSubmittingBookingId === activeRescheduleBookingId ||
                  !rescheduleSelectedDate ||
                  !String(rescheduleDrafts[activeRescheduleBookingId]?.appointmentTime || '').trim()
                }
              >
                {rescheduleSubmittingBookingId === activeRescheduleBookingId ? 'Saving...' : 'Confirm'}
              </button>

              <button
                type="button"
                className="view-button"
                onClick={() => {
                  cancelRescheduleForBooking(activeRescheduleBookingId);
                  setRescheduleSelectedDate('');
                  setRescheduleAvailableSlots([]);
                }}
                disabled={rescheduleSubmittingBookingId === activeRescheduleBookingId}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Box */}
      {showMessageBox && (
        <div className="chief-overlay" onClick={() => setShowMessageBox(false)}>
          <div className="chief-message-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="chief-message-close-x"
              onClick={() => setShowMessageBox(false)}
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
              onClick={() => setShowMessageBox(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default UGDashboard;
