import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.css';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const ForgetPassword = () => {
  const navigate = useNavigate();
  const [otpVerified, setOtpVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordHint, setPasswordHint] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpMethod, setOtpMethod] = useState('email');

  useEffect(() => {
    const localEmail =
      String(
        localStorage.getItem('doctorEmail') ||
        localStorage.getItem('pgEmail') ||
        localStorage.getItem('adminEmail') ||
        ''
      ).trim();

    const localPhone =
      String(
        localStorage.getItem('doctorPhone') ||
        localStorage.getItem('pgPhone') ||
        localStorage.getItem('adminPhone') ||
        localStorage.getItem('patientPhone') ||
        ''
      ).trim();

    if (localEmail) {
      setEmail(localEmail);
      setEmailError(validateEmail(localEmail));
    }

    if (localPhone) {
      setPhone(localPhone);
      setPhoneError(validatePhone(localPhone));
      if (!localEmail) setOtpMethod('phone');
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchContact = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me/contact`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        const contact = data?.contact || {};
        const fetchedEmail = String(contact.email || '').trim();
        const fetchedPhone = String(contact.phone || '').trim();

        if (fetchedEmail) {
          setEmail(fetchedEmail);
          setEmailError(validateEmail(fetchedEmail));
        }

        if (fetchedPhone) {
          setPhone(fetchedPhone);
          setPhoneError(validatePhone(fetchedPhone));
          if (!fetchedEmail) setOtpMethod('phone');
        }
      } catch {
        // Keep manual entry as fallback.
      }
    };

    fetchContact();
  }, []);


  const togglePassword = (which) => {
    if (which === 'password') {
      setIsPasswordVisible((prev) => !prev);
      return;
    }
    if (which === 'confirmPassword') {
      setIsConfirmPasswordVisible((prev) => !prev);
    }
  };

  const showMessageBox = (msg) => {
    setMessage(msg);
    setShowMessage(true);
  };

  const hideMessageBox = () => setShowMessage(false);

  // Handle email/phone validation
  const handleEmailChange = (e) => {
    const nextEmail = e.target.value.trim();
    setEmail(nextEmail);
    setEmailError(nextEmail ? validateEmail(nextEmail) : '');
  };

  const handlePhoneChange = (e) => {
    const nextPhone = e.target.value.trim();
    setPhone(nextPhone);
    setPhoneError(nextPhone ? validatePhone(nextPhone) : '');
  };

  // Password strength
  const handlePasswordChange = (e) => {
    const password = e.target.value;
    const { strength, hint } = calculatePasswordStrength(password);
    setPasswordStrength(strength);
    setPasswordHint(hint);
  };

  const getStrengthClass = (strength) => {
    switch (strength) {
      case 1: return 'strength-weak';
      case 2: return 'strength-fair';
      case 3: return 'strength-good';
      case 4: return 'strength-strong';
      case 5: return 'strength-excellent';
      default: return '';
    }
  };

    // Send OTP - FIXED: Remove placeholder name
  const sendOTP = async () => {
    const method = otpMethod;

    const errors = [];
    if (method === 'email' && !email) errors.push('Please enter your email.');
    if (method === 'phone' && !phone) errors.push('Please enter your phone number.');

    if (errors.length > 0) {
      showMessageBox(errors.join('\n'));
      return;
    }

    setIsSendingOtp(true);
    setOtpVerified(false);
    setOtpError('');
    setOtp('');

    try {
      const requestData = { 
        method,
        type: 'forgot-password'
      };
      
      if (method === 'email') requestData.email = email;
      if (method === 'phone') requestData.phone = phone;

      const res = await axios.post(`${API_BASE_URL}/api/otp/send-otp`, requestData);

      if (res.data.success) {
        showMessageBox(`✅ OTP sent to your ${method}`);
      } else {
        showMessageBox(`❌ ${res.data.message || 'Failed to send OTP'}`);
      }
    } catch (err) {
      console.error('OTP send error:', err);
      if (err.response?.status === 400) {
        showMessageBox(`❌ ${err.response.data.message || 'Failed to send OTP'}`);
      } else {
        showMessageBox('❌ Error sending OTP. Please try again.');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (e) => {
    let value = e.target.value;
    // Only allow digits
    value = value.replace(/[^0-9]/g, '');
    // Limit to 6 digits
    value = value.slice(0, 6);
    setOtp(value);
    // Clear error when user starts typing
    if (value.length > 0) {
      setOtpError('');
    }
  };

  // Verify OTP - FIXED00
  const verifyOTP = async () => {
    const method = otpMethod;

    if (!otp || otp.length !== 6) {
      setOtpError('OTP must be 6 digits');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/otp/verify-otp`, {
        otp,
        method,
        email: method === 'email' ? email : undefined,
        phone: method === 'phone' ? phone : undefined,
      });

      if (res.data.success) {
        setOtpVerified(true);
        setOtpError('');
        showMessageBox('✅ OTP verified successfully!');
      } else {
        setOtpVerified(false);
        setOtpError(res.data.message || 'Invalid OTP');
        showMessageBox(`❌ ${res.data.message || 'Invalid OTP'}`);
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      setOtpError('❌ Failed to verify OTP');
      showMessageBox('❌ Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Reset password - FIXED
    // Reset password - FIXED
  const resetPassword = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const resolvedEmail = email.trim();
    const resolvedPhone = phone.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const method = otpMethod;

    if (!otpVerified) {
      showMessageBox('Please verify OTP first.');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      showMessageBox('❌ Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    // Simple password validation - only check minimum length
    if (password.length < 6) {
      showMessageBox('❌ Password must be at least 6 characters long.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Call the password reset API with only the relevant identifier
      const resetData = {
        password,
        [method]: method === 'email' ? resolvedEmail : resolvedPhone
      };

      const res = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, resetData);

      if (res.data.success) {
        showMessageBox('✅ Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        showMessageBox(`❌ ${res.data.message || 'Password reset failed'}`);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      showMessageBox('❌ Server error during password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="signup-body">
      <div className="signup-box">
        <center><img src="logo.png" alt="SRM Logo" className="logo" /></center>
        <div className="college-name">SRM DENTAL COLLEGE</div>
        <h2>Reset Password</h2>

        <form onSubmit={(e) => e.preventDefault()}>
          {/* Email / Phone */}
          <div className="input-group-sign">
            <input
              type="email"
              id="email"
              placeholder="Email ID"
              value={email}
              onChange={handleEmailChange}
              readOnly
              aria-readonly="true"
            />
            {emailError && <div className="error-message">{emailError}</div>}
          </div>

          <div className="input-group-sign">
            <input
              type="tel"
              id="phone"
              placeholder="Phone Number"
              value={phone}
              onChange={handlePhoneChange}
              readOnly
              aria-readonly="true"
            />
            {phoneError && <div className="error-message">{phoneError}</div>}
          </div>

          {/* OTP Method Selection */}
          <div className="checkbox-group">
            <label>
              <input
                type="radio"
                name="otpMethod"
                value="email"
                checked={otpMethod === 'email'}
                onChange={(e) => setOtpMethod(e.target.value)}
              />
              {' '}Email
            </label>
            <label>
              <input
                type="radio"
                name="otpMethod"
                value="phone"
                checked={otpMethod === 'phone'}
                onChange={(e) => setOtpMethod(e.target.value)}
              />
              {' '}Phone
            </label>
          </div>

          {/* OTP Input */}
          <div className="input-group-sign otp-container">
            <button type="button" className="button send-otp-btn" onClick={sendOTP} disabled={isSendingOtp}>
              {isSendingOtp ? 'Sending...' : 'Send OTP'}
            </button>
            <div className="otp-input-wrapper">
              <input 
                type="text" 
                id="otpInput" 
                placeholder="Enter OTP" 
                maxLength={6} 
                className="otp-input"
                onChange={handleOtpChange}
                value={otp}
                inputMode="numeric"
              />
            </div>
            <button 
              type="button" 
              className="button verify-otp-btn" 
              onClick={verifyOTP} 
              disabled={isVerifyingOtp || otpVerified || otp.length !== 6}
            >
              {isVerifyingOtp ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          {otpError && <div className="error-message">{otpError}</div>}

          {/* New Password (only show after OTP verification) */}
          {otpVerified && (
            <>
              <div className="input-group-sign password-container">
                <div className="has-toggle">
                  <input
                    type={isPasswordVisible ? 'text' : 'password'}
                    id="password"
                    placeholder="New Password"
                    required
                    onChange={handlePasswordChange}
                  />
                  <a
                    href="#"
                    className="toggle-password"
                    role="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      togglePassword('password');
                    }}
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={isPasswordVisible}
                  >
                    {isPasswordVisible ? 'Hide' : 'Show'}
                  </a>
                </div>
                <div className="password-progress">
                  <div className={`password-progress-fill strength-${passwordStrength}`}></div>
                </div>
                <div className={`password-hint ${getStrengthClass(passwordStrength)}`}>{passwordHint}</div>
              </div>

              <div className="input-group-sign has-toggle">
                <input
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Confirm Password"
                  required
                />
                <a
                  href="#"
                  className="toggle-password"
                  role="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    togglePassword('confirmPassword');
                  }}
                  aria-label={isConfirmPasswordVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={isConfirmPasswordVisible}
                >
                  {isConfirmPasswordVisible ? 'Hide' : 'Show'}
                </a>
              </div>

              <button type="submit" className="button" onClick={resetPassword} disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </>
          )}
        </form>

        {showMessage && (
          <div className="message-box">
            <p>{message}</p>
            <button onClick={hideMessageBox}>OK</button>
          </div>
        )}
      </div>
    </section>
  );
};

/* --- Validation helpers --- */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? '' : 'Invalid email format.';
};

const validatePhone = (phone) => {
  return /^[0-9]{10}$/.test(phone) ? '' : 'Phone must be 10 digits.';
};

const calculatePasswordStrength = (password) => {
  let strength = 0;
  const checks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  Object.values(checks).forEach((c) => c && strength++);
  
  let hint = '';
  switch (strength) {
    case 0:
    case 1: hint = 'Very Weak - Add more characters'; break;
    case 2: hint = 'Weak - Add uppercase letters and numbers'; break;
    case 3: hint = 'Fair - Good start'; break;
    case 4: hint = 'Strong - Almost there'; break;
    case 5: hint = 'Excellent - Strong password'; break;
    default: break;
  }
  
  return { strength, hint, checks };
};

export default ForgetPassword;
