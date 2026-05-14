// AdminBilling.jsx
import React, { useState, useEffect } from 'react';

const AdminBilling = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingData, setBillingData] = useState({
    items: [],
    totalAmount: 0
  });
  const [medicineRates, setMedicineRates] = useState({
    'injection': 150,
    'syrup': 80,
    'pills': 5,
    'ointment': 120
  });

  useEffect(() => {
    fetchPendingPrescriptions();
  }, []);

  const fetchPendingPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/prescriptions/billing/pending');
      if (response.ok) {
        const result = await response.json();
        setPrescriptions(result.data);
      } else {
        console.error('Failed to fetch prescriptions');
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBilling = (prescription) => {
    const items = prescription.medicines.map(medicine => {
      const unitPrice = medicineRates[medicine.type] || 50;
      const quantity = parseInt(medicine.duration) || 1;
      const totalPrice = unitPrice * quantity;
      
      return {
        medicineId: medicine._id,
        medicineName: medicine.name,
        medicineType: medicine.type,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        dosage: `${medicine.dosage.m}-${medicine.dosage.n}-${medicine.dosage.e}-${medicine.dosage.n2}`,
        foodIntake: medicine.foodIntake,
        duration: medicine.duration
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    setBillingData({
      items: items,
      totalAmount: totalAmount
    });

    return { items, totalAmount };
  };

  const handleGenerateBilling = (prescription) => {
    setSelectedPrescription(prescription);
    calculateBilling(prescription);
    setShowBillingModal(true);
  };

  const updateMedicineRate = (type, newRate) => {
    setMedicineRates(prev => ({
      ...prev,
      [type]: parseFloat(newRate) || 0
    }));
    
    // Recalculate billing if modal is open
    if (selectedPrescription) {
      calculateBilling(selectedPrescription);
    }
  };

  const saveBilling = async () => {
    if (!selectedPrescription) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/prescriptions/${selectedPrescription._id}/billing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isGenerated: true,
          totalAmount: billingData.totalAmount,
          items: billingData.items
        })
      });

      if (response.ok) {
        alert('Billing generated successfully!');
        setShowBillingModal(false);
        fetchPendingPrescriptions(); // Refresh the list
      } else {
        alert('Failed to generate billing');
      }
    } catch (error) {
      console.error('Error saving billing:', error);
      alert('Error generating billing');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#2c5282', margin: '0' }}>Prescription Billing - Pending Bills</h2>
          <button 
            onClick={fetchPendingPrescriptions}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Refresh
          </button>
        </div>

        {/* Medicine Rate Settings */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <h4>Medicine Rate Settings (₹ per unit/day)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {Object.entries(medicineRates).map(([type, rate]) => (
              <div key={type}>
                <label style={{ display: 'block', marginBottom: '5px', textTransform: 'capitalize' }}>
                  {type}:
                </label>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => updateMedicineRate(type, e.target.value)}
                  style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            ))}
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>}

        {!loading && prescriptions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No pending prescriptions for billing.
          </div>
        )}

        {!loading && prescriptions.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>S.No</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Patient ID</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Patient Name</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Doctor</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Medicines Count</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Diagnosis</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((prescription, index) => (
                  <tr key={prescription._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {formatDate(prescription.createdAt)}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {prescription.patientId}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {prescription.patientData.name}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {prescription.doctorName}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {prescription.medicines.length}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prescription.diagnosis}
                      </div>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <button
                        onClick={() => handleGenerateBilling(prescription)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#2c5282',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Generate Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Billing Modal */}
      {showBillingModal && selectedPrescription && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: '0' }}>Generate Billing</h3>
              <button
                onClick={() => setShowBillingModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Patient Details */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <h4>Patient Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <p><strong>Name:</strong> {selectedPrescription.patientData.name}</p>
                <p><strong>Patient ID:</strong> {selectedPrescription.patientId}</p>
                <p><strong>Age:</strong> {selectedPrescription.patientData.age}</p>
                <p><strong>Gender:</strong> {selectedPrescription.patientData.gender}</p>
              </div>
              <p><strong>Diagnosis:</strong> {selectedPrescription.diagnosis}</p>
              <p><strong>Doctor:</strong> {selectedPrescription.doctorName}</p>
            </div>

            {/* Medicines Billing */}
            <div style={{ marginBottom: '20px' }}>
              <h4>Medicines Billing</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>S.No</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Medicine</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Dosage</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Duration</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Rate/Day</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{index + 1}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.medicineName}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textTransform: 'capitalize' }}>{item.medicineType}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.dosage} ({item.foodIntake === 'after' ? 'AF' : 'BF'})</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.duration} days</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>₹{item.unitPrice}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}><strong>₹{item.totalPrice}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <td colSpan="6" style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>
                      <strong>Total Amount:</strong>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <strong style={{ fontSize: '18px', color: '#2c5282' }}>₹{billingData.totalAmount}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowBillingModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveBilling}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Saving...' : 'Generate Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBilling;