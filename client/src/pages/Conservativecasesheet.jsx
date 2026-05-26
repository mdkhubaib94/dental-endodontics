import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './conservativeCaseSheet.css';
import './Login.css'; // reuse exact login theme
import { API_BASE_URL } from '../config/api';

const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';


const ConservativeCaseSheet = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Post-entry consent prompt
  useEffect(() => {
    if (location.state?.requestConsentAfterEntry && !location.state?.[CASE_CONSENT_NAV_STATE_KEY]) {
      const confirmed = window.confirm('Please complete the consent form before proceeding. Click OK to open the consent form.');
      if (confirmed) {
        navigate(`/consent-form?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      }
    }
  }, []);

  const initialData = {
    regNo: '',
    id: '',
    caseNo: '',
    name: '',
    date: '',
    contact: '',
    ageSex: '',
    address: '',
    chiefComplaint: '',
    presentIllness: '',
    drugAllergies: '',
    pastMedical: [],
    familyHistory: '',
    pastDental: '',
    habits: [],
    extraOral: { tmj: '', lymphNode: '', swellingSinus: '' },
    intraOral: { softTissue: '', swellingSinus: '', hardTissue: '', hygieneStatus: '', calculusNote: '' },
    quadrants: [
      { name: '1st QUADRANT', details: '' },
      { name: '2nd QUADRANT', details: '' },
      { name: '3rd QUADRANT', details: '' },
      { name: '4th QUADRANT', details: '' }
    ],
    provisionalDiagnosis: '',
    differentialDiagnosis: [],
    finalDiagnosis: '',
    prognosis: '',
    criticalMedicalIllness: '',
    staffSignature: '',
    referral: '',
    investigationsDetail: { pulpTesting: { thermalTest: '', ept: '' }, radiographic: '' },
    periodontalAssessment: '',
    occlusalAssessment: '',
    treatments: [],
    followUpPlan: '',
    nextFollowUp: ''
  };

  const [form, setForm] = useState(initialData);
  const [treatments, setTreatments] = useState(initialData.treatments);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [allergyMessage, setAllergyMessage] = useState('None');
  const [showAllergy, setShowAllergy] = useState(true);

  const handleFileChange = (file) => {
    setSignatureFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSignaturePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setSignaturePreview(null);
    }
  };
  const [patientAllergyData, setPatientAllergyData] = useState({ drug: '', known: '', diet: '' });
  const [treatmentPictures, setTreatmentPictures] = useState([]);
  const navigateToPrescriptions = () => {
    window.location.href = '/prescriptions';
  };

  // Small standalone banner component rendered via portal so it is outside all layout wrappers
  const DrugAllergyBanner = ({ drug, onClose }) => {
    return (
      <div className="allergy-alert show" id="patientAllergyAlert" role="status" aria-live="polite">
        <div className="allergy-inner">
          <span className="alert-icon">⚠️</span>
          <div className="allergy-flow-window">
            <span id="allergyMessage">{`Drug Allergies: ${drug}`}</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close allergy alert" style={{ marginLeft: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}>✖</button>
        </div>
      </div>
    );
  };

  const handleSessionExpired = (apiMessage) => {
    const normalizedMessage = String(apiMessage || '').trim();
    window.alert(normalizedMessage || 'Your session has expired. Please log in again.');
    logout();
  };

  const isSessionExpiredPayload = (response, payload) => {
    const message = String(payload?.message || payload?.error || '').trim().toLowerCase();
    return response?.status === 401 || message === 'token expired' || message.includes('token expired');
  };

  useEffect(() => {
    let cancelled = false;
    const toListString = (value) => {
      if (!value) return '';
      if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean).join(', ');
      return String(value).trim();
    };

    const extractPatient = (result) => {
      if (!result) return null;
      if (Array.isArray(result?.data)) return result.data[0] || null;
      if (result?.data) return result.data;
      if (Array.isArray(result?.patient)) return result.patient[0] || null;
      if (result?.patient) return result.patient;
      return null;
    };

    const fetchAllergies = async (attempt = 0) => {
      const patientId = String(
        localStorage.getItem('CurrentpatientId') ||
        localStorage.getItem('currentPatientId') ||
        localStorage.getItem('patientId') ||
        ''
      ).trim();

      if (!patientId) {
        if (attempt < 5 && !cancelled) {
          setTimeout(() => fetchAllergies(attempt + 1), 400);
        } else if (!cancelled) {
          setAllergyMessage('None');
        }
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/patient-details/by-patient-id/${encodeURIComponent(patientId)}`);
        if (!res.ok) {
          if (!cancelled) setAllergyMessage('None');
          return;
        }
        const raw = await res.text().catch(() => null);
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch (e) { json = null; }
        const p = extractPatient(json);
        if (!p) {
          if (attempt < 2 && !cancelled) setTimeout(() => fetchAllergies(attempt + 1), 500);
          else if (!cancelled) setAllergyMessage('None');
          return;
        }

        const drug = toListString(p.vitals?.drugAllergies);
        const known = toListString(p.medicalInfo?.knownAllergies);
        const diet = toListString(p.vitals?.dietAllergies);

        if (!cancelled) {
          setPatientAllergyData({ drug: drug || '', known: known || '', diet: diet || '' });
          setAllergyMessage(drug || known || diet || 'None');
        }
      } catch (e) {
        if (!cancelled) setAllergyMessage('None');
      }
    };

    fetchAllergies();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const readPatientId = () => String(
      localStorage.getItem('CurrentpatientId') ||
      localStorage.getItem('currentPatientId') ||
      localStorage.getItem('patientId') ||
      ''
    ).trim();

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchGeneralCase = async (patientId) => {
      try {
        console.log('[ConservativeCaseSheet] fetching general case for', patientId);
        const res = await fetch(`${API_BASE_URL}/api/general/patient/${encodeURIComponent(patientId)}`, { headers });
        console.log('[ConservativeCaseSheet] general case response status', res.status);
        const raw = await res.text().catch(() => null);
        console.log('[ConservativeCaseSheet] general case raw response:', raw);
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch (e) { json = null; console.error('JSON parse error (general case):', e); }
        console.log('[ConservativeCaseSheet] general case json', json);
        if (res.status === 401 || String(json?.message || '').toLowerCase().includes('token expired')) {
          handleSessionExpired(json?.message || 'Token expired');
          return;
        }
        if (!res.ok || !json?.success || !Array.isArray(json.data) || json.data.length === 0) return;
        const latest = json.data[0];
        if (cancelled) return;

        let parsedPastMedical = [];
        if (Array.isArray(latest.pastMedical)) parsedPastMedical = latest.pastMedical;
        else if (typeof latest.pastMedical === 'string' && latest.pastMedical.trim()) parsedPastMedical = latest.pastMedical.split(/[\\\/+_,;|]+/).map(s => s.trim()).filter(Boolean);

        let parsedHabits = [];
        if (Array.isArray(latest.habits)) parsedHabits = latest.habits;
        else if (typeof latest.habits === 'string' && latest.habits.trim()) parsedHabits = latest.habits.split(/[\\\/+_,;|]+/).map(s => s.trim()).filter(Boolean);

        setForm(prev => ({
          ...prev,
          regNo: latest.patientId || prev.regNo,
          name: latest.patientName || prev.name,
          chiefComplaint: latest.chiefComplaint || prev.chiefComplaint,
          presentIllness: latest.presentIllness || prev.presentIllness,
          familyHistory: latest.familyHistory || prev.familyHistory,
          pastMedical: parsedPastMedical.length ? parsedPastMedical : prev.pastMedical,
          pastDental: latest.pastDental || prev.pastDental,
          habits: parsedHabits.length ? parsedHabits : prev.habits,
          provisionalDiagnosis: latest.provisionalDiagnosis || prev.provisionalDiagnosis,
          investigations: latest.investigations || prev.investigations,
          finalDiagnosis: latest.finalDiagnosis || prev.finalDiagnosis,
          treatmentPlan: latest.treatmentPlan || prev.treatmentPlan,
          date: latest.createdAt ? new Date(latest.createdAt).toLocaleDateString() : prev.date
        }));
        // hydrate any existing treatment pictures for edit/view
        if (Array.isArray(latest.treatmentPictures) && latest.treatmentPictures.length) {
          setTreatmentPictures(latest.treatmentPictures.map(p => ({ fileName: p.fileName || '', dataUrl: p.dataUrl || p })));
        }
      } catch (err) {
        console.error('Failed to fetch general case for prefill:', err);
      }
    };

    const fetchPatientDetails = async (patientId) => {
      try {
        console.log('[ConservativeCaseSheet] fetching patient details for', patientId);
        const res = await fetch(`${API_BASE_URL}/api/patient-details/by-patient-id/${encodeURIComponent(patientId)}`);
        console.log('[ConservativeCaseSheet] patient details status', res.status);
        if (!res.ok) return;
        const raw = await res.text().catch(() => null);
        console.log('[ConservativeCaseSheet] patient details raw response:', raw);
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch (e) { json = null; console.error('JSON parse error (patient details):', e); }
        console.log('[ConservativeCaseSheet] patient details json', json);
        const patient = json?.data || json?.patient || null;
        if (!patient || cancelled) return;

        const phone = patient?.personalInfo?.phone || '';
        const age = patient?.personalInfo?.age || '';
        const gender = patient?.personalInfo?.gender || '';
        const address = patient?.personalInfo?.address || '';

        setForm(prev => ({
          ...prev,
          contact: phone || prev.contact,
          ageSex: `${age || ''} / ${gender || ''}`.trim(),
          address: address || prev.address
        }));
      } catch (err) {
        console.error('Failed to fetch patient details for prefill:', err);
      }
    };

    const attempt = async () => {
      // wait for patientId to appear (poll up to 5s)
      let patientId = readPatientId();
      const start = Date.now();
      while (!patientId && Date.now() - start < 5000 && !cancelled) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 300));
        patientId = readPatientId();
      }

      if (!patientId) {
        console.warn('[ConservativeCaseSheet] no patientId found in localStorage; skipping prefill');
        return;
      }

      await fetchPatientDetails(patientId);

      // Fetch general case but only if token exists (route requires auth)
      if (token) {
        await fetchGeneralCase(patientId);
      } else {
        console.warn('[ConservativeCaseSheet] no auth token, skipping general case fetch (requires auth)');
      }
    };

    void attempt();

    return () => { cancelled = true; };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  const PAST_MED_HISTORY_OPTIONS = [
    'CNS',
    'ENDOCRINE',
    'DIGESTIVE',
    'RESPIRATORY',
    'CVS',
    'CONGENITAL DISEASE',
    'ALLERGY',
    'OTHER'
  ];

  const HABIT_OPTIONS = [
    'SMOKING',
    'ALCOHOL CONSUMPTION',
    'AERATED BEVERAGES',
    'TOBACCO CHEWING',
    'PAN OR BETEL NUT CHEWING',
    'BRUXISM',
    'THUMB SUCKING',
    'LIP BITING',
    'OTHER'
  ];

  const togglePastMedical = (option) => {
    setForm(prev => {
      const existing = Array.isArray(prev.pastMedical) ? prev.pastMedical : [];
      if (existing.includes(option)) {
        return { ...prev, pastMedical: existing.filter(x => x !== option) };
      }
      return { ...prev, pastMedical: [...existing, option] };
    });
  };

  // Ensure page-level horizontal spacing is removed while the allergy banner is visible
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const rootEl = document.getElementById('root');

    const cls = 'has-drug-allergy-banner';
    const apply = () => {
      try {
        if (htmlEl) htmlEl.classList.add(cls);
        if (bodyEl) bodyEl.classList.add(cls);
        if (rootEl) rootEl.classList.add(cls);
      } catch (e) { /* ignore */ }
    };
    const restore = () => {
      try {
        if (htmlEl) htmlEl.classList.remove(cls);
        if (bodyEl) bodyEl.classList.remove(cls);
        if (rootEl) rootEl.classList.remove(cls);
      } catch (e) { /* ignore */ }
    };

    if (showAllergy && patientAllergyData?.drug) apply();
    return () => { restore(); };
  }, [showAllergy, patientAllergyData?.drug]);

  // Custom dropdown for multi-select with checkbox list
  const PastMedicalDropdown = ({ value, onChange, options }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const [menuRect, setMenuRect] = useState(null);

    useEffect(() => {
      const onDocClick = (e) => {
        if (!ref.current) return;
        if (!ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('click', onDocClick);
      return () => document.removeEventListener('click', onDocClick);
    }, []);

    useEffect(() => {
      if (open && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setMenuRect(rect);
      }
    }, [open]);

    const toggle = (opt) => {
      const existing = Array.isArray(value) ? value : [];
      let next;
      if (existing.includes(opt)) next = existing.filter(x => x !== opt);
      else next = [...existing, opt];
      onChange(next);
    };

    const label = Array.isArray(value) && value.length ? value.join(', ') : '';

    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen(s => !s)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="pm-dropdown-button"
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '8px 10px',
            background: '#f3f5f9',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: '#0b2a66',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', flex: 1 }}>{label}</span>
          <span style={{ marginLeft: 8, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease', color: '#0b2340', fontSize: 12 }}>▾</span>
        </button>

        {open && menuRect && createPortal(
          <div style={{
            position: 'absolute',
            top: menuRect.bottom + window.scrollY + 6,
            left: menuRect.left + window.scrollX,
            width: Math.min(menuRect.width, 520),
            zIndex: 2147483647,
            background: 'white',
            color: '#111',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 8,
            maxHeight: 300,
            overflow: 'auto',
            padding: 8,
            boxShadow: '0 12px 36px rgba(8,24,48,0.5)'
          }}>
            {options.map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', borderRadius: 6, background: '#fff' }}>
                <input type="checkbox" checked={Array.isArray(value) ? value.includes(opt) : false} onChange={() => toggle(opt)} />
                <span style={{ fontSize: 13, color: '#0b2340' }}>{opt}</span>
              </label>
            ))}
          </div>, document.body)}
      </div>
    );
  };

  function handleNestedChange(section, field, value) {
    setForm(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  }

  function updateInvestigationPulp(key, value) {
    setForm(prev => ({
      ...prev,
      investigationsDetail: {
        ...(prev.investigationsDetail || {}),
        pulpTesting: { ...(prev.investigationsDetail?.pulpTesting || {}), [key]: value }
      }
    }));
  }

  function updateInvestigationRadiographic(value) {
    setForm(prev => ({ ...prev, investigationsDetail: { ...(prev.investigationsDetail || {}), radiographic: value } }));
  }

  const addTreatment = () => setTreatments(prev => ([...prev, { date: '', treatment: '', receipt: '', staff: '' }]));
  const removeTreatment = (idx) => setTreatments(prev => prev.filter((_, i) => i !== idx));
  const updateTreatment = (idx, key, value) => setTreatments(prev => prev.map((t, i) => i === idx ? { ...t, [key]: value } : t));

  const updateQuadrant = (idx, value) => setForm(prev => ({ ...prev, quadrants: prev.quadrants.map((q, i) => i === idx ? { ...q, details: value } : q) }));

  // Treatment pictures handlers
  const onTreatmentFiles = async (files) => {
    const list = Array.from(files || []);
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    const toAdd = [];
    for (const f of list) {
      if (!allowed.includes(f.type)) continue;
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      toAdd.push({ fileName: f.name, dataUrl });
    }
    if (toAdd.length) setTreatmentPictures(prev => ([...prev, ...toAdd]));
  };

  const onTreatmentFileInput = (e) => {
    const files = e.target.files; if (!files) return; onTreatmentFiles(files);
    // reset input
    e.target.value = '';
  };

  const removeTreatmentPicture = (idx) => setTreatmentPictures(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!signatureFile) {
        alert('Signature is required to submit the case sheet.');
        return;
      }

      const patientId = String(
        form.regNo ||
        localStorage.getItem('CurrentpatientId') ||
        localStorage.getItem('currentPatientId') ||
        localStorage.getItem('patientId') ||
        ''
      ).trim();
      const patientName = String(
        form.name ||
        localStorage.getItem('CurrentpatientName') ||
        localStorage.getItem('currentPatientName') ||
        localStorage.getItem('patientName') ||
        ''
      ).trim();
      const doctorId = String(
        form.doctorId ||
        localStorage.getItem('doctorId') ||
        ''
      ).trim();
      const doctorName = String(
        form.doctorName ||
        localStorage.getItem('doctorName') ||
        ''
      ).trim();

      if (!patientId || !patientName || !doctorId || !doctorName) {
        alert('Missing patient or doctor information. Please select a patient first.');
        return;
      }

      const formData = new FormData();
      formData.append('patientId', patientId);
      formData.append('patientName', patientName);
      formData.append('doctorId', doctorId);
      formData.append('doctorName', doctorName);
      formData.append('chiefComplaint', form.chiefComplaint || '');
      formData.append('presentIllness', form.presentIllness || '');
      formData.append('criticalMedicalIllness', form.criticalMedicalIllness || '');
      formData.append('pastMedical', Array.isArray(form.pastMedical) ? form.pastMedical.join('/') : (form.pastMedical || ''));
      formData.append('pastDental', form.pastDental || '');
      formData.append('habits', Array.isArray(form.habits) ? form.habits.join('/') : (form.habits || ''));
      formData.append('differentialDiagnosis', Array.isArray(form.differentialDiagnosis) ? form.differentialDiagnosis.join('/') : (form.differentialDiagnosis || ''));

      // Build investigations string: prefer freeform `form.investigations` if provided, otherwise compose from structured details
      let investigationsCombined = form.investigations || '';
      try {
        const d = form.investigationsDetail || {};
        const parts = [];
        if (d.pulpTesting && (d.pulpTesting.thermalTest || d.pulpTesting.ept)) {
          const pulpParts = [];
          if (d.pulpTesting.thermalTest) pulpParts.push(`Thermal Test: ${d.pulpTesting.thermalTest}`);
          if (d.pulpTesting.ept) pulpParts.push(`EPT: ${d.pulpTesting.ept}`);
          parts.push(`Pulp Testing - ${pulpParts.join('; ')}`);
        }
        if (d.radiographic) parts.push(`Radiographic Examination: ${d.radiographic}`);
        if (!investigationsCombined && parts.length) investigationsCombined = parts.join(' | ');
      } catch (e) {
        // ignore
      }

      formData.append('investigations', investigationsCombined);
      formData.append('treatmentPictures', JSON.stringify(treatmentPictures || []));
      formData.append('clinicalFindings', JSON.stringify({ extraOral: form.extraOral, intraOral: form.intraOral }));
      formData.append('provisionalDiagnosis', form.provisionalDiagnosis || '');
      formData.append('finalDiagnosis', form.finalDiagnosis || '');
      formData.append('prognosis', form.prognosis || '');
      formData.append('staffSignature', form.staffSignature || '');
      formData.append('referral', form.referral || '');
      formData.append('treatmentPlan', form.treatmentPlan || '');
      formData.append('treatments', JSON.stringify(treatments || []));

      if (signatureFile) formData.append('digitalSignature', signatureFile, signatureFile.name);

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/conservative/save`, { method: 'POST', body: formData, headers });
      const raw = await res.text().catch(() => '');
      let payload = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        payload = { message: raw };
      }

      if (isSessionExpiredPayload(res, payload)) {
        handleSessionExpired(payload?.message || 'Token expired');
        return;
      }

      if (res.ok) {
        const savedCaseId = payload?.caseId || payload?.data?._id || '';
        if (savedCaseId) localStorage.setItem('caseId', savedCaseId);
        alert(`Case saved successfully. Case ID: ${payload?.caseId || payload?.data?._id || ''}`);
        navigateToPrescriptions();
      } else {
        const message = String(payload?.message || payload?.error || 'Unknown error');
        const isPgAssignmentWarning = res.status === 409 && message.toLowerCase().includes('no pg is assigned under');

        if (isPgAssignmentWarning) {
          const savedCaseId = payload?.caseId || payload?.data?._id || '';
          if (savedCaseId) localStorage.setItem('caseId', savedCaseId);
          alert(`Case saved successfully. Case ID: ${payload?.caseId || payload?.data?._id || ''}`);
          navigateToPrescriptions();
          return;
        }

        alert(`Failed to save case: ${message}`);
      }
    } catch (err) {
      console.error('Error saving case sheet', err);
      alert('Error saving case sheet: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const onSignatureChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setSignatureFile(f || null);
  };

  return (
    <div className={"login-page conservative-case-sheet" + ((showAllergy && patientAllergyData?.drug) ? ' has-allergy' : '')}>
      {/* Top alert banner: render outside the card so it floats above the case sheet */}
      {(showAllergy && patientAllergyData?.drug) ? createPortal(
        <DrugAllergyBanner drug={patientAllergyData.drug} onClose={() => setShowAllergy(false)} />,
        document.body
      ) : null}

      <div className="login-box">
        <div className="logo">
          <img src="/logo.png" alt="SRM Logo" className="conservative-logo" />
        </div>
        <div className="college-name">SRM DENTAL COLLEGE</div>
        <h2>Conservative Dentistry &amp; Endodontics</h2>
        <h3 style={{ marginBottom: 20, color: 'white' }}>Case Sheet</h3>

        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'left' }}>
          {/* Header info row */}
          <div className="form-row-wide" style={{ marginBottom: 18 }}>
            <div className="input-group" style={{ width: '100%' }}>
              <label>REG. NO.</label>
              <input name="regNo" value={form.regNo} onChange={handleChange} />
            </div>
          </div>

          {/* Patient details */}
          <div className="form-row-wide">
            <div className="input-group">
              <label>Patient Name</label>
              <input name="name" value={form.name} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Date</label>
              <input name="date" value={form.date} onChange={handleChange} />
            </div>
          </div>



          <div className="form-row-wide">
            <div className="input-group">
              <label>Contact Number</label>
              <input name="contact" value={form.contact} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Age / Sex</label>
              <input name="ageSex" value={form.ageSex} onChange={handleChange} />
            </div>
          </div>

          <div className="input-group">
            <label>Address</label>
            <input name="address" value={form.address} onChange={handleChange} />
          </div>

          <div className="input-group">
            <label>Chief Complaint</label>
            <textarea name="chiefComplaint" value={form.chiefComplaint} onChange={(e) => setForm(p => ({ ...p, chiefComplaint: e.target.value }))} />
          </div>
          <div className="input-group">
            <label>History of Present Illness</label>
            <textarea name="presentIllness" value={form.presentIllness} onChange={handleChange} rows={4} />
          </div>
          <div className="input-group">
            <label>Critical Medical Illness</label>
            <textarea
              name="criticalMedicalIllness"
              value={form.criticalMedicalIllness}
              onChange={handleChange}
              rows={3}
              placeholder="Enter major medical conditions, allergies, emergency issues, or important health risks."
            />
          </div>
          <div className="input-group">
            <label>Past Medical History</label>
            <div>
              <PastMedicalDropdown
                value={form.pastMedical}
                onChange={(v) => setForm(prev => ({ ...prev, pastMedical: v }))}
                options={PAST_MED_HISTORY_OPTIONS}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Family History</label>
            <input name="familyHistory" value={form.familyHistory} onChange={handleChange} />
          </div>



          <div className="input-group">
            <label>Past Dental History</label>
            <input name="pastDental" value={form.pastDental} onChange={handleChange} />
          </div>

          <div className="input-group">
            <label>Habits</label>
            <div>
              <PastMedicalDropdown
                value={form.habits}
                onChange={(v) => setForm(prev => ({ ...prev, habits: v }))}
                options={HABIT_OPTIONS}
              />
            </div>
          </div>
          {/* Clinical Examination */}
          <h3 style={{ color: '#e6eefc' }}>Clinical Examination</h3>
          {/* Extra Oral & Intra Oral Examination tiles (added after Habits) */}
          <h3 style={{ color: '#e6eefc', marginTop: 6 }}>Extra Oral Examination</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div className="input-group">
              <label>TMJ Examination</label>
              <input value={form.extraOral.tmj} onChange={(e) => handleNestedChange('extraOral', 'tmj', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Lymph Node</label>
              <input value={form.extraOral.lymphNode} onChange={(e) => handleNestedChange('extraOral', 'lymphNode', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Swelling or Sinus Present</label>
              <select value={form.extraOral.swellingSinus || ''} onChange={(e) => handleNestedChange('extraOral', 'swellingSinus', e.target.value)}>
                <option value="">--</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
          </div>

          <h3 style={{ color: '#e6eefc', marginTop: 6 }}>Intra Oral Examination</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div className="input-group">
              <label>Soft Tissue Examination</label>
              <textarea value={form.intraOral.softTissue} onChange={(e) => handleNestedChange('intraOral', 'softTissue', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Hard Tissue Examination</label>
              <textarea value={form.intraOral.hardTissue} onChange={(e) => handleNestedChange('intraOral', 'hardTissue', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Intra Oral Swelling or Sinus Present</label>
              <select value={form.intraOral.swellingSinus || ''} onChange={(e) => handleNestedChange('intraOral', 'swellingSinus', e.target.value)}>
                <option value="">--</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
          </div>

          {/* Quadrant mapping - editable boxes */}
          <h3 style={{ color: '#e6eefc' }}>Quadrant Mapping</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {form.quadrants.map((q, idx) => (
              <div key={idx} className="input-group" style={{ background: 'transparent' }}>
                <label>{q.name}</label>
                <textarea value={q.details} onChange={(e) => updateQuadrant(idx, e.target.value)} />
              </div>
            ))}
          </div>

          {/* Diagnosis / Investigations / Treatment Plan */}
          <div className="input-group">
            <label>Provisional Diagnosis</label>
            <textarea value={form.provisionalDiagnosis} onChange={(e) => setForm(p => ({ ...p, provisionalDiagnosis: e.target.value }))} />
          </div>

          <div className="input-group">
            <label>Differential Diagnosis</label>
            <textarea value={Array.isArray(form.differentialDiagnosis) ? form.differentialDiagnosis.join(', ') : (form.differentialDiagnosis || '')} onChange={(e) => setForm(p => ({ ...p, differentialDiagnosis: e.target.value }))} />
          </div>

          <h3 style={{ color: '#e6eefc', marginTop: 6 }}>Investigations</h3>
          <div className="input-group">
            <label>Pulp Testing - Thermal Test</label>
            <input value={form.investigationsDetail?.pulpTesting?.thermalTest || ''} onChange={(e) => updateInvestigationPulp('thermalTest', e.target.value)} />
          </div>
          <div className="input-group">
            <label>Pulp Testing - EPT</label>
            <input value={form.investigationsDetail?.pulpTesting?.ept || ''} onChange={(e) => updateInvestigationPulp('ept', e.target.value)} />
          </div>
          <div className="input-group">
            <label>Radiographic Examination</label>
            <textarea value={form.investigationsDetail?.radiographic || ''} onChange={(e) => updateInvestigationRadiographic(e.target.value)} />
          </div>




          <div className="input-group">
            <label>Final Diagnosis</label>
            <textarea value={form.finalDiagnosis || ''} onChange={(e) => setForm(p => ({ ...p, finalDiagnosis: e.target.value }))} />
          </div>

          <div className="input-group">
            <label>Prognosis</label>
            <textarea value={form.prognosis || ''} onChange={(e) => setForm(p => ({ ...p, prognosis: e.target.value }))} />
          </div>


          <div className="input-group">
            <label>Referral (multiple referrals allowed)</label>
            <input value={form.referral || ''} onChange={(e) => setForm(p => ({ ...p, referral: e.target.value }))} />
          </div>

          {/* Treatment table dynamic rows */}
          <h3 style={{ color: '#e6eefc' }}>Treatment Log</h3>
          <div style={{ marginBottom: 12 }}>
            {treatments.map((tx, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 160px 160px', gap: 8, marginBottom: 8 }}>
                <input placeholder="Date" value={tx.date} onChange={(e) => updateTreatment(idx, 'date', e.target.value)} />
                <input placeholder="Treatment" value={tx.treatment} onChange={(e) => updateTreatment(idx, 'treatment', e.target.value)} />
                <input placeholder="Receipt" value={tx.receipt} onChange={(e) => updateTreatment(idx, 'receipt', e.target.value)} />
                <input placeholder="Staff" value={tx.staff} onChange={(e) => updateTreatment(idx, 'staff', e.target.value)} />
                <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
                  <button type="button" className="button" onClick={() => removeTreatment(idx)} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 12px', borderRadius: 10 }}>Remove</button>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button className="button" type="button" onClick={addTreatment}>Add Treatment</button>
            </div>
          </div>

          {/* Treatment Pictures section */}
          <h3 style={{ color: '#e6eefc', marginTop: 6 }}>Treatment Pictures</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
            <label style={{ display: 'inline-block' }}>
              <div style={{ width: 96, height: 96, border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 28, color: '#e6eefc', fontWeight: 700 }}>+</span>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/jpg" multiple onChange={onTreatmentFileInput} style={{ display: 'none' }} />
            </label>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {treatmentPictures && treatmentPictures.length ? treatmentPictures.map((t, idx) => (
                <div key={idx} style={{ width: 96, height: 96, position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                  <img src={t.dataUrl} alt={t.fileName || `pic-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removeTreatmentPicture(idx)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>×</button>
                </div>
              )) : null}
            </div>
          </div>

          <div className="input-group">
            <label>Follow Up Plan</label>
            <textarea value={form.followUpPlan} onChange={(e) => setForm(p => ({ ...p, followUpPlan: e.target.value }))} />
          </div>
          <div className="doctor-auth-section" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <h2>Doctor's Authentication</h2>
            <div className="form-group">
              <label htmlFor="doctorName">Doctor's Name *</label>
              <input
                type="text"
                id="doctorName"
                placeholder="Enter full name"
                value={localStorage.getItem('doctorName') || ''}
                disabled
                style={{ background: '#f0f0f0' }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="digitalSignature">Upload Digital Signature *</label>
              <input
                type="file"
                id="digitalSignature"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files[0])}
                required
              />
              {signaturePreview && (
                <div id="signaturePreview" style={{ marginTop: '10px' }}>
                  <img
                    src={signaturePreview}
                    alt="Signature Preview"
                    style={{ maxWidth: '150px', maxHeight: '100px', marginTop: '10px' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="button" onClick={handleSave}>Submit Case Sheet</button>
          </div>



        </div>
      </div>
    </div>
  );
};

export default ConservativeCaseSheet;