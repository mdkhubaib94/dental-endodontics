import React from 'react';

const ConservativeView = ({ caseData }) => {
  const pics = caseData.treatmentPictures || [];

  return (
    <div style={{ padding: 18, color: '#0b2340' }}>
      <h2 style={{ marginBottom: 8 }}>{caseData.patientName || 'Patient'}</h2>
      <p><strong>Chief Complaint:</strong> {caseData.chiefComplaint || 'N/A'}</p>
      <p><strong>History of Present Illness:</strong> {caseData.presentIllness || 'N/A'}</p>
      <p><strong>Critical Medical Illness:</strong> {caseData.criticalMedicalIllness || 'N/A'}</p>

      <h3 style={{ marginTop: 12 }}>Treatment Pictures</h3>
      {pics.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No treatment pictures uploaded.</p>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pics.map((p, i) => (
            <div key={i} style={{ width: 120, height: 120, borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
              <img src={p.dataUrl || p} alt={p.fileName || `treat-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConservativeView;
