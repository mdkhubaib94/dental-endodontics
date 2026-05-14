import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './generalCaseSheet.css';
import { API_BASE_URL } from '../config/api';
import { getCurrentPatientId, getSharedXrayImage, saveSharedXrayImage } from '../utils/sharedXray';
import { clearCaseDraft, loadCaseDraft, saveCaseDraft } from '../utils/caseDraft';
import { setStoredPatientId } from '../utils/patientIdentity';

const GeneralCaseSheet = () => {
  const navigate = useNavigate();
  const DRAFT_ROUTE_KEY = '/general-case-sheet';
  const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  // State for modal
  const [modal, setModal] = useState({ isOpen: false, message: '' });

  // State for all form sections
  const [formData, setFormData] = useState({
    // General Information
    chiefComplaint: '',
    presentIllness: '',
    pastMedical: '',
    pastDental: '',
    personalHistory: '',
    familyHistory: '',
    
    // Clinical Findings
    clinicalFindings: '',
    
    // Diagnosis
    provisionalDiagnosis: '',
    investigations: '',
    finalDiagnosis: '',
    
    // Treatment Plan
    description: '',
    generalDescription: '',
    treatmentPlan: ''
  });

  // State for selected departments
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [enableTreatment, setEnableTreatment] = useState(false);
  
  // State for output visibility
  const [showOutputs, setShowOutputs] = useState({
    general: false,
    clinical: false,
    diagnosis: false,
    treatment: false
  });

  // State for X-ray upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileMessage, setFileMessage] = useState({ text: '', className: 'general-case-text-gray-200' });
  const [uploadStatus, setUploadStatus] = useState({ text: '', className: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  useEffect(() => {
    // Read patientId fresh from localStorage inside effect to catch dynamic changes
    const patientId = String(
      localStorage.getItem('CurrentpatientId') ||
      localStorage.getItem('currentPatientId') ||
      localStorage.getItem('patientId') ||
      ''
    ).trim();

    console.log('[GeneralCaseSheet] Hydration effect running, patientId:', patientId);
    setIsDraftHydrated(false);
    
    if (!patientId) {
      console.log('[GeneralCaseSheet] No patientId, setting isDraftHydrated=true immediately');
      setIsDraftHydrated(true);
      return;
    }

    let cancelled = false;
    const hydrateDraft = async () => {
      try {
        console.log('[GeneralCaseSheet] Starting async draft load');
        const draft = await loadCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });
        
        if (cancelled) {
          console.log('[GeneralCaseSheet] Hydration was cancelled');
          return;
        }
        
        if (!draft?.data) {
          console.log('[GeneralCaseSheet] No draft data found, form will use default state');
          return;
        }

        console.log('[GeneralCaseSheet] Draft loaded, applying to form');
        const draftData = draft.data;
        if (draftData.formData) {
          setFormData((prev) => ({ ...prev, ...draftData.formData }));
        }
        if (Array.isArray(draftData.selectedDepartments)) {
          setSelectedDepartments(draftData.selectedDepartments);
        }
        if (typeof draftData.enableTreatment === 'boolean') {
          setEnableTreatment(draftData.enableTreatment);
        }
        if (draftData.showOutputs && typeof draftData.showOutputs === 'object') {
          setShowOutputs((prev) => ({ ...prev, ...draftData.showOutputs }));
        }
        if (typeof draftData.previewUrl === 'string' && draftData.previewUrl.trim()) {
          setPreviewUrl(draftData.previewUrl);
        }
      } catch (error) {
        console.error('[GeneralCaseSheet] Error during draft hydration:', error);
      } finally {
        if (!cancelled) {
          console.log('[GeneralCaseSheet] Setting isDraftHydrated=true');
          setIsDraftHydrated(true);
        }
      }
    };

    hydrateDraft();

    return () => {
      console.log('[GeneralCaseSheet] Hydration effect cleanup - marking as cancelled');
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
      console.log('[GeneralCaseSheet] Autosave blocked: no patientId');
      return;
    }
    
    if (!isDraftHydrated) {
      console.log('[GeneralCaseSheet] Autosave blocked: isDraftHydrated=false');
      return;
    }

    console.log('[GeneralCaseSheet] Autosaving...', { patientId, routeKey: DRAFT_ROUTE_KEY });
    void saveCaseDraft({
      patientId,
      routeKey: DRAFT_ROUTE_KEY,
      step: enableTreatment ? 1 : 0,
      data: {
        formData,
        selectedDepartments,
        enableTreatment,
        showOutputs,
        previewUrl,
      },
    });
  }, [formData, selectedDepartments, enableTreatment, showOutputs, previewUrl, isDraftHydrated]);

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
        console.log('[GeneralCaseSheet] Before unload - saving draft immediately');
        saveCaseDraft({
          patientId,
          routeKey: DRAFT_ROUTE_KEY,
          step: enableTreatment ? 1 : 0,
          data: {
            formData,
            selectedDepartments,
            enableTreatment,
            showOutputs,
            previewUrl,
          },
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, selectedDepartments, enableTreatment, showOutputs, previewUrl, isDraftHydrated]);

  const fileInputRef = useRef(null);
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event?.target?.result || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Departments list
  const departments = [
    'Prosthodontics',
    'Pedodontics',
    'Periodontics',
    'Conservative Dentistry and Endodontics',
    'Oral and Maxillofacial'
  ];

  // Decide which page to go to after saving, based on selected department(s)
  const getNextRouteForDepartments = () => {
    // If the logged-in doctor is from the General department, always go back to dashboard
    const doctorDepartment = String(localStorage.getItem('doctorDepartment') || '').trim().toLowerCase().replace(/[_\s]+/g, '');
    if (doctorDepartment === 'general' || doctorDepartment === 'generaldentistry') {
      return '/doctor-dashboard';
    }

    // Priority: Prosthodontics, Pedodontics, Periodontics, Conservative, Oral, General
    if (selectedDepartments.includes('Prosthodontics')) {
      // Open Prosthodontics flow inside CasePortal (to choose specific prostho case sheet)
      return '/casePortal?dept=prosthodontics';
    }

    if (selectedDepartments.includes('Pedodontics')) {
      return '/pedodontics';
    }

    if (selectedDepartments.includes('Periodontics')) {
      // Open Periodontics options inside CasePortal
      return '/casePortal?dept=periodontics';
    }

    if (selectedDepartments.includes('Conservative Dentistry and Endodontics')) {
      // For now, route back to Case Portal (no separate billing form for doctors)
      return '/casePortal';
    }

    if (selectedDepartments.includes('Oral and Maxillofacial')) {
      // Open Oral & Maxillofacial options inside CasePortal
      return '/casePortal?dept=oral';
    }

    // Fallback: go to case portal if nothing matched
    return '/casePortal';
  };

  // Initialize payment status
  useEffect(() => {
    // For demo purposes, setting payment as paid
    localStorage.setItem('xrayPaymentStatus', 'paid');

    const patientId = getCurrentPatientId();
    const sharedXray = getSharedXrayImage(patientId);
    if (sharedXray?.dataUrl) {
      setPreviewUrl(sharedXray.dataUrl);
      setFileMessage({
        text: `Using previously uploaded X-Ray image${sharedXray.name ? `: ${sharedXray.name}` : ''}.`,
        className: 'general-case-text-green-400',
      });
    }
  }, []);

  // Modal functions
  const showModal = (message) => setModal({ isOpen: true, message });
  const hideModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const currentPatientId = localStorage.getItem('CurrentpatientId');
    if (!currentPatientId) return;

    let isMounted = true;
    const token = localStorage.getItem('token');

    const applyChiefComplaint = (value) => {
      const complaint = String(value || '').trim();
      if (!complaint || !isMounted) return;
      setFormData((prev) => {
        if (String(prev.chiefComplaint || '').trim()) return prev;
        return { ...prev, chiefComplaint: complaint };
      });
    };

    const fetchChiefComplaint = async () => {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      try {
        const profileEndpoints = [
          buildApiUrl(`/api/doctor-patient/${encodeURIComponent(currentPatientId)}`),
          buildApiUrl(`/api/patient-details/by-patient-id/${encodeURIComponent(currentPatientId)}`),
        ];

        for (const endpoint of profileEndpoints) {
          try {
            const response = await fetch(endpoint, { headers });
            if (!response.ok) continue;
            const json = await response.json();
            const patient = json?.data || json?.patient || json;
            const complaint = patient?.medicalInfo?.chiefComplaint;
            if (String(complaint || '').trim()) {
              applyChiefComplaint(complaint);
              return;
            }
          } catch {
            // try next endpoint fallback
          }
        }

        const generalResponse = await fetch(
          buildApiUrl(`/api/general/patient/${encodeURIComponent(currentPatientId)}`),
          { headers }
        );

        if (generalResponse.ok) {
          const generalJson = await generalResponse.json();
          const generalCases = Array.isArray(generalJson?.data) ? generalJson.data : [];
          if (generalCases.length > 0) {
            applyChiefComplaint(generalCases[0]?.chiefComplaint || '');
          }
        }
      } catch (error) {
        console.error('Failed to prefill chief complaint in General Case Sheet:', error);
      }
    };

    fetchChiefComplaint();

    return () => {
      isMounted = false;
    };
  }, []);

  // Generic input change handler
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Department selection handler - allow at most ONE department
  const handleDepartmentChange = (dept) => {
    setSelectedDepartments(prev =>
      prev.includes(dept)
        ? [] // clicking again clears selection
        : [dept] // always keep only the newly selected department
    );
  };

  // General Information submission
  const handleSubmitGeneral = () => {
    const { chiefComplaint, presentIllness, pastMedical, pastDental, personalHistory, familyHistory } = formData;

    if (!String(chiefComplaint || '').trim()) {
      showModal("Chief Complaint is required before submitting general information.");
      return;
    }

    // Optional fields can remain empty as long as chief complaint is present.
    if (!presentIllness && !pastMedical && !pastDental && !personalHistory && !familyHistory) {
      // No-op: allow save with chief complaint only.
    }

    setShowOutputs(prev => ({ ...prev, general: true }));
    showModal("General Information Submitted Successfully!");
  };

  // Clinical Findings submission
  const handleSubmitClinical = () => {
    if (!formData.clinicalFindings.trim()) {
      showModal("Please enter clinical findings before submitting.");
      return;
    }
    setShowOutputs(prev => ({ ...prev, clinical: true }));
    showModal("Clinical Findings Submitted Successfully!");
  };

  // Diagnosis submission
  const handleSubmitDiagnosis = () => {
    const { provisionalDiagnosis, investigations, finalDiagnosis } = formData;
    
    // Check if all fields are empty
    if (!provisionalDiagnosis && !investigations && !finalDiagnosis) {
      showModal("Please fill in at least one diagnosis field before submitting.");
      return;
    }

    setShowOutputs(prev => ({ ...prev, diagnosis: true }));
    showModal("Diagnosis Information Submitted Successfully!");
  };

  // Toggle treatment section
  const toggleTreatmentSection = () => {
    if (!enableTreatment && selectedDepartments.length === 0) {
      showModal("Please select at least one case sheet before continuing.");
      return;
    }
    setEnableTreatment(!enableTreatment);
  };

  // File upload handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setFileMessage({ text: '', className: 'general-case-text-gray-200' });
    setUploadStatus({ text: '', className: '' });
    setPreviewUrl('');

    if (file) {
      // Check file type
      const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validImageTypes.includes(file.type)) {
        setFileMessage({ 
          text: 'Invalid file type. Please select a PNG or JPEG image.', 
          className: 'general-case-text-red-400' 
        });
        setSelectedFile(null);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileMessage({ 
          text: `File size exceeds the 5MB limit. Your file is ${formatBytes(file.size)}.`, 
          className: 'general-case-text-red-400' 
        });
        setSelectedFile(null);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.onerror = () => {
        setFileMessage({ 
          text: 'Error reading file. Please try again.', 
          className: 'general-case-text-red-400' 
        });
        setSelectedFile(null);
      };
      reader.readAsDataURL(file);

      setFileMessage({ 
        text: 'Image selected successfully! Click "Upload Image" to proceed.', 
        className: 'general-case-text-green-400' 
      });
    } else {
      setFileMessage({ 
        text: 'No file selected.', 
        className: 'general-case-text-gray-200' 
      });
    }
  };

  const handleUpload = async () => {
    // Check payment status
    const paymentStatus = localStorage.getItem('xrayPaymentStatus');
    if (paymentStatus !== 'paid') {
      showModal('Payment is yet to be done for X-Ray. Please complete the payment.');
      setUploadStatus({ 
        text: 'Payment required for X-Ray upload.', 
        className: 'general-case-text-red-400' 
      });
      return;
    }

    if (!selectedFile) {
      setUploadStatus({ 
        text: 'No file selected for upload.', 
        className: 'general-case-text-red-400' 
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ 
      text: 'Uploading image, please wait...', 
      className: 'general-case-text-gray-200' 
    });

    try {
      const patientId = getCurrentPatientId();
      if (!patientId) {
        setUploadStatus({
          text: 'No patient selected. Please select a patient before uploading X-Ray.',
          className: 'general-case-text-red-400',
        });
        return;
      }

      const dataUrl = await fileToDataUrl(selectedFile);
      saveSharedXrayImage(patientId, {
        dataUrl,
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
      });

      setUploadStatus({
        text: `"${selectedFile.name}" uploaded successfully!`,
        className: 'general-case-text-green-400',
      });
      showModal('X-Ray image uploaded successfully!');
    } catch (error) {
      console.error('General case X-Ray upload failed:', error);
      setUploadStatus({ 
        text: 'Upload failed. Please try again.', 
        className: 'general-case-text-red-400' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Final submission - Save all data
  const handleSubmitTreatment = async () => {
    if (!Array.isArray(selectedDepartments) || selectedDepartments.length === 0) {
      showModal('Please select a specialist case sheet department.');
      return;
    }

    if (selectedDepartments.some((dept) => String(dept || '').trim().toLowerCase() === 'general')) {
      showModal('General is not a referral case-sheet department. Please select a specialist department.');
      return;
    }

    if (!formData.treatmentPlan.trim()) {
      showModal("Please enter a treatment plan.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const patientId = getCurrentPatientId();
      let sharedXray = getSharedXrayImage(String(patientId || ''));

      // Persist selected file even if user skipped explicit "Upload Image" click.
      if (!sharedXray?.dataUrl && selectedFile && patientId) {
        const dataUrl = await fileToDataUrl(selectedFile);
        saveSharedXrayImage(String(patientId), {
          dataUrl,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        });
        sharedXray = getSharedXrayImage(String(patientId));
      }
      const normalizedXrayImage = String(previewUrl || '').trim();
      const resolvedXrayImage = sharedXray?.dataUrl || normalizedXrayImage || null;

      // Prepare payload with all form data
      const payload = {
        patientId,
        patientName: localStorage.getItem('CurrentpatientName'),
        doctorId: localStorage.getItem('doctorId'),
        doctorName: localStorage.getItem('doctorName'),
        // General Information
        chiefComplaint: formData.chiefComplaint,
        presentIllness: formData.presentIllness,
        pastMedical: formData.pastMedical,
        pastDental: formData.pastDental,
        personalHistory: formData.personalHistory,
        familyHistory: formData.familyHistory,
        
        // Clinical Findings
        clinicalFindings: formData.clinicalFindings,
        
        // Diagnosis
        provisionalDiagnosis: formData.provisionalDiagnosis,
        investigations: formData.investigations,
        finalDiagnosis: formData.finalDiagnosis,
        
        // Treatment Plan
        description: formData.description,
        generalDescription: formData.generalDescription,
        treatmentPlan: formData.treatmentPlan,
        
        // Departments
        selectedDepartments,
        
        // X-ray info (if uploaded)
        xrayFile: sharedXray?.name || (selectedFile ? selectedFile.name : null),
        xrayUploaded: !!resolvedXrayImage,
        xrayImage: resolvedXrayImage
      };

      // Save to backend
      const res = await fetch(buildApiUrl('/api/general/save'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save case sheet');
      }

      await clearCaseDraft({ patientId, routeKey: DRAFT_ROUTE_KEY });

      setShowOutputs(prev => ({ ...prev, treatment: true }));
      showModal("General Case Sheet saved successfully!");

      // Navigate to the appropriate case sheet / flow based on selected department
      const nextRoute = getNextRouteForDepartments();
      setTimeout(() => {
        // If we are returning to the dashboard (General doctor flow), end the current patient context
        // so the dashboard doesn't re-open the same patient ID details.
        if (nextRoute === '/doctor-dashboard') {
          setStoredPatientId('');
          localStorage.removeItem('CurrentpatientName');
        }
        navigate(nextRoute);
      }, 2000);

    } catch (err) {
      showModal(err.message || 'Failed to save General Case Sheet. Please try again.');
    }
  };

  // Helper function to format file size
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Check if General is selected
  const isGeneralSelected = selectedDepartments.includes('General');

  return (
    <div className="general-case-sheet">
      {/* Modal */}
      {modal.isOpen && (
        <div className="general-case-modal" onClick={hideModal}>
          <div className="general-case-modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="general-case-close-button" onClick={hideModal}>&times;</span>
            <p>{modal.message}</p>
          </div>
        </div>
      )}

      {/* GENERAL INFORMATION SECTION - Logo moved inside this container */}
      <div className="general-case-container" style={{ position: 'relative' }}>
        {localStorage.getItem('CurrentpatientName') && (
          <div style={{ position: 'absolute', left: '20px', top: '20px', padding: '8px 15px', backgroundColor: 'rgba(38, 40, 107, 0.95)', borderRadius: '4px', fontSize: '0.8em', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textAlign: 'left', whiteSpace: 'nowrap' }}>
            <div><strong>{localStorage.getItem('CurrentpatientName')}</strong></div>
            {localStorage.getItem('CurrentpatientId') && <div><strong>ID:</strong> {localStorage.getItem('CurrentpatientId')}</div>}
          </div>
        )}
        {/* Logo Container inside the blue box */}
        <div className="general-case-logo-container">
          <img src="/logo.png" alt="Logo" className="general-case-logo" />
        </div>

        <h1 className="general-case-h1">GENERAL INFORMATION</h1>

        {Object.entries({
          chiefComplaint: 'Chief Complaint',
          presentIllness: 'History of Present Illness',
          pastMedical: 'Past Medical History',
          pastDental: 'Past Dental History',
          personalHistory: 'Personal History',
          familyHistory: 'Family History'
        }).map(([id, label]) => (
          <div className="general-case-form-group" key={id}>
            <label className="general-case-label">{label}:</label>
            <textarea
              id={id}
              className="general-case-textarea"
              value={formData[id]}
              onChange={handleInputChange}
              rows="4"
            />
          </div>
        ))}

        <div className="general-case-flex general-case-justify-center general-case-mt-4">
          <button 
            className="general-case-button" 
            onClick={handleSubmitGeneral}
          >
            Submit General Information
          </button>
        </div>

        {/* Output Section for General Information */}
        {showOutputs.general && (
          <div className="general-case-output">
            <h2>Submitted General Information:</h2>
            <p><strong>Chief Complaint:</strong> {formData.chiefComplaint || 'N/A'}</p>
            <p><strong>History of Present Illness:</strong> {formData.presentIllness || 'N/A'}</p>
            <p><strong>Past Medical History:</strong> {formData.pastMedical || 'N/A'}</p>
            <p><strong>Past Dental History:</strong> {formData.pastDental || 'N/A'}</p>
            <p><strong>Personal History:</strong> {formData.personalHistory || 'N/A'}</p>
            <p><strong>Family History:</strong> {formData.familyHistory || 'N/A'}</p>
          </div>
        )}
      </div>

      {/* CLINICAL FINDINGS SECTION */}
      <div className="general-case-container">
        <h1 className="general-case-h1">CLINICAL FINDINGS</h1>
        
        <div className="general-case-form-group">
          <label className="general-case-label">Enter Clinical Findings:</label>
          <textarea
            id="clinicalFindings"
            className="general-case-textarea"
            value={formData.clinicalFindings}
            onChange={handleInputChange}
            rows="10"
          />
        </div>

        <div className="general-case-flex general-case-justify-center general-case-mt-4">
          <button 
            className="general-case-button" 
            onClick={handleSubmitClinical}
          >
            Submit Clinical Findings
          </button>
        </div>

        {showOutputs.clinical && (
          <div className="general-case-output">
            <h2>Submitted Clinical Findings:</h2>
            <p>{formData.clinicalFindings}</p>
          </div>
        )}
      </div>

      {/* DIAGNOSIS AND INVESTIGATIONS SECTION */}
      <div className="general-case-container">
        <h1 className="general-case-h1">DIAGNOSIS AND INVESTIGATIONS</h1>

        {Object.entries({
          provisionalDiagnosis: 'Provisional Diagnosis',
          investigations: 'Investigations',
          finalDiagnosis: 'Final Diagnosis'
        }).map(([id, label]) => (
          <div className="general-case-form-group" key={id}>
            <label className="general-case-label">{label}:</label>
            <textarea
              id={id}
              className="general-case-textarea"
              value={formData[id]}
              onChange={handleInputChange}
              rows="4"
            />
          </div>
        ))}

        {/* X-RAY UPLOAD SECTION */}
        <div className="general-case-xray-upload-container">
          <div className="general-case-xray-upload-box">
            <h2>Upload X-Ray Image</h2>
            
            <div className="general-case-file-input-section">
              <div className="general-case-file-input-wrapper">
                <label className="general-case-label">Choose X-Ray Image:</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".png, .jpeg, .jpg"
                  onChange={handleFileChange}
                  className="general-case-file-input"
                />
              </div>
              
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className={`general-case-upload-button ${isUploading ? 'general-case-uploading' : ''}`}
              >
                {isUploading ? 'Uploading...' : 'Upload Image'}
                {isUploading && <div className="general-case-spinner"></div>}
              </button>
            </div>

            {fileMessage.text && (
              <p className={`general-case-file-message ${fileMessage.className}`}>
                {fileMessage.text}
              </p>
            )}

            {uploadStatus.text && (
              <p className={`general-case-upload-status ${uploadStatus.className}`}>
                {uploadStatus.text}
              </p>
            )}

            {previewUrl && (
              <div className="general-case-image-preview">
                <h3>Image Preview</h3>
                <div className="general-case-preview-container">
                  <img
                    src={previewUrl}
                    alt="X-Ray Preview"
                    className="general-case-preview-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/600x400/FF0000/FFFFFF?text=Preview+Error';
                      e.target.alt = 'Image preview failed to load.';
                    }}
                  />
                </div>
                {selectedFile && (
                  <>
                    <p className="general-case-file-info">
                      File: {selectedFile.name}
                    </p>
                    <p className="general-case-file-size">
                      Size: {formatBytes(selectedFile.size)}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="general-case-flex general-case-justify-center general-case-mt-4">
          <button 
            className="general-case-button" 
            onClick={handleSubmitDiagnosis}
          >
            Submit Diagnosis Information
          </button>
        </div>

        {showOutputs.diagnosis && (
          <div className="general-case-output">
            <h2>Submitted Diagnosis Information:</h2>
            <p><strong>Provisional Diagnosis:</strong> {formData.provisionalDiagnosis || 'N/A'}</p>
            <p><strong>Investigations:</strong> {formData.investigations || 'N/A'}</p>
            <p><strong>Final Diagnosis:</strong> {formData.finalDiagnosis || 'N/A'}</p>
          </div>
        )}
      </div>

      {/* TREATMENT PLAN SECTION */}
      <div className="general-case-container">
        <div className="general-case-main-heading">TREATMENT PLAN</div>
        
        <div className="general-case-heading">Select Case Sheet</div>

        <div className="general-case-checkbox-group-list">
          {departments.map(dept => (
            <label key={dept} className="general-case-checkbox-item">
              <input
                type="checkbox"
                checked={selectedDepartments.includes(dept)}
                onChange={() => handleDepartmentChange(dept)}
              />
              {dept}
            </label>
          ))}
        </div>

        {/* Description field */}
        <div className="general-case-form-group">
          <label className="general-case-label">Description:</label>
          <textarea
            id="description"
            className="general-case-textarea"
            value={formData.description}
            onChange={handleInputChange}
            rows="4"
          />
        </div>

        {/* General Description field (only shown when General is selected) */}
        {isGeneralSelected && (
          <div className="general-case-form-group">
            <label className="general-case-label">General Description:</label>
            <textarea
              id="generalDescription"
              className="general-case-textarea"
              value={formData.generalDescription}
              onChange={handleInputChange}
              rows="4"
            />
          </div>
        )}

        {/* Selected Departments Display */}
        {selectedDepartments.length > 0 && (
          <div className="general-case-selected-case">
            Selected Departments: {selectedDepartments.join(", ")}
          </div>
        )}

        {/* Enable Treatment Checkbox */}
        <div className="general-case-checkbox-group">
          <input
            type="checkbox"
            id="enableTreatment"
            checked={enableTreatment}
            onChange={toggleTreatmentSection}
          />
          <label className="general-case-label">
            I confirm my selections and want to enter the Treatment Plan
          </label>
        </div>
      </div>

      {/* TREATMENT PLAN ENTRY SECTION (Only shown when enabled) */}
      {enableTreatment && (
        <div className="general-case-container">
          <div className="general-case-heading">Enter Treatment Plan</div>
          
          <div className="general-case-form-group">
            <textarea
              id="treatmentPlan"
              className="general-case-textarea"
              placeholder="Type treatment plan here..."
              value={formData.treatmentPlan}
              onChange={handleInputChange}
              rows="10"
            />
          </div>

          <div className="general-case-flex general-case-justify-center general-case-mt-4">
            <button 
              className="general-case-button" 
              onClick={handleSubmitTreatment}
            >
              Save General Case Sheet
            </button>
          </div>

          {showOutputs.treatment && (
            <div className="general-case-output">
              <h2>Submitted Treatment Plan:</h2>
              <p>{formData.treatmentPlan}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneralCaseSheet;
