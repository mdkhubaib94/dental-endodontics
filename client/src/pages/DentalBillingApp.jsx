import React, { useState } from 'react';
import { X } from 'lucide-react';

// ==================== MODELS ====================
const patientData = {
  "P-10123": {
    invoice: "2020-05-0001",
    doctor: {
      name: "Dr. Sisyphus",
      designation: "Chief Dental Surgeon",
      education: "B.D.S., M.D.S. (Oral Surgery)"
    },
    patient: {
      name: "Krishnan",
      address: "1445 West Norwood Avenue, Danica, Illinois, USA",
      contact: "3123043514",
      email: "kri@ibn.com",
      registration: "P-10123"
    },
    billDate: "24/10/2025", 
    deliveryDate: "24/10/2025",
    totalAmount: 6475.00,
    items: [
      { article: "Consultation Charges", quantity: "-", unitPrice: 1500, gst: 0, amount: 1500, finalAmount: 1500 },
      {
        article: "Medicine Charges",
        quantity: "50 Units (Total)",
        unitPrice: 2500,
        gst: 5,
        amount: 2500,
        finalAmount: 2625,
        subItems: [
          { name: "Antibiotic XYZ", units: "20 Units", cost: 1000 },
          { name: "Pain Reliever ABC", units: "30 Units", cost: 1500 }
        ]
      },
      { article: "Equipment Charges", quantity: "5 Units", unitPrice: 2000, gst: 0, amount: 2000, finalAmount: 2000 }
    ]
  },
  "P-10312": {
    invoice: "2020-05-0002",
    doctor: {
      name: "Dr. Athena",
      designation: "Orthodontist",
      education: "B.D.S., M.D.S. (Orthodontics)"
    },
    patient: {
      name: "Vikram",
      address: "22 MG Road, Bengaluru, India",
      contact: "9876543210",
      email: "vikram@mail.com",
      registration: "P-10312"
    },
    billDate: "18/10/2025",
    deliveryDate: "18/10/2025",
    totalAmount: 5640.00,
    items: [
      { article: "Consultation Charges", quantity: "-", unitPrice: 1800, gst: 0, amount: 1800, finalAmount: 1800 },
      { article: "Equipment Charges", quantity: "2 Units", unitPrice: 1200, gst: 0, amount: 2400, finalAmount: 2400 },
      { article: "Cleaning", quantity: "1 Unit", unitPrice: 600, gst: 0, amount: 600, finalAmount: 600 },
      {
        article: "Medicine Charges",
        quantity: "30 Units (Total)",
        unitPrice: 800,
        gst: 5,
        amount: 800,
        finalAmount: 840,
        subItems: [
          { name: "Gargle Solution", units: "15 Units", cost: 300 },
          { name: "Fluoride Gel", units: "15 Units", cost: 500 }
        ]
      }
    ]
  },
  "P-10488": {
    invoice: "2020-05-0003",
    doctor: {
      name: "Dr. Hermes",
      designation: "Periodontist",
      education: "B.D.S., M.D.S. (Periodontology)"
    },
    patient: {
      name: "Sneha",
      address: "91 Anna Salai, Chennai, India",
      contact: "9003123456",
      email: "sneha@health.com",
      registration: "P-10488"
    },
    billDate: "15/10/2025",
    deliveryDate: "15/10/2025",
    totalAmount: 5420.00,
    items: [
      { article: "Consultation Charges", quantity: "-", unitPrice: 1200, gst: 0, amount: 1200, finalAmount: 1200 },
      { article: "Equipment Charges", quantity: "1 Unit", unitPrice: 800, gst: 0, amount: 800, finalAmount: 800 },
      { article: "X-Ray", quantity: "-", unitPrice: 900, gst: 0, amount: 900, finalAmount: 900 },
      {
        article: "Medicine Charges",
        quantity: "40 Units (Total)",
        unitPrice: 2400,
        gst: 5,
        amount: 2400,
        finalAmount: 2520,
        subItems: [
          { name: "Vitamin D Supplement", units: "20 Units", cost: 1000 },
          { name: "Calcium Tablets", units: "20 Units", cost: 1400 }
        ]
      }
    ]
  }
};

// ==================== COMPONENTS ====================

// Modal Component
const Modal = ({ isOpen, onClose, title, message, type = 'info' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-11/12 transform transition-all">
        <h4 className={`text-2xl font-bold mb-4 ${
          type === 'success' ? 'text-green-600' : 
          type === 'error' ? 'text-red-600' : 'text-blue-600'
        }`}>
          {title}
        </h4>
        <p className="text-gray-700 mb-6 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold transition-all"
        >
          OK
        </button>
      </div>
    </div>
  );
};

