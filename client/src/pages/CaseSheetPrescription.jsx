// CaseSheetPrescription.jsx
import React, { useState, useEffect } from 'react';
import './prescription.css';
import { API_BASE_URL } from '../config/api';
import { getStoredPatientId } from '../utils/patientIdentity';

const CaseSheetPrescription = () => {
  const [patientId, setPatientId] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  const buildApiUrl = (path) =>
    `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  useEffect(() => {
    // Get patient ID from localStorage or props
    const storedPatientId = getStoredPatientId();
    if (storedPatientId) {
      setPatientId(storedPatientId);
      fetchPatientPrescriptions(storedPatientId);
    }
  }, []);

  const fetchPatientPrescriptions = async (id) => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/api/prescriptions/patient/${id}`));
      if (response.ok) {
        const result = await response.json();
        setPrescriptions(result.data);
      } else {
        console.error('Failed to fetch prescriptions');
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPatient = () => {
    if (patientId.trim()) {
      fetchPatientPrescriptions(patientId.trim());
    }
  };

  const viewPrescriptionDetails = (prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (medicine) => {
    if (medicine.type === 'injection') {
      return '-';
    }
    if (medicine.asNeeded) {
      return 'As Needed';
    }
    const durationTypes = {
      'days': 'days',
      'weeks': 'weeks', 
      'months': 'months',
      'everyVisit': 'Every Visit'
    };
    return `${medicine.duration} ${durationTypes[medicine.durationType] || 'days'}`;
  };

  const calculateTotalQty = (medicine) => {
    if (medicine.asNeeded || medicine.type === 'injection') return '-';
    
    const dosagePerDay = 
      (parseFloat(medicine.dosage.m) || 0) +
      (parseFloat(medicine.dosage.n) || 0) +
      (parseFloat(medicine.dosage.e) || 0) +
      (parseFloat(medicine.dosage.n2) || 0);
    
    let durationInDays = parseInt(medicine.duration) || 0;
    if (medicine.durationType === 'weeks') {
      durationInDays *= 7;
    } else if (medicine.durationType === 'months') {
      durationInDays *= 30;
    }
    
    return Math.ceil(dosagePerDay * durationInDays);
  };

  const handlePrintPrescription = () => {
    window.print();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="no-print" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2c5282', marginBottom: '20px' }}>Patient Case Sheet - Prescription History</h2>
        
        {/* Patient ID Search */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold' }}>Patient ID:</label>
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="Enter Patient ID (e.g., U1001)"
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '200px' }}
          />
          <button
            onClick={handleSearchPatient}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2c5282',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading prescriptions...</div>}

        {!loading && prescriptions.length === 0 && patientId && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No prescriptions found for this patient.
          </div>
        )}

        {!loading && prescriptions.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '15px' }}>
              Prescription History ({prescriptions.length} records)
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>S.No</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Doctor</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Symptoms</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Diagnosis</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Medicines</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((prescription, index) => (
                    <tr key={prescription._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        {formatDate(prescription.createdAt)}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        {prescription.doctorName}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', maxWidth: '150px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prescription.symptoms}
                        </div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', maxWidth: '200px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prescription.diagnosis}
                        </div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        {prescription.medicines.length} medicine(s)
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: prescription.status === 'active' ? '#d1ecf1' : '#d4edda',
                          color: prescription.status === 'active' ? '#0c5460' : '#155724'
                        }}>
                          {prescription.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        <button
                          onClick={() => viewPrescriptionDetails(prescription)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#2c5282',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Prescription Details Modal */}
      {showPrescriptionModal && selectedPrescription && (
        <div className="no-print" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: '0', color: '#2c5282' }}>Prescription Details</h3>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Patient & Doctor Info */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4 style={{ marginTop: '0' }}>Patient Information</h4>
                  <p><strong>Name:</strong> {selectedPrescription.patientData.name}</p>
                  <p><strong>Patient ID:</strong> {selectedPrescription.patientId}</p>
                  <p><strong>Age:</strong> {selectedPrescription.patientData.age}</p>
                  <p><strong>Gender:</strong> {selectedPrescription.patientData.gender}</p>
                </div>
                <div>
                  <h4 style={{ marginTop: '0' }}>Prescription Information</h4>
                  <p><strong>Doctor:</strong> {selectedPrescription.doctorName}</p>
                  <p><strong>Date:</strong> {formatDate(selectedPrescription.createdAt)}</p>
                  <p><strong>Clinic:</strong> {selectedPrescription.clinicName}</p>
                  <p><strong>Status:</strong> {selectedPrescription.status}</p>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <h4>Symptoms</h4>
                <p style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', margin: '0' }}>
                  {selectedPrescription.symptoms}
                </p>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <h4>Diagnosis</h4>
                <p style={{ padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '4px', margin: '0' }}>
                  {selectedPrescription.diagnosis}
                </p>
              </div>
              {selectedPrescription.advice && (
                <div style={{ marginBottom: '15px' }}>
                  <h4>Doctor's Advice</h4>
                  <p style={{ padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', margin: '0' }}>
                    {selectedPrescription.advice}
                  </p>
                </div>
              )}
            </div>

            {/* Medicines Table */}
            <div style={{ marginBottom: '20px' }}>
              <h4>Prescribed Medicines</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>S.No</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Medicine</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>
                      <div className="dosage-header">
                        <div>Dosage</div>
                        <div className="dosage-label-row dosage-header-labels">
                          <span>Morning</span>
                          <span>Noon</span>
                          <span>Evening</span>
                          <span>Night</span>
                        </div>
                      </div>
                    </th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Food</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Duration</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Total Qty</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>As Needed</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPrescription.medicines.map((medicine, index) => (
                    <tr key={index}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{index + 1}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{medicine.name}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textTransform: 'capitalize' }}>
                        {medicine.type}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <div className="dosage-values-row">
                          <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.m || '0')}</span>
                          <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.n || '0')}</span>
                          <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.e || '0')}</span>
                          <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.n2 || '0')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        {medicine.type === 'injection' ? '-' : (medicine.foodIntake === 'after' ? 'After Food' : 'Before Food')}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        {formatDuration(medicine)}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        {calculateTotalQty(medicine)}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                        {medicine.asNeeded ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Next Visit & Billing Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {selectedPrescription.nextVisitDate && (
                <div>
                  <h4>Next Visit Date</h4>
                  <p style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', margin: '0' }}>
                    {formatDate(selectedPrescription.nextVisitDate)}
                  </p>
                </div>
              )}
              <div>
                <h4>Billing Status</h4>
                <p style={{ 
                  padding: '10px', 
                  backgroundColor: selectedPrescription.billing?.isGenerated ? '#d4edda' : '#f8d7da', 
                  borderRadius: '4px', 
                  margin: '0' 
                }}>
                  {selectedPrescription.billing?.isGenerated ? 
                    `Bill Generated - ₹${selectedPrescription.billing.totalAmount}` : 
                    'Billing Pending'
                  }
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handlePrintPrescription}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Print Prescription
              </button>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print View - Same format as prescription.jsx */}
      {showPrescriptionModal && selectedPrescription && (
        <div className="print-only">
          <div className="print-page">
            {/* Watermark */}
            <div className="watermark">
              <img src="/images/logo2.png" alt="watermark" />
            </div>

            {/* Header with Logo */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              borderBottom: '2px solid #000',
              paddingBottom: '10px',
              marginBottom: '15px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img 
                  src="/logo.png" 
                  alt="SRM Logo" 
                  style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div>
                  <h2 style={{ margin: '0', fontSize: '22px', fontWeight: 'bold' }}>
                    SRM Dental College
                  </h2>
                  <p style={{ margin: '2px 0', fontSize: '11px' }}>
                    Ramapuram, Chennai - 600089
                  </p>
                </div>
              </div>
              
              <div style={{ textAlign: 'right', fontSize: '10px' }}>
                <div><strong>SRM Dental College Hospital</strong></div>
                <div>Ramapuram, Chennai - 600089</div>
                <div>Contact: +91 44-2249-0526</div>
                <div>Email: info@srmdental.ac.in</div>
              </div>
            </div>

            {/* Doctor Info */}
            <div style={{ marginBottom: '12px', borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>
                {selectedPrescription.doctorName || 'Dr. Parvin'}, BDS, MDS (Periodontics)
              </h3>
              <p style={{ margin: '0', fontSize: '10px' }}>
                Reg No: {selectedPrescription.doctorId || 'DCI/93030'}
              </p>
            </div>

            {/* Patient Info */}
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
              fontSize: '11px',
              backgroundColor: '#f5f5f5',
              padding: '8px',
              borderRadius: '4px'
            }}>
              <div>
                <p style={{ margin: '2px 0' }}>
                  <strong>Name:</strong> {selectedPrescription.patientData.name}, {selectedPrescription.patientData.gender}, {selectedPrescription.patientData.age} Yrs
                </p>
                <p style={{ margin: '2px 0' }}>
                  <strong>Mobile:</strong> +91-9876543210
                </p>
                <p style={{ margin: '2px 0' }}>
                  <strong>Patient ID:</strong> {selectedPrescription.patientId || 'A00123567'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '2px 0' }}>
                  <strong>Date:</strong> {new Date(selectedPrescription.createdAt).toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>

            {/* Medication Table */}
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ 
                margin: '0 0 6px 0', 
                fontSize: '12px', 
                fontWeight: 'bold',
                borderBottom: '1px solid #000',
                paddingBottom: '3px'
              }}>
                Medication Prescribed
              </h4>
              <table className="print-table">
                <thead>
                  <tr style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
                    <th style={{ width: '5%' }}>S.No</th>
                    <th style={{ width: '10%' }}>Type</th>
                    <th style={{ width: '30%' }}>Medicine Name</th>
                    <th style={{ width: '15%' }}>
                      <div className="dosage-header">
                        <div>Dosage</div>
                        <div className="dosage-label-row dosage-header-labels">
                          <span>Morning</span>
                          <span>Noon</span>
                          <span>Evening</span>
                          <span>Night</span>
                        </div>
                      </div>
                    </th>
                    <th style={{ width: '12%' }}>Food Intake</th>
                    <th style={{ width: '13%' }}>Duration</th>
                    <th style={{ width: '10%' }}>Total Qty</th>
                    <th style={{ width: '5%' }}>As Needed</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPrescription.medicines.map((medicine, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ textTransform: 'capitalize' }}>{medicine.type}</td>
                      <td>
                        <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                          {medicine.name.toUpperCase()}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="dosage-values-row">
                          <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.m || '0')}</span>
                          <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.n || '0')}</span>
                          <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.e || '0')}</span>
                          <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.n2 || '0')}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', textTransform: 'capitalize' }}>
                        {medicine.type === 'injection' ? '-' : (medicine.foodIntake === 'after' ? 'After Food' : 'Before Food')}
                      </td>
                      <td style={{ textAlign: 'center' }}>{formatDuration(medicine)}</td>
                      <td style={{ textAlign: 'center' }}>{calculateTotalQty(medicine)}</td>
                      <td style={{ textAlign: 'center' }}>{medicine.asNeeded ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '9px', margin: '4px 0', fontStyle: 'italic' }}>
                <strong>M-N-E-N:</strong> Morning - Noon - Evening - Night
              </p>
            </div>

            {/* Advice */}
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ 
                margin: '0 0 6px 0', 
                fontSize: '12px', 
                fontWeight: 'bold',
                borderBottom: '1px solid #000',
                paddingBottom: '3px'
              }}>
                Advice & Instructions
              </h4>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '11px', lineHeight: '1.6' }}>
                <li>Maintain good oral hygiene.</li>
                <li>Brush twice daily with a soft-bristled toothbrush.</li>
                <li>Avoid very hot or cold foods/drinks.</li>
                {selectedPrescription.nextVisitDate && (
                  <li><strong>Follow up in 2 weeks or as advised.</strong></li>
                )}
                {selectedPrescription.advice && selectedPrescription.advice.split('\n').filter(line => line.trim()).map((line, idx) => (
                  <li key={idx}>{line.trim()}</li>
                ))}
              </ul>
            </div>

            {/* Next Visit */}
            {selectedPrescription.nextVisitDate && (
              <div style={{ marginBottom: '15px', fontSize: '11px' }}>
                <p style={{ margin: '0' }}>
                  <strong>Next Visit:</strong> {new Date(selectedPrescription.nextVisitDate).toLocaleDateString('en-GB')}
                  {selectedPrescription.nextVisitTime && ` at ${selectedPrescription.nextVisitTime}`}
                </p>
              </div>
            )}

            {/* Signature */}
            <div style={{ 
              marginTop: '40px', 
              display: 'flex', 
              justifyContent: 'flex-end',
              alignItems: 'flex-end'
            }}>
              <div style={{ textAlign: 'right', fontSize: '11px' }}>
                {selectedPrescription.doctorSignature && (
                  <div style={{ marginBottom: '5px' }}>
                    <img 
                      src={selectedPrescription.doctorSignature} 
                      alt="Doctor Signature" 
                      style={{ 
                        maxWidth: '150px', 
                        maxHeight: '80px',
                        display: 'block',
                        marginLeft: 'auto'
                      }} 
                    />
                  </div>
                )}
                <div style={{ 
                  borderTop: '1px solid #000', 
                  paddingTop: '5px',
                  minWidth: '180px',
                  marginTop: '5px'
                }}>
                  (Signature of {selectedPrescription.doctorName || 'Dr. Parvin'})
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ 
              marginTop: '20px', 
              paddingTop: '10px', 
              borderTop: '1px solid #ccc',
              fontSize: '9px',
              color: '#666',
              lineHeight: '1.4'
            }}>
              <p style={{ margin: '0' }}>
                <strong>Disclaimer:</strong> This prescription was generated digitally by SRM Dental College on {new Date(selectedPrescription.createdAt).toLocaleDateString('en-IN')}. Kindly consult a doctor for further advice if symptoms persist.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseSheetPrescription;
