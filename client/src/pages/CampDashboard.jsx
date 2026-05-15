import React, { useState, useEffect, useRef } from 'react';
import './ChiefDoctorDashboard.css';
import './AdminDashboard.css';
import PieChartSection from './PieChartSection';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BillX from './casesheetBilling';
import { API_BASE_URL } from '../config/api';

const normalizeListResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

const CampDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const campId = String(user?.id || localStorage.getItem('adminId') || '').trim();
  const campName = String(user?.name || localStorage.getItem('name') || 'Camp Admin').trim();
  const campEmail = String(user?.email || localStorage.getItem('email') || '').trim();

  const getInitials = () => {
    const name = campName || 'Camp';
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'C';
    const first = parts[0]?.[0] || 'C';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '';
    return `${first}${last}`.toUpperCase();
  };

  const [activeTab, setActiveTab] = useState('patientManagement');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPatient, setNewPatient] = useState({
    patientId: '', firstName: '', lastName: '', email: '',
    phone: '', dob: '', gender: '', address: '',
    chiefComplaint: '', maritalStatus: '', pregnancyStatus: ''
  });
  const [institutionInfo, setInstitutionInfo] = useState({
    campDate: '', institutionName: '', institutionAddress: ''
  });
  const [billingRecords, setBillingRecords] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: '', paymentMethod: 'cash', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPatientId, setGeneratingPatientId] = useState(false);
  const [fetchingSignupDetails, setFetchingSignupDetails] = useState(false);
  const [isWalkInId, setIsWalkInId] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPatientData, setEditPatientData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showPatientRegistration, setShowPatientRegistration] = useState(false);
  const [todayVisitStats, setTodayVisitStats] = useState(null);

  const chiefComplaints = [
    "Pain/Toothache", "Dental Caries (Cavities)", "Sensitivity",
    "Gingivitis and Gum Problems", "Aesthetic Concerns", "Post-filling Complaints",
    "Missing Teeth/Tooth Replacement", "Routine Check-up/Cleaning", "Oral Ulcers",
    "Facial/Intra-oral Swelling", "Loose Teeth", "Bad Breath (Halitosis)",
    "Temporomandibular Joint (TMJ) Pain/Disorder", "Fractured Tooth", "Food Impaction"
  ];

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/reports/today'));
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success) setTodayVisitStats(data);
      } catch (err) {
        console.error('Error fetching today visit stats:', err);
      }
    };
    fetchTodayStats();
  }, []);

  const handleLogout = () => { logout(); };
  const toggleLogoutDropdown = () => setShowLogoutDropdown((v) => !v);
  const handleViewProfile = () => { setShowLogoutDropdown(false); navigate('/doctor-profile'); };
  const handleChangePassword = () => { setShowLogoutDropdown(false); navigate('/reset-password'); };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setShowLogoutDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      try {
        const testResponse = await fetch(buildApiUrl('/api/test'));
        await testResponse.json();
      } catch {
        throw new Error('Backend server is not responding.');
      }
      const patientsResponse = await fetch(buildApiUrl('/api/patient-details'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!patientsResponse.ok) throw new Error(`Failed to fetch patients: ${patientsResponse.status}`);
      const patientsData = await patientsResponse.json();
      let patientsList = [];
      if (patientsData.success && patientsData.patients) patientsList = patientsData.patients;
      else if (patientsData.success && patientsData.data) patientsList = patientsData.data;
      else if (Array.isArray(patientsData)) patientsList = patientsData;
      setPatients(Array.isArray(patientsList) ? patientsList : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const generateUniquePatientId = async () => {
    try {
      setGeneratingPatientId(true);
      const res = await fetch(buildApiUrl('/api/patient-details/next-id'));
      const data = await res.json();
      if (!res.ok || !data.success || !data.patientId) throw new Error(data.message || 'Failed to generate patient ID');
      setNewPatient(prev => ({ ...prev, patientId: data.patientId }));
      setIsWalkInId(true);
    } catch (err) {
      alert('Failed to generate patient ID. Please try again.');
    } finally {
      setGeneratingPatientId(false);
    }
  };

  const handleGeneratePatientId = () => generateUniquePatientId();

  const filteredPatients = patients.filter(patient =>
    patient.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.personalInfo?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.personalInfo?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.personalInfo?.phone?.includes(searchTerm)
  );

  const handleSearchChange = (e) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);
    if (searchValue.trim()) {
      const matchedPatient = patients.find(p => p.patientId.toLowerCase() === searchValue.toLowerCase());
      if (matchedPatient) {
        setNewPatient({
          patientId: matchedPatient.patientId,
          firstName: matchedPatient.personalInfo?.firstName || '',
          lastName: matchedPatient.personalInfo?.lastName || '',
          email: matchedPatient.personalInfo?.email || '',
          phone: matchedPatient.personalInfo?.phone || '',
          dob: matchedPatient.personalInfo?.dateOfBirth ? new Date(matchedPatient.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
          gender: matchedPatient.personalInfo?.gender || '',
          address: matchedPatient.personalInfo?.address || ''
        });
        setSelectedPatient(matchedPatient);
      }
    }
  };

  const handleClearForm = () => {
    setNewPatient({ 
      patientId: '', firstName: '', lastName: '', email: '', phone: '', 
      dob: '', gender: '', address: '', chiefComplaint: '', maritalStatus: '', 
      pregnancyStatus: '' 
    });
    setInstitutionInfo({
      campDate: '', institutionName: '', institutionAddress: ''
    });
    setSearchTerm('');
    setIsWalkInId(false);
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setIsEditMode(false);
    setTimeout(() => {
      const detailsSection = document.querySelector('.patient-details');
      if (detailsSection) detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    try {
      const token = localStorage.getItem('token');
      const billingResponse = await fetch(buildApiUrl(`/api/billing/${patient.patientId}`), {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (billingResponse.ok) {
        const patientBilling = normalizeListResponse(await billingResponse.json()).filter(Boolean);
        setBillingRecords(prev => [...prev.filter(r => r?.patientId !== patient.patientId), ...patientBilling]);
      }
    } catch (err) {
      console.log('Billing endpoint not available:', err.message);
    }
  };

  const handleEditPatient = () => {
    if (!selectedPatient) return;
    setIsEditMode(true);
    setEditPatientData({
      firstName: selectedPatient.personalInfo?.firstName || '',
      lastName: selectedPatient.personalInfo?.lastName || '',
      email: selectedPatient.personalInfo?.email || '',
      phone: selectedPatient.personalInfo?.phone || '',
      dateOfBirth: selectedPatient.personalInfo?.dateOfBirth ? new Date(selectedPatient.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
      gender: selectedPatient.personalInfo?.gender || '',
      address: selectedPatient.personalInfo?.address || ''
    });
  };

  const handleCancelEdit = () => { setIsEditMode(false); setEditPatientData({}); };
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditPatientData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePatient = async () => {
    if (!selectedPatient) return;
    try {
      setUpdateLoading(true);
      const updatePayload = {
        personalInfo: {
          firstName: editPatientData.firstName.trim(),
          lastName: editPatientData.lastName.trim(),
          email: editPatientData.email.trim(),
          phone: editPatientData.phone.trim(),
          dateOfBirth: editPatientData.dateOfBirth || null,
          gender: editPatientData.gender || 'Other',
          address: editPatientData.address.trim()
        },
        updatedAt: new Date()
      };
      const response = await fetch(buildApiUrl(`/api/patient-details/by-patient-id/${selectedPatient.patientId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      if (!response.ok) throw new Error(`Failed to update patient: ${response.status}`);
      const result = await response.json();
      const updatedPatient = result.patient || result.data;
      setPatients(prev => prev.map(p => p.patientId === selectedPatient.patientId ? updatedPatient : p));
      setSelectedPatient(updatedPatient);
      setIsEditMode(false);
      setEditPatientData({});
      alert(`Patient ${selectedPatient.patientId} updated successfully!`);
    } catch (err) {
      alert(`Failed to update patient: ${err.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleNewPatientChange = (e) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({ ...prev, [name]: value }));
    if (name === 'patientId') {
      setIsWalkInId(false);
      if (value.trim().length >= 4) fetchSignupDetailsById(value.trim());
    }
  };

  const handleInstitutionChange = (e) => {
    const { name, value } = e.target;
    setInstitutionInfo(prev => ({ ...prev, [name]: value }));
  };

  const fetchSignupDetailsById = async (patientId) => {
    try {
      setFetchingSignupDetails(true);
      const res = await fetch(buildApiUrl(`/api/auth/patient-basic-details/${patientId}`));
      const data = await res.json();
      if (!res.ok || !data.success) return;
      const parts = (data.name || '').trim().split(' ');
      setNewPatient(prev => ({
        ...prev, patientId,
        firstName: prev.firstName || parts[0] || '',
        lastName: prev.lastName || parts.slice(1).join(' ') || '',
        email: prev.email || data.email || '',
        phone: prev.phone || data.phone || '',
      }));
    } catch (err) {
      console.error('Error fetching signup details:', err);
    } finally {
      setFetchingSignupDetails(false);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Validate required fields
      if (!newPatient.patientId || !newPatient.firstName || !newPatient.phone) {
        alert('Please fill in all required fields: Patient ID, Student Name, and Phone Number');
        return;
      }
      
      const existingPatient = patients.find(p => p.patientId === newPatient.patientId);
      if (existingPatient) { 
        alert(`Patient with ID ${newPatient.patientId} already exists.`); 
        return; 
      }
      
      // Calculate age from date of birth if provided
      let calculatedAge = null;
      if (newPatient.dob) {
        const birthDate = new Date(newPatient.dob);
        const today = new Date();
        calculatedAge = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      }
      
      const patientToAdd = {
        patientId: newPatient.patientId,
        personalInfo: {
          firstName: newPatient.firstName.trim(), 
          lastName: newPatient.lastName?.trim() || '', // lastName is optional for students
          email: newPatient.email?.trim() || '', 
          phone: newPatient.phone.trim(),
          dateOfBirth: newPatient.dob || null, 
          age: calculatedAge || null,
          gender: newPatient.gender || 'Male',
          maritalStatus: newPatient.maritalStatus || 'Single', 
          address: institutionInfo.institutionAddress?.trim() || '' // Use institution address as patient address
        },
        institutionInfo: {
          institutionName: institutionInfo.institutionName?.trim() || '',
          institutionAddress: institutionInfo.institutionAddress?.trim() || '',
          campDate: institutionInfo.campDate || null
        },
        medicalInfo: { 
          chiefComplaint: newPatient.chiefComplaint?.trim() || '', 
          pregnancyStatus: newPatient.pregnancyStatus || 'N/A' 
        },
        status: 'active', 
        walkIn: isWalkInId, 
        createAccount: true,
      };
      
      const response = await fetch(buildApiUrl('/api/patient-details'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientToAdd),
      });
      
      if (!response.ok) throw new Error(`Failed to create patient: ${response.status}`);
      
      const result = await response.json();
      const createdPatient = result.patient || result.data || patientToAdd;
      
      // Add to patients list so it appears in patient management
      setPatients(prev => [...prev, createdPatient]);
      
      // Clear the form
      handleClearForm();
      
      // Show success message
      const account = result.account || {};
      const summaryLines = [`Student added successfully with Patient ID: ${createdPatient.patientId}`];
      if (account.created) {
        summaryLines.push('', 'Patient login account created.', `Login ID: ${createdPatient.patientId}`, `Temporary Password: ${account.generatedPassword || '123456'}`, 'Student can log in with Patient ID and password.');
      } else if (account.linked) {
        summaryLines.push('', 'Existing patient login account linked to this registration.');
      }
      alert(summaryLines.join('\n'));
      
    } catch (err) {
      alert(`Failed to add student: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    alert('Payment processing functionality will be implemented with billing system.');
    setShowPaymentModal(false);
    setPaymentData({ amount: '', paymentMethod: 'cash', description: '' });
  };

  if (loading && patients.length === 0) {
    return (
      <div className="chief-layout admin-dashboard">
        <div className="loading">Loading camp dashboard...</div>
      </div>
    );
  }

  const selectedPatientBilling = selectedPatient
    ? billingRecords.filter((record) => record?.patientId === selectedPatient.patientId)
    : [];

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: '2-digit',
  });

  return (
    <div className="chief-layout admin-dashboard">
      <header className="chief-topbar">
        <div className="chief-topbar-left">
          <button type="button" className="chief-nav-toggle"
            aria-label={isSideNavOpen ? 'Collapse navigation' : 'Expand navigation'}
            title="Menu" onClick={() => setIsSideNavOpen((v) => !v)}>☰</button>
          <div className="chief-brand">
            <img className="chief-brand-logo" src="/images/logo.png" alt="Logo"
              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
            <div className="chief-brand-title">Camp Dashboard</div>
          </div>
        </div>
        <div className="chief-topbar-right">
          <div className="chief-topbar-date" style={{ marginRight: 16, color: '#fff', opacity: 0.9, fontSize: 13, fontWeight: 600 }}>
            {todayLabel}
          </div>
          <div className="user-profile-dropdown" ref={dropdownRef}>
            <div className="profile-button" onClick={toggleLogoutDropdown}>
              <div className="profile-avatar">{getInitials()}</div>
              <div className="profile-info">
                <span className="profile-name">{campName}</span>
                <span className="profile-email">{campEmail}</span>
              </div>
              <div className="profile-arrow">{showLogoutDropdown ? '▲' : '▼'}</div>
            </div>
            {showLogoutDropdown && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">{getInitials()}</div>
                  <div className="dropdown-user-info">
                    <div className="dropdown-name">{campName}</div>
                    {campId && <div className="dropdown-id">ID: {campId}</div>}
                    <div className="dropdown-email">{campEmail}</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-options">
                  <button className="dropdown-item" onClick={handleViewProfile} type="button">
                    <span className="dropdown-icon">👤</span><span>My Profile</span>
                  </button>
                  <button className="dropdown-item" onClick={handleChangePassword} type="button">
                    <span className="dropdown-icon">🔒</span><span>Forgot Password</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout" onClick={() => { setShowLogoutDropdown(false); handleLogout(); }} type="button">
                    <span className="dropdown-icon">🚪</span><span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="chief-body">
        {isSideNavOpen && (
          <aside className="chief-sidenav" aria-label="Camp navigation">
            <div className="chief-sidenav-section">
              <div className="chief-sidenav-title">Menu</div>
              <button type="button"
                className={`chief-nav-item ${activeTab === 'patientManagement' && showPatientRegistration ? 'active' : ''}`}
                onClick={() => { setActiveTab('patientManagement'); setShowPatientRegistration(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <span className="chief-nav-icon">🧍</span><span>Patient Registration</span>
              </button>
              <button type="button"
                className={`chief-nav-item ${activeTab === 'patientManagement' && !showPatientRegistration ? 'active' : ''}`}
                onClick={() => { setActiveTab('patientManagement'); setShowPatientRegistration(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <span className="chief-nav-icon">📋</span><span>Patient Management</span>
              </button>
              <button type="button"
                className={`chief-nav-item ${activeTab === 'billing' ? 'active' : ''}`}
                onClick={() => { setActiveTab('billing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <span className="chief-nav-icon">💳</span><span>Billing & Payments</span>
              </button>
              <button type="button" className="chief-nav-item" onClick={() => navigate('/doctor-schedule')}>
                <span className="chief-nav-icon">🗓️</span><span>Appointments</span>
              </button>
              <button type="button"
                className={`chief-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => { setActiveTab('reports'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <span className="chief-nav-icon">📊</span><span>Reports</span>
              </button>
            </div>
          </aside>
        )}

        <main className="chief-main">
          {error && (
            <div style={{ backgroundColor: 'rgba(248,215,218,0.9)', color: '#721c24', padding: '15px 20px', borderRadius: '8px', margin: '15px 20px', border: '1px solid rgba(245,198,203,0.9)', fontSize: '14px' }}>
              <strong>API Error:</strong> {error}
            </div>
          )}

          <div className="admin-content">
            <div className="main-content">

              {/* ── PATIENT MANAGEMENT TAB ── */}
              {activeTab === 'patientManagement' && !showPatientRegistration && (
                <div className="tab-content">
                  <h2>Patient Management</h2>
                  <div className="search-box">
                    <input type="text" placeholder="Search by Patient ID, Name or Phone" value={searchTerm} onChange={handleSearchChange} />
                    <small style={{ display: 'block', marginTop: '5px', color: '#e8c2c2ff', fontSize: '16px' }}>
                      Tip: Search by Patient ID to auto-populate form with existing patient data
                    </small>
                  </div>
                  <div className="patients-list">
                    <h3>Existing Patients ({filteredPatients.length})</h3>
                    <table>
                      <thead>
                        <tr><th>S.No</th><th>Patient ID</th><th>Name</th><th>Phone</th><th>Visit Date</th><th>Visit Time</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {filteredPatients.map((patient, index) => {
                          const campDate = patient.institutionInfo?.campDate ? new Date(patient.institutionInfo.campDate) : null;
                          const displayDate = campDate || new Date(patient.updatedAt || patient.createdAt);
                          return (
                            <tr key={patient._id} className={selectedPatient?._id === patient._id ? 'selected' : ''}>
                              <td>{index + 1}</td>
                              <td>{patient.patientId}</td>
                              <td>
                                {patient.personalInfo?.firstName || 'N/A'}
                                {patient.personalInfo?.lastName ? ` ${patient.personalInfo.lastName}` : ''}
                              </td>
                              <td>{patient.personalInfo?.phone || 'N/A'}</td>
                              <td>{displayDate.toLocaleDateString('en-IN')}</td>
                              <td>{displayDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td><button onClick={() => handleSelectPatient(patient)}>View Details</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="patient-details">
                    <h3>Patient Details</h3>
                    {selectedPatient ? (
                      <div className="details-card">
                        {!isEditMode ? (
                          <>
                            <div className="detail-row"><span className="label">Patient ID:</span><span className="value">{selectedPatient.patientId}</span></div>
                            <div className="detail-row">
                              <span className="label">Name:</span>
                              <span className="value">
                                {selectedPatient.personalInfo?.firstName}
                                {selectedPatient.personalInfo?.lastName ? ` ${selectedPatient.personalInfo.lastName}` : ''}
                              </span>
                            </div>
                            <div className="detail-row"><span className="label">Email:</span><span className="value">{selectedPatient.personalInfo?.email || 'N/A'}</span></div>
                            <div className="detail-row"><span className="label">Phone:</span><span className="value">{selectedPatient.personalInfo?.phone || 'N/A'}</span></div>
                            <div className="detail-row"><span className="label">Date of Birth:</span><span className="value">{selectedPatient.personalInfo?.dateOfBirth ? new Date(selectedPatient.personalInfo.dateOfBirth).toLocaleDateString() : 'N/A'}</span></div>
                            <div className="detail-row"><span className="label">Gender:</span><span className="value">{selectedPatient.personalInfo?.gender || 'N/A'}</span></div>
                            <div className="detail-row"><span className="label">Address:</span><span className="value">{(() => {
                              console.log('Patient Address Debug:', selectedPatient.personalInfo?.address);
                              console.log('Full Personal Info:', selectedPatient.personalInfo);
                              return selectedPatient.personalInfo?.address || 'N/A';
                            })()}</span></div>
                            <div className="detail-row"><span className="label">Institution Name:</span><span className="value">{(() => {
                              console.log('Institution Name Debug:', selectedPatient.institutionInfo?.institutionName);
                              console.log('Full Institution Info:', selectedPatient.institutionInfo);
                              return selectedPatient.institutionInfo?.institutionName || 'N/A';
                            })()}</span></div>
                            
                            {selectedPatientBilling.length > 0 && (
                              <div className="detail-row">
                                <span className="label">Recent Billing:</span>
                                <span className="value">{selectedPatientBilling.slice(0, 3).map(b => `${new Date(b.createdAt).toLocaleDateString()} - ₹${b.totalAmount}`).join(' | ')}</span>
                              </div>
                            )}
                            <div className="action-buttons">
                              <button className="btn-secondary" onClick={handleEditPatient}>Edit Details</button>
                            </div>
                          </>
                        ) : (
                          <div className="edit-form">
                            <h4 style={{ marginBottom: '15px', color: '#007bff' }}>Editing Patient: {selectedPatient.patientId}</h4>
                            <div className="form-row">
                              <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={editPatientData.firstName} onChange={handleEditInputChange} required /></div>
                              <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={editPatientData.lastName} onChange={handleEditInputChange} required /></div>
                            </div>
                            <div className="form-row">
                              <div className="form-group"><label>Email</label><input type="email" name="email" value={editPatientData.email} onChange={handleEditInputChange} /></div>
                              <div className="form-group"><label>Phone *</label><input type="tel" name="phone" value={editPatientData.phone} onChange={handleEditInputChange} required /></div>
                            </div>
                            <div className="form-row">
                              <div className="form-group"><label>Date of Birth</label><input type="date" name="dateOfBirth" value={editPatientData.dateOfBirth} onChange={handleEditInputChange} max={new Date().toISOString().split('T')[0]} /></div>
                              <div className="form-group"><label>Gender</label>
                                <select name="gender" value={editPatientData.gender} onChange={handleEditInputChange}>
                                  <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-group"><label>Address</label><textarea name="address" value={editPatientData.address} onChange={handleEditInputChange} rows="3"></textarea></div>
                            <div className="action-buttons" style={{ marginTop: '20px' }}>
                              <button className="btn-primary" onClick={handleUpdatePatient} disabled={updateLoading}>{updateLoading ? 'Updating...' : 'Save Changes'}</button>
                              <button className="btn-secondary" onClick={handleCancelEdit} disabled={updateLoading}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (<p>Select a patient to view details</p>)}
                  </div>
                </div>
              )}

              {/* ── PATIENT REGISTRATION TAB ── */}
              {activeTab === 'patientManagement' && showPatientRegistration && (
                <div className="tab-content">
                  <div className="create-patient">
                    {/* Header with tooth icon */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '30px' }}>
                      <div style={{ fontSize: '2.5rem' }}>🦷</div>
                      <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '600', color: '#ffffff' }}>Dental Camp Records</h2>
                    </div>

                    {/* Camp Information Section */}
                    <div style={{ 
                      background: 'rgba(173, 216, 230, 0.2)', 
                      borderRadius: '1rem', 
                      padding: '1.5rem', 
                      marginBottom: '2rem',
                      border: '1px solid rgba(173, 216, 230, 0.3)'
                    }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Date of Camp</label>
                          <input 
                            type="date" 
                            name="campDate"
                            value={institutionInfo.campDate}
                            onChange={handleInstitutionChange}
                            placeholder="dd-mm-yyyy"
                          />
                        </div>
                        <div className="form-group">
                          <label>Institution Name</label>
                          <input 
                            type="text" 
                            name="institutionName"
                            value={institutionInfo.institutionName}
                            onChange={handleInstitutionChange}
                            placeholder="School/College Name"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Institution Address</label>
                        <textarea 
                          name="institutionAddress"
                          value={institutionInfo.institutionAddress}
                          onChange={handleInstitutionChange}
                          rows="3"
                          placeholder="Enter complete institution address"
                        />
                      </div>
                    </div>

                    {/* Patient Registration Section */}
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      borderRadius: '1rem', 
                      padding: '2rem',
                      borderTop: '4px solid #ffffff'
                    }}>
                      <h3 style={{ 
                        textAlign: 'center', 
                        fontSize: '1.5rem', 
                        fontWeight: '600', 
                        color: '#ffffff', 
                        margin: '0 0 30px 0' 
                      }}>
                        Patient Registration
                      </h3>
                      
                      <form onSubmit={handleCreatePatient}>
                        <div className="form-row" style={{ alignItems: 'flex-start', display: 'flex', gap: '1rem' }}>
                          <div className="form-group" style={{ flex: '1' }}>
                            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Patient ID</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                              <input 
                                type="text" 
                                name="patientId" 
                                value={newPatient.patientId} 
                                onChange={handleNewPatientChange} 
                                required 
                                placeholder="C1000"
                                style={{ 
                                  flex: 1,
                                  padding: '0.8rem 1rem',
                                  fontSize: '1rem',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  outline: 'none',
                                  backgroundColor: '#f0f0f0',
                                  color: '#333',
                                  boxSizing: 'border-box',
                                  height: '3.2rem'
                                }}
                              />
                              <button 
                                type="button" 
                                onClick={handleGeneratePatientId} 
                                disabled={generatingPatientId}
                                style={{
                                  background: '#8e24aa',
                                  whiteSpace: 'nowrap',
                                  opacity: generatingPatientId ? 0.6 : 1,
                                  height: '3.2rem',
                                  padding: '0.8rem 1.2rem',
                                  fontSize: '1rem',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  color: 'white',
                                  cursor: generatingPatientId ? 'not-allowed' : 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                {generatingPatientId ? 'Generating...' : 'Generate ID'}
                              </button>
                            </div>
                          </div>
                          <div className="form-group" style={{ flex: '1' }}>
                            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Student Name</label>
                            <input 
                              type="text" 
                              name="firstName" 
                              value={newPatient.firstName} 
                              onChange={handleNewPatientChange} 
                              required 
                              placeholder="Enter student name"
                              style={{ 
                                width: '100%',
                                padding: '0.8rem 1rem',
                                fontSize: '1rem',
                                border: 'none',
                                borderRadius: '0.5rem',
                                outline: 'none',
                                backgroundColor: '#f0f0f0',
                                color: '#333',
                                boxSizing: 'border-box',
                                height: '3.2rem'
                              }}
                            />
                          </div>
                          <div className="form-group" style={{ flex: '0 0 200px' }}>
                            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Date of Birth</label>
                            <input 
                              type="date" 
                              name="dob"
                              value={newPatient.dob}
                              onChange={handleNewPatientChange}
                              max={new Date().toISOString().split('T')[0]}
                              style={{ 
                                width: '100%',
                                padding: '0.8rem 1rem',
                                fontSize: '1rem',
                                border: 'none',
                                borderRadius: '0.5rem',
                                outline: 'none',
                                backgroundColor: '#f0f0f0',
                                color: '#333',
                                boxSizing: 'border-box',
                                height: '3.2rem'
                              }}
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Gender</label>
                            <select 
                              name="gender" 
                              value={newPatient.gender || 'Male'} 
                              onChange={handleNewPatientChange}
                              style={{ 
                                width: '100%',
                                padding: '0.8rem 1rem',
                                fontSize: '1rem',
                                border: 'none',
                                borderRadius: '0.5rem',
                                outline: 'none',
                                backgroundColor: '#f0f0f0',
                                color: '#333',
                                boxSizing: 'border-box',
                                height: '3.2rem'
                              }}
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Phone Number</label>
                            <input 
                              type="tel" 
                              name="phone" 
                              value={newPatient.phone} 
                              onChange={handleNewPatientChange} 
                              required 
                              placeholder="Enter phone number"
                              style={{ 
                                width: '100%',
                                padding: '0.8rem 1rem',
                                fontSize: '1rem',
                                border: 'none',
                                borderRadius: '0.5rem',
                                outline: 'none',
                                backgroundColor: '#f0f0f0',
                                color: '#333',
                                boxSizing: 'border-box',
                                height: '3.2rem'
                              }}
                            />
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={loading || !newPatient.patientId}
                          className="btn-primary"
                          style={{
                            width: '100%',
                            background: loading || !newPatient.patientId ? '#ccc' : '#4caf50',
                            borderColor: loading || !newPatient.patientId ? '#ccc' : '#4caf50',
                            marginTop: '20px'
                          }}
                        >
                          {loading ? 'Adding...' : 'Add Student to List'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* ── BILLING TAB ── */}
              {activeTab === 'billing' && (
                <div className="tab-content">
                  <h2>Billing & Payments</h2>
                  <p style={{ marginBottom: 12 }}>Choose a billing type to open its full-page form.</p>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <button type="button" className="btn-primary" onClick={() => navigate('/admin-dashboard/billing/case')}>Case Sheet Billing</button>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/admin-dashboard/billing/xray')}>X-Ray Billing</button>
                  </div>
                </div>
              )}

              {/* ── REPORTS TAB ── */}
              {activeTab === 'reports' && (
                <div className="tab-content">
                  <h2>Reports</h2>
                  <h3>Today's Patient Statistics</h3>
                  {(() => {
                    const today = new Date();
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    const todayPatients = patients.filter(p => (p.createdAt ? p.createdAt.slice(0, 10) : '') === todayStr);
                    let male = todayPatients.filter(p => (p.personalInfo?.gender || p.gender)?.toLowerCase() === 'male').length;
                    let female = todayPatients.filter(p => (p.personalInfo?.gender || p.gender)?.toLowerCase() === 'female').length;
                    let others = todayPatients.filter(p => { const g = (p.personalInfo?.gender || p.gender)?.toLowerCase(); return g && g !== 'male' && g !== 'female'; }).length;
                    let newPatients = todayPatients.length;
                    let oldPatients = patients.length - newPatients;
                    if (todayVisitStats && todayVisitStats.success) {
                      male = todayVisitStats.malePatients ?? male;
                      female = todayVisitStats.femalePatients ?? female;
                      const visitedTotal = todayVisitStats.uniqueSeenCount ?? (todayVisitStats.newPatientsVisited || 0) + (todayVisitStats.oldPatientsVisited || 0);
                      others = Math.max(0, (visitedTotal || 0) - ((male || 0) + (female || 0)));
                      newPatients = todayVisitStats.newPatientsVisited ?? newPatients;
                      oldPatients = todayVisitStats.oldPatientsVisited ?? oldPatients;
                    }
                    return (
                      <>
                        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginTop: 16 }}>
                          <div className="stat-card"><strong>Male</strong><div>{male}</div></div>
                          <div className="stat-card"><strong>Female</strong><div>{female}</div></div>
                          <div className="stat-card"><strong>Others</strong><div>{others}</div></div>
                          <div className="stat-card"><strong>New Patients (Visited)</strong><div>{newPatients}</div></div>
                          <div className="stat-card"><strong>Old Patients (Visited)</strong><div>{oldPatients}</div></div>
                        </div>
                        <PieChartSection male={male} female={female} others={others} newPatients={newPatients} oldPatients={oldPatients} />
                      </>
                    );
                  })()}
                </div>
              )}

            </div>
          </div>

          {/* Payment Modal */}
          {showPaymentModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Process Payment</h3>
                <div className="modal-content">
                  <div className="form-group"><label>Amount</label><input type="number" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} /></div>
                  <div className="form-group"><label>Payment Method</label>
                    <select value={paymentData.paymentMethod} onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}>
                      <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Description</label><input type="text" value={paymentData.description} onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })} /></div>
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={processPayment}>Process Payment</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CampDashboard;
