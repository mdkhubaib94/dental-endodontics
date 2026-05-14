import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ImplantPatient.css';
import { readStoredGeneralCaseXray } from '../../../utils/generalCaseXray';
import { API_BASE_URL } from '../../../config/api';
const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';
import { getCurrentPatientId, getSharedXrayImage } from '../../../utils/sharedXray';
import { clearCaseDraft, loadCaseDraft, saveCaseDraft } from '../../../utils/caseDraft';

const SRMDentalForm = () => {
  const DRAFT_ROUTE_KEY = '/ImplantPatient';
  const [currentPage, setCurrentPage] = useState(5);
  const [formData, setFormData] = useState({});
  const [showAllergyAlert, setShowAllergyAlert] = useState(true);
  const [allergyMessage, setAllergyMessage] = useState('');
  const [isAuthValid, setIsAuthValid] = useState(false);
  const [xrayImage, setXrayImage] = useState(null);
  const [xrayPreview, setXrayPreview] = useState('');
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const pageContentRef = useRef(null);
  const signatureFileRef = useRef(null);
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

  useEffect(() => {
    // Validate required authentication data
    const doctorId = localStorage.getItem('doctorId');
    const doctorName = localStorage.getItem('doctorName');
    const patientId = localStorage.getItem('CurrentpatientId');
    const token = localStorage.getItem('token');

    if (!doctorId || !doctorName || !patientId || !token) {
      alert('Missing doctor information. Please log in again.');
      window.location.href = '/login';
      return;
    }

    const savedData = {};
    for (let i = 5; i <= 14; i++) {
      const pageKey = `page${i}`;
      const saved = localStorage.getItem(pageKey);
      if (saved) {
        savedData[pageKey] = JSON.parse(saved);
      }
    }
    const patientIdForDraft = String(
      localStorage.getItem('CurrentpatientId') ||
      localStorage.getItem('currentPatientId') ||
      localStorage.getItem('patientId') ||
      ''
    ).trim();

    const prefill = location.state?.redoEdit ? location.state?.prefillCaseData : null;
    const editCaseId = String(location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || '').trim();
    
    console.log('[ImplantPatient] Hydration effect running, patientId:', patientIdForDraft);
    setIsDraftHydrated(false);
    
    if (!patientIdForDraft) {
      console.log('[ImplantPatient] No patientId, setting isDraftHydrated=true immediately');
      setIsDraftHydrated(true);
      return;
    }

    let cancelled = false;
    const hydrateDraft = async () => {
      try {
        if (prefill && editCaseId) {
          // Prefill all pages with the payload; each page will read what it needs.
          setFormData({
            ...savedData,
            page5: prefill,
            page6: prefill,
            page7: prefill,
          });
          if (typeof prefill.digitalSignature === 'string' && prefill.digitalSignature.startsWith('data:')) {
            signatureFileRef.current = prefill.digitalSignature;
          }
          if (typeof prefill.xrayImage === 'string' && prefill.xrayImage.startsWith('data:image/')) {
            setXrayImage(prefill.xrayImage);
            setXrayPreview(prefill.xrayImage);
          }
          setCurrentPage(5);
          setIsAuthValid(true);
          return;
        }

        console.log('[ImplantPatient] Starting async draft load');
        const draft = await loadCaseDraft({ patientId: patientIdForDraft, routeKey: DRAFT_ROUTE_KEY });
        
        if (cancelled) {
          console.log('[ImplantPatient] Hydration was cancelled');
          return;
        }

        console.log('[ImplantPatient] Draft load complete, applying data');
        setFormData(draft?.data?.formData || savedData);
        if (Number.isFinite(draft?.step)) {
          const nextStep = Math.max(5, Math.min(Number(draft.step), 7));
          setCurrentPage(nextStep);
        }
        setIsAuthValid(true);
      } catch (error) {
        console.error('[ImplantPatient] Error during draft hydration:', error);
      } finally {
        if (!cancelled) {
          console.log('[ImplantPatient] Setting isDraftHydrated=true');
          setIsDraftHydrated(true);
        }
      }
    };

    hydrateDraft();

    return () => {
      console.log('[ImplantPatient] Hydration effect cleanup - marking as cancelled');
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
    
    if (!patientId) {
      console.log('[ImplantPatient] Autosave blocked: no patientId');
      return;
    }
    
    if (!isAuthValid) {
      console.log('[ImplantPatient] Autosave blocked: isAuthValid=false');
      return;
    }
    
    if (!isDraftHydrated) {
      console.log('[ImplantPatient] Autosave blocked: isDraftHydrated=false');
      return;
    }

    console.log('[ImplantPatient] Autosaving...', { patientId, routeKey: DRAFT_ROUTE_KEY });
    void saveCaseDraft({
      patientId,
      routeKey: DRAFT_ROUTE_KEY,
      step: currentPage,
      data: {
        formData,
      },
    });
  }, [currentPage, formData, isAuthValid, isDraftHydrated]);

  // Ensure draft is saved before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const patientId = String(
        localStorage.getItem('CurrentpatientId') ||
        localStorage.getItem('currentPatientId') ||
        localStorage.getItem('patientId') ||
        ''
      ).trim();

      if (patientId && isAuthValid && isDraftHydrated) {
        console.log('[ImplantPatient] Before unload - saving draft immediately');
        saveCaseDraft({
          patientId,
          routeKey: DRAFT_ROUTE_KEY,
          step: currentPage,
          data: {
            formData,
          },
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, currentPage, isAuthValid, isDraftHydrated]);

  // Fetch and display patient allergies (aligns with Complete Denture behavior)
  useEffect(() => {
    const patientId = localStorage.getItem('CurrentpatientId');
    if (!patientId) return;
    fetch(`http://localhost:5000/api/doctor-patient/${patientId}`)
      .then(res => (res.ok ? res.json() : null))
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

  // Scroll to top function
  const scrollToTop = () => {
    if (pageContentRef.current) {
      pageContentRef.current.scrollTop = 0;
    }
    // Also scroll window to top for safety
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const savePageData = (pageNumber, data) => {
    const pageKey = `page${pageNumber}`;
    const updatedData = { ...formData, [pageKey]: data };
    setFormData(updatedData);
    localStorage.setItem(pageKey, JSON.stringify(data));
  };

  const handleNext = async (pageNumber, data) => {
    savePageData(pageNumber, data);
    if (pageNumber === 7) {  // Changed from 14 to 7 since only 7 pages exist
      // Combine all pages data
      const allData = {};
      for (let i = 5; i <= 7; i++) {
        const pageKey = `page${i}`;
        const pageData = i === pageNumber ? (data || {}) : (formData[pageKey] || {});
        Object.assign(allData, pageData);
      }

      // Attach signature (kept in ref to avoid resetting file input)
      allData.digitalSignature = signatureFileRef.current;

      // Check for digital signature
      if (!allData.digitalSignature) {
        alert('Please upload a digital signature before submitting the case sheet.');
        return;
      }
      // Submit all data to backend
      try {
        const patientId = localStorage.getItem('CurrentpatientId');
        const patientName = localStorage.getItem('CurrentpatientName');
        const doctorId = localStorage.getItem('doctorId');
        const doctorName = localStorage.getItem('doctorName');
        const token = localStorage.getItem('token');

        const redoEditCaseId = String(
          location.state?.editCaseId || localStorage.getItem('redoEditCaseId') || ''
        ).trim();
        const isRedoEdit = Boolean(redoEditCaseId);

        if (!patientId || !doctorId) {
          alert('Missing patient or doctor information');
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
            ...allData,
            patientId,
            patientName: patientName || '',
            doctorId,
            doctorName: doctorName || '',
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

          const raw = await response.text();
          let result = {};
          try {
            result = raw ? JSON.parse(raw) : {};
          } catch {
            result = { message: raw };
          }

          if (!response.ok) {
            const serverMsg = result?.error || result?.message;
            const normalizedMsg = String(serverMsg || '').trim();

            if (
              response.status === 404 &&
              /route\s+put\s+\/api\/casesheets\//i.test(normalizedMsg)
            ) {
              alert(
                'Your backend is missing the redo update route (PUT /api/casesheets/:caseId).\n\n' +
                  'Fix: restart the backend (server) and try again. If deployed, redeploy the backend.'
              );
              return;
            }

            alert(normalizedMsg || `Failed to update case sheet (${response.status})`);
            return;
          }

          await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
          localStorage.removeItem('redoEditCaseId');
          localStorage.removeItem('redoEditDepartmentKey');

          for (let i = 5; i <= 7; i++) {
            localStorage.removeItem(`page${i}`);
          }

          alert('Implant Patient Case Sheet updated and resubmitted successfully!');
          navigate('/pg-dashboard');
          return;
        }

        // Use FormData to handle file upload
        const formDataToSend = new FormData();

        // Define submit handler before usage to avoid TDZ errors in non-xray path.
        const submitForm = async (dataToSend) => {
          try {
            const response = await fetch(buildApiUrl('/api/ImplantPatient/save'), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: dataToSend
            });

            const raw = await response.text();
            let result = {};
            try {
              result = raw ? JSON.parse(raw) : {};
            } catch {
              result = { message: raw };
            }

            if (!response.ok) {
              const serverMsg = result?.error || result?.message;
              alert(serverMsg || `Failed to save case sheet (${response.status})`);
              return;
            }

            // Ensure each submission is a NEW case (per visit)
            const newCaseId = result?.caseId || result?.data?._id;
            if (newCaseId) localStorage.setItem('caseId', newCaseId);
            await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });

            // Clear any staged page data so next visit starts fresh
            for (let i = 5; i <= 7; i++) {
              localStorage.removeItem(`page${i}`);
            }

            alert('Implant Patient Case Sheet submitted and saved successfully!');
            window.location.href = '/prescriptions';
          } catch (submitError) {
            console.error('Submission request error:', submitError);
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
            Object.keys(allData).forEach(key => {
              if (key === 'digitalSignature' && allData[key]) {
                formDataToSend.append(key, allData[key]);
              } else if (key !== 'digitalSignature') {
                formDataToSend.append(key, allData[key] || '');
              }
            });
            
            // Add patient and doctor info
            formDataToSend.append('patientId', patientId);
            formDataToSend.append('patientName', patientName || '');
            formDataToSend.append('doctorId', doctorId);
            formDataToSend.append('doctorName', doctorName || 'Doctor');

            submitForm(formDataToSend);
          };
          xrayReader.readAsDataURL(xrayImage);
        } else if (typeof xrayImage === 'string' && xrayImage.startsWith('data:image/')) {
          formDataToSend.append('xrayImage', xrayImage);

          Object.keys(allData).forEach(key => {
            if (key === 'digitalSignature' && allData[key]) {
              formDataToSend.append(key, allData[key]);
            } else if (key !== 'digitalSignature') {
              formDataToSend.append(key, allData[key] || '');
            }
          });

          formDataToSend.append('patientId', patientId);
          formDataToSend.append('patientName', patientName || '');
          formDataToSend.append('doctorId', doctorId);
          formDataToSend.append('doctorName', doctorName || 'Doctor');

          submitForm(formDataToSend);
        } else {
          if (typeof xrayImage === 'string' && xrayImage.trim()) {
            formDataToSend.append('xrayImage', xrayImage.trim());
          }

          // Add all form fields
          Object.keys(allData).forEach(key => {
            if (key === 'digitalSignature' && allData[key]) {
              formDataToSend.append(key, allData[key]);
            } else if (key !== 'digitalSignature') {
              formDataToSend.append(key, allData[key] || '');
            }
          });
          
          // Add patient and doctor info
          formDataToSend.append('patientId', patientId);
          formDataToSend.append('patientName', patientName || '');
          formDataToSend.append('doctorId', doctorId);
          formDataToSend.append('doctorName', doctorName || 'Doctor');

          submitForm(formDataToSend);
        }
      } catch (error) {
        console.error('Submission error:', error);
        alert(error?.message || 'Failed to submit case sheet. Please try again.');
      }
    } else {
      setCurrentPage(pageNumber + 1);
      // Scroll to top after state update
      setTimeout(scrollToTop, 10);
    }
  };

  const handlePrev = () => {
    setCurrentPage(currentPage - 1);
    // Scroll to top after state update
    setTimeout(scrollToTop, 10);
  };

  useEffect(() => {
    const patientId = getCurrentPatientId();
    const sharedXray = getSharedXrayImage(patientId);

    if (!sharedXray?.dataUrl) return;

    setXrayImage((prev) => prev || sharedXray.dataUrl);
    setXrayPreview((prev) => prev || sharedXray.dataUrl);
  }, []);

  const Header = ({ subtitle }) => {
    const patientName = localStorage.getItem('CurrentpatientName');
    const patientId = localStorage.getItem('CurrentpatientId');

    return (
      <div className="srm-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', paddingLeft: '20px', paddingRight: '20px' }}>
        {(patientName || patientId) && (
          <div style={{ position: 'absolute', left: '20px', padding: '8px 15px', backgroundColor: 'rgba(38, 40, 107, 0.95)', borderRadius: '4px', fontSize: '0.8em', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textAlign: 'left', whiteSpace: 'nowrap' }}>
            {patientName && <div><strong>{patientName}</strong></div>}
            {patientId && <div><strong>ID:</strong> {patientId}</div>}
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="SRM Logo" className="srm-logo" style={{ display: 'block', margin: '0 auto' }} />
          <h1 className="srm-h1">SRM Dental College</h1>
          {subtitle && <h2 className="srm-h2">{subtitle}</h2>}
        </div>
      </div>
    );
  };

  const NavigationButtons = ({ onPrev, onNext, prevText = 'Back', nextText = 'Next', prevDisabled = false }) => (
    <div className="srm-nav-buttons">
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled}
        className={`srm-button ${prevDisabled ? 'srm-button-disabled' : ''}`}
      >
        {prevText}
      </button>
      <button 
        type="button" 
        onClick={onNext} 
        className="srm-button"
      >
        {nextText}
      </button>
    </div>
  );

  const Page5 = ({ initialData = {}, onNext }) => {
    const [pageData, setPageData] = useState({
      faceShape: '',
      profile: '',
      lipSupport: '',
      philtrum: '',
      nasolabialSulcus: '',
      mouthOpening: null,
      edentulism: '',
      kennedy: [],
      ...initialData,
    });

    const handleChange = (e) => {
      const { name, value, type, files, checked } = e.target;

      if (type === 'checkbox') {
        setPageData((prev) => ({
          ...prev,
          [name]: checked
            ? [...(prev[name] || []), value]
            : (prev[name] || []).filter((item) => item !== value),
        }));
      } else if (type === 'file') {
        setPageData((prev) => ({ ...prev, [name]: files[0] }));
      } else {
        setPageData((prev) => ({ ...prev, [name]: value }));
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onNext(pageData);
    };

    return (
      <form onSubmit={handleSubmit} className="srm-form">
        {/* X-ray Image Upload Section */}
        

        <Header subtitle="Oral/Peri-Oral Examination" />

        <div className="srm-form-group">
          <div className="xray-upload-section">
          <h3>X-ray Image:</h3>
          <div className="srm-form-group">
            {xrayPreview && (
              <div className="xray-preview-container">
                
                <img src={xrayPreview} alt="X-ray Preview" className="xray-preview" />
              </div>
            )}
            {!xrayPreview && (
              <p className="srm-helper-text">No X-ray found in General Case Sheet for this patient.</p>
            )}
          </div>
        </div>
          <label htmlFor="faceShape" className="srm-label">
            Shape of Face
          </label>
          <input
            type="text"
            id="faceShape"
            name="faceShape"
            value={pageData.faceShape}
            onChange={handleChange}
            placeholder="e.g., Ovoid, Square, Tapering..."
            required
            className="srm-input"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="profile" className="srm-label">
            Profile
          </label>
          <input
            type="text"
            id="profile"
            name="profile"
            value={pageData.profile}
            onChange={handleChange}
            placeholder="e.g., Straight, Convex, Concave..."
            required
            className="srm-input"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="lipSupport" className="srm-label">
            Lip Support
          </label>
          <input
            type="text"
            id="lipSupport"
            name="lipSupport"
            value={pageData.lipSupport}
            onChange={handleChange}
            placeholder="e.g., Adequate, Inadequate..."
            required
            className="srm-input"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="philtrum" className="srm-label">
            Philtrum
          </label>
          <input
            type="text"
            id="philtrum"
            name="philtrum"
            value={pageData.philtrum}
            onChange={handleChange}
            placeholder="e.g., Normal, Flattened..."
            required
            className="srm-input"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="nasolabialSulcus" className="srm-label">
            Nasolabial Sulcus
          </label>
          <input
            type="text"
            id="nasolabialSulcus"
            name="nasolabialSulcus"
            value={pageData.nasolabialSulcus}
            onChange={handleChange}
            placeholder="e.g., Prominent, Shallow..."
            required
            className="srm-input"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="mouthOpening" className="srm-label">
            Mouth Opening (Upload Image)
          </label>
          <input
            type="file"
            id="mouthOpening"
            name="mouthOpening"
            accept=".png,.jpeg,.jpg,.webp"
            onChange={handleChange}
            required
            className="srm-input"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="edentulism" className="srm-label">
            State of Edentulism
          </label>
          <input
            type="text"
            id="edentulism"
            name="edentulism"
            value={pageData.edentulism}
            onChange={handleChange}
            placeholder="e.g., Partial, Complete..."
            required
            className="srm-input"
          />
        </div>

        <div className="srm-form-group">
          <label className="srm-label">Kennedy Classification</label>
          <div className="srm-checkbox-group">
            {['I', 'II', 'III', 'IV'].map((cls) => (
              <label key={cls} className="srm-checkbox-label">
                <input
                  type="checkbox"
                  name="kennedy"
                  value={cls}
                  checked={pageData.kennedy?.includes(cls) || false}
                  onChange={handleChange}
                />
                Class {cls}
              </label>
            ))}
          </div>
        </div>

        <NavigationButtons
          onPrev={null}
          onNext={() => onNext(pageData)}
          prevDisabled={true}
          nextText="Next"
        />
      </form>
    );
  };

  const Page6 = ({ initialData = {}, onNext, onPrev }) => {
    const [pageData, setPageData] = useState({
      gingiva: '',
      mucosa: '',
      tongue: '',
      floorOfMouth: '',
      salivaryGlands: '',
      tonsils: '',
      palate: '',
      lineaAlba: false,
      lineaNotes: '',
      restoration: '',
      restOther: '',
      inflammation: '',
      nodeEnlargement: '',
      tenderness: '',
      nodeOther: '',
      ...initialData,
    });

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;

      if (type === 'checkbox') {
        setPageData((prev) => ({
          ...prev,
          [name]: checked,
          ...(name === 'lineaAlba' && !checked && { lineaNotes: '' }),
        }));
      } else if (name === 'restoration') {
        setPageData((prev) => ({
          ...prev,
          [name]: value,
          ...(value !== 'other' && { restOther: '' }),
        }));
      } else {
        setPageData((prev) => ({ ...prev, [name]: value }));
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onNext(pageData);
    };

    return (
      <form onSubmit={handleSubmit} className="srm-form">
        <Header subtitle="Intraoral and Extraoral Examination" />

        <h2 className="srm-h2">Intraoral Examination</h2>

        <div className="srm-form-group">
          <label htmlFor="gingiva" className="srm-label">
            Gingiva
          </label>
          <textarea
            name="gingiva"
            id="gingiva"
            value={pageData.gingiva}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="mucosa" className="srm-label">
            Mucosa
          </label>
          <textarea
            name="mucosa"
            id="mucosa"
            value={pageData.mucosa}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="tongue" className="srm-label">
            Tongue
          </label>
          <textarea
            name="tongue"
            id="tongue"
            value={pageData.tongue}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="floorOfMouth" className="srm-label">
            Floor of the Mouth
          </label>
          <textarea
            name="floorOfMouth"
            id="floorOfMouth"
            value={pageData.floorOfMouth}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="salivaryGlands" className="srm-label">
            Salivary Glands and Ducts
          </label>
          <textarea
            name="salivaryGlands"
            id="salivaryGlands"
            value={pageData.salivaryGlands}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="tonsils" className="srm-label">
            Tonsils
          </label>
          <textarea
            name="tonsils"
            id="tonsils"
            value={pageData.tonsils}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="palate" className="srm-label">
            Palate
          </label>
          <textarea
            name="palate"
            id="palate"
            value={pageData.palate}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label className="srm-checkbox-label">
            <input
              type="checkbox"
              id="lineaAlba"
              name="lineaAlba"
              checked={pageData.lineaAlba}
              onChange={handleChange}
            />
            Linea Alba
          </label>
        </div>

        {pageData.lineaAlba && (
          <div className="srm-form-group">
            <label htmlFor="lineaNotes" className="srm-label">
              Notes for Linea Alba
            </label>
            <textarea
              name="lineaNotes"
              id="lineaNotes"
              value={pageData.lineaNotes}
              onChange={handleChange}
              className="srm-textarea"
            />
          </div>
        )}

        <div className="srm-form-group">
          <label htmlFor="restoration" className="srm-label">
            Existing Restoration (Fillings)
          </label>
          <select
            name="restoration"
            id="restoration"
            value={pageData.restoration}
            onChange={handleChange}
            className="srm-select"
          >
            <option value="">-- Select --</option>
            <option value="amalgam">Amalgam</option>
            <option value="composite">Composite</option>
            <option value="ceramic">Ceramic</option>
            <option value="gold">Gold</option>
            <option value="none">None</option>
            <option value="other">Other</option>
          </select>
        </div>

        {pageData.restoration === 'other' && (
          <div className="srm-form-group">
            <label htmlFor="restOther" className="srm-label">
              Other Restoration Details
            </label>
            <textarea
              name="restOther"
              id="restOther"
              value={pageData.restOther}
              onChange={handleChange}
              className="srm-textarea"
            />
          </div>
        )}

        <h2 className="srm-h2">Necks and Nodes</h2>

        <div className="srm-form-group">
          <label htmlFor="inflammation" className="srm-label">
            Inflammation
          </label>
          <textarea
            name="inflammation"
            id="inflammation"
            value={pageData.inflammation}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="nodeEnlargement" className="srm-label">
            Enlargement of Nodes
          </label>
          <textarea
            name="nodeEnlargement"
            id="nodeEnlargement"
            value={pageData.nodeEnlargement}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="tenderness" className="srm-label">
            Tenderness
          </label>
          <textarea
            name="tenderness"
            id="tenderness"
            value={pageData.tenderness}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="nodeOther" className="srm-label">
            Other Findings
          </label>
          <textarea
            name="nodeOther"
            id="nodeOther"
            value={pageData.nodeOther}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <NavigationButtons
          onPrev={onPrev}
          onNext={() => onNext(pageData)}
          prevText="Back"
          nextText="Next"
        />
      </form>
    );
  };

  const Page7 = ({ initialData = {}, onNext, onPrev }) => {
    const [pageData, setPageData] = useState({
      oralHygiene: '',
      calculus: '',
      plaque: '',
      stains: '',
      mobilityTeeth: '',
      mobilityGrade: '',
      pockets: '',
      recession: '',
      periodontalTenderness: '',
      periodontalOther: '',
      ...initialData,
    });

    const handleChange = (e) => {
      const { name, value } = e.target;
      setPageData((prev) => ({ ...prev, [name]: value }));
    };

    const [signaturePreview, setSignaturePreview] = useState(null);
    const [signatureFileName, setSignatureFileName] = useState('');

    const handleSignatureSelect = (file) => {
      signatureFileRef.current = file || null;
      setSignatureFileName(file?.name || '');

      if (!file) {
        setSignaturePreview(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => setSignaturePreview(e.target.result);
      reader.readAsDataURL(file);
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onNext(pageData);
    };

    return (
      <form onSubmit={handleSubmit} className="srm-form">
        <Header subtitle="Periodontal and Occlusal Assessment" />

        <h2 className="srm-h2">Periodontal Assessment</h2>

        <div className="srm-form-group">
          <label htmlFor="oralHygiene" className="srm-label">
            Oral Hygiene Status
          </label>
          <select
            name="oralHygiene"
            id="oralHygiene"
            value={pageData.oralHygiene}
            onChange={handleChange}
            className="srm-select"
          >
            <option value="">-- Select --</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        <div className="srm-form-group">
          <label htmlFor="calculus" className="srm-label">
            Calculus
          </label>
          <textarea
            name="calculus"
            id="calculus"
            value={pageData.calculus}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="plaque" className="srm-label">
            Plaque
          </label>
          <textarea
            name="plaque"
            id="plaque"
            value={pageData.plaque}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="stains" className="srm-label">
            Stains
          </label>
          <textarea
            name="stains"
            id="stains"
            value={pageData.stains}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="mobilityTeeth" className="srm-label">
            Mobility of Teeth
          </label>
          <textarea
            name="mobilityTeeth"
            id="mobilityTeeth"
            value={pageData.mobilityTeeth}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="mobilityGrade" className="srm-label">
            Mobility Grade
          </label>
          <select
            name="mobilityGrade"
            id="mobilityGrade"
            value={pageData.mobilityGrade}
            onChange={handleChange}
            className="srm-select"
          >
            <option value="">-- Select --</option>
            <option value="Grade 0">Grade 0</option>
            <option value="Grade 1">Grade 1</option>
            <option value="Grade 2">Grade 2</option>
            <option value="Grade 3">Grade 3</option>
          </select>
        </div>

        <div className="srm-form-group">
          <label htmlFor="pockets" className="srm-label">
            Pockets (mm)
          </label>
          <input
            type="number"
            name="pockets"
            id="pockets"
            min="0"
            value={pageData.pockets}
            onChange={handleChange}
            className="srm-input"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="recession" className="srm-label">
            Recession (mm)
          </label>
          <input
            type="number"
            id="recession"
            name="recession"
            min="0"
            value={pageData.recession}
            onChange={handleChange}
            className="srm-input"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="periodontalTenderness" className="srm-label">
            Tenderness
          </label>
          <textarea
            name="periodontalTenderness"
            id="periodontalTenderness"
            value={pageData.periodontalTenderness}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        <div className="srm-form-group">
          <label htmlFor="periodontalOther" className="srm-label">
            Other Findings
          </label>
          <textarea
            name="periodontalOther"
            id="periodontalOther"
            value={pageData.periodontalOther}
            onChange={handleChange}
            className="srm-textarea"
          />
        </div>

        {/* Doctor's Authentication Section */}
        
        
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
            onChange={(e) => handleSignatureSelect(e.target.files && e.target.files[0])}
            required
          />
          {signatureFileName && (
            <div style={{ marginTop: '6px', fontSize: '13px', color: '#111827' }}>
              Selected: <strong>{signatureFileName}</strong>
            </div>
          )}
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

        <NavigationButtons
          onPrev={onPrev}
          onNext={() => onNext(pageData)}
          prevText="Back"
          nextText="Submit"
        />
      </form>
    );
  };

  // Add Page8 through Page14 following the same pattern...

  const renderPage = () => {
    const pageData = formData[`page${currentPage}`] || {};

    switch (currentPage) {
      case 5:
        return <Page5 initialData={pageData} onNext={(data) => handleNext(5, data)} />;
      case 6:
        return <Page6 initialData={pageData} onNext={(data) => handleNext(6, data)} onPrev={handlePrev} />;
      case 7:
        return <Page7 initialData={pageData} onNext={(data) => handleNext(7, data)} onPrev={handlePrev} />;
      // Add cases for pages 8-14
      default:
        return <Page5 initialData={pageData} onNext={(data) => handleNext(5, data)} />;
    }
  };

  return (
    <div className="srm-app-container">
      {!isAuthValid ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
          <p>Verifying authentication...</p>
        </div>
      ) : (
        <>
          {showAllergyAlert && (
            <div className="allergy-alert show" id="patientAllergyAlert">
              <span className="alert-icon">⚠️</span>
              <div className="allergy-flow-window">
                <span id="allergyMessage">{allergyMessage || 'Loading allergies...'}</span>
              </div>
            </div>
          )}
          <div className="srm-form-container" ref={pageContentRef}>
            <div className="srm-page-content">
              {renderPage()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SRMDentalForm;
