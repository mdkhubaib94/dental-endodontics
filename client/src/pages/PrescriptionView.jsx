// PrescriptionView.jsx
import React, { useState, useEffect, useRef } from 'react';
import './prescription.css';
import { API_BASE_URL } from '../config/api';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PrescriptionView = () => {
    const buildApiUrl = (path) =>
      `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prescriptionId, setPrescriptionId] = useState('');
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [autoPreviewPdf, setAutoPreviewPdf] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('format') === 'pdf';
  });
  const autoPreviewedPdfRef = useRef(false);

  useEffect(() => {
    // Get prescription ID from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const prescId = urlParams.get('id') || localStorage.getItem('viewPrescriptionId');
    const shouldAutoPreviewPdf = urlParams.get('format') === 'pdf';

    setAutoPreviewPdf(shouldAutoPreviewPdf);

    if (prescId) {
      setPrescriptionId(prescId);
      fetchPrescription(prescId);
    } else {
      setError('No prescription ID provided');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Prescription View';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (autoPreviewPdf) {
      document.body.classList.add('show-print-preview');
    } else {
      document.body.classList.remove('show-print-preview');
    }

    return () => {
      document.body.classList.remove('show-print-preview');
    };
  }, [autoPreviewPdf]);

  const fetchPrescription = async (id) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(buildApiUrl(`/api/prescriptions/${id}`), {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prescription');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setPrescription(result.data);
      } else {
        throw new Error('Invalid prescription data');
      }
    } catch (err) {
      console.error('Error fetching prescription:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    const loggedInPatientId = localStorage.getItem('patientId');
    if (loggedInPatientId) {
      window.location.href = '/patient-dashboard';
    } else {
      window.location.href = '/doctor-dashboard';
    }
  };

  const buildPrescriptionPdf = async () => {
    if (!html2canvas || !jsPDF) {
      throw new Error('PDF libraries are unavailable.');
    }

    const el = document.querySelector('.print-page');
    if (!el) {
      throw new Error('Printable area not found.');
    }

    const waitForImages = (container, timeout = 5000) => new Promise((resolve) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      if (imgs.length === 0) return resolve();
      let loaded = 0;
      let finished = false;

      const checkDone = () => {
        if (finished) return;
        loaded += 1;
        if (loaded >= imgs.length) {
          finished = true;
          resolve();
        }
      };

      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth !== 0) {
          checkDone();
        } else {
          img.addEventListener('load', checkDone, { once: true });
          img.addEventListener('error', checkDone, { once: true });
        }
      });

      setTimeout(() => {
        if (!finished) {
          finished = true;
          resolve();
        }
      }, timeout);
    });

    await waitForImages(el, 4000);

    const canvas = await html2canvas(el, {
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: el.offsetWidth,
      windowHeight: el.scrollHeight,
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const doc = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const docPageHeight = doc.internal.pageSize.getHeight();

    let heightLeft = imgHeight;
    let position = 0;

    while (heightLeft > 0) {
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= docPageHeight;
      position -= docPageHeight;
      if (heightLeft > 0) {
        doc.addPage();
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const patientName = (prescription.patientData?.name || 'Prescription').replace(/\s+/g, '_');
    const filename = `${patientName}_Prescription_${dateStr}.pdf`;

    return { doc, filename };
  };

  const handleViewPdf = async () => {
    try {
      setIsPdfProcessing(true);
      const { doc } = await buildPrescriptionPdf();
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error opening PDF preview:', err);
      alert(err.message || 'Error opening PDF preview. Please try again.');
    } finally {
      setIsPdfProcessing(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsPdfProcessing(true);
      const { doc, filename } = await buildPrescriptionPdf();
      doc.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsPdfProcessing(false);
    }
  };

  useEffect(() => {
    if (!autoPreviewPdf || autoPreviewedPdfRef.current) return;
    if (loading || error || !prescription) return;

    autoPreviewedPdfRef.current = true;

    const openPdfInCurrentTab = async () => {
      try {
        setIsPdfProcessing(true);
        const { doc } = await buildPrescriptionPdf();
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.location.replace(pdfUrl);
      } catch (err) {
        console.error('Error opening prescription PDF:', err);
        setAutoPreviewPdf(false);
      } finally {
        setIsPdfProcessing(false);
      }
    };

    openPdfInCurrentTab();
  }, [autoPreviewPdf, loading, error, prescription]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDuration = (medicine) => {
    if (!medicine) return '-';
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
    return `${medicine.duration || '0'} ${durationTypes[medicine.durationType] || 'days'}`;
  };

  const calculateTotalQty = (medicine) => {
    if (!medicine || medicine.asNeeded || medicine.type === 'injection') return '-';
    
    const dosage = medicine.dosage || {};
    const dosagePerDay = 
      (parseFloat(dosage.m) || 0) +
      (parseFloat(dosage.n) || 0) +
      (parseFloat(dosage.e) || 0) +
      (parseFloat(dosage.n2) || 0);
    
    let durationInDays = parseInt(medicine.duration) || 0;
    if (medicine.durationType === 'weeks') {
      durationInDays *= 7;
    } else if (medicine.durationType === 'months') {
      durationInDays *= 30;
    }
    
    return Math.ceil(dosagePerDay * durationInDays) || '-';
  };

  const getMedicineTypeBadge = (type) => {
    const badges = {
      injection: { label: 'Injection', color: '#ef4444' },
      syrup: { label: 'Syrup', color: '#8b5cf6' },
      pills: { label: 'Tablets', color: '#3b82f6' },
      tablets: { label: 'Tablets', color: '#3b82f6' },
      ointment: { label: 'Ointment', color: '#10b981' }
    };
    
    const badge = badges[type?.toLowerCase()] || { label: type || 'N/A', color: '#6b7280' };
    return badge;
  };

  if (loading) {
    if (autoPreviewPdf) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          color: '#111827',
          fontSize: '16px'
        }}>
          Preparing PDF preview...
        </div>
      );
    }

    return (
      <div className="prescription-container">
        <div className="prescription-form">
          <div className="loading-container">
            <p>Loading prescription...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    if (autoPreviewPdf) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          color: '#b91c1c',
          fontSize: '16px',
          padding: '20px',
          textAlign: 'center'
        }}>
          {error || 'Prescription not found'}
        </div>
      );
    }

    return (
      <div className="prescription-container">
        <div className="prescription-form">
          <div className="error-container">
            <h3>Error</h3>
            <p>{error || 'Prescription not found'}</p>
            <button onClick={handleBackToDashboard} className="dashboard-back">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate validity info
  const issuedOn = (() => {
    const base = prescription.prescriptionDate || prescription.patientData?.date || prescription.createdAt;
    const parsed = base ? new Date(base) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  })();

  const getValidityInfo = () => {
    const medicines = prescription.medicines || [];
    const maxDurationDays = medicines.reduce((max, med) => {
      if (!med || med.asNeeded) return max;
      const parsed = parseInt(med.duration, 10);
      if (Number.isNaN(parsed)) return max;
      let days = parsed;
      if (med.durationType === 'weeks') days *= 7;
      else if (med.durationType === 'months') days *= 30;
      else if (med.durationType === 'everyVisit') days = 0;
      if (med.type === 'injection') days = 0;
      return Math.max(max, days);
    }, 0);

    if (maxDurationDays === 0) {
      return { maxDurationDays: 0, validUntil: null };
    }

    const validUntil = new Date(issuedOn);
    validUntil.setDate(validUntil.getDate() + maxDurationDays);
    return { maxDurationDays, validUntil };
  };

  const { maxDurationDays, validUntil } = getValidityInfo();

  return (
    <div
      className="prescription-container"
      style={autoPreviewPdf ? { background: '#ffffff', display: 'block', padding: 0 } : undefined}
    >
      {!autoPreviewPdf && (
      <div className="prescription-form">
        {/* Back to Dashboard Button */}
        <button
          onClick={handleBackToDashboard}
          className="dashboard-back"
          type="button"
        >
          ← Back to Dashboard
        </button>

        <div className="logo-container">
          <img
            src="/logo.png"
            alt="Dental Clinic Logo"
            className="logo"
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
            onError={(e) => {
              console.error('Logo failed to load');
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />

          <h2 className="clinic-name">SRM Dental College</h2>
          <p className="prescription-label">Prescription</p>
        </div>

        <form className="form">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Patient Name:</label>
              <input
                type="text"
                value={prescription.patientData?.name || ''}
                className="form-input"
                readOnly
              />
            </div>
            <div className="form-field">
              <label className="form-label">Age:</label>
              <input
                type="number"
                value={prescription.patientData?.age || ''}
                className="form-input"
                min="0"
                readOnly
              />
            </div>
            <div className="form-field">
              <label className="form-label">Gender:</label>
              <select
                value={prescription.patientData?.gender || ''}
                className="form-input"
                disabled
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Date:</label>
              <input
                type="date"
                value={prescription.patientData?.date ? new Date(prescription.patientData.date).toISOString().split('T')[0] : ''}
                className="form-input"
                readOnly
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Symptoms:</label>
            <textarea
              value={prescription.symptoms || ''}
              className="form-textarea"
              rows="2"
              readOnly
            />
          </div>

          <div className="form-field">
            <label className="form-label">Diagnosis:</label>
            <textarea
              value={prescription.diagnosis || ''}
              className="form-textarea"
              rows="2"
              readOnly
            />
          </div>

          <div className="form-field">
            <label className="form-label">Prescribed Medicines:</label>
            <div className="medicine-table-wrapper">
              <table className="medicine-table">
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Type</th>
                    <th>Medicine Name</th>
                    <th>
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
                    <th>Food</th>
                    <th>Duration</th>
                    <th>As Needed</th>
                  </tr>
                </thead>
                <tbody>
                  {prescription.medicines && prescription.medicines.length > 0 ? (
                    prescription.medicines.map((medicine, index) => (
                      <tr key={index} className="medicine-row">
                        <td className="serial-no-cell">{index + 1}</td>
                        <td>
                          <span style={{ textTransform: 'capitalize' }}>{medicine.type === 'pills' ? 'Tablets' : (medicine.type || '-')}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold' }}>
                            {medicine.name || '-'}
                          </div>
                        </td>
                        <td className="dosage-cell" style={{ textAlign: 'center' }}>
                          <div className="dosage-values-row">
                            <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.m || '0')}</span>
                            <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.n || '0')}</span>
                            <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.e || '0')}</span>
                            <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.n2 || '0')}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {medicine.type === 'injection' ? '-' : (medicine.foodIntake === 'after' ? 'After' : 'Before')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {formatDuration(medicine)}
                        </td>
                        <td className="as-needed-cell" style={{ textAlign: 'center' }}>
                          {medicine.asNeeded ? 'Yes' : 'No'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="no-medicines">
                      <td colSpan="7" className="text-center">
                        No medicines prescribed
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Advice:</label>
            <textarea
              value={prescription.advice || ''}
              className="form-textarea"
              rows="2"
              readOnly
            />
          </div>

          <div className="form-field">
            <label className="form-label">Next Visit Appointment:</label>
            {prescription.nextVisitDate ? (
              <input
                type="text"
                value={`${new Date(prescription.nextVisitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${prescription.nextVisitTime || 'N/A'}`}
                className="form-input"
                readOnly
              />
            ) : (
              <input
                type="text"
                value="No appointment scheduled"
                className="form-input"
                readOnly
              />
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleViewPdf}
              className="print-btn"
              disabled={isPdfProcessing}
            >
              View PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="print-btn"
              disabled={isPdfProcessing}
              title="Download the PDF"
            >
              {isPdfProcessing ? 'Preparing PDF...' : 'Download PDF'}
            </button>
          </div>
        </form>
      </div>
      )}

      {autoPreviewPdf && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#111827',
          fontSize: '16px'
        }}>
          Preparing PDF preview...
        </div>
      )}

      {/* Print View - Same format as prescription.jsx */}
      <div
        className="print-only"
        style={autoPreviewPdf ? { display: 'block', visibility: 'visible', position: 'fixed', left: '-10000px', top: 0 } : undefined}
      >
        <div className="print-page" style={{
          maxWidth: '210mm',
          width: '210mm',
          height: 'auto',
          margin: '0 auto',
          padding: '20px',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box'
        }}>
          {/* Watermark */}
          <div className="watermark print-watermark">
            <img src="/images/logo2.png" alt="watermark" loading="eager" crossOrigin="anonymous" />
          </div>

          {/* Header with Logo */}
          <div className="print-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            borderBottom: '2px solid #000',
            paddingBottom: '10px',
            marginBottom: '15px'
          }}>
            <div className="print-header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto' }}>
              <img 
                src="/images/logo2.png" 
                alt="SRM Logo" 
                className="print-header-logo"
                loading="eager"
                crossOrigin="anonymous"
                style={{ width: '72px', height: '72px', objectFit: 'contain', flexShrink: 0 }}
              />
              <div className="print-header-title-wrap" style={{ textAlign: 'left' }}>
                <h2 style={{ margin: '0', fontSize: '40px', lineHeight: '1.05', fontWeight: 'bold' }}>
                  SRM Dental College
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
                  Ramapuram, Chennai - 600089
                </p>
              </div>
            </div>
            
            <div className="print-header-right" style={{ textAlign: 'right', fontSize: '10px' }}>
              <div><strong>SRM Dental College Hospital</strong></div>
              <div>Ramapuram, Chennai - 600089</div>
              <div>Contact: +91 44-2249-0526</div>
              <div>Email: info@srmdental.ac.in</div>
            </div>
          </div>

          {/* Doctor Info */}
          <div style={{ marginBottom: '12px', borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>
              {prescription.doctorName || prescription.doctorInfo?.name || 'Dr. Parvin'}, BDS, MDS (Periodontics)
            </h3>
            <p style={{ margin: '0', fontSize: '10px' }}>
              Reg No: {prescription.doctorId || 'DCI/93030'}
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
                <strong>Name:</strong> {prescription.patientData?.name}, {prescription.patientData?.gender}, {prescription.patientData?.age} Yrs
              </p>
              <p style={{ margin: '2px 0' }}>
                <strong>Mobile:</strong> +91-9876543210
              </p>
              <p style={{ margin: '2px 0' }}>
                <strong>Patient ID:</strong> {prescription.patientId || 'A00123567'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '2px 0' }}>
                <strong>Date:</strong> {issuedOn.toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
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
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '31%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
                  <th>S.No</th>
                  <th>Type</th>
                  <th>Medicine Name</th>
                  <th>
                    <div className="dosage-header">
                      <div>Dosage</div>
                      <div className="dosage-label-row dosage-header-labels">
                        <span>M</span>
                        <span>N</span>
                        <span>E</span>
                        <span>Nt</span>
                      </div>
                    </div>
                  </th>
                  <th>Food Intake</th>
                  <th>Duration</th>
                  <th>Total Qty</th>
                  <th>As Needed</th>
                </tr>
              </thead>
              <tbody>
                {prescription.medicines && prescription.medicines.length > 0 ? (
                  prescription.medicines.map((medicine, index) => {
                    return (
                      <tr key={index}>
                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ textTransform: 'capitalize' }}>{medicine.type === 'pills' ? 'Tablets' : (medicine.type || '-')}</td>
                        <td>
                          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                            {(medicine.name || '').toUpperCase()}
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>
                      No medicines prescribed
                    </td>
                  </tr>
                )}
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
              {prescription.nextVisitDate && (
                <li><strong>Follow up in 2 weeks or as advised.</strong></li>
              )}
              {prescription.advice && prescription.advice.split('\n').filter(line => line.trim()).map((line, idx) => (
                <li key={idx}>{line.trim()}</li>
              ))}
            </ul>
          </div>

          {/* Next Visit */}
          {prescription.nextVisitDate && (
            <div style={{ marginBottom: '15px', fontSize: '11px' }}>
              <p style={{ margin: '0' }}>
                <strong>Next Visit:</strong> {new Date(prescription.nextVisitDate).toLocaleDateString('en-GB')}
                {prescription.nextVisitTime && ` at ${prescription.nextVisitTime}`}
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
              {prescription.doctorSignature && (
                <div style={{ marginBottom: '5px' }}>
                  <img 
                    src={prescription.doctorSignature} 
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
                (Signature of {prescription.doctorName || prescription.doctorInfo?.name || 'Dr. Parvin'})
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
              <strong>Disclaimer:</strong> This prescription was generated digitally by SRM Dental College on {issuedOn.toLocaleDateString('en-IN')}. It is valid until {validUntil ? validUntil.toLocaleDateString('en-IN') : 'N/A'} based on the longest prescribed duration ({maxDurationDays || 0} days from issue). Kindly consult a doctor for further advice if symptoms persist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionView;
