import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './AssignDoctor.css'; // Reuse same styles

const AssignUG = ({
  isOpen,
  onClose,
  onUGCreated,
  onUGSaved,
  allowedDepartment = '',
  mode = 'create',
  initialUG = null,
}) => {
  const [staffId, setStaffId] = useState('');
  const [ugName, setUGName] = useState('');
  const [ugEmail, setUGEmail] = useState('');
  const [ugPhone, setUGPhone] = useState('');
  const [department, setDepartment] = useState(allowedDepartment || '');
  const [specialization, setSpecialization] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error'
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef(null);

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

    if (isEditMode) {
      const seededDepartment = allowedDepartment || initialUG?.department || '';

      setStaffId(String(initialUG?.staffId || initialUG?.Identity || '').trim());
      setUGName(String(initialUG?.name || '').trim());
      setUGEmail(String(initialUG?.email || '').trim());
      setUGPhone(String(initialUG?.phone || '').trim());
      setDepartment(String(seededDepartment).trim());
      setSpecialization(String(initialUG?.specialization || '').trim());
      return;
    }

    setDepartment(allowedDepartment || '');
  }, [allowedDepartment, isOpen, isEditMode, initialUG]);

  const showMessage = (msg, type = 'error') => {
    setMessage(msg);
    setMessageType(type);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

    if (isEditMode && !initialUG?._id) {
      showMessage('Unable to edit UG: missing UG id', 'error');
      return;
    }

    if ((!isEditMode && !staffId.trim()) || !ugName.trim() || !ugEmail.trim() || !departmentToSubmit) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ugEmail)) {
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
            `http://localhost:5000/api/auth/doctor/assigned-ugs/${initialUG._id}/update`,
            {
              name: ugName,
              email: ugEmail,
              phone: ugPhone || '',
              department: departmentToSubmit,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        : await axios.post(
            'http://localhost:5000/api/auth/create-ug',
            {
              staffId,
              ugName,
              ugEmail,
              ugPhone: ugPhone || '',
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
          if (onUGSaved) onUGSaved(response.data.ug);
          onClose?.();
          return;
        }

        if (onUGCreated) {
          onUGCreated(response.data.ug);
        }

        setStaffId('');
        setUGName('');
        setUGEmail('');
        setUGPhone('');
        setDepartment(allowedDepartment || '');
        setSpecialization('');

        onClose?.();
      }
    } catch (err) {
      console.error('❌ UG Creation Error:', err);

      let errorMsg = 'Failed to create UG account';
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


  if (!isOpen) return null;

  return (
    <div className="assign-doctor-overlay">
      <div className="assign-doctor-modal" ref={contentRef}>
        <div className="assign-doctor-header">
          <h2>{isEditMode ? 'Edit UG Student' : 'Assign a UG Student'}</h2>
          <button className="close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="assign-doctor-content">
          <form onSubmit={handleSubmit}>
              {message && (
                <div className={`message-box ${messageType}`}>
                  {messageType === 'success' ? '✓' : '✕'} {message}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="ugName">UG Name *</label>
                <input
                  type="text"
                  id="ugName"
                  value={ugName}
                  onChange={(e) => setUGName(e.target.value)}
                  placeholder="Enter UG Name"
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
                <label htmlFor="ugPhone">Phone Number</label>
                <input
                  type="tel"
                  id="ugPhone"
                  value={ugPhone}
                  onChange={(e) => setUGPhone(e.target.value)}
                  placeholder="Enter Phone Number"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ugEmail">Email Address *</label>
                <input
                  type="email"
                  id="ugEmail"
                  value={ugEmail}
                  onChange={(e) => setUGEmail(e.target.value)}
                  placeholder="Enter Email Address"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-cancel" onClick={onClose} disabled={isLoading}>
                  Cancel
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default AssignUG;
