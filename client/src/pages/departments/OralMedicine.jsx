import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { saveCaseDraft, loadCaseDraft, clearCaseDraft } from '../../utils/caseDraft';
import './OralMedicine.css';

const DRAFT_ROUTE_KEY = '/oral-medicine';

const INITIAL_FORM = {
  /* Header */
  caseSheetNumber: '', date: new Date().toISOString().split('T')[0],
  patientName: '', opNo: '',
  age: '', sex: '',
  occupation: '', income: '', religion: '', address: '',
  /* S1 */
  chiefComplaint: '',
  /* S2 */
  historyOfPresentIllness: '',
  /* S3 Past History */
  pastMedicalHistory: '', currentMedications: '', allergies: '', chronicConditions: '',
  pastSurgicalHistory: '',
  pastDentalHistory: '', previousDentalTreatment: '', lastDentalVisit: '',
  /* S4 Personal & Family */
  smoking: false, alcohol: false, betelNut: false, tobacco: false,
  personalDiet: '', personalSleep: '', oralHygieneHabits: '',
  familyHistory: '', hereditaryDiseases: '', similarComplaintsInFamily: '', systemicIllnesses: '',
  /* S5 Clinical Exam */
  generalExamination: '',
  built: '', nourishment: '', pallor: '', icterus: '', cyanosis: '',
  clubbing: '', edema: '', lymphadenopathy: '', vitalSigns: '',
  cns: '', cvs: '', respiratory: '', gastrointestinal: '', genitoUrinary: '', skeletal: '',
  /* S6 Extra Oral */
  facialSymmetry: '', facialProfile: '',
  earNoseEyes: '',
  tmjInspection: '', tmjPalpation: '', tmjPercussionAuscultation: '',
  lymphNodeExamination: '',
  /* S7 Intra Oral */
  siteShapeOfMouth: '', mouthOpening: '', jawMovements: '',
  /* S8 Hard Tissue */
  teethPresent: '', sizeShapeColor: '',
  dentalCaries: '', missingTeeth: '', mobility: '', occlusion: '',
  recession: '', attrition: '', calculusAndStains: '', hardTissueOthers: '',
  /* S9 Soft Tissue */
  gingival: '', alveolarMucosa: '', buccalMucosa: '', labialMucosa: '',
  tongue: '', floorOfOralCavity: '', palate: '', pillarOfFaucesAndTonsils: '', retroMolarArea: '',
  /* S10 Lesion */
  lesionInspection: '', lesionPalpation: '', summary: '',
  /* S11 Diagnosis */
  provisionalDiagnosis: '', differentialDiagnosis: '', clinicalDiagnosis: '',
  /* S12 Investigations */
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
  /* S13 Treatment */
  treatmentPlan: '', prognosis: '',
};

