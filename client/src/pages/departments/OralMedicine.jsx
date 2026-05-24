import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { saveCaseDraft, loadCaseDraft, clearCaseDraft } from '../../utils/caseDraft';
import { readStoredGeneralCaseXray } from '../../utils/generalCaseXray';
import { getCurrentPatientId, getSharedXrayImage } from '../../utils/sharedXray';
import './OralMedicine.css';

const DRAFT_ROUTE_KEY = '/oral-medicine'; 
const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';
const TOTAL_PAGES = 8;

const INITIAL_FORM = {
  caseSheetNumber: '', date: new Date().toISOString().split('T')[0],
  patientName: '', opNo: '',
  age: '', sex: '',
  occupation: '', income: '', religion: '', address: '',
  chiefComplaint: '',
  historyOfPresentIllness: '',
  pastMedicalHistory: '',
  pastSurgicalHistory: '',
  pastDentalHistory: '',
  personalHistory: '',
  familyHistory: '',
  generalExamination: '',
  cns: '', cvs: '', respiratory: '', gastrointestinal: '', genitoUrinary: '', skeletal: '',
  facialSymmetry: '', facialProfile: '', earNoseEyes: '',
  tmjInspection: '', tmjPalpation: '', tmjPercussionAuscultation: '',
  lymphNodeExamination: '',
  siteShapeOfMouth: '', mouthOpening: '', jawMovements: '',
  teethPresent: '', sizeShapeColor: '',
  dentalCaries: '', missingTeeth: '', mobility: '', occlusion: '',
  recession: '', attrition: '', calculusAndStains: '', hardTissueOthers: '',
  gingival: '', alveolarMucosa: '', buccalMucosa: '', labialMucosa: '', tongue: '',
  floorOfOralCavity: '', palate: '', pillarOfFaucesAndTonsils: '', retroMolarArea: '',
  lesionInspection: '', lesionPalpation: '', summary: '',
  provisionalDiagnosis: '', differentialDiagnosis: '', clinicalDiagnosis: '',
  invHematologicalNotes: '', invUrineNotes: '', invBiochemicalNotes: '',
  invSerologicalNotes: '', invCytologicalNotes: '', invMicrobiologicalNotes: '',
  invSpecialNotes: '', invRadiologicalNotes: '', invBiopsyNotes: '',
  invHistopathologicalNotes: '', invOthersNotes: '',
  invHematological: false, invUrine: false, invBiochemical: false,
  invSerological: false, invCytological: false, invMicrobiological: false,
  invSpecial: false, invRadiological: false, invBiopsy: false,
  invHistopathological: false, invOthers: false,
  treatmentPlan: '', prognosis: '',
  referredDepartment: '',
  // Chargeable investigations
  chargeBiopsy: false,
  chargeExfoliativeCytology: false,
  chargeIOPA: false,
  chargeBitewing: false,
  chargeOcclusal: false,
  chargeOPGWithFilm: false,
  chargeOPGWithoutFilm: false,
  chargeLateralCephalogram: false,
  chargeCBCT: false,
  chargeDescription: '',
  digitalSignature: null,
};

