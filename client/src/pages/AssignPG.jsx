import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AssignDoctor.css'; // Reuse same styles

const AssignPG = ({
  isOpen,
  onClose,
  onPGCreated,
  onPGSaved,
  allowedDepartment = '',
  mode = 'create',
  initialPG = null,
}) => {
  const [staffId, setStaffId] = useState('');
  const [pgName, setPGName] = useState('');
  const [pgEmail, setPGEmail] = useState('');
  const [pgPhone, setPGPhone] = useState('');
  const [department, setDepartment] = useState(allowedDepartment || '');
  const [specialization, setSpecialization] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [isLoading, setIsLoading] = useState(false);
  const [createdPGData, setCreatedPGData] = useState(null);

  const departments = allowedDepartment
    ? [allowedDepartment]
    : [
        'General Dentistry',
        'Pedodontics',
        'Implantology',
        'Prosthodontics',
        'Oral Surgery',
        'Orthodontics',
        'Periodontics',
        'Endodontics',
        'Oral Pathology',
        'Other',
      ];

  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (!isOpen) return;

    clearMessage();
    setCreatedPGData(null);

    if (isEditMode) {
      const seededDepartment = allowedDepartment || initialPG?.department || '';

      setStaffId(String(initialPG?.staffId || initialPG?.Identity || '').trim());
      setPGName(String(initialPG?.name || '').trim());
      setPGEmail(String(initialPG?.email || '').trim());
      setPGPhone(String(initialPG?.phone || '').trim());
      setDepartment(String(seededDepartment).trim());
      setSpecialization(String(initialPG?.specialization || '').trim());
      return;
    }

    setDepartment(allowedDepartment || '');
  }, [allowedDepartment, isOpen, isEditMode, initialPG]);

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

    if (isEditMode && !initialPG?._id) {
      showMessage('Unable to edit PG: missing PG id', 'error');
      return;
    }

    // Validate required fields
    if ((!isEditMode && !staffId.trim()) || !pgName.trim() || !pgEmail.trim() || !departmentToSubmit) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(pgEmail)) {
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
            `http://localhost:5000/api/auth/doctor/assigned-pgs/${initialPG._id}/update`,
            {
              name: pgName,
              email: pgEmail,
              phone: pgPhone || '',
              department: departmentToSubmit,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        : await axios.post(
            'http://localhost:5000/api/auth/create-pg',
            {
              staffId,
              pgName,
              pgEmail,
              pgPhone: pgPhone || '',
              department: departmentToSubmit,
              specialization: specialization || '',
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

      console.log('Response:', response.data);

      if (response.data.success) {
        if (isEditMode) {
          if (onPGSaved) onPGSaved(response.data.pg);
          onClose?.();
          return;
        }

        showMessage('PG account created successfully!', 'success');
        setCreatedPGData(response.data.pg);

        // Reset form
        setStaffId('');
        setPGName('');
        setPGEmail('');
        setPGPhone('');
        setDepartment(allowedDepartment || '');
        setSpecialization('');

        // Callback to parent component
        if (onPGCreated) {
          onPGCreated(response.data.pg);
        }
      }
    } catch (err) {
      console.error('❌ PG Creation Error:', err);
      console.error('Error Response:', err.response?.data);
      
      let errorMsg = 'Failed to create PG account';
      
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      showMessage(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStaffId('');
    setPGName('');
    setPGEmail('');
    setPGPhone('');
    setDepartment(allowedDepartment || '');
    setSpecialization('');
    clearMessage();
    setCreatedPGData(null);
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
          <h2>{isEditMode ? 'Edit PG Student' : 'Assign a PG Student'}</h2>
          <button 
            className="close-btn" 
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="assign-doctor-content">
          {createdPGData && !isEditMode ? (
            // Success message with PG details
            <div className="doctor-created-success">
              <div className="success-icon">✓</div>
              <h3>PG Account Created Successfully!</h3>
              
              <div className="created-doctor-info">
                <p><strong>PG Name:</strong> {createdPGData.name}</p>
                <p><strong>Staff ID:</strong> {createdPGData.staffId}</p>
                <p><strong>Department:</strong> {createdPGData.department}</p>
                <p><strong>Specialization:</strong> {createdPGData.specialization || '—'}</p>
                <p><strong>Phone:</strong> {createdPGData.phone || '—'}</p>
                <p><strong>Email:</strong> {createdPGData.email}</p>
                
                <div className="password-section">
                  <p><strong>Generated Password:</strong></p>
                  <div className="password-display">
                    <span className="password-text">{createdPGData.generatedPassword}</span>
                    <button 
                      className="copy-btn"
                      onClick={() => copyToClipboard(createdPGData.generatedPassword)}
                    >
                      Copy
                    </button>
                  </div>
                  <p className="password-note">
                    Share this password with the PG student. They should change it on first login.
                  </p>
                </div>
              </div>

              <button 
                className="btn btn-primary"
                onClick={handleReset}
              >
                Create Another PG
              </button>
              <button 
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          ) : (
            // Form to create PG
            <form onSubmit={handleSubmit}>
              {message && (
                <div className={`message-box ${messageType}`}>
                  {messageType === 'success' ? '✓' : '✕'} {message}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="pgName">PG Name *</label>
                <input
                  type="text"
                  id="pgName"
                  value={pgName}
                  onChange={(e) => setPGName(e.target.value)}
                  placeholder="Enter PG Name"
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
                  disabled={isLoading || Boolean(allowedDepartment)}
                >
                  {!allowedDepartment && <option value="">Select a Department</option>}
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
                <label htmlFor="pgPhone">Phone Number</label>
                <input
                  type="tel"
                  id="pgPhone"
                  value={pgPhone}
                  onChange={(e) => setPGPhone(e.target.value)}
                  placeholder="Enter Phone Number"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pgEmail">Email Address *</label>
                <input
                  type="email"
                  id="pgEmail"
                  value={pgEmail}
                  onChange={(e) => setPGEmail(e.target.value)}
                  placeholder="Enter Email Address"
                  required
                  disabled={isLoading}
                />
              </div>

              {!isEditMode && (
                <div className="info-box">
                  <p>
                    💡 The initial password is 123456. Share it with the PG student.
                  </p>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading}
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

export default AssignPG;
