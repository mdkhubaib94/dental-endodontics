// ImplantView.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import "./Implantview.css";

export default function ImplantView() {
  const [currentPage, setCurrentPage] = useState(0);
  const [caseData, setCaseData] = useState({});
  const [loading, setLoading] = useState(true);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const navigate = useNavigate();
  const { caseId } = useParams();

  const pages = [
    "page-0",
    "page-1",
    "page-2",
    "page-3",
    "page-4",
    "page-5",
    "page-6",
    "page-7",
    "page-8",
    "page-9",
  ];

  const totalPages = pages.length;

  useEffect(() => {
    const fetchCaseData = async () => {
      try {
        const token = localStorage.getItem('token');
        const id = caseId || localStorage.getItem('caseId');
        
        if (!id) {
          alert('No case ID found');
          navigate('/prescriptions');
          return;
        }

        const res = await fetch(`http://localhost:5000/api/implant/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          const payload = data.data || {};
          setCaseData(payload);

          // Fetch digital signature image (if uploaded)
          if (id) {
            try {
              const sigRes = await fetch(`http://localhost:5000/api/implant/${id}/signature`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (sigRes.ok) {
                const contentType = sigRes.headers.get('Content-Type') || '';
                if (contentType.startsWith('image/')) {
                  const blob = await sigRes.blob();
                  const objectUrl = URL.createObjectURL(blob);
                  setSignatureUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return objectUrl;
                  });
                } else {
                  // Fallback for JSON dataUrl responses
                  const body = await sigRes.json().catch(() => null);
                  if (body && body.dataUrl) {
                    setSignatureUrl(body.dataUrl);
                  }
                }
              }
            } catch (sigErr) {
              console.warn('Failed to load implant signature image:', sigErr);
            }
          }

        } else {
          alert('Failed to load case data');
          navigate('/prescriptions');
        }
      } catch (err) {
        console.error('Error fetching case data:', err);
        alert('Error loading case data');
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [caseId, navigate]);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((p) => p + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevPage = () => {
    setCurrentPage((p) => Math.max(p - 1, 0));
    window.scrollTo(0, 0);
  };

  const getFieldValue = (name) => caseData[name] || '';

  const ReadOnlyField = ({ value, isImage }) => {
    if (isImage && value) {
      return (
        <div className="readonly-field">
          <img
            src={value}
            alt="Signature"
            style={{ maxWidth: 200, maxHeight: 100, cursor: 'pointer' }}
            onClick={() => setEnlargedImage(value)}
          />
        </div>
      );
    }
    return <div className="readonly-field">{value || 'N/A'}</div>;
  };

  if (loading) {
    return (
      <div className="loading-container">
        Loading case data...
      </div>
    );
  }

  return (
    <>
      {enlargedImage && (
        <div
          className="image-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setEnlargedImage(null)}
        >
          <img
            src={enlargedImage}
            alt="Enlarged"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)',
              backgroundColor: '#fff',
              padding: '8px',
              borderRadius: '4px',
            }}
          />
        </div>
      )}

      <div className="case-sheet">
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '20px', paddingLeft: '20px', paddingRight: '20px' }}>
          <div className="logo-header" style={{ marginBottom: 0 }}>
            <img
              src="/images/logo.png"
              alt="SRM Dental College Logo"
              className="logo-image"
            />
            <h2 className="college-name">SRM Dental College</h2>
          </div>

          {/* Patient Information Header */}
          {(caseData?.patientName || caseData?.patientId) && (
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
                {caseData?.patientName && (
                  <div style={{ marginBottom: '6px' }}>
                    <strong>Patient Name:</strong> {caseData.patientName}
                  </div>
                )}
                {caseData?.patientId && (
                  <div>
                    <strong>Patient ID:</strong> {caseData.patientId}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* PAGE 0: Extraoral Examination */}
        <div className={`page ${currentPage === 0 ? "active" : ""}`}>
          <h2>1. Clinical examination:</h2>
          <h3>A. Extra oral examination:</h3>

          <div className="form-group">
            <label>a) Facial symmetry:</label>
            <ReadOnlyField value={getFieldValue('facial_symmetry')} />
          </div>

          <div className="form-group">
            <label>b) Facial profile: (Angle's classification)</label>
            <ReadOnlyField value={getFieldValue('facial_profile')} />
          </div>

          <div className="form-group">
            <label>c) Facial form: (House and Loop, Frush and Fischer, Leon Williams)</label>
            <ReadOnlyField value={getFieldValue('facial_form')} />
          </div>

          <h3>d) TMJ examination:</h3>

          <h4>1. Inspection:</h4>

          <div className="form-group">
            <label>a) Maximum mouth opening:</label>
            <ReadOnlyField value={getFieldValue('max_mouth_opening')} />
          </div>

          <div className="form-group">
            <label>b) Deviation of mandible:</label>
            <ReadOnlyField value={getFieldValue('deviation_mandible')} />
          </div>

          <div className="form-group">
            <label>Opening:</label>
            <ReadOnlyField value={getFieldValue('deviation_opening')} />
          </div>

          <div className="form-group">
            <label>Closing:</label>
            <ReadOnlyField value={getFieldValue('deviation_closing')} />
          </div>

          <h4>2. Palpation:</h4>

          <div className="form-group">
            <label>a) Pain/tenderness:</label>
            <ReadOnlyField value={getFieldValue('pain_tenderness')} />
          </div>

          <div className="form-group">
            <label>b) Clicking:</label>
            <ReadOnlyField value={getFieldValue('clicking')} />
          </div>

          <h4>3. Auscultation:</h4>

          <div className="form-group">
            <label>a) Crepitus:</label>
            <ReadOnlyField value={getFieldValue('crepitus')} />
          </div>

          <div className="form-group">
            <label>a) Lymph nodes:</label>
            <ReadOnlyField value={getFieldValue('lymph_nodes')} />
          </div>
        </div>

        {/* PAGE 1: Intra Oral Examination & Periodontal Status */}
        <div className={`page ${currentPage === 1 ? "active" : ""}`}>
          <h3>B. Intra oral examination:</h3>

          <div className="form-group">
            <label>a) Soft tissue examination:</label>
            <ReadOnlyField value={getFieldValue('soft_tissue')} />
          </div>

          <div className="form-group">
            <label>b) Hard tissue examination:</label>
            <ReadOnlyField value={getFieldValue('hard_tissue')} />
          </div>

          <h3>c) Periodontal status:</h3>

          <div className="form-group">
            <label>1. Gingival condition:</label>
            <ReadOnlyField value={getFieldValue('gingival_condition')} />
          </div>

          <div className="form-group">
            <label>2. Periodontal pockets:</label>
            <ReadOnlyField value={getFieldValue('periodontal_pockets')} />
          </div>

          <div className="form-group">
            <label>3. Mobility:</label>
            <ReadOnlyField value={getFieldValue('mobility')} />
          </div>

          <div className="form-group">
            <label>4. Furcation involvement:</label>
            <ReadOnlyField value={getFieldValue('furcation_involvement')} />
          </div>

          <h3>D. Gingival Index (Löe and Silness):</h3>

          <table className="data-table">
            <thead>
              <tr>
                <th>Tooth No.</th>
                <th>Area Examined</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td><ReadOnlyField value={getFieldValue(`gi_tooth_${i}`)} /></td>
                  <td><ReadOnlyField value={getFieldValue(`gi_area_${i}`)} /></td>
                  <td><ReadOnlyField value={getFieldValue(`gi_score_${i}`)} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>E. Dentition Status:</h3>

          <div className="form-group">
            <label>1. Missing teeth:</label>
            <ReadOnlyField value={getFieldValue('missing_teeth')} />
          </div>

          <div className="form-group">
            <label>2. Carious teeth:</label>
            <ReadOnlyField value={getFieldValue('carious_teeth')} />
          </div>

          <div className="form-group">
            <label>3. Filled teeth:</label>
            <ReadOnlyField value={getFieldValue('filled_teeth')} />
          </div>

          <div className="form-group">
            <label>4. Fractured teeth:</label>
            <ReadOnlyField value={getFieldValue('fractured_teeth')} />
          </div>

          <div className="form-group">
            <label>5. Abrasion:</label>
            <ReadOnlyField value={getFieldValue('abrasion')} />
          </div>

          <div className="form-group">
            <label>6. Attrition:</label>
            <ReadOnlyField value={getFieldValue('attrition')} />
          </div>

          <div className="form-group">
            <label>7. Erosion:</label>
            <ReadOnlyField value={getFieldValue('erosion')} />
          </div>

          <div className="form-group">
            <label>8. Hypersensitivity:</label>
            <ReadOnlyField value={getFieldValue('hypersensitivity')} />
          </div>
        </div>

        {/* PAGE 2: Occlusion */}
        <div className={`page ${currentPage === 2 ? "active" : ""}`}>
          <h2>F. Occlusion:</h2>

          <div className="form-group">
            <label>1. Molar relation (Angle's classification):</label>
            <ReadOnlyField value={getFieldValue('molar_relation')} />
          </div>

          <div className="form-group">
            <label>2. Canine relation:</label>
            <ReadOnlyField value={getFieldValue('canine_relation')} />
          </div>

          <div className="form-group">
            <label>3. Overjet (mm):</label>
            <ReadOnlyField value={getFieldValue('overjet')} />
          </div>

          <div className="form-group">
            <label>4. Overbite (mm):</label>
            <ReadOnlyField value={getFieldValue('overbite')} />
          </div>

          <div className="form-group">
            <label>5. Midline shift:</label>
            <ReadOnlyField value={getFieldValue('midline_shift')} />
          </div>

          <div className="form-group">
            <label>6. Open bite:</label>
            <ReadOnlyField value={getFieldValue('open_bite')} />
          </div>

          <div className="form-group">
            <label>7. Crossbite:</label>
            <ReadOnlyField value={getFieldValue('crossbite')} />
          </div>
        </div>

        {/* PAGE 3: Diagnostic Cast Evaluation */}
        <div className={`page ${currentPage === 3 ? "active" : ""}`}>
          <h2>G. Diagnostic Cast Evaluation:</h2>

          <div className="form-group">
            <label>1. Arch form:</label>
            <ReadOnlyField value={getFieldValue('arch_form')} />
          </div>

          <div className="form-group">
            <label>2. Curve of Spee:</label>
            <ReadOnlyField value={getFieldValue('curve_of_spee')} />
          </div>

          <div className="form-group">
            <label>3. Curve of Wilson:</label>
            <ReadOnlyField value={getFieldValue('curve_of_wilson')} />
          </div>

          <div className="form-group">
            <label>4. Alignment:</label>
            <ReadOnlyField value={getFieldValue('arch_alignment')} />
          </div>

          <div className="form-group">
            <label>5. Spacing:</label>
            <ReadOnlyField value={getFieldValue('arch_spacing')} />
          </div>

          <div className="form-group">
            <label>6. Crowding:</label>
            <ReadOnlyField value={getFieldValue('arch_crowding')} />
          </div>
        </div>

        {/* PAGE 4: Radiographic, Vitality, and Mounted Cast Evaluation */}
        <div className={`page ${currentPage === 4 ? "active" : ""}`}>
          <h2>H. Radiographic Examination:</h2>

          <div className="form-group">
            <label>1. Radiographs taken:</label>
            <ReadOnlyField value={getFieldValue('radiographs_taken')} />
          </div>

          <div className="form-group">
            <label>2. Findings:</label>
            <ReadOnlyField value={getFieldValue('radiographic_findings')} />
          </div>

          <h2>I. Vitality Testing:</h2>

          <div className="form-group">
            <label>1. Pulp vitality test:</label>
            <ReadOnlyField value={getFieldValue('vitality_test')} />
          </div>

          <h2>J. Mounted Cast Evaluation:</h2>

          <div className="form-group">
            <label>1. Centric relation:</label>
            <ReadOnlyField value={getFieldValue('centric_relation')} />
          </div>

          <div className="form-group">
            <label>2. Centric occlusion:</label>
            <ReadOnlyField value={getFieldValue('centric_occlusion')} />
          </div>

          <div className="form-group">
            <label>3. Excursive movements:</label>
            <ReadOnlyField value={getFieldValue('excursive_movements')} />
          </div>
        </div>

        {/* PAGE 5: Diagnosis */}
        <div className={`page ${currentPage === 5 ? "active" : ""}`}>
          <h2>2. Diagnosis:</h2>

          <div className="form-group">
            <label>Chief complaint:</label>
            <ReadOnlyField value={getFieldValue('chief_complaint_diagnosis')} />
          </div>

          <div className="form-group">
            <label>Clinical diagnosis:</label>
            <ReadOnlyField value={getFieldValue('clinical_diagnosis')} />
          </div>

          <div className="form-group">
            <label>Radiographic diagnosis:</label>
            <ReadOnlyField value={getFieldValue('radiographic_diagnosis')} />
          </div>

          <div className="form-group">
            <label>Definitive diagnosis:</label>
            <ReadOnlyField value={getFieldValue('definitive_diagnosis')} />
          </div>
        </div>

        {/* PAGE 6: Treatment Planning and FPD Design */}
        <div className={`page ${currentPage === 6 ? "active" : ""}`}>
          <h2>3. Treatment Planning:</h2>

          <div className="form-group">
            <label>Treatment options:</label>
            <ReadOnlyField value={getFieldValue('treatment_options')} />
          </div>

          <h3>Proposed Fixed Partial Denture Design:</h3>

          <div className="form-group">
            <label>1. Abutment teeth:</label>
            <ReadOnlyField value={getFieldValue('abutment_teeth')} />
          </div>

          <div className="form-group">
            <label>2. Connector design:</label>
            <ReadOnlyField value={getFieldValue('connector_design')} />
          </div>

          <div className="form-group">
            <label>3. Pontic design:</label>
            <ReadOnlyField value={getFieldValue('pontic_design')} />
          </div>

          <div className="form-group">
            <label>4. Margin design:</label>
            <ReadOnlyField value={getFieldValue('margin_design')} />
          </div>

          <div className="form-group">
            <label>5. Material selection:</label>
            <ReadOnlyField value={getFieldValue('material_choice')} />
          </div>
        </div>

        {/* PAGE 7: Tooth Preparation Notes */}
        <div className={`page ${currentPage === 7 ? "active" : ""}`}>
          <h2>4. Tooth Preparation Notes:</h2>

          <div className="form-group">
            <label>1. Occlusal reduction (mm):</label>
            <ReadOnlyField value={getFieldValue('occlusal_reduction')} />
          </div>

          <div className="form-group">
            <label>2. Axial reduction (mm):</label>
            <ReadOnlyField value={getFieldValue('axial_reduction')} />
          </div>

          <div className="form-group">
            <label>3. Finish line:</label>
            <ReadOnlyField value={getFieldValue('finish_line')} />
          </div>

          <div className="form-group">
            <label>4. Path of insertion:</label>
            <ReadOnlyField value={getFieldValue('path_of_insertion')} />
          </div>

          <div className="form-group">
            <label>5. Retention and resistance features:</label>
            <ReadOnlyField value={getFieldValue('retention_features')} />
          </div>
        </div>

        {/* PAGE 8: Provisional Restoration */}
        <div className={`page ${currentPage === 8 ? "active" : ""}`}>
          <h2>5. Provisional Restoration:</h2>

          <div className="form-group">
            <label>Material used:</label>
            <ReadOnlyField value={getFieldValue('provisional_material')} />
          </div>

          <div className="form-group">
            <label>Method of fabrication:</label>
            <ReadOnlyField value={getFieldValue('provisional_method')} />
          </div>

          <div className="form-group">
            <label>Fit assessment:</label>
            <ReadOnlyField value={getFieldValue('provisional_fit')} />
          </div>

          <div className="form-group">
            <label>Occlusion:</label>
            <ReadOnlyField value={getFieldValue('provisional_occlusion')} />
          </div>
        </div>

        {/* PAGE 9: Final Prosthesis Evaluation & Follow-up */}
        <div className={`page ${currentPage === 9 ? "active" : ""}`}>
          <h2>6. Final Prosthesis Evaluation:</h2>

          <div className="form-group">
            <label>1. Fit:</label>
            <ReadOnlyField value={getFieldValue('final_fit')} />
          </div>

          <div className="form-group">
            <label>2. Occlusion:</label>
            <ReadOnlyField value={getFieldValue('final_occlusion')} />
          </div>

          <div className="form-group">
            <label>3. Contour:</label>
            <ReadOnlyField value={getFieldValue('final_contour')} />
          </div>

          <div className="form-group">
            <label>4. Esthetics:</label>
            <ReadOnlyField value={getFieldValue('final_esthetics')} />
          </div>

          <div className="form-group">
            <label>5. Patient feedback:</label>
            <ReadOnlyField value={getFieldValue('patient_feedback')} />
          </div>

          <h2>7. Follow-up:</h2>

          <div className="form-group">
            <label>Instructions:</label>
            <ReadOnlyField value={getFieldValue('followup_instructions')} />
          </div>

          <div className="form-group">
            <label>Recall schedule:</label>
            <ReadOnlyField value={getFieldValue('recall_schedule')} />
          </div>

          {/* Doctor Authentication Section - Only on Last Page */}
          <div className="doctor-auth-section" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <h2>Doctor's Authentication</h2>
            <div className="form-group">
              <label htmlFor="doctorName">Doctor's Name</label>
              <input type="text" id="doctorName" value={caseData.doctorName || ''} readOnly disabled style={{ background: '#f0f0f0' }} />
            </div>
            <div className="form-group">
              <label>Digital Signature</label>
              {signatureUrl ? (
                <div style={{ marginTop: '10px' }}>
                  <img
                    src={signatureUrl}
                    alt="Doctor's Signature"
                    style={{ maxWidth: '150px', maxHeight: '100px', border: '1px solid #ccc', padding: '5px', cursor: 'pointer' }}
                    onClick={() => setEnlargedImage(signatureUrl)}
                  />
                </div>
              ) : (
                <div className="readonly-field">No signature uploaded</div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation for all pages */}
        <div className="navigation">
          <button type="button" onClick={prevPage} disabled={currentPage === 0}>
            Previous
          </button>
          <button type="button" onClick={nextPage} disabled={currentPage === totalPages - 1}>
            Next
          </button>
        </div>
        <p className="page-indicator">
          Page {currentPage + 1} of {totalPages}
        </p>
      </div>
    </>
  );
}