// Header Component
const Header = () => (
  <div className="bg-blue-900 text-white p-4 flex justify-between items-center shadow-lg">
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-2xl">
        SRM
      </div>
      <div>
        <h1 className="text-xl font-bold uppercase">SRM Dental College</h1>
        <p className="text-sm text-gray-300">Ramapuram, Chennai - 600089</p>
      </div>
    </div>
    <div className="text-right text-sm">
      <div>SRM DENTAL COLLEGE HOSPITAL</div>
      <div>BHARATHI SALAI, RAMAPURAM</div>
      <div>CONTACT: +91 44-2249-0026</div>
      <div>EMAIL: info@srmdental.ac.in</div>
    </div>
  </div>
);

// Search Bar Component
const SearchBar = ({ onSearch, currentPatient }) => {
  const [searchId, setSearchId] = useState('');

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSearch(searchId.trim());
    }
  };

  return (
    <div className="bg-white p-4 flex justify-between items-center shadow-md">
      <div className="flex items-center border border-gray-400 rounded overflow-hidden">
        <span className="bg-gray-200 px-4 py-2 text-gray-700">ENTER PATIENT ID</span>
        <input
          type="text"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="eg: P-10254"
          className="px-4 py-2 outline-none w-40"
        />
      </div>
      <div className="text-right">
        <div className="font-bold text-gray-800">
          {currentPatient?.patient.name || 'Guest User'}
        </div>
        <div className="text-xs text-gray-600">
          {currentPatient?.patient.registration || 'No ID'}
        </div>
      </div>
    </div>
  );
};

