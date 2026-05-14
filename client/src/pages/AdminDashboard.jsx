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



const AdminDashboard = () => {
  // State management
    const navigate = useNavigate();
    const { user, logout } = useAuth();

  const [isSideNavOpen, setIsSideNavOpen] = useState(true);
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const adminId = String(user?.id || localStorage.getItem('adminId') || '').trim();
  const adminName = String(user?.name || localStorage.getItem('name') || 'Admin').trim();
  const adminEmail = String(user?.email || localStorage.getItem('email') || '').trim();

  const getInitials = () => {
    const name = adminName || 'Admin';
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'A';
    const first = parts[0]?.[0] || 'A';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '';
    return `${first}${last}`.toUpperCase();
  };
  const [activeTab, setActiveTab] = useState('patientManagement');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPatient, setNewPatient] = useState({
    patientId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    chiefComplaint: '',
    maritalStatus: '',
    pregnancyStatus: ''
  });
  const [billingRecords, setBillingRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPatientId, setGeneratingPatientId] = useState(false);
  const [fetchingSignupDetails, setFetchingSignupDetails] = useState(false);
  const [isWalkInId, setIsWalkInId] = useState(false);

  // New state for edit functionality
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPatientData, setEditPatientData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showPatientRegistration, setShowPatientRegistration] = useState(false);
  const [todayVisitStats, setTodayVisitStats] = useState(null);

  // Chief complaints options
  const chiefComplaints = [
    "Pain/Toothache", "Dental Caries (Cavities)", "Sensitivity",
    "Gingivitis and Gum Problems", "Aesthetic Concerns", "Post-filling Complaints",
    "Missing Teeth/Tooth Replacement", "Routine Check-up/Cleaning", "Oral Ulcers",
    "Facial/Intra-oral Swelling", "Loose Teeth", "Bad Breath (Halitosis)",
    "Temporomandibular Joint (TMJ) Pain/Disorder", "Fractured Tooth", "Food Impaction"
  ];

  // Fetch data from backend on component mount
  useEffect(() => {
    fetchData();
  }, []);



  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/reports/today'));
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success) {
          setTodayVisitStats(data);
        }
      } catch (err) {
        console.error('Error fetching today visit stats:', err);
      }
    };

    fetchTodayStats();
  }, []);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLogoutDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching patients from API...');

      // First check if the API is reachable
      try {
        const testResponse = await fetch(buildApiUrl('/api/test'));
        const testData = await testResponse.json();
        console.log('Test API response:', testData);
      } catch (testError) {
        console.warn('Test API not available:', testError.message);
        throw new Error('Backend server is not responding. Please check API configuration and server status.');
      }

      // Fetch patients from the correct API endpoint
      const patientsResponse = await fetch(buildApiUrl('/api/patient-details'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Patients API response status:', patientsResponse.status);

      // Check if response is HTML (error page)
      const contentType = patientsResponse.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const htmlResponse = await patientsResponse.text();
        console.error('Received HTML instead of JSON:', htmlResponse.substring(0, 200));
        throw new Error('Server returned HTML page instead of JSON data. Check if API endpoint exists.');
      }

      if (!patientsResponse.ok) {
        const errorText = await patientsResponse.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch patients: ${patientsResponse.status} - ${errorText}`);
      }

      // Try to parse JSON response
      const patientsData = await patientsResponse.json();
      console.log('Patients API response data:', patientsData);

      // Handle different response structures
      let patientsList = [];
      if (patientsData.success && patientsData.patients) {
        patientsList = patientsData.patients;
      } else if (patientsData.success && patientsData.data) {
        patientsList = patientsData.data;
      } else if (Array.isArray(patientsData)) {
        patientsList = patientsData;
      } else {
        console.warn('Unexpected API response structure:', patientsData);
        patientsList = [];
      }

      setPatients(Array.isArray(patientsList) ? patientsList : []);
      console.log(`Successfully loaded ${patientsList.length} patients`);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);

      // Show mock data for development
      const mockPatients = [
        {
          _id: '1',
          patientId: 'P001',
          personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '9876543210',
            dateOfBirth: '1990-01-01',
            gender: 'Male',
            address: '123 Main St, City, State'
          },
          status: 'active',
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          patientId: 'P002',
          personalInfo: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '9876543211',
            dateOfBirth: '1985-05-15',
            gender: 'Female',
            address: '456 Oak St, City, State'
          },
          status: 'active',
          createdAt: new Date().toISOString()
        }
      ];

      setPatients(mockPatients);
      console.log('Using mock data due to API error');
    } finally {
      setLoading(false);
    }
  };



  const generateUniquePatientId = async () => {
    try {
      setGeneratingPatientId(true);
      // Ask backend for next ID so it stays in sync with signup
      const res = await fetch(buildApiUrl('/api/patient-details/next-id'));
      const data = await res.json();

      if (!res.ok || !data.success || !data.patientId) {
        throw new Error(data.message || 'Failed to generate patient ID');
      }

      const newPatientId = data.patientId;

      setNewPatient(prev => ({
        ...prev,
        patientId: newPatientId,
      }));

      // Mark this ID as a walk-in (system generated)
      setIsWalkInId(true);

      console.log(`Generated unique patient ID from backend: ${newPatientId}`);
    } catch (err) {
      console.error('Error generating patient ID:', err);
      alert('Failed to generate patient ID. Please try again.');
    } finally {
      setGeneratingPatientId(false);
    }
  };

  // Handle generate new patient ID button click
  const handleGeneratePatientId = () => {
    generateUniquePatientId();
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    patient.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.personalInfo?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.personalInfo?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.personalInfo?.phone?.includes(searchTerm)
  );

  // Handle search and auto-populate if patient exists
  const handleSearchChange = (e) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);

    // Only check against local patients data, no API calls
    if (searchValue.trim()) {
      const matchedPatient = patients.find(p =>
        p.patientId.toLowerCase() === searchValue.toLowerCase()
      );

      if (matchedPatient) {
        // Auto-populate the form with existing patient data
        setNewPatient({
          patientId: matchedPatient.patientId,
          firstName: matchedPatient.personalInfo?.firstName || '',
          lastName: matchedPatient.personalInfo?.lastName || '',
          email: matchedPatient.personalInfo?.email || '',
          phone: matchedPatient.personalInfo?.phone || '',
          dob: matchedPatient.personalInfo?.dateOfBirth ?
            new Date(matchedPatient.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
          gender: matchedPatient.personalInfo?.gender || '',
          address: matchedPatient.personalInfo?.address || ''
        });

        // Also select the patient in the details view
        setSelectedPatient(matchedPatient);

        console.log('Auto-populated form with existing patient:', matchedPatient.patientId);
      }
    }
  };

  // Clear form and generate new patient ID
  const handleClearForm = () => {
    setNewPatient({
      patientId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dob: '',
      gender: '',
      address: '',
      chiefComplaint: '',
      maritalStatus: '',
      pregnancyStatus: ''
    });
    setSearchTerm('');
    setIsWalkInId(false);
  };

  // Handle patient selection
  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setIsEditMode(false); // Reset edit mode when selecting a new patient
    console.log('Selected patient:', patient);

    // Scroll to patient details section
    setTimeout(() => {
      const detailsSection = document.querySelector('.patient-details');
      if (detailsSection) {
        detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    try {
      // Try to get patient's billing records (if endpoint exists)
      try {
        const token = localStorage.getItem('token');
        const billingResponse = await fetch(buildApiUrl(`/api/billing/${patient.patientId}`), {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (billingResponse.ok) {
          const patientBillingPayload = await billingResponse.json();
          const patientBilling = normalizeListResponse(patientBillingPayload).filter(Boolean);
          setBillingRecords(prev => [
            ...prev.filter(r => r?.patientId !== patient.patientId),
            ...patientBilling
          ]);
        }
      } catch (billingError) {
        console.log('Billing endpoint not available:', billingError.message);
      }

      // Try to get patient's prescriptions
      try {
        const prescriptionsResponse = await fetch(buildApiUrl(`/api/prescriptions/patient/${patient.patientId}`));
        if (prescriptionsResponse.ok) {
          const patientPrescriptionsPayload = await prescriptionsResponse.json();
          const patientPrescriptions = normalizeListResponse(patientPrescriptionsPayload).filter(Boolean);
          setPrescriptions(prev => [
            ...prev.filter(p => p?.patientId !== patient.patientId),
            ...patientPrescriptions
          ]);
        }
      } catch (prescError) {
        console.log('Prescriptions endpoint not fully available:', prescError.message);
      }
    } catch (err) {
      console.error('Error fetching patient details:', err);
    }
  };

  // Handle entering edit mode
  const handleEditPatient = () => {
    if (!selectedPatient) return;

    setIsEditMode(true);
    setEditPatientData({
      firstName: selectedPatient.personalInfo?.firstName || '',
      lastName: selectedPatient.personalInfo?.lastName || '',
      email: selectedPatient.personalInfo?.email || '',
      phone: selectedPatient.personalInfo?.phone || '',
      dateOfBirth: selectedPatient.personalInfo?.dateOfBirth ?
        new Date(selectedPatient.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
      gender: selectedPatient.personalInfo?.gender || '',
      address: selectedPatient.personalInfo?.address || ''
    });
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditPatientData({});
  };

  // Handle edit form input changes
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditPatientData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle updating patient details
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

      console.log('Updating patient:', selectedPatient.patientId, updatePayload);

      const response = await fetch(buildApiUrl(`/api/patient-details/by-patient-id/${selectedPatient.patientId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      console.log('Update patient response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update patient error:', errorText);
        throw new Error(`Failed to update patient: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Update patient success:', result);

      // Update the patient in local state
      const updatedPatient = result.patient || result.data;
      setPatients(prevPatients =>
        prevPatients.map(p =>
          p.patientId === selectedPatient.patientId ? updatedPatient : p
        )
      );

      // Update selected patient
      setSelectedPatient(updatedPatient);

      // Exit edit mode
      setIsEditMode(false);
      setEditPatientData({});

      alert(`Patient ${selectedPatient.patientId} updated successfully!`);

    } catch (err) {
      console.error('Error updating patient:', err);
      alert(`Failed to update patient: ${err.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Handle new patient form submission
  const handleCreatePatient = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Check if patient ID already exists
      const existingPatient = patients.find(p => p.patientId === newPatient.patientId);
      if (existingPatient) {
        alert(`Patient with ID ${newPatient.patientId} already exists. Please generate a new ID.`);
        return;
      }

      const patientToAdd = {
        patientId: newPatient.patientId,
        personalInfo: {
          firstName: newPatient.firstName.trim(),
          lastName: newPatient.lastName.trim(),
          email: newPatient.email.trim(),
          phone: newPatient.phone.trim(),
          dateOfBirth: newPatient.dob || null,
          gender: newPatient.gender || 'Other',
          maritalStatus: newPatient.maritalStatus || 'Single',
          address: newPatient.address.trim()
        },
        medicalInfo: {
          chiefComplaint: newPatient.chiefComplaint?.trim() || '',
          pregnancyStatus: newPatient.pregnancyStatus || 'N/A',
        },
        status: 'active',
        // Tell backend if this ID was generated as walk-in
        walkIn: isWalkInId,
        // Admin registration should create/login-link patient account as part of registration
        createAccount: true,
      };

      console.log('Creating patient with data:', patientToAdd);

      const response = await fetch(buildApiUrl('/api/patient-details'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientToAdd),
      });

      console.log('Create patient response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create patient error:', errorText);
        throw new Error(`Failed to create patient: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Create patient success:', result);

      // Add the new patient to the local state
      const createdPatient = result.patient || result.data || patientToAdd;
      setPatients(prevPatients => [...prevPatients, createdPatient]);

      // Clear form for next patient
      handleClearForm();

      const account = result.account || {};
      const summaryLines = [`Patient created successfully with ID: ${createdPatient.patientId}`];

      if (account.created) {
        summaryLines.push('');
        summaryLines.push('Patient login account created.');
        summaryLines.push(`Email: ${account.email || createdPatient?.personalInfo?.email || 'N/A'}`);
        summaryLines.push(`Login ID: ${createdPatient.patientId}`);
        summaryLines.push(`Temporary Password: ${account.generatedPassword || '123456'}`);
        summaryLines.push('Ask the patient to reset password after first login.');
      } else if (account.linked) {
        summaryLines.push('');
        summaryLines.push('Existing patient login account linked to this registration.');
      }

      alert(summaryLines.join('\n'));

    } catch (err) {
      console.error('Error creating patient:', err);
      alert(`Failed to create patient: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes for new patient form
  const handleNewPatientChange = (e) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({
      ...prev,
      [name]: value
    }));

    // If admin types a patientId, try to pull basic details from signup
    if (name === 'patientId') {
      // Any manual typing cancels walk-in flag
      setIsWalkInId(false);

      const trimmed = value.trim();
      if (trimmed.length >= 4) {
        fetchSignupDetailsById(trimmed);
      }
    }
  };

  // Fetch basic signup details (name, email, phone) by patient ID
  const fetchSignupDetailsById = async (patientId) => {
    try {
      setFetchingSignupDetails(true);

      const res = await fetch(buildApiUrl(`/api/auth/patient-basic-details/${patientId}`));
      const data = await res.json();

      if (!res.ok || !data.success) {
        return; // Silent fail; admin can still type manually
      }

      const fullName = data.name || '';
      let firstName = '';
      let lastName = '';

      if (fullName) {
        const parts = fullName.trim().split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }

      setNewPatient(prev => ({
        ...prev,
        patientId: patientId,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: prev.email || data.email || '',
        phone: prev.phone || data.phone || '',
      }));
    } catch (err) {
      console.error('Error fetching signup details for patient ID:', patientId, err);
    } finally {
      setFetchingSignupDetails(false);
    }
  };

  // Handle payment (placeholder function)
  const handlePayment = (billingRecord) => {
    setPaymentData({
      ...paymentData,
      amount: billingRecord.amount,
      description: `Payment for ${billingRecord.description}`
    });
    setShowPaymentModal(true);
  };

  // Process payment (placeholder function)
  const processPayment = async () => {
    try {
      // This would connect to your billing system
      alert('Payment processing functionality will be implemented with billing system.');
      setShowPaymentModal(false);
      setPaymentData({ amount: '', paymentMethod: 'cash', description: '' });
    } catch (err) {
      console.error('Error processing payment:', err);
      alert('Failed to process payment. Please try again.');
    }
  };

  

  if (loading && patients.length === 0) {
    return (
      <div className="chief-layout admin-dashboard">
        <div className="loading">Loading admin dashboard...</div>
      </div>
    );
  }

  const selectedPatientBilling = selectedPatient
    ? billingRecords.filter((record) => record?.patientId === selectedPatient.patientId)
    : [];

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });

  return (
    <div className="chief-layout admin-dashboard">
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
            <div className="chief-brand-title">Admin Dashboard</div>
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
                <span className="profile-name">{adminName}</span>
                <span className="profile-email">{adminEmail}</span>
              </div>
              <div className="profile-arrow">{showLogoutDropdown ? '▲' : '▼'}</div>
            </div>

            {showLogoutDropdown && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">{getInitials()}</div>
                  <div className="dropdown-user-info">
                    <div className="dropdown-name">{adminName}</div>
                    {adminId && <div className="dropdown-id">ID: {adminId}</div>}
                    <div className="dropdown-email">{adminEmail}</div>
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
                    <span>Forgot Password</span>
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
          <aside className="chief-sidenav" aria-label="Admin navigation">
            <div className="chief-sidenav-section">
              <div className="chief-sidenav-title">Menu</div>

              <button
                type="button"
                className={`chief-nav-item ${activeTab === 'patientManagement' && showPatientRegistration ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('patientManagement');
                  setShowPatientRegistration(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">🧍</span>
                <span>Patient Registration</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeTab === 'patientManagement' && !showPatientRegistration ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('patientManagement');
                  setShowPatientRegistration(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">📋</span>
                <span>Patient Management</span>
              </button>

              <button
                type="button"
                className={`chief-nav-item ${activeTab === 'billing' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('billing');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="chief-nav-icon">💳</span>
                <span>Billing & Payments</span>
              </button>

              <button
                type="button"
                className="chief-nav-item"
                onClick={() => navigate('/doctor-schedule')}
              >
                <span className="chief-nav-icon">🗓️</span>
                <span>Appointments</span>
              </button>
            </div>

          </aside>
        )}

        <main className="chief-main">
          {error && (
            <div style={{
              backgroundColor: 'rgba(248, 215, 218, 0.9)',
              color: '#721c24',
              padding: '15px 20px',
              borderRadius: '8px',
              margin: '15px 20px',
              border: '1px solid rgba(245, 198, 203, 0.9)',
              fontSize: '14px'
            }}>
              <strong>API Error:</strong> {error}
              <br />
              <small>Using mock data for demonstration. Please check your backend connection.</small>
            </div>
          )}

          <div className="admin-content">
            <div className="main-content">
          {activeTab === 'patientManagement' && !showPatientRegistration && (
            <div className="tab-content">
              <h2>Patient Management</h2>

              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search by Patient ID, Name or Phone (auto-populates if patient exists)"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#e8c2c2ff', fontSize: '16px' }}>
                  Tip: Search by Patient ID to auto-populate form with existing patient data
                </small>
              </div>

              <div className="patients-list">
                <h3>Existing Patients ({filteredPatients.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Patient ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Visit Date</th>
                      <th>Visit Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((patient, index) => {
                      const lastVisit = new Date(patient.updatedAt || patient.createdAt);
                      const visitDate = lastVisit.toLocaleDateString('en-IN');
                      const visitTime = lastVisit.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                      <tr key={patient._id} className={selectedPatient?._id === patient._id ? 'selected' : ''}>
                        <td>{index + 1}</td>
                        <td>{patient.patientId}</td>
                        <td>{patient.personalInfo?.firstName || 'N/A'} {patient.personalInfo?.lastName || ''}</td>
                        <td>{patient.personalInfo?.phone || 'N/A'}</td>
                                                <td>{visitDate}</td>
                                                <td>{visitTime}</td>
                        <td>
                          <button onClick={() => handleSelectPatient(patient)}>
                            View Details
                          </button>
                        </td>
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
                      // View Mode
                      <>
                        <div className="detail-row">
                          <span className="label">Patient ID:</span>
                          <span className="value">{selectedPatient.patientId}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Name:</span>
                          <span className="value">{selectedPatient.personalInfo?.firstName} {selectedPatient.personalInfo?.lastName}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Email:</span>
                          <span className="value">{selectedPatient.personalInfo?.email || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Phone:</span>
                          <span className="value">{selectedPatient.personalInfo?.phone || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Date of Birth:</span>
                          <span className="value">{selectedPatient.personalInfo?.dateOfBirth ? new Date(selectedPatient.personalInfo.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Gender:</span>
                          <span className="value">{selectedPatient.personalInfo?.gender || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Address:</span>
                          <span className="value">{selectedPatient.personalInfo?.address || 'N/A'}</span>
                        </div>

                        {selectedPatientBilling.length > 0 && (
                          <div className="detail-row">
                            <span className="label">Recent Billing:</span>
                            <span className="value">
                              {selectedPatientBilling
                                .slice(0, 3)
                                .map(b => `${new Date(b.createdAt).toLocaleDateString()} - ₹${b.totalAmount}`)
                                .join(' | ')}
                            </span>
                          </div>
                        )}

                        <div className="action-buttons">
                          <button
                            className="btn-secondary"
                            onClick={handleEditPatient}
                          >
                            Edit Details
                          </button>
                        </div>
                      </>
                    ) : (
                      // Edit Mode
                      <>
                        <div className="edit-form">
                          <h4 style={{ marginBottom: '15px', color: '#007bff' }}>
                            Editing Patient: {selectedPatient.patientId}
                          </h4>

                          <div className="form-row">
                            <div className="form-group">
                              <label>First Name *</label>
                              <input
                                type="text"
                                name="firstName"
                                value={editPatientData.firstName}
                                onChange={handleEditInputChange}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Last Name *</label>
                              <input
                                type="text"
                                name="lastName"
                                value={editPatientData.lastName}
                                onChange={handleEditInputChange}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Email</label>
                              <input
                                type="email"
                                name="email"
                                value={editPatientData.email}
                                onChange={handleEditInputChange}
                              />
                            </div>
                            <div className="form-group">
                              <label>Phone *</label>
                              <input
                                type="tel"
                                name="phone"
                                value={editPatientData.phone}
                                onChange={handleEditInputChange}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label>Date of Birth</label>
                              <input
                                type="date"
                                name="dateOfBirth"
                                value={editPatientData.dateOfBirth}
                                onChange={handleEditInputChange}
                                max={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div className="form-group">
                              <label>Gender</label>
                              <select
                                name="gender"
                                value={editPatientData.gender}
                                onChange={handleEditInputChange}
                              >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Address</label>
                            <textarea
                              name="address"
                              value={editPatientData.address}
                              onChange={handleEditInputChange}
                              rows="3"
                            ></textarea>
                          </div>

                          <div className="action-buttons" style={{ marginTop: '20px' }}>
                            <button
                              className="btn-primary"
                              onClick={handleUpdatePatient}
                              disabled={updateLoading}
                            >
                              {updateLoading ? 'Updating...' : 'Save Changes'}
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={handleCancelEdit}
                              disabled={updateLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p>Select a patient to view details</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'patientManagement' && showPatientRegistration && (
            <div className="tab-content">
              <h2>Patient Registration</h2>

              <div className="create-patient">
                <h3>Patient Registration</h3>
                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleGeneratePatientId}
                    disabled={generatingPatientId}
                    className="btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {generatingPatientId ? '🔄 Generating...' : '🔄 Create New Patient ID '}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                  >
                    Clear Form
                  </button>
                  <small style={{ color: '#e8c2c2ff', fontSize: '16px' }}>
                    Enter the Patient ID given at first appointment, or generate a new one for walk-in patients.
                  </small>
                </div>

                <div style={{
                  background: '#1e3a2f',
                  border: '1px solid #2e6b4f',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#a8d5b5'
                }}>
                  🔑 <strong>Default Login Password:</strong> <span style={{ fontFamily: 'monospace', fontSize: '16px', color: '#fff' }}>123456</span>
                  &nbsp;— The patient can log in with their Patient ID and this password after registration.
                </div>

                <form onSubmit={handleCreatePatient}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Patient ID *</label>
                      <input
                        type="text"
                        name="patientId"
                        value={newPatient.patientId}
                        onChange={handleNewPatientChange}
                        required
                        placeholder="Enter or generate Patient ID"
                      />
                      <small style={{ color: '#e8c2c2ff', fontSize: '16px' }}>
                        Must match the Patient ID shared with the patient after appointment.
                      </small>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={newPatient.firstName}
                        onChange={handleNewPatientChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={newPatient.lastName}
                        onChange={handleNewPatientChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={newPatient.email}
                        onChange={handleNewPatientChange}
                        required
                      />
                      <small style={{ color: '#e8c2c2ff', fontSize: '16px' }}>
                        Account credentials will be created for this email during registration.
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={newPatient.phone}
                        onChange={handleNewPatientChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        name="dob"
                        value={newPatient.dob}
                        onChange={handleNewPatientChange}
                        max={new Date().toISOString().split('T')[0]}
                        className="date-input-black-icon"
                      />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select
                        name="gender"
                        value={newPatient.gender}
                        onChange={handleNewPatientChange}
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={newPatient.address}
                      onChange={handleNewPatientChange}
                      rows="3"
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label>Chief Complaint</label>
                    <select
                      name="chiefComplaint"
                      value={newPatient.chiefComplaint}
                      onChange={handleNewPatientChange}
                    >
                      <option value="">Select a primary issue</option>
                      {chiefComplaints.map((complaint) => (
                        <option key={complaint} value={complaint}>{complaint}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Marital Status <span style={{ color: "red" }}>*</span></label>
                    <div className="radio-options">
                      {['Single', 'Married'].map((status) => (
                        <label key={status} className="radio-option">
                          <input
                            type="radio"
                            name="maritalStatus"
                            value={status}
                            checked={newPatient.maritalStatus === status}
                            onChange={handleNewPatientChange}
                          />
                          <span>{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Pregnancy Status (if applicable)</label>
                    <div className="radio-options">
                      {['No', 'Yes', 'N/A'].map((status) => (
                        <label key={status} className="radio-option">
                          <input
                            type="radio"
                            name="pregnancyStatus"
                            value={status}
                            checked={newPatient.pregnancyStatus === status}
                            onChange={handleNewPatientChange}
                          />
                          <span>{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading || !newPatient.patientId}
                  >
                    {loading ? 'Creating...' : 'Save'}
                  </button>
                </form>
              </div>
            </div>
          )}

         {activeTab === 'billing' && (
           <div className="tab-content">
             <h2>Billing & Payments</h2>

             <p style={{ marginBottom: 12 }}>
               Choose a billing type to open its full-page form.
             </p>

             <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
               <button
                 type="button"
                 className="btn-primary"
                 onClick={() => navigate('/admin-dashboard/billing/case')}
               >
                 Case Sheet Billing
               </button>
               <button
                 type="button"
                 className="btn-secondary"
                 onClick={() => navigate('/admin-dashboard/billing/xray')}
               >
                 X-Ray Billing
               </button>
             </div>
           </div>
         )}


          {activeTab === 'reports' && (
            <div className="tab-content">
              <h2>Reports</h2>
              <h3>Today's Patient Statistics</h3>
              {(() => {
                // Default fallback based on registrations if API not available
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayStr = `${yyyy}-${mm}-${dd}`;

                const todayPatients = patients.filter(p => {
                  const regDate = p.createdAt ? p.createdAt.slice(0, 10) : '';
                  return regDate === todayStr;
                });

                let male = todayPatients.filter(p => (p.personalInfo?.gender || p.gender)?.toLowerCase() === 'male').length;
                let female = todayPatients.filter(p => (p.personalInfo?.gender || p.gender)?.toLowerCase() === 'female').length;
                let others = todayPatients.filter(p => {
                  const g = (p.personalInfo?.gender || p.gender)?.toLowerCase();
                  return g && g !== 'male' && g !== 'female';
                }).length;
                let newPatients = todayPatients.length;
                let oldPatients = patients.length - newPatients;

                // If backend today-visit stats are available, prefer those (visited today)
                if (todayVisitStats && todayVisitStats.success) {
                  male = todayVisitStats.malePatients ?? male;
                  female = todayVisitStats.femalePatients ?? female;
                  const visitedTotal = todayVisitStats.uniqueSeenCount ?? (todayVisitStats.newPatientsVisited || 0) + (todayVisitStats.oldPatientsVisited || 0);
                  const knownGender = (male || 0) + (female || 0);
                  others = Math.max(0, (visitedTotal || 0) - knownGender);
                  newPatients = todayVisitStats.newPatientsVisited ?? newPatients;
                  oldPatients = todayVisitStats.oldPatientsVisited ?? oldPatients;
                }

                return (
                  <>
                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginTop: 16 }}>
                      <div className="stat-card">
                        <strong>Male</strong>
                        <div>{male}</div>
                      </div>
                      <div className="stat-card">
                        <strong>Female</strong>
                        <div>{female}</div>
                      </div>
                      <div className="stat-card">
                        <strong>Others</strong>
                        <div>{others}</div>
                      </div>
                      <div className="stat-card">
                        <strong>New Patients (Visited)</strong>
                        <div>{newPatients}</div>
                      </div>
                      <div className="stat-card">
                        <strong>Old Patients (Visited)</strong>
                        <div>{oldPatients}</div>
                      </div>
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
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={paymentData.description}
                  onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={processPayment}>
                Process Payment
              </button>
            </div>
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
