import React, { useState } from 'react';
import './casesheetBilling.css';

// Admin Case Sheet Billing component
// Flow:
// 1. Enter patient ID
// 2. Fetch today's case sheets for that patient
// 3. Enter total amount manually and mark as paid (saved to backend)

const API_BASE = 'http://localhost:5000';

const BillX = () => {
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchTodayCases = async () => {
    if (!patientId.trim()) {
      setError('Please enter a Patient ID.');
      return;
    }

    try {
      setLoadingCases(true);
      setError('');
      setSuccessMessage('');

      const res = await fetch(
        `${API_BASE}/api/billing/patient/${encodeURIComponent(patientId.trim())}/today-cases`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch  cases");
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setCases(list);

      if (list.length === 0) {
        setError('No case sheets found for this patient.');
      } else if (list[0].patientName) {
        setPatientName(list[0].patientName);
      }
    } catch (err) {
      console.error('Error fetching  cases for billing:', err);
      setError(err.message || "Failed to fetch today's cases");
      setCases([]);
    } finally {
      setLoadingCases(false);
    }
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();

    if (!patientId.trim()) {
      setError('Patient ID is required.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid billing amount.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const payload = {
        patientId: patientId.trim(),
        patientName: patientName || undefined,
        totalAmount: Number(amount),
        paymentMethod,
        description: 'Case sheet billing',
        cases,
      };

      const res = await fetch(`${API_BASE}/api/billing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to save bill');
      }

      const data = await res.json();
      console.log('Bill saved:', data);
      setSuccessMessage('Case sheet billing saved successfully.');
      // Clear amount but keep patientId so admin can see history if needed
      setAmount('');
    } catch (err) {
      console.error('Error saving bill:', err);
      setError(err.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="casesheet-billing-wrapper">
      <div className="casesheet-billing-container">
        <h1 className="casesheet-billing-title">Case Sheet Billing</h1>
        <p className="casesheet-billing-department">SRM Dental College - Billing Department</p>

        <form className="casesheet-billing-form" onSubmit={handleSaveBill}>
          {error && <div className="casesheet-billing-error">{error}</div>}
          {successMessage && <div className="casesheet-billing-success">{successMessage}</div>}

          <div className="casesheet-billing-row">
            <input
              type="text"
              placeholder="Patient ID"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            />
          </div>

          <div className="casesheet-fetch-row">
            <button
              type="button"
              className="casesheet-fetch-button"
              onClick={fetchTodayCases}
              disabled={loadingCases || !patientId.trim()}
            >
              {loadingCases ? 'Fetching details...' : 'Fetch Details'}
            </button>
          </div>

          <input
            type="text"
            placeholder="Patient Name (optional)"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />

          <input
            type="number"
            placeholder="Total Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div className="casesheet-payment-options">
            <h3>PAYMENT METHOD</h3>
            <div className="casesheet-payment-buttons">
              <button
                type="button"
                className={paymentMethod === 'upi' ? 'casesheet-pay-option active' : 'casesheet-pay-option'}
                onClick={() => setPaymentMethod('upi')}
              >
                UPI
              </button>
              <button
                type="button"
                className={paymentMethod === 'netbanking' ? 'casesheet-pay-option active' : 'casesheet-pay-option'}
                onClick={() => setPaymentMethod('netbanking')}
              >
                NET BANKING
              </button>
              <button
                type="button"
                className={paymentMethod === 'cash' ? 'casesheet-pay-option active' : 'casesheet-pay-option'}
                onClick={() => setPaymentMethod('cash')}
              >
                CASH
              </button>
            </div>
          </div>

          {cases.length > 0 && (
            <div className="casesheet-today-cases">
              <h3>Today&apos;s Case Sheets</h3>
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Department</th>
                    <th>Doctor</th>
                    <th>Case Time</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c, index) => (
                    <tr key={c.caseId}>
                      <td>{index + 1}</td>
                      <td>{c.department}</td>
                      <td>{c.doctorName || '-'}</td>
                      <td>{c.caseDate ? new Date(c.caseDate).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="casesheet-button-group">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving Bill...' : 'Save & Mark Paid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillX;
