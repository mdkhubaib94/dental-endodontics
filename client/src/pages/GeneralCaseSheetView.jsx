import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './generalCaseSheet.css';
import { API_BASE_URL } from '../config/api';

const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const normalizeXraySrc = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return raw;
  return `data:image/jpeg;base64,${raw}`;
};

const pickLatestByTimestamp = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;
  return [...list].sort((a, b) => {
    const aTime = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
    const bTime = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
    return bTime - aTime;
  })[0];
};

const GeneralCaseSheetView = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const patientId = String(params.get('patientId') || '').trim();
  const patientName = String(params.get('patientName') || '').trim();
  const caseId = String(params.get('caseId') || '').trim();
  const department = String(params.get('department') || '').trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generalCase, setGeneralCase] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!patientId) {
        setError('Patient ID missing.');
        setGeneralCase(null);
        return;
      }

      setLoading(true);
      setError('');
      setGeneralCase(null);

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(buildApiUrl(`/api/general/patient/${encodeURIComponent(patientId)}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.status === 401) {
          localStorage.clear();
          navigate('/login', { replace: true });
          return;
        }

        const json = await res.json().catch(() => null);
        const success = json?.success !== false;
        const rows = Array.isArray(json?.data) ? json.data : [];

        if (!res.ok || !success) {
          throw new Error(json?.message || `Failed to load General Case Sheet (${res.status})`);
        }

        const latest = pickLatestByTimestamp(rows);
        if (!latest) {
          throw new Error('No General Case Sheet found for this patient.');
        }

        if (!cancelled) {
          setGeneralCase(latest);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load General Case Sheet.');
          setGeneralCase(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [patientId, navigate]);

  const titlePatientName = patientName || generalCase?.patientName || '—';

  const selectedDepartments = Array.isArray(generalCase?.selectedDepartments)
    ? generalCase.selectedDepartments
    : [];

  const hasTreatmentPlan = Boolean(String(generalCase?.treatmentPlan || '').trim());

  const allDepartments = [
    'Prosthodontics',
    'Pedodontics',
    'Periodontics',
    'Conservative Dentistry and Endodontics',
    'Oral and Maxillofacial',
  ];

  useEffect(() => {
    if (patientId) {
      localStorage.setItem('CurrentpatientId', patientId);
    }
    if (titlePatientName && titlePatientName !== '—') {
      localStorage.setItem('CurrentpatientName', titlePatientName);
    }
  }, [patientId, titlePatientName]);

  const handleBack = () => {
    try {
      if (window.opener) {
        window.close();
        return;
      }
    } catch {
      // ignore
    }
    navigate(-1);
  };

  const openDepartmentCaseSheet = () => {
    if (!caseId) return;
    localStorage.setItem('departmentCaseSheetOpenedForCaseId', caseId);
    if (department) {
      localStorage.setItem('viewCaseDepartment', department);
    }
    window.open(`/case-sheet-view/${caseId}`, '_blank');
  };

  return (
    <div className="general-case-sheet">
      {/* GENERAL INFORMATION SECTION */}
      <div className="general-case-container" style={{ position: 'relative' }}>
        {(titlePatientName && titlePatientName !== '—') || patientId ? (
          <div
            style={{
              position: 'absolute',
              left: '20px',
              top: '20px',
              padding: '8px 15px',
              backgroundColor: 'rgba(38, 40, 107, 0.95)',
              borderRadius: '4px',
              fontSize: '0.8em',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              textAlign: 'left',
              whiteSpace: 'nowrap',
            }}
          >
            <div><strong>{titlePatientName}</strong></div>
            {patientId ? <div><strong>ID:</strong> {patientId}</div> : null}
            {department ? <div><strong>Dept:</strong> {department}</div> : null}
          </div>
        ) : null}

        <div className="general-case-logo-container">
          <img src="/logo.png" alt="Logo" className="general-case-logo" />
        </div>

        <h1 className="general-case-h1">GENERAL INFORMATION</h1>

        {loading ? (
          <div className="general-case-output">
            <h2>Loading...</h2>
          </div>
        ) : error ? (
          <div className="general-case-output">
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        ) : generalCase ? (
          Object.entries({
            chiefComplaint: 'Chief Complaint',
            presentIllness: 'History of Present Illness',
            pastMedical: 'Past Medical History',
            pastDental: 'Past Dental History',
            personalHistory: 'Personal History',
            familyHistory: 'Family History',
          }).map(([id, label]) => (
            <div className="general-case-form-group" key={id}>
              <label className="general-case-label">{label}:</label>
              <textarea
                id={id}
                className="general-case-textarea"
                value={generalCase?.[id] || ''}
                readOnly
                rows="4"
              />
            </div>
          ))
        ) : null}
      </div>

      {/* CLINICAL FINDINGS SECTION */}
      <div className="general-case-container">
        <h1 className="general-case-h1">CLINICAL FINDINGS</h1>

        <div className="general-case-form-group">
          <label className="general-case-label">Enter Clinical Findings:</label>
          <textarea
            id="clinicalFindings"
            className="general-case-textarea"
            value={generalCase?.clinicalFindings || ''}
            readOnly
            rows="10"
          />
        </div>
      </div>

      {/* DIAGNOSIS AND INVESTIGATIONS SECTION */}
      <div className="general-case-container">
        <h1 className="general-case-h1">DIAGNOSIS AND INVESTIGATIONS</h1>

        {Object.entries({
          provisionalDiagnosis: 'Provisional Diagnosis',
          investigations: 'Investigations',
          finalDiagnosis: 'Final Diagnosis',
        }).map(([id, label]) => (
          <div className="general-case-form-group" key={id}>
            <label className="general-case-label">{label}:</label>
            <textarea
              id={id}
              className="general-case-textarea"
              value={generalCase?.[id] || ''}
              readOnly
              rows="4"
            />
          </div>
        ))}

        {/* X-RAY VIEW SECTION (same UI wrapper) */}
        <div className="general-case-xray-upload-container">
          <div className="general-case-xray-upload-box">
            <h2>Upload X-Ray Image</h2>

            <div className="general-case-file-input-section">
              <div className="general-case-file-input-wrapper">
                <label className="general-case-label">Choose X-Ray Image:</label>
                <input
                  type="file"
                  className="general-case-file-input"
                  disabled
                />
              </div>

              <button type="button" className="general-case-upload-button" disabled>
                Upload Image
              </button>
            </div>

            {String(generalCase?.xrayImage || '').trim() ? (
              <div className="general-case-image-preview">
                <h3>Image Preview</h3>
                <div className="general-case-preview-container">
                  <img
                    src={normalizeXraySrc(generalCase?.xrayImage)}
                    alt="X-Ray Preview"
                    className="general-case-preview-image"
                  />
                </div>
              </div>
            ) : (
              <div className="general-case-output" style={{ marginTop: 16 }}>
                <h2>X-Ray</h2>
                <p>No X-ray uploaded</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TREATMENT PLAN SECTION */}
      <div className="general-case-container">
        <div className="general-case-main-heading">TREATMENT PLAN</div>

        <div className="general-case-heading">Select Case Sheet</div>

        <div className="general-case-checkbox-group-list">
          {allDepartments.map((dept) => (
            <label key={dept} className="general-case-checkbox-item">
              <input
                type="checkbox"
                checked={selectedDepartments.includes(dept)}
                readOnly
                disabled
              />
              {dept}
            </label>
          ))}
        </div>

        <div className="general-case-form-group">
          <label className="general-case-label">Description:</label>
          <textarea
            id="description"
            className="general-case-textarea"
            value={generalCase?.description || ''}
            readOnly
            rows="4"
          />
        </div>

        {selectedDepartments.includes('General') ? (
          <div className="general-case-form-group">
            <label className="general-case-label">General Description:</label>
            <textarea
              id="generalDescription"
              className="general-case-textarea"
              value={generalCase?.generalDescription || ''}
              readOnly
              rows="4"
            />
          </div>
        ) : null}

        {selectedDepartments.length > 0 ? (
          <div className="general-case-selected-case">
            Selected Departments: {selectedDepartments.join(', ')}
          </div>
        ) : null}

        <div className="general-case-checkbox-group">
          <input
            type="checkbox"
            id="enableTreatment"
            checked={hasTreatmentPlan}
            readOnly
            disabled
          />
          <label className="general-case-label">
            I confirm my selections and want to enter the Treatment Plan
          </label>
        </div>
      </div>

      {/* TREATMENT PLAN ENTRY SECTION (Only shown when enabled) */}
      {hasTreatmentPlan ? (
        <div className="general-case-container">
          <div className="general-case-heading">Enter Treatment Plan</div>

          <div className="general-case-form-group">
            <textarea
              id="treatmentPlan"
              className="general-case-textarea"
              value={generalCase?.treatmentPlan || ''}
              readOnly
              rows="10"
            />
          </div>
        </div>
      ) : null}

      <div
        className="general-case-flex general-case-justify-center general-case-mt-4"
        style={{ gap: 12, flexWrap: 'wrap', marginBottom: 24 }}
      >
        <button type="button" className="general-case-button" onClick={handleBack}>
          Back
        </button>

        {caseId ? (
          <button type="button" className="general-case-button" onClick={openDepartmentCaseSheet}>
            Department Case Sheet
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default GeneralCaseSheetView;
