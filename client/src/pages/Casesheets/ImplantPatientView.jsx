import React, { useState, useEffect, useRef } from 'react';
import './ImplantPatientView.css';

const ImplantPatientView = ({ caseData: initialCaseData }) => {
  const [currentPage, setCurrentPage] = useState(5);
  const [caseData, setCaseData] = useState(initialCaseData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const pageContentRef = useRef(null);

  useEffect(() => {
    const fetchCaseData = async () => {
      try {
        const token = localStorage.getItem('token');
        let caseId = null;

        if (initialCaseData && (initialCaseData._id || initialCaseData.id)) {
          caseId = initialCaseData._id || initialCaseData.id;
        } else {
          caseId = localStorage.getItem('caseId');
        }

        if (!caseId) {
          setError('No case ID found');
          setLoading(false);
          return;
        }

        const response = await fetch(`http://localhost:5000/api/ImplantPatient/${caseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch case data');
        }

        const result = await response.json();
        setCaseData(result.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [initialCaseData]);

  const scrollToTop = () => {
    if (pageContentRef.current) {
      pageContentRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    setCurrentPage(currentPage + 1);
    setTimeout(scrollToTop, 10);
  };

  const handlePrev = () => {
    setCurrentPage(currentPage - 1);
    setTimeout(scrollToTop, 10);
  };

  const Header = ({ subtitle }) => (
    <div className="view-header" style={{ position: 'relative', textAlign: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
      {(caseData?.patientName || caseData?.patientId) && (
        <div style={{ position: 'absolute', left: '20px', top: '6px', padding: '8px 15px', backgroundColor: 'rgba(38, 40, 107, 0.95)', borderRadius: '4px', fontSize: '0.8em', color: 'white', border: '1px solid rgba(255,255,255,0.3)', textAlign: 'left', whiteSpace: 'nowrap' }}>
          {caseData?.patientName && <div><strong>Patient Name:</strong> {caseData.patientName}</div>}
          {caseData?.patientId && <div><strong>Patient ID:</strong> {caseData.patientId}</div>}
        </div>
      )}
      <center><img src="/logo.png" alt="SRM Dental College Logo" style={{ maxWidth: '100px', height: 'auto' }} /></center>
      <h1 className="view-h1">SRM Dental College</h1>
      {subtitle && <h2 className="view-h2">{subtitle}</h2>}
    </div>
  );

  const NavigationButtons = ({ onPrev, onNext, prevText = 'Back', nextText = 'Next', prevDisabled = false, nextDisabled = false, showPageNumber = true }) => (
    <div className="view-nav-buttons">
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled}
        className={`view-button ${prevDisabled ? 'view-button-disabled' : ''}`}
      >
        {prevText}
      </button>
      {showPageNumber && (
        <div className="view-page-number">
          Page {currentPage - 4} of 3
        </div>
      )}
      {!nextDisabled && (
        <button 
          type="button" 
          onClick={onNext}
          className="view-button"
        >
          {nextText}
        </button>
      )}
    </div>
  );

  const ViewField = ({ label, value, type = 'text' }) => (
    <div className="view-form-group">
      <label className="view-label">{label}</label>
      {type === 'textarea' ? (
        <div className="view-field-textarea">
          {value || '-'}
        </div>
      ) : type === 'image' ? (
        value ? (
          <img
            src={value}
            alt={label}
            className="view-field-image"
            style={{ cursor: 'pointer' }}
            onClick={() => setEnlargedImage(value)}
          />
        ) : (
          <div className="view-field-empty">-</div>
        )
      ) : (
        <div className="view-field-text">
          {value || '-'}
        </div>
      )}
    </div>
  );

  const Page5View = ({ data }) => (
    <div>
      <Header subtitle="Oral/Peri-Oral Examination" />
      
      <ViewField label="Shape of Face" value={data?.faceShape} />
      <ViewField label="Profile" value={data?.profile} />
      <ViewField label="Lip Support" value={data?.lipSupport} />
      <ViewField label="Philtrum" value={data?.philtrum} />
      <ViewField label="Nasolabial Sulcus" value={data?.nasolabialSulcus} />
      {/* Mouth opening image is stored as mouthOpeningImage in the backend */}
      <ViewField
        label="Mouth Opening"
        value={data?.mouthOpeningImage || data?.mouthOpening}
        type="image"
      />
      <ViewField label="State of Edentulism" value={data?.edentulism} />
      <ViewField 
        label="Kennedy Classification" 
        value={Array.isArray(data?.kennedy) ? data.kennedy.join(', ') : data?.kennedy} 
      />

      <NavigationButtons
        onPrev={null}
        onNext={handleNext}
        prevDisabled={true}
        nextText="Next"
      />
    </div>
  );

  const Page6View = ({ data }) => (
    <div>
      <Header subtitle="Intraoral and Extraoral Examination" />

      <h2 className="view-section-title">Intraoral Examination</h2>

      <ViewField label="Gingiva" value={data?.gingiva} type="textarea" />
      <ViewField label="Mucosa" value={data?.mucosa} type="textarea" />
      <ViewField label="Tongue" value={data?.tongue} type="textarea" />
      <ViewField label="Floor of the Mouth" value={data?.floorOfMouth} type="textarea" />
      <ViewField label="Salivary Glands and Ducts" value={data?.salivaryGlands} type="textarea" />
      <ViewField label="Tonsils" value={data?.tonsils} type="textarea" />
      <ViewField label="Palate" value={data?.palate} type="textarea" />
      
      <div className="view-checkbox-display">
        <label className="view-checkbox-label">
          <input 
            type="checkbox" 
            checked={data?.lineaAlba || false} 
            disabled 
          />
          Linea Alba
        </label>
      </div>

      {data?.lineaAlba && (
        <ViewField label="Notes for Linea Alba" value={data?.lineaNotes} type="textarea" />
      )}

      <ViewField label="Existing Restoration (Fillings)" value={data?.restoration} />
      
      {data?.restoration === 'other' && (
        <ViewField label="Other Restoration Details" value={data?.restOther} type="textarea" />
      )}

      <h2 className="view-section-title">Necks and Nodes</h2>

      <ViewField label="Inflammation" value={data?.inflammation} type="textarea" />
      <ViewField label="Enlargement of Nodes" value={data?.nodeEnlargement} type="textarea" />
      <ViewField label="Tenderness" value={data?.tenderness} type="textarea" />
      <ViewField label="Other Findings" value={data?.nodeOther} type="textarea" />

      <NavigationButtons
        onPrev={handlePrev}
        onNext={handleNext}
        prevText="Back"
        nextText="Next"
      />
    </div>
  );

  const Page7View = ({ data }) => (
    <div>
      <Header subtitle="Periodontal and Occlusal Assessment" />

      <h2 className="view-section-title">Periodontal Assessment</h2>

      <ViewField label="Oral Hygiene Status" value={data?.oralHygiene} />
      <ViewField label="Calculus" value={data?.calculus} type="textarea" />
      <ViewField label="Plaque" value={data?.plaque} type="textarea" />
      <ViewField label="Stains" value={data?.stains} type="textarea" />
      <ViewField label="Mobility of Teeth" value={data?.mobilityTeeth} type="textarea" />
      <ViewField label="Mobility Grade" value={data?.mobilityGrade} />
      <ViewField label="Pockets (mm)" value={data?.pockets} />
      <ViewField label="Recession (mm)" value={data?.recession} />
      <ViewField label="Tenderness" value={data?.periodontalTenderness} type="textarea" />
      <ViewField label="Other Findings" value={data?.periodontalOther} type="textarea" />

      <div className="view-authentication-section">
        <h2 className="view-auth-title">Doctor's Authentication</h2>
        
        <ViewField label="Doctor's Name" value={data?.doctorName || caseData?.doctorName} />
        
        <div className="view-form-group">
          <label className="view-label">Digital Signature</label>
          {data?.digitalSignature || caseData?.digitalSignature ? (
            <div className="view-signature-container">
              <p className="view-signature-label">Signature:</p>
              <img
                src={data?.digitalSignature || caseData?.digitalSignature}
                alt="Doctor's Signature"
                className="view-signature-image"
                style={{ cursor: 'pointer' }}
                onClick={() => setEnlargedImage(data?.digitalSignature || caseData?.digitalSignature)}
              />
            </div>
          ) : (
            <div className="view-field-empty">No signature provided</div>
          )}
        </div>
      </div>

      <NavigationButtons
        onPrev={handlePrev}
        onNext={null}
        prevText="Back"
        nextDisabled={true}
      />
    </div>
  );

  const renderPage = () => {
    if (!caseData) return null;

    switch (currentPage) {
      case 5:
        return <Page5View data={caseData} />;
      case 6:
        return <Page6View data={caseData} />;
      case 7:
        return <Page7View data={caseData} />;
      default:
        return <Page5View data={caseData} />;
    }
  };

  if (loading) {
    return (
      <div className="view-loading-container">
        <div className="view-loading-text">Loading case data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-error-container">
        <div className="view-error-box">
          <h2>Error Loading Case</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-app-container">
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

      <div className="view-form-container" ref={pageContentRef}>
        <div className="view-page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
};

export default ImplantPatientView;