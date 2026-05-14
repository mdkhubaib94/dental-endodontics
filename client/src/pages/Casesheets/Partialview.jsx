import React, { useState, useRef, useEffect } from 'react';
import './Partialview.css';

const PartialView = ({ caseData }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 11;
  const topRef = useRef(null);

  // Scroll to top when page changes
  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [currentPage]);

  // Navigation functions
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Helper function to display value or "-"
  const displayValue = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '-';
    }
    return value || '-';
  };

  // Helper function to render radio condition display
  const renderRadioConditionDisplay = (name, label) => (
    <div className="condition-item-view">
      <label>{label}</label>
      <span className="condition-value">
        {caseData[name] === 'yes' ? '✓ Yes' : caseData[name] === 'no' ? '✗ No' : '-'}
      </span>
    </div>
  );

  // Medical history conditions
  const medicalConditions = [
    { id: 'cardio', label: 'Cardiovascular disease' },
    { id: 'resp', label: 'Respiratory disorder' },
    { id: 'diabetes', label: 'Diabetes' },
    { id: 'blood', label: 'Blood dyscrasias' },
    { id: 'neuro', label: 'Neurological disease/facial palsy' },
    { id: 'rheumatic', label: 'Rheumatic fever' },
    { id: 'skin', label: 'Skin disorders' },
    { id: 'bone', label: 'Rheumatoid arthritis/bone disorders' },
    { id: 'hep', label: 'Hepatitis' },
    { id: 'immune', label: 'Immune disorders' },
    { id: 'allergy', label: 'Allergic reactions' },
    { id: 'others_medical', label: 'Others:' },
  ];

  // Treatment procedures
  const treatmentProcedures = [
    { id: 1, name: 'Diagnostic impression' },
    { id: 2, name: 'Preparation of diagnostic cast' },
    { id: 3, name: 'Surveying and designing of diagnostic cast' },
    { id: 4, name: 'Mouth preparation' },
    { id: 5, name: 'Definitive impression Material used' },
    { id: 6, name: 'Preparation of master cast' },
    { id: 7, name: 'Surveying and designing of master cast' },
    { id: 8, name: 'Block out procedure' },
    { id: 9, name: 'Duplication and refractory casts' },
    { id: 10, name: 'Preparation of refractory cast' },
    { id: 11, name: 'Wax pattern for frame work' },
    { id: 12, name: 'Casting of frame work' },
    { id: 13, name: 'Finishing and polishing of frame work' },
    { id: 14, name: 'Metal try in' },
    { id: 15, name: 'Altered cast impression' },
    { id: 16, name: 'Occlusal rim preparation' },
    { id: 17, name: 'Tentative jaw relation' },
    { id: 18, name: 'Facebow transfer' },
    { id: 19, name: 'Jaw relation recording' },
    { id: 20, name: 'Articulation of casts' },
    { id: 21, name: 'Teeth arrangement' },
    { id: 22, name: 'Wax try in' },
    { id: 23, name: 'Acrylization' },
    { id: 24, name: 'Finishing and polishing' },
    { id: 25, name: 'Denture delivery' },
    { id: 26, name: 'Post insertion follow up-1' },
    { id: 27, name: 'Post insertion follow up-2' },
  ];

  // Render Page 1: Medical History
  const renderPage1 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">1. Medical History</h2>
      <p className="section-description-view">Patient's medical history conditions:</p>

      <div className="medical-history-conditions-view">
        {medicalConditions.map(condition => renderRadioConditionDisplay(condition.id, condition.label))}
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">
          A. Details of treatment for any of the above said ailments:
        </label>
        <div className="case-sheet-value-box">
          {displayValue(caseData.treatment)}
        </div>
      </div>
    </div>
  );

  // Render Page 2: General Examination
  const renderPage2 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">2. General Examination</h2>
      
      <div className="info-grid-view">
        <div className="info-item-view">
          <label>Gait:</label>
          <span>{displayValue(caseData.gait)}</span>
        </div>
        <div className="info-item-view">
          <label>Tuilt:</label>
          <span>{displayValue(caseData.tuilt)}</span>
        </div>
        <div className="info-item-view">
          <label>Weight:</label>
          <span>{displayValue(caseData.weight)}</span>
        </div>
        <div className="info-item-view">
          <label>Height:</label>
          <span>{displayValue(caseData.height)}</span>
        </div>
      </div>

      <h4 className="case-sheet-subtitle-view">Vital Signs</h4>
      <div className="info-grid-view">
        <div className="info-item-view">
          <label>Blood pressure:</label>
          <span>{displayValue(caseData.bp)}</span>
        </div>
        <div className="info-item-view">
          <label>Respiratory rate:</label>
          <span>{displayValue(caseData.resp_rate)}</span>
        </div>
        <div className="info-item-view">
          <label>Heart rate:</label>
          <span>{displayValue(caseData.heart_rate)}</span>
        </div>
        <div className="info-item-view">
          <label>Body temperature:</label>
          <span>{displayValue(caseData.temperature)}</span>
        </div>
      </div>
    </div>
  );

  // Render Page 3: Patient Information
  const renderPage3 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">3. Patient Information</h2>
      
      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Nutritional status:</label>
        <div className="case-sheet-value">{displayValue(caseData.nutrition)}</div>
      </div>

      <h3 className="case-sheet-subtitle-view">4. Patient's Mental Attitude: (M.M. House Classification)</h3>
      <div className="case-sheet-value">{displayValue(caseData.attitude)}</div>

      <h3 className="case-sheet-subtitle-view">5. Habits:</h3>
      <div className="case-sheet-value">{displayValue(caseData.habits)}</div>
      
      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Duration/frequency of the habit:</label>
        <div className="case-sheet-value">{displayValue(caseData.habit_duration)}</div>
      </div>

      <h3 className="case-sheet-subtitle-view">6. Dental History:</h3>
      
      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">A. History of previous dental treatment/s:</label>
        <div className="case-sheet-value-box">{displayValue(caseData.prev_treatment)}</div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">B. Reasons for tooth loss:</label>
        <div className="case-sheet-value">{displayValue(caseData.loss_reason)}</div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">C. Sequence of loss of teeth:</label>
        
        <div className="subsection-view">
          <h4>Maxillary</h4>
          <div className="info-grid-view">
            <div className="info-item-view">
              <label>Anterior:</label>
              <span>{displayValue(caseData.max_anterior)}</span>
            </div>
            <div className="info-item-view">
              <label>Posterior:</label>
              <span>{displayValue(caseData.max_posterior)}</span>
            </div>
          </div>
        </div>

        <div className="subsection-view">
          <h4>Mandibular</h4>
          <div className="info-grid-view">
            <div className="info-item-view">
              <label>Anterior:</label>
              <span>{displayValue(caseData.mand_anterior)}</span>
            </div>
            <div className="info-item-view">
              <label>Posterior:</label>
              <span>{displayValue(caseData.mand_posterior)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">D. Duration of rulones:</label>
        <div className="case-sheet-value">{displayValue(caseData.duration_rulones)}</div>
      </div>
    </div>
  );

  // Render Page 4: Clinical Examination
  const renderPage4 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">7. Clinical Examination</h2>
      <h3 className="case-sheet-subtitle-view">A. Extra Oral Examination</h3>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">a) Facial symmetry:</label>
        <div className="case-sheet-value">{displayValue(caseData.facial_symmetry)}</div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">b) Facial profile (Angle's classification):</label>
        <div className="case-sheet-value">{displayValue(caseData.facial_profile)}</div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Facial form (House and Loop, Prush and Fischer, Leon Williams):</label>
        <div className="case-sheet-value">{displayValue(caseData.facial_form)}</div>
      </div>

      <h3 className="case-sheet-subtitle-view">TMJ Examination</h3>
      <h4>1. Inspection</h4>
      
      <div className="info-grid-view">
        <div className="info-item-view">
          <label>a) Maximum mouth opening (mm):</label>
          <span>{displayValue(caseData.mouth_opening)}</span>
        </div>
        <div className="info-item-view">
          <label>b) Deviation of mandible:</label>
          <span>{displayValue(caseData.mandible_deviation)}</span>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Opening Deviation:</label>
        <div className="case-sheet-value">{displayValue(caseData.opening_deviation)}</div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Closing Deviation:</label>
        <div className="case-sheet-value">{displayValue(caseData.closing_deviation)}</div>
      </div>

      <h4>2. Palpation</h4>
      
      <div className="info-grid-view">
        <div className="info-item-view">
          <label>a) Pain/tenderness:</label>
          <span>{displayValue(caseData.pain_tenderness)}</span>
        </div>
        <div className="info-item-view">
          <label>b) Clicking:</label>
          <span>{displayValue(caseData.clicking)}</span>
        </div>
      </div>

      <h4>3. Auscultation</h4>
      
      <div className="info-grid-view">
        <div className="info-item-view">
          <label>a) Crepitus:</label>
          <span>{displayValue(caseData.crepitus)}</span>
        </div>
        <div className="info-item-view">
          <label>b) Lymph nodes:</label>
          <span>{displayValue(caseData.lymph_nodes)}</span>
        </div>
        <div className="info-item-view">
          <label>c) Lips:</label>
          <span>{displayValue(caseData.lips)}</span>
        </div>
        <div className="info-item-view">
          <label>Competency:</label>
          <span>{displayValue(caseData.competency)}</span>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Lip length:</label>
        <div className="case-sheet-value">{displayValue(caseData.lip_length)}</div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Pathology if any:</label>
        <div className="case-sheet-value-box">{displayValue(caseData.pathology)}</div>
      </div>
    </div>
  );

  // Render Page 5: Intraoral Examination
  const renderPage5 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">8. Intraoral Examination</h2>
      
      <div className="case-sheet-form-group-view">
        <h3 className="case-sheet-subtitle-view">c) Extra Oral Muscle Tone (M.M. House Classification)</h3>
        <div className="case-sheet-value">{displayValue(caseData.muscle_tone)}</div>
      </div>

      <h3 className="case-sheet-subtitle-view">9. Intraoral Examination</h3>
      
      <div className="case-sheet-form-group-view">
        <h4>a) Buccal Mucosa</h4>
        <div className="info-grid-view">
          <div className="info-item-view">
            <label>Colour:</label>
            <span>{displayValue(caseData.buccal_colour)}</span>
          </div>
          <div className="info-item-view">
            <label>Texture:</label>
            <span>{displayValue(caseData.buccal_texture)}</span>
          </div>
          <div className="info-item-view">
            <label>Others:</label>
            <span>{displayValue(caseData.buccal_others)}</span>
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <h4>b) Floor of the Mouth</h4>
        <div className="info-grid-view">
          <div className="info-item-view">
            <label>Colour:</label>
            <span>{displayValue(caseData.floor_colour)}</span>
          </div>
          <div className="info-item-view">
            <label>Others:</label>
            <span>{displayValue(caseData.floor_others)}</span>
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <h4>c) Hard Palate</h4>
        <div className="info-grid-view">
          <div className="info-item-view">
            <label>High arched / Normal:</label>
            <span>{displayValue(caseData.hard_shape)}</span>
          </div>
          <div className="info-item-view">
            <label>Tori:</label>
            <span>{displayValue(caseData.hard_tori)}</span>
          </div>
          <div className="info-item-view">
            <label>Hyperplasia:</label>
            <span>{displayValue(caseData.hard_hyperplasia)}</span>
          </div>
          <div className="info-item-view">
            <label>Inflammation:</label>
            <span>{displayValue(caseData.hard_inflammation)}</span>
          </div>
          <div className="info-item-view">
            <label>Others:</label>
            <span>{displayValue(caseData.hard_others)}</span>
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <h4>d) Soft Palate</h4>
        <div className="info-item-view">
          <label>Soft Palatal Form (Sheldon Winkler):</label>
          <span>{displayValue(caseData.soft_palate_form)}</span>
        </div>
        <div className="info-grid-view" style={{ marginTop: '10px' }}>
          <div className="info-item-view">
            <label>Colour:</label>
            <span>{displayValue(caseData.soft_colour)}</span>
          </div>
          <div className="info-item-view">
            <label>Others:</label>
            <span>{displayValue(caseData.soft_others)}</span>
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <h4>e) Tongue</h4>
        <div className="info-item-view">
          <label>Size (M.M. House Classification):</label>
          <span>{displayValue(caseData.tongue_size)}</span>
        </div>
        <div className="info-item-view">
          <label>Tongue Position (Wright's Classification):</label>
          <span>{displayValue(caseData.tongue_position)}</span>
        </div>
        <div className="info-item-view">
          <label>Mobility:</label>
          <span>{displayValue(caseData.tongue_mobility)}</span>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <h4>f) Saliva (M.M. House Classification)</h4>
        <div className="case-sheet-value">{displayValue(caseData.saliva_class)}</div>
      </div>
    </div>
  );

  // Render Page 6: Gingival & Oral Hygiene
  const renderPage6 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">10. Gingival & Oral Hygiene Index</h2>
      <h3 className="case-sheet-subtitle-view">h) Gingival Index (Loe and Silness)</h3>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Upper Arch</label>
        <div className="score-display-grid">
          <div className="score-item-view">
            <strong>Buccal Distal:</strong> {displayValue(caseData.buccal_upper_distal)}
          </div>
          <div className="score-item-view">
            <strong>Buccal Mesial:</strong> {displayValue(caseData.buccal_upper_mesial)}
          </div>
          <div className="score-item-view">
            <strong>Palatal Distal:</strong> {displayValue(caseData.palatal_upper_distal)}
          </div>
          <div className="score-item-view">
            <strong>Palatal Mesial:</strong> {displayValue(caseData.palatal_upper_mesial)}
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Lower Arch</label>
        <div className="score-display-grid">
          <div className="score-item-view">
            <strong>Buccal Distal:</strong> {displayValue(caseData.buccal_lower_distal)}
          </div>
          <div className="score-item-view">
            <strong>Buccal Mesial:</strong> {displayValue(caseData.buccal_lower_mesial)}
          </div>
          <div className="score-item-view">
            <strong>Lingual Distal:</strong> {displayValue(caseData.lingual_lower_distal)}
          </div>
          <div className="score-item-view">
            <strong>Lingual Mesial:</strong> {displayValue(caseData.lingual_lower_mesial)}
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <div className="score-result-view">
          <label>Gingival Index:</label>
          <span className="score-value">{displayValue(caseData.gingival_index)}</span>
        </div>
        <div className="interpret-box-view">
          <strong>Interpretation:</strong><br/>
          Mild gingivitis: 0.1 to 1.0<br/>
          Moderate gingivitis: 1.1 to 2.0<br/>
          Severe gingivitis: 2.1 to 3.0
        </div>
      </div>

      <h3 className="case-sheet-subtitle-view">i) Oral Hygiene Index - Simplified (Green and Vermillion)</h3>
      <h4>i. Debris Score</h4>
      <div className="case-sheet-form-group-view">
        <div className="score-display-grid">
          <div className="score-item-view"><strong>16:</strong> {displayValue(caseData.debris_16)}</div>
          <div className="score-item-view"><strong>11:</strong> {displayValue(caseData.debris_11)}</div>
          <div className="score-item-view"><strong>26:</strong> {displayValue(caseData.debris_26)}</div>
          <div className="score-item-view"><strong>46:</strong> {displayValue(caseData.debris_46)}</div>
          <div className="score-item-view"><strong>31:</strong> {displayValue(caseData.debris_31)}</div>
          <div className="score-item-view"><strong>36:</strong> {displayValue(caseData.debris_36)}</div>
        </div>

        <div className="score-result-view">
          <label>Debris Score:</label>
          <span className="score-value">{displayValue(caseData.debris_score)}</span>
        </div>
      </div>

      <h4>ii. Calculus Score</h4>
      <div className="case-sheet-form-group-view">
        <div className="score-display-grid">
          <div className="score-item-view"><strong>16:</strong> {displayValue(caseData.calc_16)}</div>
          <div className="score-item-view"><strong>11:</strong> {displayValue(caseData.calc_11)}</div>
          <div className="score-item-view"><strong>26:</strong> {displayValue(caseData.calc_26)}</div>
          <div className="score-item-view"><strong>46:</strong> {displayValue(caseData.calc_46)}</div>
          <div className="score-item-view"><strong>31:</strong> {displayValue(caseData.calc_31)}</div>
          <div className="score-item-view"><strong>36:</strong> {displayValue(caseData.calc_36)}</div>
        </div>

        <div className="score-result-view">
          <label>Calculus Score:</label>
          <span className="score-value">{displayValue(caseData.calculus_score)}</span>
        </div>
      </div>
    </div>
  );

  // Render Page 7: Periodontal Charting & DMF Index
  const renderPage7 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">11. Periodontal Charting & Oral Hygiene</h2>
      
      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Oral Hygiene Index - S</label>
        <p><strong>OHI-S = Debris Index-S + Calculus Index-S</strong></p>
        <div className="score-calculation-view">
          <span>{displayValue(caseData.debrisTotal)} + {displayValue(caseData.calculusTotal)} = <strong>{displayValue(caseData.ohis)}</strong></span>
        </div>

        <div className="interpret-box-view">
          <strong>Interpretation:</strong><br/>
          Good: 0.0 to 1.2<br/>
          Fair: 1.3 to 3.0<br/>
          Poor: 3.1 to 6.0
        </div>
      </div>

      <h3 className="case-sheet-subtitle-view">j) DMF Index (H.T. Klein, C.E. Palmer, J.W. Knutson)</h3>
      <div className="case-sheet-form-group-view">
        <table className="case-sheet-table-view">
          <thead>
            <tr><th colSpan="16">MAX</th></tr>
            <tr>
              <td>8</td><td>7</td><td>6</td><td>5</td><td>4</td><td>3</td><td>2</td><td>1</td>
              <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[...Array(16)].map((_, i) => {
                const num = i + 1;
                const suffix = num > 8 ? '_r' : '';
                const toothNum = num > 8 ? num - 8 : num;
                const name = `dmf_max${toothNum}${suffix}`;
                return (
                  <td key={name}>{displayValue(caseData[name])}</td>
                );
              })}
            </tr>
          </tbody>
          <thead>
            <tr><th colSpan="16">MAND</th></tr>
            <tr>
              <td>8</td><td>7</td><td>6</td><td>5</td><td>4</td><td>3</td><td>2</td><td>1</td>
              <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[...Array(16)].map((_, i) => {
                const num = i + 1;
                const suffix = num > 8 ? '_r' : '';
                const toothNum = num > 8 ? num - 8 : num;
                const name = `dmf_mand${toothNum}${suffix}`;
                return (
                  <td key={name}>{displayValue(caseData[name])}</td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Page 8: Tooth Structure & Occlusion
  const renderPage8 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">12. Loss of Tooth Structure & Occlusion</h2>
      <h3 className="case-sheet-subtitle-view">l) Loss of Tooth Structure:</h3>
      
      <div className="info-grid-view">
        <div className="info-item-view">
          <label>Abrasion:</label>
          <span>{displayValue(caseData.abrasion)}</span>
        </div>
        <div className="info-item-view">
          <label>Occlusal Wear / Attrition:</label>
          <span>{displayValue(caseData.attrition)}</span>
        </div>
        <div className="info-item-view">
          <label>Erosion:</label>
          <span>{displayValue(caseData.erosion)}</span>
        </div>
        <div className="info-item-view">
          <label>Abfraction:</label>
          <span>{displayValue(caseData.abfraction)}</span>
        </div>
      </div>

      <h3 className="case-sheet-subtitle-view">m) Anatomic and Functional Status of Edentulous Ridge:</h3>
      
      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Mucosa</label>
        <div className="info-grid-view">
          <div className="info-item-view">
            <label>Colour:</label>
            <span>{displayValue(caseData.mucosa_color)}</span>
          </div>
          <div className="info-item-view">
            <label>Consistency:</label>
            <span>{displayValue(caseData.mucosa_consistency)}</span>
          </div>
          <div className="info-item-view">
            <label>Thickness:</label>
            <span>{displayValue(caseData.mucosa_thickness)}</span>
          </div>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Ridge Classification (Siebert's Classification):</label>
        <div className="case-sheet-value">{displayValue(caseData.ridgeClass)}</div>
      </div>

      <div className="info-grid-view">
        <div className="info-item-view">
          <label>Height of the Ridge:</label>
          <span>{displayValue(caseData.ridgeHeight)}</span>
        </div>
        <div className="info-item-view">
          <label>Length (mesio-distal):</label>
          <span>{displayValue(caseData.ridgeLength)}</span>
        </div>
        <div className="info-item-view">
          <label>Width (bucco-lingual):</label>
          <span>{displayValue(caseData.ridgeWidth)}</span>
        </div>
      </div>

      <h3 className="case-sheet-subtitle-view">n) Occlusion:</h3>
      
      <div className="info-grid-view">
        <div className="info-item-view">
          <label>Molar Relation (Angle's Classification):</label>
          <span>{displayValue(caseData.molarRelation)}</span>
        </div>
        <div className="info-item-view">
          <label>Occlusal Plane Discrepancies:</label>
          <span>{displayValue(caseData.occlusalPlane)}</span>
        </div>
        <div className="info-item-view">
          <label>Drifting of Teeth:</label>
          <span>{displayValue(caseData.drifting)}</span>
        </div>
        <div className="info-item-view">
          <label>Supra-eruption / Intrusion:</label>
          <span>{displayValue(caseData.supraEruption)}</span>
        </div>
        <div className="info-item-view">
          <label>Rotation:</label>
          <span>{displayValue(caseData.rotation)}</span>
        </div>
        <div className="info-item-view">
          <label>Overjet:</label>
          <span>{displayValue(caseData.overjet)}</span>
        </div>
        <div className="info-item-view">
          <label>Overbite:</label>
          <span>{displayValue(caseData.overbite)}</span>
        </div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Existing Occlusal Scheme:</label>
        <div className="case-sheet-value">{displayValue(caseData.scheme)}</div>
      </div>

      <div className="case-sheet-form-group-view">
        <label className="case-sheet-label-view">Others:</label>
        <div className="case-sheet-value-box">{displayValue(caseData.occlusionOthers)}</div>
      </div>
    </div>
  );

  // Render Page 9: Abutment Evaluation
  const renderPage9 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">13. Abutment Evaluation & Other Investigations</h2>
      <h3 className="case-sheet-subtitle-view">a) Clinical Evaluation</h3>
      
      <table className="case-sheet-table-view">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Findings</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: 'clinical_crown_height', label: 'Clinical crown height' },
            { name: 'crown_morphology', label: 'Crown morphology' },
            { name: 'vitality', label: 'Vitality' },
            { name: 'mobility_abutment', label: 'Mobility' },
            { name: 'probing_depth', label: 'Probing depth' },
            { name: 'bleeding_on_probing', label: 'Bleeding on probing' },
            { name: 'recession_abutment', label: 'Recession' },
            { name: 'furcation_involvement', label: 'Furcation involvement' },
            { name: 'axial_inclination', label: 'Axial inclination' },
            { name: 'rotations_abutment', label: 'Rotations' },
            { name: 'pain_on_percussion', label: 'Pain on percussion' },
            { name: 'restorations', label: 'Presence of restorations' },
            { name: 'caries', label: 'Caries' },
            { name: 'supra_eruption_intrusion', label: 'Supra eruption / intrusion' },
          ].map(param => (
            <tr key={param.name}>
              <td>{param.label}</td>
              <td>{displayValue(caseData[param.name])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="case-sheet-subtitle-view">b) Radiographic Evaluation</h4>
      <table className="case-sheet-table-view">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Findings</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: 'periapical_status', label: 'Periapical status' },
            { name: 'lamina_dura', label: 'Lamina dura' },
            { name: 'crown_height_radio', label: 'Crown height' },
            { name: 'root_length', label: 'Root length' },
            { name: 'bone_radio', label: 'Bone' },
            { name: 'crown_root_ratio', label: 'Crown root ratio' },
            { name: 'coronal_proximal_radiolucency', label: 'Coronal/proximal radiolucency' },
          ].map(param => (
            <tr key={param.name}>
              <td>{param.label}</td>
              <td>{displayValue(caseData[param.name])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="case-sheet-subtitle-view">14. Other Investigations</h3>
      <div className="case-sheet-value-box">{displayValue(caseData.other_investigations)}</div>
    </div>
  );

  // Render Page 10: Treatment Planning
  const renderPage10 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">15. Edentulous Arch Classification & Treatment Planning</h2>
      
      <div className="case-sheet-form-group-view">
        <h3 className="case-sheet-subtitle-view">16. Classification of Edentulous Arch (Kennedy's Classification)</h3>
        <div className="case-sheet-value-box">{displayValue(caseData.kennedy_classification)}</div>
      </div>

      <div className="case-sheet-form-group-view">
        <h3 className="case-sheet-subtitle-view">17. Treatment Planning</h3>
        <table className="case-sheet-table-view">
          <thead>
            <tr>
              <th>Treatment Type</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'treatment_surgery', label: 'Surgery' },
              { name: 'treatment_endodontic', label: 'Endodontic Treatment / Restorations' },
              { name: 'treatment_periodontal', label: 'Periodontal Treatment' },
              { name: 'treatment_orthodontic', label: 'Orthodontic Treatment' },
            ].map(treatment => (
              <tr key={treatment.name}>
                <td>{treatment.label}</td>
                <td>{displayValue(caseData[treatment.name])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="case-sheet-form-group-view">
        <h4 className="case-sheet-subtitle-view">Prosthodontic Treatment - Design Illustrations</h4>
        <p className="info-note-view">Design illustrations uploaded by the doctor</p>
      </div>
    </div>
  );

  // Render Page 11: Treatment Procedure
  const renderPage11 = () => (
    <div className="form-page-view">
      <h2 className="case-sheet-section-title-view">18. Treatment Procedure</h2>
      <table className="case-sheet-table-view">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Treatment Procedure</th>
            <th>Date</th>
            <th>Grade</th>
            <th>Staff In Charge</th>
          </tr>
        </thead>
        <tbody>
          {treatmentProcedures.map(proc => (
            <tr key={proc.id}>
              <td>{proc.id}</td>
              <td>{proc.name}</td>
              <td>{displayValue(caseData[`proc_date_${proc.id}`])}</td>
              <td>{displayValue(caseData[`proc_grade_${proc.id}`])}</td>
              <td>{displayValue(caseData[`proc_staff_${proc.id}`])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Doctor's Authentication Display */}
      <div className="doctor-auth-view">
        <h3 className="case-sheet-subtitle-view">Doctor's Authentication</h3>
        <div className="info-item-view">
          <label>Doctor's Name:</label>
          <span>{displayValue(caseData.doctorName)}</span>
        </div>
        {caseData.digitalSignature && (
          <div className="signature-display-view">
            <label>Digital Signature:</label>
            <img 
              src={caseData.digitalSignature} 
              alt="Doctor's Signature" 
              className="signature-image-view"
              style={{ cursor: 'pointer' }}
              onClick={() => window.open(caseData.digitalSignature, '_blank')}
            />
          </div>
        )}
      </div>
    </div>
  );

  // Render current page
  const renderCurrentPage = () => {
    switch(currentPage) {
      case 1: return renderPage1();
      case 2: return renderPage2();
      case 3: return renderPage3();
      case 4: return renderPage4();
      case 5: return renderPage5();
      case 6: return renderPage6();
      case 7: return renderPage7();
      case 8: return renderPage8();
      case 9: return renderPage9();
      case 10: return renderPage10();
      case 11: return renderPage11();
      default: return renderPage1();
    }
  };

  return (
    <div className="case-sheet-container-view" style={{ backgroundImage: "url('/images/campus.png')" }}>
      <div className="case-sheet-wrapper-view">
        {/* Scroll target at the top */}
        <div ref={topRef}></div>
        
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '12px', paddingLeft: '20px', paddingRight: '20px' }}>
          <div className="logo-container-view">
            <img src="/logo.png" alt="SRM Dental College Logo" style={{ maxWidth: '120px', height: 'auto' }} />
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

        <h1 className="case-sheet-title-view">Comprehensive Medical Case Sheet </h1>
        {renderCurrentPage()}

        {/* Navigation buttons */}
        <div className="navigation-buttons-view">
          <button 
            className="case-sheet-button-view" 
            onClick={prevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div className="page-status-view">
            Page {currentPage} of {totalPages}
          </div>
          
          <button 
            className="case-sheet-button-view" 
            onClick={nextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>

        {/* action buttons removed as requested */}
      </div>
    </div>
  );
};

export default PartialView;