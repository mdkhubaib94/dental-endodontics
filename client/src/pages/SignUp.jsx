import React, { useState } from 'react';
import './Signup.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SignUp = () => {
  const navigate = useNavigate();
  const [otpVerified, setOtpVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState('info');
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
  const [otpValue, setOtpValue] = useState('');
  const role = 'patient';

  const showMessageBox = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setShowMessage(true);
    
    if (type === 'success') {
      setTimeout(() => {
        setShowMessage(false);
      }, 5000);
    }
  };

  const hideMessageBox = () => {
    setShowMessage(false);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format.';
    }
    
    const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com', 'eec.srmrmp.edu.in'];
    const domain = email.split('@')[1];
    
    if (!commonDomains.some(d => domain.includes(d))) {
      return 'Please use a valid email provider (Gmail, Yahoo, Outlook, etc.).';
    }
    
    return '';
  };

  const validatePhone = (phone) => {
    if (!/^[0-9]{10}$/.test(phone)) {
      return 'Phone must be exactly 10 digits.';
    }
    if (/[@#$%^&*()\-\+=:;<>?\/|{}\[\]~]/.test(phone)) {
      return 'Phone number should not contain special characters.';
    }
    return '';
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    const checks = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    Object.values(checks).forEach(check => {
      if (check) strength++;
    });

    let hint = '';
    switch (strength) {
      case 0:
      case 1:
        hint = 'Very Weak - Add more characters';
        break;
      case 2:
        hint = 'Weak - Missing requirements';
        break;
      case 3:
        hint = 'Fair - Getting better';
        break;
      case 4:
        hint = 'Strong - Almost there';
        break;
      case 5:
        hint = 'Excellent - Password meets all requirements';
        break;
      default:
        hint = '';
    }

    return { strength, hint, checks };
  };

  const handleEmailChange = (e) => {
    const email = e.target.value.trim();
    if (email === '') {
      setEmailError('');
    } else {
      setEmailError(validateEmail(email));
    }
  };

  const handlePhoneChange = (e) => {
    const phone = e.target.value.trim();
    if (phone === '') {
      setPhoneError('');
    } else {
      setPhoneError(validatePhone(phone));
    }
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    const { strength, hint } = calculatePasswordStrength(password);
    setPasswordStrength(strength);
    setPasswordHint(hint);
  };

  const handleOtpChange = (e) => {
    const value = e.target.value;
    const numbersOnly = value.replace(/[^0-9]/g, '');
    setOtpValue(numbersOnly);
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

  const sendOTP = async () => {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const method = document.querySelector('input[name="otpMethod"]:checked').value;

    const errors = [];

    if (name === '') errors.push('Please enter your name.');
    if (method === 'email' && email === '') errors.push('Please enter your email.');
    if (method === 'phone' && phone === '') errors.push('Please enter your phone number.');

    if (method === 'email' && email) {
      const emailValidationError = validateEmail(email);
      if (emailValidationError) {
        errors.push(emailValidationError);
      }
    }

    if (method === 'phone' && phone) {
      const phoneValidationError = validatePhone(phone);
      if (phoneValidationError) {
        errors.push(phoneValidationError);
      }
    }

    if (errors.length > 0) {
      return showMessageBox(errors.join('\n'), 'error');
    }

    setIsSendingOtp(true);
    setOtpVerified(false);
    setOtpError('');

    try {
      const requestData = {
        name,
        method
      };
      
      if (method === 'email') {
        requestData.email = email;
      } else if (method === 'phone') {
        requestData.phone = phone;
      }

      const res = await axios.post('http://localhost:5000/api/otp/send-otp', requestData, {
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      if (res.status === 200 && res.data.success) {
        setOtpError('');
        if (method === 'email') {
          showMessageBox('✅ OTP sent successfully to your email! Please check your inbox.', 'success');
        } else {
          showMessageBox('✅ OTP sent successfully to your phone! Please check your messages.', 'success');
        }
      } else {
        const errorMessage = res.data.message || res.data.error || 'Failed to send OTP';
        
        if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
          showMessageBox('❌ This email or phone number is already registered. Please use a different one or login instead.', 'error');
        } else if (errorMessage.includes('Invalid method')) {
          showMessageBox('❌ Please select a valid OTP method.', 'error');
        } else if (errorMessage.includes('required')) {
          showMessageBox(`❌ ${errorMessage}`, 'error');
        } else {
          showMessageBox(`❌ ${errorMessage}`, 'error');
        }
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        showMessageBox('❌ Cannot connect to server. Please make sure the backend is running on port 5000.', 'error');
      } else if (err.response) {
        const errorMessage = err.response.data?.message || err.response.data?.error || 'Unknown server error';
        showMessageBox(`❌ Server error: ${errorMessage}`, 'error');
      } else if (err.request) {
        showMessageBox('❌ No response from server. Please check your connection.', 'error');
      } else {
        showMessageBox('❌ Failed to send OTP. Please try again.', 'error');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOTP = async () => {
    const userOTP = otpValue;
    const method = document.querySelector('input[name="otpMethod"]:checked').value;
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    setOtpError('');
    hideMessageBox();
    
    if (userOTP === '') {
      setOtpError('Please enter the OTP');
      showMessageBox('❌ Please enter the OTP', 'error');
      return;
    }

    if (userOTP.length !== 6) {
      setOtpError('OTP must be 6 digits');
      showMessageBox('❌ OTP must be 6 digits', 'error');
      return;
    }
    
    setIsVerifyingOtp(true);

    try {
      const response = await fetch('http://localhost:5000/api/otp/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otp: userOTP,
          method,
          email: method === 'email' ? email : undefined,
          phone: method === 'phone' ? phone : undefined
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setOtpVerified(true);
        setOtpError('');
        showMessageBox('✅ OTP verified successfully! You can now complete your registration.', 'success');
        
        setTimeout(() => {
          hideMessageBox();
        }, 3000);
      } else {
        setOtpVerified(false);
        setOtpError(data.message || 'Incorrect OTP. Please try again.');
        showMessageBox(`❌ ${data.message || 'Incorrect OTP. Please try again.'}`, 'error');
      }
    } catch (err) {
      setOtpError('Failed to verify OTP. Please try again.');
      showMessageBox('❌ Failed to verify OTP. Please try again.', 'error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const togglePassword = (which) => {
    if (which === 'password') {
      setIsPasswordVisible((prev) => !prev);
      return;
    }
    if (which === 'confirmPassword') {
      setIsConfirmPasswordVisible((prev) => !prev);
    }
  };

  const finalSignup = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    const name = document.getElementById('name').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const Identity = "";

    if (name === '' || !otpVerified) {
      showMessageBox('Please complete all previous steps and verify OTP.', 'error');
      setIsSubmitting(false);
      return;
    }

    // Simple password validation - only check minimum length
    if (password.length < 6) {
      showMessageBox('❌ Password must be at least 6 characters long.', 'error');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      showMessageBox('❌ Passwords do not match.', 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: document.getElementById('phone').value,
          email: document.getElementById('email').value,
          password,
          role,
          Identity
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        if (role === 'patient') {
          localStorage.setItem("patientId", data.Identity);
        }
        
        if (data.message === 'User registered successfully') {
          showMessageBox('✅ Registration successful! Redirecting to login...', 'success');
          
          setTimeout(() => {
            navigate('/login/patientlogin');
          }, 2000);
        } else {
          showMessageBox(`❌ ${data.message}`, 'error');
        }
      } else {
        showMessageBox(`❌ ${data.message || 'Registration failed'}`, 'error');
      }
    } catch (err) {
      showMessageBox('❌ Server error during signup. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className='signup-body'>
      {/* Top Notification Banner - ONLY ONE CLOSE BUTTON AT TOP RIGHT */}
      {showMessage && (
        <div className={`top-notification ${messageType}`}>
          <button className="notification-close" onClick={hideMessageBox}>×</button>
          <div className="notification-content">
            <span className="notification-icon">
              {messageType === 'success' && ''}
              {messageType === 'error' && ''}
              {messageType === 'info' && ''}
            </span>
            <span className="notification-message">{message}</span>
          </div>
          <div className="notification-progress"></div>
        </div>
      )}

      <div className="signup-box">
        <center><img src="logo.png" alt="SRM Logo" className="logo" /></center>
        <div className="college-name">SRM DENTAL COLLEGE</div>
        <h2>Sign Up</h2>

        <form id="signupForm" onSubmit={(e) => e.preventDefault()}>
          <div className="input-group">
            <input type="text" id="name" placeholder="Full Name" required />
          </div>

          <div className="input-group-sign">
            <input 
              type="email" 
              id="email" 
              placeholder="Email ID" 
              onChange={handleEmailChange}
            />
            {emailError && <div className="error-message">{emailError}</div>}
          </div>

          <div className="input-group-sign">
            <input 
              type="tel" 
              id="phone" 
              placeholder="Phone Number" 
              onChange={handlePhoneChange}
            />
            {phoneError && <div className="error-message">{phoneError}</div>}
          </div>

          <div className="checkbox-group">
            <label><input type="radio" name="otpMethod" value="email" defaultChecked /> Email</label>
            <label><input type="radio" name="otpMethod" value="phone" /> Phone</label>
          </div>

          <div className="input-group-sign otp-container signup-otp-container">
            <button 
              type="button" 
              className="button send-otp-btn" 
              onClick={sendOTP}
              disabled={isSendingOtp}
            >
              {isSendingOtp ? 'Sending...' : 'Send OTP'}
            </button>
            
            <div className="otp-input-wrapper">
              <input 
                type="text" 
                id="otpInput" 
                value={otpValue}
                onChange={handleOtpChange}
                placeholder="Enter 6-digit OTP" 
                className="otp-input" 
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text');
                  const numbersOnly = pastedText.replace(/[^0-9]/g, '');
                  setOtpValue(numbersOnly.slice(0, 6));
                }}
              />
            </div>
            
            <button 
              type="button" 
              className="button verify-otp-btn" 
              onClick={verifyOTP}
              disabled={isVerifyingOtp || otpVerified || otpValue.length !== 6}
            >
              {isVerifyingOtp ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          {otpError && <div className="error-message">{otpError}</div>}

          {otpVerified && (
            <div className="verified-box">
              <span>✅</span> OTP Verified Successfully!
            </div>
          )}

          <div className="input-group-sign password-container has-toggle">
            <input
              type={isPasswordVisible ? 'text' : 'password'}
              id="password"
              placeholder="Create Password"
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
            >
              {isPasswordVisible ? 'Hide' : 'Show'}
            </a>
            
            <div className="password-progress">
              <div 
                className={`password-progress-fill strength-${passwordStrength}`}
                style={{ width: `${(passwordStrength / 5) * 100}%` }}
              ></div>
            </div>
            
            <div className={`password-hint ${getStrengthClass(passwordStrength)}`}>
              {passwordHint}
            </div>
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
            >
              {isConfirmPasswordVisible ? 'Hide' : 'Show'}
            </a>
          </div>

          <button 
            type="submit" 
            className="button" 
            onClick={finalSignup}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>

        <div className="signup-link">
          Already have an account? <a href="/login">Log In</a>
        </div>
      </div>
    </section>
  );
};

export default SignUp;
