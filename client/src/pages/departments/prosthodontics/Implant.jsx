import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import "./Implant.css"; // Assuming the CSS is defined here
import { readStoredGeneralCaseXray } from '../../../utils/generalCaseXray';
import { API_BASE_URL } from '../../../config/api';
const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';
import { getCurrentPatientId, getSharedXrayImage } from '../../../utils/sharedXray';
import { clearCaseDraft, loadCaseDraft, saveCaseDraft } from '../../../utils/caseDraft';

export default function CaseSheet() {
  const DRAFT_ROUTE_KEY = '/Implant';
  const [currentPage, setCurrentPage] = useState(0);
  // State to store form data for all pages
  const [formData, setFormData] = useState({});
  const [signaturePreview, setSignaturePreview] = useState('');
  const [allergyMessage, setAllergyMessage] = useState('None');
  const [showAllergy, setShowAllergy] = useState(true);
  const [xrayImage, setXrayImage] = useState(null);
  const [xrayPreview, setXrayPreview] = useState('');
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPatientId = getCurrentPatientId();

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

  const pages = [
    "page-0",
    "page-1",
    "page-2",
    "page-3",
    "page-4",
    "page-5", // Corrected page sequence (was 5 then another 5)
    "page-6",
    "page-7",
    "page-8",
    "page-9",
  ];

  const totalPages = pages.length;

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

        if (draft.data.formData && typeof draft.data.formData === 'object') {
          setFormData((prev) => ({ ...prev, ...draft.data.formData }));
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
  }, [currentPatientId]);

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
        console.log('[Implant] Before unload - saving draft immediately');
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

  // Handler for all input types (text, number, textarea, radio, select)
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Preview and store digital signature file
  const previewSignature = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignaturePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSignaturePreview('');
    }
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

  const handleFileChange = (file) => {
    if (!file) return;
    setFormData(prev => ({
      ...prev,
      digitalSignature: file
    }));
    previewSignature(file);
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((p) => p + 1);
      window.scrollTo(0, 0);
    } else {
      // Logic for final submission
      handleSubmit();
    }
  };

  const prevPage = () => {
    setCurrentPage((p) => Math.max(p - 1, 0));
    window.scrollTo(0, 0);
  };

  const handleSubmit = () => {
    (async () => {
      try {
        if (!formData.digitalSignature) {
          alert('Please upload digital signature before submitting!');
          return;
        }

        const token = localStorage.getItem('token');

        const redoEditCaseId = String(
          location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || ''
        ).trim();
        const isRedoEdit = Boolean(redoEditCaseId);
        
        // Get patient and doctor info from localStorage
        const patientId = localStorage.getItem('CurrentpatientId');
        const patientName = localStorage.getItem('CurrentpatientName');
        const doctorId = localStorage.getItem('doctorId');
        const doctorName = localStorage.getItem('doctorName');
        
        // Validate required fields
        if (!patientId || !patientName || !doctorId || !doctorName) {
          alert('Missing patient or doctor information. Please select a patient first.');
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

          const res = await fetch(buildApiUrl(`/api/casesheets/${encodeURIComponent(redoEditCaseId)}`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bodyToSend),
          });

          const result = await res.json();
          if (res.ok) {
            await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
            localStorage.removeItem('redoEditCaseId');
            localStorage.removeItem('redoEditDepartmentKey');
            alert('Case sheet updated and resubmitted successfully');
            navigate('/pg-dashboard');
            return;
          }

          alert(result?.message || result?.error || `Failed to update case sheet (${res.status})`);
          return;
        }

        // Use FormData to handle file upload
        const formDataToSend = new FormData();

        // Define submit function before it is used by both branches.
        const submitForm = async (dataToSend) => {
          try {
            console.debug('POSTing /api/implant/save with FormData');
            const res = await fetch(buildApiUrl('/api/implant/save'), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: dataToSend
            });

            const raw = await res.text();
            let data = {};
            try {
              data = raw ? JSON.parse(raw) : {};
            } catch {
              data = { message: raw };
            }

            if (res.ok) {
              const newId = data?.data?._id || data?.data?._doc?._id || data?.caseId;
              if (newId) localStorage.setItem('caseId', newId);
              await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
              console.log('Implant case submitted:', data);
              alert('Case sheet submitted successfully');
              navigate('/prescriptions');
            } else {
              console.error('Submit failed:', data);
              alert(data?.message || data?.error || `Failed to submit case sheet (${res.status})`);
            }
          } catch (submitError) {
            console.error('Implant submission request error:', submitError);
            alert(submitError?.message || 'Error submitting case sheet');
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
                // If it's a File object, append it directly
                if (formData[key] instanceof File) {
                  formDataToSend.append(key, formData[key]);
                }
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
              if (formData[key] instanceof File) {
                formDataToSend.append(key, formData[key]);
              }
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
              // If it's a File object, append it directly
              if (formData[key] instanceof File) {
                formDataToSend.append(key, formData[key]);
              }
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
      } catch (err) {
        console.error('Submission error:', err);
        alert(err?.message || 'Error submitting case sheet');
      }
    })();
  };

  const getFieldValue = (name) => formData[name] || '';

  useEffect(() => {
    let isMounted = true;

    const toListString = (value) => {
      if (!value) return '';
      if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join(', ');
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
      const patientId = localStorage.getItem('CurrentpatientId');

      // Retry briefly if patient selection is still propagating.
      if (!patientId) {
        if (attempt < 5 && isMounted) {
          setTimeout(() => fetchAllergies(attempt + 1), 400);
        } else if (isMounted) {
          setAllergyMessage('None');
        }
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/api/doctor-patient/${patientId}`);
        const result = res.ok ? await res.json() : null;
        const p = extractPatient(result);

        if (!p) {
          if (attempt < 2 && isMounted) {
            setTimeout(() => fetchAllergies(attempt + 1), 500);
          } else if (isMounted) {
            setAllergyMessage('None');
          }
          return;
        }

        const drug = toListString(p.vitals?.drugAllergies);
        const known = toListString(p.medicalInfo?.knownAllergies);
        const diet = toListString(p.vitals?.dietAllergies);

        if (isMounted) {
          setAllergyMessage(drug || known || diet || 'None');
        }
      } catch {
        if (isMounted) {
          setAllergyMessage('None');
        }
      }
    };

    fetchAllergies();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const patientId = getCurrentPatientId();
    const sharedXray = getSharedXrayImage(patientId);

    if (!sharedXray?.dataUrl) return;

    setXrayImage((prev) => prev || sharedXray.dataUrl);
    setXrayPreview((prev) => prev || sharedXray.dataUrl);
  }, []);

  return (
    <div className="digital-doctor-case-sheet" id="implantCaseSheet">
      {showAllergy && (
        <div className="allergy-alert show" id="patientAllergyAlert">
          <span className="alert-icon">⚠️</span>
          <div className="allergy-flow-window">
            <span id="allergyMessage">Drug Allergies: {allergyMessage || 'None'}</span>
          </div>
        </div>
      )}
      <div className="case-sheet">
      <div className="logo-header" style={{ position: 'relative', textAlign: "center", marginBottom: 20, paddingLeft: '20px', paddingRight: '20px' }}>
        {localStorage.getItem('CurrentpatientName') && (
          <div style={{ position: 'absolute', left: '20px', top: '6px', padding: '8px 15px', backgroundColor: 'rgba(38, 40, 107, 0.95)', borderRadius: '4px', fontSize: '0.8em', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textAlign: 'left', whiteSpace: 'nowrap' }}>
            <div><strong>{localStorage.getItem('CurrentpatientName')}</strong></div>
            {localStorage.getItem('CurrentpatientId') && <div><strong>ID:</strong> {localStorage.getItem('CurrentpatientId')}</div>}
          </div>
        )}
        <img
          src="/images/logo.png"
          alt="SRM Dental College Logo"
          style={{ maxWidth: 120, height: "auto", marginBottom: 10 }}
        />
        <h2 style={{ margin: 0 }}>SRM Dental College</h2>
      </div>

      {/* Attach handleSubmit to the form */}
      <form className="case-form" onSubmit={(e) => {
        e.preventDefault();
        if (currentPage === totalPages - 1) {
          handleSubmit();
        } else {
          nextPage();
        }
      }}>
        {/* PAGE 0: Extraoral Examination */}
        <div className={`page ${currentPage === 0 ? "active" : ""}`}>
          {/* X-ray Image Upload Section */}
          <div className="xray-upload-section">
            <h3>X-ray Image:</h3>
            <div className="form-group">
              {xrayPreview && (
                <div className="xray-preview-container">
                
                  <img src={xrayPreview} alt="X-ray Preview" className="xray-preview" />
                </div>
              )}
              {!xrayPreview && <p>No X-ray found in General Case Sheet for this patient.</p>}
            </div>
          </div>

          <h2>1. Clinical examination:</h2>
          <h3>A. Extra oral examination:</h3>

          <div className="form-group">
            <label htmlFor="facial_symmetry">a) Facial symmetry:</label>
            <input type="text" id="facial_symmetry" name="facial_symmetry" onChange={handleInputChange} value={getFieldValue('facial_symmetry')} />
          </div>

          <div className="form-group">
            <label>b) Facial profile: (Angle's classification)</label>
          </div>

          <div className="form-group radio-group">
            <label>
              <input type="radio" name="facial_profile" value="Normal" id="facial_profile_normal" onChange={handleInputChange} checked={getFieldValue('facial_profile') === 'Normal'} />{" "}
              Normal
            </label>
            <label>
              <input type="radio" name="facial_profile" value="Retrognathic" id="facial_profile_retrognathic" onChange={handleInputChange} checked={getFieldValue('facial_profile') === 'Retrognathic'} />{" "}
              Retrognathic
            </label>
            <label>
              <input type="radio" name="facial_profile" value="Prognathic" id="facial_profile_prognathic" onChange={handleInputChange} checked={getFieldValue('facial_profile') === 'Prognathic'} />{" "}
              Prognathic
            </label>
          </div>
          {/*  */}

          <div className="form-group">
            <label>c) Facial form: (House and Loop, Frush and Fischer, Leon Williams)</label>
          </div>

          <div className="form-group radio-group">
            <label>
              <input type="radio" name="facial_form" value="Square" id="facial_form_square" onChange={handleInputChange} checked={getFieldValue('facial_form') === 'Square'} /> Square
            </label>
            <label>
              <input type="radio" name="facial_form" value="Square-tapering" id="facial_form_square_tapering" onChange={handleInputChange} checked={getFieldValue('facial_form') === 'Square-tapering'} />{" "}
              Square-tapering
            </label>
            <label>
              <input type="radio" name="facial_form" value="Tapering" id="facial_form_tapering" onChange={handleInputChange} checked={getFieldValue('facial_form') === 'Tapering'} /> Tapering
            </label>
            <label>
              <input type="radio" name="facial_form" value="Ovoid" id="facial_form_ovoid" onChange={handleInputChange} checked={getFieldValue('facial_form') === 'Ovoid'} /> Ovoid
            </label>
          </div>

          <h3>d) TMJ examination:</h3>

          <h4>1. Inspection:</h4>

          <div className="form-group">
            <label htmlFor="max_mouth_opening">a) Maximum mouth opening:</label>
            <input
              type="text"
              id="max_mouth_opening"
              name="max_mouth_opening"
              placeholder="mm"
              onChange={handleInputChange}
              value={getFieldValue('max_mouth_opening')}
            />
          </div>

          <div className="form-group">
            <label>b) Deviation of mandible:</label>
            <div className="radio-group">
              <label>
                <input type="radio" name="deviation_mandible" value="Yes" id="deviation_mandible_yes" onChange={handleInputChange} checked={getFieldValue('deviation_mandible') === 'Yes'} /> Yes
              </label>
              <label>
                <input type="radio" name="deviation_mandible" value="No" id="deviation_mandible_no" onChange={handleInputChange} checked={getFieldValue('deviation_mandible') === 'No'} /> No
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Opening:</label>
            <div className="radio-group">
              <label>
                <input type="radio" name="deviation_opening" value="left" id="deviation_opening_left" onChange={handleInputChange} checked={getFieldValue('deviation_opening') === 'left'} /> Deviation to left
              </label>
              <label>
                <input type="radio" name="deviation_opening" value="right" id="deviation_opening_right" onChange={handleInputChange} checked={getFieldValue('deviation_opening') === 'right'} /> Deviation to right
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Closing:</label>
            <div className="radio-group">
              <label>
                <input type="radio" name="deviation_closing" value="left" id="deviation_closing_left" onChange={handleInputChange} checked={getFieldValue('deviation_closing') === 'left'} /> Deviation to left
              </label>
              <label>
                <input type="radio" name="deviation_closing" value="right" id="deviation_closing_right" onChange={handleInputChange} checked={getFieldValue('deviation_closing') === 'right'} /> Deviation to right
              </label>
            </div>
          </div>

          <h4>2. Palpation:</h4>

          <div className="form-group">
            <label htmlFor="pain_tenderness">a) Pain/tenderness:</label>
            <input type="text" id="pain_tenderness" name="pain_tenderness" onChange={handleInputChange} value={getFieldValue('pain_tenderness')} />
          </div>

          <div className="form-group">
            <label htmlFor="clicking">b) Clicking:</label>
            <input type="text" id="clicking" name="clicking" onChange={handleInputChange} value={getFieldValue('clicking')} />
          </div>

          <h4>3. Auscultation:</h4>

          <div className="form-group">
            <label htmlFor="crepitus">a) Crepitus:</label>
            <input type="text" id="crepitus" name="crepitus" onChange={handleInputChange} value={getFieldValue('crepitus')} />
          </div>

          <div className="form-group">
            <label htmlFor="lymph_nodes">a) Lymph nodes:</label>
            <input type="text" id="lymph_nodes" name="lymph_nodes" onChange={handleInputChange} value={getFieldValue('lymph_nodes')} />
          </div>
        </div>

        {/* PAGE 1: Intra Oral Examination & Periodontal Status */}
        <div className={`page ${currentPage === 1 ? "active" : ""}`}>
          <h3>B. Intra oral examination:</h3>

          <div className="form-group">
            <label htmlFor="soft_tissue">a) Soft tissue examination:</label>
            <textarea id="soft_tissue" name="soft_tissue" onChange={handleInputChange} value={getFieldValue('soft_tissue')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="hard_tissue">b) Hard tissue examination:</label>
            <textarea id="hard_tissue" name="hard_tissue" onChange={handleInputChange} value={getFieldValue('hard_tissue')}></textarea>
          </div>

          <h3>c) Periodontal status:</h3>

          <div className="form-group">
            <label htmlFor="gingival_condition">1. Gingival condition:</label>
            <textarea id="gingival_condition" name="gingival_condition" onChange={handleInputChange} value={getFieldValue('gingival_condition')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="periodontal_pockets">2. Periodontal pockets:</label>
            <textarea id="periodontal_pockets" name="periodontal_pockets" onChange={handleInputChange} value={getFieldValue('periodontal_pockets')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="mobility">3. Mobility:</label>
            <textarea id="mobility" name="mobility" onChange={handleInputChange} value={getFieldValue('mobility')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="furcation_involvement">4. Furcation involvement:</label>
            <textarea id="furcation_involvement" name="furcation_involvement" onChange={handleInputChange} value={getFieldValue('furcation_involvement')}></textarea>
          </div>

          <h3>D. Gingival Index (Löe and Silness):</h3>
          {/*  */}

          <table>
            <thead>
              <tr>
                <th>Tooth No.</th>
                <th>Area Examined</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {/* Simplified table structure for data binding */}
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td>
                    <input type="text" name={`gi_tooth_${i}`} onChange={handleInputChange} value={getFieldValue(`gi_tooth_${i}`)} size="4" />
                  </td>
                  <td>
                    <select name={`gi_area_${i}`} onChange={handleInputChange} value={getFieldValue(`gi_area_${i}`)}>
                      <option value="">Select</option>
                      <option value="M">Mesial</option>
                      <option value="B">Buccal</option>
                      <option value="D">Distal</option>
                      <option value="L">Lingual</option>
                    </select>
                  </td>
                  <td>
                    <select name={`gi_score_${i}`} onChange={handleInputChange} value={getFieldValue(`gi_score_${i}`)}>
                      <option value="">Select</option>
                      <option value="0">0 - Normal</option>
                      <option value="1">1 - Mild inflammation</option>
                      <option value="2">2 - Moderate inflammation</option>
                      <option value="3">3 - Severe inflammation</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>E. Dentition Status:</h3>

          <div className="form-group">
            <label htmlFor="missing_teeth">1. Missing teeth:</label>
            <textarea id="missing_teeth" name="missing_teeth" onChange={handleInputChange} value={getFieldValue('missing_teeth')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="carious_teeth">2. Carious teeth:</label>
            <textarea id="carious_teeth" name="carious_teeth" onChange={handleInputChange} value={getFieldValue('carious_teeth')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="filled_teeth">3. Filled teeth:</label>
            <textarea id="filled_teeth" name="filled_teeth" onChange={handleInputChange} value={getFieldValue('filled_teeth')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="fractured_teeth">4. Fractured teeth:</label>
            <textarea id="fractured_teeth" name="fractured_teeth" onChange={handleInputChange} value={getFieldValue('fractured_teeth')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="abrasion">5. Abrasion:</label>
            <textarea id="abrasion" name="abrasion" onChange={handleInputChange} value={getFieldValue('abrasion')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="attrition">6. Attrition:</label>
            <textarea id="attrition" name="attrition" onChange={handleInputChange} value={getFieldValue('attrition')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="erosion">7. Erosion:</label>
            <textarea id="erosion" name="erosion" onChange={handleInputChange} value={getFieldValue('erosion')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="hypersensitivity">8. Hypersensitivity:</label>
            <textarea id="hypersensitivity" name="hypersensitivity" onChange={handleInputChange} value={getFieldValue('hypersensitivity')}></textarea>
          </div>

        </div>

        {/* PAGE 2: Occlusion */}
        <div className={`page ${currentPage === 2 ? "active" : ""}`}>
          <h2>F. Occlusion:</h2>

          <div className="form-group">
            <label htmlFor="molar_relation">1. Molar relation (Angle’s classification):</label>
            <select id="molar_relation" name="molar_relation" onChange={handleInputChange} value={getFieldValue('molar_relation')}>
              <option value="">Select Classification</option>
              <option value="Class I">Class I</option>
              <option value="Class II Div 1">Class II Div 1</option>
              <option value="Class II Div 2">Class II Div 2</option>
              <option value="Class III">Class III</option>
            </select>
          </div>
          {/*  */}

          <div className="form-group">
            <label htmlFor="canine_relation">2. Canine relation:</label>
            <select id="canine_relation" name="canine_relation" onChange={handleInputChange} value={getFieldValue('canine_relation')}>
              <option value="">Select Classification</option>
              <option value="Class I">Class I</option>
              <option value="Class II">Class II</option>
              <option value="Class III">Class III</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="overjet">3. Overjet (mm):</label>
            <input type="number" id="overjet" name="overjet" onChange={handleInputChange} value={getFieldValue('overjet')} />
          </div>

          <div className="form-group">
            <label htmlFor="overbite">4. Overbite (mm):</label>
            <input type="number" id="overbite" name="overbite" onChange={handleInputChange} value={getFieldValue('overbite')} />
          </div>

          <div className="form-group">
            <label htmlFor="midline_shift">5. Midline shift:</label>
            <input type="text" id="midline_shift" name="midline_shift" onChange={handleInputChange} value={getFieldValue('midline_shift')} />
          </div>

          <div className="form-group">
            <label htmlFor="open_bite">6. Open bite:</label>
            <input type="text" id="open_bite" name="open_bite" onChange={handleInputChange} value={getFieldValue('open_bite')} />
          </div>

          <div className="form-group">
            <label htmlFor="crossbite">7. Crossbite:</label>
            <input type="text" id="crossbite" name="crossbite" onChange={handleInputChange} value={getFieldValue('crossbite')} />
          </div>

        </div>

        {/* PAGE 3: Diagnostic Cast Evaluation */}
        <div className={`page ${currentPage === 3 ? "active" : ""}`}>
          <h2>G. Diagnostic Cast Evaluation:</h2>

          <div className="form-group">
            <label htmlFor="arch_form">1. Arch form:</label>
            <select id="arch_form" name="arch_form" onChange={handleInputChange} value={getFieldValue('arch_form')}>
              <option value="">Select Arch Form</option>
              <option value="Square">Square</option>
              <option value="Tapering">Tapering</option>
              <option value="Ovoid">Ovoid</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="curve_of_spee">2. Curve of Spee:</label>
            <input type="text" id="curve_of_spee" name="curve_of_spee" onChange={handleInputChange} value={getFieldValue('curve_of_spee')} />
          </div>

          <div className="form-group">
            <label htmlFor="curve_of_wilson">3. Curve of Wilson:</label>
            <input type="text" id="curve_of_wilson" name="curve_of_wilson" onChange={handleInputChange} value={getFieldValue('curve_of_wilson')} />
          </div>

          <div className="form-group">
            <label htmlFor="arch_alignment">4. Alignment:</label>
            <textarea id="arch_alignment" name="arch_alignment" onChange={handleInputChange} value={getFieldValue('arch_alignment')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="arch_spacing">5. Spacing:</label>
            <textarea id="arch_spacing" name="arch_spacing" onChange={handleInputChange} value={getFieldValue('arch_spacing')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="arch_crowding">6. Crowding:</label>
            <textarea id="arch_crowding" name="arch_crowding" onChange={handleInputChange} value={getFieldValue('arch_crowding')}></textarea>
          </div>

        </div>

        {/* PAGE 4: Radiographic, Vitality, and Mounted Cast Evaluation */}
        <div className={`page ${currentPage === 4 ? "active" : ""}`}>
          <h2>H. Radiographic Examination:</h2>

          <div className="form-group">
            <label htmlFor="radiographs_taken">1. Radiographs taken:</label>
            <textarea id="radiographs_taken" name="radiographs_taken" onChange={handleInputChange} value={getFieldValue('radiographs_taken')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="radiographic_findings">2. Findings:</label>
            <textarea id="radiographic_findings" name="radiographic_findings" onChange={handleInputChange} value={getFieldValue('radiographic_findings')}></textarea>
          </div>

          <h2>I. Vitality Testing:</h2>

          <div className="form-group">
            <label htmlFor="vitality_test">1. Pulp vitality test:</label>
            <textarea id="vitality_test" name="vitality_test" onChange={handleInputChange} value={getFieldValue('vitality_test')}></textarea>
          </div>

          <h2>J. Mounted Cast Evaluation:</h2>

          <div className="form-group">
            <label htmlFor="centric_relation">1. Centric relation:</label>
            <textarea id="centric_relation" name="centric_relation" onChange={handleInputChange} value={getFieldValue('centric_relation')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="centric_occlusion">2. Centric occlusion:</label>
            <textarea id="centric_occlusion" name="centric_occlusion" onChange={handleInputChange} value={getFieldValue('centric_occlusion')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="excursive_movements">3. Excursive movements:</label>
            <textarea id="excursive_movements" name="excursive_movements" onChange={handleInputChange} value={getFieldValue('excursive_movements')}></textarea>
          </div>

        </div>

        {/* PAGE 5: Diagnosis */}
        {/* Note: Original code had duplicate PAGE 5 definitions. Corrected to one PAGE 5, one PAGE 6, etc. */}
        <div className={`page ${currentPage === 5 ? "active" : ""}`}>
          <h2>2. Diagnosis:</h2>

          <div className="form-group">
            <label htmlFor="chief_complaint">Chief complaint:</label>
            <textarea id="chief_complaint" name="chief_complaint_diagnosis" onChange={handleInputChange} value={getFieldValue('chief_complaint_diagnosis')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="clinical_diagnosis">Clinical diagnosis:</label>
            <textarea id="clinical_diagnosis" name="clinical_diagnosis" onChange={handleInputChange} value={getFieldValue('clinical_diagnosis')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="radiographic_diagnosis">Radiographic diagnosis:</label>
            <textarea id="radiographic_diagnosis" name="radiographic_diagnosis" onChange={handleInputChange} value={getFieldValue('radiographic_diagnosis')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="definitive_diagnosis">Definitive diagnosis:</label>
            <textarea id="definitive_diagnosis" name="definitive_diagnosis" onChange={handleInputChange} value={getFieldValue('definitive_diagnosis')}></textarea>
          </div>

        </div>

        {/* PAGE 6: Treatment Planning and FPD Design */}
        <div className={`page ${currentPage === 6 ? "active" : ""}`}>
          <h2>3. Treatment Planning:</h2>

          <div className="form-group">
            <label htmlFor="treatment_options">Treatment options:</label>
            <textarea id="treatment_options" name="treatment_options" onChange={handleInputChange} value={getFieldValue('treatment_options')}></textarea>
          </div>

          <h3>Proposed Fixed Partial Denture Design:</h3>

          <div className="form-group">
            <label htmlFor="abutment_teeth">1. Abutment teeth:</label>
            <textarea id="abutment_teeth" name="abutment_teeth" onChange={handleInputChange} value={getFieldValue('abutment_teeth')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="connector_design">2. Connector design:</label>
            <textarea id="connector_design" name="connector_design" onChange={handleInputChange} value={getFieldValue('connector_design')}></textarea>
          </div>
          {/*  */}

          <div className="form-group">
            <label htmlFor="pontic_design">3. Pontic design:</label>
            <textarea id="pontic_design" name="pontic_design" onChange={handleInputChange} value={getFieldValue('pontic_design')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="margin_design">4. Margin design:</label>
            <textarea id="margin_design" name="margin_design" onChange={handleInputChange} value={getFieldValue('margin_design')}></textarea>
          </div>
          {/*  */}

          <div className="form-group">
            <label htmlFor="material_choice">5. Material selection:</label>
            <textarea id="material_choice" name="material_choice" onChange={handleInputChange} value={getFieldValue('material_choice')}></textarea>
          </div>

        </div>

        {/* PAGE 7: Tooth Preparation Notes */}
        <div className={`page ${currentPage === 7 ? "active" : ""}`}>
          <h2>4. Tooth Preparation Notes:</h2>

          <div className="form-group">
            <label htmlFor="occlusal_reduction">1. Occlusal reduction (mm):</label>
            <input type="text" id="occlusal_reduction" name="occlusal_reduction" onChange={handleInputChange} value={getFieldValue('occlusal_reduction')} />
          </div>

          <div className="form-group">
            <label htmlFor="axial_reduction">2. Axial reduction (mm):</label>
            <input type="text" id="axial_reduction" name="axial_reduction" onChange={handleInputChange} value={getFieldValue('axial_reduction')} />
          </div>
          {/*  */}

          <div className="form-group">
            <label htmlFor="finish_line">3. Finish line:</label>
            <textarea id="finish_line" name="finish_line" onChange={handleInputChange} value={getFieldValue('finish_line')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="path_of_insertion">4. Path of insertion:</label>
            <textarea id="path_of_insertion" name="path_of_insertion" onChange={handleInputChange} value={getFieldValue('path_of_insertion')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="retention_features">5. Retention and resistance features:</label>
            <textarea id="retention_features" name="retention_features" onChange={handleInputChange} value={getFieldValue('retention_features')}></textarea>
          </div>

        </div>

        {/* PAGE 8: Provisional Restoration */}
        <div className={`page ${currentPage === 8 ? "active" : ""}`}>
          <h2>5. Provisional Restoration:</h2>

          <div className="form-group">
            <label htmlFor="provisional_material">Material used:</label>
            <input type="text" id="provisional_material" name="provisional_material" onChange={handleInputChange} value={getFieldValue('provisional_material')} />
          </div>

          <div className="form-group">
            <label htmlFor="provisional_method">Method of fabrication:</label>
            <textarea id="provisional_method" name="provisional_method" onChange={handleInputChange} value={getFieldValue('provisional_method')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="provisional_fit">Fit assessment:</label>
            <textarea id="provisional_fit" name="provisional_fit" onChange={handleInputChange} value={getFieldValue('provisional_fit')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="provisional_occlusion">Occlusion:</label>
            <textarea id="provisional_occlusion" name="provisional_occlusion" onChange={handleInputChange} value={getFieldValue('provisional_occlusion')}></textarea>
          </div>

        </div>

        {/* PAGE 9: Final Prosthesis Evaluation & Follow-up */}
        <div className={`page ${currentPage === 9 ? "active" : ""}`}>
          <h2>6. Final Prosthesis Evaluation:</h2>

          <div className="form-group">
            <label htmlFor="final_fit">1. Fit:</label>
            <textarea id="final_fit" name="final_fit" onChange={handleInputChange} value={getFieldValue('final_fit')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="final_occlusion">2. Occlusion:</label>
            <textarea id="final_occlusion" name="final_occlusion" onChange={handleInputChange} value={getFieldValue('final_occlusion')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="final_contour">3. Contour:</label>
            <textarea id="final_contour" name="final_contour" onChange={handleInputChange} value={getFieldValue('final_contour')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="final_esthetics">4. Esthetics:</label>
            <textarea id="final_esthetics" name="final_esthetics" onChange={handleInputChange} value={getFieldValue('final_esthetics')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="patient_feedback">5. Patient feedback:</label>
            <textarea id="patient_feedback" name="patient_feedback" onChange={handleInputChange} value={getFieldValue('patient_feedback')}></textarea>
          </div>

          <h2>7. Follow-up:</h2>

          <div className="form-group">
            <label htmlFor="followup_instructions">Instructions:</label>
            <textarea id="followup_instructions" name="followup_instructions" onChange={handleInputChange} value={getFieldValue('followup_instructions')}></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="recall_schedule">Recall schedule:</label>
            <textarea id="recall_schedule" name="recall_schedule" onChange={handleInputChange} value={getFieldValue('recall_schedule')}></textarea>
          </div>

            {/* Signature upload - required for submission */}
            
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

        {/* Navigation for all pages */}
        <div className="navigation" style={{ marginTop: 30 }}>
          <button type="button" onClick={prevPage} disabled={currentPage === 0}>
            Previous
          </button>
          {currentPage === totalPages - 1 ? (
            <button type="submit" disabled={!getFieldValue('digitalSignature')}>
              Submit 
            </button>
          ) : (
            <button type="button" onClick={nextPage}>
              Next
            </button>
          )}
        </div>
        <p style={{textAlign: 'center', margin: '10px 0'}}>
          Page {currentPage + 1} of {totalPages}
        </p>
      </form>
      </div>
    </div>
  );
}
