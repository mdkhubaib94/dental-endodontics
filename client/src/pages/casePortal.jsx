import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './casePortal.css';
import { readStoredGeneralCaseXray } from '../utils/generalCaseXray';

const CASE_CONSENT_NAV_STATE_KEY = 'caseSheetConsentApproved';

const CasePortal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProsthodontics, setShowProsthodontics] = useState(false);
  const [showOral, setShowOral] = useState(false);
  const [showPerio, setShowPerio] = useState(false);
  const [generalXrayPreview, setGeneralXrayPreview] = useState('');

  // Auto-open specific department sections when coming from other flows (e.g., General Case Sheet)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dept = params.get('dept');
    if (!dept) return;

    const value = dept.toLowerCase();

    if (value === 'prosthodontics') {
      setShowProsthodontics(true);
    } else if (value === 'periodontics') {
      setShowPerio(true);
    } else if (value === 'oral') {
      setShowOral(true);
    }
  }, [location.search]);

  useEffect(() => {
    const navState = location.state || {};
    if (!navState.requestConsentAfterEntry) return;
    if (navState[CASE_CONSENT_NAV_STATE_KEY]) return;

    const redirectTarget = `${location.pathname}${location.search}`;
    const shouldOpenConsent = window.confirm(
      'Please complete the consent form before proceeding with the department case sheet.'
    );

    if (shouldOpenConsent) {
      navigate(`/consent-form?redirect=${encodeURIComponent(redirectTarget)}`, { replace: true });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    const patientId = localStorage.getItem('CurrentpatientId') || '';
    const cachedXray = readStoredGeneralCaseXray(patientId);
    setGeneralXrayPreview(cachedXray?.imageDataUrl || '');
  }, []);

  const startCaseFlow = (targetPage) => {
    // Directly navigate to the selected case sheet, without pre-billing form
    window.location.href = targetPage;
  };

  return (
    <div className="case-portal-container">
      <div className="container-portal">
        <div className="heading">Select Case Sheet</div>

        {generalXrayPreview && (
          <div className="portal-general-xray-reflection">
            <h4>General Case X-ray (Auto-loaded)</h4>
            <img src={generalXrayPreview} alt="General Case X-ray" />
          </div>
        )}

        <div className="button-group-portal" id="mainButtonGroup" style={{ display: showProsthodontics || showOral || showPerio ? 'none' : 'flex' }}>
          <button className="button-portal" onClick={() => setShowProsthodontics(true)}>Prosthodontics</button>
          <button className="button-portal" onClick={() => startCaseFlow('/pedodontics')}>Pedodontics</button>


          <button className="button-portal" onClick={() => setShowPerio(true)}>Periodontics</button>
          <button className="button-portal" onClick={() => startCaseFlow('/casePortal')}>Conservative Dentistry and Endodontics</button>
          <button className="button-portal" onClick={() => setShowOral(true)}>Oral and Maxillofacial</button>
          <button className="button-portal" onClick={() => startCaseFlow('/casePortal')}>Orthoganthic Case History</button>
          <button className="button-portal" onClick={() => startCaseFlow('/general-case-sheet')}>General</button>
        </div>

        {/* Prosthodontics sub-options */}
        {showProsthodontics && (
          <div className="sub-options" id="prosthodonticsSubOptions">
            <button className="button-portal" onClick={() => startCaseFlow('/ImplantPatient')}>Implant Patient Surgery</button>
            <button className="button-portal" onClick={() => startCaseFlow('/complete_denture')}>Complete Denture</button>
            <button className="button-portal" onClick={() => startCaseFlow('/Partial')}>Partial Denture</button>
            <button className="button-portal" onClick={() => startCaseFlow('/Implant')}>Implant</button>
            <button className="button-portal" onClick={() => startCaseFlow('/Fpd')}>F.P.D</button>
          </div>
        )}

        {/* Oral and Maxillofacial sub-options */}
        {showOral && (
          <div className="sub-options" id="oralSubOptions">
            <button className="button-portal" onClick={() => startCaseFlow('/casePortal')}>Clef Lip</button>
            <button className="button-portal" onClick={() => startCaseFlow('/casePortal')}>Trauma</button>
            <button className="button-portal" onClick={() => startCaseFlow('/casePortal')}>Impaction</button>
            <button className="button-portal" onClick={() => startCaseFlow('/casePortal')}>Pathology</button>
          </div>
        )}

        {/* Periodontics sub-options */}
        {showPerio && (
          <div className="sub-options" id="perioSubOptions">
            <button className="button-portal" onClick={() => startCaseFlow('periodontics longcase sheet.html')}>Long Case Sheet</button>
            <button className="button-portal" onClick={() => startCaseFlow('periodont short case sheet.html')}>Short Case Sheet</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CasePortal;