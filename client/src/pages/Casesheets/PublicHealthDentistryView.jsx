import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../generalCaseSheet.css';

/**
 * PublicHealthDentistryView
 *
 * Standalone view for the Public Health Dentistry (PHD) dental camp case sheet.
 * Accepts all required data as props so it can be embedded anywhere or rendered
 * directly from a route.
 *
 * Props:
 *   patientId        {string}
 *   titlePatientName {string}
 *   patientAge       {string}
 *   patientGender    {string}
 *   venueName        {string}
 *   doctorDisplayName{string}
 *   diagnosisText    {string}
 *   treatmentPlanText{string}
 *   generalCase      {object}  – raw case object (used for createdAt date)
 *   onBack           {function} – optional override for the Back button handler
 */
const PublicHealthDentistryView = ({
  patientId = '',
  titlePatientName = '—',
  patientAge = '',
  patientGender = '',
  venueName = '',
  doctorDisplayName = '',
  diagnosisText = '',
  treatmentPlanText = '',
  generalCase = null,
  onBack,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    try {
      if (window.opener) {
        window.close();
        return;
      }
    } catch {
      // ignore cross-origin errors
    }
    navigate(-1);
  };

  const serialNumber = patientId ? patientId.replace(/\D+/g, '') || patientId : '—';
  const dateDisplay = generalCase?.createdAt
    ? new Date(generalCase.createdAt).toLocaleDateString('en-GB')
    : '—';

  return (
    <div className="general-case-sheet phd-print-page">
      <div className="phd-sheet-shell">
        {/* ── Header ── */}
        <div className="phd-sheet-header">
          <div className="phd-sheet-sn">Sl.No.: C {serialNumber}</div>
          <div className="phd-sheet-title-block">
            <h1>DENTAL CAMP</h1>
            <h2>DEPARTMENT OF PUBLIC HEALTH DENTISTRY</h2>
          </div>
        </div>

        {/* ── Data Grid ── */}
        <div className="phd-sheet-grid">
          {/* Venue */}
          <div className="phd-field phd-field-wide">
            <span className="phd-label">Name of the Venue</span>
            <span className="phd-value">{venueName || '—'}</span>
          </div>

          {/* Date */}
          <div className="phd-field">
            <span className="phd-label">Date</span>
            <span className="phd-value">{dateDisplay}</span>
          </div>

          {/* Patient Name */}
          <div className="phd-field phd-field-wide">
            <span className="phd-label">Name of the Patient</span>
            <span className="phd-value">{titlePatientName}</span>
          </div>

          {/* Age */}
          <div className="phd-field">
            <span className="phd-label">Age</span>
            <span className="phd-value">{patientAge || '—'}</span>
          </div>

          {/* Sex */}
          <div className="phd-field">
            <span className="phd-label">Sex</span>
            <span className="phd-value">{patientGender || '—'}</span>
          </div>

          {/* Diagnosis */}
          <div className="phd-field phd-field-wide phd-field-stack">
            <span className="phd-label">Diagnosis</span>
            <div className="phd-box">{diagnosisText || '—'}</div>
          </div>

          {/* Treatment Plan */}
          <div className="phd-field phd-field-wide phd-field-stack">
            <span className="phd-label">Treatment Plan</span>
            <div className="phd-box phd-treatment-box">{treatmentPlanText || '—'}</div>
          </div>

          {/* Doctor Signature */}
          <div className="phd-signature-row">
            <div className="phd-signature-name">{doctorDisplayName || '—'}</div>
            <div className="phd-signature-line" />
            <div className="phd-signature-label">Doctors Name</div>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div
        className="general-case-flex general-case-justify-center general-case-mt-4"
        style={{ gap: 12, flexWrap: 'wrap', marginBottom: 24 }}
      >
        <button type="button" className="general-case-button" onClick={handleBack}>
          Back
        </button>
      </div>
    </div>
  );
};

export default PublicHealthDentistryView;