// Bill Details Component
const BillDetails = ({ data, onPaymentSelect }) => {
  const calculateTotals = () => {
    let totalHt = 0;
    let totalGST = 0;
    let totalFinal = 0;

    data.items.forEach(item => {
      totalHt += item.amount;
      totalGST += item.finalAmount - item.amount;
      totalFinal += item.finalAmount;
    });

    return { totalHt, totalGST, totalFinal };
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto my-8 p-8 bg-white bg-opacity-90 rounded-lg shadow-2xl backdrop-blur-sm">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-300">
        <h2 className="text-2xl font-bold">Invoice #{data.invoice}</h2>
        <div className="flex gap-3">
          <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-all">
            More Options
          </button>
          <button
            onClick={() => window.print()}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-all"
          >
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 p-6 rounded-lg shadow">
          <h3 className="font-bold text-lg mb-3 border-b pb-2">Doctor Details</h3>
          <p className="font-bold">{data.doctor.name}</p>
          <p className="text-sm text-gray-600">{data.doctor.designation}</p>
          <p className="text-sm text-gray-600">{data.doctor.education}</p>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg shadow">
          <h3 className="font-bold text-lg mb-3 border-b pb-2">Total Amount</h3>
          <p className="text-3xl font-bold text-red-600">Rs. {data.totalAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mb-3">Incl. GST</p>
          <p className="text-sm"><strong>Bill Date:</strong> {data.billDate}</p>
          <p className="text-sm"><strong>Delivery Date:</strong> {data.deliveryDate}</p>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg shadow">
          <h3 className="font-bold text-lg mb-3 border-b pb-2">Billing Address</h3>
          <p className="font-bold">{data.patient.name}</p>
          <p className="text-sm text-gray-600">{data.patient.address}</p>
          <p className="text-sm text-gray-600">{data.patient.contact} | {data.patient.email}</p>
          <p className="text-sm text-gray-600">SIRET: {data.patient.registration}</p>
        </div>
      </div>

      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse shadow rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-blue-100">
              <th className="p-3 text-left text-sm font-semibold">S.No</th>
              <th className="p-3 text-left text-sm font-semibold">ARTICLE</th>
              <th className="p-3 text-left text-sm font-semibold">QUANTITY</th>
              <th className="p-3 text-left text-sm font-semibold">UNIT PRICE</th>
              <th className="p-3 text-left text-sm font-semibold">GST</th>
              <th className="p-3 text-left text-sm font-semibold">AMOUNT</th>
              <th className="p-3 text-left text-sm font-semibold">FINAL AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <React.Fragment key={index}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{item.article}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">Rs. {item.unitPrice.toFixed(2)}</td>
                  <td className="p-3">{item.gst}%</td>
                  <td className="p-3">Rs. {item.amount.toFixed(2)}</td>
                  <td className="p-3">Rs. {item.finalAmount.toFixed(2)}</td>
                </tr>
                {item.subItems && item.subItems.map((sub, subIndex) => {
                  const subAmount = sub.cost;
                  const subFinal = subAmount * (1 + item.gst / 100);
                  return (
                    <tr key={`${index}-${subIndex}`} className="border-b bg-gray-50 text-sm">
                      <td className="p-3"></td>
                      <td className="p-3 pl-8 text-gray-600">{sub.name}</td>
                      <td className="p-3">{sub.units}</td>
                      <td className="p-3">Rs. {sub.cost.toFixed(2)}</td>
                      <td className="p-3">{item.gst}%</td>
                      <td className="p-3">Rs. {subAmount.toFixed(2)}</td>
                      <td className="p-3">Rs. {subFinal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="w-80 ml-auto bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="flex justify-between p-3 border-b">
          <span className="text-gray-600">Total HT</span>
          <span className="font-semibold">Rs. {totals.totalHt.toFixed(2)}</span>
        </div>
        <div className="flex justify-between p-3 border-b">
          <span className="text-gray-600">Total Disbursements</span>
          <span className="font-semibold">Rs. 0.00</span>
        </div>
        <div className="flex justify-between p-3 border-b">
          <span className="text-gray-600">Total GST</span>
          <span className="font-semibold">Rs. {totals.totalGST.toFixed(2)}</span>
        </div>
        <div className="flex justify-between p-3 bg-blue-50 font-bold text-lg">
          <span className="text-gray-800">Total Price</span>
          <span className="text-red-600">Rs. {totals.totalFinal.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-lg shadow-lg text-center">
        <h3 className="text-2xl font-bold mb-6 uppercase">Payment Method</h3>
        <div className="flex flex-wrap justify-center gap-6">
          <button
            onClick={() => onPaymentSelect('upi')}
            className="flex-1 min-w-[180px] max-w-[250px] border-2 border-blue-600 bg-white text-blue-600 px-6 py-4 rounded-lg font-bold text-lg hover:bg-blue-600 hover:text-white transition-all shadow hover:shadow-lg hover:-translate-y-1"
          >
            📱 UPI
          </button>
          <button
            onClick={() => onPaymentSelect('netbanking')}
            className="flex-1 min-w-[180px] max-w-[250px] border-2 border-blue-600 bg-white text-blue-600 px-6 py-4 rounded-lg font-bold text-lg hover:bg-blue-600 hover:text-white transition-all shadow hover:shadow-lg hover:-translate-y-1"
          >
            🏦 NET BANKING
          </button>
          <button
            onClick={() => onPaymentSelect('cash')}
            className="flex-1 min-w-[180px] max-w-[250px] border-2 border-blue-600 bg-white text-blue-600 px-6 py-4 rounded-lg font-bold text-lg hover:bg-blue-600 hover:text-white transition-all shadow hover:shadow-lg hover:-translate-y-1"
          >
            💵 CASH
          </button>
        </div>
      </div>
    </div>
  );
};

// UPI Payment Component
const UpiPayment = ({ data, onBack, onSuccess }) => {
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');

  const validateUpi = (value) => {
    const upiRegex = /^[a-zA-Z0-9.\-]+@[a-zA-Z0-9.\-]+$/;
    if (value && !upiRegex.test(value)) {
      setError('Invalid UPI ID format. (e.g., name@bank)');
    } else {
      setError('');
    }
  };

  const handleConfirm = () => {
    if (!upiId) {
      onSuccess('Payment Error', 'UPI ID cannot be empty.', 'error');
      return;
    }
    const upiRegex = /^[a-zA-Z0-9.\-]+@[a-zA-Z0-9.\-]+$/;
    if (!upiRegex.test(upiId)) {
      onSuccess('Payment Error', 'Invalid UPI ID format. Please use a format like name@bank.', 'error');
      return;
    }
    onSuccess('Payment Successful', `Payment of Rs. ${data.totalAmount.toFixed(2)} confirmed via UPI for ID: ${upiId}.`, 'success');
  };

  return (
    <div className="max-w-lg mx-auto my-8 p-8 bg-white bg-opacity-90 rounded-lg shadow-2xl backdrop-blur-sm text-center">
      <h3 className="text-3xl font-bold text-blue-600 mb-8">UPI Payment</h3>
      
      <div className="mb-6 text-left">
        <label className="block font-bold text-gray-700 mb-2">Enter UPI ID:</label>
        <input
          type="text"
          value={upiId}
          onChange={(e) => {
            setUpiId(e.target.value);
            validateUpi(e.target.value);
          }}
          placeholder="eg: name@bankupi"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>

      <div className="w-32 h-32 mx-auto mb-6 border border-gray-300 rounded p-2 bg-white">
        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xs text-gray-500">
          QR Code
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={handleConfirm}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow hover:shadow-lg"
        >
          Confirm Payment
        </button>
        <button
          onClick={onBack}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition-all shadow hover:shadow-lg"
        >
          Back to Bill
        </button>
      </div>
    </div>
  );
};

// Net Banking Payment Component
const NetBankingPayment = ({ data, onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    cardName: '',
    bankName: '',
    accountNumber: ''
  });

  const handleSubmit = () => {
    if (!formData.cardName || !formData.bankName || !formData.accountNumber) {
      onSuccess('Payment Error', 'All fields are required for Net Banking.', 'error');
      return;
    }
    if (!/^\d{8,18}$/.test(formData.accountNumber)) {
      onSuccess('Payment Error', 'Please enter a valid Account Number (8-18 digits).', 'error');
      return;
    }
    onSuccess('Payment Initiated', `Initiating Net Banking payment for Rs. ${data.totalAmount.toFixed(2)} from ${formData.bankName}.`, 'success');
  };

  return (
    <div className="max-w-lg mx-auto my-8 p-8 bg-white bg-opacity-90 rounded-lg shadow-2xl backdrop-blur-sm text-center">
      <h3 className="text-3xl font-bold text-blue-600 mb-6">Net Banking Payment</h3>
      
      <div className="flex justify-center gap-6 mb-8 text-4xl">
        <span className="text-blue-900">💳</span>
        <span className="text-red-600">💳</span>
        <span className="text-blue-600">💳</span>
        <span className="text-orange-500">💳</span>
      </div>

      <div className="space-y-6 text-left">
        <div>
          <label className="block font-bold text-gray-700 mb-2">Name on Card:</label>
          <input
            type="text"
            value={formData.cardName}
            onChange={(e) => setFormData({...formData, cardName: e.target.value})}
            placeholder="eg: John Doe"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-2">Bank Name:</label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => setFormData({...formData, bankName: e.target.value})}
            placeholder="eg: State Bank of India"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-2">Account Number:</label>
          <input
            type="number"
            value={formData.accountNumber}
            onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
            placeholder="XXXXXXXXXXXX"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-4 justify-center mt-8">
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow hover:shadow-lg"
        >
          Proceed to Pay
        </button>
        <button
          onClick={onBack}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition-all shadow hover:shadow-lg"
        >
          Back to Bill
        </button>
      </div>
    </div>
  );
};

// Cash Payment Component
const CashPayment = ({ data, onBack, onSuccess }) => {
  const handlePayment = (isPaid) => {
    if (isPaid) {
      onSuccess('Payment Confirmed', 'Cash payment successfully recorded!', 'success');
    } else {
      onSuccess('Payment Not Recorded', 'Cash payment was marked as not received.', 'error');
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8 p-8 bg-white bg-opacity-90 rounded-lg shadow-2xl backdrop-blur-sm text-center">
      <h3 className="text-3xl font-bold text-blue-600 mb-6">Cash Payment</h3>
      
      <p className="text-lg text-gray-700 mb-8">
        Confirm if the payment of <span className="font-bold text-red-600">Rs. {data.totalAmount.toFixed(2)}</span> has been received.
      </p>

      <div className="flex gap-4 justify-center mb-6">
        <button
          onClick={() => handlePayment(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow hover:shadow-lg"
        >
          Payment Received
        </button>
        <button
          onClick={() => handlePayment(false)}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition-all shadow hover:shadow-lg"
        >
          Payment Not Received
        </button>
      </div>

      <button
        onClick={onBack}
        className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition-all shadow hover:shadow-lg"
      >
        Back to Bill
      </button>
    </div>
  );
};

// ==================== MAIN APP ====================
export default function DentalBillingApp() {
  const [currentView, setCurrentView] = useState('search');
  const [currentPatient, setCurrentPatient] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const handleSearch = (patientId) => {
    const data = patientData[patientId];
    if (!data) {
      setModal({
        isOpen: true,
        title: 'Patient Not Found',
        message: `No patient data found for ID: ${patientId}. Please check the ID and try again.`,
        type: 'error'
      });
      setCurrentPatient(null);
      setCurrentView('search');
    } else {
      setCurrentPatient(data);
      setCurrentView('bill');
    }
  };

  const handlePaymentSelect = (paymentType) => {
    setCurrentView(paymentType);
  };

  const handleBack = () => {
    setCurrentView('bill');
  };

  const handlePaymentSuccess = (title, message, type) => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', message: '', type: 'info' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 to-cyan-100">
      <Header />
      
      <div className="bg-gray-100 p-4 shadow-md">
        <h2 className="text-2xl font-bold uppercase">Patient Billing Login</h2>
      </div>

      <SearchBar onSearch={handleSearch} currentPatient={currentPatient} />

      {currentView === 'bill' && currentPatient && (
        <BillDetails data={currentPatient} onPaymentSelect={handlePaymentSelect} />
      )}

      {currentView === 'upi' && currentPatient && (
        <UpiPayment data={currentPatient} onBack={handleBack} onSuccess={handlePaymentSuccess} />
      )}

      {currentView === 'netbanking' && currentPatient && (
        <NetBankingPayment data={currentPatient} onBack={handleBack} onSuccess={handlePaymentSuccess} />
      )}

      {currentView === 'cash' && currentPatient && (
        <CashPayment data={currentPatient} onBack={handleBack} onSuccess={handlePaymentSuccess} />
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
} 