const OralMedicine = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [currentPage, setCurrentPage] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [allergyMessage, setAllergyMessage] = useState('Loading allergies...');
  const [showAllergy, setShowAllergy] = useState(true);
  const [criticalCondition, setCriticalCondition] = useState('');
  const [showCritical, setShowCritical] = useState(true);
  const [signaturePreview, setSignaturePreview] = useState('');
  const [xrayPreview, setXrayPreview] = useState('');
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '' });
  const [showConsentPrompt, setShowConsentPrompt] = useState(false);
  const [consentRedirectTarget, setConsentRedirectTarget] = useState('');
  const draftTimerRef = useRef(null);

  const patientId = localStorage.getItem('CurrentpatientId') || '';
  const patientName = localStorage.getItem('CurrentpatientName') || '';
  const doctorId = localStorage.getItem('doctorId') || '';
  const doctorName = localStorage.getItem('doctorName') || user?.name || '';
  const token = localStorage.getItem('token') || '';

  const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  useEffect(() => {
    const navState = location.state || {};
    if (navState.requestConsentAfterEntry && !navState[CASE_CONSENT_NAV_STATE_KEY]) {
      setConsentRedirectTarget(`${location.pathname}${location.search}`);
      setShowConsentPrompt(true);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    const prefill = location.state?.redoEdit ? location.state?.prefillCaseData : null;
    const editCaseId = String(location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || '').trim();
    if (prefill && editCaseId) {
      setForm(prev => ({ ...prev, ...prefill }));
      if (typeof prefill.digitalSignature === 'string' && prefill.digitalSignature.startsWith('data:')) {
        setSignaturePreview(prefill.digitalSignature);
      }
      setCurrentPage(0);
      setIsDraftHydrated(true);
      return;
    }
    if (!patientId) { setIsDraftHydrated(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const draft = await loadCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
        if (!cancelled && draft?.data?.form) {
          const currentName = String(localStorage.getItem('CurrentpatientName') || '').trim();
          const { age: _a, sex: _s, patientName: _n,
                  chiefComplaint: _cc, historyOfPresentIllness: _hpi,
                  pastMedicalHistory: _pmh, pastSurgicalHistory: _psh,
                  pastDentalHistory: _pdh, ...draftForm } = draft.data.form;
          setForm(prev => ({ ...prev, ...draftForm, ...(currentName ? { patientName: currentName } : {}) }));
          if (typeof draft.data.signaturePreview === 'string' && draft.data.signaturePreview.trim()) {
            setSignaturePreview(draft.data.signaturePreview);
          }
          // Always start from page 0 — never restore the last page from draft
          setCurrentPage(0);
        }
      } finally {
        if (!cancelled) setIsDraftHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!isDraftHydrated || !patientId) return;
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(async () => {
      await saveCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY, step: currentPage, data: { form, signaturePreview } });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 1500);
    return () => clearTimeout(draftTimerRef.current);
  }, [form, currentPage, signaturePreview, isDraftHydrated, patientId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const pid = String(localStorage.getItem('CurrentpatientId') || '').trim();
      if (pid && isDraftHydrated) {
        saveCaseDraft({ patientId: pid, routeKey: DRAFT_ROUTE_KEY, step: currentPage, data: { form, signaturePreview } });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form, currentPage, signaturePreview, isDraftHydrated]);

  useEffect(() => {
    if (patientName) setForm(prev => ({ ...prev, patientName }));
  }, [patientName]); // eslint-disable-line

  useEffect(() => {
    let isMounted = true;
    const toListString = (v) => Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean).join(', ') : String(v || '').trim();
    const extractPatient = (r) => {
      if (Array.isArray(r?.data)) return r.data[0] || null;
      if (r?.data) return r.data;
      return null;
    };
    const load = async (attempt = 0) => {
      const pid = localStorage.getItem('CurrentpatientId');
      if (!pid) {
        if (attempt < 5 && isMounted) setTimeout(() => load(attempt + 1), 400);
        else if (isMounted) setAllergyMessage('No known allergies');
        return;
      }
      try {
        let p = null;
        const tkn = localStorage.getItem('token');
        const headers = tkn ? { Authorization: `Bearer ${tkn}` } : {};
        const res1 = await fetch(`${API_BASE_URL}/api/doctor-patient/${pid}`, { headers });
        if (res1.ok) p = extractPatient(await res1.json());
        if (!p) {
          const res2 = await fetch(`${API_BASE_URL}/api/patient-details/by-patient-id/${pid}`, { headers });
          if (res2.ok) p = extractPatient(await res2.json());
        }
        if (!isMounted) return;
        if (!p) { setAllergyMessage('No known allergies'); return; }
        const patientAge = p.personalInfo?.age;
        const patientGender = p.personalInfo?.gender;
        const hasAge = patientAge != null && String(patientAge).trim() !== '' && String(patientAge).trim() !== '0';
        const hasGender = patientGender && ['Male', 'Female', 'Other'].includes(patientGender);
        if (hasAge || hasGender) {
          setForm(prev => ({
            ...prev,
            ...(hasAge ? { age: String(patientAge) } : {}),
            ...(hasGender ? { sex: patientGender } : {}),
          }));
        }

        // Auto-fill history fields from patient record
        const mi = p.medicalInfo || {};
        setForm(prev => ({
          ...prev,
          ...(mi.chiefComplaint               ? { chiefComplaint:          mi.chiefComplaint }               : {}),
          ...(mi.historyOfPresentIllness       ? { historyOfPresentIllness: mi.historyOfPresentIllness }       : {}),
          ...(mi.pastSurgicalHistory           ? { pastSurgicalHistory:     mi.pastSurgicalHistory }           : {}),
          ...(mi.pastDentalHistory             ? { pastDentalHistory:       mi.pastDentalHistory }             : {}),
          ...(Array.isArray(mi.pastMedicalHistory) && mi.pastMedicalHistory.length
            ? { pastMedicalHistory: mi.pastMedicalHistory.filter(v => v !== 'None').join(', ') } : {}),
        }));

        // Auto-fetch referredDepartment from the patient's general case sheet
        try {
          const gcRes = await fetch(`${API_BASE_URL}/api/general/patient/${pid}`, { headers });
          if (gcRes.ok) {
            const gcData = await gcRes.json();
            const cases = Array.isArray(gcData?.data) ? gcData.data : (gcData?.data ? [gcData.data] : []);
            // Get the most recent general case that has a referredDepartment
            const latestWithRef = cases.find(c => c.referredDepartment && c.referredDepartment.trim());
            if (latestWithRef?.referredDepartment && isMounted) {
              setForm(prev => ({ ...prev, referredDepartment: latestWithRef.referredDepartment }));
            }
          }
        } catch { /* silently ignore — referredDepartment stays as user-selected */ }
        const drug = toListString(p.vitals?.drugAllergies);
        const known = toListString(p.medicalInfo?.knownAllergies);
        const diet = toListString(p.vitals?.dietAllergies);
        const critical = String(p.vitals?.criticalCondition || '').trim();
        if (critical && isMounted) setCriticalCondition(critical);
        if (drug) setAllergyMessage(`Drug Allergies: ${drug}`);
        else if (known) setAllergyMessage(`Known Allergies: ${known}`);
        else if (diet) setAllergyMessage(`Diet Allergies: ${diet}`);
        else setAllergyMessage('No known allergies');
      } catch { if (isMounted) setAllergyMessage('No known allergies'); }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const pid = localStorage.getItem('CurrentpatientId') || '';
    const cached = readStoredGeneralCaseXray(pid);
    if (cached?.imageDataUrl) setXrayPreview(prev => prev || cached.imageDataUrl);
  }, []);

  useEffect(() => {
    const pid = getCurrentPatientId();
    const shared = getSharedXrayImage(pid);
    if (shared?.dataUrl) setXrayPreview(prev => prev || shared.dataUrl);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);

  // Auto-set referredDepartment to the doctor's own department on first load
  useEffect(() => {
    const dept = user?.department
      || localStorage.getItem('doctorDepartment')
      || localStorage.getItem('ugDepartment')
      || localStorage.getItem('pgDepartment')
      || 'Oral Medicine and Radiology';
    setForm(prev => prev.referredDepartment ? prev : { ...prev, referredDepartment: dept });
  }, []); // eslint-disable-line

  const formatAllergyTicker = (raw) => {
    const r = (raw || '').trim();
    if (!r) return 'Drug Allergies: None';
    if (/^loading/i.test(r)) return r;
    const withoutPrefix = r.replace(/^\s*(Drug\s*Allerg(?:y|ies)|Known\s*Allergies|Diet\s*Allergies)\s*:\s*/i, '');
    if (/^(no known allergies|nil|none)$/i.test(withoutPrefix.trim())) return 'Drug Allergies: None';
    const items = withoutPrefix.split(/[|,]/).map(x => x.trim()).filter(Boolean);
    return `Drug Allergies: ${items.length ? items.join(' | ') : 'None'}`;
  };

  const showMessageBox = (title, message) => setMessageBox({ show: true, title, message });
  const hideMessageBox = () => setMessageBox({ show: false, title: '', message: '' });

  const set = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFileChange = (file) => {
    setForm(prev => ({ ...prev, digitalSignature: file }));
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setSignaturePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.patientName.trim()) e.patientName = 'Patient name is required.';
    if (!form.chiefComplaint.trim()) e.chiefComplaint = 'Chief complaint is required.';
    if (!form.sex) e.sex = 'Sex is required.';
    if (!form.age) e.age = 'Age is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (currentPage < TOTAL_PAGES - 1) setCurrentPage(p => p + 1);
    else handleSubmit();
  };

  const handlePrev = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  const handleSubmit = async () => {
    if (!validate()) { showToast('Please fill required fields.', 'error'); return; }
    if (!patientId) { showToast('No patient loaded.', 'error'); return; }
    if (!doctorId) { showToast('Doctor identity not found. Please log in again.', 'error'); return; }
    if (!token) {
      showMessageBox('Session Expired', 'Your session has expired. Please log in again.');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    if (!form.digitalSignature) {
      showMessageBox('Error', 'Please upload your digital signature before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const redoEditCaseId = String(location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || '').trim();
      const isRedoEdit = Boolean(redoEditCaseId);
      const fileToDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const payload = { ...form, patientId, patientName: form.patientName || patientName, doctorId, doctorName, age: Number(form.age) || 0, gender: form.sex };
      if (payload.digitalSignature instanceof File) {
        payload.digitalSignature = await fileToDataUrl(payload.digitalSignature);
      }
      if (isRedoEdit) {
        const res = await fetch(buildApiUrl(`/api/casesheets/${encodeURIComponent(redoEditCaseId)}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
          localStorage.removeItem('redoEditCaseId');
          localStorage.removeItem('redoEditDepartmentKey');
          showMessageBox('Success', 'Case Sheet updated and resubmitted successfully!');
          setTimeout(() => navigate('/pg-dashboard'), 1200);
        } else {
          showMessageBox('Error', data.message || 'Failed to update case sheet');
        }
        return;
      }
      const res = await fetch(buildApiUrl('/api/oral'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 401) {
        showMessageBox('Session Expired', 'Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 1500);
        return;
      }
      if (res.ok) {
        if (data.data?._id) localStorage.setItem('caseId', data.data._id);
        await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
        const pName = form.patientName || patientName || 'Patient';
        const referral = form.referredDepartment ? `\n\nReferred to: ${form.referredDepartment}` : '';
        showMessageBox('✅ Case Sheet Submitted', `Oral Medicine & Radiology has completed the case sheet for ${pName}.\n\nTreatment plan and diagnosis have been recorded successfully.${referral}`);
        const role = user?.role || localStorage.getItem('role') || '';
        const dashRoute = role.includes('ug') ? '/ug-dashboard'
          : role.includes('pg') ? '/pg-dashboard'
          : role.includes('chief') ? '/chief-doctor-dashboard'
          : '/doctor-dashboard';
        setTimeout(() => navigate(dashRoute), 1500);
      } else {
        showMessageBox('Error', data.message || 'Submission failed.');
      }
    } catch {
      showMessageBox('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const ui = (field, type = 'text', style = {}) => (
    <input className="omr-uinput" type={type} value={form[field] || ''} onChange={e => set(field, e.target.value)} style={style} />
  );
  const ta = (field, rows = 3, large = false) => (
    <textarea className={`omr-ta${large ? ' omr-ta-lg' : ''}`} rows={rows} value={form[field] || ''} onChange={e => set(field, e.target.value)} />
  );

  /* ── PAGE 0 — Patient Info & History (PDF Page 1) ── */
  const renderPage0 = () => (
    <div className="omr-page-content">
      {xrayPreview && (
        <div className="xray-preview-container" style={{ marginBottom: 16 }}>
          <label className="omr-lbl">X-ray Image:</label>
          <img src={xrayPreview} alt="X-ray preview" className="xray-preview" />
        </div>
      )}
      <h2 className="omr-sheet-title" style={{ marginTop: 8 }}>ORAL MEDICINE AND RADIOLOGY</h2>
      <p className="omr-section-title">CHIEF COMPLAINT:</p>
      {ta('chiefComplaint', 4, true)}
      {errors.chiefComplaint && <p className="omr-error">{errors.chiefComplaint}</p>}
      <p className="omr-section-title">HISTORY OF PRESENTING ILLNESS:</p>
      {ta('historyOfPresentIllness', 4, true)}
      <p className="omr-section-title">PAST MEDICAL HISTORY:</p>
      {ta('pastMedicalHistory', 4)}
      <p className="omr-section-title">PAST SURGICAL HISTORY:</p>
      {ta('pastSurgicalHistory', 4)}
      <p className="omr-section-title">PAST DENTAL HISTORY:</p>
      {ta('pastDentalHistory', 4)}
    </div>
  );

  /* ── PAGE 1 — Personal History + Family History + Clinical Examination + Review of Systems (PDF Page 2) ── */
  const renderPage1 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>
      <p className="omr-section-title">PERSONAL HISTORY:</p>
      {ta('personalHistory', 6)}
      <p className="omr-section-title">FAMILY HISTORY:</p>
      {ta('familyHistory', 4)}
      <p className="omr-section-title">CLINICAL EXAMINATION</p>
      <p className="omr-section-title" style={{ marginTop: 0 }}>GENERAL EXAMINATION:</p>
      {ta('generalExamination', 4)}
      <p className="omr-section-title">REVIEW OF SYSTEMS:</p>
      <p className="omr-item-label">1. CENTRAL NERVOUS SYSTEM:</p>{ta('cns', 2)}
      <p className="omr-item-label">2. CARDIO VASCULAR SYSTEM:</p>{ta('cvs', 2)}
      <p className="omr-item-label">3. RESPIRATORY SYSTEM:</p>{ta('respiratory', 2)}
      <p className="omr-item-label">4. GASTRO-INTESTINAL SYSTEM:</p>{ta('gastrointestinal', 2)}
      <p className="omr-item-label">5. GENITO-URINARY SYSTEM:</p>{ta('genitoUrinary', 2)}
      <p className="omr-item-label">6. SKELETAL SYSTEM:</p>{ta('skeletal', 2)}
    </div>
  );

  /* ── PAGE 2 — Local Examination: Extra Oral + Intra Oral + Hard Tissue start (PDF Page 3) ── */
  const renderPage2 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>
      <p className="omr-section-title">LOCAL EXAMINATION</p>
      <p className="omr-section-title" style={{ marginTop: 0 }}>EXTRA ORAL EXAMINATION</p>
      <p className="omr-item-label">a) Facial Symmetry:</p>{ta('facialSymmetry', 2)}
      <p className="omr-item-label">b) Facial Profile:</p>{ta('facialProfile', 2)}
      <p className="omr-item-label">c) Ear, Nose, Eyes:</p>{ta('earNoseEyes', 2)}
      <p className="omr-item-label">d) TMJ Examination:</p>
      <p className="omr-item-label-indent">- Inspection:</p>{ta('tmjInspection', 2)}
      <p className="omr-item-label-indent">- Palpation:</p>{ta('tmjPalpation', 2)}
      <p className="omr-item-label-indent">- Percussion and Auscultation:</p>{ta('tmjPercussionAuscultation', 2)}
      <p className="omr-item-label">e) Lymph node Examination:</p>{ta('lymphNodeExamination', 3)}
      <p className="omr-section-title">INTRA ORAL EXAMINATION</p>
      <p className="omr-item-label">1. Site and Shape of the mouth:</p>{ta('siteShapeOfMouth', 2)}
      <p className="omr-item-label">2. Mouth Opening:</p>{ta('mouthOpening', 2)}
      <p className="omr-item-label">3. Jaw movements:</p>{ta('jawMovements', 2)}
      <p className="omr-subsection-title">Hard Tissue Examination</p>
      <p className="omr-item-label">1. Teeth present:</p>{ta('teethPresent', 2)}
      <p className="omr-item-label">2. Size, shape and color:</p>{ta('sizeShapeColor', 2)}
    </div>
  );

  /* ── PAGE 3 — Hard Tissue continued (PDF Page 4) ── */
  const renderPage3 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>
      <p className="omr-item-label">3. Dental caries:</p>{ta('dentalCaries', 2)}
      <p className="omr-item-label">4. Missing</p>{ta('missingTeeth', 2)}
      <p className="omr-item-label">5. Mobility:</p>{ta('mobility', 2)}
      <p className="omr-item-label">6. Occlusion:</p>{ta('occlusion', 2)}
      <p className="omr-item-label">7. Recession:</p>{ta('recession', 2)}
      <p className="omr-item-label">8. Attrition:</p>{ta('attrition', 2)}
      <p className="omr-item-label">9. Calculus and stains:</p>{ta('calculusAndStains', 2)}
      <p className="omr-item-label">10. Others:</p>{ta('hardTissueOthers', 2)}
    </div>
  );

  /* ── PAGE 4 — Soft Tissue a–e (PDF Page 5) ── */
  const renderPage4 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>
      <p className="omr-subsection-title">Soft Tissue Examination:</p>
      <p className="omr-item-label">a. Gingival</p>{ta('gingival', 3)}
      <p className="omr-item-label">b. Alveolar Mucosa:</p>{ta('alveolarMucosa', 3)}
      <p className="omr-item-label">c. Buccal mucosa:</p>{ta('buccalMucosa', 3)}
      <p className="omr-item-label">d. Labial mucosa:</p>{ta('labialMucosa', 3)}
      <p className="omr-item-label">e. Tongue:</p>{ta('tongue', 3)}
    </div>
  );

  /* ── PAGE 5 — Soft Tissue f–i (PDF Page 6) ── */
  const renderPage5 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>
      <p className="omr-item-label">f. Floor of the oral cavity:</p>{ta('floorOfOralCavity', 3)}
      <p className="omr-item-label">g. Palate:</p>{ta('palate', 3)}
      <p className="omr-item-label">h. Pillar of Fauces and tonsils:</p>{ta('pillarOfFaucesAndTonsils', 3)}
      <p className="omr-item-label">i. Retro-molar area:</p>{ta('retroMolarArea', 3)}
    </div>
  );

  /* ── PAGE 6 — Examination of Lesion (PDF Page 7) ── */
  const renderPage6 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>
      <p className="omr-subsection-title">Examination of Lesion</p>
      <p className="omr-item-label">A. Inspection:</p>{ta('lesionInspection', 6)}
      <p className="omr-item-label">B. Palpation:</p>{ta('lesionPalpation', 6)}
      <p className="omr-item-label">Summary:</p>{ta('summary', 5)}
    </div>
  );

  /* ── PAGE 7 — Diagnosis + Investigation + Treatment + Signature (PDF Page 8) ── */
  const renderPage7 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>
      <p className="omr-section-title">Provisional Diagnosis:</p>{ta('provisionalDiagnosis', 3)}
      <p className="omr-section-title">Differential Diagnosis:</p>{ta('differentialDiagnosis', 3)}
      <p className="omr-section-title">Investigation:</p>
      <div className="omr-inv-chk-list">
        {[
          ['invHematological',     'a) Hematological'],
          ['invUrine',             'b) Urine'],
          ['invBiochemical',       'c) Bio-Chemical'],
          ['invSerological',       'd) Serological'],
          ['invCytological',       'e) Cytological'],
          ['invMicrobiological',   'f) Microbiological'],
          ['invSpecial',           'g) Special investigations'],
          ['invRadiological',      'h) Radiological'],
          ['invBiopsy',            'i) Biopsy'],
          ['invHistopathological', 'j) Histopathological Examination'],
          ['invOthers',            'k) Any others'],
        ].map(([field, label]) => (
          <label className="omr-inv-chk-label" key={field}>
            <input
              type="checkbox"
              checked={!!form[field]}
              onChange={e => set(field, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      <p className="omr-section-title">Clinical Diagnosis:</p>{ta('clinicalDiagnosis', 3)}
      <p className="omr-section-title">Treatment planning:</p>{ta('treatmentPlan', 4)}
      <p className="omr-section-title">Prognosis:</p>{ta('prognosis', 3)}

      <p className="omr-section-title" style={{ marginTop: 24 }}>CHARGEABLE INVESTIGATIONS:</p>
      <div className="omr-charge-list">
        <label className="omr-inv-chk-label">
          <input type="checkbox" checked={!!form.chargeBiopsy} onChange={e => set('chargeBiopsy', e.target.checked)} />
          Biopsy — <span className="omr-charge-rate">Rs. 250</span>
        </label>
        <label className="omr-inv-chk-label">
          <input type="checkbox" checked={!!form.chargeExfoliativeCytology} onChange={e => set('chargeExfoliativeCytology', e.target.checked)} />
          Exfoliative Cytology — <span className="omr-charge-rate">Rs. 50</span>
        </label>

        <p className="omr-item-label" style={{ marginTop: 14, marginBottom: 6 }}>X-ray Taken:</p>
        {[
          ['chargeIOPA',              'IOPA',               'Rs. 30'],
          ['chargeBitewing',          'Bitewing',           'Rs. 30'],
          ['chargeOcclusal',          'Occlusal',           'Rs. 150'],
          ['chargeOPGWithFilm',       'OPG with film',      'Rs. 300'],
          ['chargeOPGWithoutFilm',    'OPG without film',   'Rs. 200'],
          ['chargeLateralCephalogram','Lateral Cephalogram','Rs. 300'],
          ['chargeCBCT',              'CBCT',               'Cost yet to be decided'],
        ].map(([field, label, rate]) => (
          <label className="omr-inv-chk-label" key={field}>
            <input type="checkbox" checked={!!form[field]} onChange={e => set(field, e.target.checked)} />
            {label} — <span className="omr-charge-rate">{rate}</span>
          </label>
        ))}

        <div style={{ marginTop: 16 }}>
          <p className="omr-item-label">Description / Remarks:</p>
          {ta('chargeDescription', 3)}
        </div>
      </div>
      <p className="omr-section-title" style={{ marginTop: 24 }}>Referred to Department:</p>
      <select className="omr-uinput" value={form.referredDepartment} onChange={e => set('referredDepartment', e.target.value)} style={{ maxWidth: 320, marginBottom: 8 }}>
        <option value="">— None / No Referral —</option>
        <option value="Pedodontics">Pedodontics</option>
        <option value="Orthodontics">Orthodontics</option>
        <option value="Periodontics">Periodontics</option>
        <option value="Endodontics">Endodontics</option>
        <option value="Prosthodontics">Prosthodontics</option>
        <option value="Oral & Maxillofacial Surgery">Oral &amp; Maxillofacial Surgery</option>
        <option value="Conservative Dentistry">Conservative Dentistry</option>
        <option value="Oral Medicine & Radiology">Oral Medicine &amp; Radiology</option>
        <option value="Public Health Dentistry">Public Health Dentistry</option>
        <option value="Other">Other</option>
      </select>

      {/* Doctor info below referred department */}
      <div style={{
        marginTop: 16, padding: '12px 16px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(165,180,252,0.3)',
        borderRadius: 8, maxWidth: 400,
      }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
          Treating Doctor
        </p>
        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
          {doctorName || '—'}
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#c7d2fe' }}>
          {user?.department || localStorage.getItem('doctorDepartment') || localStorage.getItem('ugDepartment') || localStorage.getItem('pgDepartment') || 'Oral Medicine and Radiology'}
          {user?.role ? ` · ${String(user.role).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}` : ''}
        </p>
      </div>
      <div className="form-group" style={{ marginTop: 32 }}>
        <label className="omr-lbl">Doctor's Digital Signature: <span style={{ color: '#b91c1c' }}>*</span></label>
        <input type="file" accept="image/*" onChange={e => handleFileChange(e.target.files[0])} style={{ display: 'block', marginTop: 8 }} />
        {signaturePreview && (
          <div style={{ marginTop: 12 }}>
            <img src={signaturePreview} alt="Signature preview" style={{ maxHeight: 80, border: '1px solid #ccc', borderRadius: 4 }} />
          </div>
        )}
        {!form.digitalSignature && !signaturePreview && (
          <p style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: 4 }}>Signature is required to submit.</p>
        )}
      </div>
    </div>
  );

  const pages = [renderPage0, renderPage1, renderPage2, renderPage3, renderPage4, renderPage5, renderPage6, renderPage7];
  const pageTitles = [
    'Patient Info & History',
    'Personal History & Clinical Examination',
    'Local Examination',
    'Hard Tissue Examination',
    'Soft Tissue Examination (a–e)',
    'Soft Tissue Examination (f–i)',
    'Examination of Lesion',
    'Diagnosis, Investigation & Treatment',
  ];

  return (
    <>
      {/* Critical Condition — red banner, shown above allergy */}
      {showCritical && criticalCondition && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, width: '100vw', zIndex: 100000,
          background: '#fee2e2', borderBottom: '2px solid #ef4444',
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px',
          boxSizing: 'border-box', boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🚨</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: '#991b1b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            CRITICAL CONDITION: {criticalCondition}
          </span>
          <button onClick={() => setShowCritical(false)} aria-label="Dismiss"
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', fontSize: 20, color: '#991b1b', cursor: 'pointer', flexShrink: 0, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* Allergy banner — pushed down if critical banner is showing */}
      {showAllergy && (
        <div style={{
          position: 'fixed', top: showCritical && criticalCondition ? 44 : 0, left: 0, right: 0, width: '100vw', zIndex: 99999,
          background: '#fff3cd', borderBottom: '2px solid #f59e0b',
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px',
          boxSizing: 'border-box', boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
        }}>
          <span style={{ fontSize: 18, color: '#d97706', flexShrink: 0 }}>⚠️</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatAllergyTicker(allergyMessage)}
          </span>
          <button onClick={() => setShowAllergy(false)} aria-label="Dismiss"
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', fontSize: 20, color: '#92400e', cursor: 'pointer', flexShrink: 0, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      )}

      <div className="omr-wrapper">
        {toast && <div className={`omr-toast omr-toast-${toast.type}`}>{toast.msg}</div>}

        {messageBox.show && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '32px 36px', maxWidth: 460, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.3)', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.15rem', color: messageBox.title.includes('✅') ? '#166534' : messageBox.title === 'Error' ? '#b91c1c' : '#1d4ed8' }}>
                {messageBox.title}
              </h3>
              <p style={{ margin: '0 0 22px', color: '#333', fontSize: '0.95rem', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{messageBox.message}</p>
              <button onClick={hideMessageBox} style={{ padding: '10px 32px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>OK</button>
            </div>
          </div>
        )}

        {showConsentPrompt && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: '32px 36px', maxWidth: 440, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.35)', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 12px', color: '#1d4ed8', fontSize: '1.1rem' }}>Consent Form Required</h3>
              <p style={{ margin: '0 0 24px', color: '#374151', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Please complete the patient consent form before proceeding with the Oral Medicine &amp; Radiology case sheet.
              </p>
              <button onClick={() => { setShowConsentPrompt(false); navigate(`/consent-form?redirect=${encodeURIComponent(consentRedirectTarget)}`, { replace: true }); }}
                style={{ padding: '10px 28px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                Go to Consent Form
              </button>
            </div>
          </div>
        )}

        <div className="omr-statusbar">
          <span className="omr-statusbar-pid">
            {patientId
              ? <>Patient: <strong>{localStorage.getItem('CurrentpatientName') || patientId}</strong> &nbsp;|&nbsp; ID: {patientId}</>
              : 'No patient loaded'}
          </span>
          {draftSaved && <span className="omr-draft-saved">✓ Draft saved</span>}
        </div>

        <div className="omr-progress-wrap">
          <div className="omr-progress-bar" style={{ width: `${((currentPage + 1) / TOTAL_PAGES) * 100}%` }} />
          <span className="omr-progress-label">Page {currentPage + 1} of {TOTAL_PAGES} — {pageTitles[currentPage]}</span>
        </div>

        <div className="omr-sheet">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/images/logo.png" alt="SRM Dental College Logo" style={{ maxWidth: 110, height: 'auto', marginBottom: 10 }} />
            <h2 style={{ margin: 0, fontSize: '1.9em', fontWeight: 800, letterSpacing: '0.3px', color: '#fff', borderBottom: 'none' }}>
              SRM Dental College
            </h2>
          </div>
          {pages[currentPage]()}
        </div>

        <div className="omr-submit-bar">
          {currentPage > 0 && (
            <button type="button" className="omr-btn-prev" onClick={handlePrev}>← Previous</button>
          )}
          {currentPage < TOTAL_PAGES - 1 ? (
            <button type="button" className="omr-btn-submit" onClick={handleNext}>Next →</button>
          ) : (
            <>
              <button type="button" className="omr-btn-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Case Sheet ✓'}
              </button>
              <button
                type="button"
                className="omr-btn-prev"
                onClick={() => navigate('/prescriptions')}
                style={{ background: 'rgba(99,102,241,0.25)', border: '1.5px solid rgba(165,180,252,0.5)', color: '#c7d2fe' }}
              >
                📋 Prescription
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default OralMedicine;
