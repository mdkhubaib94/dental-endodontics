import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Complete_denture.css";
import { readStoredGeneralCaseXray } from '../../../utils/generalCaseXray';
import { API_BASE_URL } from '../../../config/api';
const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';
import { getCurrentPatientId, getSharedXrayImage } from '../../../utils/sharedXray';
import { clearCaseDraft, loadCaseDraft, saveCaseDraft } from '../../../utils/caseDraft';

// Checkbox Group Component (keep your existing one or use this)
function CheckboxGroup({ options, value, onChange, name }) {
  return (
    <div className="checkbox-group">
      {options.map(opt => (
        <label key={opt.value}>
          <input
            type="checkbox"
            name={name}
            value={opt.value}
            checked={value.includes(opt.value)}
            onChange={e => {
              if (e.target.checked) {
                onChange([...value, opt.value]);
              } else {
                onChange(value.filter(v => v !== opt.value));
              }
            }}
          /> {opt.label}
        </label>
      ))}
    </div>
  );
}

export default function Complete_denture() {
  const DRAFT_ROUTE_KEY = '/complete_denture';
  const [currentPage, setCurrentPage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '' });
  const [signaturePreview, setSignaturePreview] = useState('');
  const [allergyMessage, setAllergyMessage] = useState('');
  const [showAllergy, setShowAllergy] = useState(true);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  // Post-entry consent prompt
  useEffect(() => {
    if (location.state?.requestConsentAfterEntry && !location.state?.[CASE_CONSENT_NAV_STATE_KEY]) {
      const confirmed = window.confirm('Please complete the consent form before proceeding. Click OK to open the consent form.');
      if (confirmed) {
        navigate(`/consent-form?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      }
    }
  }, []);

  const [form, setForm] = useState({
    // Patient & Doctor Info (will be populated from localStorage)
    patientId: '',
    patientName: '',
    doctorId: '',
    doctorName: '',
    
    // X-ray Image
    xrayImage: null,
    
    // Page 1
    medicalHistory: [],
    medicalHistoryOthers: "",
    treatmentDetails: "",
    gait: "",
    built: "",
    weight: "",
    height: "",
    bloodPressure: "",
    respiratoryRate: "",
    heartRate: "",
    bodyTemperature: "",
    nutritionalStatus: "",
    mentalAttitude: [],
    habits: [],
    habitsOthers: "",
    habitDuration: "",
    paraHabits: "",
    
    // Page 2
    prevDentalTreatment: "",
    maxillaryDentureNum: "",
    maxillaryDentureType: "",
    mandibularDentureNum: "",
    mandibularDentureType: "",
    patientCommentsDenture: "",
    vdRating: "",
    retentionRating: "",
    stabilityRating: "",
    occlusionRating: "",
    occlusalPlaneRating: "",
    dentureBordersRating: "",
    tissueCoverageRating: "",
    estheticsRating: "",
    midlineRating: "",
    buccalCorridorRating: "",
    articulationRating: "",
    ppsRating: "",
    hygieneRating: "",
    occlusalSchemeExisting: "",
    dentureBaseExisting: "",
    dentureTeethExisting: "",
    toothLossReason: [],
    toothLossReasonOthers: "",
    maxAnteriorLoss: "",
    maxPosteriorLoss: "",
    mandAnteriorLoss: "",
    mandPosteriorLoss: "",
    edentulousDuration: "",
    preExtractionRecords: "",
    
    // Page 3 - All existing fields...
    facialSymmetry: "",
    facialProfile: [],
    facialForm: [],
    maxMouthOpening: "",
    mandibleDeviationOpening: [],
    mandibleDeviationOpeningDirection: [],
    mandibleDeviationClosingDirection: [],
    tmjPainTenderness: "",
    tmjClicking: "",
    tmjCrepitus: "",
    lymphNodes: "",
    lipCompetency: "",
    lipLength: "",
    lipLine: [],
    lipPathology: "",
    muscleTone: [],
    
    // Page 4
    buccalMucosaColor: "",
    buccalMucosaTexture: "",
    buccalMucosaOthers: "",
    floorMouthColor: "",
    floorMouthOthers: "",
    hardPalateArch: [],
    hardPalateShape: [],
    hyperplasia: "",
    wch: "",
    inflammation: "",
    hardPalateOthers: "",
    softPalateForm: [],
    softPalateColor: "",
    softPalateOthers: "",
    palateSensitivity: [],
    lateralThroatForm: [],
    palatalThroatForm: [],
    tongueSize: [],
    tonguePosition: [],
    tongueMobility: [],
    tongueOthers: "",
    
    // Page 5
    maxLabialFrenumNum: "",
    maxLabialFrenumProminence: "",
    maxLabialFrenumClass: "",
    maxLeftBuccalFrenumNum: "",
    maxLeftBuccalFrenumProminence: "",
    maxLeftBuccalFrenumClass: "",
    maxRightBuccalFrenumNum: "",
    maxRightBuccalFrenumProminence: "",
    maxRightBuccalFrenumClass: "",
    mandLabialFrenumNum: "",
    mandLabialFrenumProminence: "",
    mandLabialFrenumClass: "",
    mandLeftBuccalFrenumNum: "",
    mandLeftBuccalFrenumProminence: "",
    mandLeftBuccalFrenumClass: "",
    mandRightBuccalFrenumNum: "",
    mandRightBuccalFrenumProminence: "",
    mandRightBuccalFrenumClass: "",
    maxillaAttachedGingival: [],
    mandibleAttachedGingival: [],
    maxillaSoftTissueRidge: [],
    mandibleSoftTissueRidge: [],
    maxillaMucosaCondition: [],
    mandibleMucosaCondition: [],
    
    // Page 6
    maxillaAntRidgeForm: [],
    maxillaPostRidgeForm: [],
    mandibleAntRidgeForm: [],
    mandiblePostRidgeForm: [],
    ridgeContour: [],
    ridgeRelation: [],
    ridgeParallelism: [],
    ridgeHeight: "",
    ridgeWidth: "",
    undercuts: "",
    exostosis: "",
    torus: "",
    salivaQuantity: [],
    salivaConsistency: [],
    
    // Page 7
    finalDiagnosis: "",
    treatmentPlan: "",
    prostheticPrognosis: "",
    recall: "",
    
    // Digital Signature
    digitalSignature: null
  });

  useEffect(() => {
    const prefill = location.state?.redoEdit ? location.state?.prefillCaseData : null;
    const editCaseId = String(location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || '').trim();
    if (prefill && editCaseId) {
      setForm((prev) => ({ ...prev, ...prefill }));
      if (typeof prefill.digitalSignature === 'string' && prefill.digitalSignature.startsWith('data:')) {
        setSignaturePreview(prefill.digitalSignature);
      }
      if (typeof prefill.xrayImage === 'string' && prefill.xrayImage.startsWith('data:image/')) {
        setXrayPreview(prefill.xrayImage);
      }
      setCurrentPage(0);
      setIsDraftHydrated(true);
      return;
    }

    const patientId = String(
      localStorage.getItem('CurrentpatientId') ||
      localStorage.getItem('currentPatientId') ||
      localStorage.getItem('patientId') ||
      ''
    ).trim();
    setIsDraftHydrated(false);
    if (!patientId) {
      setIsDraftHydrated(true);
      return;
    }

    let cancelled = false;
    const hydrateDraft = async () => {
      try {
        const draft = await loadCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
        if (cancelled || !draft?.data) return;

        if (draft.data.form && typeof draft.data.form === 'object') {
          setForm((prev) => ({ ...prev, ...draft.data.form }));
        }
        if (typeof draft.data.signaturePreview === 'string' && draft.data.signaturePreview.trim()) {
          setSignaturePreview(draft.data.signaturePreview);
        }
        if (Number.isFinite(draft.step)) {
          const nextStep = Math.max(0, Math.min(Number(draft.step), totalPages - 1));
          setCurrentPage(nextStep);
        }
      } finally {
        if (!cancelled) setIsDraftHydrated(true);
      }
    };

    hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const patientId = String(
      localStorage.getItem('CurrentpatientId') ||
      localStorage.getItem('currentPatientId') ||
      localStorage.getItem('patientId') ||
      ''
    ).trim();
    if (!patientId || !isDraftHydrated) return;

    void saveCaseDraft({
      patientId,
      routeKey: DRAFT_ROUTE_KEY,
      step: currentPage,
      data: {
        form,
        signaturePreview,
      },
    });
  }, [currentPage, form, signaturePreview, isDraftHydrated]);

  // Ensure draft is saved before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const patientId = String(
        localStorage.getItem('CurrentpatientId') ||
        localStorage.getItem('currentPatientId') ||
        localStorage.getItem('patientId') ||
        ''
      ).trim();

      if (patientId && isDraftHydrated) {
        console.log('[CompleteDenture] Before unload - saving draft immediately');
        saveCaseDraft({
          patientId,
          routeKey: DRAFT_ROUTE_KEY,
          step: currentPage,
          data: {
            form,
            signaturePreview,
          },
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form, currentPage, signaturePreview, isDraftHydrated]);

  const totalPages = 7;

  // Message Box Functions
  const showMessageBox = (title, message) => {
    setMessageBox({ show: true, title, message });
  };

  const hideMessageBox = () => {
    setMessageBox({ show: false, title: '', message: '' });
  };

  // Signature Preview
  const previewSignature = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignaturePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Input Changes
  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxArrayChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (file) => {
    setForm(prev => ({ ...prev, digitalSignature: file }));
    previewSignature(file);
  };

  // handle xray image upload
  const [xrayPreview, setXrayPreview] = useState('');
  const handleXrayImageChange = (file) => {
    setForm(prev => ({ ...prev, xrayImage: file }));
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setXrayPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setXrayPreview('');
    }
  };

  useEffect(() => {
    const patientId = localStorage.getItem('CurrentpatientId') || '';
    const cachedXray = readStoredGeneralCaseXray(patientId);
    if (!cachedXray?.imageDataUrl) return;

    setXrayPreview((prev) => prev || cachedXray.imageDataUrl);
    setForm((prev) => {
      if (prev.xrayImage) return prev;
      return { ...prev, xrayImage: cachedXray.imageDataUrl };
    });
  }, []);

  // Navigation
  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      window.scrollTo(0, 0);
      setCurrentPage(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      window.scrollTo(0, 0);
      setCurrentPage(prev => prev - 1);
    }
  };

  useEffect(() => {
    const patientId = localStorage.getItem('CurrentpatientId');
    if (!patientId) return;
    fetch(`http://localhost:5000/api/doctor-patient/${patientId}`)
      .then(res => res.ok ? res.json() : null)
      .then(result => {
        if (!result || !result.data) return;
        const p = result.data;
    const known = p.medicalInfo?.knownAllergies?.join(', ') || '';
    const drug = p.vitals?.drugAllergies?.join(', ') || '';
    const diet = p.vitals?.dietAllergies?.join(', ') || '';
    if (drug) {
      setAllergyMessage(`Drug Allergies: ${drug}`);
    } else if (known) {
      setAllergyMessage(`Known Allergies: ${known}`);
    } else if (diet) {
      setAllergyMessage(`Diet Allergies: ${diet}`);
    } else {
      setAllergyMessage('No known allergies');
    }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const patientId = getCurrentPatientId();
    const sharedXray = getSharedXrayImage(patientId);

    if (!sharedXray?.dataUrl) return;

    setForm((prev) => {
      if (prev.xrayImage) return prev;
      return { ...prev, xrayImage: sharedXray.dataUrl };
    });
    setXrayPreview((prev) => prev || sharedXray.dataUrl);
  }, []);

  // Form Submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Get patient and doctor info from localStorage
      const patientId = localStorage.getItem('CurrentpatientId');
      const patientName = localStorage.getItem('CurrentpatientName');
      const doctorId = localStorage.getItem('doctorId');
      const doctorName = localStorage.getItem('doctorName');

      if (!patientId || !patientName) {
        showMessageBox('Error', 'No patient selected. Please fill in the patient details first.');
        setIsSubmitting(false);
        return;
      }

      if (!doctorId || !doctorName) {
        showMessageBox('Error', 'Doctor information missing. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      if (!form.digitalSignature) {
        showMessageBox('Error', 'Please upload digital signature');
        setIsSubmitting(false);
        return;
      }

      // Prepare FormData
      const formDataToSend = new FormData();

      // Add all form fields
      Object.keys(form).forEach(key => {
       if (["patientId", "patientName", "doctorId", "doctorName"].includes(key)) return;

        if ((key === "digitalSignature" || key === "xrayImage") && form[key]) {
         formDataToSend.append(key, form[key]);
        } else if (Array.isArray(form[key])) {
         formDataToSend.append(key, JSON.stringify(form[key]));
        } else {
         formDataToSend.append(key, form[key] || "");
        }
      });


      // Add mandatory IDs/names
      formDataToSend.append('patientId', patientId);
      formDataToSend.append('patientName', patientName);
      formDataToSend.append('doctorId', doctorId);
      formDataToSend.append('doctorName', doctorName);

      // Get token
      const token = localStorage.getItem('token');

      const redoEditCaseId = String(
        location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || ''
      ).trim();
      const isRedoEdit = Boolean(redoEditCaseId);

      if (isRedoEdit) {
        // Redo-edit uses the unified JSON update endpoint.
        const bodyToSend = {
          ...form,
          patientId,
          patientName,
          doctorId,
          doctorName,
        };

        const fileToDataUrl = (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

        if (bodyToSend.digitalSignature instanceof File) {
          bodyToSend.digitalSignature = await fileToDataUrl(bodyToSend.digitalSignature);
        }
        if (bodyToSend.xrayImage instanceof File) {
          bodyToSend.xrayImage = await fileToDataUrl(bodyToSend.xrayImage);
        }

        const response = await fetch(buildApiUrl(`/api/casesheets/${encodeURIComponent(redoEditCaseId)}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyToSend),
        });

        const data = await response.json();
        if (response.ok) {
          await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
          localStorage.removeItem('redoEditCaseId');
          localStorage.removeItem('redoEditDepartmentKey');
          showMessageBox('Success', 'Case Sheet updated and resubmitted successfully!');
          setTimeout(() => {
            navigate('/pg-dashboard');
          }, 1200);
          return;
        }

        showMessageBox('Error', data.message || 'Failed to update case sheet');
        return;
      }

      // Submit to backend
      const response = await fetch(buildApiUrl('/api/complete-denture/save'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('caseId', data.caseId);
        await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
        showMessageBox('Success', 'Case Sheet submitted and saved successfully!');
        // Redirect after 1.5 seconds to the prescriptions page (match Pedodontics behavior)
        setTimeout(() => {
          navigate('/prescriptions');
        }, 1500);
      } else {
        showMessageBox('Error', data.message || 'Failed to save case sheet');
      }
    } catch (error) {
      console.error('Submission error:', error);
      showMessageBox('Error', 'Failed to submit case sheet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Checkbox options
  const medicalHistoryOptions = [
    "Cardiovascular disease", "Respiratory disorder", "Diabetes", "Blood dyscrasias",
    "Neurological disease/facial palsy", "Rheumatic fever", "Skin disorders",
    "Rheumatoid arthritis/ bone disorders", "Hepatitis", "Immune disorders", "Allergic reactions"
  ].map(v => ({ value: v, label: v }));

  const mentalAttitudeOptions = [
    "Philosophical", "Exacting", "Hysterical", "Indifferent"
  ].map(v => ({ value: v, label: v }));

  const habitsOptions = ["Smoking", "Pan chewing"].map(v => ({ value: v, label: v }));

  const toothLossReasonOptions = [
    "Caries", "Periodontal disease", "Trauma", "Congenital absence of teeth"
  ].map(v => ({ value: v, label: v }));

  // Page 1 Render
  const renderPage1 = () => (
    <div className={`page ${currentPage === 0 ? 'active' : ''}`} style={{ display: currentPage === 0 ? 'block' : 'none' }}>
      {/* X-ray image from general case sheet */}
      <div className="form-group">
        <label>X-ray Image:</label>
        {xrayPreview && (
          <div className="xray-preview-container">
            <img src={xrayPreview} alt="X-ray preview" className="xray-preview" />
          </div>
        )}
        {!xrayPreview && <p>No X-ray found in General Case Sheet for this patient.</p>}
      </div>

      <h2>Medical History</h2>
      
      <div className="form-group">
        <label>1. Does the patient suffer / suffered from any of the following disease/s:</label>
        <CheckboxGroup
          options={medicalHistoryOptions}
          value={form.medicalHistory}
          onChange={val => handleCheckboxArrayChange('medicalHistory', val)}
          name="medicalHistory"
        />
        <input
          type="text"
          placeholder="Specify other conditions"
          value={form.medicalHistoryOthers}
          onChange={e => handleInputChange('medicalHistoryOthers', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="treatmentDetails">B. Details of treatment for any of the above said ailments:</label>
        <textarea
          id="treatmentDetails"
          rows={3}
          value={form.treatmentDetails}
          onChange={e => handleInputChange('treatmentDetails', e.target.value)}
        />
      </div>

      <h2>General Examination</h2>

      <div className="form-group">
        <label htmlFor="gait">2. Gait:</label>
        <input 
          type="text" 
          id="gait"
          value={form.gait}
          onChange={e => handleInputChange('gait', e.target.value)}
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="built">Built:</label>
          <input
            type="text"
            id="built"
            value={form.built}
            onChange={e => handleInputChange('built', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="weight">Weight:</label>
          <input
            type="text"
            id="weight"
            value={form.weight}
            onChange={e => handleInputChange('weight', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="height">Height (in cm or inches):</label>
          <input
            type="number"
            id="height"
            value={form.height}
            onChange={e => handleInputChange('height', e.target.value)}
            placeholder="Enter height in cm or inches"
          />
        </div>
        <div className="form-group">
          <label htmlFor="bloodPressure">Blood Pressure:</label>
          <input
            type="text"
            id="bloodPressure"
            value={form.bloodPressure}
            onChange={e => handleInputChange('bloodPressure', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="respiratoryRate">Respiratory Rate:</label>
          <input
            type="text"
            id="respiratoryRate"
            value={form.respiratoryRate}
            onChange={e => handleInputChange('respiratoryRate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="heartRate">Heart Rate:</label>
          <input
            type="text"
            id="heartRate"
            value={form.heartRate}
            onChange={e => handleInputChange('heartRate', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="bodyTemperature">Body Temperature:</label>
        <input
          type="text"
          id="bodyTemperature"
          value={form.bodyTemperature}
          onChange={e => handleInputChange('bodyTemperature', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="nutritionalStatus">3. Nutritional status:</label>
        <input
          type="text"
          id="nutritionalStatus"
          value={form.nutritionalStatus}
          onChange={e => handleInputChange('nutritionalStatus', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>4. Patient's mental attitude: (M.M. House classification)</label>
        <CheckboxGroup
          options={mentalAttitudeOptions}
          value={form.mentalAttitude}
          onChange={val => handleCheckboxArrayChange('mentalAttitude', val)}
          name="mentalAttitude"
        />
      </div>

      <div className="form-group">
        <label>5. Habits:</label>
        <CheckboxGroup
          options={habitsOptions}
          value={form.habits}
          onChange={val => handleCheckboxArrayChange('habits', val)}
          name="habits"
        />
        <input
          type="text"
          placeholder="Specify other habits"
          value={form.habitsOthers}
          onChange={e => handleInputChange('habitsOthers', e.target.value)}
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="habitDuration">Duration/frequency of the habit:</label>
          <input
            type="text"
            id="habitDuration"
            value={form.habitDuration}
            onChange={e => handleInputChange('habitDuration', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="paraHabits">Parafunctional habits:</label>
          <input
            type="text"
            id="paraHabits"
            value={form.paraHabits}
            onChange={e => handleInputChange('paraHabits', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  // Page 2 - You would add your existing page 2 render here
  // Keep all your existing renderPage2 through renderPage6 functions

  // Page 2 - Existing Denture Assessment
  const renderPage2 = () => (
    <div className={`page ${currentPage === 1 ? 'active' : ''}`} style={{ display: currentPage === 1 ? 'block' : 'none' }}>
      <h2>Existing Denture Assessment</h2>
      
      <div className="form-group">
        <label htmlFor="prevDentalTreatment">1. Previous Denture Treatment:</label>
        <textarea
          id="prevDentalTreatment"
          rows={3}
          value={form.prevDentalTreatment}
          onChange={e => handleInputChange('prevDentalTreatment', e.target.value)}
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="maxillaryDentureNum">Maxillary Denture No.:</label>
          <input type="text" id="maxillaryDentureNum" value={form.maxillaryDentureNum} onChange={e => handleInputChange('maxillaryDentureNum', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="maxillaryDentureType">Type:</label>
          <input type="text" id="maxillaryDentureType" value={form.maxillaryDentureType} onChange={e => handleInputChange('maxillaryDentureType', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="mandibularDentureNum">Mandibular Denture No.:</label>
          <input type="text" id="mandibularDentureNum" value={form.mandibularDentureNum} onChange={e => handleInputChange('mandibularDentureNum', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="mandibularDentureType">Type:</label>
          <input type="text" id="mandibularDentureType" value={form.mandibularDentureType} onChange={e => handleInputChange('mandibularDentureType', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="patientCommentsDenture">Patient's Comments on existing denture:</label>
        <textarea
          id="patientCommentsDenture"
          rows={3}
          value={form.patientCommentsDenture}
          onChange={e => handleInputChange('patientCommentsDenture', e.target.value)}
        />
      </div>

      <h3>Evaluation of Existing Denture</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="vdRating">Vertical Dimension:</label>
          <input type="text" id="vdRating" value={form.vdRating} onChange={e => handleInputChange('vdRating', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="retentionRating">Retention:</label>
          <input type="text" id="retentionRating" value={form.retentionRating} onChange={e => handleInputChange('retentionRating', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="stabilityRating">Stability:</label>
          <input type="text" id="stabilityRating" value={form.stabilityRating} onChange={e => handleInputChange('stabilityRating', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="occlusionRating">Occlusion:</label>
          <input type="text" id="occlusionRating" value={form.occlusionRating} onChange={e => handleInputChange('occlusionRating', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="occlusalPlaneRating">Occlusal Plane:</label>
          <input type="text" id="occlusalPlaneRating" value={form.occlusalPlaneRating} onChange={e => handleInputChange('occlusalPlaneRating', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dentureBordersRating">Denture Borders:</label>
          <input type="text" id="dentureBordersRating" value={form.dentureBordersRating} onChange={e => handleInputChange('dentureBordersRating', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="tissueCoverageRating">Tissue Coverage:</label>
          <input type="text" id="tissueCoverageRating" value={form.tissueCoverageRating} onChange={e => handleInputChange('tissueCoverageRating', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="estheticsRating">Esthetics:</label>
          <input type="text" id="estheticsRating" value={form.estheticsRating} onChange={e => handleInputChange('estheticsRating', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="midlineRating">Midline:</label>
          <input type="text" id="midlineRating" value={form.midlineRating} onChange={e => handleInputChange('midlineRating', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="buccalCorridorRating">Buccal Corridor:</label>
          <input type="text" id="buccalCorridorRating" value={form.buccalCorridorRating} onChange={e => handleInputChange('buccalCorridorRating', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="articulationRating">Articulation:</label>
          <input type="text" id="articulationRating" value={form.articulationRating} onChange={e => handleInputChange('articulationRating', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="ppsRating">PPS:</label>
          <input type="text" id="ppsRating" value={form.ppsRating} onChange={e => handleInputChange('ppsRating', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="hygieneRating">Hygiene:</label>
        <input type="text" id="hygieneRating" value={form.hygieneRating} onChange={e => handleInputChange('hygieneRating', e.target.value)} />
      </div>

      <h3>Scheme of Existing Denture</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="occlusalSchemeExisting">Occlusal Scheme:</label>
          <input type="text" id="occlusalSchemeExisting" value={form.occlusalSchemeExisting} onChange={e => handleInputChange('occlusalSchemeExisting', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="dentureBaseExisting">Denture Base:</label>
          <input type="text" id="dentureBaseExisting" value={form.dentureBaseExisting} onChange={e => handleInputChange('dentureBaseExisting', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="dentureTeethExisting">Denture Teeth:</label>
        <input type="text" id="dentureTeethExisting" value={form.dentureTeethExisting} onChange={e => handleInputChange('dentureTeethExisting', e.target.value)} />
      </div>
    </div>
  );

  // Page 3 - Tooth Loss & Dental History
  const renderPage3 = () => (
    <div className={`page ${currentPage === 2 ? 'active' : ''}`} style={{ display: currentPage === 2 ? 'block' : 'none' }}>
      <h2>Tooth Loss & Dental History</h2>
      
      <div className="form-group">
        <label>Reason for Tooth Loss:</label>
        <CheckboxGroup
          options={toothLossReasonOptions}
          value={form.toothLossReason}
          onChange={val => handleCheckboxArrayChange('toothLossReason', val)}
          name="toothLossReason"
        />
        <input
          type="text"
          placeholder="Specify other reasons"
          value={form.toothLossReasonOthers}
          onChange={e => handleInputChange('toothLossReasonOthers', e.target.value)}
        />
      </div>

      <h3>Tooth Loss Distribution</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="maxAnteriorLoss">Maxillary Anterior Loss:</label>
          <input type="text" id="maxAnteriorLoss" value={form.maxAnteriorLoss} onChange={e => handleInputChange('maxAnteriorLoss', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="maxPosteriorLoss">Maxillary Posterior Loss:</label>
          <input type="text" id="maxPosteriorLoss" value={form.maxPosteriorLoss} onChange={e => handleInputChange('maxPosteriorLoss', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="mandAnteriorLoss">Mandibular Anterior Loss:</label>
          <input type="text" id="mandAnteriorLoss" value={form.mandAnteriorLoss} onChange={e => handleInputChange('mandAnteriorLoss', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="mandPosteriorLoss">Mandibular Posterior Loss:</label>
          <input type="text" id="mandPosteriorLoss" value={form.mandPosteriorLoss} onChange={e => handleInputChange('mandPosteriorLoss', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="edentulousDuration">Duration of Edentulism:</label>
          <input type="text" id="edentulousDuration" value={form.edentulousDuration} onChange={e => handleInputChange('edentulousDuration', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="preExtractionRecords">Pre-extraction Records:</label>
          <input type="text" id="preExtractionRecords" value={form.preExtractionRecords} onChange={e => handleInputChange('preExtractionRecords', e.target.value)} />
        </div>
      </div>
    </div>
  );

  // Page 4 - Facial & TMJ Examination
  const renderPage4 = () => (
    <div className={`page ${currentPage === 3 ? 'active' : ''}`} style={{ display: currentPage === 3 ? 'block' : 'none' }}>
      <h2>Facial & TMJ Examination</h2>
      
      <h3>Facial Features</h3>
      <div className="form-group">
        <label htmlFor="facialSymmetry">Facial Symmetry:</label>
        <input type="text" id="facialSymmetry" value={form.facialSymmetry} onChange={e => handleInputChange('facialSymmetry', e.target.value)} />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Facial Profile:</label>
          <CheckboxGroup
            options={[
              { value: "Convex", label: "Convex" },
              { value: "Straight", label: "Straight" },
              { value: "Concave", label: "Concave" }
            ]}
            value={form.facialProfile}
            onChange={val => handleCheckboxArrayChange('facialProfile', val)}
            name="facialProfile"
          />
        </div>
        <div className="form-group">
          <label>Facial Form:</label>
          <CheckboxGroup
            options={[
              { value: "Square", label: "Square" },
              { value: "Oval", label: "Oval" },
              { value: "Triangular", label: "Triangular" }
            ]}
            value={form.facialForm}
            onChange={val => handleCheckboxArrayChange('facialForm', val)}
            name="facialForm"
          />
        </div>
      </div>

      <h3>Mouth Opening</h3>
      <div className="form-group">
        <label htmlFor="maxMouthOpening">Maximum Mouth Opening (mm):</label>
        <input type="text" id="maxMouthOpening" value={form.maxMouthOpening} onChange={e => handleInputChange('maxMouthOpening', e.target.value)} />
      </div>

      <h3>Mandibular Deviation</h3>
      <div className="form-group">
        <label>Deviation during Opening:</label>
        <CheckboxGroup
          options={[{ value: "Present", label: "Present" }, { value: "Absent", label: "Absent" }]}
          value={form.mandibleDeviationOpening}
          onChange={val => handleCheckboxArrayChange('mandibleDeviationOpening', val)}
          name="mandibleDeviationOpening"
        />
      </div>

      <div className="form-group">
        <label htmlFor="mandibleDeviationOpeningDirection">Direction:</label>
        <input type="text" id="mandibleDeviationOpeningDirection" value={form.mandibleDeviationOpeningDirection} onChange={e => handleInputChange('mandibleDeviationOpeningDirection', e.target.value)} />
      </div>

      <div className="form-group">
        <label htmlFor="mandibleDeviationClosingDirection">Deviation during Closing Direction:</label>
        <input type="text" id="mandibleDeviationClosingDirection" value={form.mandibleDeviationClosingDirection} onChange={e => handleInputChange('mandibleDeviationClosingDirection', e.target.value)} />
      </div>

      <h3>TMJ Assessment</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="tmjPainTenderness">TMJ Pain/Tenderness:</label>
          <input type="text" id="tmjPainTenderness" value={form.tmjPainTenderness} onChange={e => handleInputChange('tmjPainTenderness', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="tmjClicking">TMJ Clicking:</label>
          <input type="text" id="tmjClicking" value={form.tmjClicking} onChange={e => handleInputChange('tmjClicking', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="tmjCrepitus">TMJ Crepitus:</label>
        <input type="text" id="tmjCrepitus" value={form.tmjCrepitus} onChange={e => handleInputChange('tmjCrepitus', e.target.value)} />
      </div>

      <h3>Lymph Nodes & Lips</h3>
      <div className="form-group">
        <label htmlFor="lymphNodes">Lymph Nodes:</label>
        <input type="text" id="lymphNodes" value={form.lymphNodes} onChange={e => handleInputChange('lymphNodes', e.target.value)} />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="lipCompetency">Lip Competency:</label>
          <input type="text" id="lipCompetency" value={form.lipCompetency} onChange={e => handleInputChange('lipCompetency', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="lipLength">Lip Length:</label>
          <input type="text" id="lipLength" value={form.lipLength} onChange={e => handleInputChange('lipLength', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label>Lip Line:</label>
        <CheckboxGroup
          options={[
            { value: "High", label: "High" },
            { value: "Medium", label: "Medium" },
            { value: "Low", label: "Low" }
          ]}
          value={form.lipLine}
          onChange={val => handleCheckboxArrayChange('lipLine', val)}
          name="lipLine"
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="lipPathology">Lip Pathology:</label>
          <input type="text" id="lipPathology" value={form.lipPathology} onChange={e => handleInputChange('lipPathology', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Muscle Tone:</label>
          <CheckboxGroup
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Flaccid", label: "Flaccid" },
              { value: "Tense", label: "Tense" }
            ]}
            value={form.muscleTone}
            onChange={val => handleCheckboxArrayChange('muscleTone', val)}
            name="muscleTone"
          />
        </div>
      </div>
    </div>
  );

  // Page 5 - Intraoral Examination (Hard & Soft Palate)
  const renderPage5 = () => (
    <div className={`page ${currentPage === 4 ? 'active' : ''}`} style={{ display: currentPage === 4 ? 'block' : 'none' }}>
      <h2>Intraoral Examination - Hard & Soft Palate</h2>
      
      <h3>Buccal Mucosa</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="buccalMucosaColor">Color:</label>
          <input type="text" id="buccalMucosaColor" value={form.buccalMucosaColor} onChange={e => handleInputChange('buccalMucosaColor', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="buccalMucosaTexture">Texture:</label>
          <input type="text" id="buccalMucosaTexture" value={form.buccalMucosaTexture} onChange={e => handleInputChange('buccalMucosaTexture', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="buccalMucosaOthers">Other Observations:</label>
        <input type="text" id="buccalMucosaOthers" value={form.buccalMucosaOthers} onChange={e => handleInputChange('buccalMucosaOthers', e.target.value)} />
      </div>

      <h3>Floor of Mouth</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="floorMouthColor">Color:</label>
          <input type="text" id="floorMouthColor" value={form.floorMouthColor} onChange={e => handleInputChange('floorMouthColor', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="floorMouthOthers">Other Observations:</label>
          <input type="text" id="floorMouthOthers" value={form.floorMouthOthers} onChange={e => handleInputChange('floorMouthOthers', e.target.value)} />
        </div>
      </div>

      <h3>Hard Palate</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Arch Form:</label>
          <CheckboxGroup
            options={[
              { value: "V-shaped", label: "V-shaped" },
              { value: "U-shaped", label: "U-shaped" },
              { value: "Flat", label: "Flat" }
            ]}
            value={form.hardPalateArch}
            onChange={val => handleCheckboxArrayChange('hardPalateArch', val)}
            name="hardPalateArch"
          />
        </div>
        <div className="form-group">
          <label>Shape:</label>
          <CheckboxGroup
            options={[
              { value: "High", label: "High" },
              { value: "Medium", label: "Medium" },
              { value: "Shallow", label: "Shallow" }
            ]}
            value={form.hardPalateShape}
            onChange={val => handleCheckboxArrayChange('hardPalateShape', val)}
            name="hardPalateShape"
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="hyperplasia">Hyperplasia:</label>
          <input type="text" id="hyperplasia" value={form.hyperplasia} onChange={e => handleInputChange('hyperplasia', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="wch">Whitening/Cracking/Hyperplasia:</label>
          <input type="text" id="wch" value={form.wch} onChange={e => handleInputChange('wch', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="inflammation">Inflammation:</label>
          <input type="text" id="inflammation" value={form.inflammation} onChange={e => handleInputChange('inflammation', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="hardPalateOthers">Other Observations:</label>
          <input type="text" id="hardPalateOthers" value={form.hardPalateOthers} onChange={e => handleInputChange('hardPalateOthers', e.target.value)} />
        </div>
      </div>

      <h3>Soft Palate</h3>
      <div className="form-group">
        <label>Soft Palate Form:</label>
        <CheckboxGroup
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Elongated", label: "Elongated" },
            { value: "Short", label: "Short" }
          ]}
          value={form.softPalateForm}
          onChange={val => handleCheckboxArrayChange('softPalateForm', val)}
          name="softPalateForm"
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="softPalateColor">Color:</label>
          <input type="text" id="softPalateColor" value={form.softPalateColor} onChange={e => handleInputChange('softPalateColor', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="softPalateOthers">Other Observations:</label>
          <input type="text" id="softPalateOthers" value={form.softPalateOthers} onChange={e => handleInputChange('softPalateOthers', e.target.value)} />
        </div>
      </div>

      <h3>Palate Sensitivity & Throat</h3>
      <div className="form-group">
        <label>Palatal Sensitivity:</label>
        <CheckboxGroup
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Hyper-sensitive", label: "Hyper-sensitive" },
            { value: "Non-sensitive", label: "Non-sensitive" }
          ]}
          value={form.palateSensitivity}
          onChange={val => handleCheckboxArrayChange('palateSensitivity', val)}
          name="palateSensitivity"
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Lateral Throat Form:</label>
          <CheckboxGroup
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Restricted", label: "Restricted" }
            ]}
            value={form.lateralThroatForm}
            onChange={val => handleCheckboxArrayChange('lateralThroatForm', val)}
            name="lateralThroatForm"
          />
        </div>
        <div className="form-group">
          <label>Palatal Throat Form:</label>
          <CheckboxGroup
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Restricted", label: "Restricted" }
            ]}
            value={form.palatalThroatForm}
            onChange={val => handleCheckboxArrayChange('palatalThroatForm', val)}
            name="palatalThroatForm"
          />
        </div>
      </div>

      <h3>Tongue Assessment</h3>
      <div className="form-group">
        <label>Tongue Size:</label>
        <CheckboxGroup
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Macroglossia", label: "Macroglossia" },
            { value: "Microglossia", label: "Microglossia" }
          ]}
          value={form.tongueSize}
          onChange={val => handleCheckboxArrayChange('tongueSize', val)}
          name="tongueSize"
        />
      </div>

      <div className="form-group">
        <label>Tongue Position:</label>
        <CheckboxGroup
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Anterior", label: "Anterior" },
            { value: "Posterior", label: "Posterior" }
          ]}
          value={form.tonguePosition}
          onChange={val => handleCheckboxArrayChange('tonguePosition', val)}
          name="tonguePosition"
        />
      </div>

      <div className="form-group">
        <label>Tongue Mobility:</label>
        <CheckboxGroup
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Restricted", label: "Restricted" },
            { value: "Excessive", label: "Excessive" }
          ]}
          value={form.tongueMobility}
          onChange={val => handleCheckboxArrayChange('tongueMobility', val)}
          name="tongueMobility"
        />
      </div>

      <div className="form-group">
        <label htmlFor="tongueOthers">Other Observations:</label>
        <input type="text" id="tongueOthers" value={form.tongueOthers} onChange={e => handleInputChange('tongueOthers', e.target.value)} />
      </div>
    </div>
  );

  // Page 6 - Frenum & Ridge Assessment
  const renderPage6 = () => (
    <div className={`page ${currentPage === 5 ? 'active' : ''}`} style={{ display: currentPage === 5 ? 'block' : 'none' }}>
      <h2>Frenum & Ridge Assessment</h2>
      
      <h3>Maxillary Labial Frenum</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="maxLabialFrenumNum">Number of attachments:</label>
          <input type="text" id="maxLabialFrenumNum" value={form.maxLabialFrenumNum} onChange={e => handleInputChange('maxLabialFrenumNum', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="maxLabialFrenumProminence">Prominence:</label>
          <input type="text" id="maxLabialFrenumProminence" value={form.maxLabialFrenumProminence} onChange={e => handleInputChange('maxLabialFrenumProminence', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="maxLabialFrenumClass">Class:</label>
        <input type="text" id="maxLabialFrenumClass" value={form.maxLabialFrenumClass} onChange={e => handleInputChange('maxLabialFrenumClass', e.target.value)} />
      </div>

      <h3>Maxillary Buccal Frenum</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Left:</label>
          <input type="text" placeholder="No. of attachments" value={form.maxLeftBuccalFrenumNum} onChange={e => handleInputChange('maxLeftBuccalFrenumNum', e.target.value)} />
          <input type="text" placeholder="Prominence" value={form.maxLeftBuccalFrenumProminence} onChange={e => handleInputChange('maxLeftBuccalFrenumProminence', e.target.value)} />
          <input type="text" placeholder="Class" value={form.maxLeftBuccalFrenumClass} onChange={e => handleInputChange('maxLeftBuccalFrenumClass', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Right:</label>
          <input type="text" placeholder="No. of attachments" value={form.maxRightBuccalFrenumNum} onChange={e => handleInputChange('maxRightBuccalFrenumNum', e.target.value)} />
          <input type="text" placeholder="Prominence" value={form.maxRightBuccalFrenumProminence} onChange={e => handleInputChange('maxRightBuccalFrenumProminence', e.target.value)} />
          <input type="text" placeholder="Class" value={form.maxRightBuccalFrenumClass} onChange={e => handleInputChange('maxRightBuccalFrenumClass', e.target.value)} />
        </div>
      </div>

      <h3>Mandibular Labial Frenum</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="mandLabialFrenumNum">Number of attachments:</label>
          <input type="text" id="mandLabialFrenumNum" value={form.mandLabialFrenumNum} onChange={e => handleInputChange('mandLabialFrenumNum', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="mandLabialFrenumProminence">Prominence:</label>
          <input type="text" id="mandLabialFrenumProminence" value={form.mandLabialFrenumProminence} onChange={e => handleInputChange('mandLabialFrenumProminence', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="mandLabialFrenumClass">Class:</label>
        <input type="text" id="mandLabialFrenumClass" value={form.mandLabialFrenumClass} onChange={e => handleInputChange('mandLabialFrenumClass', e.target.value)} />
      </div>

      <h3>Mandibular Buccal Frenum</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Left:</label>
          <input type="text" placeholder="No. of attachments" value={form.mandLeftBuccalFrenumNum} onChange={e => handleInputChange('mandLeftBuccalFrenumNum', e.target.value)} />
          <input type="text" placeholder="Prominence" value={form.mandLeftBuccalFrenumProminence} onChange={e => handleInputChange('mandLeftBuccalFrenumProminence', e.target.value)} />
          <input type="text" placeholder="Class" value={form.mandLeftBuccalFrenumClass} onChange={e => handleInputChange('mandLeftBuccalFrenumClass', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Right:</label>
          <input type="text" placeholder="No. of attachments" value={form.mandRightBuccalFrenumNum} onChange={e => handleInputChange('mandRightBuccalFrenumNum', e.target.value)} />
          <input type="text" placeholder="Prominence" value={form.mandRightBuccalFrenumProminence} onChange={e => handleInputChange('mandRightBuccalFrenumProminence', e.target.value)} />
          <input type="text" placeholder="Class" value={form.mandRightBuccalFrenumClass} onChange={e => handleInputChange('mandRightBuccalFrenumClass', e.target.value)} />
        </div>
      </div>

      <h3>Attached Gingiva & Soft Tissue Ridge</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Maxilla - Attached Gingiva:</label>
          <CheckboxGroup
            options={[
              { value: "Adequate", label: "Adequate" },
              { value: "Inadequate", label: "Inadequate" }
            ]}
            value={form.maxillaAttachedGingival}
            onChange={val => handleCheckboxArrayChange('maxillaAttachedGingival', val)}
            name="maxillaAttachedGingival"
          />
        </div>
        <div className="form-group">
          <label>Mandible - Attached Gingiva:</label>
          <CheckboxGroup
            options={[
              { value: "Adequate", label: "Adequate" },
              { value: "Inadequate", label: "Inadequate" }
            ]}
            value={form.mandibleAttachedGingival}
            onChange={val => handleCheckboxArrayChange('mandibleAttachedGingival', val)}
            name="mandibleAttachedGingival"
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Maxilla - Soft Tissue Ridge:</label>
          <CheckboxGroup
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Flabby", label: "Flabby" },
              { value: "Knife-edge", label: "Knife-edge" }
            ]}
            value={form.maxillaSoftTissueRidge}
            onChange={val => handleCheckboxArrayChange('maxillaSoftTissueRidge', val)}
            name="maxillaSoftTissueRidge"
          />
        </div>
        <div className="form-group">
          <label>Mandible - Soft Tissue Ridge:</label>
          <CheckboxGroup
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Flabby", label: "Flabby" },
              { value: "Knife-edge", label: "Knife-edge" }
            ]}
            value={form.mandibleSoftTissueRidge}
            onChange={val => handleCheckboxArrayChange('mandibleSoftTissueRidge', val)}
            name="mandibleSoftTissueRidge"
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Maxilla - Mucosa Condition:</label>
          <CheckboxGroup
            options={[
              { value: "Healthy", label: "Healthy" },
              { value: "Inflamed", label: "Inflamed" },
              { value: "Atrophic", label: "Atrophic" }
            ]}
            value={form.maxillaMucosaCondition}
            onChange={val => handleCheckboxArrayChange('maxillaMucosaCondition', val)}
            name="maxillaMucosaCondition"
          />
        </div>
        <div className="form-group">
          <label>Mandible - Mucosa Condition:</label>
          <CheckboxGroup
            options={[
              { value: "Healthy", label: "Healthy" },
              { value: "Inflamed", label: "Inflamed" },
              { value: "Atrophic", label: "Atrophic" }
            ]}
            value={form.mandibleMucosaCondition}
            onChange={val => handleCheckboxArrayChange('mandibleMucosaCondition', val)}
            name="mandibleMucosaCondition"
          />
        </div>
      </div>

      <h3>Ridge Assessment</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Maxilla - Anterior Ridge Form:</label>
          <CheckboxGroup
            options={[
              { value: "U-shaped", label: "U-shaped" },
              { value: "V-shaped", label: "V-shaped" }
            ]}
            value={form.maxillaAntRidgeForm}
            onChange={val => handleCheckboxArrayChange('maxillaAntRidgeForm', val)}
            name="maxillaAntRidgeForm"
          />
        </div>
        <div className="form-group">
          <label>Maxilla - Posterior Ridge Form:</label>
          <CheckboxGroup
            options={[
              { value: "Rounded", label: "Rounded" },
              { value: "Angular", label: "Angular" }
            ]}
            value={form.maxillaPostRidgeForm}
            onChange={val => handleCheckboxArrayChange('maxillaPostRidgeForm', val)}
            name="maxillaPostRidgeForm"
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Mandible - Anterior Ridge Form:</label>
          <CheckboxGroup
            options={[
              { value: "U-shaped", label: "U-shaped" },
              { value: "V-shaped", label: "V-shaped" }
            ]}
            value={form.mandibleAntRidgeForm}
            onChange={val => handleCheckboxArrayChange('mandibleAntRidgeForm', val)}
            name="mandibleAntRidgeForm"
          />
        </div>
        <div className="form-group">
          <label>Mandible - Posterior Ridge Form:</label>
          <CheckboxGroup
            options={[
              { value: "Rounded", label: "Rounded" },
              { value: "Angular", label: "Angular" }
            ]}
            value={form.mandiblePostRidgeForm}
            onChange={val => handleCheckboxArrayChange('mandiblePostRidgeForm', val)}
            name="mandiblePostRidgeForm"
          />
        </div>
      </div>

      <h3>Ridge Relationships</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Ridge Contour:</label>
          <CheckboxGroup
            options={[
              { value: "Resorbed", label: "Resorbed" },
              { value: "Moderate", label: "Moderate" },
              { value: "Good", label: "Good" }
            ]}
            value={form.ridgeContour}
            onChange={val => handleCheckboxArrayChange('ridgeContour', val)}
            name="ridgeContour"
          />
        </div>
        <div className="form-group">
          <label>Ridge Relation:</label>
          <CheckboxGroup
            options={[
              { value: "Class I", label: "Class I" },
              { value: "Class II", label: "Class II" },
              { value: "Class III", label: "Class III" }
            ]}
            value={form.ridgeRelation}
            onChange={val => handleCheckboxArrayChange('ridgeRelation', val)}
            name="ridgeRelation"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Ridge Parallelism:</label>
        <CheckboxGroup
          options={[
            { value: "Parallel", label: "Parallel" },
            { value: "Non-parallel", label: "Non-parallel" }
          ]}
          value={form.ridgeParallelism}
          onChange={val => handleCheckboxArrayChange('ridgeParallelism', val)}
          name="ridgeParallelism"
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="ridgeHeight">Ridge Height:</label>
          <input type="text" id="ridgeHeight" value={form.ridgeHeight} onChange={e => handleInputChange('ridgeHeight', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="ridgeWidth">Ridge Width:</label>
          <input type="text" id="ridgeWidth" value={form.ridgeWidth} onChange={e => handleInputChange('ridgeWidth', e.target.value)} />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="undercuts">Undercuts:</label>
          <input type="text" id="undercuts" value={form.undercuts} onChange={e => handleInputChange('undercuts', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="exostosis">Exostosis:</label>
          <input type="text" id="exostosis" value={form.exostosis} onChange={e => handleInputChange('exostosis', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="torus">Torus:</label>
        <input type="text" id="torus" value={form.torus} onChange={e => handleInputChange('torus', e.target.value)} />
      </div>

      <h3>Saliva Assessment</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Saliva Quantity:</label>
          <CheckboxGroup
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Scanty", label: "Scanty" },
              { value: "Excessive", label: "Excessive" }
            ]}
            value={form.salivaQuantity}
            onChange={val => handleCheckboxArrayChange('salivaQuantity', val)}
            name="salivaQuantity"
          />
        </div>
        <div className="form-group">
          <label>Saliva Consistency:</label>
          <CheckboxGroup
            options={[
              { value: "Serous", label: "Serous" },
              { value: "Mucoid", label: "Mucoid" },
              { value: "Mixed", label: "Mixed" }
            ]}
            value={form.salivaConsistency}
            onChange={val => handleCheckboxArrayChange('salivaConsistency', val)}
            name="salivaConsistency"
          />
        </div>
      </div>
    </div>
  );

  // Page 7 - Diagnosis & Treatment
  const renderPage7 = () => (
    <div className={`page ${currentPage === 6 ? 'active' : ''}`} style={{ display: currentPage === 6 ? 'block' : 'none' }}>
      <h2>Diagnosis & Treatment</h2>
      
      <div className="form-group">
        <label htmlFor="finalDiagnosis">Final Diagnosis:</label>
        <textarea
          id="finalDiagnosis"
          rows={3}
          value={form.finalDiagnosis}
          onChange={e => handleInputChange('finalDiagnosis', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="treatmentPlan">Treatment Plan:</label>
        <textarea
          id="treatmentPlan"
          rows={3}
          value={form.treatmentPlan}
          onChange={e => handleInputChange('treatmentPlan', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="prostheticPrognosis">Prosthetic Prognosis:</label>
        <textarea
          id="prostheticPrognosis"
          rows={3}
          value={form.prostheticPrognosis}
          onChange={e => handleInputChange('prostheticPrognosis', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="recall">Recall:</label>
        <input
          type="text"
          id="recall"
          value={form.recall}
          onChange={e => handleInputChange('recall', e.target.value)}
        />
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
    </div>
  );

  return (
    <div className="digital-doctor-case-sheet" style={{ backgroundImage: "url('/images/campus.png')" }}>
      {showAllergy && (
        <div className="allergy-alert show" id="patientAllergyAlert">
          <span className="alert-icon">⚠️</span>
          <div className="allergy-flow-window">
            <span id="allergyMessage">{allergyMessage || 'Loading allergies...'}</span>
          </div>
        </div>
      )}
      <div className="case-sheet">
        {/* Header */}
        <div className="header" style={{ position: 'relative', textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
          {localStorage.getItem('CurrentpatientName') && (
            <div style={{ position: 'absolute', left: '20px', top: '6px', padding: '8px 15px', backgroundColor: 'rgba(38, 40, 107, 0.95)', borderRadius: '4px', fontSize: '0.8em', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textAlign: 'left', whiteSpace: 'nowrap' }}>
              <div><strong>{localStorage.getItem('CurrentpatientName')}</strong></div>
              {localStorage.getItem('CurrentpatientId') && <div><strong>ID:</strong> {localStorage.getItem('CurrentpatientId')}</div>}
            </div>
          )}
          <center><img src="/logo.png" alt="SRM Dental College Logo" /></center>
          <h1>SRM DENTAL COLLEGE</h1>
          <h2>DEPARTMENT OF PROSTHODONTICS</h2>
          <h3>COMPLETE DENTURE CASE SHEET</h3>
        </div>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <p style={{ textAlign: 'center' }}>Page {currentPage + 1} of {totalPages}</p>
        </div>

        {/* Render all pages */}
        {renderPage1()}
        {renderPage2()}
        {renderPage3()}
        {renderPage4()}
        {renderPage5()}
        {renderPage6()}
        {renderPage7()}

        {/* Navigation Buttons */}
        <div className="navigation">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage === 0 || isSubmitting}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : (currentPage === totalPages - 1 ? 'Submit' : 'Next')}
          </button>
        </div>
      </div>

      {/* Message Box */}
      {messageBox.show && (
        <div className="message-box-container show">
          <div className="message-box">
            <h2>{messageBox.title}</h2>
            <p>{messageBox.message}</p>
            <button onClick={hideMessageBox}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
