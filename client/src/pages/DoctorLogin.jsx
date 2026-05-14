import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './context/AuthContext'; 
import './Login.css';

const DoctorLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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
      showMessage('Please enter both ID/Email and Password.', 'error');
      return;
    }

    setIsLoading(true);
    clearMessage();

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login/doctorlogin', {
        identifier,
        password,
      });
      
      if (res.status === 200) {
        const rawRole = String(res.data.role || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
        const effectiveRole = rawRole === 'chief' ? 'chief-doctor' : rawRole;

        // Always trust role from server (prevents client-side role spoofing)
        if (effectiveRole !== 'doctor' && effectiveRole !== 'chief-doctor' && effectiveRole !== 'pg' && effectiveRole !== 'ug') {
          showMessage('Access denied. Not a doctor/PG/UG account.', 'error');
          return;
        }

        // Store Identity and name in localStorage
        if (effectiveRole === 'pg') {
          localStorage.setItem('pgId', res.data.Identity);
          localStorage.setItem('pgName', res.data.name);
          localStorage.setItem('pgEmail', res.data.email || '');
          localStorage.setItem('pgDepartment', res.data.department || '');
          localStorage.setItem('doctorId', res.data.Identity);
          localStorage.setItem('doctorName', res.data.name);
          localStorage.setItem('doctorEmail', res.data.email || '');
          localStorage.setItem('doctorDepartment', res.data.department || '');
        } else if (effectiveRole === 'ug') {
          localStorage.setItem('ugId', res.data.Identity);
          localStorage.setItem('ugName', res.data.name);
          localStorage.setItem('ugEmail', res.data.email || '');
          localStorage.setItem('ugDepartment', res.data.department || '');
        } else {
          localStorage.setItem('doctorId', res.data.Identity);
          localStorage.setItem('doctorName', res.data.name);
          localStorage.setItem('doctorEmail', res.data.email || '');
          localStorage.setItem('doctorDepartment', res.data.department || '');
        }

        // Use the context login function
        login({
          token: res.data.token,
          name: res.data.name,
          Identity: res.data.Identity,
          role: effectiveRole,
          email: res.data.email || '',
          department: res.data.department || '',
        });

        if (effectiveRole === 'pg') {
          navigate('/pg-dashboard', { replace: true });
        } else if (effectiveRole === 'ug') {
          navigate('/ug-dashboard', { replace: true });
        } else if (effectiveRole === 'doctor') {
          navigate('/doctor-dashboard', { replace: true });
        } else {
          navigate('/chief-doctor-dashboard', { replace: true });
        }
      }
    } catch (err) {
      console.error('Login error:', err.response?.data);
      const serverMessage = err.response?.data?.message;
      
      // Handle specific error cases with explicit messages
      if (err.response?.status === 404) {
        showMessage('Account not found. Please check your credentials.');
      } else if (err.response?.status === 401) {
        showMessage(serverMessage || 'Incorrect password. Please try again or use "Forgot Password" to reset.');
      } else if (err.response?.status === 400) {
        showMessage(serverMessage || 'Invalid request. Please check your input and try again.');
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
        <center><img src="/images/logo.png" alt="SRM Logo" className="logo" /></center>
        <div className="college-name">SRM DENTAL COLLEGE</div>
        <h2>Doctor Login</h2>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Doctor ID / Email ID"
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

export default DoctorLogin;
