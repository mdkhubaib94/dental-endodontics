import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Fpd.css';
import { readStoredGeneralCaseXray } from '../../../utils/generalCaseXray';
import { API_BASE_URL } from '../../../config/api';
const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';
import { getCurrentPatientId, getSharedXrayImage } from '../../../utils/sharedXray';
import { clearCaseDraft, loadCaseDraft, saveCaseDraft } from '../../../utils/caseDraft';

const Fpd = () => {
    const DRAFT_ROUTE_KEY = '/Fpd';
    const [currentPage, setCurrentPage] = useState(0);
    const [formData, setFormData] = useState({});
    const [signaturePreview, setSignaturePreview] = useState('');
    const [xrayPreview, setXrayPreview] = useState('');
    const [allergyMessage, setAllergyMessage] = useState('Loading allergies...');
    const [showAllergy, setShowAllergy] = useState(true);
    const [isDraftHydrated, setIsDraftHydrated] = useState(false);
    const totalPages = 7; // Pages 0 to 6 for content, Page 7 for signature/submit
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
                    const nextStep = Math.max(0, Math.min(Number(draft.step), totalPages));
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
                console.log('[Fpd] Before unload - saving draft immediately');
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
        window.scrollTo(0, 0);
    }, [currentPage]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const getFieldValue = (name) => formData[name] || '';

    const handleNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrev = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleSubmit = () => {
        (async () => {
            try {
                const token = localStorage.getItem('token');
                let storedCaseId = localStorage.getItem('caseId');
                console.debug('FPD submit - token present:', !!token, 'storedCaseId:', storedCaseId);

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

                // Prepare body (convert any File to dataURL)
                const bodyToSend = { 
                    ...formData,
                    patientId,
                    patientName,
                    doctorId,
                    doctorName
                };
                
                if (formData.digitalSignature instanceof File) {
                    const file = formData.digitalSignature;
                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    bodyToSend.digitalSignature = dataUrl;
                }

                if (formData.xrayImage instanceof File) {
                    const file2 = formData.xrayImage;
                    const dataUrl2 = await new Promise((resolve, reject) => {
                        const reader2 = new FileReader();
                        reader2.onload = (e) => resolve(e.target.result);
                        reader2.onerror = reject;
                        reader2.readAsDataURL(file2);
                    });
                    bodyToSend.xrayImage = dataUrl2;
                } else if (typeof formData.xrayImage === 'string' && formData.xrayImage.startsWith('data:image/')) {
                    bodyToSend.xrayImage = formData.xrayImage;
                }

                const url = isRedoEdit
                    ? buildApiUrl(`/api/casesheets/${encodeURIComponent(redoEditCaseId)}`)
                    : buildApiUrl('/api/fpd');

                const response = await fetch(url, {
                    method: isRedoEdit ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(bodyToSend)
                });

                const data = await response.json();
                if (response.ok) {
                    await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
                    if (isRedoEdit) {
                        localStorage.removeItem('redoEditCaseId');
                        localStorage.removeItem('redoEditDepartmentKey');
                        alert('Case Sheet updated and resubmitted successfully!');
                        navigate('/pg-dashboard');
                        return;
                    }

                    const newId = data.data && (data.data._id || data.data._doc?._id || data.caseId);
                    if (newId) localStorage.setItem('caseId', newId);
                    alert('Case Sheet submitted successfully!');
                    window.location.href = '/prescriptions';
                } else {
                    console.error('FPD submit failed', data);
                    alert(data.message || 'Failed to submit case sheet');
                }
            } catch (error) {
                console.error('Submission error:', error);
                alert('Failed to submit case sheet.');
            }
        })();
    };

    // Signature preview helper (reads File to data URL)
    const previewSignature = (file) => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setSignaturePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileChange = (file) => {
        setFormData(prev => ({ ...prev, digitalSignature: file }));
        previewSignature(file);
    };

    const handleXrayImageChange = (file) => {
        setFormData(prev => ({ ...prev, xrayImage: file }));
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
        setFormData((prev) => {
            if (prev.xrayImage) return prev;
            return { ...prev, xrayImage: cachedXray.imageDataUrl };
        });
    }, []);

    const isLastContentPage = currentPage === totalPages - 1; // Page 6
    const isSignaturePage = currentPage === totalPages; // Page 7

    useEffect(() => {
        let isMounted = true;

        const toListString = (value) => {
            if (!value) return '';
            if (Array.isArray(value)) {
                return value.map((v) => String(v).trim()).filter(Boolean).join(', ');
            }
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

        const loadAllergies = async (attempt = 0) => {
            const patientId = localStorage.getItem('CurrentpatientId');

            if (!patientId) {
                if (attempt < 5 && isMounted) {
                    setTimeout(() => loadAllergies(attempt + 1), 400);
                } else if (isMounted) {
                    setAllergyMessage('No known allergies');
                }
                return;
            }

            try {
                const res = await fetch(`http://localhost:5000/api/doctor-patient/${patientId}`);
                const result = res.ok ? await res.json() : null;
                const p = extractPatient(result);

                if (!p) {
                    if (attempt < 2 && isMounted) {
                        setTimeout(() => loadAllergies(attempt + 1), 500);
                    } else if (isMounted) {
                        setAllergyMessage('No known allergies');
                    }
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
                if (isMounted) {
                    setAllergyMessage('No known allergies');
                }
            }
        };

        loadAllergies();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const patientId = getCurrentPatientId();
        const sharedXray = getSharedXrayImage(patientId);

        if (!sharedXray?.dataUrl) return;

        setFormData((prev) => {
            if (prev.xrayImage) return prev;
            return { ...prev, xrayImage: sharedXray.dataUrl };
        });
        setXrayPreview((prev) => prev || sharedXray.dataUrl);
    }, []);

    return (
        <div className="case-sheet-container" id="fpdCaseSheet">
            {showAllergy && (
                <div className="allergy-alert show" id="patientAllergyAlert">
                    <span className="alert-icon">⚠️</span>
                    <div className="allergy-flow-window">
                        <span id="allergyMessage">{formatAllergyTicker(allergyMessage || 'Loading allergies...')}</span>
                    </div>
                </div>
            )}
            <div className="case-sheet">
                <div style={{ position: 'relative', textAlign: 'center', marginBottom: 20, paddingLeft: '20px', paddingRight: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <img src="/images/logo.png" alt="SRM Dental College Logo" style={{ maxWidth: 120, height: 'auto', marginBottom: 10 }} />
                        <h2 style={{ margin: 0, fontSize: '2.8em', fontWeight: 800, letterSpacing: '0.3px' }}>SRM Dental College</h2>
                    </div>

                    {/* Patient Information Header */}
                    {localStorage.getItem('CurrentpatientName') && (
                        <div style={{ 
                            position: 'absolute',
                            left: '20px',
                            top: '6px',
                            backgroundColor: 'rgba(38, 40, 107, 0.95)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            padding: '8px 15px',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            color: 'white',
                            fontSize: '0.8em'
                        }}>
                            <div style={{ textAlign: 'left' }}>
                                {localStorage.getItem('CurrentpatientName') && (
                                    <div style={{ marginBottom: '6px' }}>
                                        <strong>Patient Name:</strong> {localStorage.getItem('CurrentpatientName')}
                                    </div>
                                )}
                                {localStorage.getItem('CurrentpatientId') && (
                                    <div>
                                        <strong>Patient ID:</strong> {localStorage.getItem('CurrentpatientId')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <form onSubmit={(e) => e.preventDefault()}>
                    {/* Page 0: Clinical Examination - Extra Oral / TMJ */}
                    <div className={`page ${currentPage === 0 ? 'active' : ''}`}>
                        <div className="form-group">
                            <label>X-ray Image:</label>
                            {xrayPreview && (
                                <div className="xray-preview-container">
                                    <img src={xrayPreview} alt="X-ray preview" className="xray-preview" />
                                </div>
                            )}
                            {!xrayPreview && <p>No X-ray found in General Case Sheet for this patient.</p>}
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
                            <label><input type="radio" name="facial_profile" value="Normal" id="facial_profile_normal" onChange={handleInputChange} checked={getFieldValue('facial_profile') === 'Normal'} /> Normal</label>
                            <label><input type="radio" name="facial_profile" value="Retrognathic" id="facial_profile_retrognathic" onChange={handleInputChange} checked={getFieldValue('facial_profile') === 'Retrognathic'} /> Retrognathic</label>
                            <label><input type="radio" name="facial_profile" value="Prognathic" id="facial_profile_prognathic" onChange={handleInputChange} checked={getFieldValue('facial_profile') === 'Prognathic'} /> Prognathic</label>
                        </div>
                        <div className="form-group">
                            <label>c) Facial form: (House and Loop, Frush and Fischer, Leon Williams)</label>
                        </div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="facial_form" value="Square" id="facial_form_square" onChange={handleInputChange} checked={getFieldValue('facial_form') === 'Square'} /> Square</label>
                            <label><input type="radio" name="facial_form" value="Square-tapering" id="facial_form_square_tapering" onChange={handleInputChange} checked={getFieldValue('facial_form') === 'Square-tapering'} /> Square-tapering</label>
                            <label><input type="radio" name="facial_form" value="Tapering" id="facial_form_tapering" onChange={handleInputChange} checked={getFieldValue('facial_form') === 'Tapering'} /> Tapering</label>
                            <label><input type="radio" name="facial_form" value="Ovoid" id="facial_form_ovoid" onChange={handleInputChange} checked={getFieldValue('facial_form') === 'Ovoid'} /> Ovoid</label>
                        </div>
                        <h3>d) TMJ examination:</h3>
                        <h4>1. Inspection:</h4>
                        <div className="form-group">
                            <label htmlFor="max_mouth_opening">a) Maximum mouth opening:</label>
                            <input type="text" id="max_mouth_opening" name="max_mouth_opening" placeholder="mm" onChange={handleInputChange} value={getFieldValue('max_mouth_opening')} />
                        </div>
                        <div className="form-group">
                            <label>b) Deviation of mandible:</label>
                            <div className="radio-group">
                                <label><input type="radio" name="deviation_mandible" value="Yes" id="deviation_mandible_yes" onChange={handleInputChange} checked={getFieldValue('deviation_mandible') === 'Yes'} /> Yes</label>
                                <label><input type="radio" name="deviation_mandible" value="No" id="deviation_mandible_no" onChange={handleInputChange} checked={getFieldValue('deviation_mandible') === 'No'} /> No</label>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Opening:</label>
                            <div className="radio-group">
                                <label><input type="radio" name="deviation_opening" value="left" id="deviation_opening_left" onChange={handleInputChange} checked={getFieldValue('deviation_opening') === 'left'} /> Deviation to left</label>
                                <label><input type="radio" name="deviation_opening" value="right" id="deviation_opening_right" onChange={handleInputChange} checked={getFieldValue('deviation_opening') === 'right'} /> Deviation to right</label>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Closing:</label>
                            <div className="radio-group">
                                <label><input type="radio" name="deviation_closing" value="left" id="deviation_closing_left" onChange={handleInputChange} checked={getFieldValue('deviation_closing') === 'left'} /> Deviation to left</label>
                                <label><input type="radio" name="deviation_closing" value="right" id="deviation_closing_right" onChange={handleInputChange} checked={getFieldValue('deviation_closing') === 'right'} /> Deviation to right</label>
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

                    {/* Page 1: Intraoral Examination / Tongue / Saliva */}
                    <div className={`page ${currentPage === 1 ? 'active' : ''}`}>
                        <h2>Oral Examination Form</h2>
                        <h3>A. Extraoral Examination:</h3> {/* Continues from Page 0, but included here for flow */}
                        <div className="form-group">
                            <label htmlFor="lips_b">b) Lips:</label>
                            <input type="text" id="lips_b" name="lips_b" onChange={handleInputChange} value={getFieldValue('lips_b')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="competency">Competency:</label>
                            <input type="text" id="competency" name="competency" onChange={handleInputChange} value={getFieldValue('competency')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lip_length">Lip length:</label>
                            <input type="text" id="lip_length" name="lip_length" onChange={handleInputChange} value={getFieldValue('lip_length')} />
                        </div>
                        <div className="form-group">
                            <label>Lip line:</label>
                        </div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="lip_line" value="High" id="lip_line_high" onChange={handleInputChange} checked={getFieldValue('lip_line') === 'High'} /> High</label>
                            <label><input type="radio" name="lip_line" value="Medium" id="lip_line_medium" onChange={handleInputChange} checked={getFieldValue('lip_line') === 'Medium'} /> Medium</label>
                            <label><input type="radio" name="lip_line" value="Low" id="lip_line_low" onChange={handleInputChange} checked={getFieldValue('lip_line') === 'Low'} /> Low</label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="pathology_any">Pathology if any:</label>
                            <input type="text" id="pathology_any" name="pathology_any" onChange={handleInputChange} value={getFieldValue('pathology_any')} />
                        </div>
                        <div className="form-group">
                            <label>c) Extra oral muscle tone: (M.M. House classification)</label>
                        </div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="muscle_tone" value="Class I" id="muscle_tone_class_i" onChange={handleInputChange} checked={getFieldValue('muscle_tone') === 'Class I'} /> Class I</label>
                            <label><input type="radio" name="muscle_tone" value="Class II" id="muscle_tone_class_ii" onChange={handleInputChange} checked={getFieldValue('muscle_tone') === 'Class II'} /> Class II</label>
                            <label><input type="radio" name="muscle_tone" value="Class III" id="muscle_tone_class_iii" onChange={handleInputChange} checked={getFieldValue('muscle_tone') === 'Class III'} /> Class III</label>
                        </div>

                        <h3>B. Intraoral examination:</h3>
                        <div className="form-group">
                            <label>a) Buccal mucosa:</label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="buccal_mucosa_colour">Colour:</label>
                            <input type="text" id="buccal_mucosa_colour" name="buccal_mucosa_colour" onChange={handleInputChange} value={getFieldValue('buccal_mucosa_colour')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="buccal_mucosa_texture">Texture:</label>
                            <input type="text" id="buccal_mucosa_texture" name="buccal_mucosa_texture" onChange={handleInputChange} value={getFieldValue('buccal_mucosa_texture')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="buccal_mucosa_others">Others:</label>
                            <input type="text" id="buccal_mucosa_others" name="buccal_mucosa_others" onChange={handleInputChange} value={getFieldValue('buccal_mucosa_others')} />
                        </div>
                        <div className="form-group">
                            <label>b) Floor of the mouth:</label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="floor_mouth_colour">Colour:</label>
                            <input type="text" id="floor_mouth_colour" name="floor_mouth_colour" onChange={handleInputChange} value={getFieldValue('floor_mouth_colour')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="floor_mouth_others">Others:</label>
                            <input type="text" id="floor_mouth_others" name="floor_mouth_others" onChange={handleInputChange} value={getFieldValue('floor_mouth_others')} />
                        </div>
                        <div className="form-group">
                            <label>c) Hard palate:</label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="hard_palate_arch">High arched/normal:</label>
                            <input type="text" id="hard_palate_arch" name="hard_palate_arch" onChange={handleInputChange} value={getFieldValue('hard_palate_arch')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="hard_palate_tori">Tori:</label>
                            <input type="text" id="hard_palate_tori" name="hard_palate_tori" onChange={handleInputChange} value={getFieldValue('hard_palate_tori')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="hard_palate_hyperplasia">Hyperplasia:</label>
                            <input type="text" id="hard_palate_hyperplasia" name="hard_palate_hyperplasia" onChange={handleInputChange} value={getFieldValue('hard_palate_hyperplasia')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="hard_palate_inflammation">Inflammation:</label>
                            <input type="text" id="hard_palate_inflammation" name="hard_palate_inflammation" onChange={handleInputChange} value={getFieldValue('hard_palate_inflammation')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="hard_palate_others">Others:</label>
                            <input type="text" id="hard_palate_others" name="hard_palate_others" onChange={handleInputChange} value={getFieldValue('hard_palate_others')} />
                        </div>
                        <div className="form-group">
                            <label>d) Soft palate:</label>
                        </div>
                        <div className="form-group">
                            <label>Soft palatal form (Sheldon Winkler)</label>
                        </div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="soft_palate_form" value="Class I" id="soft_palate_form_class_i" onChange={handleInputChange} checked={getFieldValue('soft_palate_form') === 'Class I'} /> Class I</label>
                            <label><input type="radio" name="soft_palate_form" value="Class II" id="soft_palate_form_class_ii" onChange={handleInputChange} checked={getFieldValue('soft_palate_form') === 'Class II'} /> Class II</label>
                            <label><input type="radio" name="soft_palate_form" value="Class III" id="soft_palate_form_class_iii" onChange={handleInputChange} checked={getFieldValue('soft_palate_form') === 'Class III'} /> Class III</label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="soft_palate_colour">Colour:</label>
                            <input type="text" id="soft_palate_colour" name="soft_palate_colour" onChange={handleInputChange} value={getFieldValue('soft_palate_colour')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="soft_palate_others">Others:</label>
                            <input type="text" id="soft_palate_others" name="soft_palate_others" onChange={handleInputChange} value={getFieldValue('soft_palate_others')} />
                        </div>
                    </div>

                    {/* Page 2: Tongue / Saliva / Gingival Index */}
                    <div className={`page ${currentPage === 2 ? 'active' : ''}`}>
                        <div className="form-group">
                            <label>e) Tongue:</label>
                        </div>
                        <div className="form-group">
                            <label>Size:</label>
                        </div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="tongue_size" value="Class I" id="tongue_size_class_i" onChange={handleInputChange} checked={getFieldValue('tongue_size') === 'Class I'} /> Class I</label>
                            <label><input type="radio" name="tongue_size" value="Class II" id="tongue_size_class_ii" onChange={handleInputChange} checked={getFieldValue('tongue_size') === 'Class II'} /> Class II</label>
                            <label><input type="radio" name="tongue_size" value="Class III" id="tongue_size_class_iii" onChange={handleInputChange} checked={getFieldValue('tongue_size') === 'Class III'} /> Class III</label>
                        </div>
                        <div className="form-group">
                            <label>Tongue position (Wright's Classification):</label>
                        </div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="tongue_position" value="Class I" id="tongue_position_class_i" onChange={handleInputChange} checked={getFieldValue('tongue_position') === 'Class I'} /> Class I</label>
                            <label><input type="radio" name="tongue_position" value="Class II" id="tongue_position_class_ii" onChange={handleInputChange} checked={getFieldValue('tongue_position') === 'Class II'} /> Class II</label>
                            <label><input type="radio" name="tongue_position" value="Class III" id="tongue_position_class_iii" onChange={handleInputChange} checked={getFieldValue('tongue_position') === 'Class III'} /> Class III</label>
                        </div>
                        <div className="form-group">
                            <label>Mobility:</label>
                        </div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="tongue_mobility" value="Normal" id="tongue_mobility_normal" onChange={handleInputChange} checked={getFieldValue('tongue_mobility') === 'Normal'} /> Normal</label>
                            <label><input type="radio" name="tongue_mobility" value="Reduced (tongue tie)" id="tongue_mobility_reduced" onChange={handleInputChange} checked={getFieldValue('tongue_mobility') === 'Reduced (tongue tie)'} /> Reduced (tongue tie)</label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="tongue_others">Others:</label>
                            <input type="text" id="tongue_others" name="tongue_others" onChange={handleInputChange} value={getFieldValue('tongue_others')} />
                        </div>
                        <div className="form-group">
                            <label>f) Saliva: (M.M. House classification)</label>
                        </div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="saliva" value="Class I" id="saliva_class_i" onChange={handleInputChange} checked={getFieldValue('saliva') === 'Class I'} /> Class I</label>
                            <label><input type="radio" name="saliva" value="Class II" id="saliva_class_ii" onChange={handleInputChange} checked={getFieldValue('saliva') === 'Class II'} /> Class II</label>
                            <label><input type="radio" name="saliva" value="Class III" id="saliva_class_iii" onChange={handleInputChange} checked={getFieldValue('saliva') === 'Class III'} /> Class III</label>
                        </div>
                        <div className="form-group"><label>g) Gingival index: (Loe and Silness)</label></div>
                        <div className="table-container">
                            <table className="data-table treatment-log-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center' }} colSpan="5">Distal</th>
                                        <th style={{ textAlign: 'center' }} colSpan="5">Mesial</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>Buccal</td>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <td key={`buccal_input_${i}`}><input type="text" name={`buccal_input_${i}`} onChange={handleInputChange} value={getFieldValue(`buccal_input_${i}`)} /></td>)}
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>Palatal</td>
                                        <td colSpan="3"><input type="text" name="palatal_input_1" onChange={handleInputChange} value={getFieldValue('palatal_input_1')} /></td>
                                        <td colSpan="3"><input type="text" name="palatal_input_2" onChange={handleInputChange} value={getFieldValue('palatal_input_2')} /></td>
                                        <td colSpan="3"><input type="text" name="palatal_input_3" onChange={handleInputChange} value={getFieldValue('palatal_input_3')} /></td>
                                    </tr>
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center' }}>16</td>
                                        <td colSpan="3" style={{ textAlign: 'center' }}>12</td>
                                        <td colSpan="3" style={{ textAlign: 'center' }}>24</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center' }} colSpan="5">Distal</th>
                                        <th style={{ textAlign: 'center' }} colSpan="5">Mesial</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Buccal</td>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <td key={`buccal_field_${i}`}><input type="text" name={`buccal_field_${i}`} onChange={handleInputChange} value={getFieldValue(`buccal_field_${i}`)} /></td>)}
                                    </tr>
                                    <tr>
                                        <td>Lingual</td>
                                        <td colSpan="3"><input type="text" name="lingual_field_1" onChange={handleInputChange} value={getFieldValue('lingual_field_1')} /></td>
                                        <td colSpan="3"><input type="text" name="lingual_field_2" onChange={handleInputChange} value={getFieldValue('lingual_field_2')} /></td>
                                        <td colSpan="3"><input type="text" name="lingual_field_3" onChange={handleInputChange} value={getFieldValue('lingual_field_3')} /></td>
                                    </tr>
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center' }}>36</td>
                                        <td colSpan="3" style={{ textAlign: 'center' }}>32</td>
                                        <td colSpan="3" style={{ textAlign: 'center' }}>44</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group"><label>Calculations:</label></div>
                        <div className="form-group">
                            <label htmlFor="gingival_index">Gingival index =</label>
                            <input type="text" id="gingival_index" name="gingival_index" onChange={handleInputChange} value={getFieldValue('gingival_index')} />
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Interpretation</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td>Mild gingivitis</td><td>0.1 to 1.0</td></tr>
                                    <tr><td>Moderate gingivitis</td><td>1.1 to 2.0</td></tr>
                                    <tr><td>Severe gingivitis</td><td>2.1 to 3.0</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Page 3: OHI-S / DMF / Periodontal Status */}
                    <div className={`page ${currentPage === 3 ? 'active' : ''}`}>
                        <div className="form-group"><label>h) Oral hygiene index - Simplified: (Green and Vermillion)</label></div>
                        <div className="form-group"><label>i. Debris score =</label></div>
                        <div className="table-container">
                            <table className="data-table">
                                <tbody>
                                    <tr><td style={{ textAlign: 'center' }}>16</td><td style={{ textAlign: 'center' }}>11</td><td style={{ textAlign: 'center' }}>26</td></tr>
                                    <tr>
                                        <td><input type="text" id="debris_score_16_top" name="debris_score_16_top" onChange={handleInputChange} value={getFieldValue('debris_score_16_top')} /></td>
                                        <td><input type="text" id="debris_score_11_top" name="debris_score_11_top" onChange={handleInputChange} value={getFieldValue('debris_score_11_top')} /></td>
                                        <td><input type="text" id="debris_score_26_top" name="debris_score_26_top" onChange={handleInputChange} value={getFieldValue('debris_score_26_top')} /></td>
                                    </tr>
                                    <tr>
                                        <td><input type="text" id="debris_score_16_bottom" name="debris_score_16_bottom" onChange={handleInputChange} value={getFieldValue('debris_score_16_bottom')} /></td>
                                        <td><input type="text" id="debris_score_11_bottom" name="debris_score_11_bottom" onChange={handleInputChange} value={getFieldValue('debris_score_11_bottom')} /></td>
                                        <td><input type="text" id="debris_score_26_bottom" name="debris_score_26_bottom" onChange={handleInputChange} value={getFieldValue('debris_score_26_bottom')} /></td>
                                    </tr>
                                    <tr><td style={{ textAlign: 'center' }}>46</td><td style={{ textAlign: 'center' }}>31</td><td style={{ textAlign: 'center' }}>36</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group"><label>ii. Calculus score =</label></div>
                        <div className="table-container">
                            <table className="data-table">
                                <tbody>
                                    <tr><td style={{ textAlign: 'center' }}>16</td><td style={{ textAlign: 'center' }}>11</td><td style={{ textAlign: 'center' }}>26</td></tr>
                                    <tr>
                                        <td><input type="text" id="calculus_score_16_top" name="calculus_score_16_top" onChange={handleInputChange} value={getFieldValue('calculus_score_16_top')} /></td>
                                        <td><input type="text" id="calculus_score_11_top" name="calculus_score_11_top" onChange={handleInputChange} value={getFieldValue('calculus_score_11_top')} /></td>
                                        <td><input type="text" id="calculus_score_26_top" name="calculus_score_26_top" onChange={handleInputChange} value={getFieldValue('calculus_score_26_top')} /></td>
                                    </tr>
                                    <tr>
                                        <td><input type="text" id="calculus_score_16_bottom" name="calculus_score_16_bottom" onChange={handleInputChange} value={getFieldValue('calculus_score_16_bottom')} /></td>
                                        <td><input type="text" id="calculus_score_11_bottom" name="calculus_score_11_bottom" onChange={handleInputChange} value={getFieldValue('calculus_score_11_bottom')} /></td>
                                        <td><input type="text" id="calculus_score_26_bottom" name="calculus_score_26_bottom" onChange={handleInputChange} value={getFieldValue('calculus_score_26_bottom')} /></td>
                                    </tr>
                                    <tr><td style={{ textAlign: 'center' }}>46</td><td style={{ textAlign: 'center' }}>31</td><td style={{ textAlign: 'center' }}>36</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group">
                            <label htmlFor="oral_hygiene_index_s">Oral hygiene index-S = Debris index-s + Calculus index-s =</label>
                            <input type="text" id="oral_hygiene_index_s" name="oral_hygiene_index_s" onChange={handleInputChange} value={getFieldValue('oral_hygiene_index_s')} />
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Interpretation</th><th></th></tr>
                                </thead>
                                <tbody>
                                    <tr><td>Good</td><td>0.0 to 1.2</td></tr>
                                    <tr><td>Fair</td><td>1.3 to 3.0</td></tr>
                                    <tr><td>Poor</td><td>3.1 to 6.0</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group"><label>i) DMF index: (H.T. Klein, C.E. Palmer, J.W. Knutson)</label></div>
                        <div className="table-container">
                            <table className="data-table">
                                <tbody>
                                    <tr>
                                        <td>MAX</td>
                                        {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`max_${num}`}><input type="text" id={`max_${num}`} name={`max_${num}`} onChange={handleInputChange} value={getFieldValue(`max_${num}`)} /></td>)}
                                    </tr>
                                    <tr>
                                        <td></td>
                                        {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                    </tr>
                                    <tr>
                                        <td>MAND</td>
                                        {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`mand_${num}`}><input type="text" id={`mand_${num}`} name={`mand_${num}`} onChange={handleInputChange} value={getFieldValue(`mand_${num}`)} /></td>)}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group"><label>j) Periodontal status of the existing dentition:</label></div>
                        <div className="form-group"><label>Mobility (Miller's Classification):</label></div>
                        <div className="table-container">
                            <table className="data-table">
                                <tbody>
                                    <tr>
                                        <td>MAX</td>
                                        {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`mobility_max_${num}`}><input type="text" id={`mobility_max_${num}`} name={`mobility_max_${num}`} onChange={handleInputChange} value={getFieldValue(`mobility_max_${num}`)} /></td>)}
                                    </tr>
                                    <tr>
                                        <td></td>
                                        {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`mobility_max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                    </tr>
                                    <tr>
                                        <td>MAND</td>
                                        {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`mobility_mand_${num}`}><input type="text" id={`mobility_mand_${num}`} name={`mobility_mand_${num}`} onChange={handleInputChange} value={getFieldValue(`mobility_mand_${num}`)} /></td>)}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Page 4: Furcation / Recession / Pockets / Tooth Loss */}
                    <div className={`page ${currentPage === 4 ? 'active' : ''}`}>
                        <div className="form-group"><label>Furcation involvement (Glickman's Classification):</label></div>
                        <div className="table-container">
                            <table className="data-table">
                                <tbody>
                                    <tr>
                                        <td>MAX</td>
                                        {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`furcation_max_${num}`}><input type="text" id={`furcation_max_${num}`} name={`furcation_max_${num}`} onChange={handleInputChange} value={getFieldValue(`furcation_max_${num}`)} /></td>)}
                                    </tr>
                                    <tr>
                                        <td></td>
                                        {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`furcation_max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                    </tr>
                                    <tr>
                                        <td>MAND</td>
                                        {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`furcation_mand_${num}`}><input type="text" id={`furcation_mand_${num}`} name={`furcation_mand_${num}`} onChange={handleInputChange} value={getFieldValue(`furcation_mand_${num}`)} /></td>)}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group"><label>Recession (Miller's Classification):</label></div>
                        <div className="table-container">
                            <table className="data-table">
                                <tbody>
                                    <tr>
                                        <td>MAX</td>
                                        {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`recession_max_${num}`}><input type="text" id={`recession_max_${num}`} name={`recession_max_${num}`} onChange={handleInputChange} value={getFieldValue(`recession_max_${num}`)} /></td>)}
                                    </tr>
                                    <tr>
                                        <td></td>
                                        {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`recession_max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                    </tr>
                                    <tr>
                                        <td>MAND</td>
                                        {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`recession_mand_${num}`}><input type="text" id={`recession_mand_${num}`} name={`recession_mand_${num}`} onChange={handleInputChange} value={getFieldValue(`recession_mand_${num}`)} /></td>)}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group"><label>Periodontal pockets (in mm)</label></div>
                        <div className="table-container">
                            <table className="data-table">
                                <tbody>
                                    <tr>
                                        <td>MAX</td>
                                        {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`pocket_max_${num}`}><input type="text" id={`pocket_max_${num}`} name={`pocket_max_${num}`} onChange={handleInputChange} value={getFieldValue(`pocket_max_${num}`)} /></td>)}
                                    </tr>
                                    <tr>
                                        <td></td>
                                        {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`pocket_max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                    </tr>
                                    <tr>
                                        <td>MAND</td>
                                        {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`pocket_mand_${num}`}><input type="text" id={`pocket_mand_${num}`} name={`pocket_mand_${num}`} onChange={handleInputChange} value={getFieldValue(`pocket_mand_${num}`)} /></td>)}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group">
                            <label htmlFor="other_periodontal_findings">Others periodontal findings:</label>
                            <input type="text" id="other_periodontal_findings" name="other_periodontal_findings" onChange={handleInputChange} value={getFieldValue('other_periodontal_findings')} />
                        </div>
                        <div className="form-group">
                            <label>k) Loss of tooth structure:</label>
                        </div>
                        <div className="form-group checkbox-group">
                            <label><input type="checkbox" name="tooth_loss_abrasion" id="tooth_loss_abrasion" onChange={handleInputChange} checked={getFieldValue('tooth_loss_abrasion')} /> Abrasion</label>
                            <label><input type="checkbox" name="tooth_loss_occlusal_wear" id="tooth_loss_occlusal_wear" onChange={handleInputChange} checked={getFieldValue('tooth_loss_occlusal_wear')} /> Occlusal wear / attrition</label>
                            <label><input type="checkbox" name="tooth_loss_erosion" id="tooth_loss_erosion" onChange={handleInputChange} checked={getFieldValue('tooth_loss_erosion')} /> Erosion</label>
                            <label><input type="checkbox" name="tooth_loss_abfraction" id="tooth_loss_abfraction" onChange={handleInputChange} checked={getFieldValue('tooth_loss_abfraction')} /> Abfraction</label>
                        </div>
                    </div>

                    {/* Page 5: Edentulous Ridge / Occlusion */}
                    <div className={`page ${currentPage === 5 ? 'active' : ''}`}>
                        <div className="form-group"><label>l) Anatomic and functional status of edentulous ridge:</label></div>
                        <div className="form-group">
                            <label htmlFor="mucosa">Mucosa:</label>
                            <input type="text" id="mucosa" name="mucosa" onChange={handleInputChange} value={getFieldValue('mucosa')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="mucosa_colour">Colour:</label>
                            <input type="text" id="mucosa_colour" name="mucosa_colour" onChange={handleInputChange} value={getFieldValue('mucosa_colour')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="mucosa_consistency">Consistency:</label>
                            <input type="text" id="mucosa_consistency" name="mucosa_consistency" onChange={handleInputChange} value={getFieldValue('mucosa_consistency')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="mucosa_thickness">Thickness:</label>
                            <input type="text" id="mucosa_thickness" name="mucosa_thickness" onChange={handleInputChange} value={getFieldValue('mucosa_thickness')} />
                        </div>
                        <div className="form-group"><label>Ridge classification (Siebert's classification):</label></div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="ridge_classification" value="Class I" id="ridge_classification_class_i" onChange={handleInputChange} checked={getFieldValue('ridge_classification') === 'Class I'} /> Class I</label>
                            <label><input type="radio" name="ridge_classification" value="Class II" id="ridge_classification_class_ii" onChange={handleInputChange} checked={getFieldValue('ridge_classification') === 'Class II'} /> Class II</label>
                            <label><input type="radio" name="ridge_classification" value="Class III" id="ridge_classification_class_iii" onChange={handleInputChange} checked={getFieldValue('ridge_classification') === 'Class III'} /> Class III</label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="ridge_height">Height of the ridge:</label>
                            <input type="text" id="ridge_height" name="ridge_height" onChange={handleInputChange} value={getFieldValue('ridge_height')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="ridge_length">Length (mesio distal):</label>
                            <input type="text" id="ridge_length" name="ridge_length" onChange={handleInputChange} value={getFieldValue('ridge_length')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="ridge_width">Width (bucco lingual):</label>
                            <input type="text" id="ridge_width" name="ridge_width" onChange={handleInputChange} value={getFieldValue('ridge_width')} />
                        </div>

                        <div className="form-group"><label>m) Occlusion:</label></div>
                        <div className="form-group">
                            <label htmlFor="molar_relation">Molar relation (Angle's Classification):</label>
                            <input type="text" id="molar_relation" name="molar_relation_page5" onChange={handleInputChange} value={getFieldValue('molar_relation_page5')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="occlusal_plane_discrepancies">Occlusal plane discrepancies:</label>
                            <input type="text" id="occlusal_plane_discrepancies" name="occlusal_plane_discrepancies" onChange={handleInputChange} value={getFieldValue('occlusal_plane_discrepancies')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="drifting_of_teeth">Drifting of teeth:</label>
                            <input type="text" id="drifting_of_teeth" name="drifting_of_teeth" onChange={handleInputChange} value={getFieldValue('drifting_of_teeth')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="supra_eruption_intrusion">Supra eruption / intrusion:</label>
                            <input type="text" id="supra_eruption_intrusion" name="supra_eruption_intrusion" onChange={handleInputChange} value={getFieldValue('supra_eruption_intrusion')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="rotation">Rotation:</label>
                            <input type="text" id="rotation" name="rotation" onChange={handleInputChange} value={getFieldValue('rotation')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="overjet">Overjet:</label>
                            <input type="text" id="overjet" name="overjet_page5" onChange={handleInputChange} value={getFieldValue('overjet_page5')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="overbite">Overbite:</label>
                            <input type="text" id="overbite" name="overbite_page5" onChange={handleInputChange} value={getFieldValue('overbite_page5')} />
                        </div>
                        <div className="form-group"><label>Existing occlusal scheme:</label></div>
                        <div className="form-group radio-group">
                            <label><input type="radio" name="occlusal_scheme" value="Group function" id="occlusal_scheme_group_function" onChange={handleInputChange} checked={getFieldValue('occlusal_scheme') === 'Group function'} /> Group function</label>
                            <label><input type="radio" name="occlusal_scheme" value="Canine guided" id="occlusal_scheme_canine_guided" onChange={handleInputChange} checked={getFieldValue('occlusal_scheme') === 'Canine guided'} /> Canine guided</label>
                            <label><input type="radio" name="occlusal_scheme" value="Bilateral balanced" id="occlusal_scheme_bilateral_balanced" onChange={handleInputChange} checked={getFieldValue('occlusal_scheme') === 'Bilateral balanced'} /> Bilateral balanced</label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="occlusion_others">Others:</label>
                            <input type="text" id="occlusion_others" name="occlusion_others" onChange={handleInputChange} value={getFieldValue('occlusion_others')} />
                        </div>
                    </div>

                    {/* Page 6: Abutment Evaluation / Investigations / Treatment Planning */}
                    <div className={`page ${currentPage === 6 ? 'active' : ''}`}>
                        <h2>2. Abutment evaluation:</h2>
                        <div className="form-group"><label>a) Clinical evaluation:</label></div>
                        <div className="table-container">
                            <table className="data-table">
                                <tbody>
                                    <tr><td>Clinical crown height</td><td><input type="text" id="clinical_crown_height" name="clinical_crown_height" onChange={handleInputChange} value={getFieldValue('clinical_crown_height')} /></td></tr>
                                    <tr><td>Crown morphology</td><td><input type="text" id="crown_morphology" name="crown_morphology" onChange={handleInputChange} value={getFieldValue('crown_morphology')} /></td></tr>
                                    <tr><td>Vitality</td><td><input type="text" id="vitality" name="vitality" onChange={handleInputChange} value={getFieldValue('vitality')} /></td></tr>
                                    <tr><td>Mobility</td><td><input type="text" id="mobility_clinical" name="mobility_clinical" onChange={handleInputChange} value={getFieldValue('mobility_clinical')} /></td></tr>
                                    <tr><td>Probing depth</td><td><input type="text" id="probing_depth" name="probing_depth" onChange={handleInputChange} value={getFieldValue('probing_depth')} /></td></tr>
                                    <tr><td>Bleeding on probing</td><td><input type="text" id="bleeding_on_probing" name="bleeding_on_probing" onChange={handleInputChange} value={getFieldValue('bleeding_on_probing')} /></td></tr>
                                    <tr><td>Recession</td><td><input type="text" id="recession_clinical" name="recession_clinical" onChange={handleInputChange} value={getFieldValue('recession_clinical')} /></td></tr>
                                    <tr><td>Furcation involvement</td><td><input type="text" id="furcation_involvement_clinical" name="furcation_involvement_clinical" onChange={handleInputChange} value={getFieldValue('furcation_involvement_clinical')} /></td></tr>
                                    <tr><td>Axial inclination</td><td><input type="text" id="axial_inclination" name="axial_inclination" onChange={handleInputChange} value={getFieldValue('axial_inclination')} /></td></tr>
                                    <tr><td>Rotations</td><td><input type="text" id="rotations_clinical" name="rotations_clinical" onChange={handleInputChange} value={getFieldValue('rotations_clinical')} /></td></tr>
                                    <tr><td>Pain on percussion</td><td><input type="text" id="pain_on_percussion" name="pain_on_percussion" onChange={handleInputChange} value={getFieldValue('pain_on_percussion')} /></td></tr>
                                    <tr><td>Presence of restorations</td><td><input type="text" id="presence_of_restorations" name="presence_of_restorations" onChange={handleInputChange} value={getFieldValue('presence_of_restorations')} /></td></tr>
                                    <tr><td>Caries</td><td><input type="text" id="caries_clinical" name="caries_clinical" onChange={handleInputChange} value={getFieldValue('caries_clinical')} /></td></tr>
                                    <tr><td>Supra eruption/ intrusion</td><td><input type="text" id="supra_eruption_intrusion_clinical" name="supra_eruption_intrusion_clinical" onChange={handleInputChange} value={getFieldValue('supra_eruption_intrusion_clinical')} /></td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="form-group"><label>b) Radiographic evaluation:</label></div>
                        <div className="table-container">
                            <table className="data-table">
                                <tbody>
                                    <tr><td>Peri apical status</td><td><input type="text" id="periapical_status_rad" name="periapical_status_rad" onChange={handleInputChange} value={getFieldValue('periapical_status_rad')} /></td></tr>
                                    <tr><td>Lamina dura</td><td><input type="text" id="lamina_dura_rad" name="lamina_dura_rad" onChange={handleInputChange} value={getFieldValue('lamina_dura_rad')} /></td></tr>
                                    <tr><td>Crown height</td><td><input type="text" id="crown_height_rad" name="crown_height_rad" onChange={handleInputChange} value={getFieldValue('crown_height_rad')} /></td></tr>
                                    <tr><td>Root length</td><td><input type="text" id="root_length_rad" name="root_length_rad" onChange={handleInputChange} value={getFieldValue('root_length_rad')} /></td></tr>
                                    <tr><td>Bone</td><td><input type="text" id="bone_rad" name="bone_rad" onChange={handleInputChange} value={getFieldValue('bone_rad')} /></td></tr>
                                    <tr><td>Crown root ratio</td><td><input type="text" id="crown_root_ratio_rad" name="crown_root_ratio_rad" onChange={handleInputChange} value={getFieldValue('crown_root_ratio_rad')} /></td></tr>
                                    <tr><td>Coronal/ proximal radioleucency</td><td><input type="text" id="coronal_proximal_radioleucency_rad" name="coronal_proximal_radioleucency_rad" onChange={handleInputChange} value={getFieldValue('coronal_proximal_radioleucency_rad')} /></td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>3. Other investigations:</h2>
                        <div className="form-group">
                            <label htmlFor="opg_investigation">OPG:</label>
                            <input type="text" id="opg_investigation" name="opg_investigation" onChange={handleInputChange} value={getFieldValue('opg_investigation')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="other_investigations">OTHERS:</label>
                            <input type="text" id="other_investigations" name="other_investigations" onChange={handleInputChange} value={getFieldValue('other_investigations')} />
                        </div>

                        <h2>4. Treatment planning:</h2>
                        <div className="form-group">
                            <label htmlFor="treatment_surgery">Surgery:</label>
                            <input type="text" id="treatment_surgery" name="treatment_surgery" onChange={handleInputChange} value={getFieldValue('treatment_surgery')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="treatment_endodontic_restorations">Endodontic treatment/Restorations:</label>
                            <input type="text" id="treatment_endodontic_restorations" name="treatment_endodontic_restorations" onChange={handleInputChange} value={getFieldValue('treatment_endodontic_restorations')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="treatment_periodontal">Periodontal treatment:</label>
                            <input type="text" id="treatment_periodontal" name="treatment_periodontal" onChange={handleInputChange} value={getFieldValue('treatment_periodontal')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="treatment_orthodontic">Orthodontic treatment:</label>
                            <input type="text" id="treatment_orthodontic" name="treatment_orthodontic" onChange={handleInputChange} value={getFieldValue('treatment_orthodontic')} />
                        </div>
                        <div className="form-group"><label style={{ fontSize: '1.5em' }}>Prosthodontic</label></div>
                        <div className="form-group">
                            <label htmlFor="prosthodontic_type_of_fpd">Type of FPD:</label>
                            <input type="text" id="prosthodontic_type_of_fpd" name="prosthodontic_type_of_fpd" onChange={handleInputChange} value={getFieldValue('prosthodontic_type_of_fpd')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="prosthodontic_abutments">Abutments:</label>
                            <input type="text" id="prosthodontic_abutments" name="prosthodontic_abutments" onChange={handleInputChange} value={getFieldValue('prosthodontic_abutments')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="prosthodontic_type_of_retainers">Type of retainers:</label>
                            <input type="text" id="prosthodontic_type_of_retainers" name="prosthodontic_type_of_retainers" onChange={handleInputChange} value={getFieldValue('prosthodontic_type_of_retainers')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="prosthodontic_type_of_pontic">Type of pontic:</label>
                            <input type="text" id="prosthodontic_type_of_pontic" name="prosthodontic_type_of_pontic" onChange={handleInputChange} value={getFieldValue('prosthodontic_type_of_pontic')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="prosthodontic_proposed_occlusal_scheme">Proposed occlusal scheme:</label>
                            <input type="text" id="prosthodontic_proposed_occlusal_scheme" name="prosthodontic_proposed_occlusal_scheme" onChange={handleInputChange} value={getFieldValue('prosthodontic_proposed_occlusal_scheme')} />
                        </div>
                    </div>

                    {/* Page 7: Treatment Procedure Table (includes signature + submit) */}
                    <div className={`page ${currentPage === totalPages ? 'active' : ''}`}>
                        <h2>5. Treatment Procedure Log:</h2>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>S.No.</th>
                                        <th>TREATMENT PROCEDURE</th>
                                        <th>DATE</th>
                                        <th>GRADE</th>
                                        <th>STAFF IN CHARGE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { s: 1, name: "Diagnostic impression" }, { s: 2, name: "Interocclusal records" }, { s: 3, name: "Articulation of casts" }, { s: 4, name: "Diagnostic mock up" },
                                        { s: 5, name: "Fabrication of custom tray" }, { s: 6, name: "Shade selection" }, { s: 7, name: "Tooth preparation" }, { s: 8, name: "Gingival retraction" },
                                        { s: 9, name: "Definitive impression" }, { s: 10, name: "Provisional restoration" }, { s: 11, name: "Die preparation" }, { s: 12, name: "Wax pattern" },
                                        { s: 13, name: "Sprue attachment" }, { s: 14, name: "Investing" }, { s: 15, name: "Casting" }, { s: 16, name: "Finishing of metal" },
                                        { s: 17, name: "Metal try in" }, { s: 18, name: "Ceramic build up" }, { s: 19, name: "Cementation of final prosthesis" }, { s: 20, name: "Post operative checkup-1" },
                                        { s: 21, name: "Post operative checkup-2" }
                                    ].map(item => (
                                        <tr key={item.s}>
                                            <td>{item.s}.</td>
                                            <td>{item.name}</td>
                                            <td><input type="text" name={`${item.name.toLowerCase().replace(/[\s\/]/g, '_')}_field1`} onChange={handleInputChange} value={getFieldValue(`${item.name.toLowerCase().replace(/[\s\/]/g, '_')}_field1`)} /></td>
                                            <td><input type="text" name={`${item.name.toLowerCase().replace(/[\s\/]/g, '_')}_field2`} onChange={handleInputChange} value={getFieldValue(`${item.name.toLowerCase().replace(/[\s\/]/g, '_')}_field2`)} /></td>
                                            <td><input type="text" name={`${item.name.toLowerCase().replace(/[\s\/]/g, '_')}_field3`} onChange={handleInputChange} value={getFieldValue(`${item.name.toLowerCase().replace(/[\s\/]/g, '_')}_field3`)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Signature upload moved here so submission is on same page as table */}
                        
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

                    {/* Navigation Buttons */}
                    <div className="navigation" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button type="button" onClick={handlePrev} disabled={currentPage === 0}>
                            Back
                        </button>

                        {isSignaturePage ? (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="submit-button"
                                disabled={!getFieldValue('digitalSignature')}
                            >
                                Submit 
                            </button>
                        ) : (
                            <button type="button" onClick={handleNext}>
                                {isLastContentPage ? 'Next' : 'Next'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Fpd;
