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
const TOTAL_PAGES = 5;

const INITIAL_FORM = {
  caseSheetNumber: '', date: new Date().toISOString().split('T')[0],
  patientName: '', opNo: '',
  age: '', sex: '',
  occupation: '', income: '', religion: '', address: '',
  chiefComplaint: '',
  historyOfPresentIllness: '',
  pastMedicalHistory: '', currentMedications: '', allergies: '', chronicConditions: '',
  pastSurgicalHistory: '',
  pastDentalHistory: '', previousDentalTreatment: '', lastDentalVisit: '',
  smoking: false, alcohol: false, betelNut: false, tobacco: false,
  personalDiet: '', personalSleep: '', oralHygieneHabits: '',
  familyHistory: '', hereditaryDiseases: '', similarComplaintsInFamily: '', systemicIllnesses: '',
  generalExamination: '',
  built: '', nourishment: '', pallor: '', icterus: '', cyanosis: '',
  clubbing: '', edema: '', lymphadenopathy: '', vitalSigns: '',
  cns: '', cvs: '', respiratory: '', gastrointestinal: '', genitoUrinary: '', skeletal: '',
  facialSymmetry: '', facialProfile: '',
  earNoseEyes: '',
  tmjInspection: '', tmjPalpation: '', tmjPercussionAuscultation: '',
  lymphNodeExamination: '',
  siteShapeOfMouth: '', mouthOpening: '', jawMovements: '',
  teethPresent: '', sizeShapeColor: '',
  dentalCaries: '', missingTeeth: '', mobility: '', occlusion: '',
  recession: '', attrition: '', calculusAndStains: '', hardTissueOthers: '',
  gingival: '', alveolarMucosa: '', buccalMucosa: '', labialMucosa: '',
  tongue: '', floorOfOralCavity: '', palate: '', pillarOfFaucesAndTonsils: '', retroMolarArea: '',
  lesionInspection: '', lesionPalpation: '', summary: '',
  provisionalDiagnosis: '', differentialDiagnosis: '', clinicalDiagnosis: '',
  invHematological: false, invHematologicalNotes: '',
  invUrine: false, invUrineNotes: '',
  invBiochemical: false, invBiochemicalNotes: '',
  invSerological: false, invSerologicalNotes: '',
  invCytological: false, invCytologicalNotes: '',
  invMicrobiological: false, invMicrobiologicalNotes: '',
  invSpecial: false, invSpecialNotes: '',
  invRadiological: false, invRadiologicalNotes: '',
  invBiopsy: false, invBiopsyNotes: '',
  invHistopathological: false, invHistopathologicalNotes: '',
  invOthers: false, invOthersNotes: '',
  treatmentPlan: '', prognosis: '',
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
  const [signaturePreview, setSignaturePreview] = useState('');
  const [xrayPreview, setXrayPreview] = useState('');
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '' });
  const draftTimerRef = useRef(null);

  const patientId   = localStorage.getItem('CurrentpatientId') || '';
  const patientName = localStorage.getItem('CurrentpatientName') || '';
  const doctorId    = localStorage.getItem('doctorId') || '';
  const doctorName  = localStorage.getItem('doctorName') || user?.name || '';
  const token       = localStorage.getItem('token') || '';

  const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  /* ── Consent flow (matches Prosthodontics) ── */
  useEffect(() => {
    const navState = location.state || {};
    if (!navState.requestConsentAfterEntry) return;
    if (navState[CASE_CONSENT_NAV_STATE_KEY]) return;
    const redirectTarget = `${location.pathname}${location.search}`;
    const shouldOpenConsent = window.confirm(
      'Please complete the consent form before proceeding with the department case sheet.'
    );
    if (shouldOpenConsent) {
      navigate(`/consent-form?redirect=${encodeURIComponent(redirectTarget)}`, { replace: true });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  /* ── Redo-edit prefill (matches Prosthodontics) ── */
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
          setForm(prev => ({ ...prev, ...draft.data.form }));
          if (typeof draft.data.signaturePreview === 'string' && draft.data.signaturePreview.trim()) {
            setSignaturePreview(draft.data.signaturePreview);
          }
          if (Number.isFinite(draft.step)) {
            setCurrentPage(Math.max(0, Math.min(Number(draft.step), TOTAL_PAGES - 1)));
          }
        }
      } finally {
        if (!cancelled) setIsDraftHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  /* ── Auto-save draft ── */
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

  /* ── Save draft on page unload ── */
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

  /* ── Pre-fill patient name ── */
  useEffect(() => {
    if (patientName && !form.patientName) setForm(prev => ({ ...prev, patientName }));
  }, [patientName]); // eslint-disable-line

  /* ── Load allergy info ── */
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
        const res = await fetch(`${API_BASE_URL}/api/doctor-patient/${pid}`);
        const result = res.ok ? await res.json() : null;
        const p = extractPatient(result);
        if (!p) { if (isMounted) setAllergyMessage('No known allergies'); return; }
        const drug = toListString(p.vitals?.drugAllergies);
        const known = toListString(p.medicalInfo?.knownAllergies);
        const diet = toListString(p.vitals?.dietAllergies);
        if (!isMounted) return;
        if (drug) setAllergyMessage(`Drug Allergies: ${drug}`);
        else if (known) setAllergyMessage(`Known Allergies: ${known}`);
        else if (diet) setAllergyMessage(`Diet Allergies: ${diet}`);
        else setAllergyMessage('No known allergies');
      } catch { if (isMounted) setAllergyMessage('No known allergies'); }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  /* ── Load X-ray from General Case Sheet ── */
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

  /* ── Scroll to top on page change ── */
  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);

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

  const previewSignature = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setSignaturePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (file) => {
    setForm(prev => ({ ...prev, digitalSignature: file }));
    previewSignature(file);
  };

  const validate = () => {
    const e = {};
    if (!form.patientName.trim())    e.patientName    = 'Patient name is required.';
    if (!form.chiefComplaint.trim()) e.chiefComplaint = 'Chief complaint is required.';
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
    if (!patientId)  { showToast('No patient loaded. Go back and load a patient first.', 'error'); return; }
    if (!doctorId)   { showToast('Doctor identity not found. Please log in again.', 'error'); return; }
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

      const payload = {
        ...form,
        patientId,
        patientName: form.patientName || patientName,
        doctorId, doctorName,
        age: Number(form.age) || 0,
        gender: form.sex,
      };

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
      if (res.ok) {
        if (data.data?._id) localStorage.setItem('caseId', data.data._id);
        await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
        showMessageBox('Success', 'Case sheet submitted successfully!');
        setTimeout(() => navigate('/prescriptions'), 1500);
      } else {
        showMessageBox('Error', data.message || 'Submission failed.');
      }
    } catch {
      showMessageBox('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Shorthand renderers ── */
  const ui = (field, type = 'text', style = {}) => (
    <input className="omr-uinput" type={type} value={form[field]} onChange={e => set(field, e.target.value)} style={style} />
  );
  const ta = (field, rows = 3, large = false) => (
    <textarea className={`omr-ta${large ? ' omr-ta-lg' : ''}`} rows={rows} value={form[field]} onChange={e => set(field, e.target.value)} />
  );
  const chk = (field, label) => (
    <label className="omr-habit-chk" key={field}>
      <input type="checkbox" checked={form[field]} onChange={e => set(field, e.target.checked)} />{label}
    </label>
  );
  const inv = (key, label) => (
    <div className="omr-inv-item" key={key}>
      <label className="omr-inv-chk-label">
        <input type="checkbox" checked={form[`inv${key}`]} onChange={e => set(`inv${key}`, e.target.checked)} />{label}
      </label>
      {form[`inv${key}`] && (
        <input className="omr-inv-notes-inp" type="text" value={form[`inv${key}Notes`]}
          onChange={e => set(`inv${key}Notes`, e.target.value)} placeholder="findings..." />
      )}
    </div>
  );

  /* ── Page renderers ── */

  /* PAGE 0 — Header + Chief Complaint + History + Past Histories */
  const renderPage0 = () => (
    <div className="omr-page-content">
      {/* X-ray from General Case Sheet */}
      {xrayPreview && (
        <div className="xray-preview-container" style={{ marginBottom: 16 }}>
          <label className="omr-lbl">X-ray Image:</label>
          <img src={xrayPreview} alt="X-ray preview" className="xray-preview" />
        </div>
      )}

      <h2 className="omr-sheet-title" style={{ marginTop: 8 }}>ORAL MEDICINE AND RADIOLOGY</h2>

      {/* Header grid — matches PDF exactly */}
      <div className="omr-header-grid">
        <div className="omr-header-date omr-field-inline">
          <span className="omr-lbl">DATE:</span>{ui('date', 'date')}
        </div>
        <div className="omr-header-casesheet omr-field-inline" style={{ justifyContent: 'center' }}>
          <span className="omr-lbl">CASE SHEET:…………………….</span>
          {ui('caseSheetNumber', 'text', { maxWidth: '200px' })}
        </div>
        <div className="omr-header-row">
          <div className="omr-field-inline"><span className="omr-lbl">NAME:</span>{ui('patientName')}</div>
          <div className="omr-field-inline"><span className="omr-lbl">OP.NO:</span>{ui('opNo')}</div>
        </div>
        {errors.patientName && <p className="omr-error">{errors.patientName}</p>}
      </div>

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

  /* PAGE 1 — Personal History + Family History + Clinical Examination + Review of Systems */
  const renderPage1 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>

      <p className="omr-section-title">PERSONAL HISTORY:</p>
      <div className="omr-habits-row">
        {chk('smoking',  'Smoking')}
        {chk('alcohol',  'Alcohol')}
        {chk('betelNut', 'Betel Nut')}
        {chk('tobacco',  'Tobacco')}
      </div>
      {ta('oralHygieneHabits', 3)}

      <p className="omr-section-title">FAMILY HISTORY:</p>
      {ta('familyHistory', 4)}

      <p className="omr-section-title">CLINICAL EXAMINATION</p>
      <p className="omr-section-title" style={{ marginTop: 0 }}>GENERAL EXAMINATION:</p>
      {ta('generalExamination', 4)}

      <p className="omr-subsection-title">REVIEW OF SYSTEMS:</p>
      <p className="omr-item-label">1. CENTRAL NERVOUS SYSTEM:</p>{ta('cns', 2)}
      <p className="omr-item-label">2. CARDIO VASCULAR SYSTEM:</p>{ta('cvs', 2)}
      <p className="omr-item-label">3. RESPIRATORY SYSTEM:</p>{ta('respiratory', 2)}
      <p className="omr-item-label">4. GASTRO-INTESTINAL SYSTEM:</p>{ta('gastrointestinal', 2)}
      <p className="omr-item-label">5. GENITO-URINARY SYSTEM:</p>{ta('genitoUrinary', 2)}
      <p className="omr-item-label">6. SKELETAL SYSTEM:</p>{ta('skeletal', 2)}
    </div>
  );

  /* PAGE 2 — Local Examination: Extra Oral + Intra Oral + Hard Tissue */
  const renderPage2 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>

      <p className="omr-section-title">LOCAL EXAMINATION</p>
      <p className="omr-section-title" style={{ marginTop: 0 }}>EXTRA ORAL EXAMINATION</p>

      <p className="omr-item-label">a) Facial Symmetry:</p>{ta('facialSymmetry', 2)}
      <p className="omr-item-label">b) Facial Profile:</p>{ta('facialProfile', 2)}
      <p className="omr-item-label">c) Ear, Nose, Eyes:</p>{ta('earNoseEyes', 2)}

      <p className="omr-item-label">d) TMJ Examination:</p>
      <p className="omr-item-label-indent">-Inspection:</p>{ta('tmjInspection', 2)}
      <p className="omr-item-label-indent">-Palpation:</p>{ta('tmjPalpation', 2)}
      <p className="omr-item-label-indent">-Percussion and Auscultation:</p>{ta('tmjPercussionAuscultation', 2)}

      <p className="omr-item-label">e) Lymph node Examination:</p>{ta('lymphNodeExamination', 2)}

      <p className="omr-section-title">INTRA ORAL EXAMINATION</p>
      <p className="omr-item-label">1. Site and Shape of the mouth:</p>{ta('siteShapeOfMouth', 2)}
      <p className="omr-item-label">2. Mouth Opening:</p>{ta('mouthOpening', 2)}
      <p className="omr-item-label">3. Jaw movements:</p>{ta('jawMovements', 2)}

      <p className="omr-subsection-title">Hard Tissue Examination</p>
      <p className="omr-item-label">1. Teeth present:</p>{ta('teethPresent', 2)}
      <p className="omr-item-label">2. Size, shape and color:</p>{ta('sizeShapeColor', 2)}
      <p className="omr-item-label">3. Dental caries:</p>{ta('dentalCaries', 2)}
      <p className="omr-item-label">4. Missing</p>{ta('missingTeeth', 2)}
      <p className="omr-item-label">5. Mobility:</p>{ta('mobility', 2)}
      <p className="omr-item-label">6. Occlusion:</p>{ta('occlusion', 2)}
      <p className="omr-item-label">7. Recession:</p>{ta('recession', 2)}
      <p className="omr-item-label">8. Attrition:</p>{ta('attrition', 2)}
      <p className="omr-item-label">9. Calculus and stains:</p>{ta('calculusAndStains', 2)}
      <p className="omr-item-label">10.Others:</p>{ta('hardTissueOthers', 2)}
    </div>
  );

  /* PAGE 3 — Soft Tissue Examination + Examination of Lesion */
  const renderPage3 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>

      <p className="omr-subsection-title">Soft Tissue Examination:</p>
      <p className="omr-item-label">a. Gingival</p>{ta('gingival', 3)}
      <p className="omr-item-label">b. Alveolar Mucosa:</p>{ta('alveolarMucosa', 3)}
      <p className="omr-item-label">c. Buccal mucosa:</p>{ta('buccalMucosa', 3)}
      <p className="omr-item-label">d. Labial mucosa:</p>{ta('labialMucosa', 3)}
      <p className="omr-item-label">e. Tongue:</p>{ta('tongue', 3)}
      <p className="omr-item-label">f. Floor of the oral cavity:</p>{ta('floorOfOralCavity', 3)}
      <p className="omr-item-label">g. Palate:</p>{ta('palate', 3)}
      <p className="omr-item-label">h. Pillar of Fauces and tonsils:</p>{ta('pillarOfFaucesAndTonsils', 3)}
      <p className="omr-item-label">i. Retro-molar area:</p>{ta('retroMolarArea', 3)}

      <p className="omr-subsection-title">Examination of Lesion</p>
      <p className="omr-item-label">A. Inspection:</p>{ta('lesionInspection', 5)}
      <p className="omr-item-label">B. Palpation:</p>{ta('lesionPalpation', 5)}
      <p className="omr-item-label">Summary:</p>{ta('summary', 4)}
    </div>
  );

  /* PAGE 4 — Diagnosis + Investigation + Treatment + Signature */
  const renderPage4 = () => (
    <div className="omr-page-content">
      <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>

      <p className="omr-section-title">Provisional Diagnosis:</p>{ta('provisionalDiagnosis', 3)}

      <p className="omr-section-title">Differential Diagnosis:</p>{ta('differentialDiagnosis', 3)}

      <p className="omr-section-title">Investigation:</p>
      <div className="omr-inv-list">
        {inv('Hematological',    'a) Hematological')}
        {inv('Urine',            'b) Urine')}
        {inv('Biochemical',      'c) Bio-Chemical')}
        {inv('Serological',      'd) Serological')}
        {inv('Cytological',      'e) Cytological')}
        {inv('Microbiological',  'f) Microbiological')}
        {inv('Special',          'g) Special investigations')}
        {inv('Radiological',     'h) Radiological')}
        {inv('Biopsy',           'i) Biopsy')}
        {inv('Histopathological','j) Histopathological Examination')}
        {inv('Others',           'k) Any others')}
      </div>

      <p className="omr-section-title">Clinical Diagnosis:</p>{ta('clinicalDiagnosis', 3)}

      <p className="omr-section-title">Treatment planning:</p>{ta('treatmentPlan', 4)}

      <p className="omr-section-title">Prognosis:</p>{ta('prognosis', 3)}

      {/* Chargeable Investigations */}
      <p className="omr-section-title" style={{ marginTop: 24 }}>Chargeable Investigations:</p>
      <div className="omr-inv-list">
        {/* Biopsy */}
        <div className="omr-inv-item">
          <label className="omr-inv-chk-label">
            <input type="checkbox" checked={form.chargeBiopsy}
              onChange={e => set('chargeBiopsy', e.target.checked)} />
            Biopsy — <span className="omr-charge-rate">Rs. 250</span>
          </label>
        </div>
        {/* Exfoliative Cytology */}
        <div className="omr-inv-item">
          <label className="omr-inv-chk-label">
            <input type="checkbox" checked={form.chargeExfoliativeCytology}
              onChange={e => set('chargeExfoliativeCytology', e.target.checked)} />
            Exfoliative Cytology — <span className="omr-charge-rate">Rs. 50</span>
          </label>
        </div>

        {/* X-ray section */}
        <p className="omr-item-label" style={{ marginTop: 12, marginBottom: 4 }}>X-ray Taken:</p>
        {[
          ['chargeIOPA',              'IOPA',                    'Rs. 30'],
          ['chargeBitewing',          'Bitewing',                'Rs. 30'],
          ['chargeOcclusal',          'Occlusal',                'Rs. 150'],
          ['chargeOPGWithFilm',       'OPG with film',           'Rs. 300'],
          ['chargeOPGWithoutFilm',    'OPG without film',        'Rs. 200'],
          ['chargeLateralCephalogram','Lateral Cephalogram',     'Rs. 300'],
          ['chargeCBCT',              'CBCT',                    'Cost yet to be decided'],
        ].map(([field, label, rate]) => (
          <div className="omr-inv-item" key={field}>
            <label className="omr-inv-chk-label">
              <input type="checkbox" checked={form[field]}
                onChange={e => set(field, e.target.checked)} />
              {label} — <span className="omr-charge-rate">{rate}</span>
            </label>
          </div>
        ))}

        {/* Description box */}
        <div style={{ marginTop: 12 }}>
          <p className="omr-item-label">Description / Remarks:</p>
          {ta('chargeDescription', 3)}
        </div>
      </div>

      {/* Digital Signature */}
      <div className="form-group" style={{ marginTop: 32 }}>
        <label className="omr-lbl">
          Doctor's Digital Signature: <span style={{ color: '#b91c1c' }}>*</span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={e => handleFileChange(e.target.files[0])}
          style={{ display: 'block', marginTop: 8 }}
        />
        {signaturePreview && (
          <div style={{ marginTop: 12 }}>
            <img src={signaturePreview} alt="Signature preview"
              style={{ maxHeight: 80, border: '1px solid #ccc', borderRadius: 4 }} />
          </div>
        )}
        {!form.digitalSignature && !signaturePreview && (
          <p style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: 4 }}>
            Signature is required to submit.
          </p>
        )}
      </div>
    </div>
  );

  const pages = [renderPage0, renderPage1, renderPage2, renderPage3, renderPage4];
  const pageTitles = [
    'Patient Info & History',
    'Personal History & Clinical Examination',
    'Local Examination',
    'Soft Tissue & Lesion Examination',
    'Diagnosis, Investigation & Treatment',
  ];

  return (
    <div className="omr-wrapper">
      {/* Toast */}
      {toast && <div className={`omr-toast omr-toast-${toast.type}`}>{toast.msg}</div>}

      {/* Message Box (matches Prosthodontics) */}
      {messageBox.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: '28px 36px',
            maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            fontFamily: 'Arial, sans-serif', textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 12px', color: messageBox.title === 'Error' ? '#b91c1c' : '#166534' }}>
              {messageBox.title}
            </h3>
            <p style={{ margin: '0 0 20px', color: '#333', fontSize: '0.95rem' }}>{messageBox.message}</p>
            <button onClick={hideMessageBox} style={{
              padding: '10px 32px', background: '#1d4ed8', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem'
            }}>OK</button>
          </div>
        </div>
      )}

      {/* Allergy ticker — fixed top banner (matches Pedodontics/Complete Denture) */}
      {showAllergy && (
        <div className="allergy-alert show" id="patientAllergyAlert">
          <span className="alert-icon">⚠️</span>
          <div className="allergy-flow-window">
            <span id="allergyMessage">{formatAllergyTicker(allergyMessage)}</span>
          </div>
          <button className="close-btn" onClick={() => setShowAllergy(false)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Status bar */}
      <div className="omr-statusbar">
        <span className="omr-statusbar-pid">
          {patientId
            ? <>Patient: <strong>{localStorage.getItem('CurrentpatientName') || patientId}</strong> &nbsp;|&nbsp; ID: {patientId}</>
            : 'No patient loaded'}
        </span>
        {draftSaved && <span className="omr-draft-saved">✓ Draft saved</span>}
      </div>

      {/* Progress bar */}
      <div className="omr-progress-wrap">
        <div className="omr-progress-bar" style={{ width: `${((currentPage + 1) / TOTAL_PAGES) * 100}%` }} />
        <span className="omr-progress-label">Page {currentPage + 1} of {TOTAL_PAGES} — {pageTitles[currentPage]}</span>
      </div>

      {/* White paper sheet */}
      <div className="omr-sheet">
        {/* Logo header — matches Pedodontics */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/images/logo.png" alt="SRM Dental College Logo"
            style={{ maxWidth: 110, height: 'auto', marginBottom: 10 }} />
          <h2 style={{ margin: 0, fontSize: '1.9em', fontWeight: 800, letterSpacing: '0.3px', color: '#fff', borderBottom: 'none' }}>
            SRM Dental College
          </h2>
        </div>

        {/* Render current page */}
        {pages[currentPage]()}
      </div>

      {/* Navigation buttons (matches Prosthodontics) */}
      <div className="omr-submit-bar">
        {currentPage > 0 && (
          <button type="button" className="omr-btn-back" onClick={handlePrev}>
            ← Previous
          </button>
        )}
        {currentPage < TOTAL_PAGES - 1 ? (
          <button type="button" className="omr-btn-submit" onClick={handleNext}>
            Next →
          </button>
        ) : (
          <button type="button" className="omr-btn-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Case Sheet'}
          </button>
        )}
        <button type="button" className="omr-btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    </div>
  );
};

export default OralMedicine;
