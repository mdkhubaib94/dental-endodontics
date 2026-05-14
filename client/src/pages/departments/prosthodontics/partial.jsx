import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './partial.css';
import { readStoredGeneralCaseXray } from '../../../utils/generalCaseXray';
import { API_BASE_URL } from '../../../config/api';
const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';
import { getCurrentPatientId, getSharedXrayImage } from '../../../utils/sharedXray';
import { clearCaseDraft, loadCaseDraft, saveCaseDraft } from '../../../utils/caseDraft';

const CaseSheet = () => {
  const DRAFT_ROUTE_KEY = '/partial';
  // Initialize all form state
  const [formData, setFormData] = useState({
    // Medical History
    cardio: '',
    resp: '',
    diabetes: '',
    blood: '',
    neuro: '',
    rheumatic: '',
    skin: '',
    bone: '',
    hep: '',
    immune: '',
    allergy: '',
    others_medical: '',
    treatment: '',
    
    // General Examination
    gait: '',
    tuilt: '',
    weight: '',
    height: '',
    bp: '',
    resp_rate: '',
    heart_rate: '',
    temperature: '',
    
    // Patient Information
    nutrition: '',
    attitude: [],
    habits: [],
    habit_duration: '',
    prev_treatment: '',
    loss_reason: [],
    max_anterior: '',
    max_posterior: '',
    mand_anterior: '',
    mand_posterior: '',
    duration_rulones: '',
    
    // Clinical Examination
    facial_symmetry: '',
    facial_profile: [],
    facial_form: [],
    mouth_opening: '',
    mandible_deviation: '',
    opening_deviation: [],
    closing_deviation: [],
    pain_tenderness: '',
    clicking: '',
    crepitus: '',
    lymph_nodes: '',
    lips: '',
    competency: '',
    lip_length: [],
    pathology: '',
    
    // Intraoral Examination
    muscle_tone: '',
    buccal_colour: '',
    buccal_texture: '',
    buccal_others: '',
    floor_colour: '',
    floor_others: '',
    hard_shape: '',
    hard_tori: '',
    hard_hyperplasia: '',
    hard_inflammation: '',
    hard_others: '',
    soft_palate_form: '',
    soft_colour: '',
    soft_others: '',
    tongue_size: '',
    tongue_position: '',
    tongue_mobility: '',
    saliva_class: '',
    
    // Gingival & Oral Hygiene
    buccal_upper_distal: '',
    buccal_upper_mesial: '',
    palatal_upper_distal: '',
    palatal_upper_mesial: '',
    buccal_lower_distal: '',
    buccal_lower_mesial: '',
    lingual_lower_distal: '',
    lingual_lower_mesial: '',
    gingival_index: '',
    
    debris_16: '',
    debris_11: '',
    debris_26: '',
    debris_46: '',
    debris_31: '',
    debris_36: '',
    debris_score: '',
    
    calc_16: '',
    calc_11: '',
    calc_26: '',
    calc_46: '',
    calc_31: '',
    calc_36: '',
    calculus_score: '',
    
    // Periodontal Charting
    debrisTotal: '',
    calculusTotal: '',
    ohis: '',
    
    // DMF Index
    dmf_max8: '', dmf_max7: '', dmf_max6: '', dmf_max5: '', dmf_max4: '', dmf_max3: '', dmf_max2: '', dmf_max1: '',
    dmf_max1_r: '', dmf_max2_r: '', dmf_max3_r: '', dmf_max4_r: '', dmf_max5_r: '', dmf_max6_r: '', dmf_max7_r: '', dmf_max8_r: '',
    dmf_mand8: '', dmf_mand7: '', dmf_mand6: '', dmf_mand5: '', dmf_mand4: '', dmf_mand3: '', dmf_mand2: '', dmf_mand1: '',
    dmf_mand1_r: '', dmf_mand2_r: '', dmf_mand3_r: '', dmf_mand4_r: '', dmf_mand5_r: '', dmf_mand6_r: '', dmf_mand7_r: '', dmf_mand8_r: '',
    
    // Periodontal Status
    mob_max8: '', mob_max7: '', mob_max6: '', mob_max5: '', mob_max4: '', mob_max3: '', mob_max2: '', mob_max1: '',
    mob_max1_r: '', mob_max2_r: '', mob_max3_r: '', mob_max4_r: '', mob_max5_r: '', mob_max6_r: '', mob_max7_r: '', mob_max8_r: '',
    mob_mand8: '', mob_mand7: '', mob_mand6: '', mob_mand5: '', mob_mand4: '', mob_mand3: '', mob_mand2: '', mob_mand1: '',
    mob_mand1_r: '', mob_mand2_r: '', mob_mand3_r: '', mob_mand4_r: '', mob_mand5_r: '', mob_mand6_r: '', mob_mand7_r: '', mob_mand8_r: '',
    
    // Furcation
    furc_max8: '', furc_max7: '', furc_max6: '', furc_max5: '', furc_max4: '', furc_max3: '', furc_max2: '', furc_max1: '',
    furc_max1_r: '', furc_max2_r: '', furc_max3_r: '', furc_max4_r: '', furc_max5_r: '', furc_max6_r: '', furc_max7_r: '', furc_max8_r: '',
    furc_mand8: '', furc_mand7: '', furc_mand6: '', furc_mand5: '', furc_mand4: '', furc_mand3: '', furc_mand2: '', furc_mand1: '',
    furc_mand1_r: '', furc_mand2_r: '', furc_mand3_r: '', furc_mand4_r: '', furc_mand5_r: '', furc_mand6_r: '', furc_mand7_r: '', furc_mand8_r: '',
    
    // Recession
    rec_max8: '', rec_max7: '', rec_max6: '', rec_max5: '', rec_max4: '', rec_max3: '', rec_max2: '', rec_max1: '',
    rec_max1_r: '', rec_max2_r: '', rec_max3_r: '', rec_max4_r: '', rec_max5_r: '', rec_max6_r: '', rec_max7_r: '', rec_max8_r: '',
    rec_mand8: '', rec_mand7: '', rec_mand6: '', rec_mand5: '', rec_mand4: '', rec_mand3: '', rec_mand2: '', rec_mand1: '',
    rec_mand1_r: '', rec_mand2_r: '', rec_mand3_r: '', rec_mand4_r: '', rec_mand5_r: '', rec_mand6_r: '', rec_mand7_r: '', rec_mand8_r: '',
    
    // Pockets
    pock_max8: '', pock_max7: '', pock_max6: '', pock_max5: '', pock_max4: '', pock_max3: '', pock_max2: '', pock_max1: '',
    pock_max1_r: '', pock_max2_r: '', pock_max3_r: '', pock_max4_r: '', pock_max5_r: '', pock_max6_r: '', pock_max7_r: '', pock_max8_r: '',
    pock_mand8: '', pock_mand7: '', pock_mand6: '', pock_mand5: '', pock_mand4: '', pock_mand3: '', pock_mand2: '', pock_mand1: '',
    pock_mand1_r: '', pock_mand2_r: '', pock_mand3_r: '', pock_mand4_r: '', pock_mand5_r: '', pock_mand6_r: '', pock_mand7_r: '', pock_mand8_r: '',
    
    other_periodontal_findings: '',
    
    // Tooth Structure & Ridge
    abrasion: '',
    attrition: '',
    erosion: '',
    abfraction: '',
    mucosa_color: '',
    mucosa_consistency: '',
    mucosa_thickness: '',
    ridgeClass: [],
    ridgeHeight: '',
    ridgeLength: '',
    ridgeWidth: '',
    
    // Occlusion
    molarRelation: '',
    occlusalPlane: '',
    drifting: '',
    supraEruption: '',
    rotation: '',
    overjet: '',
    overbite: '',
    scheme: [],
    occlusionOthers: '',
    
    // Abutment Evaluation
    clinical_crown_height: '',
    crown_morphology: '',
    vitality: '',
    mobility_abutment: '',
    probing_depth: '',
    bleeding_on_probing: '',
    recession_abutment: '',
    furcation_involvement: '',
    axial_inclination: '',
    rotations_abutment: '',
    pain_on_percussion: '',
    restorations: '',
    caries: '',
    supra_eruption_intrusion: '',
    
    // Radiographic Evaluation
    periapical_status: '',
    lamina_dura: '',
    crown_height_radio: '',
    root_length: '',
    bone_radio: '',
    crown_root_ratio: '',
    coronal_proximal_radiolucency: '',
    
    other_investigations: '',
    
    // Edentulous Arch
    kennedy_classification: '',
    
    // Treatment Planning
    treatment_surgery: '',
    treatment_endodontic: '',
    treatment_periodontal: '',
    treatment_orthodontic: '',
    
    // Treatment Procedure
    proc_date_1: '', proc_grade_1: '', proc_staff_1: '',
    proc_date_2: '', proc_grade_2: '', proc_staff_2: '',
    proc_date_3: '', proc_grade_3: '', proc_staff_3: '',
    proc_date_4: '', proc_grade_4: '', proc_staff_4: '',
    proc_date_5: '', proc_grade_5: '', proc_staff_5: '',
    proc_date_6: '', proc_grade_6: '', proc_staff_6: '',
    proc_date_7: '', proc_grade_7: '', proc_staff_7: '',
    proc_date_8: '', proc_grade_8: '', proc_staff_8: '',
    proc_date_9: '', proc_grade_9: '', proc_staff_9: '',
    proc_date_10: '', proc_grade_10: '', proc_staff_10: '',
    proc_date_11: '', proc_grade_11: '', proc_staff_11: '',
    proc_date_12: '', proc_grade_12: '', proc_staff_12: '',
    proc_date_13: '', proc_grade_13: '', proc_staff_13: '',
    proc_date_14: '', proc_grade_14: '', proc_staff_14: '',
    proc_date_15: '', proc_grade_15: '', proc_staff_15: '',
    proc_date_16: '', proc_grade_16: '', proc_staff_16: '',
    proc_date_17: '', proc_grade_17: '', proc_staff_17: '',
    proc_date_18: '', proc_grade_18: '', proc_staff_18: '',
    proc_date_19: '', proc_grade_19: '', proc_staff_19: '',
    proc_date_20: '', proc_grade_20: '', proc_staff_20: '',
    proc_date_21: '', proc_grade_21: '', proc_staff_21: '',
    proc_date_22: '', proc_grade_22: '', proc_staff_22: '',
    proc_date_23: '', proc_grade_23: '', proc_staff_23: '',
    proc_date_24: '', proc_grade_24: '', proc_staff_24: '',
    proc_date_25: '', proc_grade_25: '', proc_staff_25: '',
    proc_date_26: '', proc_grade_26: '', proc_staff_26: '',
    proc_date_27: '', proc_grade_27: '', proc_staff_27: '',
    
    // Digital Signature
    digitalSignature: null
  });

  // Page state
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 11;
  const topRef = useRef(null); // Ref for scrolling to top
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '' });
  const [xrayImage, setXrayImage] = useState(null);
  const [xrayPreview, setXrayPreview] = useState('');
  const [allergyMessage, setAllergyMessage] = useState('Loading allergies...');
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  useEffect(() => {
    const prefill = location.state?.redoEdit ? location.state?.prefillCaseData : null;
    const editCaseId = String(location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || '').trim();
    if (prefill && editCaseId) {
      setFormData((prev) => ({ ...prev, ...prefill }));
      if (typeof prefill.digitalSignature === 'string' && prefill.digitalSignature.startsWith('data:')) {
        setSignaturePreview(prefill.digitalSignature);
      }
      if (typeof prefill.xrayImage === 'string' && prefill.xrayImage.startsWith('data:image/')) {
        setXrayImage(prefill.xrayImage);
        setXrayPreview(prefill.xrayImage);
      }
      setCurrentPage(1);
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

        if (draft.data.formData && typeof draft.data.formData === 'object') {
          setFormData((prev) => ({ ...prev, ...draft.data.formData }));
        }
        if (Number.isFinite(draft.step)) {
          const nextStep = Math.max(1, Math.min(Number(draft.step), totalPages));
          setCurrentPage(nextStep);
        }
        if (typeof draft.data.signaturePreview === 'string' && draft.data.signaturePreview.trim()) {
          setSignaturePreview(draft.data.signaturePreview);
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
        formData,
        signaturePreview,
      },
    });
  }, [currentPage, formData, signaturePreview, isDraftHydrated]);

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
        console.log('[Partial] Before unload - saving draft immediately');
        saveCaseDraft({
          patientId,
          routeKey: DRAFT_ROUTE_KEY,
          step: currentPage,
          data: {
            formData,
            signaturePreview,
          },
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, currentPage, signaturePreview, isDraftHydrated]);

  // Post-entry consent prompt
  useEffect(() => {
    if (location.state?.requestConsentAfterEntry && !location.state?.[CASE_CONSENT_NAV_STATE_KEY]) {
      const confirmed = window.confirm('Please complete the consent form before proceeding. Click OK to open the consent form.');
      if (confirmed) {
        navigate(`/consent-form?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      }
    }
  }, []);

  const formatAllergyTicker = (rawValue) => {
    const raw = (rawValue || '').trim();
    if (!raw) return 'Drug Allergies: None';
    if (/^loading/i.test(raw)) return raw;

    const withoutPrefix = raw.replace(/^\s*(Drug\s*Allerg(?:y|ies)|Known\s*Allergies|Diet\s*Allergies)\s*:\s*/i, '');
    if (/^(no known allergies|nil|none)$/i.test(withoutPrefix.trim())) {
      return 'Drug Allergies: None';
    }

    const allergies = withoutPrefix
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    return `Drug Allergies: ${allergies.length ? allergies.join(' | ') : 'None'}`;
  };

  useEffect(() => {
    const patientId = localStorage.getItem('CurrentpatientId');
    if (!patientId) {
      setAllergyMessage('Drug Allergies: None');
      return;
    }

    fetch(`http://localhost:5000/api/doctor-patient/${patientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (!result || !result.data) {
          setAllergyMessage('Drug Allergies: None');
          return;
        }

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
          setAllergyMessage('Drug Allergies: None');
        }
      })
      .catch(() => setAllergyMessage('Drug Allergies: None'));
  }, []);

  // Update OHI-S calculation
  useEffect(() => {
    const debris = parseFloat(formData.debrisTotal) || 0;
    const calculus = parseFloat(formData.calculusTotal) || 0;
    const ohis = (debris + calculus).toFixed(2);
    
    if (formData.ohis !== ohis) {
      setFormData(prev => ({ ...prev, ohis }));
    }
  }, [formData.debrisTotal, formData.calculusTotal, formData.ohis]);

  // Auto-grow textarea function
  const autoGrow = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = (textarea.scrollHeight) + 'px';
    
    // Cap at max height
    const maxHeight = 400;
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = maxHeight + 'px';
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => {
        const currentValues = [...(prev[name] || [])];
        if (checked) {
          return { ...prev, [name]: [...currentValues, value] };
        } else {
          return { ...prev, [name]: currentValues.filter(v => v !== value) };
        }
      });
    } else if (type === 'radio') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle textarea changes with auto-grow
  const handleTextareaChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    autoGrow(e); // Call auto-grow function
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

  // Handle File Change for Digital Signature
  const handleFileChange = (file) => {
    setFormData(prev => ({ ...prev, digitalSignature: file }));
    previewSignature(file);
  };

  // Handle X-ray image upload and preview
  const handleXrayImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setXrayImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setXrayPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setXrayImage(null);
      setXrayPreview('');
    }
  };

  useEffect(() => {
    const patientId = localStorage.getItem('CurrentpatientId') || '';
    const cachedXray = readStoredGeneralCaseXray(patientId);
    if (!cachedXray?.imageDataUrl) return;

    setXrayPreview((prev) => prev || cachedXray.imageDataUrl);
    setXrayImage((prev) => prev || cachedXray.imageDataUrl);
  }, []);

  // Calculate all scores
  const calculateScores = () => {
    // Gingival Index calculation
    const gingivalValues = [
      parseFloat(formData.buccal_upper_distal) || 0,
      parseFloat(formData.buccal_upper_mesial) || 0,
      parseFloat(formData.palatal_upper_distal) || 0,
      parseFloat(formData.palatal_upper_mesial) || 0,
      parseFloat(formData.buccal_lower_distal) || 0,
      parseFloat(formData.buccal_lower_mesial) || 0,
      parseFloat(formData.lingual_lower_distal) || 0,
      parseFloat(formData.lingual_lower_mesial) || 0,
    ];
    
    const validGingivalValues = gingivalValues.filter(v => v !== 0);
    const gingivalAvg = validGingivalValues.length > 0 
      ? (validGingivalValues.reduce((sum, val) => sum + val, 0) / validGingivalValues.length).toFixed(2)
      : '0.00';
    
    // Debris Score calculation
    const debrisValues = [
      parseFloat(formData.debris_16) || 0,
      parseFloat(formData.debris_11) || 0,
      parseFloat(formData.debris_26) || 0,
      parseFloat(formData.debris_46) || 0,
      parseFloat(formData.debris_31) || 0,
      parseFloat(formData.debris_36) || 0,
    ];
    
    const validDebrisValues = debrisValues.filter(v => v !== 0);
    const debrisAvg = validDebrisValues.length > 0
      ? (validDebrisValues.reduce((sum, val) => sum + val, 0) / validDebrisValues.length).toFixed(2)
      : '0.00';
    
    // Calculus Score calculation
    const calcValues = [
      parseFloat(formData.calc_16) || 0,
      parseFloat(formData.calc_11) || 0,
      parseFloat(formData.calc_26) || 0,
      parseFloat(formData.calc_46) || 0,
      parseFloat(formData.calc_31) || 0,
      parseFloat(formData.calc_36) || 0,
    ];
    
    const validCalcValues = calcValues.filter(v => v !== 0);
    const calcAvg = validCalcValues.length > 0
      ? (validCalcValues.reduce((sum, val) => sum + val, 0) / validCalcValues.length).toFixed(2)
      : '0.00';
    
    // Update form data with calculated values
    setFormData(prev => ({
      ...prev,
      gingival_index: gingivalAvg,
      debris_score: debrisAvg,
      calculus_score: calcAvg,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only allow submission from page 11
    if (currentPage !== 11) {
      alert("Please complete all pages and reach the Doctor's Authentication page to submit.");
      return;
    }
    
    // Validate signature on page 11
    if (!formData.digitalSignature) {
      alert("Please upload your digital signature before submitting.");
      return;
    }
    
    try {
      const patientId = localStorage.getItem('CurrentpatientId');
      const patientName = localStorage.getItem('CurrentpatientName');
      const doctorId = localStorage.getItem('doctorId');
      const doctorName = localStorage.getItem('doctorName') || localStorage.getItem('name') || 'Doctor';
      const token = localStorage.getItem('token');

      const redoEditCaseId = String(
        location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || ''
      ).trim();
      const isRedoEdit = Boolean(redoEditCaseId);

      console.log('Form submission data:', { patientId, patientName, doctorId, doctorName, hasToken: !!token });

      // Validate that we have actual values, not "undefined" strings
      if (!patientId || patientId === 'undefined' || patientId === 'null') {
        alert('Missing patient information. Please select a patient first.');
        return;
      }

      if (!patientName || patientName === 'undefined' || patientName === 'null') {
        alert('Missing patient name. Please ensure patient information is loaded.');
        return;
      }

      const missingDoctor = !doctorId || doctorId === 'undefined' || doctorId === 'null';
      const missingDoctorName = !doctorName || doctorName === 'undefined' || doctorName === 'null' || doctorName === 'Doctor';
      const missingToken = !token;

      if (missingDoctor || missingDoctorName || missingToken) {
        alert('Doctor information or authentication missing. Please log in to submit the case sheet.');
        return;
      }

      if (isRedoEdit) {
        const fileToDataUrl = (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

        const bodyToSend = {
          ...formData,
          patientId,
          patientName,
          doctorId,
          doctorName,
          xrayImage,
        };

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

        const result = await response.json();
        if (response.ok) {
          await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
          localStorage.removeItem('redoEditCaseId');
          localStorage.removeItem('redoEditDepartmentKey');
          alert('Partial Denture Case Sheet updated and resubmitted successfully!');
          navigate('/pg-dashboard');
          return;
        }

        alert(result?.message || result?.error || `Failed to update case sheet (${response.status})`);
        return;
      }

      // If we have auth and doctor info, try protected endpoint with FormData (supports file upload)
      const formDataToSend = new FormData();

      // Define submit function before it is called by either X-ray branch.
      const submitForm = async (dataToSend) => {
        try {
          console.log('Sending protected save to backend with signature:', formData.digitalSignature?.name);

          const response = await fetch(buildApiUrl('/api/partial/save'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: dataToSend
          });

          const resultText = await response.text();
          let result;
          try { result = resultText ? JSON.parse(resultText) : {}; } catch { result = { message: resultText }; }
          console.log('Protected backend response:', result);

          if (response.ok) {
            const newCaseId = result?.caseId || result?.data?._id;
            if (newCaseId) localStorage.setItem('caseId', newCaseId);
            await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
            alert('Partial Denture Case Sheet submitted and saved successfully!');
            window.location.href = '/prescriptions';
          } else {
            alert(result?.message || result?.error || `Failed to save case sheet (${response.status})`);
          }
        } catch (submitError) {
          console.error('Partial submission request error:', submitError);
          alert(submitError?.message || 'Failed to submit case sheet. Please try again.');
        }
      };
      
      // Convert X-ray image to base64 if exists
      if (xrayImage instanceof File) {
        const xrayReader = new FileReader();
        xrayReader.onload = () => {
          const xrayBase64 = xrayReader.result;
          formDataToSend.append('xrayImage', xrayBase64);
          
          // Add all form fields
          Object.keys(formData).forEach(key => {
            if (key === 'digitalSignature' && formData[key]) {
              formDataToSend.append(key, formData[key]);
            } else if (key !== 'digitalSignature') {
              formDataToSend.append(key, formData[key] || '');
            }
          });
          
          // Add patient and doctor info
          formDataToSend.append('patientId', patientId);
          formDataToSend.append('patientName', patientName);
          formDataToSend.append('doctorId', doctorId);
          formDataToSend.append('doctorName', doctorName);

          submitForm(formDataToSend);
        };
        xrayReader.readAsDataURL(xrayImage);
      } else if (typeof xrayImage === 'string' && xrayImage.startsWith('data:image/')) {
        formDataToSend.append('xrayImage', xrayImage);

        Object.keys(formData).forEach(key => {
          if (key === 'digitalSignature' && formData[key]) {
            formDataToSend.append(key, formData[key]);
          } else if (key !== 'digitalSignature') {
            formDataToSend.append(key, formData[key] || '');
          }
        });

        formDataToSend.append('patientId', patientId);
        formDataToSend.append('patientName', patientName);
        formDataToSend.append('doctorId', doctorId);
        formDataToSend.append('doctorName', doctorName);

        submitForm(formDataToSend);
      } else {
        if (typeof xrayImage === 'string' && xrayImage.trim()) {
          formDataToSend.append('xrayImage', xrayImage.trim());
        }

        // Add all form fields
        Object.keys(formData).forEach(key => {
          if (key === 'digitalSignature' && formData[key]) {
            formDataToSend.append(key, formData[key]);
          } else if (key !== 'digitalSignature') {
            formDataToSend.append(key, formData[key] || '');
          }
        });
        
        // Add patient and doctor info
        formDataToSend.append('patientId', patientId);
        formDataToSend.append('patientName', patientName);
        formDataToSend.append('doctorId', doctorId);
        formDataToSend.append('doctorName', doctorName);

        submitForm(formDataToSend);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert(error?.message || 'Failed to submit case sheet. Please try again.');
    }
  };

  // Navigation functions with scroll to top
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Scroll to top after page change
      setTimeout(() => {
        if (topRef.current) {
          topRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        } else {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // Scroll to top after page change
      setTimeout(() => {
        if (topRef.current) {
          topRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        } else {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  useEffect(() => {
    const patientId = getCurrentPatientId();
    const sharedXray = getSharedXrayImage(patientId);

    if (!sharedXray?.dataUrl) return;

    setXrayImage((prev) => prev || sharedXray.dataUrl);
    setXrayPreview((prev) => prev || sharedXray.dataUrl);
  }, []);

  // Medical history conditions
  const medicalConditions = [
    { id: 'cardio', label: 'Cardiovascular disease' },
    { id: 'resp', label: 'Respiratory disorder' },
    { id: 'diabetes', label: 'Diabetes' },
    { id: 'blood', label: 'Blood dyscrasias' },
    { id: 'neuro', label: 'Neurological disease/facial palsy' },
    { id: 'rheumatic', label: 'Rheumatic fever' },
    { id: 'skin', label: 'Skin disorders' },
    { id: 'bone', label: 'Rheumatoid arthritis/bone disorders' },
    { id: 'hep', label: 'Hepatitis' },
    { id: 'immune', label: 'Immune disorders' },
    { id: 'allergy', label: 'Allergic reactions' },
    { id: 'others_medical', label: 'Others:' },
  ];

  // Dental history loss reasons
  const lossReasons = [
    { value: 'Caries', label: 'Caries' },
    { value: 'Congenital', label: 'Congenital absence of teeth' },
    { value: 'Periodontal', label: 'Periodontal disease' },
    { value: 'Trauma', label: 'Trauma' },
    { value: 'Others_loss_reason', label: 'Others' },
  ];

  // Treatment procedures
  const treatmentProcedures = [
    { id: 1, name: 'Diagnostic impression' },
    { id: 2, name: 'Preparation of diagnostic cast' },
    { id: 3, name: 'Surveying and designing of diagnostic cast' },
    { id: 4, name: 'Mouth preparation' },
    { id: 5, name: 'Definitive impression Material used' },
    { id: 6, name: 'Preparation of master cast' },
    { id: 7, name: 'Surveying and designing of master cast' },
    { id: 8, name: 'Block out procedure' },
    { id: 9, name: 'Duplication and refractory casts' },
    { id: 10, name: 'Preparation of refractory cast' },
    { id: 11, name: 'Wax pattern for frame work' },
    { id: 12, name: 'Casting of frame work' },
    { id: 13, name: 'Finishing and polishing of frame work' },
    { id: 14, name: 'Metal try in' },
    { id: 15, name: 'Altered cast impression' },
    { id: 16, name: 'Occlusal rim preparation' },
    { id: 17, name: 'Tentative jaw relation' },
    { id: 18, name: 'Facebow transfer' },
    { id: 19, name: 'Jaw relation recording' },
    { id: 20, name: 'Articulation of casts' },
    { id: 21, name: 'Teeth arrangement' },
    { id: 22, name: 'Wax try in' },
    { id: 23, name: 'Acrylization' },
    { id: 24, name: 'Finishing and polishing' },
    { id: 25, name: 'Denture delivery' },
    { id: 26, name: 'Post insertion follow up-1' },
    { id: 27, name: 'Post insertion follow up-2' },
  ];

  // Helper function to render radio buttons for a condition
  const renderRadioCondition = (name, label) => (
    <div className="condition-item">
      <label htmlFor={`${name}_yes`}>{label}</label>
      <input
        type="radio"
        id={`${name}_yes`}
        name={name}
        value="yes"
        checked={formData[name] === 'yes'}
        onChange={handleInputChange}
      /> Yes
      <input
        type="radio"
        id={`${name}_no`}
        name={name}
        value="no"
        checked={formData[name] === 'no'}
        onChange={handleInputChange}
      /> No
    </div>
  );

  // Render Page 1: Medical History
  const renderPage1 = () => (
    <div className="form-page">
      <div className="xray-upload-section">
        <h3>X-ray Image </h3>
        {xrayPreview && (
          <img src={xrayPreview} alt="X-ray Preview" className="xray-preview" />
        )}
        {!xrayPreview && <p>No X-ray found in General Case Sheet for this patient.</p>}
      </div>
      <h2 className="case-sheet-section-title">1. Medical History</h2>
      <p>Does the patient suffer/suffered from any of the following disease/s:</p>

      <div className="checkbox-group medical-history-conditions">
        {medicalConditions.map(condition => renderRadioCondition(condition.id, condition.label))}
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="treatment" className="case-sheet-label">
          A. Details of treatment for any of the above said ailments:
        </label>
        <textarea
          id="treatment"
          name="treatment"
          className="case-sheet-textarea"
          rows="4"
          placeholder="Enter treatment details here..."
          value={formData.treatment}
          onChange={handleTextareaChange}
          onInput={autoGrow}
          required
        />
      </div>
    </div>
  );

  // Render Page 2: General Examination
  const renderPage2 = () => (
    <div className="form-page">
      <h2 className="case-sheet-section-title">2. General Examination</h2>
      <div className="case-sheet-form-group">
        <label htmlFor="gait" className="case-sheet-label">Gait-</label>
        <input type="text" id="gait" name="gait" className="case-sheet-input" value={formData.gait} onChange={handleInputChange} />
        <label htmlFor="tuilt" className="case-sheet-label">Tuilt-</label>
        <input type="text" id="tuilt" name="tuilt" className="case-sheet-input" value={formData.tuilt} onChange={handleInputChange} />
        <label htmlFor="weight" className="case-sheet-label">Weight-</label>
        <input type="text" id="weight" name="weight" className="case-sheet-input" value={formData.weight} onChange={handleInputChange} />
        <label htmlFor="height" className="case-sheet-label">Height (in cm or inches)-</label>
        <input type="number" id="height" name="height" className="case-sheet-input" value={formData.height} onChange={handleInputChange} placeholder="Enter height in cm or inches" />
      </div>

      <h4 className="case-sheet-subtitle">Vital Signs</h4>
      <div className="case-sheet-form-group">
        <label htmlFor="bp" className="case-sheet-label">Blood pressure-</label>
        <input type="text" id="bp" name="bp" className="case-sheet-input" value={formData.bp} onChange={handleInputChange} />
        <label htmlFor="resp_rate" className="case-sheet-label">Respiratory rate-</label>
        <input type="text" id="resp_rate" name="resp_rate" className="case-sheet-input" value={formData.resp_rate} onChange={handleInputChange} />
        <label htmlFor="heart_rate" className="case-sheet-label">Heart rate-</label>
        <input type="text" id="heart_rate" name="heart_rate" className="case-sheet-input" value={formData.heart_rate} onChange={handleInputChange} />
        <label htmlFor="temperature" className="case-sheet-label">Body temperature-</label>
        <input type="text" id="temperature" name="temperature" className="case-sheet-input" value={formData.temperature} onChange={handleInputChange} />
      </div>
    </div>
  );

  // Render Page 3: Patient Information
  const renderPage3 = () => (
    <div className="form-page">
      <h2 className="case-sheet-section-title">3. Patient Information</h2>
      
      <div className="case-sheet-form-group">
        <label htmlFor="nutrition" className="case-sheet-label">Nutritional status:</label>
        <input type="text" id="nutrition" name="nutrition" className="case-sheet-input" value={formData.nutrition} onChange={handleInputChange} />
      </div>

      <h3 className="case-sheet-subtitle">4. Patient's Mental Attitude: (M.M. House Classification)</h3>
      <div className="checkbox-group">
        {['Philosophical', 'Exacting', 'Hysterical', 'Indifferent'].map(option => (
          <label key={option}>
            <input
              type="checkbox"
              name="attitude"
              value={option}
              checked={formData.attitude.includes(option)}
              onChange={handleInputChange}
            /> {option}
          </label>
        ))}
      </div>

      <h3 className="case-sheet-subtitle">5. Habits:</h3>
      <div className="checkbox-group">
        {['Smoking', 'Pan chewing'].map(habit => (
          <label key={habit}>
            <input
              type="checkbox"
              name="habits"
              value={habit}
              checked={formData.habits.includes(habit)}
              onChange={handleInputChange}
            /> {habit}
          </label>
        ))}
      </div>
      
      <div className="case-sheet-form-group">
        <label htmlFor="habit_duration" className="case-sheet-label">Duration/frequency of the habit:</label>
        <input type="text" id="habit_duration" name="habit_duration" className="case-sheet-input" value={formData.habit_duration} onChange={handleInputChange} />
      </div>

      <h3 className="case-sheet-subtitle">6. Dental History:</h3>
      
      <div className="case-sheet-form-group">
        <label htmlFor="prev_treatment" className="case-sheet-label">A. History of previous dental treatment/s:</label>
        <textarea 
          id="prev_treatment" 
          name="prev_treatment" 
          className="case-sheet-textarea" 
          rows="3" 
          value={formData.prev_treatment} 
          onChange={handleTextareaChange}
          onInput={autoGrow}
        />
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">B. Reasons for tooth loss:</label>
        <div className="checkbox-group">
          {lossReasons.map(reason => (
            <label key={reason.value}>
              <input
                type="checkbox"
                name="loss_reason"
                value={reason.value}
                checked={formData.loss_reason.includes(reason.value)}
                onChange={handleInputChange}
              /> {reason.label}
            </label>
          ))}
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">C. Sequence of loss of teeth:</label>
        
        <div className="form-group-row">
          <h4>Maxillary</h4>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            <div>
              <label htmlFor="max_anterior" className="case-sheet-label">Anterior:</label>
              <input type="text" id="max_anterior" name="max_anterior" className="case-sheet-input" value={formData.max_anterior} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="max_posterior" className="case-sheet-label">Posterior:</label>
              <input type="text" id="max_posterior" name="max_posterior" className="case-sheet-input" value={formData.max_posterior} onChange={handleInputChange} />
            </div>
          </div>
        </div>

        <div className="form-group-row">
          <h4>Mandibular</h4>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            <div>
              <label htmlFor="mand_anterior" className="case-sheet-label">Anterior:</label>
              <input type="text" id="mand_anterior" name="mand_anterior" className="case-sheet-input" value={formData.mand_anterior} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="mand_posterior" className="case-sheet-label">Posterior:</label>
              <input type="text" id="mand_posterior" name="mand_posterior" className="case-sheet-input" value={formData.mand_posterior} onChange={handleInputChange} />
            </div>
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="duration_rulones" className="case-sheet-label">D. Duration of rulones:</label>
        <input type="text" id="duration_rulones" name="duration_rulones" className="case-sheet-input" value={formData.duration_rulones} onChange={handleInputChange} />
      </div>
    </div>
  );

  // Render Page 4: Clinical Examination
  const renderPage4 = () => (
    <div className="form-page">
      {/* X-ray Image Upload Section */}
      

      <h2 className="case-sheet-section-title">7. Clinical Examination</h2>
      <h3 className="case-sheet-subtitle">A. Extra Oral Examination</h3>

      <div className="case-sheet-form-group">
        <label htmlFor="facial_symmetry" className="case-sheet-label">a) Facial symmetry:</label>
        <input type="text" id="facial_symmetry" name="facial_symmetry" className="case-sheet-input" value={formData.facial_symmetry} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">b) Facial profile (Angle's classification):</label>
        <div className="checkbox-group">
          {['Normal', 'Retrognathic', 'Prognathic'].map(profile => (
            <label key={profile}>
              <input
                type="checkbox"
                name="facial_profile"
                value={profile}
                checked={formData.facial_profile.includes(profile)}
                onChange={handleInputChange}
              /> {profile}
            </label>
          ))}
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Facial form (House and Loop, Prush and Fischer, Leon Williams):</label>
        <div className="checkbox-group">
          {['Square', 'Square-tapering', 'Tapering', 'Ovoid'].map(form => (
            <label key={form}>
              <input
                type="checkbox"
                name="facial_form"
                value={form}
                checked={formData.facial_form.includes(form)}
                onChange={handleInputChange}
              /> {form}
            </label>
          ))}
        </div>
      </div>

      <h3 className="case-sheet-subtitle">TMJ Examination</h3>
      <h4>1. Inspection</h4>
      
      <div className="case-sheet-form-group">
        <label htmlFor="mouth_opening" className="case-sheet-label">a) Maximum mouth opening (mm):</label>
        <input type="text" id="mouth_opening" name="mouth_opening" className="case-sheet-input" value={formData.mouth_opening} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">b) Deviation of mandible:</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="mandible_deviation"
              value="Yes"
              checked={formData.mandible_deviation === 'Yes'}
              onChange={handleInputChange}
            /> Yes
          </label>
          <label>
            <input
              type="radio"
              name="mandible_deviation"
              value="No"
              checked={formData.mandible_deviation === 'No'}
              onChange={handleInputChange}
            /> No
          </label>
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Opening Deviation:</label>
        <div className="checkbox-group">
          {['Left', 'Right'].map(direction => (
            <label key={`open-${direction}`}>
              <input
                type="checkbox"
                name="opening_deviation"
                value={direction}
                checked={formData.opening_deviation.includes(direction)}
                onChange={handleInputChange}
              /> Deviation to {direction}
            </label>
          ))}
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Closing Deviation:</label>
        <div className="checkbox-group">
          {['Left', 'Right'].map(direction => (
            <label key={`close-${direction}`}>
              <input
                type="checkbox"
                name="closing_deviation"
                value={direction}
                checked={formData.closing_deviation.includes(direction)}
                onChange={handleInputChange}
              /> Deviation to {direction}
            </label>
          ))}
        </div>
      </div>

      <h4>2. Palpation</h4>
      
      <div className="case-sheet-form-group">
        <label htmlFor="pain_tenderness" className="case-sheet-label">a) Pain/tenderness:</label>
        <input type="text" id="pain_tenderness" name="pain_tenderness" className="case-sheet-input" value={formData.pain_tenderness} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="clicking" className="case-sheet-label">b) Clicking:</label>
        <input type="text" id="clicking" name="clicking" className="case-sheet-input" value={formData.clicking} onChange={handleInputChange} />
      </div>

      <h4>3. Auscultation</h4>
      
      <div className="case-sheet-form-group">
        <label htmlFor="crepitus" className="case-sheet-label">a) Crepitus:</label>
        <input type="text" id="crepitus" name="crepitus" className="case-sheet-input" value={formData.crepitus} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="lymph_nodes" className="case-sheet-label">b) Lymph nodes:</label>
        <input type="text" id="lymph_nodes" name="lymph_nodes" className="case-sheet-input" value={formData.lymph_nodes} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="lips" className="case-sheet-label">c) Lips:</label>
        <input type="text" id="lips" name="lips" className="case-sheet-input" value={formData.lips} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="competency" className="case-sheet-label">Competency:</label>
        <input type="text" id="competency" name="competency" className="case-sheet-input" value={formData.competency} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Lip length:</label>
        <div className="checkbox-group">
          {['High', 'Medium', 'Low'].map(length => (
            <label key={length}>
              <input
                type="checkbox"
                name="lip_length"
                value={length}
                checked={formData.lip_length.includes(length)}
                onChange={handleInputChange}
              /> {length}
            </label>
          ))}
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="pathology" className="case-sheet-label">Pathology if any:</label>
        <textarea 
          id="pathology" 
          name="pathology" 
          className="case-sheet-textarea" 
          rows="3" 
          value={formData.pathology} 
          onChange={handleTextareaChange}
          onInput={autoGrow}
        />
      </div>
    </div>
  );

  // Render Page 5: Intraoral Examination
  const renderPage5 = () => (
    <div className="form-page">
      <h2 className="case-sheet-section-title">8. Intraoral Examination</h2>
      
      <div className="case-sheet-form-group">
        <h3 className="case-sheet-subtitle">c) Extra Oral Muscle Tone (M.M. House Classification)</h3>
        <div className="option-group">
          {['Class I', 'Class II', 'Class III'].map(cls => (
            <label key={cls}>
              <input
                type="radio"
                name="muscle_tone"
                value={cls}
                checked={formData.muscle_tone === cls}
                onChange={handleInputChange}
              /> {cls}
            </label>
          ))}
        </div>
      </div>

      <h3 className="case-sheet-subtitle">9. Intraoral Examination</h3>
      
      <div className="case-sheet-form-group">
        <h4>a) Buccal Mucosa</h4>
        <div className="form-group-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="buccal_colour" className="case-sheet-label">Colour:</label>
            <input type="text" id="buccal_colour" name="buccal_colour" className="case-sheet-input" value={formData.buccal_colour} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="buccal_texture" className="case-sheet-label">Texture:</label>
            <input type="text" id="buccal_texture" name="buccal_texture" className="case-sheet-input" value={formData.buccal_texture} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="buccal_others" className="case-sheet-label">Others:</label>
            <input type="text" id="buccal_others" name="buccal_others" className="case-sheet-input" value={formData.buccal_others} onChange={handleInputChange} />
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group">
        <h4>b) Floor of the Mouth</h4>
        <div className="form-group-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="floor_colour" className="case-sheet-label">Colour:</label>
            <input type="text" id="floor_colour" name="floor_colour" className="case-sheet-input" value={formData.floor_colour} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="floor_others" className="case-sheet-label">Others:</label>
            <input type="text" id="floor_others" name="floor_others" className="case-sheet-input" value={formData.floor_others} onChange={handleInputChange} />
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group">
        <h4>c) Hard Palate</h4>
        <div className="form-group-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="hard_shape" className="case-sheet-label">High arched / Normal:</label>
            <input type="text" id="hard_shape" name="hard_shape" className="case-sheet-input" value={formData.hard_shape} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="hard_tori" className="case-sheet-label">Tori:</label>
            <input type="text" id="hard_tori" name="hard_tori" className="case-sheet-input" value={formData.hard_tori} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="hard_hyperplasia" className="case-sheet-label">Hyperplasia:</label>
            <input type="text" id="hard_hyperplasia" name="hard_hyperplasia" className="case-sheet-input" value={formData.hard_hyperplasia} onChange={handleInputChange} />
          </div>
        </div>
        <div className="form-group-row" style={{ marginTop: '10px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="hard_inflammation" className="case-sheet-label">Inflammation:</label>
            <input type="text" id="hard_inflammation" name="hard_inflammation" className="case-sheet-input" value={formData.hard_inflammation} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="hard_others" className="case-sheet-label">Others:</label>
            <input type="text" id="hard_others" name="hard_others" className="case-sheet-input" value={formData.hard_others} onChange={handleInputChange} />
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group">
        <h4>d) Soft Palate</h4>
        <div className="case-sheet-form-group">
          <label className="case-sheet-label">Soft Palatal Form (Sheldon Winkler):</label>
          <div className="option-group">
            {['Class I', 'Class II', 'Class III'].map(cls => (
              <label key={`soft-${cls}`}>
                <input
                  type="radio"
                  name="soft_palate_form"
                  value={cls}
                  checked={formData.soft_palate_form === cls}
                  onChange={handleInputChange}
                /> {cls}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="soft_colour" className="case-sheet-label">Colour:</label>
            <input type="text" id="soft_colour" name="soft_colour" className="case-sheet-input" value={formData.soft_colour} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="soft_others" className="case-sheet-label">Others:</label>
            <input type="text" id="soft_others" name="soft_others" className="case-sheet-input" value={formData.soft_others} onChange={handleInputChange} />
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group">
        <h4>e) Tongue</h4>
        <div className="case-sheet-form-group">
          <label className="case-sheet-label">Size (M.M. House Classification):</label>
          <div className="option-group">
            {['Class I', 'Class II', 'Class III'].map(cls => (
              <label key={`size-${cls}`}>
                <input
                  type="radio"
                  name="tongue_size"
                  value={cls}
                  checked={formData.tongue_size === cls}
                  onChange={handleInputChange}
                /> {cls}
              </label>
            ))}
          </div>
        </div>

        <div className="case-sheet-form-group">
          <label className="case-sheet-label">Tongue Position (Wright's Classification):</label>
          <div className="option-group">
            {['Class I', 'Class II', 'Class III'].map(cls => (
              <label key={`pos-${cls}`}>
                <input
                  type="radio"
                  name="tongue_position"
                  value={cls}
                  checked={formData.tongue_position === cls}
                  onChange={handleInputChange}
                /> {cls}
              </label>
            ))}
          </div>
        </div>

        <div className="case-sheet-form-group">
          <label className="case-sheet-label">Mobility:</label>
          <div className="option-group">
            {['Normal', 'Reduced', 'Others'].map(mobility => (
              <label key={mobility}>
                <input
                  type="radio"
                  name="tongue_mobility"
                  value={mobility}
                  checked={formData.tongue_mobility === mobility}
                  onChange={handleInputChange}
                /> {mobility === 'Reduced' ? 'Reduced (tongue tie)' : mobility}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group">
        <h4>f) Saliva (M.M. House Classification)</h4>
        <div className="option-group">
          {['Class I', 'Class II', 'Class III'].map(cls => (
            <label key={`saliva-${cls}`}>
              <input
                type="radio"
                name="saliva_class"
                value={cls}
                checked={formData.saliva_class === cls}
                onChange={handleInputChange}
              /> {cls}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Page 6: Gingival & Oral Hygiene
  const renderPage6 = () => (
    <div className="form-page">
      <h2 className="case-sheet-section-title">10. Gingival & Oral Hygiene Index</h2>
      <h3 className="case-sheet-subtitle">h) Gingival Index (Loe and Silness)</h3>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Upper Arch</label>
        <div className="gingival-score-inputs">
          <span>Buccal</span><br/>
          Distal:
          <input type="number" name="buccal_upper_distal" id="buccal_upper_distal" value={formData.buccal_upper_distal} onChange={handleInputChange} />
          Mesial:
          <input type="number" name="buccal_upper_mesial" id="buccal_upper_mesial" value={formData.buccal_upper_mesial} onChange={handleInputChange} />
        </div>

        <div className="gingival-score-inputs">
          <span>Palatal</span><br/>
          Distal:
          <input type="number" name="palatal_upper_distal" id="palatal_upper_distal" value={formData.palatal_upper_distal} onChange={handleInputChange} />
          Mesial:
          <input type="number" name="palatal_upper_mesial" id="palatal_upper_mesial" value={formData.palatal_upper_mesial} onChange={handleInputChange} />
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Lower Arch</label>
        <div className="gingival-score-inputs">
          <span>Buccal</span><br/>
          Distal:
          <input type="number" name="buccal_lower_distal" id="buccal_lower_distal" value={formData.buccal_lower_distal} onChange={handleInputChange} />
          Mesial:
          <input type="number" name="buccal_lower_mesial" id="buccal_lower_mesial" value={formData.buccal_lower_mesial} onChange={handleInputChange} />
        </div>

        <div className="gingival-score-inputs">
          <span>Lingual</span><br/>
          Distal:
          <input type="number" name="lingual_lower_distal" id="lingual_lower_distal" value={formData.lingual_lower_distal} onChange={handleInputChange} />
          Mesial:
          <input type="number" name="lingual_lower_mesial" id="lingual_lower_mesial" value={formData.lingual_lower_mesial} onChange={handleInputChange} />
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label className="score-label">Gingival Index:</label>
        <input type="number" id="gingival_index" step="0.1" value={formData.gingival_index} readOnly className="case-sheet-input" />
        <div className="interpret-box">
          <strong>Interpretation:</strong><br/>
          Mild gingivitis: 0.1 to 1.0<br/>
          Moderate gingivitis: 1.1 to 2.0<br/>
          Severe gingivitis: 2.1 to 3.0
        </div>
      </div>

      <h3 className="case-sheet-subtitle">i) Oral Hygiene Index - Simplified (Green and Vermillion)</h3>
      <h4>i. Debris Score</h4>
      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Enter scores for teeth:</label><br/>
        <div className="gingival-score-inputs">
          16: <input type="number" id="debris_16" name="debris_16" value={formData.debris_16} onChange={handleInputChange} />
          11: <input type="number" id="debris_11" name="debris_11" value={formData.debris_11} onChange={handleInputChange} />
          26: <input type="number" id="debris_26" name="debris_26" value={formData.debris_26} onChange={handleInputChange} />
          46: <input type="number" id="debris_46" name="debris_46" value={formData.debris_46} onChange={handleInputChange} />
          31: <input type="number" id="debris_31" name="debris_31" value={formData.debris_31} onChange={handleInputChange} />
          36: <input type="number" id="debris_36" name="debris_36" value={formData.debris_36} onChange={handleInputChange} />
        </div>

        <label className="score-label">Debris Score:</label>
        <input type="number" id="debris_score" step="0.1" value={formData.debris_score} readOnly className="case-sheet-input" />
      </div>

      <h4>ii. Calculus Score</h4>
      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Enter scores for teeth:</label><br/>
        <div className="gingival-score-inputs">
          16: <input type="number" id="calc_16" name="calc_16" value={formData.calc_16} onChange={handleInputChange} />
          11: <input type="number" id="calc_11" name="calc_11" value={formData.calc_11} onChange={handleInputChange} />
          26: <input type="number" id="calc_26" name="calc_26" value={formData.calc_26} onChange={handleInputChange} />
          46: <input type="number" id="calc_46" name="calc_46" value={formData.calc_46} onChange={handleInputChange} />
          31: <input type="number" id="calc_31" name="calc_31" value={formData.calc_31} onChange={handleInputChange} />
          36: <input type="number" id="calc_36" name="calc_36" value={formData.calc_36} onChange={handleInputChange} />
        </div>

        <label className="score-label">Calculus Score:</label>
        <input type="number" id="calculus_score" step="0.1" value={formData.calculus_score} readOnly className="case-sheet-input" />
      </div>

      <button type="button" className="case-sheet-button" onClick={calculateScores}>Calculate All Scores</button>
    </div>
  );

  // Render Page 7: Periodontal Charting & DMF Index
  const renderPage7 = () => (
    <div className="form-page">
      <h2 className="case-sheet-section-title">11. Periodontal Charting & Oral Hygiene</h2>
      
      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Oral Hygiene Index - S</label>
        <p><strong>OHI-S = Debris Index-S + Calculus Index-S</strong></p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="number" id="debrisTotal" name="debrisTotal" placeholder="Debris" value={formData.debrisTotal} onChange={handleInputChange} className="case-sheet-input" style={{width: '100px'}} />
          <span>+</span>
          <input type="number" id="calculusTotal" name="calculusTotal" placeholder="Calculus" value={formData.calculusTotal} onChange={handleInputChange} className="case-sheet-input" style={{width: '100px'}} />
          <span>=</span>
          <input type="number" id="ohis" value={formData.ohis} readOnly placeholder="OHI-S" className="case-sheet-input" style={{width: '100px'}} />
        </div>

        <div className="interpret-box">
          <strong>Interpretation:</strong><br/>
          Good: 0.0 to 1.2<br/>
          Fair: 1.3 to 3.0<br/>
          Poor: 3.1 to 6.0
        </div>
      </div>

      <h3 className="case-sheet-subtitle">j) DMF Index (H.T. Klein, C.E. Palmer, J.W. Knutson)</h3>
      <div className="case-sheet-form-group">
        <table className="case-sheet-table">
          <thead>
            <tr><th colSpan="16">MAX</th></tr>
            <tr>
              <td>8</td><td>7</td><td>6</td><td>5</td><td>4</td><td>3</td><td>2</td><td>1</td>
              <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[...Array(16)].map((_, i) => {
                const num = i + 1;
                const suffix = num > 8 ? '_r' : '';
                const toothNum = num > 8 ? num - 8 : num;
                const name = `dmf_max${toothNum}${suffix}`;
                return (
                  <td key={name}>
                    <input
                      type="text"
                      name={name}
                      value={formData[name] || ''}
                      onChange={handleInputChange}
                      className="case-sheet-input"
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
          <thead>
            <tr><th colSpan="16">MAND</th></tr>
            <tr>
              <td>8</td><td>7</td><td>6</td><td>5</td><td>4</td><td>3</td><td>2</td><td>1</td>
              <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[...Array(16)].map((_, i) => {
                const num = i + 1;
                const suffix = num > 8 ? '_r' : '';
                const toothNum = num > 8 ? num - 8 : num;
                const name = `dmf_mand${toothNum}${suffix}`;
                return (
                  <td key={name}>
                    <input
                      type="text"
                      name={name}
                      value={formData[name] || ''}
                      onChange={handleInputChange}
                      className="case-sheet-input"
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Page 8: Tooth Structure & Occlusion
  const renderPage8 = () => (
    <div className="form-page">
      <h2 className="case-sheet-section-title">12. Loss of Tooth Structure & Occlusion</h2>
      <h3 className="case-sheet-subtitle">l) Loss of Tooth Structure:</h3>
      
      <div className="case-sheet-form-group">
        <div className="form-group-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="abrasion" className="case-sheet-label">Abrasion</label>
            <input type="text" id="abrasion" name="abrasion" className="case-sheet-input" value={formData.abrasion} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="attrition" className="case-sheet-label">Occlusal Wear / Attrition</label>
            <input type="text" id="attrition" name="attrition" className="case-sheet-input" value={formData.attrition} onChange={handleInputChange} />
          </div>
        </div>
        <div className="form-group-row" style={{ marginTop: '10px' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="erosion" className="case-sheet-label">Erosion</label>
            <input type="text" id="erosion" name="erosion" className="case-sheet-input" value={formData.erosion} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="abfraction" className="case-sheet-label">Abfraction</label>
            <input type="text" id="abfraction" name="abfraction" className="case-sheet-input" value={formData.abfraction} onChange={handleInputChange} />
          </div>
        </div>
      </div>

      <h3 className="case-sheet-subtitle">m) Anatomic and Functional Status of Edentulous Ridge:</h3>
      
      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Mucosa</label>
        <div className="form-group-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="mucosa_color" className="case-sheet-label">1. Colour</label>
            <input type="text" id="mucosa_color" name="mucosa_color" className="case-sheet-input" value={formData.mucosa_color} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="mucosa_consistency" className="case-sheet-label">2. Consistency</label>
            <input type="text" id="mucosa_consistency" name="mucosa_consistency" className="case-sheet-input" value={formData.mucosa_consistency} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="mucosa_thickness" className="case-sheet-label">3. Thickness</label>
            <input type="text" id="mucosa_thickness" name="mucosa_thickness" className="case-sheet-input" value={formData.mucosa_thickness} onChange={handleInputChange} />
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Ridge Classification (Siebert's Classification)</label>
        <div className="checkbox-group">
          {['Class I', 'Class II', 'Class III'].map(cls => (
            <label key={`ridge-${cls}`}>
              <input
                type="checkbox"
                name="ridgeClass"
                value={cls}
                checked={formData.ridgeClass.includes(cls)}
                onChange={handleInputChange}
              /> {cls}
            </label>
          ))}
        </div>
      </div>

      <div className="case-sheet-form-group">
        <div className="form-group-row">
          <div style={{ flex: 1 }}>
            <label htmlFor="ridgeHeight" className="case-sheet-label">Height of the Ridge</label>
            <input type="text" id="ridgeHeight" name="ridgeHeight" className="case-sheet-input" value={formData.ridgeHeight} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="ridgeLength" className="case-sheet-label">Length (mesio-distal)</label>
            <input type="text" id="ridgeLength" name="ridgeLength" className="case-sheet-input" value={formData.ridgeLength} onChange={handleInputChange} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="ridgeWidth" className="case-sheet-label">Width (bucco-lingual)</label>
            <input type="text" id="ridgeWidth" name="ridgeWidth" className="case-sheet-input" value={formData.ridgeWidth} onChange={handleInputChange} />
          </div>
        </div>
      </div>

      <h3 className="case-sheet-subtitle">n) Occlusion:</h3>
      
      <div className="case-sheet-form-group">
        <label htmlFor="molarRelation" className="case-sheet-label">Molar Relation (Angle's Classification)</label>
        <input type="text" id="molarRelation" name="molarRelation" className="case-sheet-input" value={formData.molarRelation} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="occlusalPlane" className="case-sheet-label">Occlusal Plane Discrepancies</label>
        <input type="text" id="occlusalPlane" name="occlusalPlane" className="case-sheet-input" value={formData.occlusalPlane} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="drifting" className="case-sheet-label">Drifting of Teeth</label>
        <input type="text" id="drifting" name="drifting" className="case-sheet-input" value={formData.drifting} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="supraEruption" className="case-sheet-label">Supra-eruption / Intrusion</label>
        <input type="text" id="supraEruption" name="supraEruption" className="case-sheet-input" value={formData.supraEruption} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="rotation" className="case-sheet-label">Rotation</label>
        <input type="text" id="rotation" name="rotation" className="case-sheet-input" value={formData.rotation} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="overjet" className="case-sheet-label">Overjet</label>
        <input type="text" id="overjet" name="overjet" className="case-sheet-input" value={formData.overjet} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="overbite" className="case-sheet-label">Overbite</label>
        <input type="text" id="overbite" name="overbite" className="case-sheet-input" value={formData.overbite} onChange={handleInputChange} />
      </div>

      <div className="case-sheet-form-group">
        <label className="case-sheet-label">Existing Occlusal Scheme</label>
        <div className="checkbox-group">
          {['Group function', 'Canine guided', 'Bilateral balanced'].map(scheme => (
            <label key={scheme}>
              <input
                type="checkbox"
                name="scheme"
                value={scheme}
                checked={formData.scheme.includes(scheme)}
                onChange={handleInputChange}
              /> {scheme}
            </label>
          ))}
        </div>
      </div>

      <div className="case-sheet-form-group">
        <label htmlFor="occlusionOthers" className="case-sheet-label">Others</label>
        <textarea 
          id="occlusionOthers" 
          name="occlusionOthers" 
          className="case-sheet-textarea" 
          rows="3" 
          placeholder="Describe other occlusal scheme if any..." 
          value={formData.occlusionOthers} 
          onChange={handleTextareaChange}
          onInput={autoGrow}
        />
      </div>
    </div>
  );

  // Render Page 9: Abutment Evaluation
  const renderPage9 = () => (
    <div className="form-page">
      <h2 className="case-sheet-section-title">13. Abutment Evaluation & Other Investigations</h2>
      <h3 className="case-sheet-subtitle">a) Clinical Evaluation</h3>
      
      <table className="case-sheet-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Findings</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: 'clinical_crown_height', label: 'Clinical crown height' },
            { name: 'crown_morphology', label: 'Crown morphology' },
            { name: 'vitality', label: 'Vitality' },
            { name: 'mobility_abutment', label: 'Mobility' },
            { name: 'probing_depth', label: 'Probing depth' },
            { name: 'bleeding_on_probing', label: 'Bleeding on probing' },
            { name: 'recession_abutment', label: 'Recession' },
            { name: 'furcation_involvement', label: 'Furcation involvement' },
            { name: 'axial_inclination', label: 'Axial inclination' },
            { name: 'rotations_abutment', label: 'Rotations' },
            { name: 'pain_on_percussion', label: 'Pain on percussion' },
            { name: 'restorations', label: 'Presence of restorations' },
            { name: 'caries', label: 'Caries' },
            { name: 'supra_eruption_intrusion', label: 'Supra eruption / intrusion' },
          ].map(param => (
            <tr key={param.name}>
              <td>{param.label}</td>
              <td><input type="text" name={param.name} value={formData[param.name] || ''} onChange={handleInputChange} className="case-sheet-input" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="case-sheet-subtitle">b) Radiographic Evaluation</h4>
      <table className="case-sheet-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Findings</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: 'periapical_status', label: 'Periapical status' },
            { name: 'lamina_dura', label: 'Lamina dura' },
            { name: 'crown_height_radio', label: 'Crown height' },
            { name: 'root_length', label: 'Root length' },
            { name: 'bone_radio', label: 'Bone' },
            { name: 'crown_root_ratio', label: 'Crown root ratio' },
            { name: 'coronal_proximal_radiolucency', label: 'Coronal/proximal radiolucency' },
          ].map(param => (
            <tr key={param.name}>
              <td>{param.label}</td>
              <td><input type="text" name={param.name} value={formData[param.name] || ''} onChange={handleInputChange} className="case-sheet-input" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="case-sheet-subtitle">14. Other Investigations</h3>
      <div className="case-sheet-form-group">
        <textarea 
          name="other_investigations" 
          className="case-sheet-textarea" 
          rows="4" 
          placeholder="OPG, others..." 
          value={formData.other_investigations} 
          onChange={handleTextareaChange}
          onInput={autoGrow}
        />
      </div>
    </div>
  );

  // Render Page 10: Treatment Planning
  const renderPage10 = () => (
    <div className="form-page">
      <h2 className="case-sheet-section-title">15. Edentulous Arch Classification & Treatment Planning</h2>
      
      <div className="case-sheet-form-group">
        <h3 className="case-sheet-subtitle">16. Classification of Edentulous Arch (Kennedy's Classification)</h3>
        <textarea 
          name="kennedy_classification" 
          className="case-sheet-textarea" 
          rows="3" 
          placeholder="Enter classification notes here..." 
          value={formData.kennedy_classification} 
          onChange={handleTextareaChange}
          onInput={autoGrow}
        />
      </div>

      <div className="case-sheet-form-group">
        <h3 className="case-sheet-subtitle">17. Treatment Planning</h3>
        <table className="case-sheet-table">
          <thead>
            <tr>
              <th>Treatment Type</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'treatment_surgery', label: 'Surgery' },
              { name: 'treatment_endodontic', label: 'Endodontic Treatment / Restorations' },
              { name: 'treatment_periodontal', label: 'Periodontal Treatment' },
              { name: 'treatment_orthodontic', label: 'Orthodontic Treatment' },
            ].map(treatment => (
              <tr key={treatment.name}>
                <td>{treatment.label}</td>
                <td><input type="text" name={treatment.name} value={formData[treatment.name] || ''} onChange={handleInputChange} className="case-sheet-input" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="case-sheet-form-group">
        <h4 className="case-sheet-subtitle">Prosthodontic Treatment</h4>
        <div className="image-upload">
          <label><strong>Diagrammatic Design Illustration - MAXILLARY ARCH:</strong></label>
          <input type="file" accept="image/*" name="maxillary_arch_design" onChange={handleFileChange} />
        </div>
        <div className="image-upload">
          <label><strong>Diagrammatic Design Illustration - MANDIBULAR ARCH:</strong></label>
          <input type="file" accept="image/*" name="mandibular_arch_design" onChange={handleFileChange} />
        </div>
      </div>
    </div>
  );

  // Render Page 11: Treatment Procedure
  const renderPage11 = () => (
    <div className="form-page">
      <h2 className="case-sheet-section-title">18. Treatment Procedure</h2>
      <table className="case-sheet-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Treatment Procedure</th>
            <th>Date</th>
            <th>Grade</th>
            <th>Staff In Charge</th>
          </tr>
        </thead>
        <tbody>
          {treatmentProcedures.map(proc => (
            <tr key={proc.id}>
              <td>{proc.id}</td>
              <td>{proc.name}</td>
              <td><input type="text" name={`proc_date_${proc.id}`} value={formData[`proc_date_${proc.id}`] || ''} onChange={handleInputChange} className="case-sheet-input" /></td>
              <td><input type="text" name={`proc_grade_${proc.id}`} value={formData[`proc_grade_${proc.id}`] || ''} onChange={handleInputChange} className="case-sheet-input" /></td>
              <td><input type="text" name={`proc_staff_${proc.id}`} value={formData[`proc_staff_${proc.id}`] || ''} onChange={handleInputChange} className="case-sheet-input" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render current page
  const renderCurrentPage = () => {
    switch(currentPage) {
      case 1: return renderPage1();
      case 2: return renderPage2();
      case 3: return renderPage3();
      case 4: return renderPage4();
      case 5: return renderPage5();
      case 6: return renderPage6();
      case 7: return renderPage7();
      case 8: return renderPage8();
      case 9: return renderPage9();
      case 10: return renderPage10();
      case 11: return renderPage11();
      default: return renderPage1();
    }
  };

  return (
    <div className="case-sheet-container" style={{ backgroundImage: "url('/images/campus.png')" }}>
      <div className="allergy-alert show" id="patientAllergyAlert">
        <span className="alert-icon">⚠️</span>
        <div className="allergy-flow-window">
          <span id="allergyMessage">{formatAllergyTicker(allergyMessage)}</span>
        </div>
      </div>
      <div className="case-sheet-wrapper">
        {/* Scroll target at the top */}
        <div ref={topRef}></div>

        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '12px', paddingLeft: '20px', paddingRight: '20px' }}>
          {localStorage.getItem('CurrentpatientName') && (
            <div style={{ position: 'absolute', left: '20px', top: '6px', padding: '8px 15px', backgroundColor: 'rgba(38, 40, 107, 0.95)', borderRadius: '4px', fontSize: '0.8em', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textAlign: 'left', whiteSpace: 'nowrap' }}>
              <div><strong>{localStorage.getItem('CurrentpatientName')}</strong></div>
              {localStorage.getItem('CurrentpatientId') && <div><strong>ID:</strong> {localStorage.getItem('CurrentpatientId')}</div>}
            </div>
          )}
          <div className="logo-container">
            <img src="/logo.png" alt="SRM Dental College Logo" style={{ maxWidth: '120px', height: 'auto' }} />
          </div>
          <h1 className="case-sheet-title">Comprehensive Medical Case Sheet</h1>
        </div>

        <form id="main-case-sheet-form" onSubmit={handleSubmit}>
          {/* Render current page */}
          {renderCurrentPage()}

          {/* Doctor's Authentication Section - ONLY on Page 11 */}
          {currentPage === 11 && (
            <div className="case-sheet-form-group" style={{ marginTop: '40px', paddingTop: '20px', borderTop: '3px solid rgba(255, 255, 255, 0.3)' }}>
              <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '30px', fontSize: '24px', fontWeight: 'bold' }}>Doctor's Authentication</h2>
              
              {/* Doctor Name Display */}
              <div style={{ marginBottom: '25px' }}>
                <label className="case-sheet-label">Doctor's Name</label>
                <input 
                  type="text" 
                  className="case-sheet-input"
                  value={localStorage.getItem('doctorName') || 'Doctor'} 
                  disabled
                  style={{ background: 'rgba(255, 255, 255, 0.15)', cursor: 'not-allowed' }}
                />
              </div>
              
              {/* Digital Signature Upload */}
              <div style={{ marginBottom: '25px' }}>
                <label htmlFor="digitalSignature" className="case-sheet-label">Upload Digital Signature *</label>
                <input
                  type="file"
                  id="digitalSignature"
                  className="case-sheet-input"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files[0])}
                  style={{ padding: '10px', cursor: 'pointer' }}
                  required
                />
                {signaturePreview && (
                  <div style={{ marginTop: '20px', padding: '15px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <p style={{ color: '#fff', marginBottom: '10px', fontWeight: 'bold' }}>Signature Preview:</p>
                    <img
                      src={signaturePreview}
                      alt="Signature Preview"
                      style={{ maxWidth: '200px', maxHeight: '120px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                    />
                  </div>
                )}
              </div>
              
              {/* Submit Confirmation */}
              <div style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                padding: '20px', 
                borderRadius: '8px', 
                marginTop: '30px',
                border: '2px dashed rgba(255, 255, 255, 0.3)'
              }}>
                
              </div>
            </div>
          )}
          {/* Navigation buttons at bottom only */}
          <div className="navigation-buttons">
            <button 
              type="button" 
              className="case-sheet-button" 
              onClick={prevPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            
            <div className="page-status">
              Page {currentPage} of {totalPages}
            </div>
            
            {currentPage === totalPages ? (
              <button type="submit" className="case-sheet-button submit-button">
                Submit 
              </button>
            ) : (
              <button 
                type="button" 
                className="case-sheet-button" 
                onClick={nextPage}
              >
                Next
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CaseSheet;
