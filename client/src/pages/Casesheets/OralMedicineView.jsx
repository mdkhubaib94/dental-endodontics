import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';
import './OralMedicineView.css';

const OralMedicineView = ({ caseData: propCaseData }) => {
  const { caseId: paramsCaseId } = useParams();
  const [caseData, setCaseData] = useState(propCaseData || null);
  const [loading, setLoading] = useState(!propCaseData);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = 8;

  useEffect(() => {
    if (propCaseData) return;
    const fetchCaseData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/oral/${paramsCaseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setCaseData(data.data);
        } else {
          console.error('Failed to fetch case data');
        }
      } catch (error) {
        console.error('Error fetching case data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCaseData();
  }, [paramsCaseId, propCaseData]);

  const handleNext = () => { if (currentPage < totalPages - 1) setCurrentPage(p => p + 1); };
  const handlePrev = () => { if (currentPage > 0) setCurrentPage(p => p - 1); };

  const field = (label, value) => (
    <div className="form-group-casesheet">
      {label && <label>{label}</label>}
      <div className="readonly-field">{value || '—'}</div>
    </div>
  );

  const area = (label, value) => (
    <div className="form-group-casesheet">
      {label && <label>{label}</label>}
      <div className="readonly-textarea">{value || '—'}</div>
    </div>
  );

  if (loading) return <div className="omr-view-loading">Loading case sheet...</div>;
  if (!caseData) return <div className="omr-view-loading">Case not found.</div>;

  // Resolve sex/gender — new form stores in `sex`, old records in `gender`
  const sexDisplay = caseData.sex || caseData.gender || '';
  const ageSex = [caseData.age, sexDisplay].filter(Boolean).join(' / ');

  // Personal history habits
  const habits = [
    caseData.smoking  && 'Smoking',
    caseData.alcohol  && 'Alcohol',
    caseData.betelNut && 'Betel Nut',
    caseData.tobacco  && 'Tobacco',
  ].filter(Boolean).join(', ') || '—';

  return (
    <div className="digital-doctor-case-sheet">
      <div className="case-sheet">
        <div className="header">
          <h1>ORAL MEDICINE AND RADIOLOGY</h1>
          <h2>CASE SHEET</h2>
        </div>

        {/* ── Page 1: Patient Information & History ── */}
        {currentPage === 0 && (
          <div className="page active">
            <div className="form-row-wide">
              {field('CASE SHEET:', caseData.caseSheetNumber)}
              {field('DATE:', caseData.date ? new Date(caseData.date).toLocaleDateString() : '')}
            </div>

            <div className="form-row-wide">
              {field('NAME:', caseData.patientName)}
              {field('OP.NO:', caseData.opNo)}
            </div>

            <div className="form-row-wide">
              {field('AGE/SEX:', ageSex)}
              {field('OCCUPATION:', caseData.occupation)}
            </div>

            <div className="form-row-wide">
              {field('INCOME:', caseData.income)}
              {field('RELIGION:', caseData.religion)}
            </div>

            {area('ADDRESS:', caseData.address)}

            <h3>CHIEF COMPLAINT:</h3>
            {area('', caseData.chiefComplaint)}

            <h3>HISTORY OF PRESENTING ILLNESS:</h3>
            {area('', caseData.historyOfPresentIllness)}

            <h3>PAST MEDICAL HISTORY:</h3>
            {area('', caseData.pastMedicalHistory)}

            <h3>PAST SURGICAL HISTORY:</h3>
            {area('', caseData.pastSurgicalHistory)}

            <h3>PAST DENTAL HISTORY:</h3>
            {area('', caseData.pastDentalHistory)}

            <h3>PERSONAL HISTORY:</h3>
            {area('', caseData.personalHistory || (caseData.personalDiet || habits !== '—' ? `Habits: ${habits}\nDiet: ${caseData.personalDiet || '—'}\nSleep: ${caseData.personalSleep || '—'}\nOral Hygiene: ${caseData.oralHygieneHabits || '—'}` : ''))}

            <h3>FAMILY HISTORY:</h3>
            {area('', caseData.familyHistory || [
              caseData.hereditaryDiseases && `Hereditary Diseases: ${caseData.hereditaryDiseases}`,
              caseData.similarComplaintsInFamily && `Similar Complaints: ${caseData.similarComplaintsInFamily}`,
              caseData.systemicIllnesses && `Systemic Illnesses: ${caseData.systemicIllnesses}`,
            ].filter(Boolean).join('\n'))}
          </div>
        )}

        {/* ── Page 2: Clinical Examination ── */}
        {currentPage === 1 && (
          <div className="page active">
            <h2>CLINICAL EXAMINATION</h2>
            <h3>GENERAL EXAMINATION:</h3>
            {area('', caseData.generalExamination || [
              caseData.built         && `Built: ${caseData.built}`,
              caseData.nourishment   && `Nourishment: ${caseData.nourishment}`,
              caseData.pallor        && `Pallor: ${caseData.pallor}`,
              caseData.icterus       && `Icterus: ${caseData.icterus}`,
              caseData.cyanosis      && `Cyanosis: ${caseData.cyanosis}`,
              caseData.clubbing      && `Clubbing: ${caseData.clubbing}`,
              caseData.edema         && `Edema: ${caseData.edema}`,
              caseData.lymphadenopathy && `Lymphadenopathy: ${caseData.lymphadenopathy}`,
              caseData.vitalSigns    && `Vital Signs: ${caseData.vitalSigns}`,
            ].filter(Boolean).join('\n'))}

            <h3>REVIEW OF SYSTEMS:</h3>
            <h4>1. CENTRAL NERVOUS SYSTEM:</h4>
            {area('', caseData.centralNervousSystem || caseData.cns)}
            <h4>2. CARDIO VASCULAR SYSTEM:</h4>
            {area('', caseData.cardioVascularSystem || caseData.cvs)}
            <h4>3. RESPIRATORY SYSTEM:</h4>
            {area('', caseData.respiratorySystem || caseData.respiratory)}
            <h4>4. GASTRO-INTESTINAL SYSTEM:</h4>
            {area('', caseData.gastroIntestinalSystem || caseData.gastrointestinal)}
            <h4>5. GENITO-URINARY SYSTEM:</h4>
            {area('', caseData.genitoUrinarySystem || caseData.genitoUrinary)}
            <h4>6. SKELETAL SYSTEM:</h4>
            {area('', caseData.skeletalSystem || caseData.skeletal)}
          </div>
        )}

        {/* ── Page 3: Extra Oral Examination ── */}
        {currentPage === 2 && (
          <div className="page active">
            <h2>LOCAL EXAMINATION</h2>
            <h3>EXTRA ORAL EXAMINATION</h3>

            <h4>a) Facial Symmetry:</h4>
            {area('', caseData.facialSymmetry)}
            <h4>b) Facial Profile:</h4>
            {area('', caseData.facialProfile)}
            <h4>c) Ear, Nose, Eyes:</h4>
            {area('', caseData.earNoseEyes || [
              caseData.earExamination  && `Ear: ${caseData.earExamination}`,
              caseData.noseExamination && `Nose: ${caseData.noseExamination}`,
              caseData.eyeExamination  && `Eyes: ${caseData.eyeExamination}`,
            ].filter(Boolean).join('\n'))}

            <h4>d) TMJ Examination:</h4>
            <div style={{ marginLeft: '20px' }}>
              <h5>- Inspection:</h5>
              {area('', caseData.tmjInspection)}
              <h5>- Palpation:</h5>
              {area('', caseData.tmjPalpation)}
              <h5>- Percussion:</h5>
              {area('', caseData.tmjPercussion || caseData.tmjPercussionAuscultation)}
              <h5>- Auscultation:</h5>
              {area('', caseData.tmjAuscultation)}
            </div>

            <h4>e) Lymph Node Examination:</h4>
            {area('', caseData.lymphNodeExamination || [
              caseData.submandibular && `Submandibular: ${caseData.submandibular}`,
              caseData.cervical      && `Cervical: ${caseData.cervical}`,
              caseData.submental     && `Submental: ${caseData.submental}`,
              caseData.preauricular  && `Preauricular: ${caseData.preauricular}`,
              caseData.postauricular && `Postauricular: ${caseData.postauricular}`,
            ].filter(Boolean).join('\n'))}
          </div>
        )}

        {/* ── Page 4: Intra Oral + Hard Tissue ── */}
        {currentPage === 3 && (
          <div className="page active">
            <h2>INTRA ORAL EXAMINATION</h2>
            <h3>1. Site and Shape of the mouth:</h3>
            {area('', caseData.siteShapeOfMouth)}
            <h3>2. Mouth Opening:</h3>
            {area('', caseData.mouthOpening)}
            <h3>3. Jaw movements:</h3>
            {area('', caseData.jawMovements)}

            <h2>Hard Tissue Examination</h2>
            <h3>1. Teeth present:</h3>
            {area('', caseData.teethPresent)}
            <h3>2. Size, shape and color:</h3>
            {area('', caseData.sizeShapeColor || [
              caseData.toothSize  && `Size: ${caseData.toothSize}`,
              caseData.toothShape && `Shape: ${caseData.toothShape}`,
              caseData.toothColor && `Color: ${caseData.toothColor}`,
            ].filter(Boolean).join(' | '))}
            <h3>3. Dental caries:</h3>
            {area('', caseData.dentalCaries)}
            <h3>4. Missing</h3>
            {area('', caseData.missing || caseData.missingTeeth)}
            <h3>5. Mobility:</h3>
            {area('', caseData.mobility)}
            <h3>6. Occlusion:</h3>
            {area('', caseData.occlusion)}
            <h3>7. Recession:</h3>
            {area('', caseData.recession)}
            <h3>8. Attrition:</h3>
            {area('', caseData.attrition)}
            <h3>9. Calculus and stains:</h3>
            {area('', caseData.calculusAndStains)}
            <h3>10. Others:</h3>
            {area('', caseData.hardTissueOthers)}
          </div>
        )}

        {/* ── Page 5: Soft Tissue ── */}
        {currentPage === 4 && (
          <div className="page active">
            <h2>Soft Tissue Examination:</h2>
            <h3>a. Gingival</h3>
            {area('', caseData.gingival || caseData.gingiva)}
            <h3>b. Alveolar Mucosa:</h3>
            {area('', caseData.alveolarMucosa)}
            <h3>c. Buccal mucosa:</h3>
            {area('', caseData.buccalMucosa)}
            <h3>d. Labial mucosa:</h3>
            {area('', caseData.labialMucosa)}
            <h3>e. Tongue:</h3>
            {area('', caseData.tongue)}
            <h3>f. Floor of the oral cavity:</h3>
            {area('', caseData.floorOfOralCavity || caseData.floorOfMouth)}
            <h3>g. Palate:</h3>
            {area('', caseData.palate)}
            <h3>h. Pillar of Fauces and tonsils:</h3>
            {area('', caseData.pillarOfFaucesAndTonsils || [caseData.pillarOfFauces, caseData.tonsils].filter(Boolean).join(' / '))}
            <h3>i. Retro-molar area:</h3>
            {area('', caseData.retroMolarArea || caseData.retromolarArea)}
          </div>
        )}

        {/* ── Page 6: Lesion Examination ── */}
        {currentPage === 5 && (
          <div className="page active">
            <h2>Examination of Lesion</h2>
            <h3>A. Inspection:</h3>
            {area('', caseData.lesionInspection || [
              caseData.lesionSite           && `Site: ${caseData.lesionSite}`,
              caseData.lesionSize           && `Size: ${caseData.lesionSize}`,
              caseData.lesionShape          && `Shape: ${caseData.lesionShape}`,
              caseData.lesionSurfaceTexture && `Surface Texture: ${caseData.lesionSurfaceTexture}`,
              caseData.lesionBorders        && `Borders: ${caseData.lesionBorders}`,
              caseData.lesionMargins        && `Margins: ${caseData.lesionMargins}`,
              caseData.lesionColor          && `Color: ${caseData.lesionColor}`,
              caseData.lesionNumber         && `Number: ${caseData.lesionNumber}`,
            ].filter(Boolean).join('\n'))}

            <h3>B. Palpation:</h3>
            {area('', caseData.lesionPalpation || [
              caseData.lesionTenderness      && `Tenderness: ${caseData.lesionTenderness}`,
              caseData.lesionConsistency     && `Consistency: ${caseData.lesionConsistency}`,
              caseData.lesionFixity          && `Fixity: ${caseData.lesionFixity}`,
              caseData.lesionTemperature     && `Temperature: ${caseData.lesionTemperature}`,
              caseData.lesionCompressibility && `Compressibility: ${caseData.lesionCompressibility}`,
              caseData.lesionFluctuation     && `Fluctuation: ${caseData.lesionFluctuation}`,
              caseData.lesionInduration      && `Induration: ${caseData.lesionInduration}`,
            ].filter(Boolean).join('\n'))}

            <h3>Summary:</h3>
            {area('', caseData.summary)}
          </div>
        )}

        {/* ── Page 7: Diagnosis & Investigations ── */}
        {currentPage === 6 && (
          <div className="page active">
            <h2>Diagnosis</h2>
            <h3>Provisional Diagnosis:</h3>
            {area('', caseData.provisionalDiagnosis)}
            <h3>Differential Diagnosis:</h3>
            {area('', caseData.differentialDiagnosis)}
            <h3>Clinical Diagnosis:</h3>
            {area('', caseData.clinicalDiagnosis)}

            <h2>Investigation:</h2>
            {[
              ['a) Hematological',             caseData.hematological            || (caseData.invHematological    ? caseData.invHematologicalNotes    : '')],
              ['b) Urine',                      caseData.urine                    || (caseData.invUrine            ? caseData.invUrineNotes            : '')],
              ['c) Bio-Chemical',               caseData.bioChemical              || (caseData.invBiochemical      ? caseData.invBiochemicalNotes      : '')],
              ['d) Serological',                caseData.serological              || (caseData.invSerological      ? caseData.invSerologicalNotes      : '')],
              ['e) Cytological',                caseData.cytological              || (caseData.invCytological      ? caseData.invCytologicalNotes      : '')],
              ['f) Microbiological',            caseData.microbiological          || (caseData.invMicrobiological  ? caseData.invMicrobiologicalNotes  : '')],
              ['g) Special investigations',     caseData.specialInvestigations    || (caseData.invSpecial          ? caseData.invSpecialNotes          : '')],
              ['h) Radiological',               caseData.radiological             || (caseData.invRadiological     ? caseData.invRadiologicalNotes     : '')],
              ['i) Biopsy',                     caseData.biopsy                   || (caseData.invBiopsy           ? caseData.invBiopsyNotes           : '')],
              ['j) Histopathological Examination', caseData.histopathologicalExamination || (caseData.invHistopathological ? caseData.invHistopathologicalNotes : '')],
              ['k) Any others',                 caseData.otherInvestigations      || (caseData.invOthers           ? caseData.invOthersNotes           : '')],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <h3>{label}</h3>
                {area('', value)}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Page 8: Treatment Planning ── */}
        {currentPage === 7 && (
          <div className="page active">
            <h2>Treatment planning:</h2>
            <h3>Treatment Plan:</h3>
            {area('', caseData.treatmentPlan)}
            <h3>Prognosis:</h3>
            {area('', caseData.prognosis)}
            <h3>Follow-up Notes:</h3>
            {area('', caseData.followUpNotes)}

            {(caseData.doctorSignature || caseData.pgSignature) && (
              <>
                <h3>Signatures:</h3>
                <div className="form-row-wide">
                  {field('Doctor Signature:', caseData.doctorSignature)}
                  {field('PG Student Signature:', caseData.pgSignature)}
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="navigation">
          <button onClick={handlePrev} disabled={currentPage === 0}>Previous</button>
          <span>Page {currentPage + 1} of {totalPages}</span>
          <button onClick={handleNext} disabled={currentPage === totalPages - 1}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default OralMedicineView;
