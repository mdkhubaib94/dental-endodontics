import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./PedodonticsView.css";
 
const PedodonticsView = ({ caseData: propCaseData }) => {
  const { caseId: paramsCaseId } = useParams();
  const [caseData, setCaseData] = useState(propCaseData || null);
  const [loading, setLoading] = useState(!propCaseData);
  const [currentPage, setCurrentPage] = useState(0);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const totalPages = 5;

  useEffect(() => {
    // If parent provided caseData, skip fetching.
    if (propCaseData) return;

    const fetchCaseData = async () => {
      try {
        const caseId = paramsCaseId;
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/pedodontics/${caseId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCaseData(data.data);
        } else {
          console.error("Failed to fetch case data");
        }
      } catch (error) {
        console.error("Error fetching case data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [paramsCaseId, propCaseData]);

  // Fetch digital signature image once we know the case ID
  useEffect(() => {
    const effectiveId =
      (propCaseData && (propCaseData._id || propCaseData.id)) ||
      (caseData && (caseData._id || caseData.id)) ||
      paramsCaseId;

    if (!effectiveId) return;

    const loadSignature = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/pedodontics/${effectiveId}/signature`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const contentType = res.headers.get('Content-Type') || '';
        if (contentType.startsWith('image/')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setSignatureUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } else {
          const body = await res.json().catch(() => null);
          if (body && body.dataUrl) {
            setSignatureUrl(body.dataUrl);
          }
        }
      } catch (err) {
        console.warn('Failed to load pedodontics signature image:', err);
      }
    };

    loadSignature();
  }, [propCaseData, caseData, paramsCaseId]);

  const handleNext = () => {
    if (currentPage < totalPages - 1) setCurrentPage((p) => p + 1);
  };
  const handlePrev = () => {
    if (currentPage > 0) setCurrentPage((p) => p - 1);
  };

  const renderReadOnlyField = (label, value) => (
    <div className="form-group-casesheet">
      <label>{label}</label>
      <div className="readonly-field">{value || "—"}</div>
    </div>
  );

  if (loading) return <div>Loading...</div>;
  if (!caseData) return <div>Case not found</div>;

  return (
    <div className="digital-doctor-case-sheet">
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
          {/* Header */}
          <div className="header" style={{ marginBottom: 0 }}>
            <img src="/logo.png" alt="SRM Dental College Logo" />
            <h1>SRM DENTAL COLLEGE</h1>
            <h2>DEPARTMENT OF PEDODONTICS</h2>
            <h3>CLINICAL ASSESSMENT & EVALUATION FORM</h3>
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
        {currentPage === 0 && (
          <div className="page active">
            <h2>Medical & Dental History</h2>
            {renderReadOnlyField("Medical History", caseData.medicalHistory)}
            {renderReadOnlyField("Dental History", caseData.dentalHistory)}
            {renderReadOnlyField("Current Medications", caseData.currentMedications)}
            {renderReadOnlyField("Recent Medications", caseData.recentMedications)}
            {renderReadOnlyField("Allergies", caseData.allergies)}
            {renderReadOnlyField("Breastfeeding", caseData.breastfeeding)}
            {renderReadOnlyField("Bottle Usage", caseData.bottleUsage)}
            {renderReadOnlyField("Bottle Period", caseData.bottlePeriod)}
            {renderReadOnlyField("Bottle Contents", caseData.bottleContents)}
            {renderReadOnlyField("Brushing Habits", caseData.brushingHabits)}
          </div>
        )}

        {/* Page 2 */}
        {currentPage === 1 && (
          <div className="page active">
            <h2>Extra Oral & Intra Oral Exam</h2>
            {renderReadOnlyField("TMJ Examination", caseData.tmjExamination)}
            {renderReadOnlyField("Lymph Nodes", caseData.lymphNodes)}
            {renderReadOnlyField("Lip Competency", caseData.lipCompetency)}
            {renderReadOnlyField("Mouth Breathing", caseData.mouthBreathing)}
            {renderReadOnlyField("Tongue Habits", caseData.tongueHabits)}
            {renderReadOnlyField("Other Habits", caseData.otherHabits)}
            {renderReadOnlyField("Molar Relation", caseData.molarRelation)}
            {renderReadOnlyField("Canine Relation", caseData.canineRelation)}
            {renderReadOnlyField("Overjet", caseData.overjet)}
            {renderReadOnlyField("Overbite", caseData.overbite)}
          </div>
        )}

        {/* Page 3 */}
        {currentPage === 2 && (
          <div className="page active">
            <h2>Clinical Findings</h2>
            {renderReadOnlyField("Soft Tissue Findings", caseData.softTissueFindings)}
            {renderReadOnlyField("Hard Tissue Findings", caseData.hardTissueFindings)}
            {renderReadOnlyField("Dental Caries", caseData.dentalCaries)}
            {renderReadOnlyField("Developmental Defects", caseData.developmentalDefects)}
            {renderReadOnlyField("Trauma Findings", caseData.traumaFindings)}
            {renderReadOnlyField("Other Findings", caseData.otherFindings)}
          </div>
        )}

        {/* Page 4 */}
        {currentPage === 3 && (
          <div className="page active">
            <h2>Radiographic & Diagnosis</h2>
            {renderReadOnlyField("Radiographic Findings", caseData.radiographicFindings)}
            {renderReadOnlyField("Diagnosis", caseData.diagnosis)}
            {renderReadOnlyField("Differential Diagnosis", caseData.differentialDiagnosis)}
            {renderReadOnlyField("Prognosis", caseData.prognosis)}
          </div>
        )}

        {/* Page 5 */}
        {currentPage === 4 && (
          <div className="page active">
            <h2>Treatment Plan</h2>
            {renderReadOnlyField("Preventive Plan", caseData.preventivePlan)}
            {renderReadOnlyField("Restorative Plan", caseData.restorativePlan)}
            {renderReadOnlyField("Interceptive Ortho", caseData.interceptiveOrtho)}
            {renderReadOnlyField("Surgical Plan", caseData.surgicalPlan)}
            {renderReadOnlyField("Other Treatments", caseData.otherTreatments)}
            {renderReadOnlyField("Follow-up Instructions", caseData.followUpInstructions)}

            {/* Doctor Authentication Section */}
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>
              <h3 style={{ marginBottom: '20px', color: '#333' }}>Doctor's Authentication</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  {renderReadOnlyField("Doctor's Name", caseData.doctorName)}
                </div>
                <div>
                  <label>Digital Signature</label>
                  <div style={{ marginTop: '10px' }}>
                    {signatureUrl ? (
                      <img 
                        src={signatureUrl} 
                        alt="Doctor's Signature"
                        style={{ maxWidth: '100%', maxHeight: '120px', border: '1px solid #ddd', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => setEnlargedImage(signatureUrl)}
                      />
                    ) : (
                      <div className="readonly-field">No signature provided</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="navigation">
          <button onClick={handlePrev} disabled={currentPage === 0}>
            Back
          </button>
          <button onClick={handleNext} disabled={currentPage === totalPages - 1}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PedodonticsView;
