// x_ray.jsx - X-Ray Billing Page
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './x_ray.css';

const XRayBilling = () => {
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('male');
  const [isPatientFetched, setIsPatientFetched] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [xrayTypes, setXrayTypes] = useState([]);
  const [selectedXrays, setSelectedXrays] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // X-ray types with prices
  const xrayOptions = [
    { id: 1, name: 'Periapical X-Ray (Single Tooth)', price: 150, code: 'PA' },
    { id: 2, name: 'Bitewing X-Ray', price: 200, code: 'BW' },
    { id: 3, name: 'Occlusal X-Ray', price: 250, code: 'OC' },
    { id: 4, name: 'Panoramic X-Ray (OPG)', price: 500, code: 'OPG' },
    { id: 5, name: 'Cephalometric X-Ray (Lateral)', price: 600, code: 'CEPH' },
    { id: 6, name: 'Cone Beam CT (CBCT) - Small FOV', price: 2500, code: 'CBCT-S' },
    { id: 7, name: 'Cone Beam CT (CBCT) - Large FOV', price: 3500, code: 'CBCT-L' },
    { id: 8, name: 'Full Mouth Series (FMS)', price: 1200, code: 'FMS' },
    { id: 9, name: 'TMJ X-Ray', price: 400, code: 'TMJ' },
    { id: 10, name: 'Sinus X-Ray', price: 350, code: 'SINUS' }
  ];

  useEffect(() => {
    // Load patient info from localStorage if available
    const storedPatientId = localStorage.getItem('CurrentpatientId');
    const storedPatientName = localStorage.getItem('patientName');
    
    if (storedPatientId) setPatientId(storedPatientId);
    if (storedPatientName) setPatientName(storedPatientName);

    // Load doctor info
    const doctorInfo = localStorage.getItem('doctorName');
    if (doctorInfo) setDoctorName(doctorInfo);
  }, []);

  useEffect(() => {
    // Calculate total amount whenever selected X-rays change
    const total = selectedXrays.reduce((sum, xray) => sum + (xray.price * xray.quantity), 0);
    setTotalAmount(total);
  }, [selectedXrays]);

  const fetchPatientDetails = async (id) => {
    if (!id.trim()) return;

    try {
      const response = await axios.get(`http://localhost:5000/api/patient-details/by-patient-id/${id}`);
      if (response.data.success) {
        const patient = response.data.data;
        const fullName = `${patient.personalInfo.firstName} ${patient.personalInfo.lastName}`;
        const age = patient.personalInfo.age || '';
        const gender = patient.personalInfo.gender || 'Male';
        
        setPatientName(fullName);
        setPatientAge(age);
        setPatientGender(gender);
        setIsPatientFetched(true);
        console.log('Patient details fetched:', { fullName, age, gender });
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      alert('Patient not found or error fetching details');
      setIsPatientFetched(false);
    }
  };

  const handleXraySelect = (xray) => {
    const existing = selectedXrays.find(x => x.id === xray.id);
    
    if (existing) {
      // Remove if already selected
      setSelectedXrays(selectedXrays.filter(x => x.id !== xray.id));
    } else {
      // Add with quantity 1
      setSelectedXrays([...selectedXrays, { ...xray, quantity: 1 }]);
    }
  };

  const updateQuantity = (xrayId, newQuantity) => {
    if (newQuantity < 1) {
      setSelectedXrays(selectedXrays.filter(x => x.id !== xrayId));
      return;
    }
    
    setSelectedXrays(selectedXrays.map(x => 
      x.id === xrayId ? { ...x, quantity: newQuantity } : x
    ));
  };

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    // Prepare billing data
    const billingData = {
      patientId,
      patientName,
      patientAge: parseInt(patientAge),
      patientGender,
      doctorName,
      xrayItems: [], // No X-rays selected
      totalAmount: 0, // No amount since no X-rays
      paymentMethod,
      remarks,
      billingDate: new Date().toISOString(),
      status: 'paid'
    };

    try {
      // Here you would send the billing data to your backend
      // For now, we'll just show success message
      console.log('X-ray Billing Data:', billingData);
      
      // Store in localStorage for reference
      localStorage.setItem('lastXrayBilling', JSON.stringify(billingData));
      
      setShowPaymentSuccess(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setShowPaymentSuccess(false);
        resetForm();
      }, 3000);

    } catch (error) {
      console.error('Error submitting billing:', error);
      alert('Failed to process billing. Please try again.');
    }
  };

  const resetForm = () => {
    setSelectedXrays([]);
    setTotalAmount(0);
    setPaymentMethod('');
    setRemarks('');
    setIsPatientFetched(false);
  };

  const handlePrintBill = () => {
    window.print();
  };

  return (
    <div className="xray-billing-wrapper">
      <div className="xray-billing-container">
        <h1 className="xray-billing-title">X-Ray Billing</h1>
        <h2 className="xray-billing-subtitle">SRM Dental College - Radiology Department</h2>

        <form className="xray-billing-form" onSubmit={handleSubmit}>
          {/* Patient Information Section */}
          <div className="xray-section">
            <h3 className="xray-section-title">Patient Information</h3>
            <div className="xray-form-grid">
              <div className="xray-form-group">
                <label>Patient ID *</label>
                <input 
                  type="text" 
                  placeholder="Enter Patient ID" 
                  value={patientId}
                  onChange={(e) => {
                    setPatientId(e.target.value);
                    if (isPatientFetched) {
                      setIsPatientFetched(false);
                      setPatientName('');
                      setPatientAge('');
                      setPatientGender('Male');
                    }
                  }}
                  onBlur={(e) => fetchPatientDetails(e.target.value)}
                  required 
                />
              </div>
              <div className="xray-form-group">
                <label>Patient Name</label>
                <input 
                  type="text" 
                  placeholder="Enter Patient Name" 
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  readOnly={isPatientFetched}
                />
              </div>
              <div className="xray-form-group">
                <label>Age</label>
                <input 
                  type="number" 
                  placeholder="Age" 
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  min="1"
                  max="120"
                  readOnly={isPatientFetched}
                />
              </div>
              <div className="xray-form-group">
                <label>Gender</label>
                <select 
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  disabled={isPatientFetched}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* X-Ray Selection Section */}
          {/* X-Ray Selection Removed */}



          {/* Payment Method Section */}
          <div className="xray-section">
            <h3 className="xray-section-title">Payment Method *</h3>
            <div className="xray-payment-options">
              <div 
                className={`xray-payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodSelect('cash')}
              >
                <span className="payment-icon">💵</span>
                <span>Cash</span>
              </div>
              <div 
                className={`xray-payment-option ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodSelect('card')}
              >
                <span className="payment-icon">💳</span>
                <span>Card</span>
              </div>
              <div 
                className={`xray-payment-option ${paymentMethod === 'upi' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodSelect('upi')}
              >
                <span className="payment-icon">📱</span>
                <span>UPI</span>
              </div>
              <div 
                className={`xray-payment-option ${paymentMethod === 'netbanking' ? 'active' : ''}`}
                onClick={() => handlePaymentMethodSelect('netbanking')}
              >
                <span className="payment-icon">🏦</span>
                <span>Net Banking</span>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="xray-button-group">
            <button type="button" className="xray-btn-secondary" onClick={resetForm}>
              Clear
            </button>
            <button type="submit" className="xray-btn-primary">
              Process Payment
            </button>
          </div>
        </form>

        {/* Success Modal */}
        {showPaymentSuccess && (
          <div className="xray-success-modal">
            <div className="xray-success-content">
              <div className="xray-success-icon">✓</div>
              <h3>Payment Successful!</h3>
              <p>Billing completed for {patientName}</p>
            </div>
          </div>
        )}

        {/* Print Section (hidden on screen, visible in print) */}
        <div className="xray-print-section">
          <div className="xray-print-header">
            <h2>SRM Dental College</h2>
            <p>Radiology Department - X-Ray Billing Receipt</p>
          </div>
          <div className="xray-print-details">
            <div><strong>Patient ID:</strong> {patientId}</div>
            <div><strong>Patient Name:</strong> {patientName}</div>
            <div><strong>Age/Gender:</strong> {patientAge} / {patientGender}</div>
            <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
            <div><strong>Doctor:</strong> {doctorName}</div>
          </div>
          <div className="xray-print-footer">
            <p><strong>Payment Method:</strong> {paymentMethod.toUpperCase()}</p>
            <p><strong>Remarks:</strong> {remarks || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XRayBilling;
