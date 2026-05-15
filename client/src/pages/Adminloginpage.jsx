import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import './Login.css';

const AdminLogin = () => {
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
      const res = await axios.post('http://localhost:5000/api/auth/login/adminlogin', {
        identifier,
        password,
      });
      
      if (res.status === 200) {
        // Use the context login function
        login({
          token: res.data.token,
          name: res.data.name,
          Identity: res.data.Identity,
          role: res.data.role,
          email: res.data.email || '',
        });

        const role = String(res.data.role || '').trim().toLowerCase();
        if (role === 'c') {
          navigate('/camp-dashboard', { replace: true });
        } else {
          navigate('/admin-dashboard', { replace: true });
        }
      }
    } catch (err) {
      console.error('Login error:', err.response?.data);
      
      // Handle specific error cases with explicit messages
      if (err.response?.status === 404) {
        showMessage('Account not found. Please check your credentials.');
      } else if (err.response?.status === 403) {
        showMessage('Access denied. Not an admin/PHC/Camp account.');
      } else if (err.response?.status === 401) {
        showMessage(err.response?.data?.message || 'Invalid password. Please try again.');
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
    <>
      <div className="login-page">
        <div className="login-box">
          <center><img src="/images/logo.png" alt="SRM Logo" className="logo" /></center>
          <div className="college-name">SRM DENTAL COLLEGE</div>
          <h2>Admin Login</h2>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input
                type="text"
                placeholder="Admin ID / Email ID"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                id="password"
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

            <button type="submit" className="button" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <div className="signup-link">

            </div>
          </form>
        </div>
      </div>

      {message && (
        <div className={`message-box ${messageType}`}>
          <p>{message}</p>
          <button onClick={clearMessage}>OK</button>
        </div>
      )}
    </>
  );
};

export default AdminLogin;
