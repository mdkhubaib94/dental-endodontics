import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CompleteDentureCaseSheetView.css";

// Read-only Checkbox Display Component
function CheckboxDisplay({ options, value, label }) {
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

  return (
    <div className="checkbox-group">
      {options.map(opt => {
        const checked = selectedValues.includes(opt.value);
        return (
          <label key={opt.value} className={`checkbox-item ${checked ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={checked}
              disabled
              readOnly
              className="checkbox-input"
            />
            <span className="checkbox-custom" aria-hidden="true" />
            <span className="checkbox-label">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function CompleteDentureCaseSheetView() {
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '' });
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const navigate = useNavigate();
  const { caseId } = useParams();

  const [caseData, setCaseData] = useState({
    patientId: '',
    patientName: '',
    doctorId: '',
    doctorName: '',
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
    finalDiagnosis: "",
    treatmentPlan: "",
    prostheticPrognosis: "",
    recall: "",
    digitalSignature: null
  });

  const totalPages = 7;

  // Fetch case data on component mount
  useEffect(() => {
    fetchCaseData();
  }, [caseId]);

  const fetchCaseData = async () => {
    try {
      const token = localStorage.getItem('token');
      // Prefer explicit caseId from URL; otherwise try to find latest case for selected patient
      const caseIdFromParam = caseId;
      const selectedPatientId = localStorage.getItem('CurrentpatientId');

      let fetchedCase = null;

      if (!caseIdFromParam && !selectedPatientId) {
        showMessageBox('Error', 'No case ID or selected patient found');
        setIsLoading(false);
        return;
      }

      // If we have a patient but no caseId, fetch cases for that patient and take latest
      if (!caseIdFromParam && selectedPatientId) {
        const resp = await fetch(`http://localhost:5000/api/complete-denture/patient/${selectedPatientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const body = await resp.json().catch(() => ({}));

        if (resp.ok && Array.isArray(body.data) && body.data.length > 0) {
          fetchedCase = body.data[0];
        } else if (resp.ok && Array.isArray(body.data) && body.data.length === 0) {
          showMessageBox('Info', 'No case sheets found for selected patient');
          setIsLoading(false);
          return;
        } else {
          showMessageBox('Error', body.message || 'Failed to fetch patient cases');
          setIsLoading(false);
          return;
        }
      }

      // If we have a caseId param (or obtained one above), fetch that specific case
      const caseIdToFetch = caseIdFromParam || (fetchedCase && (fetchedCase._id || fetchedCase.id));

      const response = await fetch(`http://localhost:5000/api/complete-denture/${caseIdToFetch}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Parse array fields that were stringified
        const parsedData = { ...(data.data || data) };
        const arrayFields = [
          'medicalHistory', 'mentalAttitude', 'habits', 'toothLossReason',
          'facialProfile', 'facialForm', 'mandibleDeviationOpening',
          'mandibleDeviationOpeningDirection', 'mandibleDeviationClosingDirection',
          'lipLine', 'muscleTone', 'hardPalateArch', 'hardPalateShape',
          'softPalateForm', 'palateSensitivity', 'lateralThroatForm',
          'palatalThroatForm', 'tongueSize', 'tonguePosition', 'tongueMobility',
          'maxillaAttachedGingival', 'mandibleAttachedGingival',
          'maxillaSoftTissueRidge', 'mandibleSoftTissueRidge',
          'maxillaMucosaCondition', 'mandibleMucosaCondition',
          'maxillaAntRidgeForm', 'maxillaPostRidgeForm',
          'mandibleAntRidgeForm', 'mandiblePostRidgeForm',
          'ridgeContour', 'ridgeRelation', 'ridgeParallelism',
          'salivaQuantity', 'salivaConsistency'
        ];

        arrayFields.forEach(field => {
          if (typeof parsedData[field] === 'string') {
            try {
              parsedData[field] = JSON.parse(parsedData[field]);
            } catch (e) {
              parsedData[field] = [];
            }
          }
        });

        setCaseData(parsedData);

        if (parsedData && (parsedData._id || parsedData.id)) {
          fetchSignature(parsedData._id || parsedData.id);
        }
      } else {
        showMessageBox('Error', data.message || 'Failed to fetch case data');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      showMessageBox('Error', 'Failed to load case data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSignature = async (caseId) => {
    try {
      if (!caseId) return;
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/complete-denture/${caseId}/signature`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setSignatureUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
    } catch (error) {
      console.error('Error fetching complete denture signature:', error);
    }
  };

  const showMessageBox = (title, message) => {
    setMessageBox({ show: true, title, message });
  };

  const hideMessageBox = () => {
    setMessageBox({ show: false, title: '', message: '' });
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      window.scrollTo(0, 0);
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      window.scrollTo(0, 0);
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleBack = () => {
    navigate(-1);
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
      <h2>Medical History</h2>
      
      <div className="form-group">
        <label>1. Does the patient suffer / suffered from any of the following disease/s:</label>
        <CheckboxDisplay
          options={medicalHistoryOptions}
          value={caseData.medicalHistory}
        />
        <input
          type="text"
          placeholder="Specify other conditions"
          value={caseData.medicalHistoryOthers}
          readOnly
          disabled
        />
      </div>

      <div className="form-group">
        <label htmlFor="treatmentDetails">B. Details of treatment for any of the above said ailments:</label>
        <textarea
          id="treatmentDetails"
          rows={3}
          value={caseData.treatmentDetails}
          readOnly
          disabled
        />
      </div>

      <h2>General Examination</h2>

      <div className="form-group">
        <label htmlFor="gait">2. Gait:</label>
        <input 
          type="text" 
          id="gait"
          value={caseData.gait}
          readOnly
          disabled
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="built">Built:</label>
          <input type="text" id="built" value={caseData.built} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="weight">Weight:</label>
          <input type="text" id="weight" value={caseData.weight} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="height">Height:</label>
          <input type="text" id="height" value={caseData.height} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="bloodPressure">Blood Pressure:</label>
          <input type="text" id="bloodPressure" value={caseData.bloodPressure} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="respiratoryRate">Respiratory Rate:</label>
          <input type="text" id="respiratoryRate" value={caseData.respiratoryRate} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="heartRate">Heart Rate:</label>
          <input type="text" id="heartRate" value={caseData.heartRate} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="bodyTemperature">Body Temperature:</label>
        <input type="text" id="bodyTemperature" value={caseData.bodyTemperature} readOnly disabled />
      </div>

      <div className="form-group">
        <label htmlFor="nutritionalStatus">3. Nutritional status:</label>
        <input type="text" id="nutritionalStatus" value={caseData.nutritionalStatus} readOnly disabled />
      </div>

      <div className="form-group">
        <label>4. Patient's mental attitude: (M.M. House classification)</label>
        <CheckboxDisplay options={mentalAttitudeOptions} value={caseData.mentalAttitude} />
      </div>

      <div className="form-group">
        <label>5. Habits:</label>
        <CheckboxDisplay options={habitsOptions} value={caseData.habits} />
        <input type="text" placeholder="Specify other habits" value={caseData.habitsOthers} readOnly disabled />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="habitDuration">Duration/frequency of the habit:</label>
          <input type="text" id="habitDuration" value={caseData.habitDuration} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="paraHabits">Parafunctional habits:</label>
          <input type="text" id="paraHabits" value={caseData.paraHabits} readOnly disabled />
        </div>
      </div>
    </div>
  );

  const renderPage2 = () => (
    <div className={`page ${currentPage === 1 ? 'active' : ''}`} style={{ display: currentPage === 1 ? 'block' : 'none' }}>
      <h2>Existing Denture Assessment</h2>
      
      <div className="form-group">
        <label htmlFor="prevDentalTreatment">1. Previous Denture Treatment:</label>
        <textarea id="prevDentalTreatment" rows={3} value={caseData.prevDentalTreatment} readOnly disabled />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="maxillaryDentureNum">Maxillary Denture No.:</label>
          <input type="text" id="maxillaryDentureNum" value={caseData.maxillaryDentureNum} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="maxillaryDentureType">Type:</label>
          <input type="text" id="maxillaryDentureType" value={caseData.maxillaryDentureType} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="mandibularDentureNum">Mandibular Denture No.:</label>
          <input type="text" id="mandibularDentureNum" value={caseData.mandibularDentureNum} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="mandibularDentureType">Type:</label>
          <input type="text" id="mandibularDentureType" value={caseData.mandibularDentureType} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="patientCommentsDenture">Patient's Comments on existing denture:</label>
        <textarea id="patientCommentsDenture" rows={3} value={caseData.patientCommentsDenture} readOnly disabled />
      </div>

      <h3>Evaluation of Existing Denture</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="vdRating">Vertical Dimension:</label>
          <input type="text" id="vdRating" value={caseData.vdRating} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="retentionRating">Retention:</label>
          <input type="text" id="retentionRating" value={caseData.retentionRating} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="stabilityRating">Stability:</label>
          <input type="text" id="stabilityRating" value={caseData.stabilityRating} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="occlusionRating">Occlusion:</label>
          <input type="text" id="occlusionRating" value={caseData.occlusionRating} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="occlusalPlaneRating">Occlusal Plane:</label>
          <input type="text" id="occlusalPlaneRating" value={caseData.occlusalPlaneRating} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="dentureBordersRating">Denture Borders:</label>
          <input type="text" id="dentureBordersRating" value={caseData.dentureBordersRating} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="tissueCoverageRating">Tissue Coverage:</label>
          <input type="text" id="tissueCoverageRating" value={caseData.tissueCoverageRating} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="estheticsRating">Esthetics:</label>
          <input type="text" id="estheticsRating" value={caseData.estheticsRating} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="midlineRating">Midline:</label>
          <input type="text" id="midlineRating" value={caseData.midlineRating} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="buccalCorridorRating">Buccal Corridor:</label>
          <input type="text" id="buccalCorridorRating" value={caseData.buccalCorridorRating} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="articulationRating">Articulation:</label>
          <input type="text" id="articulationRating" value={caseData.articulationRating} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="ppsRating">PPS:</label>
          <input type="text" id="ppsRating" value={caseData.ppsRating} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="hygieneRating">Hygiene:</label>
        <input type="text" id="hygieneRating" value={caseData.hygieneRating} readOnly disabled />
      </div>

      <h3>Scheme of Existing Denture</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="occlusalSchemeExisting">Occlusal Scheme:</label>
          <input type="text" id="occlusalSchemeExisting" value={caseData.occlusalSchemeExisting} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="dentureBaseExisting">Denture Base:</label>
          <input type="text" id="dentureBaseExisting" value={caseData.dentureBaseExisting} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="dentureTeethExisting">Denture Teeth:</label>
        <input type="text" id="dentureTeethExisting" value={caseData.dentureTeethExisting} readOnly disabled />
      </div>
    </div>
  );

  const renderPage3 = () => (
    <div className={`page ${currentPage === 2 ? 'active' : ''}`} style={{ display: currentPage === 2 ? 'block' : 'none' }}>
      <h2>Tooth Loss & Dental History</h2>
      
      <div className="form-group">
        <label>Reason for Tooth Loss:</label>
        <CheckboxDisplay options={toothLossReasonOptions} value={caseData.toothLossReason} />
        <input type="text" placeholder="Specify other reasons" value={caseData.toothLossReasonOthers} readOnly disabled />
      </div>

      <h3>Tooth Loss Distribution</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="maxAnteriorLoss">Maxillary Anterior Loss:</label>
          <input type="text" id="maxAnteriorLoss" value={caseData.maxAnteriorLoss} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="maxPosteriorLoss">Maxillary Posterior Loss:</label>
          <input type="text" id="maxPosteriorLoss" value={caseData.maxPosteriorLoss} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="mandAnteriorLoss">Mandibular Anterior Loss:</label>
          <input type="text" id="mandAnteriorLoss" value={caseData.mandAnteriorLoss} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="mandPosteriorLoss">Mandibular Posterior Loss:</label>
          <input type="text" id="mandPosteriorLoss" value={caseData.mandPosteriorLoss} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="edentulousDuration">Duration of Edentulism:</label>
          <input type="text" id="edentulousDuration" value={caseData.edentulousDuration} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="preExtractionRecords">Pre-extraction Records:</label>
          <input type="text" id="preExtractionRecords" value={caseData.preExtractionRecords} readOnly disabled />
        </div>
      </div>
    </div>
  );

  const renderPage4 = () => (
    <div className={`page ${currentPage === 3 ? 'active' : ''}`} style={{ display: currentPage === 3 ? 'block' : 'none' }}>
      <h2>Facial & TMJ Examination</h2>
      
      <h3>Facial Features</h3>
      <div className="form-group">
        <label htmlFor="facialSymmetry">Facial Symmetry:</label>
        <input type="text" id="facialSymmetry" value={caseData.facialSymmetry} readOnly disabled />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Facial Profile:</label>
          <CheckboxDisplay
            options={[
              { value: "Convex", label: "Convex" },
              { value: "Straight", label: "Straight" },
              { value: "Concave", label: "Concave" }
            ]}
            value={caseData.facialProfile}
          />
        </div>
        <div className="form-group">
          <label>Facial Form:</label>
          <CheckboxDisplay
            options={[
              { value: "Square", label: "Square" },
              { value: "Oval", label: "Oval" },
              { value: "Triangular", label: "Triangular" }
            ]}
            value={caseData.facialForm}
          />
        </div>
      </div>

      <h3>Mouth Opening</h3>
      <div className="form-group">
        <label htmlFor="maxMouthOpening">Maximum Mouth Opening (mm):</label>
        <input type="text" id="maxMouthOpening" value={caseData.maxMouthOpening} readOnly disabled />
      </div>

      <h3>Mandibular Deviation</h3>
      <div className="form-group">
        <label>Deviation during Opening:</label>
        <CheckboxDisplay
          options={[{ value: "Present", label: "Present" }, { value: "Absent", label: "Absent" }]}
          value={caseData.mandibleDeviationOpening}
        />
      </div>

      <div className="form-group">
        <label htmlFor="mandibleDeviationOpeningDirection">Direction:</label>
        <input type="text" id="mandibleDeviationOpeningDirection" value={caseData.mandibleDeviationOpeningDirection} readOnly disabled />
      </div>

      <div className="form-group">
        <label htmlFor="mandibleDeviationClosingDirection">Deviation during Closing Direction:</label>
        <input type="text" id="mandibleDeviationClosingDirection" value={caseData.mandibleDeviationClosingDirection} readOnly disabled />
      </div>

      <h3>TMJ Assessment</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="tmjPainTenderness">TMJ Pain/Tenderness:</label>
          <input type="text" id="tmjPainTenderness" value={caseData.tmjPainTenderness} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="tmjClicking">TMJ Clicking:</label>
          <input type="text" id="tmjClicking" value={caseData.tmjClicking} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="tmjCrepitus">TMJ Crepitus:</label>
        <input type="text" id="tmjCrepitus" value={caseData.tmjCrepitus} readOnly disabled />
      </div>

      <h3>Lymph Nodes & Lips</h3>
      <div className="form-group">
        <label htmlFor="lymphNodes">Lymph Nodes:</label>
        <input type="text" id="lymphNodes" value={caseData.lymphNodes} readOnly disabled />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="lipCompetency">Lip Competency:</label>
          <input type="text" id="lipCompetency" value={caseData.lipCompetency} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="lipLength">Lip Length:</label>
          <input type="text" id="lipLength" value={caseData.lipLength} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label>Lip Line:</label>
        <CheckboxDisplay
          options={[
            { value: "High", label: "High" },
            { value: "Medium", label: "Medium" },
            { value: "Low", label: "Low" }
          ]}
          value={caseData.lipLine}
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="lipPathology">Lip Pathology:</label>
          <input type="text" id="lipPathology" value={caseData.lipPathology} readOnly disabled />
        </div>
        <div className="form-group">
          <label>Muscle Tone:</label>
          <CheckboxDisplay
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Flaccid", label: "Flaccid" },
              { value: "Tense", label: "Tense" }
            ]}
            value={caseData.muscleTone}
          />
        </div>
      </div>
    </div>
  );

  const renderPage5 = () => (
    <div className={`page ${currentPage === 4 ? 'active' : ''}`} style={{ display: currentPage === 4 ? 'block' : 'none' }}>
      <h2>Intraoral Examination - Hard & Soft Palate</h2>
      
      <h3>Buccal Mucosa</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="buccalMucosaColor">Color:</label>
          <input type="text" id="buccalMucosaColor" value={caseData.buccalMucosaColor} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="buccalMucosaTexture">Texture:</label>
          <input type="text" id="buccalMucosaTexture" value={caseData.buccalMucosaTexture} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="buccalMucosaOthers">Other Observations:</label>
        <input type="text" id="buccalMucosaOthers" value={caseData.buccalMucosaOthers} readOnly disabled />
      </div>

      <h3>Floor of Mouth</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="floorMouthColor">Color:</label>
          <input type="text" id="floorMouthColor" value={caseData.floorMouthColor} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="floorMouthOthers">Other Observations:</label>
          <input type="text" id="floorMouthOthers" value={caseData.floorMouthOthers} readOnly disabled />
        </div>
      </div>

      <h3>Hard Palate</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Arch Form:</label>
          <CheckboxDisplay
            options={[
              { value: "V-shaped", label: "V-shaped" },
              { value: "U-shaped", label: "U-shaped" },
              { value: "Flat", label: "Flat" }
            ]}
            value={caseData.hardPalateArch}
          />
        </div>
        <div className="form-group">
          <label>Shape:</label>
          <CheckboxDisplay
            options={[
              { value: "High", label: "High" },
              { value: "Medium", label: "Medium" },
              { value: "Shallow", label: "Shallow" }
            ]}
            value={caseData.hardPalateShape}
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="hyperplasia">Hyperplasia:</label>
          <input type="text" id="hyperplasia" value={caseData.hyperplasia} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="wch">Whitening/Cracking/Hyperplasia:</label>
          <input type="text" id="wch" value={caseData.wch} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="inflammation">Inflammation:</label>
          <input type="text" id="inflammation" value={caseData.inflammation} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="hardPalateOthers">Other Observations:</label>
          <input type="text" id="hardPalateOthers" value={caseData.hardPalateOthers} readOnly disabled />
        </div>
      </div>

      <h3>Soft Palate</h3>
      <div className="form-group">
        <label>Soft Palate Form:</label>
        <CheckboxDisplay
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Elongated", label: "Elongated" },
            { value: "Short", label: "Short" }
          ]}
          value={caseData.softPalateForm}
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="softPalateColor">Color:</label>
          <input type="text" id="softPalateColor" value={caseData.softPalateColor} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="softPalateOthers">Other Observations:</label>
          <input type="text" id="softPalateOthers" value={caseData.softPalateOthers} readOnly disabled />
        </div>
      </div>

      <h3>Palate Sensitivity & Throat</h3>
      <div className="form-group">
        <label>Palatal Sensitivity:</label>
        <CheckboxDisplay
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Hyper-sensitive", label: "Hyper-sensitive" },
            { value: "Non-sensitive", label: "Non-sensitive" }
          ]}
          value={caseData.palateSensitivity}
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Lateral Throat Form:</label>
          <CheckboxDisplay
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Restricted", label: "Restricted" }
            ]}
            value={caseData.lateralThroatForm}
          />
        </div>
        <div className="form-group">
          <label>Palatal Throat Form:</label>
          <CheckboxDisplay
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Restricted", label: "Restricted" }
            ]}
            value={caseData.palatalThroatForm}
          />
        </div>
      </div>

      <h3>Tongue Assessment</h3>
      <div className="form-group">
        <label>Tongue Size:</label>
        <CheckboxDisplay
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Macroglossia", label: "Macroglossia" },
            { value: "Microglossia", label: "Microglossia" }
          ]}
          value={caseData.tongueSize}
        />
      </div>

      <div className="form-group">
        <label>Tongue Position:</label>
        <CheckboxDisplay
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Anterior", label: "Anterior" },
            { value: "Posterior", label: "Posterior" }
          ]}
          value={caseData.tonguePosition}
        />
      </div>

      <div className="form-group">
        <label>Tongue Mobility:</label>
        <CheckboxDisplay
          options={[
            { value: "Normal", label: "Normal" },
            { value: "Restricted", label: "Restricted" },
            { value: "Excessive", label: "Excessive" }
          ]}
          value={caseData.tongueMobility}
        />
      </div>

      <div className="form-group">
        <label htmlFor="tongueOthers">Other Observations:</label>
        <input type="text" id="tongueOthers" value={caseData.tongueOthers} readOnly disabled />
      </div>
    </div>
  );

  const renderPage6 = () => (
    <div className={`page ${currentPage === 5 ? 'active' : ''}`} style={{ display: currentPage === 5 ? 'block' : 'none' }}>
      <h2>Frenum & Ridge Assessment</h2>
      
      <h3>Maxillary Labial Frenum</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="maxLabialFrenumNum">Number of attachments:</label>
          <input type="text" id="maxLabialFrenumNum" value={caseData.maxLabialFrenumNum} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="maxLabialFrenumProminence">Prominence:</label>
          <input type="text" id="maxLabialFrenumProminence" value={caseData.maxLabialFrenumProminence} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="maxLabialFrenumClass">Class:</label>
        <input type="text" id="maxLabialFrenumClass" value={caseData.maxLabialFrenumClass} readOnly disabled />
      </div>

      <h3>Maxillary Buccal Frenum</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Left:</label>
          <input type="text" placeholder="No. of attachments" value={caseData.maxLeftBuccalFrenumNum} readOnly disabled />
          <input type="text" placeholder="Prominence" value={caseData.maxLeftBuccalFrenumProminence} readOnly disabled />
          <input type="text" placeholder="Class" value={caseData.maxLeftBuccalFrenumClass} readOnly disabled />
        </div>
        <div className="form-group">
          <label>Right:</label>
          <input type="text" placeholder="No. of attachments" value={caseData.maxRightBuccalFrenumNum} readOnly disabled />
          <input type="text" placeholder="Prominence" value={caseData.maxRightBuccalFrenumProminence} readOnly disabled />
          <input type="text" placeholder="Class" value={caseData.maxRightBuccalFrenumClass} readOnly disabled />
        </div>
      </div>

      <h3>Mandibular Labial Frenum</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="mandLabialFrenumNum">Number of attachments:</label>
          <input type="text" id="mandLabialFrenumNum" value={caseData.mandLabialFrenumNum} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="mandLabialFrenumProminence">Prominence:</label>
          <input type="text" id="mandLabialFrenumProminence" value={caseData.mandLabialFrenumProminence} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="mandLabialFrenumClass">Class:</label>
        <input type="text" id="mandLabialFrenumClass" value={caseData.mandLabialFrenumClass} readOnly disabled />
      </div>

      <h3>Mandibular Buccal Frenum</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Left:</label>
          <input type="text" placeholder="No. of attachments" value={caseData.mandLeftBuccalFrenumNum} readOnly disabled />
          <input type="text" placeholder="Prominence" value={caseData.mandLeftBuccalFrenumProminence} readOnly disabled />
          <input type="text" placeholder="Class" value={caseData.mandLeftBuccalFrenumClass} readOnly disabled />
        </div>
        <div className="form-group">
          <label>Right:</label>
          <input type="text" placeholder="No. of attachments" value={caseData.mandRightBuccalFrenumNum} readOnly disabled />
          <input type="text" placeholder="Prominence" value={caseData.mandRightBuccalFrenumProminence} readOnly disabled />
          <input type="text" placeholder="Class" value={caseData.mandRightBuccalFrenumClass} readOnly disabled />
        </div>
      </div>

      <h3>Attached Gingiva & Soft Tissue Ridge</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Maxilla - Attached Gingiva:</label>
          <CheckboxDisplay
            options={[
              { value: "Adequate", label: "Adequate" },
              { value: "Inadequate", label: "Inadequate" }
            ]}
            value={caseData.maxillaAttachedGingival}
          />
        </div>
        <div className="form-group">
          <label>Mandible - Attached Gingiva:</label>
          <CheckboxDisplay
            options={[
              { value: "Adequate", label: "Adequate" },
              { value: "Inadequate", label: "Inadequate" }
            ]}
            value={caseData.mandibleAttachedGingival}
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Maxilla - Soft Tissue Ridge:</label>
          <CheckboxDisplay
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Flabby", label: "Flabby" },
              { value: "Knife-edge", label: "Knife-edge" }
            ]}
            value={caseData.maxillaSoftTissueRidge}
          />
        </div>
        <div className="form-group">
          <label>Mandible - Soft Tissue Ridge:</label>
          <CheckboxDisplay
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Flabby", label: "Flabby" },
              { value: "Knife-edge", label: "Knife-edge" }
            ]}
            value={caseData.mandibleSoftTissueRidge}
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Maxilla - Mucosa Condition:</label>
          <CheckboxDisplay
            options={[
              { value: "Healthy", label: "Healthy" },
              { value: "Inflamed", label: "Inflamed" },
              { value: "Atrophic", label: "Atrophic" }
            ]}
            value={caseData.maxillaMucosaCondition}
          />
        </div>
        <div className="form-group">
          <label>Mandible - Mucosa Condition:</label>
          <CheckboxDisplay
            options={[
              { value: "Healthy", label: "Healthy" },
              { value: "Inflamed", label: "Inflamed" },
              { value: "Atrophic", label: "Atrophic" }
            ]}
            value={caseData.mandibleMucosaCondition}
          />
        </div>
      </div>

      <h3>Ridge Assessment</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Maxilla - Anterior Ridge Form:</label>
          <CheckboxDisplay
            options={[
              { value: "U-shaped", label: "U-shaped" },
              { value: "V-shaped", label: "V-shaped" }
            ]}
            value={caseData.maxillaAntRidgeForm}
          />
        </div>
        <div className="form-group">
          <label>Maxilla - Posterior Ridge Form:</label>
          <CheckboxDisplay
            options={[
              { value: "Rounded", label: "Rounded" },
              { value: "Angular", label: "Angular" }
            ]}
            value={caseData.maxillaPostRidgeForm}
          />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label>Mandible - Anterior Ridge Form:</label>
          <CheckboxDisplay
            options={[
              { value: "U-shaped", label: "U-shaped" },
              { value: "V-shaped", label: "V-shaped" }
            ]}
            value={caseData.mandibleAntRidgeForm}
          />
        </div>
        <div className="form-group">
          <label>Mandible - Posterior Ridge Form:</label>
          <CheckboxDisplay
            options={[
              { value: "Rounded", label: "Rounded" },
              { value: "Angular", label: "Angular" }
            ]}
            value={caseData.mandiblePostRidgeForm}
          />
        </div>
      </div>

      <h3>Ridge Relationships</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Ridge Contour:</label>
          <CheckboxDisplay
            options={[
              { value: "Resorbed", label: "Resorbed" },
              { value: "Moderate", label: "Moderate" },
              { value: "Good", label: "Good" }
            ]}
            value={caseData.ridgeContour}
          />
        </div>
        <div className="form-group">
          <label>Ridge Relation:</label>
          <CheckboxDisplay
            options={[
              { value: "Class I", label: "Class I" },
              { value: "Class II", label: "Class II" },
              { value: "Class III", label: "Class III" }
            ]}
            value={caseData.ridgeRelation}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Ridge Parallelism:</label>
        <CheckboxDisplay
          options={[
            { value: "Parallel", label: "Parallel" },
            { value: "Non-parallel", label: "Non-parallel" }
          ]}
          value={caseData.ridgeParallelism}
        />
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="ridgeHeight">Ridge Height:</label>
          <input type="text" id="ridgeHeight" value={caseData.ridgeHeight} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="ridgeWidth">Ridge Width:</label>
          <input type="text" id="ridgeWidth" value={caseData.ridgeWidth} readOnly disabled />
        </div>
      </div>

      <div className="form-row-wide">
        <div className="form-group">
          <label htmlFor="undercuts">Undercuts:</label>
          <input type="text" id="undercuts" value={caseData.undercuts} readOnly disabled />
        </div>
        <div className="form-group">
          <label htmlFor="exostosis">Exostosis:</label>
          <input type="text" id="exostosis" value={caseData.exostosis} readOnly disabled />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="torus">Torus:</label>
        <input type="text" id="torus" value={caseData.torus} readOnly disabled />
      </div>

      <h3>Saliva Assessment</h3>
      <div className="form-row-wide">
        <div className="form-group">
          <label>Saliva Quantity:</label>
          <CheckboxDisplay
            options={[
              { value: "Normal", label: "Normal" },
              { value: "Scanty", label: "Scanty" },
              { value: "Excessive", label: "Excessive" }
            ]}
            value={caseData.salivaQuantity}
          />
        </div>
        <div className="form-group">
          <label>Saliva Consistency:</label>
          <CheckboxDisplay
            options={[
              { value: "Serous", label: "Serous" },
              { value: "Mucoid", label: "Mucoid" },
              { value: "Mixed", label: "Mixed" }
            ]}
            value={caseData.salivaConsistency}
          />
        </div>
      </div>
    </div>
  );

  const renderPage7 = () => (
    <div className={`page ${currentPage === 6 ? 'active' : ''}`} style={{ display: currentPage === 6 ? 'block' : 'none' }}>
      <h2>Diagnosis & Treatment</h2>
      
      <div className="form-group">
        <label htmlFor="finalDiagnosis">Final Diagnosis:</label>
        <textarea id="finalDiagnosis" rows={3} value={caseData.finalDiagnosis} readOnly disabled />
      </div>

      <div className="form-group">
        <label htmlFor="treatmentPlan">Treatment Plan:</label>
        <textarea id="treatmentPlan" rows={3} value={caseData.treatmentPlan} readOnly disabled />
      </div>

      <div className="form-group">
        <label htmlFor="prostheticPrognosis">Prosthetic Prognosis:</label>
        <textarea id="prostheticPrognosis" rows={3} value={caseData.prostheticPrognosis} readOnly disabled />
      </div>

      <div className="form-group">
        <label htmlFor="recall">Recall:</label>
        <input type="text" id="recall" value={caseData.recall} readOnly disabled />
      </div>

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
  );

  if (isLoading) {
    return (
      <div className="digital-doctor-case-sheet" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading case sheet...</p>
      </div>
    );
  }

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
            <center><img src="/logo.png" alt="SRM Dental College Logo" /></center>
            <h1>SRM DENTAL COLLEGE</h1>
            <h2>DEPARTMENT OF PROSTHODONTICS</h2>
            <h3>COMPLETE DENTURE CASE SHEET </h3>
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
          <button type="button" onClick={handlePrev} disabled={currentPage === 0}>
            Previous
          </button>

          <button type="button" onClick={handleNext} disabled={currentPage === totalPages - 1}>
            Next
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