import React, { useState, useContext, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import './Pedodontics.css';
import { readStoredGeneralCaseXray } from '../../utils/generalCaseXray';
import { API_BASE_URL } from '../../config/api';
const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';
import { getCurrentPatientId, getSharedXrayImage } from '../../utils/sharedXray';
import { clearCaseDraft, loadCaseDraft, saveCaseDraft } from '../../utils/caseDraft';

const Pedodontics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const DRAFT_ROUTE_KEY = '/pedodontics';
  const [currentPage, setCurrentPage] = useState(0);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    medicalHistory: '',
    dentalHistory: '',
    currentMedications: '',
    recentMedications: '',
    allergies: '',
    breastfeeding: '',
    bottleUsage: '',
    bottlePeriod: '',
    bottleContents: '',
    brushingHabits: '',
    wright: '',
    lampshire: '',
    bodyType: [],
    dietTime1: '', dietFood1: '', dietSugar1: '',
    dietTime2: '', dietFood2: '', dietSugar2: '',
    dietTime3: '', dietFood3: '', dietSugar3: '',
    dietTime4: '', dietFood4: '', dietSugar4: '',
    dietTime5: '', dietFood5: '', dietSugar5: '',
    dietInference: [],
    oralHabits: '',
    profile: [],
    face: [],
    lips: '',
    swallowing: '',
    tmj: '',
    lymphNodes: '',
    labialMucosa: '',
    buccalMucosa: '',
    vestibule: '',
    floorOfMouth: '',
    gingiva: '',
    tongue: '',
    palate: '',
    pharynxTonsils: '',
    numberOfTeeth: '',
    dentalAge: '',
    fdiNumbering: '',
    decayed: '',
    mobility: '',
    missing: '',
    filled: '',
    otherFindings: '',
    spacing: [],
    overjet: '',
    overbite: '',
    crossbite: '',
    midline: '',
    molarRelationships: '',
    canineRelationship: '',
    primary: [],
    permanent: [],
    crowdingRotation: '',
    differentialDiagnosis: '',
    investigation: '',
    finalDiagnosis: '',
    systemicPhase: '',
    preventivePhase: '',
    preparatoryPhase: '',
    correctivePhase: '',
    maintenancePhase: '',
    digitalSignature: null
  });
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '' });
  const [signaturePreview, setSignaturePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allergyMessage, setAllergyMessage] = useState('');
  const [showAllergy, setShowAllergy] = useState(true);
  const [xrayPreview, setXrayPreview] = useState('');
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  useEffect(() => {
    const prefill = location.state?.redoEdit ? location.state?.prefillCaseData : null;
    const editCaseId = String(location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || '').trim();
    if (prefill && editCaseId) {
      setFormData((prev) => ({ ...prev, ...prefill }));
      if (typeof prefill.digitalSignature === 'string' && prefill.digitalSignature.startsWith('data:')) {
        setFormData((prev) => ({ ...prev, digitalSignature: prefill.digitalSignature }));
        setSignaturePreview(prefill.digitalSignature);
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

        const draftFormData = draft.data.formData;
        if (draftFormData && typeof draftFormData === 'object') {
          setFormData((prev) => ({ ...prev, ...draftFormData }));
        }

        if (Number.isFinite(draft.step)) {
          const nextStep = Math.max(0, Math.min(Number(draft.step), totalPages - 1));
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
        console.log('[Pedodontics] Before unload - saving draft immediately');
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

  useEffect(() => {
    const patientId = localStorage.getItem('CurrentpatientId') || '';
    const cachedXray = readStoredGeneralCaseXray(patientId);
    setXrayPreview(cachedXray?.imageDataUrl || '');
  }, []);

  const formatAllergyTicker = (rawValue) => {
    const raw = (rawValue || '').trim();
    if (!raw) return 'Drug Allergies: None';
    if (/^loading/i.test(raw)) return raw;

    const withoutPrefix = raw.replace(/^[\s]*(Drug\s*Allerg(?:y|ies)|Known\s*Allergies|Diet\s*Allergies)\s*:\s*/i, '');
    if (/^(no known allergies|nil|none)$/i.test(withoutPrefix.trim())) {
      return 'Drug Allergies: None';
    }

    const allergies = withoutPrefix
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    return `Drug Allergies: ${allergies.length ? allergies.join(' | ') : 'None'}`;
  };

  const totalPages = 5;

  const showMessageBox = (title, message) => {
    setMessageBox({ show: true, title, message });
  };

  const hideMessageBox = () => {
    setMessageBox({ show: false, title: '', message: '' });
  };

  const previewSignature = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignaturePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (field, value, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const handleFileChange = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
    if (field === 'digitalSignature') {
      previewSignature(file);
    }
  };

  const showPage = (index) => {
    window.scrollTo(0, 0);
    setCurrentPage(index);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const patientId = localStorage.getItem('CurrentpatientId');
      const patientName = localStorage.getItem('CurrentpatientName');
      const doctorId = localStorage.getItem('doctorId');
      const doctorName = localStorage.getItem('doctorName') || user?.name;

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


      if (!formData.digitalSignature) {
        showMessageBox('Error', 'Upload digital signature');
        setIsSubmitting(false);
        return;
      }
      const formDataToSend = new FormData();

      // Append all case sheet fields
      Object.keys(formData).forEach(key => {
        if (key === 'digitalSignature' && formData[key]) {
          formDataToSend.append(key, formData[key]);
        } else if (Array.isArray(formData[key])) {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key] || '');
        }
      });

      // Add mandatory IDs/names
      formDataToSend.append('patientId', patientId);
      formDataToSend.append('patientName', patientName);
      formDataToSend.append('doctorId', doctorId);
      formDataToSend.append('doctorName', doctorName);

      const token = localStorage.getItem('token');

      const redoEditCaseId = String(
        location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || ''
      ).trim();
      const isRedoEdit = Boolean(redoEditCaseId);

      if (isRedoEdit) {
        const bodyToSend = {
          ...formData,
          patientId,
          patientName,
          doctorId,
          doctorName,
        };

        if (bodyToSend.digitalSignature instanceof File) {
          bodyToSend.digitalSignature = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(bodyToSend.digitalSignature);
          });
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
          }, 1000);
        } else {
          showMessageBox('Error', data.message || 'Failed to update case sheet');
        }

        return;
      }

      const response = await fetch(buildApiUrl('/api/pedodontics/save'), {
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
        setTimeout(() => {
          navigate('/prescriptions');
        }, 1000);
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

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  useEffect(() => {
    let isMounted = true;

    const toListString = (value) => {
      if (Array.isArray(value)) {
        return value.map((item) => `${item || ''}`.trim()).filter(Boolean).join(', ');
      }
      return `${value || ''}`.trim();
    };

    const extractPatient = (result) => {
      if (Array.isArray(result?.data)) return result.data[0] || null;
      if (result?.data) return result.data;
      if (Array.isArray(result?.patient)) return result.patient[0] || null;
      if (result?.patient) return result.patient;
      return null;
    };

    const fetchAllergies = async (attempt = 0) => {
      const patientId = localStorage.getItem('CurrentpatientId');

      if (!patientId) {
        if (attempt < 5) {
          setTimeout(() => fetchAllergies(attempt + 1), 400);
        } else if (isMounted) {
          setAllergyMessage('No known allergies');
        }
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/api/doctor-patient/${patientId}`);
        if (!res.ok) {
          if (isMounted) setAllergyMessage('No known allergies');
          return;
        }

        const result = await res.json();
        const p = extractPatient(result);
        if (!p) {
          if (isMounted) setAllergyMessage('No known allergies');
          return;
        }

        const known = toListString(p.medicalInfo?.knownAllergies);
        const drug = toListString(p.vitals?.drugAllergies);
        const diet = toListString(p.vitals?.dietAllergies);

        if (!isMounted) return;

        if (drug) {
          setAllergyMessage(`Drug Allergies: ${drug}`);
        } else if (known) {
          setAllergyMessage(`Known Allergies: ${known}`);
        } else if (diet) {
          setAllergyMessage(`Diet Allergies: ${diet}`);
        } else {
          setAllergyMessage('No known allergies');
        }
      } catch {
        if (isMounted) setAllergyMessage('No known allergies');
      }
    };

    fetchAllergies();

    // Load shared X-ray from General Case Sheet
    const patientId = getCurrentPatientId();
    const sharedXray = getSharedXrayImage(patientId);
    if (sharedXray?.dataUrl) {
      setXrayPreview(sharedXray.dataUrl);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const renderPage1 = () => (
    <div className={`page ${currentPage === 0 ? 'active' : ''}`}>
      <div className="xray-upload-section">
        <h3>X-ray Image</h3>
        {xrayPreview && (
          <img src={xrayPreview} alt="X-ray Preview" className="xray-preview" />
        )}
        {!xrayPreview && <p>No X-ray found in General Case Sheet for this patient.</p>}
      </div>
      <h2>Medical History:</h2>
      <div className="form-group-casesheet">
        <textarea
          value={formData.medicalHistory}
          onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
          rows="3"
        />
      </div>

      <h2>Dental History:</h2>
      <div className="form-group-casesheet">
        <textarea
          value={formData.dentalHistory}
          onChange={(e) => handleInputChange('dentalHistory', e.target.value)}
          rows="3"
        />
      </div>

      <h2>Medications taken:</h2>
      <div className="form-row-wide">
        <div className="form-group-casesheet">
          <label>Current:</label>
          <textarea
            value={formData.currentMedications}
            onChange={(e) => handleInputChange('currentMedications', e.target.value)}
            rows="2"
          />
        </div>
        <div className="form-group-casesheet">
          <label>Recent past:</label>
          <textarea
            value={formData.recentMedications}
            onChange={(e) => handleInputChange('recentMedications', e.target.value)}
            rows="2"
          />
        </div>
      </div>

      <h2>Allergies:</h2>
      <div className="form-group-casesheet">
        <textarea
          value={formData.allergies}
          onChange={(e) => handleInputChange('allergies', e.target.value)}
          rows="2"
        />
      </div>

      <h2>Feeding patterns:</h2>
      <div className="form-group-casesheet">
        <label>• History of breast feeding:</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="breastfeeding"
              value="yes"
              checked={formData.breastfeeding === 'yes'}
              onChange={(e) => handleInputChange('breastfeeding', e.target.value)}
            /> Yes
          </label>
          <label>
            <input
              type="radio"
              name="breastfeeding"
              value="no"
              checked={formData.breastfeeding === 'no'}
              onChange={(e) => handleInputChange('breastfeeding', e.target.value)}
            /> No
          </label>
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>• Usage of nursing bottle:</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="bottleUsage"
              value="yes"
              checked={formData.bottleUsage === 'yes'}
              onChange={(e) => handleInputChange('bottleUsage', e.target.value)}
            /> Yes
          </label>
          <label>
            <input
              type="radio"
              name="bottleUsage"
              value="no"
              checked={formData.bottleUsage === 'no'}
              onChange={(e) => handleInputChange('bottleUsage', e.target.value)}
            /> No
          </label>
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>• Period of usage:</label>
        <input
          type="text"
          value={formData.bottlePeriod}
          onChange={(e) => handleInputChange('bottlePeriod', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>• Contents of bottle:</label>
        <input
          type="text"
          value={formData.bottleContents}
          onChange={(e) => handleInputChange('bottleContents', e.target.value)}
        />
      </div>

      <h2>Brushing habits:</h2>
      <div className="form-group-casesheet">
        <textarea
          value={formData.brushingHabits}
          onChange={(e) => handleInputChange('brushingHabits', e.target.value)}
          rows="3"
        />
      </div>
    </div>
  );

  const renderPage2 = () => (
    <div className={`page ${currentPage === 1 ? 'active' : ''}`}>
      <h2>Behavioral assessment:</h2>
      <div className="form-row-wide">
        <div className="form-group-casesheet">
          <label>Wright:</label>
          <input
            type="text"
            value={formData.wright}
            onChange={(e) => handleInputChange('wright', e.target.value)}
          />
        </div>
        <div className="form-group-casesheet">
          <label>Lampshire:</label>
          <input
            type="text"
            value={formData.lampshire}
            onChange={(e) => handleInputChange('lampshire', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>Body type:</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              value="ectomorph"
              checked={formData.bodyType.includes('ectomorph')}
              onChange={(e) => handleCheckboxChange('bodyType', 'ectomorph', e.target.checked)}
            /> Ectomorph
          </label>
          <label>
            <input
              type="checkbox"
              value="mesomorph"
              checked={formData.bodyType.includes('mesomorph')}
              onChange={(e) => handleCheckboxChange('bodyType', 'mesomorph', e.target.checked)}
            /> Mesomorph
          </label>
          <label>
            <input
              type="checkbox"
              value="endomorph"
              checked={formData.bodyType.includes('endomorph')}
              onChange={(e) => handleCheckboxChange('bodyType', 'endomorph', e.target.checked)}
            /> Endomorph
          </label>
        </div>
      </div>

      <h2>Diet history:</h2>
      <div className="form-group-casesheet">
        <label>Diet chart recording 24hrs/days diet diary/one week</label>
        <table className="diet-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Food consumed</th>
              <th>Type of sugar exposure</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(num => (
              <tr key={num}>
                <td>
                  <input
                    type="text"
                    value={formData[`dietTime${num}`]}
                    onChange={(e) => handleInputChange(`dietTime${num}`, e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={formData[`dietFood${num}`]}
                    onChange={(e) => handleInputChange(`dietFood${num}`, e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={formData[`dietSugar${num}`]}
                    onChange={(e) => handleInputChange(`dietSugar${num}`, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="form-group-casesheet">
        <label>Inference:</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              value="cariogenic"
              checked={formData.dietInference.includes('cariogenic')}
              onChange={(e) => handleCheckboxChange('dietInference', 'cariogenic', e.target.checked)}
            /> cariogenic
          </label>
          <label>
            <input
              type="checkbox"
              value="non-cariogenic"
              checked={formData.dietInference.includes('non-cariogenic')}
              onChange={(e) => handleCheckboxChange('dietInference', 'non-cariogenic', e.target.checked)}
            /> non-cariogenic
          </label>
          <label>
            <input
              type="checkbox"
              value="balanced"
              checked={formData.dietInference.includes('balanced')}
              onChange={(e) => handleCheckboxChange('dietInference', 'balanced', e.target.checked)}
            /> balanced
          </label>
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>Deleterious oral habits:</label>
        <textarea
          value={formData.oralHabits}
          onChange={(e) => handleInputChange('oralHabits', e.target.value)}
          rows="3"
        />
      </div>
    </div>
  );

  const renderPage3 = () => (
    <div className={`page ${currentPage === 2 ? 'active' : ''}`}>
      <h2>Extra oral examination:</h2>

      <div className="form-group-casesheet">
        <label>Profile:</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              value="straight"
              checked={formData.profile.includes('straight')}
              onChange={(e) => handleCheckboxChange('profile', 'straight', e.target.checked)}
            /> Straight
          </label>
          <label>
            <input
              type="checkbox"
              value="convex"
              checked={formData.profile.includes('convex')}
              onChange={(e) => handleCheckboxChange('profile', 'convex', e.target.checked)}
            /> Convex
          </label>
          <label>
            <input
              type="checkbox"
              value="concave"
              checked={formData.profile.includes('concave')}
              onChange={(e) => handleCheckboxChange('profile', 'concave', e.target.checked)}
            /> Concave
          </label>
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>Face:</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              value="bilaterally-symmetrical"
              checked={formData.face.includes('bilaterally-symmetrical')}
              onChange={(e) => handleCheckboxChange('face', 'bilaterally-symmetrical', e.target.checked)}
            /> bilaterally symmetrical
          </label>
          <label>
            <input
              type="checkbox"
              value="asymmetrical"
              checked={formData.face.includes('asymmetrical')}
              onChange={(e) => handleCheckboxChange('face', 'asymmetrical', e.target.checked)}
            /> asymmetrical
          </label>
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>Lips:</label>
        <input
          type="text"
          value={formData.lips}
          onChange={(e) => handleInputChange('lips', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>Swallowing:</label>
        <input
          type="text"
          value={formData.swallowing}
          onChange={(e) => handleInputChange('swallowing', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>TMJ:</label>
        <input
          type="text"
          value={formData.tmj}
          onChange={(e) => handleInputChange('tmj', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>Lymph nodes:</label>
        <input
          type="text"
          value={formData.lymphNodes}
          onChange={(e) => handleInputChange('lymphNodes', e.target.value)}
        />
      </div>

      <h2>Intra oral examination</h2>
      <h3>Soft tissue examination</h3>

      <div className="form-group-casesheet">
        <label>• Labial mucosa:</label>
        <input
          type="text"
          value={formData.labialMucosa}
          onChange={(e) => handleInputChange('labialMucosa', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>• Buccal mucosa:</label>
        <input
          type="text"
          value={formData.buccalMucosa}
          onChange={(e) => handleInputChange('buccalMucosa', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>• Vestibule:</label>
        <input
          type="text"
          value={formData.vestibule}
          onChange={(e) => handleInputChange('vestibule', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>• Floor of mouth:</label>
        <input
          type="text"
          value={formData.floorOfMouth}
          onChange={(e) => handleInputChange('floorOfMouth', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>• Gingiva:</label>
        <input
          type="text"
          value={formData.gingiva}
          onChange={(e) => handleInputChange('gingiva', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>• Tongue:</label>
        <input
          type="text"
          value={formData.tongue}
          onChange={(e) => handleInputChange('tongue', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>• Hard and soft palate:</label>
        <input
          type="text"
          value={formData.palate}
          onChange={(e) => handleInputChange('palate', e.target.value)}
        />
      </div>

      <div className="form-group-casesheet">
        <label>• Pharynx/Tonsils:</label>
        <input
          type="text"
          value={formData.pharynxTonsils}
          onChange={(e) => handleInputChange('pharynxTonsils', e.target.value)}
        />
      </div>
    </div>
  );

  const renderPage4 = () => (
    <div className={`page ${currentPage === 3 ? 'active' : ''}`}>
      <h2>Hard Tissue Examination</h2>

      <div className="form-row-wide">
        <div className="form-group-casesheet">
          <label>No. of Teeth Present:</label>
          <input
            type="text"
            value={formData.numberOfTeeth}
            onChange={(e) => handleInputChange('numberOfTeeth', e.target.value)}
          />
        </div>
        <div className="form-group-casesheet">
          <label>Dental age:</label>
          <input
            type="text"
            value={formData.dentalAge}
            onChange={(e) => handleInputChange('dentalAge', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>FDI (Tooth numbering):</label>
        <textarea
          value={formData.fdiNumbering}
          onChange={(e) => handleInputChange('fdiNumbering', e.target.value)}
          rows="3"
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group-casesheet">
          <label>Decayed -</label>
          <input
            type="text"
            value={formData.decayed}
            onChange={(e) => handleInputChange('decayed', e.target.value)}
          />
        </div>
        <div className="form-group-casesheet">
          <label>Mobility -</label>
          <input
            type="text"
            value={formData.mobility}
            onChange={(e) => handleInputChange('mobility', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group-casesheet">
          <label>Missing -</label>
          <input
            type="text"
            value={formData.missing}
            onChange={(e) => handleInputChange('missing', e.target.value)}
          />
        </div>
        <div className="form-group-casesheet">
          <label>Filled -</label>
          <input
            type="text"
            value={formData.filled}
            onChange={(e) => handleInputChange('filled', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>Other findings:</label>
        <textarea
          value={formData.otherFindings}
          onChange={(e) => handleInputChange('otherFindings', e.target.value)}
          rows="2"
        />
      </div>

      <h2>Occlusal analysis</h2>

      <div className="form-group-casesheet">
        <label>Spacing:</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              value="physiological"
              checked={formData.spacing.includes('physiological')}
              onChange={(e) => handleCheckboxChange('spacing', 'physiological', e.target.checked)}
            /> physiological
          </label>
          <label>
            <input
              type="checkbox"
              value="primate"
              checked={formData.spacing.includes('primate')}
              onChange={(e) => handleCheckboxChange('spacing', 'primate', e.target.checked)}
            /> primate
          </label>
          <label>
            <input
              type="checkbox"
              value="interdental"
              checked={formData.spacing.includes('interdental')}
              onChange={(e) => handleCheckboxChange('spacing', 'interdental', e.target.checked)}
            /> interdental
          </label>
          <label>
            <input
              type="checkbox"
              value="diastema"
              checked={formData.spacing.includes('diastema')}
              onChange={(e) => handleCheckboxChange('spacing', 'diastema', e.target.checked)}
            /> diastema
          </label>
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group-casesheet">
          <label>Overjet:</label>
          <input
            type="text"
            value={formData.overjet}
            onChange={(e) => handleInputChange('overjet', e.target.value)}
          />
        </div>
        <div className="form-group-casesheet">
          <label>Overbite:</label>
          <input
            type="text"
            value={formData.overbite}
            onChange={(e) => handleInputChange('overbite', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group-casesheet">
          <label>Cross bite/ Open bite:</label>
          <input
            type="text"
            value={formData.crossbite}
            onChange={(e) => handleInputChange('crossbite', e.target.value)}
          />
        </div>
        <div className="form-group-casesheet">
          <label>Midline:</label>
          <input
            type="text"
            value={formData.midline}
            onChange={(e) => handleInputChange('midline', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group-casesheet">
          <label>Molar relationships:</label>
          <input
            type="text"
            value={formData.molarRelationships}
            onChange={(e) => handleInputChange('molarRelationships', e.target.value)}
          />
        </div>
        <div className="form-group-casesheet">
          <label>Canine relationship:</label>
          <input
            type="text"
            value={formData.canineRelationship}
            onChange={(e) => handleInputChange('canineRelationship', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>Primary:</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              value="flush-terminal"
              checked={formData.primary.includes('flush-terminal')}
              onChange={(e) => handleCheckboxChange('primary', 'flush-terminal', e.target.checked)}
            /> Flush terminal plane
          </label>
          <label>
            <input
              type="checkbox"
              value="mesial-step"
              checked={formData.primary.includes('mesial-step')}
              onChange={(e) => handleCheckboxChange('primary', 'mesial-step', e.target.checked)}
            /> Mesial step
          </label>
          <label>
            <input
              type="checkbox"
              value="distal-step"
              checked={formData.primary.includes('distal-step')}
              onChange={(e) => handleCheckboxChange('primary', 'distal-step', e.target.checked)}
            /> Distal step
          </label>
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>Permanent:</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              value="class-1"
              checked={formData.permanent.includes('class-1')}
              onChange={(e) => handleCheckboxChange('permanent', 'class-1', e.target.checked)}
            /> Class-I
          </label>
          <label>
            <input
              type="checkbox"
              value="class-2"
              checked={formData.permanent.includes('class-2')}
              onChange={(e) => handleCheckboxChange('permanent', 'class-2', e.target.checked)}
            /> Class-II
          </label>
          <label>
            <input
              type="checkbox"
              value="class-3"
              checked={formData.permanent.includes('class-3')}
              onChange={(e) => handleCheckboxChange('permanent', 'class-3', e.target.checked)}
            /> Class-III
          </label>
        </div>
      </div>

      <div className="form-group-casesheet">
        <label>Crowding/ rotation/displacement:</label>
        <input
          type="text"
          value={formData.crowdingRotation}
          onChange={(e) => handleInputChange('crowdingRotation', e.target.value)}
        />
      </div>
    </div>
  );

  const renderPage5 = () => (
    <div className={`page ${currentPage === 4 ? 'active' : ''}`}>
      <h2>Differential diagnosis:</h2>
      <div className="form-group-casesheet">
        <textarea
          id="differentialDiagnosis"
          rows="3"
          value={formData.differentialDiagnosis}
          onChange={(e) => handleInputChange('differentialDiagnosis', e.target.value)}
        ></textarea>
      </div>

      <h2>Investigation:</h2>
      <div className="form-group-casesheet">
        <textarea
          id="investigation"
          rows="3"
          value={formData.investigation}
          onChange={(e) => handleInputChange('investigation', e.target.value)}
        ></textarea>
      </div>

      <h2>Final diagnosis:</h2>
      <div className="form-group-casesheet">
        <textarea
          id="finalDiagnosis"
          rows="3"
          value={formData.finalDiagnosis}
          onChange={(e) => handleInputChange('finalDiagnosis', e.target.value)}
        ></textarea>
      </div>

      <h2>Treatment plan</h2>

      <div className="form-group-casesheet">
        <label>1. Systemic phase:</label>
        <textarea
          id="systemicPhase"
          rows="2"
          value={formData.systemicPhase}
          onChange={(e) => handleInputChange('systemicPhase', e.target.value)}
        ></textarea>
      </div>

      <div className="form-group-casesheet">
        <label>2. Preventive phase:</label>
        <textarea
          id="preventivePhase"
          rows="2"
          value={formData.preventivePhase}
          onChange={(e) => handleInputChange('preventivePhase', e.target.value)}
        ></textarea>
      </div>

      <div className="form-group-casesheet">
        <label>3. Preparatory phase:</label>
        <textarea
          id="preparatoryPhase"
          rows="2"
          value={formData.preparatoryPhase}
          onChange={(e) => handleInputChange('preparatoryPhase', e.target.value)}
        ></textarea>
      </div>

      <div className="form-group-casesheet">
        <label>4. Corrective phase:</label>
        <textarea
          id="correctivePhase"
          rows="2"
          value={formData.correctivePhase}
          onChange={(e) => handleInputChange('correctivePhase', e.target.value)}
        ></textarea>
      </div>

      <div className="form-group-casesheet">
        <label>5. Maintenance phase:</label>
        <textarea
          id="maintenancePhase"
          rows="2"
          value={formData.maintenancePhase}
          onChange={(e) => handleInputChange('maintenancePhase', e.target.value)}
        ></textarea>
      </div>

      <div className="doctor-auth-section" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <h2>Doctor's Authentication</h2>
        <div className="form-group-casesheet">
          <label htmlFor="doctorName">Doctor's Name *</label>
          <input
            type="text"
            placeholder="Enter full name"
            value={user ? user.name : localStorage.getItem('doctorName') || ''}
            disabled
            style={{ background: '#f0f0f0' }}
          />
        </div>
        <div className="form-group-casesheet">
          <label htmlFor="digitalSignature">Upload Digital Signature *</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange('digitalSignature', e.target.files[0])}
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
    <div className="digital-doctor-case-sheet">
      {showAllergy && (
        <div className="allergy-alert show" id="patientAllergyAlert">
          <span className="alert-icon">⚠️</span>
          <div className="allergy-flow-window">
            <span id="allergyMessage">{formatAllergyTicker(allergyMessage || 'Loading allergies...')}</span>
          </div>
        </div>
      )}

      {generalXrayPreview && (
        <div className="general-xray-reflection">
          <h4>General Case X-ray (Auto-loaded)</h4>
          <img src={generalXrayPreview} alt="General Case X-ray" />
        </div>
      )}

      <div className="case-sheet">
        <div className="header" style={{ position: 'relative', textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
          {localStorage.getItem('CurrentpatientName') && (
            <div style={{ position: 'absolute', left: '20px', top: '6px', padding: '8px 15px', backgroundColor: 'rgba(38, 40, 107, 0.95)', borderRadius: '4px', fontSize: '0.8em', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textAlign: 'left', whiteSpace: 'nowrap' }}>
              <div><strong>{localStorage.getItem('CurrentpatientName')}</strong></div>
              {localStorage.getItem('CurrentpatientId') && <div><strong>ID:</strong> {localStorage.getItem('CurrentpatientId')}</div>}
            </div>
          )}
          <center><img src="logo.png" alt="SRM Dental College Logo" /></center>

          <h1>SRM DENTAL COLLEGE</h1>
          <h2>DEPARTMENT OF PEDODONTICS</h2>
          <h3>CLINICAL ASSESSMENT & EVALUATION FORM</h3>
        </div>

        <form>
          {renderPage1()}
          {renderPage2()}
          {renderPage3()}
          {renderPage4()}
          {renderPage5()}

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
        </form>
      </div>

      {/* Message box for alerts */}
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
};

export default Pedodontics;
