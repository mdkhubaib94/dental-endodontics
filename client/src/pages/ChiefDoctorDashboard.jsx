import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";
import AssignDoctor from "./AssignDoctor";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { buildSummaryRows, downloadCsv, getReportFilename } from "../utils/reportExport";
import { API_BASE_URL } from "../config/api";
import "./ChiefDoctorDashboard.css";

const ChiefDoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const formatDateInput = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorDepartment, setDoctorDepartment] = useState("");
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);

  const [showMessageBox, setShowMessageBox] = useState(false);
  const [showRedoBox, setShowRedoBox] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isCompactMessageBox, setIsCompactMessageBox] = useState(false);
  const [redoReason, setRedoReason] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [logoBase64, setLogoBase64] = useState(""); // Store logo as base64
  const [useTextLogo, setUseTextLogo] = useState(false); // Use text logo as fallback
  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const [activeView, setActiveView] = useState("blank"); // 'blank' | 'caseFiles'
  const [showAssignDoctorModal, setShowAssignDoctorModal] = useState(false);
  const [assignDoctorMode, setAssignDoctorMode] = useState('create');
  const [selectedDoctorForEdit, setSelectedDoctorForEdit] = useState(null);
  const [actionLoadingCaseId, setActionLoadingCaseId] = useState(null);
  const [actionLoadingType, setActionLoadingType] = useState("");

  // Case Sheet Preview (General Case + X-ray)
  const [showCaseSheetPreview, setShowCaseSheetPreview] = useState(false);
  const [caseSheetPreviewItem, setCaseSheetPreviewItem] = useState(null);
  const [caseSheetPreviewLoading, setCaseSheetPreviewLoading] = useState(false);
  const [caseSheetPreviewError, setCaseSheetPreviewError] = useState("");
  const [caseSheetPreviewGeneralCase, setCaseSheetPreviewGeneralCase] = useState(null);
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [assignedAppointments, setAssignedAppointments] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [selectedAnalyticsDoctorIdentity, setSelectedAnalyticsDoctorIdentity] = useState("");
  const [analyticsFromDate, setAnalyticsFromDate] = useState(formatDateInput(new Date()));
  const [analyticsToDate, setAnalyticsToDate] = useState(formatDateInput(new Date()));
  const [analyticsReport, setAnalyticsReport] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [departmentAnalyticsReport, setDepartmentAnalyticsReport] = useState(null);
  const [departmentAnalyticsLoading, setDepartmentAnalyticsLoading] = useState(false);
  const [departmentAnalyticsError, setDepartmentAnalyticsError] = useState("");
  const [manageActionLoadingDoctorId, setManageActionLoadingDoctorId] = useState("");
  const [selectedAppointmentDoctor, setSelectedAppointmentDoctor] = useState("");

  // Reference for dropdown to close when clicking outside
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLogoutDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Function to check if image loads successfully
  const checkImageLoad = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  const closeMessageBox = () => {
    setShowMessageBox(false);
    setIsCompactMessageBox(false);
  };

  // Load logo as base64 with fallback handling
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Try different possible logo paths
        const logoPaths = [
          '/logo.png',
          '/images/logo.png',
          '/public/logo.png',
          '/assets/logo.png',
          '/img/logo.png',
          'logo.png'
        ];

        let logoLoaded = false;

        for (const path of logoPaths) {
          try {
            const fullPath = window.location.origin + path;
            const response = await fetch(fullPath);
            
            if (response.ok) {
              const blob = await response.blob();
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              
              // Check if image loads successfully
              const imageLoads = await checkImageLoad(base64);
              
              if (imageLoads) {
                setLogoBase64(base64);
                logoLoaded = true;
                console.log(`Logo loaded successfully from: ${path}`);
                break;
              } else {
                console.log(`Logo from ${path} failed to load in image check`);
              }
            }
          } catch (err) {
            console.log(`Failed to load logo from ${path}:`, err.message);
          }
        }

        // If no logo loaded, use text logo
        if (!logoLoaded) {
          console.log('No logo found, using text logo');
          setUseTextLogo(true);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
        setUseTextLogo(true);
      }
    };

    loadLogo();
  }, []);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

  const normalizeDepartment = (value) =>
    String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "");

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  useEffect(() => {
    // Get doctor info from localStorage
    const storedDoctorId = localStorage.getItem("doctorId");
    const storedDoctorName = localStorage.getItem("doctorName");
    const storedDoctorEmail = localStorage.getItem("doctorEmail") || user?.email || "";
    const storedDoctorDepartment = localStorage.getItem("doctorDepartment") || user?.department || "";
    
    if (storedDoctorId) setDoctorId(storedDoctorId);
    else if (user?.Identity) setDoctorId(user.Identity);
    
    if (storedDoctorName) setDoctorName(storedDoctorName);
    else if (user?.name) setDoctorName(user.name);
    
    if (storedDoctorEmail) setDoctorEmail(storedDoctorEmail);
    if (storedDoctorDepartment) setDoctorDepartment(storedDoctorDepartment);
    
    fetchCases({ departmentOverride: storedDoctorDepartment || user?.department || "" });
    fetchAssignedOverview();
  }, [user]);

  useEffect(() => {
    if (selectedAnalyticsDoctorIdentity) return;
    const firstAssignedIdentity = assignedDoctors.find((d) => d?.Identity)?.Identity;
    if (firstAssignedIdentity) {
      setSelectedAnalyticsDoctorIdentity(String(firstAssignedIdentity));
    }
  }, [assignedDoctors, selectedAnalyticsDoctorIdentity]);

  const loadSelectedDoctorAnalytics = async () => {
    const token = user?.token || localStorage.getItem("token");
    if (!token) {
      setAnalyticsError("Authentication token missing. Please log in again.");
      setAnalyticsReport(null);
      return;
    }

    if (!selectedAnalyticsDoctorIdentity) {
      setAnalyticsError("Please select a doctor.");
      setAnalyticsReport(null);
      return;
    }

    const from = new Date(analyticsFromDate);
    const to = new Date(analyticsToDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setAnalyticsError("Please select a valid date range.");
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
      setAnalyticsError("");

      const url = `${API_BASE_URL}/api/reports/chief/doctor-analytics?doctorIdentity=${encodeURIComponent(
        selectedAnalyticsDoctorIdentity
      )}&from=${encodeURIComponent(analyticsFromDate)}&to=${encodeURIComponent(analyticsToDate)}`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let message = "";
        try {
          const errJson = await res.json();
          message = errJson?.message || "";
        } catch {
          try {
            message = await res.text();
          } catch {
            message = "";
          }
        }
        throw new Error(message || `Failed to load analytics (${res.status})`);
      }

      const json = await res.json();
      if (json?.success === false) {
        throw new Error(json?.message || "Failed to load analytics");
      }

      setAnalyticsReport(json);
    } catch (err) {
      setAnalyticsError(err.message || "Unable to load analytics");
      setAnalyticsReport(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadDepartmentAnalytics = async () => {
    const token = user?.token || localStorage.getItem('token');
    if (!token) {
      setDepartmentAnalyticsError('Authentication token missing. Please log in again.');
      setDepartmentAnalyticsReport(null);
      return;
    }

    const from = new Date(analyticsFromDate);
    const to = new Date(analyticsToDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setDepartmentAnalyticsError('Please select a valid date range.');
      setDepartmentAnalyticsReport(null);
      return;
    }
    if (from > to) {
      setDepartmentAnalyticsError("'From' date cannot be later than 'To' date.");
      setDepartmentAnalyticsReport(null);
      return;
    }

    try {
      setDepartmentAnalyticsLoading(true);
      setDepartmentAnalyticsError('');

      const url = `${API_BASE_URL}/api/reports/chief/department-analytics?from=${encodeURIComponent(
        analyticsFromDate
      )}&to=${encodeURIComponent(analyticsToDate)}`;

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let message = '';
        try {
          const errJson = await res.json();
          message = errJson?.message || '';
        } catch {
          try {
            message = await res.text();
          } catch {
            message = '';
          }
        }
        throw new Error(message || `Failed to load department analytics (${res.status})`);
      }

      const json = await res.json();
      if (json?.success === false) {
        throw new Error(json?.message || 'Failed to load department analytics');
      }

      setDepartmentAnalyticsReport(json);
    } catch (err) {
      setDepartmentAnalyticsError(err.message || 'Unable to load department analytics');
      setDepartmentAnalyticsReport(null);
    } finally {
      setDepartmentAnalyticsLoading(false);
    }
  };

  const downloadSelectedDoctorAnalytics = () => {
    if (!analyticsReport) return;

    const selectedDoctor = assignedDoctors.find(
      (d) => String(d?.Identity || "") === String(selectedAnalyticsDoctorIdentity)
    );
    const doctorLabel = selectedDoctor
      ? `${selectedDoctor.name || selectedDoctor.Identity} (${selectedDoctor.Identity})`
      : selectedAnalyticsDoctorIdentity;

    const summaryRows = buildSummaryRows({
      data: analyticsReport,
      title: "Doctor Analytics",
      periodLabel: `${analyticsFromDate} to ${analyticsToDate}`,
    });

    const departmentRows = [
      ["Department", "Unique Patients", "Male", "Female", "New", "Old", "Case Sheets"],
      ...(Array.isArray(analyticsReport.departmentBreakdown) ? analyticsReport.departmentBreakdown : []).map((dept) => [
        dept.department || dept.key || "-",
        dept.totalPatients || 0,
        dept.malePatients || 0,
        dept.femalePatients || 0,
        dept.newPatients || 0,
        dept.oldPatients || 0,
        dept.totalCaseSheets || 0,
      ]),
    ];

    const rows = [["Doctor", doctorLabel], [], ...summaryRows, [], ...departmentRows];
    downloadCsv({
      filename: getReportFilename("doctor_analytics", selectedAnalyticsDoctorIdentity),
      rows,
    });
  };

  /* ================= FETCH ALL DEPARTMENT CASES ================= */

  const fetchCases = async ({ silent = false, departmentOverride = "" } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const normalizedChiefDepartment = normalizeDepartment(
        departmentOverride || doctorDepartment || user?.department || localStorage.getItem("doctorDepartment")
      );

      const allEndpoints = [
        {
          departmentKey: "pedodontics",
          department: "Pedodontics",
          url: `${API_BASE_URL}/api/pedodontics/chief/all-cases`,
        },
        {
          departmentKey: "completeDenture",
          department: "Complete Denture",
          url: `${API_BASE_URL}/api/complete-denture/chief/all-cases`,
        },
        {
          departmentKey: "fpd",
          department: "FPD",
          url: `${API_BASE_URL}/api/fpd/chief/all-cases`,
        },
        {
          departmentKey: "implant",
          department: "Implant",
          url: `${API_BASE_URL}/api/implant/chief/all-cases`,
        },
        {
          departmentKey: "implantPatient",
          department: "Implant Patient Surgery",
          url: `${API_BASE_URL}/api/ImplantPatient/chief/all-cases`,
        },
        {
          departmentKey: "partial",
          department: "Partial Denture",
          url: `${API_BASE_URL}/api/partial/chief/all-cases`,
        },
      ];

      const allowedCaseDepartmentsByChiefDepartment = {
        pedodontics: ["pedodontics"],
        prosthodontics: ["completeDenture", "fpd", "implant", "implantPatient", "partial"],
        prothodontics: ["completeDenture", "fpd", "implant", "implantPatient", "partial"],
        prosthondontics: ["completeDenture", "fpd", "implant", "implantPatient", "partial"],
        completedenture: ["completeDenture"],
        fpd: ["fpd"],
        fixedpartialdenture: ["fpd"],
        implantology: ["implant", "implantPatient"],
        implant: ["implant"],
        implantpatient: ["implantPatient"],
        partialdenture: ["partial"],
        partial: ["partial"],
      };

      const allowedCaseDepartments = allowedCaseDepartmentsByChiefDepartment[normalizedChiefDepartment] || [];
      const endpoints = allEndpoints.filter((ep) => allowedCaseDepartments.includes(ep.departmentKey));

      if (!endpoints.length) {
        setCases([]);
        setError("No department access configured for this chief doctor account.");
        return;
      }

      const requests = endpoints.map(async (ep) => {
        try {
          const res = await fetch(ep.url, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!res.ok) {
            console.warn(`[${ep.department}] ${res.status} - ${res.statusText}`);
            return [];
          }

          const json = await res.json();
          return (json.data || []).map((c) => ({
            ...c,
            department: ep.department,
          }));
        } catch (e) {
          console.error(`[${ep.department}] Error:`, e.message);
          return [];
        }
      });

      const results = await Promise.all(requests);
      const merged = results.flat();

      merged.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setCases(merged);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch cases");
    } finally {
      if (!silent) setLoading(false);
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

  /* ================= ASSIGNMENT MANAGEMENT ================= */

  const fetchAssignedOverview = async ({ silent = false } = {}) => {
    try {
      if (!silent) setAssignmentLoading(true);
      setAssignmentError("");

      const token = user?.token || localStorage.getItem("token");
      if (!token) {
        setAssignmentError("Authentication token missing");
        return;
      }

      const res = await fetch(buildApiUrl("/api/appointment/assigned-doctors/overview"), {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to load assigned doctor overview (${res.status})`);
      }

      const json = await res.json();
      setAssignedDoctors(Array.isArray(json.doctors) ? json.doctors : []);
      setAssignedAppointments(Array.isArray(json.appointments) ? json.appointments : []);
    } catch (err) {
      setAssignmentError(err.message || "Unable to load assigned doctor data");
      setAssignedDoctors([]);
      setAssignedAppointments([]);
    } finally {
      if (!silent) setAssignmentLoading(false);
    }
  };

  const handleUnassignDoctor = async (doctorDbId, doctorDisplayName) => {
    setManageActionLoadingDoctorId(doctorDbId);
    try {
      const token = user?.token || localStorage.getItem("token");
      const res = await fetch(buildApiUrl(`/api/auth/chief/assigned-doctors/${doctorDbId}/unassign`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to unassign doctor");
      }

      setIsCompactMessageBox(true);
      setMessageTitle("");
      setMessage("Updated successfully");
      setShowMessageBox(true);
      await fetchAssignedOverview({ silent: true });
    } catch (err) {
      setAssignmentError(err.message || "Failed to unassign doctor");
    } finally {
      setManageActionLoadingDoctorId("");
    }
  };

  const openCreateDoctorModal = () => {
    setAssignDoctorMode('create');
    setSelectedDoctorForEdit(null);
    setShowAssignDoctorModal(true);
  };

  const openEditDoctorModal = (doctor) => {
    setAssignDoctorMode('edit');
    setSelectedDoctorForEdit(doctor || null);
    setShowAssignDoctorModal(true);
  };


  /* ================= GOOGLE-STYLE LOGOUT ================= */

  const toggleLogoutDropdown = () => {
    setShowLogoutDropdown(!showLogoutDropdown);
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("doctorId");
    localStorage.removeItem("doctorName");
    localStorage.removeItem("doctorEmail");
    localStorage.removeItem("viewCaseDepartment");
    localStorage.removeItem("CurrentpatientId");
    localStorage.removeItem("CurrentpatientName");
    localStorage.removeItem("linkedCaseId");
    localStorage.removeItem("linkedCaseDepartment");
    
    // Call auth context logout
    logout();
    
    // Redirect to login
    navigate("/login", { replace: true });
  };

  const handleChangePassword = () => {
    navigate("/change-password");
    setShowLogoutDropdown(false);
  };

  const handleViewProfile = () => {
    navigate("/doctor-profile");
    setShowLogoutDropdown(false);
  };

  /* ================= APPROVE CASE ================= */

  const handleApprove = async (caseItem) => {
    setActionLoadingCaseId(caseItem._id);
    setActionLoadingType("approve");

    try {
      const token = localStorage.getItem("token");

      const apiMap = {
        Pedodontics: "pedodontics",
        "Complete Denture": "complete-denture",
        FPD: "fpd",
        Implant: "implant",
        "Implant Patient Surgery": "ImplantPatient",
        "Partial Denture": "partial",
      };

      const base = apiMap[caseItem.department];

      const response = await fetch(
        buildApiUrl(`/api/${base}/${caseItem._id}/approve`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chiefApproval: "Approved",
            approvedBy: user?.name || "Chief Doctor",
            approvedAt: new Date(),
          }),
        }
      );

      if (response.ok) {
        updateCaseStatusLocally(
          caseItem._id,
          "Approved",
          user?.name || "Chief Doctor"
        );
        setIsCompactMessageBox(true);
        setMessageTitle("");
        setMessage("Approved successfully");
        setShowMessageBox(true);
        fetchCases({ silent: true });
      } else {
        const text = await response.text();
        console.error('Approve API failed', response.status, text);
        setError(`Failed to approve case (${response.status})`);
      }
    } catch (error) {
      console.error(error);
      setError("Error approving case");
    } finally {
      setActionLoadingCaseId(null);
      setActionLoadingType("");
    }
  };

  /* ================= REDO ================= */

  const handleRedo = (caseItem) => {
    setSelectedCase(caseItem);
    setShowRedoBox(true);
  };

  const submitRedoReason = async () => {
    if (!redoReason.trim()) {
      alert("Please enter a reason");
      return;
    }

    if (!selectedCase?._id) {
      setError("No case selected for redo");
      return;
    }

    setActionLoadingCaseId(selectedCase._id);
    setActionLoadingType("redo");

    try {
      const token = localStorage.getItem("token");

      const apiMap = {
        Pedodontics: "pedodontics",
        "Complete Denture": "complete-denture",
        FPD: "fpd",
        Implant: "implant",
        "Implant Patient Surgery": "ImplantPatient",
        "Partial Denture": "partial",
      };

      const base = apiMap[selectedCase.department];

      const response = await fetch(
        buildApiUrl(`/api/${base}/${selectedCase._id}/approve`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chiefApproval: `Redo: ${redoReason}`,
            approvedBy: user?.name || "Chief Doctor",
            approvedAt: new Date(),
          }),
        }
      );

      if (response.ok) {
        updateCaseStatusLocally(
          selectedCase._id,
          `Redo: ${redoReason}`,
          user?.name || "Chief Doctor"
        );
        setShowRedoBox(false);
        setRedoReason("");
        setSelectedCase(null);

        setIsCompactMessageBox(true);
        setMessageTitle("");
        setMessage("Redo submitted successfully");
        setShowMessageBox(true);

        fetchCases({ silent: true });
      } else {
        setError("Failed to submit redo request");
      }
    } catch (error) {
      console.error(error);
      setError("Error submitting redo");
    } finally {
      setActionLoadingCaseId(null);
      setActionLoadingType("");
    }
  };

  /* ================= VIEW CASE SHEET ================= */

  const viewCaseSheet = (caseItem) => {
    // Kept for compatibility; now routes through preview-first flow.
    openCaseSheetPreview(caseItem);
  };

  const normalizeXraySrc = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.startsWith("data:")) return raw;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("/")) return raw;
    return `data:image/jpeg;base64,${raw}`;
  };

  const openFullCaseSheet = (caseItem) => {
    if (!caseItem?._id) return;
    localStorage.setItem("viewCaseDepartment", caseItem.department);
    window.open(`/case-sheet-view/${caseItem._id}`, "_blank");
  };

  const closeCaseSheetPreview = () => {
    setShowCaseSheetPreview(false);
    setCaseSheetPreviewItem(null);
    setCaseSheetPreviewLoading(false);
    setCaseSheetPreviewError("");
    setCaseSheetPreviewGeneralCase(null);
  };

  const openCaseSheetPreview = async (caseItem) => {
    setShowCaseSheetPreview(true);
    setCaseSheetPreviewItem(caseItem || null);
    setCaseSheetPreviewGeneralCase(null);
    setCaseSheetPreviewError("");

    const patientId = String(caseItem?.patientId || "").trim();
    if (!patientId) {
      setCaseSheetPreviewError("Patient ID missing for this case.");
      return;
    }

    setCaseSheetPreviewLoading(true);
    try {
      const token = user?.token || localStorage.getItem("token");
      const response = await fetch(
        buildApiUrl(`/api/general/patient/${encodeURIComponent(patientId)}`),
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        setCaseSheetPreviewError("Failed to load General Case Sheet preview.");
        return;
      }

      const json = await response.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      if (!rows.length) {
        setCaseSheetPreviewError("No General Case Sheet found for this patient.");
        return;
      }

      const latest = [...rows].sort((a, b) => {
        const aTime = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const bTime = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
        return bTime - aTime;
      })[0];

      setCaseSheetPreviewGeneralCase(latest);
    } catch (err) {
      console.error("Failed to load general case preview:", err);
      setCaseSheetPreviewError("Error loading General Case Sheet preview.");
    } finally {
      setCaseSheetPreviewLoading(false);
    }
  };

  /* ================= VIEW PRESCRIPTION ================= */

  const viewPrescription = (caseItem) => {
    (async () => {
      try {
        if (caseItem?.patientId) {
          localStorage.setItem('CurrentpatientId', caseItem.patientId);
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

        // Prefer case-linked prescriptions (per-case-sheet) when possible
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

  /* ================= STATUS HELPERS ================= */

  const getApprovalStatus = (caseItem) => {
    if (!caseItem.chiefApproval) return "Pending";
    if (caseItem.chiefApproval.toLowerCase().includes("approved"))
      return "Approved";
    if (caseItem.chiefApproval.toLowerCase().includes("redo"))
      return "Redo";
    return caseItem.chiefApproval;
  };

  const getStatusBadgeClass = (status) => {
    if (status === "Approved") return "status-badge approved";
    if (status === "Redo") return "status-badge redo";
    return "status-badge pending";
  };

  /* ================= FILTER CASES ================= */

  const filteredCases = cases
    .filter((c) => {
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      return (c.doctorName || "").toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const statusA = getApprovalStatus(a);
      const statusB = getApprovalStatus(b);

      const priority = {
        Pending: 0,
        Redo: 1,
        Approved: 2,
      };

      const priorityA = priority[statusA] ?? 3;
      const priorityB = priority[statusB] ?? 3;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const pendingCasesCount = cases.filter((c) => getApprovalStatus(c) === "Pending").length;
  const assignedDoctorCount = assignedDoctors.length;
  const upcomingAppointmentsCount = assignedAppointments.length;

  const appointmentsGroupedByDoctor = assignedAppointments.reduce((acc, appointment) => {
    const key = appointment.doctorId || appointment.doctorIdentity || "unknown";
    if (!acc[key]) {
      acc[key] = {
        doctorName: appointment.doctorName || "Unassigned Doctor",
        doctorIdentity: appointment.doctorIdentity || "-",
        department: appointment.doctorDepartment || "-",
        appointments: [],
      };
    }

    acc[key].appointments.push(appointment);
    return acc;
  }, {});

  const appointmentDoctorGroups = Object.values(appointmentsGroupedByDoctor);

  /* ================= UI - GET INITIALS ================= */

  const getInitials = () => {
    if (!doctorName) return "CD";
    return doctorName
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDepartmentLabel = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw
      .split(/\s+/)
      .map((word) => {
        if (!word) return word;
        if (word.toUpperCase() === word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  };

  /* ================= UI ================= */

  if (loading) {
    return <div className="chief-layout-loading">Loading cases...</div>;
  }

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
            aria-label={isSideNavOpen ? "Collapse navigation" : "Expand navigation"}
            title="Menu"
            onClick={() => setIsSideNavOpen((v) => !v)}
          >
            ☰
          </button>

          <div className="chief-brand">
            {!useTextLogo && logoBase64 ? (
              <img
                className="chief-brand-logo"
                src={logoBase64}
                alt="Logo"
                onError={() => setUseTextLogo(true)}
              />
            ) : (
              <div className="chief-brand-logo-text">SRM</div>
            )}
            <div className="chief-brand-title">
              Chief Doctor Dashboard
              {doctorDepartment ? (
                <span className="chief-brand-title-dept">— {formatDepartmentLabel(doctorDepartment)}</span>
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
                <span className="profile-name">
                  {doctorName || user?.name || "Chief Doctor"}
                </span>
                <span className="profile-email">
                  {doctorEmail || user?.email || "chief@hospital.com"}
                </span>
              </div>
              <div className="profile-arrow">{showLogoutDropdown ? "▲" : "▼"}</div>
            </div>

            {showLogoutDropdown && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">{getInitials()}</div>
                  <div className="dropdown-user-info">
                    <div className="dropdown-name">
                      {doctorName || user?.name || "Chief Doctor"}
                    </div>
                    {doctorId && <div className="dropdown-id">ID: {doctorId}</div>}
                    <div className="dropdown-email">
                      {doctorEmail || user?.email || "chief@hospital.com"}
                    </div>
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                <div className="dropdown-options">
                  <button className="dropdown-item" onClick={handleViewProfile}>
                    <span className="dropdown-icon">👤</span>
                    <span>My Profile</span>
                  </button>

                  <button className="dropdown-item" onClick={handleChangePassword}>
                    <span className="dropdown-icon">🔒</span>
                    <span>Change Password</span>
                  </button>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item logout" onClick={handleLogout}>
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
          <aside className="chief-sidenav" aria-label="Chief doctor navigation">
            <div className="chief-sidenav-section">
              <div className="chief-sidenav-title">Menu</div>
              <button
                type="button"
                className={`chief-nav-item ${activeView === "blank" ? "active" : ""}`}
                onClick={() => {
                  setActiveView("blank");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span className="chief-nav-icon">🏠</span>
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === "caseFiles" ? "active" : ""}`}
                onClick={() => {
                  setActiveView("caseFiles");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span className="chief-nav-icon">📁</span>
                <span>Case Files</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === "doctorManagement" ? "active" : ""}`}
                onClick={() => {
                  setActiveView("doctorManagement");
                  fetchAssignedOverview({ silent: true });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span className="chief-nav-icon">🩺</span>
                <span>My Doctors</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === "doctorAppointments" ? "active" : ""}`}
                onClick={() => {
                  setActiveView("doctorAppointments");
                  fetchAssignedOverview({ silent: true });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span className="chief-nav-icon">🗓️</span>
                <span>Appointments</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeView === "analytics" ? "active" : ""}`}
                onClick={() => {
                  setActiveView("analytics");
                  fetchAssignedOverview({ silent: true });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span className="chief-nav-icon">📊</span>
                <span>Analytics</span>
              </button>

              <button
                type="button"
                className="chief-nav-item"
                onClick={() => {
                  navigate("/chief-doctor-dashboard/reports");
                }}
              >
                <span className="chief-nav-icon">📈</span>
                <span>Reports</span>
              </button>
            </div>

            <div className="chief-sidenav-section">
              <div className="chief-sidenav-title">Staff Management</div>
              <button
                type="button"
                className="chief-nav-item"
                onClick={openCreateDoctorModal}
              >
                <span className="chief-nav-icon">👨‍⚕️</span>
                <span>Assign a Doctor</span>
              </button>
            </div>
          </aside>
        )}

        <main className="chief-main" aria-label="Chief doctor content">
          {activeView === "blank" && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>Chief Doctor Overview</h2>
              </div>
              <div className="chief-summary-grid">
                <div className="chief-summary-card">
                  <h3>Assigned Doctors</h3>
                  <p>{assignedDoctorCount}</p>
                </div>
                <div className="chief-summary-card">
                  <h3>Upcoming Appointments</h3>
                  <p>{upcomingAppointmentsCount}</p>
                </div>
                <div className="chief-summary-card">
                  <h3>Pending Case Reviews</h3>
                  <p>{pendingCasesCount}</p>
                </div>
              </div>
            </section>
          )}

          {activeView === "doctorManagement" && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>Assigned Doctors Management</h2>
                <button type="button" className="view-button" onClick={() => fetchAssignedOverview()}>
                  Refresh
                </button>
              </div>

              {assignmentError && <div className="error-message">{assignmentError}</div>}

              {assignmentLoading ? (
                <div className="chief-inline-loading">Loading assigned doctors...</div>
              ) : assignedDoctors.length === 0 ? (
                <div className="chief-empty-state">No doctors currently assigned by you.</div>
              ) : (
                <table className="chief-simple-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Department</th>
                      <th>Name</th>
                      <th>Number</th>
                      <th>Mail</th>
                      <th>Doctor ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedDoctors.map((doctor, index) => (
                      <tr key={doctor._id}>
                        <td>{index + 1}</td>
                        <td>
                          {doctor.department || "-"}
                        </td>
                        <td>
                          {doctor.name || "-"}
                        </td>
                        <td>
                          {doctor.phone || "-"}
                        </td>
                        <td>
                          {doctor.email || "-"}
                        </td>
                        <td>{doctor.Identity || "-"}</td>
                        <td>
                          <div className="chief-manage-actions">
                            <button
                              type="button"
                              className="view-button"
                              disabled={manageActionLoadingDoctorId === doctor._id}
                              onClick={() => openEditDoctorModal(doctor)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-button redo-btn"
                              disabled={manageActionLoadingDoctorId === doctor._id}
                              onClick={() => handleUnassignDoctor(doctor._id, doctor.name || doctor.Identity || "Doctor")}
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

          {activeView === "doctorAppointments" && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>Doctors Appointment</h2>
                <button type="button" className="view-button" onClick={() => fetchAssignedOverview()}>
                  Refresh
                </button>
              </div>

              {assignmentError && <div className="error-message">{assignmentError}</div>}

              {assignmentLoading ? (
                <div className="chief-inline-loading">Loading appointments...</div>
              ) : appointmentDoctorGroups.length === 0 ? (
                <div className="chief-empty-state">No scheduled appointments found for your assigned doctors.</div>
              ) : (
                <>
                  <div className="chief-doctor-selector" style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
                    <label htmlFor="doctor-select" style={{ fontWeight: "600", color: "white" }}>Select Doctor:</label>
                    <select 
                      id="doctor-select"
                      value={selectedAppointmentDoctor}
                      onChange={(e) => setSelectedAppointmentDoctor(e.target.value)}
                      className="chief-select"
                      style={{ minWidth: "250px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc" }}
                    >
                      <option value="">All Doctors</option>
                      {appointmentDoctorGroups.map((group) => (
                        <option key={`${group.doctorIdentity}-${group.department}`} value={group.doctorIdentity}>
                          {group.doctorName} ({group.doctorIdentity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="chief-doctor-groups">
                    {appointmentDoctorGroups
                      .filter((group) => !selectedAppointmentDoctor || group.doctorIdentity === selectedAppointmentDoctor)
                      .map((group) => (
                        <div key={`${group.doctorIdentity}-${group.department}`} className="chief-doctor-group-card">
                          <div className="chief-doctor-group-header">
                            <h3>{group.doctorName}</h3>
                            <div>{group.doctorIdentity} | {group.department}</div>
                          </div>
                          <table className="chief-simple-table">
                            <thead>
                              <tr>
                                <th>S.No</th>
                                <th>Booking ID</th>
                                <th>Patient ID</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Complaint</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.appointments.map((appointment, index) => (
                                <tr key={appointment.bookingId}>
                                  <td>{index + 1}</td>
                                  <td>{appointment.bookingId || "-"}</td>
                                  <td>{appointment.patientId || "-"}</td>
                                  <td>{appointment.appointmentDate || "-"}</td>
                                  <td>{appointment.appointmentTime || "-"}</td>
                                  <td>{appointment.chiefComplaint || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </section>
          )}

          {activeView === "analytics" && (
            <section className="chief-section-card">
              <div className="chief-section-header-row">
                <h2>Department Analytics</h2>
                <div className="chief-analytics-actions">
                  <button
                    type="button"
                    className="view-button"
                    onClick={loadDepartmentAnalytics}
                    disabled={departmentAnalyticsLoading}
                  >
                    View
                  </button>
                </div>
              </div>

              <div className="chief-analytics-controls">
                <div className="chief-analytics-control">
                  <label>Doctor</label>
                  <select
                    className="chief-select"
                    value={selectedAnalyticsDoctorIdentity}
                    onChange={(e) => setSelectedAnalyticsDoctorIdentity(e.target.value)}
                  >
                    <option value="">Select doctor</option>
                    {assignedDoctors.map((doctor) => (
                      <option key={doctor._id} value={doctor.Identity || ""}>
                        {doctor.name} ({doctor.Identity})
                      </option>
                    ))}
                  </select>
                </div>

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

              {assignmentError && <div className="error-message">{assignmentError}</div>}
              {departmentAnalyticsError && <div className="error-message">{departmentAnalyticsError}</div>}

              {departmentAnalyticsLoading ? (
                <div className="chief-inline-loading">Loading department analytics...</div>
              ) : !departmentAnalyticsReport ? (
                <div className="chief-empty-state">Select a date range and click View.</div>
              ) : (
                <>
                  <div className="chief-summary-grid" style={{ marginBottom: 16 }}>
                    <div className="chief-summary-card">
                      <h3>Total Doctors</h3>
                      <p>{departmentAnalyticsReport.totalDoctors || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Total PGs</h3>
                      <p>{departmentAnalyticsReport.totalPGs || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Total UGs</h3>
                      <p>{departmentAnalyticsReport.totalUGs || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Total Patients</h3>
                      <p>{departmentAnalyticsReport.uniqueSeenCount || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Male</h3>
                      <p>{departmentAnalyticsReport.malePatients || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Female</h3>
                      <p>{departmentAnalyticsReport.femalePatients || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>New</h3>
                      <p>{departmentAnalyticsReport.newPatientsVisited || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Old</h3>
                      <p>{departmentAnalyticsReport.oldPatientsVisited || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Billing Collected</h3>
                      <p>{departmentAnalyticsReport.billing?.totalAmount || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Approved</h3>
                      <p>{departmentAnalyticsReport.approvalCounts?.approved || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Redo</h3>
                      <p>{departmentAnalyticsReport.approvalCounts?.rejected || 0}</p>
                    </div>
                  </div>

                  <table className="chief-simple-table" style={{ marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Doctor</th>
                        <th>Doctor ID</th>
                        <th>PGs Assigned</th>
                        <th>UGs Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(departmentAnalyticsReport.doctors)
                        ? departmentAnalyticsReport.doctors
                        : []
                      ).map((d, index) => (
                        <tr key={d.doctorId || d.doctorName}>
                          <td>{index + 1}</td>
                          <td>{d.doctorName || '-'}</td>
                          <td>{d.doctorId || '-'}</td>
                          <td>{d.pgCount || 0}</td>
                          <td>{d.ugCount || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <div className="dropdown-divider" style={{ margin: '24px 0' }} />

              <div className="chief-section-header-row">
                <h2>Doctor Analytics</h2>
                <div className="chief-analytics-actions">
                  <button
                    type="button"
                    className="view-button"
                    onClick={loadSelectedDoctorAnalytics}
                    disabled={analyticsLoading || !selectedAnalyticsDoctorIdentity}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="view-button"
                    onClick={downloadSelectedDoctorAnalytics}
                    disabled={!analyticsReport}
                  >
                    Download Excel
                  </button>
                </div>
              </div>

              {analyticsError && <div className="error-message">{analyticsError}</div>}

              {analyticsLoading ? (
                <div className="chief-inline-loading">Loading analytics...</div>
              ) : !assignedDoctors.length ? (
                <div className="chief-empty-state">No assigned doctors found.</div>
              ) : !analyticsReport ? (
                <div className="chief-empty-state">Select a doctor and date range, then click View.</div>
              ) : (
                <>
                  <div className="chief-summary-grid" style={{ marginBottom: 16 }}>
                    <div className="chief-summary-card">
                      <h3>Assigned PGs</h3>
                      <p>{analyticsReport.assignedPGCount || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Assigned UGs</h3>
                      <p>{analyticsReport.assignedUGCount || 0}</p>
                    </div>
                    <div className="chief-summary-card">
                      <h3>Total Patients Visited</h3>
                      <p>{analyticsReport.totalPatientsVisited ?? analyticsReport.uniqueSeenCount ?? 0}</p>
                    </div>
                  </div>

                  <div className="chief-analytics-charts">
                    <div className="chief-chart-container">
                      <h3>Male vs Female</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Male", value: analyticsReport.malePatients || 0 },
                              { name: "Female", value: analyticsReport.femalePatients || 0 },
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

                    <div className="chief-chart-container">
                      <h3>Old vs New</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: "New", value: analyticsReport.newPatientsVisited || 0 },
                              { name: "Old", value: analyticsReport.oldPatientsVisited || 0 },
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
                </>
              )}
            </section>
          )}

          {activeView === "caseFiles" && (
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
                        onClick={() => setSearchTerm("")}
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

              {error && (
                <div className="error-message">
                  {error}
                  <button onClick={fetchCases} type="button">
                    Retry
                  </button>
                </div>
              )}

              <table className="chief-cases-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Case</th>
                  <th>Doctor</th>
                  <th>Patient Name</th>
                  <th>Patient ID</th>
                  <th>Date</th>
                  <th>Case Sheet</th>
                  <th>Prescription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.length > 0 ? (
                  filteredCases.map((c, i) => {
                    const status = getApprovalStatus(c);
                    return (
                      <tr key={c._id}>
                        <td>{i + 1}</td>
                        <td>{c.department}</td>
                        <td>{c.doctorName}</td>
                        <td>{c.patientName || '—'}</td>
                        <td>{c.patientId || '—'}</td>
                        <td>{c.createdAt ? formatDate(c.createdAt) : "—"}</td>
                        <td>
                          <button
                            className="view-button"
                            onClick={() => {
                              const pid = String(c?.patientId || '').trim();
                              const cid = String(c?._id || '').trim();
                              const pname = String(c?.patientName || '').trim();
                              const dept = String(c?.department || '').trim();
                              const url = `/general-case-view?patientId=${encodeURIComponent(pid)}&patientName=${encodeURIComponent(pname)}&caseId=${encodeURIComponent(cid)}&department=${encodeURIComponent(dept)}`;
                              window.open(url, '_blank');
                            }}
                            type="button"
                            disabled={!String(c?.patientId || '').trim()}
                          >
                            View
                          </button>
                        </td>
                        <td>
                          <button className="view-button" onClick={() => viewPrescription(c)} type="button">
                            View
                          </button>
                        </td>
                        <td>
                          {status === "Pending" ? (
                            <div className="action-buttons">
                              {actionLoadingCaseId === c._id ? (
                                <div className="modern-action-loader" role="status" aria-live="polite">
                                  <span className="modern-spinner" aria-hidden="true" />
                                  <span className="modern-loader-text">
                                    {actionLoadingType === "approve" ? "Approving..." : "Submitting..."}
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
                          ) : status === "Approved" ? (
                            <span className="status-approved"> Approved</span>
                          ) : status === "Redo" ? (
                            <span className="status-redo"> Redo</span>
                          ) : (
                            <span className="no-actions">No Actions</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="no-data">
                      No cases found
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </>
          )}
        </main>

        {/* CASE SHEET PREVIEW MODAL */}
        {showCaseSheetPreview && (
          <div className="message-box-container show" onClick={closeCaseSheetPreview}>
            <div
              className="message-box case-preview-box"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                className="message-box-close-x"
                onClick={closeCaseSheetPreview}
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>

              <h2>General Case Sheet Preview</h2>

              <div className="case-preview-meta">
                <div><strong>Patient:</strong> {caseSheetPreviewItem?.patientName || '—'}</div>
                <div><strong>Patient ID:</strong> {caseSheetPreviewItem?.patientId || '—'}</div>
                <div><strong>Doctor:</strong> {caseSheetPreviewItem?.doctorName || '—'}</div>
                <div><strong>Case:</strong> {caseSheetPreviewItem?.department || '—'}</div>
              </div>

              {caseSheetPreviewLoading ? (
                <div className="case-preview-loading">Loading preview...</div>
              ) : caseSheetPreviewError ? (
                <div className="case-preview-error">{caseSheetPreviewError}</div>
              ) : (
                <div className="case-preview-grid">
                  <div className="case-preview-details">
                    <div className="case-preview-row">
                      <span className="label">Chief Complaint</span>
                      <span className="value">{caseSheetPreviewGeneralCase?.chiefComplaint || '—'}</span>
                    </div>
                    <div className="case-preview-row">
                      <span className="label">Present Illness</span>
                      <span className="value">{caseSheetPreviewGeneralCase?.presentIllness || '—'}</span>
                    </div>
                    <div className="case-preview-row">
                      <span className="label">Clinical Findings</span>
                      <span className="value">{caseSheetPreviewGeneralCase?.clinicalFindings || '—'}</span>
                    </div>
                    <div className="case-preview-row">
                      <span className="label">Diagnosis</span>
                      <span className="value">{caseSheetPreviewGeneralCase?.diagnosis || caseSheetPreviewGeneralCase?.provisionalDiagnosis || '—'}</span>
                    </div>
                  </div>

                  <div className="case-preview-xray">
                    <div className="case-preview-xray-title">X-ray</div>
                    {String(caseSheetPreviewGeneralCase?.xrayImage || '').trim() ? (
                      <img
                        className="case-preview-xray-img"
                        src={normalizeXraySrc(caseSheetPreviewGeneralCase?.xrayImage)}
                        alt="X-ray Preview"
                      />
                    ) : (
                      <div className="case-preview-xray-empty">No X-ray uploaded</div>
                    )}
                  </div>
                </div>
              )}

              <div className="case-preview-actions">
                <button
                  type="button"
                  onClick={() => {
                    if (caseSheetPreviewItem) openFullCaseSheet(caseSheetPreviewItem);
                    closeCaseSheetPreview();
                  }}
                  disabled={!caseSheetPreviewItem?._id}
                >
                  Open Case Sheet
                </button>
                <button type="button" className="cancel-btn" onClick={closeCaseSheetPreview}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGE BOX */}
        {showMessageBox && (
          <div className="message-box-container show">
            <div className={`message-box${isCompactMessageBox ? ' message-box-compact' : ''}`}>
              {isCompactMessageBox ? (
                <>
                  <button
                    type="button"
                    className="message-box-close-x"
                    onClick={closeMessageBox}
                    aria-label="Close"
                    title="Close"
                  >
                    ✕
                  </button>
                  <p>{message}</p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="message-box-close-x"
                    onClick={closeMessageBox}
                    aria-label="Close"
                    title="Close"
                  >
                    ✕
                  </button>
                  <h2>{messageTitle}</h2>
                  <p>{message}</p>
                  <button onClick={closeMessageBox}>OK</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* REDO BOX */}
        {showRedoBox && (
          <div className="message-box-container show">
            <div className="message-box">
              <h2>Redo Request</h2>
              <textarea
                className="redo-textarea"
                value={redoReason}
                onChange={(e) => setRedoReason(e.target.value)}
                rows="6"
                placeholder="Please enter the reason for requesting redo..."
              />
              <div className="redo-buttons">
                <button
                  onClick={submitRedoReason}
                  disabled={actionLoadingType === "redo" && !!actionLoadingCaseId}
                >
                  {actionLoadingType === "redo" && !!actionLoadingCaseId ? (
                    <>
                      <span className="btn-inline-spinner" aria-hidden="true" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
                <button 
                  className="cancel-btn" 
                  onClick={() => setShowRedoBox(false)}
                  disabled={actionLoadingType === "redo" && !!actionLoadingCaseId}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGN DOCTOR MODAL */}
        <AssignDoctor 
          isOpen={showAssignDoctorModal}
          onClose={() => {
            setShowAssignDoctorModal(false);
            setAssignDoctorMode('create');
            setSelectedDoctorForEdit(null);
          }}
          allowedDepartment={doctorDepartment}
          mode={assignDoctorMode}
          initialDoctor={selectedDoctorForEdit}
          onDoctorCreated={() => {
            setShowAssignDoctorModal(false);
            // Optionally refresh data or show success message
          }}
          onDoctorSaved={async () => {
            setIsCompactMessageBox(true);
            setMessageTitle("");
            setMessage("Updated successfully");
            setShowMessageBox(true);
            await fetchAssignedOverview({ silent: true });
          }}
        />
      </div>
    </div>
  );
};

export default ChiefDoctorDashboard;
