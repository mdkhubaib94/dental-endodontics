import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import { API_BASE_URL } from '../config/api';
import './Login.css';

const PatientLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); 

  // Redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = (localStorage.getItem('role') || '').toLowerCase();
    const patientId = localStorage.getItem('patientId');

    // Only auto-redirect if the existing session is actually a patient session.
    if (token && role === 'patient' && patientId) {
      navigate('/patient-dashboard', { replace: true });
      return;
    }

    // If a different role is logged in (doctor/admin), clear it so the user can switch.
    if (token && role && role !== 'patient') {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('doctorName');
      localStorage.removeItem('doctorId');
      localStorage.removeItem('doctorEmail');
      localStorage.removeItem('adminName');
      localStorage.removeItem('adminId');
      // Keep patient fields (if any) to avoid accidental loss.
    }
  }, [navigate]);

  const handleTogglePassword = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const showMessage = (msg, type = 'error') => {
    setMessage(msg);
    setMessageType(type);
  };

  const clearMessage = () => {
    setMessage('');
    setMessageType('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (identifier.trim() === '' || password.trim() === '') {
      showMessage('Please enter both Patient ID/Phone and Password.', 'error');
      return;
    }

    setIsLoading(true);
    clearMessage();

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login/patientlogin`, {
        identifier,
        password,
      });

      if (res.data.role.toLowerCase() === 'patient') {
        login({
          token: res.data.token,
          name: res.data.name,
          Identity: res.data.Identity,
          role: res.data.role
        });

        navigate('/patient-dashboard', { replace: true });
      } else {
        showMessage('Access denied. You are not registered as a patient.', 'error');
      }
    } catch (err) {
      console.error('Login error:', err.response?.data);
      // Handle specific error cases with explicit messages
      if (err.response?.status === 404) {
        showMessage('Account not found. Please check your Patient ID/Phone number or sign up for a new account.');
      } else if (err.response?.status === 401) {
        showMessage('Incorrect password. Please try again or use "Forgot Password" to reset.');
      } else if (err.response?.status === 400) {
        showMessage('Invalid request. Please check your input and try again.');
      } else if (err.code === 'ECONNREFUSED') {
        showMessage('Cannot connect to server. Please check your internet connection or try again later.');
      } else if (err.response?.data?.message) {
        showMessage(`${err.response.data.message}`);
      } else {
        showMessage('Server error. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <center>
          <img src="/images/logo.png" alt="SRM Logo" className="logo" />
        </center>
        <div className="college-name">SRM DENTAL COLLEGE</div>
        <h2>Patient Login</h2>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Patient ID / Phone (e.g. U0002 or 9876543210)"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <input
              type={isPasswordVisible ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <a
              href="#"
              className="toggle-password"
              role="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                if (!isLoading) handleTogglePassword();
              }}
              aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              aria-pressed={isPasswordVisible}
            >
              {isPasswordVisible ? 'Hide' : 'Show'}
            </a>
          </div>

          <div className="forgot-password-link">
            <a href="/reset-password">Forgot Password?</a>
          </div>

          <button 
            type="submit" 
            className="button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          <div className="signup-link">
            Don't have an account? <a href="/signup?role=patient">Sign Up</a>
          </div>
        </form>
      </div>

      {message && (
        <div className={`message-box ${messageType}`}>
          <p>{message}</p>
          <button onClick={clearMessage}>OK</button>
        </div>
      )}
    </div>
  );
};

export default PatientLogin;
