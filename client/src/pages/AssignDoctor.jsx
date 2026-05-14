import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import './AssignDoctor.css';

const AssignDoctor = ({
  isOpen,
  onClose,
  onDoctorCreated,
  onDoctorSaved,
  allowedDepartment = '',
  mode = 'create',
  initialDoctor = null,
}) => {
  const [staffId, setStaffId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [department, setDepartment] = useState(allowedDepartment || '');
  const [specialization, setSpecialization] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [isLoading, setIsLoading] = useState(false);
  const [createdDoctorData, setCreatedDoctorData] = useState(null);

  const departments = allowedDepartment ? [allowedDepartment] : [];

  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (!isOpen) return;

    clearMessage();
    setCreatedDoctorData(null);

    if (isEditMode) {
      const seededDepartment = allowedDepartment || initialDoctor?.department || '';
      setStaffId(String(initialDoctor?.staffId || initialDoctor?.Identity || '').trim());
      setDoctorName(String(initialDoctor?.name || '').trim());
      setDoctorEmail(String(initialDoctor?.email || '').trim());
      setDoctorPhone(String(initialDoctor?.phone || '').trim());
      setDepartment(String(seededDepartment).trim());
      setSpecialization(String(initialDoctor?.specialization || '').trim());
      return;
    }

    setDepartment(allowedDepartment || '');
  }, [allowedDepartment, isOpen, isEditMode, initialDoctor]);

  const showMessage = (msg, type = 'error') => {
    setMessage(msg);
    setMessageType(type);
  };

  const clearMessage = () => {
    setMessage('');
    setMessageType('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessage();
    const token = localStorage.getItem('token');
    const departmentToSubmit = allowedDepartment || department;

    if (isEditMode && !initialDoctor?._id) {
      showMessage('Unable to edit doctor: missing doctor id', 'error');
      return;
    }

    // Validate required fields
    if ((!isEditMode && !staffId.trim()) || !doctorName.trim() || !doctorEmail.trim() || !departmentToSubmit) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(doctorEmail)) {
      showMessage('Please enter a valid email address', 'error');
      return;
    }

    if (!token) {
      showMessage('Session expired. Please log in again.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = isEditMode
        ? await axios.patch(
            `${API_BASE_URL}/api/auth/chief/assigned-doctors/${initialDoctor._id}/update`,
            {
              name: doctorName,
              email: doctorEmail,
              phone: doctorPhone || '',
              department: departmentToSubmit,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        : await axios.post(
            `${API_BASE_URL}/api/auth/create-doctor`,
            {
              staffId,
              doctorName,
              doctorEmail,
              doctorPhone: doctorPhone || '',
              department: departmentToSubmit,
              specialization: specialization || '',
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

      if (response.data.success) {
        if (isEditMode) {
          if (onDoctorSaved) onDoctorSaved(response.data.doctor);
          onClose?.();
          return;
        }

        showMessage('Doctor account created successfully!', 'success');
        setCreatedDoctorData(response.data.doctor);
        
        // Reset form
        setStaffId('');
        setDoctorName('');
        setDoctorEmail('');
        setDoctorPhone('');
        setDepartment(allowedDepartment || '');
        setSpecialization('');

        // Callback to parent component
        if (onDoctorCreated) {
          onDoctorCreated(response.data.doctor);
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create doctor account';
      showMessage(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStaffId('');
    setDoctorName('');
    setDoctorEmail('');
    setDoctorPhone('');
    setDepartment(allowedDepartment || '');
    setSpecialization('');
    clearMessage();
    setCreatedDoctorData(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMessage('Copied to clipboard!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="assign-doctor-overlay">
      <div className="assign-doctor-modal">
        <div className="assign-doctor-header">
          <h2>{isEditMode ? 'Edit Doctor' : 'Assign a Doctor'}</h2>
          <button 
            className="close-btn" 
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="assign-doctor-content">
          {createdDoctorData && !isEditMode ? (
            // Success message with doctor details
            <div className="doctor-created-success">
              <div className="success-icon">✓</div>
              <h3>Doctor Account Created Successfully!</h3>
              
              <div className="created-doctor-info">
                <p><strong>Doctor Name:</strong> {createdDoctorData.name}</p>
                <p><strong>Staff ID:</strong> {createdDoctorData.staffId}</p>
                <p><strong>Department:</strong> {createdDoctorData.department}</p>
                <p><strong>Specialization:</strong> {createdDoctorData.specialization || '—'}</p>
                <p><strong>Phone:</strong> {createdDoctorData.phone || '—'}</p>
                <p><strong>Email:</strong> {createdDoctorData.email}</p>
                
                <div className="password-section">
                  <p><strong>Generated Password:</strong></p>
                  <div className="password-display">
                    <span className="password-text">{createdDoctorData.generatedPassword}</span>
                    <button 
                      className="copy-btn"
                      onClick={() => copyToClipboard(createdDoctorData.generatedPassword)}
                    >
                      Copy
                    </button>
                  </div>
                  <p className="password-note">
                    Share this password with the doctor. They should change it on first login.
                  </p>
                </div>
              </div>

              <button 
                className="btn btn-primary"
                onClick={handleReset}
              >
                Create Another Doctor
              </button>
              <button 
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          ) : (
            // Form to create doctor
            <form onSubmit={handleSubmit}>
              {message && (
                <div className={`message-box ${messageType}`}>
                  {messageType === 'success' ? '✓' : '✕'} {message}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="doctorName">Doctor Name *</label>
                <input
                  type="text"
                  id="doctorName"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Enter Doctor Name"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="staffId">Staff ID *</label>
                <input
                  type="text"
                  id="staffId"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="Enter Staff ID"
                  required={!isEditMode}
                  disabled={isLoading || isEditMode}
                />
              </div>

              <div className="form-group">
                <label htmlFor="department">Department *</label>
                <select
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  disabled={true}
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {!isEditMode && (
                <div className="form-group">
                  <label htmlFor="specialization">Specialization</label>
                  <input
                    type="text"
                    id="specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="Enter Specialization"
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="doctorPhone">Phone Number</label>
                <input
                  type="tel"
                  id="doctorPhone"
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  placeholder="Enter Phone Number"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="doctorEmail">Email Address *</label>
                <input
                  type="email"
                  id="doctorEmail"
                  value={doctorEmail}
                  onChange={(e) => setDoctorEmail(e.target.value)}
                  placeholder="Enter Email Address"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="info-box">
                <p>
                  {allowedDepartment
                    ? `💡 You can only assign doctors in your department: ${allowedDepartment}.`
                    : '💡 Your chief doctor account does not have a department assigned.'}
                </p>
                <p>
                  💡 The initial password is 123456. Share it with the doctor.
                </p>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading || !allowedDepartment}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-cancel"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignDoctor;
