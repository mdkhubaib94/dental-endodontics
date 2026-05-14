import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./CaseSheetView.css";
 
const CaseSheetView = () => {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 5;

  useEffect(() => {
    fetchCaseData();
  }, [caseId]);

  const fetchCaseData = async () => {
    try {
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
      <div className="case-sheet">
        {/* Header */}
        <div className="header">
          <img src="/logo.png" alt="SRM Dental College Logo" />
          <h1>SRM DENTAL COLLEGE</h1>
          <h2>DEPARTMENT OF PEDODONTICS</h2>
          <h3>CLINICAL ASSESSMENT & EVALUATION FORM</h3>
        </div>

        {/* Page 1 */}
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
                    {caseData.digitalSignature ? (
                      <img 
                        src={caseData.digitalSignature} 
                        alt="Doctor's Signature"
                        style={{ maxWidth: '100%', maxHeight: '120px', border: '1px solid #ddd', padding: '5px', borderRadius: '4px' }}
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

export default CaseSheetView;
