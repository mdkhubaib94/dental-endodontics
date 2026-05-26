import React, { useState } from 'react';
import './Pedodontics.css';
import axios from 'axios';

const ConservativeDentistry = () => {
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    chiefComplaint: '',
    presentIllness: '',
    pastMedical: '',
    pastDental: '',
    clinicalFindings: '',
    provisionalDiagnosis: '',
    investigations: '',
    finalDiagnosis: '',
    treatmentPlan: '',
    xrayImage: ''
  });
  const [signatureFile, setSignatureFile] = useState(null);
  const [treatmentPictures, setTreatmentPictures] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0] || null;
    setSignatureFile(file);
  };

  const handleTreatmentFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    const allowed = ['image/jpeg','image/jpg','image/png'];
    const toAdd = [];
    for (const f of list) {
      if (!allowed.includes(f.type)) continue;
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f);
      });
      toAdd.push({ fileName: f.name, dataUrl });
    }
    if (toAdd.length) setTreatmentPictures(prev => ([...prev, ...toAdd]));
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const payload = new FormData();
      Object.keys(form).forEach((k) => { if (form[k]) payload.append(k, form[k]); });
      if (signatureFile) payload.append('digitalSignature', signatureFile);
        if (treatmentPictures && treatmentPictures.length) payload.append('treatmentPictures', JSON.stringify(treatmentPictures));

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post('/api/conservative/save', payload, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });

      if (res.data?.success) {
        setMessage('Case saved successfully');
        // clear minimal fields
        setForm({ patientId: '', patientName: '', chiefComplaint: '', presentIllness: '', pastMedical: '', pastDental: '', clinicalFindings: '', provisionalDiagnosis: '', investigations: '', finalDiagnosis: '', treatmentPlan: '', xrayImage: '' });
        setSignatureFile(null);
      } else {
        setMessage(res.data?.message || 'Failed to save case');
      }
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Server error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="department-container">
      <h2>Department of Conservative Dentistry & Endodontics - Case Sheet</h2>
      {message && <div className="message-box">{message}</div>}
      <form className="case-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Patient ID *</label>
          <input name="patientId" value={form.patientId} onChange={handleChange} required />
        </div>

        <div className="form-row">
          <label>Patient Name *</label>
          <input name="patientName" value={form.patientName} onChange={handleChange} required />
        </div>

        <div className="form-row">
          <label>Chief Complaint *</label>
          <textarea name="chiefComplaint" value={form.chiefComplaint} onChange={handleChange} required />
        </div>

        <div className="form-row">
          <label>Present Illness</label>
          <textarea name="presentIllness" value={form.presentIllness} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>Past Medical</label>
          <textarea name="pastMedical" value={form.pastMedical} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>Past Dental</label>
          <textarea name="pastDental" value={form.pastDental} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>Clinical Findings</label>
          <textarea name="clinicalFindings" value={form.clinicalFindings} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>Provisional Diagnosis</label>
          <input name="provisionalDiagnosis" value={form.provisionalDiagnosis} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>Investigations</label>
          <input name="investigations" value={form.investigations} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>Final Diagnosis</label>
          <input name="finalDiagnosis" value={form.finalDiagnosis} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>Treatment Plan *</label>
          <textarea name="treatmentPlan" value={form.treatmentPlan} onChange={handleChange} required />
        </div>

        <div className="form-row">
          <label>X-ray Image (Data URL) - optional</label>
          <textarea name="xrayImage" value={form.xrayImage} onChange={handleChange} placeholder="data:image/png;base64,..." />
        </div>

        <div className="form-row">
          <label>Treatment Pictures</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'inline-block' }}>
              <div style={{ width: 72, height: 72, border: '2px dashed rgba(0,0,0,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f6f8fb' }}>
                <span style={{ fontSize: 28, color: '#0b2340', fontWeight: 700 }}>+</span>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/jpg" multiple onChange={handleTreatmentFiles} style={{ display: 'none' }} />
            </label>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {treatmentPictures.map((p, i) => (
                <div key={i} style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', background: '#fff', position: 'relative' }}>
                  <img src={p.dataUrl} alt={p.fileName || `pic-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="form-row">
          <label>Digital Signature (image file) - optional</label>
          <input type="file" accept="image/*" onChange={handleFile} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Case'}</button>
        </div>
      </form>
    </div>
  );
};

export default ConservativeDentistry;
