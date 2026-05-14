import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyPrescriptions.css';
import { API_BASE_URL } from '../config/api';

const MyPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const patientId =
    localStorage.getItem('patientId') ||
    localStorage.getItem('CurrentpatientId') ||
    '';
  const patientName = localStorage.getItem('patientName');
  const token = localStorage.getItem('token');

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    if (!token || !patientId) {
      navigate('/login/patientlogin', { replace: true });
      return;
    }
    fetchPrescriptions();
  }, [patientId, token, navigate]);

  /* ================= FETCH PRESCRIPTIONS ================= */
  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        buildApiUrl(`/api/prescriptions/patient/${encodeURIComponent(patientId)}`),
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              }
            : {
                'Content-Type': 'application/json',
              },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        // 🔹 SAFE: supports multiple backend response styles
        setPrescriptions(result.data || result.prescriptions || []);
      } else {
        throw new Error(result.message || 'Failed to fetch prescriptions');
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setError(error.message || 'Unable to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  /* ================= HELPERS ================= */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleBackToDashboard = () => {
    navigate('/patient-dashboard');
  };

  const openPrescriptionDetails = (prescription) => {
    if (!prescription?._id) {
      setError('Unable to open prescription details. Missing prescription ID.');
      return;
    }
    navigate(`/prescription-view?id=${prescription._id}`);
  };

  /* ================= UI STATES ================= */
  if (error) {
    return (
      <div className="prescriptions-container">
        <button onClick={handleBackToDashboard} className="back-btn">
          ← Back to Dashboard
        </button>
        <div className="error-message">
          <h2>Error Loading Prescriptions</h2>
          <p>{error}</p>
          <button onClick={fetchPrescriptions} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="prescriptions-container">
      <div className="prescriptions-header">
        <button onClick={handleBackToDashboard} className="back-btn">
          ← Back to Dashboard
        </button>
        <div className="header-info">
          <h1>My Prescriptions</h1>
          <p className="patient-info">
            <strong style={{ fontSize: '16px', color: '#e9ecf2ff' }}>
              {patientName}
            </strong>{' '}
            • Patient ID: {patientId}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="no-prescriptions">
          <p>Loading your prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="no-prescriptions">
          <div className="no-prescriptions-icon">📋</div>
          <h2>No Prescriptions Found</h2>
          <p>You don't have any prescriptions yet.</p>
        </div>
      ) : (
        <div className="prescriptions-table-wrapper">
          <table className="prescriptions-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Doctor</th>
                <th>Diagnosis</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((prescription, index) => (
                <tr key={prescription._id || `${prescription.patientId}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{formatDate(prescription?.patientData?.date || prescription?.createdAt)}</td>
                  <td>{prescription?.doctorName || '-'}</td>
                  <td title={prescription?.diagnosis || '-'}>
                    {prescription?.diagnosis || '-'}
                  </td>
                  <td>
                    <button
                      onClick={() => openPrescriptionDetails(prescription)}
                      className="view-details-btn"
                      type="button"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyPrescriptions;
