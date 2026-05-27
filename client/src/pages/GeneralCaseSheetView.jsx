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

const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '');

const GeneralCaseSheetView = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const patientId = String(params.get('patientId') || '').trim();
  const patientName = String(params.get('patientName') || '').trim();
  const caseId = String(params.get('caseId') || '').trim();
  const department = String(params.get('department') || '').trim();
  const contextDepartment = String(
    localStorage.getItem('ugDepartment') ||
    localStorage.getItem('pgDepartment') ||
    localStorage.getItem('doctorDepartment') ||
    ''
  ).trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generalCase, setGeneralCase] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!patientId) {
        setError('Patient ID missing.');
        setGeneralCase(null);
        setPatientDetails(null);
        return;
      }

      setLoading(true);
      setError('');
      setGeneralCase(null);
      setPatientDetails(null);

      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [generalRes, patientRes] = await Promise.all([
          fetch(buildApiUrl(`/api/general/patient/${encodeURIComponent(patientId)}`), { headers }),
          fetch(buildApiUrl(`/api/patient-details/by-patient-id/${encodeURIComponent(patientId)}`), { headers }),
        ]);

        if (generalRes.status === 401 || patientRes.status === 401) {
          localStorage.clear();
          navigate('/login', { replace: true });
          return;
        }

        const json = await generalRes.json().catch(() => null);
        const patientJson = await patientRes.json().catch(() => null);
        const success = json?.success !== false;
        const rows = Array.isArray(json?.data) ? json.data : [];
        const patientSuccess = patientJson?.success !== false;

        if (!generalRes.ok || !success) {
          throw new Error(json?.message || `Failed to load General Case Sheet (${generalRes.status})`);
        }

        const requestedCase = caseId
          ? rows.find((row) => String(row?._id || '').trim() === caseId)
          : null;
        const latest = requestedCase || pickLatestByTimestamp(rows);
        if (!latest) {
          throw new Error('No General Case Sheet found for this patient.');
        }

        if (!cancelled) {
          setGeneralCase(latest);
          if (patientRes.ok && patientSuccess) {
            setPatientDetails(patientJson?.data || patientJson?.patient || null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load General Case Sheet.');
          setGeneralCase(null);
          setPatientDetails(null);
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

  const referredDepartment = String(
    generalCase?.referredDepartment ||
    selectedDepartments[0] ||
    department ||
    contextDepartment ||
    ''
  ).trim();
  const departmentKey = normalizeDepartment(referredDepartment);
  const isPublicHealthDentistry =
    departmentKey.includes('publichealthdentistry') ||
    departmentKey.includes('publichealth') ||
    departmentKey.includes('communitydentistry');

  const hasTreatmentPlan = Boolean(String(generalCase?.treatmentPlan || '').trim());

  const patientAge = String(
    patientDetails?.personalInfo?.age ||
    generalCase?.patientAge ||
    generalCase?.personalInfo?.age ||
    generalCase?.age ||
    ''
  ).trim();
  const patientGender = String(
    patientDetails?.personalInfo?.gender ||
    generalCase?.personalInfo?.gender ||
    generalCase?.gender ||
    ''
  ).trim();
  const venueName = String(
    patientDetails?.institutionInfo?.institutionName ||
    generalCase?.institutionInfo?.institutionName ||
    generalCase?.venueName ||
    ''
  ).trim();
  const doctorDisplayName = String(
    generalCase?.generalDoctorName ||
    generalCase?.doctorName ||
    patientDetails?.doctorName ||
    ''
  ).trim();
  const diagnosisText = String(
    generalCase?.finalDiagnosis ||
    generalCase?.provisionalDiagnosis ||
    generalCase?.chiefComplaint ||
    generalCase?.description ||
    ''
  ).trim();
  const treatmentPlanText = String(generalCase?.treatmentPlan || '').trim();

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

  if (isPublicHealthDentistry) {
    return (
      <div className="general-case-sheet phd-print-page">
        <div className="phd-sheet-shell">
          <div className="phd-sheet-header">
            <div className="phd-sheet-sn">Sl.No.: C {patientId ? patientId.replace(/\D+/g, '') || patientId : '—'}</div>
            <div className="phd-sheet-title-block">
              <h1>DENTAL CAMP</h1>
              <h2>DEPARTMENT OF PUBLIC HEALTH DENTISTRY</h2>
            </div>
          </div>

          <div className="phd-sheet-grid">
            <div className="phd-field phd-field-wide">
              <span className="phd-label">Name of the Venue</span>
              <span className="phd-value">{venueName || '—'}</span>
            </div>
            <div className="phd-field">
              <span className="phd-label">Date</span>
              <span className="phd-value">{generalCase?.createdAt ? new Date(generalCase.createdAt).toLocaleDateString('en-GB') : '—'}</span>
            </div>

            <div className="phd-field phd-field-wide">
              <span className="phd-label">Name of the Patient</span>
              <span className="phd-value">{titlePatientName}</span>
            </div>
            <div className="phd-field">
              <span className="phd-label">Age</span>
              <span className="phd-value">{patientAge || '—'}</span>
            </div>
            <div className="phd-field">
              <span className="phd-label">Sex</span>
              <span className="phd-value">{patientGender || '—'}</span>
            </div>

            <div className="phd-field phd-field-wide phd-field-stack">
              <span className="phd-label">Diagnosis</span>
              <div className="phd-box">{diagnosisText || '—'}</div>
            </div>

            <div className="phd-field phd-field-wide phd-field-stack">
              <span className="phd-label">Treatment Plan</span>
              <div className="phd-box phd-treatment-box">{treatmentPlanText || '—'}</div>
            </div>

            <div className="phd-signature-row">
              <div className="phd-signature-name">{doctorDisplayName || '—'}</div>
              <div className="phd-signature-line" />
              <div className="phd-signature-label">Doctors Name</div>
            </div>
          </div>
        </div>

        <div className="general-case-flex general-case-justify-center general-case-mt-4" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <button type="button" className="general-case-button" onClick={handleBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

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