const OralMedicine = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const draftTimerRef = useRef(null);

  const patientId   = localStorage.getItem('CurrentpatientId') || '';
  const patientName = localStorage.getItem('CurrentpatientName') || '';
  const doctorId    = localStorage.getItem('doctorId') || '';
  const doctorName  = localStorage.getItem('doctorName') || user?.name || '';
  const token       = localStorage.getItem('token') || '';

  /* Draft hydration */
  useEffect(() => {
    if (!patientId) { setIsDraftHydrated(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const draft = await loadCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
        if (!cancelled && draft?.data?.form) setForm(prev => ({ ...prev, ...draft.data.form }));
      } finally {
        if (!cancelled) setIsDraftHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  /* Auto-save draft */
  useEffect(() => {
    if (!isDraftHydrated || !patientId) return;
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(async () => {
      await saveCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY, step: 0, data: { form } });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 1500);
    return () => clearTimeout(draftTimerRef.current);
  }, [form, isDraftHydrated, patientId]);

  /* Pre-fill patient name */
  useEffect(() => {
    if (patientName && !form.patientName) setForm(prev => ({ ...prev, patientName }));
  }, [patientName]); // eslint-disable-line

  const set = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.patientName.trim())    e.patientName    = 'Patient name is required.';
    if (!form.age)                   e.age            = 'Age is required.';
    if (!form.sex)                   e.sex            = 'Sex is required.';
    if (!form.chiefComplaint.trim()) e.chiefComplaint = 'Chief complaint is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { showToast('Please fill required fields.', 'error'); return; }
    if (!patientId)  { showToast('No patient loaded. Go back and load a patient first.', 'error'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        patientId,
        patientName: form.patientName || patientName,
        doctorId, doctorName,
        age: Number(form.age) || 0,
        gender: form.sex,
      };
      const res = await fetch(`${API_BASE_URL}/api/oral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
        showToast('Case sheet submitted successfully!');
        setTimeout(() => navigate('/prescriptions'), 1800);
      } else {
        showToast(data.message || 'Submission failed.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Shorthand renderers ── */
  /* Underline text input */
  const ui = (field, type = 'text', style = {}) => (
    <input
      className="omr-uinput"
      type={type}
      value={form[field]}
      onChange={e => set(field, e.target.value)}
      style={style}
    />
  );

  /* Textarea */
  const ta = (field, rows = 3, large = false) => (
    <textarea
      className={`omr-ta${large ? ' omr-ta-lg' : ''}`}
      rows={rows}
      value={form[field]}
      onChange={e => set(field, e.target.value)}
    />
  );

  /* Checkbox habit */
  const chk = (field, label) => (
    <label className="omr-habit-chk" key={field}>
      <input type="checkbox" checked={form[field]} onChange={e => set(field, e.target.checked)} />
      {label}
    </label>
  );

  /* Investigation row */
  const inv = (key, label) => (
    <div className="omr-inv-item" key={key}>
      <label className="omr-inv-chk-label">
        <input type="checkbox" checked={form[`inv${key}`]} onChange={e => set(`inv${key}`, e.target.checked)} />
        {label}
      </label>
      {form[`inv${key}`] && (
        <input
          className="omr-inv-notes-inp"
          type="text"
          value={form[`inv${key}Notes`]}
          onChange={e => set(`inv${key}Notes`, e.target.value)}
          placeholder="findings..."
        />
      )}
    </div>
  );

  return (
    <div className="omr-wrapper">
      {/* Toast */}
      {toast && <div className={`omr-toast omr-toast-${toast.type}`}>{toast.msg}</div>}

      {/* Status bar */}
      <div className="omr-statusbar">
        <span className="omr-statusbar-pid">
          {patientId ? `Patient ID: ${patientId}` : 'No patient loaded'}
        </span>
        {draftSaved && <span className="omr-draft-saved">✓ Draft saved</span>}
      </div>

      {/* ── White paper sheet ── */}
      <div className="omr-sheet">

        {/* Title */}
        <h2 className="omr-sheet-title">ORAL MEDICINE AND RADIOLOGY</h2>

        {/* ── HEADER — matches PDF exactly ── */}
        <div className="omr-header-grid">

          {/* DATE: */}
          <div className="omr-header-date omr-field-inline">
            <span className="omr-lbl">DATE:</span>
            {ui('date', 'date')}
          </div>

          {/* CASE SHEET: ……………………….. — centered */}
          <div className="omr-header-casesheet omr-field-inline" style={{ justifyContent: 'center' }}>
            <span className="omr-lbl">CASE SHEET:</span>
            {ui('caseSheetNumber', 'text', { maxWidth: '220px' })}
          </div>

          {/* NAME: | OP.NO: */}
          <div className="omr-header-row">
            <div className="omr-field-inline">
              <span className="omr-lbl">NAME:</span>
              {ui('patientName')}
            </div>
            <div className="omr-field-inline">
              <span className="omr-lbl">OP.NO:</span>
              {ui('opNo')}
            </div>
          </div>
          {(errors.patientName) && <p className="omr-error">{errors.patientName}</p>}

          {/* AGE/SEX: | OCCUPATION: */}
          <div className="omr-header-row">
            <div className="omr-field-inline">
              <span className="omr-lbl">AGE/SEX:</span>
              <div className="omr-agesex-wrap">
                <input
                  className="omr-age-inp"
                  type="number"
                  min="0" max="150"
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                />
                <span className="omr-slash">/</span>
                <select
                  className="omr-sex-sel"
                  value={form.sex}
                  onChange={e => set('sex', e.target.value)}
                >
                  <option value=""></option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="omr-field-inline">
              <span className="omr-lbl">OCCUPATION:</span>
              {ui('occupation')}
            </div>
          </div>
          {(errors.age || errors.sex) && <p className="omr-error">{errors.age || errors.sex}</p>}

          {/* INCOME: | RELIGION: */}
          <div className="omr-header-row">
            <div className="omr-field-inline">
              <span className="omr-lbl">INCOME:</span>
              {ui('income')}
            </div>
            <div className="omr-field-inline">
              <span className="omr-lbl">RELIGION:</span>
              {ui('religion')}
            </div>
          </div>

          {/* ADDRESS: */}
          <div className="omr-header-address omr-field-inline" style={{ alignItems: 'flex-start' }}>
            <span className="omr-lbl">ADDRESS:</span>
            <textarea
              className="omr-addr-ta"
              rows={2}
              value={form.address}
              onChange={e => set('address', e.target.value)}
            />
          </div>
        </div>

        {/* ── CHIEF COMPLAINT ── */}
        <p className="omr-section-title">CHIEF COMPLAINT:</p>
        {ta('chiefComplaint', 4, true)}
        {errors.chiefComplaint && <p className="omr-error">{errors.chiefComplaint}</p>}

        {/* ── HISTORY OF PRESENTING ILLNESS ── */}
        <p className="omr-section-title">HISTORY OF PRESENTING ILLNESS:</p>
        {ta('historyOfPresentIllness', 4, true)}

        {/* ── PAST MEDICAL HISTORY ── */}
        <p className="omr-section-title">PAST MEDICAL HISTORY:</p>
        {ta('pastMedicalHistory', 3)}

        {/* ── PAST SURGICAL HISTORY ── */}
        <p className="omr-section-title">PAST SURGICAL HISTORY:</p>
        {ta('pastSurgicalHistory', 3)}

        {/* ── PAST DENTAL HISTORY ── */}
        <p className="omr-section-title">PAST DENTAL HISTORY:</p>
        {ta('pastDentalHistory', 3)}

        {/* ── PERSONAL HISTORY ── */}
        <p className="omr-section-title">PERSONAL HISTORY:</p>
        <div className="omr-habits-row">
          {chk('smoking',  'Smoking')}
          {chk('alcohol',  'Alcohol')}
          {chk('betelNut', 'Betel Nut')}
          {chk('tobacco',  'Tobacco')}
        </div>
        {ta('oralHygieneHabits', 2)}

        {/* ── FAMILY HISTORY ── */}
        <p className="omr-section-title">FAMILY HISTORY:</p>
        {ta('familyHistory', 3)}

        {/* ── CLINICAL EXAMINATION ── */}
        <p className="omr-section-title">CLINICAL EXAMINATION</p>
        <p className="omr-section-title" style={{ marginTop: 0 }}>GENERAL EXAMINATION:</p>
        {ta('generalExamination', 4)}

        {/* ── REVIEW OF SYSTEMS ── */}
        <p className="omr-subsection-title">REVIEW OF SYSTEMS:</p>

        <p className="omr-item-label">1. CENTRAL NERVOUS SYSTEM:</p>
        {ta('cns', 2)}

        <p className="omr-item-label">2. CARDIO VASCULAR SYSTEM:</p>
        {ta('cvs', 2)}

        <p className="omr-item-label">3. RESPIRATORY SYSTEM:</p>
        {ta('respiratory', 2)}

        <p className="omr-item-label">4. GASTRO-INTESTINAL SYSTEM:</p>
        {ta('gastrointestinal', 2)}

        <p className="omr-item-label">5. GENITO-URINARY SYSTEM:</p>
        {ta('genitoUrinary', 2)}

        <p className="omr-item-label">6. SKELETAL SYSTEM:</p>
        {ta('skeletal', 2)}

        {/* ── LOCAL EXAMINATION ── */}
        <p className="omr-section-title">LOCAL EXAMINATION</p>
        <p className="omr-section-title" style={{ marginTop: 0 }}>EXTRA ORAL EXAMINATION</p>

        <p className="omr-item-label">a) Facial Symmetry:</p>
        {ta('facialSymmetry', 2)}

        <p className="omr-item-label">b) Facial Profile:</p>
        {ta('facialProfile', 2)}

        <p className="omr-item-label">c) Ear, Nose, Eyes:</p>
        {ta('earNoseEyes', 2)}

        <p className="omr-item-label">d) TMJ Examination:</p>
        <p className="omr-item-label-indent">-Inspection:</p>
        {ta('tmjInspection', 2)}
        <p className="omr-item-label-indent">-Palpation:</p>
        {ta('tmjPalpation', 2)}
        <p className="omr-item-label-indent">-Percussion and Auscultation:</p>
        {ta('tmjPercussionAuscultation', 2)}

        <p className="omr-item-label">e) Lymph node Examination:</p>
        {ta('lymphNodeExamination', 2)}

        {/* ── INTRA ORAL EXAMINATION ── */}
        <p className="omr-section-title">INTRA ORAL EXAMINATION</p>

        <p className="omr-item-label">1. Site and Shape of the mouth:</p>
        {ta('siteShapeOfMouth', 2)}

        <p className="omr-item-label">2. Mouth Opening:</p>
        {ta('mouthOpening', 2)}

        <p className="omr-item-label">3. Jaw movements:</p>
        {ta('jawMovements', 2)}

        {/* ── HARD TISSUE EXAMINATION ── */}
        <p className="omr-subsection-title">Hard Tissue Examination</p>

        <p className="omr-item-label">1. Teeth present:</p>
        {ta('teethPresent', 2)}

        <p className="omr-item-label">2. Size, shape and color:</p>
        {ta('sizeShapeColor', 2)}

        <p className="omr-item-label">3. Dental caries:</p>
        {ta('dentalCaries', 2)}

        <p className="omr-item-label">4. Missing</p>
        {ta('missingTeeth', 2)}

        <p className="omr-item-label">5. Mobility:</p>
        {ta('mobility', 2)}

        <p className="omr-item-label">6. Occlusion:</p>
        {ta('occlusion', 2)}

        <p className="omr-item-label">7. Recession:</p>
        {ta('recession', 2)}

        <p className="omr-item-label">8. Attrition:</p>
        {ta('attrition', 2)}

        <p className="omr-item-label">9. Calculus and stains:</p>
        {ta('calculusAndStains', 2)}

        <p className="omr-item-label">10. Others:</p>
        {ta('hardTissueOthers', 2)}

        {/* ── SOFT TISSUE EXAMINATION ── */}
        <p className="omr-subsection-title">Soft Tissue Examination:</p>

        <p className="omr-item-label">a. Gingival</p>
        {ta('gingival', 2)}

        <p className="omr-item-label">b. Alveolar Mucosa:</p>
        {ta('alveolarMucosa', 2)}

        <p className="omr-item-label">c. Buccal mucosa:</p>
        {ta('buccalMucosa', 2)}

        <p className="omr-item-label">d. Labial mucosa:</p>
        {ta('labialMucosa', 2)}

        <p className="omr-item-label">e. Tongue:</p>
        {ta('tongue', 2)}

        <p className="omr-item-label">f. Floor of the oral cavity:</p>
        {ta('floorOfOralCavity', 2)}

        <p className="omr-item-label">g. Palate:</p>
        {ta('palate', 2)}

        <p className="omr-item-label">h. Pillar of Fauces and tonsils:</p>
        {ta('pillarOfFaucesAndTonsils', 2)}

        <p className="omr-item-label">i. Retro-molar area:</p>
        {ta('retroMolarArea', 2)}

        {/* ── EXAMINATION OF LESION ── */}
        <p className="omr-subsection-title">Examination of Lesion</p>

        <p className="omr-item-label">A. Inspection:</p>
        {ta('lesionInspection', 4)}

        <p className="omr-item-label">B. Palpation:</p>
        {ta('lesionPalpation', 4)}

        <p className="omr-item-label">Summary:</p>
        {ta('summary', 3)}

        {/* ── PROVISIONAL DIAGNOSIS ── */}
        <p className="omr-section-title">Provisional Diagnosis:</p>
        {ta('provisionalDiagnosis', 3)}

        {/* ── DIFFERENTIAL DIAGNOSIS ── */}
        <p className="omr-section-title">Differential Diagnosis:</p>
        {ta('differentialDiagnosis', 3)}

        {/* ── INVESTIGATION ── */}
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

        {/* ── CLINICAL DIAGNOSIS ── */}
        <p className="omr-section-title">Clinical Diagnosis:</p>
        {ta('clinicalDiagnosis', 3)}

        {/* ── TREATMENT PLANNING ── */}
        <p className="omr-section-title">Treatment planning:</p>
        {ta('treatmentPlan', 4)}

        {/* ── PROGNOSIS ── */}
        <p className="omr-section-title">Prognosis:</p>
        {ta('prognosis', 3)}

      </div>{/* end .omr-sheet */}

      {/* Submit / Back buttons */}
      <div className="omr-submit-bar">
        <button type="button" className="omr-btn-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Case Sheet'}
        </button>
        <button type="button" className="omr-btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    </div>
  );
};

export default OralMedicine;
