import React, { useEffect } from 'react';
import dentalLogo from '/public/logo.png';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './PatientDashboard.css';

export default function PatientDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const patientName = localStorage.getItem("patientName");
  const patientId = localStorage.getItem("patientId");

  // Redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/patient-login', { replace: true });
    }
  }, [navigate]);

  const handleNavigation = (route) => {
    console.log(`Navigating to: ${route}`);
    navigate(route);
  };

  const handleLogout = () => {
    logout();
    navigate('/patient-login', { replace: true });
  };

  return (
    <div className="patient-dashboard">
      <div className="dental-hub-container">
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
        <div className="logo-box-user">
          <img src={dentalLogo} alt="Clinic Logo" className="logo-img-user" />
        </div>
        <h1>Welcome to SRM Dental Clinic, {patientName || "Patient"}</h1>
        <p style={{ margin: "1rem 0" }} className="patient-id">Patient ID: {patientId || "N/A"}</p>

        <button onClick={() => handleNavigation('/my-appointments')}>
          My Appointments
        </button>

        <button onClick={() => handleNavigation('/update-patient')}>
          Update My Details
        </button>

        <button onClick={() => handleNavigation('/my-prescriptions')}>
          My Prescriptions
        </button>

        <button onClick={() => handleNavigation('/slot-booking')}>
          Book My Appointment
        </button>
      </div>
    </div>
  );
}