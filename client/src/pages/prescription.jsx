// prescription.jsx
import React, { useState, useEffect } from 'react';
import './prescription.css';
import { API_BASE_URL } from '../config/api';

// Medicine database with autocomplete
const MEDICINE_LIST = [
  { name: 'Amoxicillin (Amoxil, Moxilin, Sumox, Trimox)', dosage: '250mg' },
  { name: 'Amoxicillin + clavulanic acid (Augmentin, Amoxil Clav)', dosage: '625mg' },
  { name: 'Metronidazole (Flagyl, Metrogyl, Likmez)', dosage: '400mg' },
  { name: 'Ciprofloxacin (Cipro, CiproXR, Proquin XR)', dosage: '500mg' },
  { name: 'Ciprofloxacin TZ (Cifran CT, Citizol, Cipcoz TZ)', dosage: '500mg' },
  { name: 'Cephalexin (Sporidex, Phexin, Cephadex)', dosage: '500mg' },
  { name: 'Cefpodoxime Proxetil (Cazaxote DT)', dosage: '200mg' },
  { name: 'Pheniramine maleate (Avil, Sanofi)', dosage: '25mg' },
  { name: 'Serratiopeptidase (Biosuganril, Emanzen)', dosage: '10mg' },
  { name: 'Erythromycin (Erythrocin, Ery-Tab)', dosage: '250mg' },
  { name: 'Ranitidine (Rantac, Zantac)', dosage: '150mg' },
  { name: 'Pantoprazole (Pan 40)', dosage: '40mg' },
  { name: 'Paracetamol (Dolo-650, Tylenol, Panadol, Calpol)', dosage: '500mg' },
  { name: 'Ibuprofen + Acetaminophen (Advil Dual Action, Combogesic)', dosage: '400mg' },
  { name: 'Diclofenac (Voltaren, Cataflam, Dicloflex)', dosage: '50mg' },
  { name: 'Ibuprofen + Paracetamol (Ibugesic plus)', dosage: '' },
  { name: 'Paracetamol + Aceclofenac (Zerodol P)', dosage: '' },
  { name: 'Aceclofenac + paracetamol + Serrotiopeptidase (Zerodol SP)', dosage: '' },
  { name: 'Ketorolac tromethamine (Ketorol DT)', dosage: '10mg' },
  { name: 'Topical Metronidazole (Metrogel)', dosage: '' },
  { name: 'Topical Benzocaine (Mucopain)', dosage: '' },
  { name: 'Triamcinolone acetonide (Turbocort gel)', dosage: '' },
  { name: 'Choline Salicylate + Lidocaine (Dologel-CT Gel)', dosage: '' },
  { name: 'Sensodyne KF Toothpaste', dosage: '' },
  { name: 'Fixon Denture Adhesive', dosage: '' },
  { name: 'Denture cleaning kit', dosage: '' },
  { name: 'Tab. Amoxicillin (Novamox)', dosage: '250mg' },
  { name: 'Syp. Amoxicillin (Almox, Mox, Novamox)', dosage: '250mg' },
  { name: 'Tab. Amoxicillin + Clavulanic acid (Augmentin)', dosage: '375mg' },
  { name: 'Syp. Amoxicillin + Clavulanic acid (Augmentin Duo)', dosage: '375mg' },
  { name: 'Tab. Metronidazole (Flagyl, Metrogyl)', dosage: '200mg' },
  { name: 'Syp. Metronidazole (Flagyl, Metrogyl)', dosage: '200mg' },
  { name: 'Tab. Azithromycin (Azithro-250, Azicip, Azikind-250)', dosage: '250mg' },
  { name: 'Syp. Azithromycin (Azithral)', dosage: '200mg' },
  { name: 'Tab. Cefixime (Cefix-100, Fixital-100 DT)', dosage: '100mg' },
  { name: 'Syp. Cefixime (Taxim-o Forte, Cefix-100, Cefibet-100)', dosage: '100mg' },
  { name: 'Tab. Paracetamol (P-250)', dosage: '250mg' },
  { name: 'Syp. Paracetamol (P-250)', dosage: '250mg' },
  { name: 'Tab. Ibuprofen (Brufen 200, Ibugesic-200)', dosage: '200mg' },
  { name: 'Syp. Ibuprofen (Ibugesic)', dosage: '200mg' },
  { name: 'Tab. Ibuprofen + Paracetamol (Ibuclin Junior)', dosage: '' },
  { name: 'Syp. Ibuprofen + Paracetamol (Ibugesic Plus)', dosage: '' },
  { name: 'Tab. Chymoral Forte', dosage: '' },
  { name: 'Syp. Zincovit', dosage: '' },
  { name: 'Dentogel', dosage: '' },
  { name: 'Dologel CT Gel', dosage: '' },
  { name: 'Mucopain Gel', dosage: '' },
  { name: 'Kenacort Gel', dosage: '0.1%' },
  { name: 'Rexidine M Forte Gel', dosage: '' },
  { name: 'Hexigel', dosage: '' },
  { name: 'Pediflor Tooth Paste', dosage: '' },
  { name: 'Kidodent Tooth Paste', dosage: '' },
  { name: 'Kidodent Mouth Wash', dosage: '' }
];

const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
// test change
// ==================== ADD THIS PRINT COMPONENT HERE ====================
const PrintPrescription = ({ 
  patientData, 
  doctorInfo, 
  symptoms, 
  diagnosis, 
  medicines, 
  advice, 
  drugAllergies,
  dietAllergies,
  nextVisitDate,
  nextVisitTime,
  patientId,
  prescriptionDate,
  doctorSignature,
  onDownload
}) => {
  const formatDosage = (dosage) => {
    return `${dosage.m || '0'}-${dosage.n || '0'}-${dosage.e || '0'}-${dosage.n2 || '0'}`;
  };

  const formatDuration = (medicine) => {
    if (medicine.type === 'injection') {
      return '-';
    }
    if (medicine.asNeeded) {
      return 'As Needed';
    }
    const durationTypes = {
      'days': 'days',
      'weeks': 'weeks', 
      'months': 'months',
      'everyVisit': 'Every Visit'
    };
    return `${medicine.duration} ${durationTypes[medicine.durationType] || 'days'}`;
  };

  const calculateTotalQty = (medicine) => {
    if (medicine.asNeeded || medicine.type === 'injection') return '-';
    
    const dosagePerDay = 
      (parseFloat(medicine.dosage.m) || 0) +
      (parseFloat(medicine.dosage.n) || 0) +
      (parseFloat(medicine.dosage.e) || 0) +
      (parseFloat(medicine.dosage.n2) || 0);
    
    let durationInDays = parseInt(medicine.duration) || 0;
    if (medicine.durationType === 'weeks') {
      durationInDays *= 7;
    } else if (medicine.durationType === 'months') {
      durationInDays *= 30;
    }
    
    return Math.ceil(dosagePerDay * durationInDays);
  };

  const issuedOn = (() => {
    const base = prescriptionDate || patientData.date;
    const parsed = base ? new Date(base) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  })();

  const getValidityInfo = () => {
    const maxDurationDays = (medicines || []).reduce((max, med) => {
      if (!med || med.asNeeded) return max;
      const parsed = parseInt(med.duration, 10);
      if (Number.isNaN(parsed)) return max;
      let days = parsed;
      if (med.durationType === 'weeks') days *= 7;
      else if (med.durationType === 'months') days *= 30;
      else if (med.durationType === 'everyVisit') days = 0;
      if (med.type === 'injection') days = 0;
      return Math.max(max, days);
    }, 0);

    if (maxDurationDays === 0) {
      return { maxDurationDays: 0, validUntil: null };
    }

    const validUntil = new Date(issuedOn);
    validUntil.setDate(validUntil.getDate() + maxDurationDays);
    return { maxDurationDays, validUntil };
  };

  const { maxDurationDays, validUntil } = getValidityInfo();

  return (
    <div className="print-only">
      <div className="print-page">
        {/* Watermark (large faint logo) */}
        <div className="watermark">
          <img src="/public/images/logo2.png" alt="img" />
        </div>
        {/* Header with Logo */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          borderBottom: '2px solid #000',
          paddingBottom: '10px',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src="images/logo2.png" 
              alt="SRM Logo" 
              style={{ width: '60px', height: '60px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <h2 style={{ margin: '0', fontSize: '22px', fontWeight: 'bold' }}>
                SRM Dental College
              </h2>
              <p style={{ margin: '2px 0', fontSize: '11px' }}>
                Ramapuram, Chennai - 600089
              </p>
            </div>
          </div>
          
          <div style={{ textAlign: 'right', fontSize: '10px' }}>
            <div><strong>SRM Dental College Hospital</strong></div>
            <div>Ramapuram, Chennai - 600089</div>
            <div>Contact: +91 44-2249-0526</div>
            <div>Email: info@srmdental.ac.in</div>
          </div>
        </div>

        {/* Doctor Info */}
        <div style={{ marginBottom: '12px', borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>
            {doctorInfo.name || 'Dr. Parvin'}, BDS, MDS (Periodontics)
          </h3>
          <p style={{ margin: '0', fontSize: '10px' }}>
            Reg No: DCI/93030
          </p>
        </div>

        {/* Patient Info */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '12px',
          fontSize: '11px',
          backgroundColor: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px'
        }}>
          <div>
            <p style={{ margin: '2px 0' }}>
              <strong>Name:</strong> {patientData.name}, {patientData.gender}, {patientData.age} Yrs
            </p>
            <p style={{ margin: '2px 0' }}>
              <strong>Mobile:</strong> +91-9876543210
            </p>
            <p style={{ margin: '2px 0' }}>
              <strong>Patient ID:</strong> {patientId || 'A00123567'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '2px 0' }}>
              <strong>Date:</strong> {new Date(prescriptionDate || patientData.date).toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          </div>
        </div>

        {/* Medication Table */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ 
            margin: '0 0 6px 0', 
            fontSize: '12px', 
            fontWeight: 'bold',
            borderBottom: '1px solid #000',
            paddingBottom: '3px'
          }}>
            Medication Prescribed
          </h4>
          <table className="print-table">
            <thead>
              <tr style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
                <th style={{ width: '5%' }}>S.No</th>
                <th style={{ width: '10%' }}>Type</th>
                <th style={{ width: '20%' }}>Medicine Name</th>
                <th style={{ width: '15%' }}>
                  <div className="dosage-header">
                    <div>Dosage</div>
                    <div className="dosage-label-row dosage-header-labels">
                      <span>Morning</span>
                      <span>Noon</span>
                      <span>Evening</span>
                      <span>Night</span>
                    </div>
                  </div>
                </th>
                <th style={{ width: '12%' }}>Food Intake</th>
                <th style={{ width: '13%' }}>Duration</th>
                <th style={{ width: '15%' }}>Total Qty</th>
                <th style={{ width: '10%' }}>As Needed</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((medicine, index) => (
                <tr key={index}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ textTransform: 'capitalize' }}>{medicine.type}</td>
                  <td>
                    <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                      {medicine.name.toUpperCase()}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="dosage-values-row">
                      <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.m || '0')}</span>
                      <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.n || '0')}</span>
                      <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.e || '0')}</span>
                      <span>{medicine.type === 'injection' ? '-' : (medicine.dosage?.n2 || '0')}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', textTransform: 'capitalize' }}>
                    {medicine.type === 'injection' ? '-' : (medicine.foodIntake === 'after' ? 'After Food' : 'Before Food')}
                  </td>
                  <td style={{ textAlign: 'center' }}>{formatDuration(medicine)}</td>
                  <td style={{ textAlign: 'center' }}>{calculateTotalQty(medicine)}</td>
                  <td style={{ textAlign: 'center' }}>{medicine.asNeeded ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Advice */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ 
            margin: '0 0 6px 0', 
            fontSize: '12px', 
            fontWeight: 'bold',
            borderBottom: '1px solid #000',
            paddingBottom: '3px'
          }}>
            Advice & Instructions
          </h4>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '11px', lineHeight: '1.6' }}>
            <li>Maintain good oral hygiene.</li>
            <li>Brush twice daily with a soft-bristled toothbrush.</li>
            <li>Avoid very hot or cold foods/drinks.</li>
            {nextVisitDate && (
              <li><strong>Follow up in 2 weeks or as advised.</strong></li>
            )}
            {advice && advice.split('\n').filter(line => line.trim()).map((line, idx) => (
              <li key={idx}>{line.trim()}</li>
            ))}
          </ul>
        </div>

        {/* Next Visit */}
        {nextVisitDate && (
          <div style={{ marginBottom: '15px', fontSize: '11px' }}>
            <p style={{ margin: '0' }}>
              <strong>Next Visit:</strong> {new Date(nextVisitDate).toLocaleDateString('en-GB')}
              {nextVisitTime && ` at ${nextVisitTime}`}
            </p>
          </div>
        )}

        {/* Signature */}
        <div style={{ 
          marginTop: '40px', 
          display: 'flex', 
          justifyContent: 'flex-end',
          alignItems: 'flex-end'
        }}>
          <div style={{ textAlign: 'right', fontSize: '11px' }}>
            {doctorSignature && (
              <div style={{ marginBottom: '5px' }}>
                <img 
                  src={doctorSignature} 
                  alt="Doctor Signature" 
                  style={{ 
                    maxWidth: '150px', 
                    maxHeight: '80px',
                    display: 'block',
                    marginLeft: 'auto'
                  }} 
                />
              </div>
            )}
            <div style={{ 
              borderTop: '1px solid #000', 
              paddingTop: '5px',
              minWidth: '180px',
              marginTop: '5px'
            }}>
              (Signature of {doctorInfo.name || 'Dr. Parvin'})
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '10px', 
          borderTop: '1px solid #ccc',
          fontSize: '9px',
          color: '#666',
          lineHeight: '1.4'
        }}>
          <p style={{ margin: '0' }}>
            <strong>Disclaimer:</strong> This prescription was generated digitally by SRM Dental College on {issuedOn.toLocaleDateString('en-IN')}. It is valid until {validUntil ? validUntil.toLocaleDateString('en-IN') : 'N/A'} based on the longest prescribed duration ({maxDurationDays || 0} days from issue). Kindly consult a doctor for further advice if symptoms persist.
          </p>
        </div>
        {/* Footer intentionally omitted from printed PDF */}
      </div>
    </div>
  );
};
// ==================== END OF PRINT COMPONENT ====================

// Your existing Prescription component starts here
const Prescription = () => {
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    gender: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [drugAllergies, setDrugAllergies] = useState('');
  const [dietAllergies, setDietAllergies] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [nextVisitTime, setNextVisitTime] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDateForSlot, setSelectedDateForSlot] = useState('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState({});
  const [maxSlotsPerTime, setMaxSlotsPerTime] = useState(1);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalCallback, setModalCallback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [doctorInfo, setDoctorInfo] = useState({
    id: '',
    name: ''
  });
  const [doctorSignature, setDoctorSignature] = useState(null);

  const calculateAgeFromDOB = (dobValue) => {
    if (!dobValue) return '';
    const dob = new Date(dobValue);
    if (Number.isNaN(dob.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
    return age >= 0 ? String(age) : '';
  };

  const derivePatientAge = (patient) => {
    if (!patient) return '';
    const rawAge =
      patient.personalInfo?.age ??
      patient.age ??
      patient.patientAge ??
      patient.personalInfo?.patientAge;

    if (rawAge !== null && rawAge !== undefined && rawAge !== '') {
      return String(rawAge);
    }

    const dob =
      patient.personalInfo?.dateOfBirth ||
      patient.dateOfBirth ||
      patient.dob ||
      patient.date_of_birth;

    return calculateAgeFromDOB(dob);
  };

  useEffect(() => {
    // Check if doctor selected a patient (priority) or if patient is logged in
    const currentPatientId = localStorage.getItem('CurrentpatientId');
    const currentPatientName = localStorage.getItem('CurrentpatientName');
    const loggedInPatientId = localStorage.getItem('patientId');
    const loggedInPatientName = localStorage.getItem('patientName');

    if (currentPatientId && currentPatientName) {
      // Doctor selected a patient from dashboard - use this (priority)
      setPatientId(currentPatientId);
      setPatientData(prev => ({
        ...prev,
        name: currentPatientName
      }));

      // Fetch complete patient details
      fetchPatientDetails(currentPatientId);
    } else if (loggedInPatientId && loggedInPatientName) {
      // Patient is logged in - fetch their details
      setPatientId(loggedInPatientId);
      setPatientData(prev => ({
        ...prev,
        name: loggedInPatientName
      }));

      // Fetch complete patient details for logged-in patient
      fetchPatientDetailsByPatientId(loggedInPatientId);
    }

    // Get patient email from localStorage if available
    const storedEmail = localStorage.getItem('patientEmail');
    if (storedEmail) {
      setPatientEmail(storedEmail);
    }

    // Get doctor info from localStorage
    const doctorId = localStorage.getItem('doctorId');
    const doctorName = localStorage.getItem('doctorName');
    setDoctorInfo({
      id: doctorId || 'DOC001',
      name: doctorName || 'Dr. Smith'
    });
    
    // Fetch doctor signature if patient is selected
    if (loggedInPatientId || currentPatientId) {
      fetchDoctorSignature(loggedInPatientId || currentPatientId);
    }

    // Fetch last prescription for chief complaint and diagnosis
    const patientIdToFetch = currentPatientId || loggedInPatientId;
    if (patientIdToFetch) {
      fetchLastPrescription(patientIdToFetch);
      prefillFromGeneralCase(patientIdToFetch);
    }
  }, []);

  const fetchPatientDetails = async (id) => {
    if (!id || id.trim() === '') {
      console.log('Invalid patient ID provided');
      return;
    }

    try {
      console.log('Fetching patient details for ID:', id);
      
      // Try the first endpoint
      let response = await fetch(buildApiUrl(`/api/doctor-patient/${id}`));
      
      // If that fails, try alternative endpoint
      if (!response.ok) {
        console.log('First endpoint failed, trying alternative endpoint...');
        response = await fetch(buildApiUrl(`/api/patient-details/${id}`));
      }
      
      // If that also fails, try another alternative
      if (!response.ok) {
        console.log('Second endpoint failed, trying patient-details by-patient-id...');
        response = await fetch(buildApiUrl(`/api/patient-details/by-patient-id/${id}`));
      }
      
      if (response.ok) {
        const result = await response.json();
        const patient = result.data || result;
        
        console.log('Fetched patient data:', patient);

        // Handle different response structures
        const firstName = patient.personalInfo?.firstName || patient.firstName || patient.patientName?.split(' ')[0] || '';
        const lastName = patient.personalInfo?.lastName || patient.lastName || patient.patientName?.split(' ').slice(1).join(' ') || '';
        const age = derivePatientAge(patient);
        const gender = (patient.personalInfo?.gender || patient.gender || patient.patientGender || '').toLowerCase();

        setPatientData(prev => ({
          ...prev,
          name: `${firstName} ${lastName}`.trim() || patient.patientName || '',
          age: age,
          gender: gender
        }));
        
        console.log('Updated patient data with:', { name: `${firstName} ${lastName}`.trim(), age, gender });
        
        // Fetch chief complaint from patient medical info
        if (patient.medicalInfo?.chiefComplaint) {
          setSymptoms(patient.medicalInfo.chiefComplaint);
          console.log('Fetched chief complaint from patient data:', patient.medicalInfo.chiefComplaint);
        }
        
        // Get patient email if available
        if (patient.contactInfo?.email || patient.email) {
          setPatientEmail(patient.contactInfo?.email || patient.email);
        }
        
        // Get allergies from patient vitals
        const vitals = patient.vitals || {};
        if (vitals.drugAllergies || vitals.dietAllergies) {
          console.log('Patient vitals:', vitals);
          const drugAllergiesList = vitals.drugAllergies && vitals.drugAllergies.length > 0 
            ? vitals.drugAllergies.join(', ') 
            : 'None';
          const dietAllergiesList = vitals.dietAllergies && vitals.dietAllergies.length > 0 
            ? vitals.dietAllergies.join(', ') 
            : 'None';
          console.log('Drug allergies:', drugAllergiesList, 'Diet allergies:', dietAllergiesList);
          setDrugAllergies(drugAllergiesList);
          setDietAllergies(dietAllergiesList);
        } else {
          console.log('No vitals field in patient data');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from server:', response.status, errorData);
        // Don't show alert - just log the error silently while user is typing
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      // Don't show alert - just log the error silently while user is typing
    }
  };

  const fetchPatientDetailsByPatientId = async (patientId) => {
    try {
      // First, try to fetch patient details using the patientId from PatientDetails collection
      const response = await fetch(buildApiUrl(`/api/patient-details/by-patient-id/${patientId}`));

      if (response.ok) {
        const result = await response.json();
        const patient = result.data || result.patient || result;
        
        console.log('Fetched patient details by ID:', patient);

        const derivedAge = derivePatientAge(patient);
        const derivedGender = (patient?.personalInfo?.gender || patient?.gender || '').toLowerCase();
        const derivedName = patient?.personalInfo
          ? `${patient.personalInfo.firstName || ''} ${patient.personalInfo.lastName || ''}`.trim()
          : (patient?.patientName || '');

        setPatientData(prev => ({
          ...prev,
          name: derivedName,
          age: derivedAge,
          gender: derivedGender
        }));
        
        // Fetch chief complaint from patient medical info
        if (patient.medicalInfo?.chiefComplaint) {
          setSymptoms(patient.medicalInfo.chiefComplaint);
          console.log('Fetched chief complaint from patient data:', patient.medicalInfo.chiefComplaint);
        }
        
        // Get patient email if available
        if (patient.contactInfo && patient.contactInfo.email) {
          setPatientEmail(patient.contactInfo.email);
        }
        
        // Get allergies from patient vitals
        if (patient.vitals) {
          console.log('Patient vitals:', patient.vitals);
          const drugAllergiesList = patient.vitals.drugAllergies && patient.vitals.drugAllergies.length > 0 
            ? patient.vitals.drugAllergies.join(', ') 
            : 'None';
          const dietAllergiesList = patient.vitals.dietAllergies && patient.vitals.dietAllergies.length > 0 
            ? patient.vitals.dietAllergies.join(', ') 
            : 'None';
          console.log('Drug allergies:', drugAllergiesList, 'Diet allergies:', dietAllergiesList);
          setDrugAllergies(drugAllergiesList);
          setDietAllergies(dietAllergiesList);
        } else {
          console.log('No vitals field in patient data');
        }
      } else {
        // If not found in PatientDetails, keep the name from localStorage
        console.log('Patient details not found in database, using localStorage data');
      }
    } catch (error) {
      console.error('Error fetching patient details by patient ID:', error);
      // Keep using the name from localStorage if API fails
    }
  };

  const prefillFromGeneralCase = async (currentPatientId) => {
    try {
      if (!currentPatientId) return;

      const token = localStorage.getItem('token');
      const response = await fetch(
        buildApiUrl(`/api/general/patient/${encodeURIComponent(currentPatientId)}`),
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) return;

      const result = await response.json();
      const latestCase = Array.isArray(result?.data) ? result.data[0] : null;
      if (!latestCase) return;

      const chiefComplaint = String(latestCase.chiefComplaint || '').trim();
      if (chiefComplaint) {
        setSymptoms((prev) => (String(prev || '').trim() ? prev : chiefComplaint));
      }

      const diagnosisText = String(
        latestCase.finalDiagnosis || latestCase.provisionalDiagnosis || ''
      ).trim();

      if (diagnosisText) {
        setDiagnosis((prev) => (String(prev || '').trim() ? prev : diagnosisText));
      }
    } catch (error) {
      console.error('Error pre-filling from latest General Case:', error);
    }
  };

  const fetchDoctorSignature = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      const doctorId = localStorage.getItem('doctorId');
      
      if (!patientId) return;

      // Try to fetch the latest case sheet with signature for this patient
      const endpoints = [
        `http://localhost:5000/api/casesheets/patient/${patientId}`,
        `http://localhost:5000/api/fpd/patient/${patientId}`,
        `http://localhost:5000/api/partial/patient/${patientId}`,
        `http://localhost:5000/api/complete-denture/patient/${patientId}`,
        `http://localhost:5000/api/implant/patient/${patientId}`,
        `http://localhost:5000/api/implant-patient/patient/${patientId}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
              // Get the most recent case sheet
              const latestCase = result.data[result.data.length - 1];
              
              if (latestCase._id && latestCase.digitalSignature) {
                // Construct signature endpoint
                const baseRoute = endpoint.split('/patient/')[0];
                const signatureUrl = `${baseRoute}/${latestCase._id}/signature`;
                
                const signatureResponse = await fetch(signatureUrl, {
                  headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (signatureResponse.ok) {
                  const blob = await signatureResponse.blob();
                  const signatureDataUrl = URL.createObjectURL(blob);
                  setDoctorSignature(signatureDataUrl);
                  console.log('Doctor signature loaded successfully');
                  return;
                }
              }
            }
          }
        } catch (err) {
          console.log(`Signature not found in ${endpoint}`);
        }
      }
      console.log('No signature found in any case sheet');
    } catch (error) {
      console.error('Error fetching doctor signature:', error);
    }
  };

  const fetchLastPrescription = async (patientId) => {
    try {
      if (!patientId) return;

      console.log('Fetching last prescription for patient:', patientId);

      const response = await fetch(buildApiUrl(`/api/prescriptions/patient/${patientId}?page=1&limit=1`));
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          const lastPrescription = result.data[0];
          
          console.log('Last prescription found:', lastPrescription);

          // Pre-fill chief complaint and diagnosis from last prescription only if not already set from patient data
          if (lastPrescription.symptoms && !symptoms.trim()) {
            setSymptoms(lastPrescription.symptoms);
            console.log('Pre-filled chief complaint from last prescription:', lastPrescription.symptoms);
          }
          
          if (lastPrescription.diagnosis) {
            setDiagnosis(lastPrescription.diagnosis);
            console.log('Pre-filled diagnosis:', lastPrescription.diagnosis);
          }

          // Optionally pre-fill drug and diet allergies if they exist
          if (lastPrescription.drugAllergies) {
            setDrugAllergies(lastPrescription.drugAllergies);
          }
          
          if (lastPrescription.dietAllergies) {
            setDietAllergies(lastPrescription.dietAllergies);
          }
        } else {
          console.log('No previous prescription found for this patient');
        }
      } else {
        console.log('Failed to fetch prescriptions:', response.status);
      }
    } catch (error) {
      console.error('Error fetching last prescription:', error);
    }
  };

  const handleBackToDashboard = () => {
    const role = String(localStorage.getItem('role') || '').toLowerCase();

    if (role === 'patient') {
      window.location.href = '/patient-dashboard';
      return;
    }

    if (role === 'pg') {
      window.location.href = '/pg-dashboard';
      return;
    }

    if (role === 'chief' || role === 'chief-doctor') {
      window.location.href = '/chief-doctor-dashboard';
      return;
    }

    if (role === 'doctor') {
      window.location.href = '/doctor-dashboard';
      return;
    }

    // Fallback for older sessions where role might be missing.
    if (localStorage.getItem('patientId')) {
      window.location.href = '/patient-dashboard';
      return;
    }

    if (localStorage.getItem('pgId')) {
      window.location.href = '/pg-dashboard';
      return;
    }

    window.location.href = '/doctor-dashboard';
  };

  // Utility functions for slot booking
  const formatMinutesToTime = (mins) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? '0' + minutes : minutes;
    return `${h}:${m} ${ampm}`;
  };

  // Convert 12-hour time (e.g., "9:00 AM") to 24-hour format (e.g., "09:00")
  const convertTo24HourFormat = (timeStr) => {
    if (!timeStr) return '';
    
    // If already in 24-hour format (HH:MM), return as is
    if (timeStr.includes(':') && !timeStr.includes('AM') && !timeStr.includes('PM')) {
      return timeStr;
    }
    
    // Parse 12-hour format like "9:00 AM" or "2:30 PM"
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  const generateTimeSlots = () => {
    // Strict schedule: 30-minute slots from 9:00 AM to 2:00 PM (last start 2:00 PM, ends 2:30 PM)
    // Lunch break (1:00–2:00) removes 1:00 and 1:30.
    // Break (11:00–11:10) removes the 11:00–11:30 slot; next slot remains 11:30 (no 11:10 slot).
    const slotStartsInMinutes = [
      9 * 60,
      9 * 60 + 30,
      10 * 60,
      10 * 60 + 30,
      11 * 60 + 30,
      12 * 60,
      12 * 60 + 30,
      14 * 60,
    ];

    return slotStartsInMinutes.map((start) => ({
      start,
      end: start + 30,
      time: formatMinutesToTime(start),
    }));
  };

  const generateUpcomingDates = (numDays) => {
    const dates = [];
    const today = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    let daysAdded = 0;
    let dayOffset = 1; // Start from tomorrow

    // Generate exactly numDays of weekdays (excluding weekends)
    while (daysAdded < numDays) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + dayOffset);
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (futureDate.getDay() !== 0 && futureDate.getDay() !== 6) {
        const yyyy = futureDate.getFullYear();
        const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
        const dd = String(futureDate.getDate()).padStart(2, '0');
        dates.push({
          fullDate: `${yyyy}-${mm}-${dd}`,
          displayDate: futureDate.toLocaleDateString('en-US', options),
          date: futureDate
        });
        daysAdded++;
      }
      
      dayOffset++;
    }
    
    return dates;
  };

  // Calendar generation functions
  const generateCalendarDates = (currentMonth, currentYear) => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate 42 days (6 weeks) for calendar grid
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === currentMonth;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      
      dates.push({
        date: new Date(date),
        day: date.getDate(),
        isCurrentMonth,
        isWeekend,
        isPast,
        isToday,
        isAvailable: isCurrentMonth && !isWeekend && !isPast,
        fullDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      });
    }
    
    return dates;
  };

  const fetchBookedSlotsForDate = async (date) => {
    try {
      const response = await fetch(`http://localhost:5000/api/appointment/booked-slots/${date}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBookedSlots(data.bookedSlots || {});
          setMaxSlotsPerTime(Number.isFinite(data.maxSlotsPerTime) ? data.maxSlotsPerTime : 1);
        } else {
          setBookedSlots({});
          setMaxSlotsPerTime(1);
        }
      } else {
        setBookedSlots({});
        setMaxSlotsPerTime(1);
      }
    } catch (error) {
      console.error('Error fetching booked slots:', error);
      setBookedSlots({});
      setMaxSlotsPerTime(1);
    }
  };

  const handleOpenSlotModal = () => {
    const today = new Date();
    setCurrentCalendarMonth(today.getMonth());
    setCurrentCalendarYear(today.getFullYear());
    setShowSlotModal(true);
  };

  const navigateCalendar = (direction) => {
    if (direction === 'prev') {
      if (currentCalendarMonth === 0) {
        setCurrentCalendarMonth(11);
        setCurrentCalendarYear(currentCalendarYear - 1);
      } else {
        setCurrentCalendarMonth(currentCalendarMonth - 1);
      }
    } else {
      if (currentCalendarMonth === 11) {
        setCurrentCalendarMonth(0);
        setCurrentCalendarYear(currentCalendarYear + 1);
      } else {
        setCurrentCalendarMonth(currentCalendarMonth + 1);
      }
    }
  };

  const handleDateSelection = (date) => {
    setSelectedDateForSlot(date);
    const slots = generateTimeSlots();
    setAvailableTimeSlots(slots);
    fetchBookedSlotsForDate(date);
  };

  const isSlotBooked = (time) => {
    // A slot is booked only when all doctors are booked for that time
    const bookedCount = bookedSlots[time] || 0;
    return bookedCount >= (maxSlotsPerTime || 1);
  };

  const handleSlotSelection = async (date, time) => {
    console.log('handleSlotSelection called with:', { patientId, date, time });
    
    if (!patientId || patientId.trim() === '') {
      console.error('Patient ID is empty:', patientId);
      alert('Patient ID is missing. Please enter a Patient ID to select appointment slots.');
      return;
    }

    try {
      // Use patient email if available, otherwise use a default
      const emailToUse = patientEmail || `${patientId}@temp.com`;
      
      // Create appointment
      const appointmentData = {
        patientId: patientId,
        patientEmail: emailToUse,
        chiefComplaint: 'Follow ups',
        appointmentDate: date,
        appointmentTime: time
      };

      console.log('Booking appointment with data:', appointmentData);

      const response = await fetch('http://localhost:5000/api/appointment/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Appointment booked successfully:', result);
        
        // Convert time to 24-hour format for HTML time input
        const timeIn24HourFormat = convertTo24HourFormat(time);
        console.log('Original time:', time, 'Converted to 24-hour:', timeIn24HourFormat);
        
        // Set the date and time in the form
        setNextVisitDate(date);
        setNextVisitTime(timeIn24HourFormat);
        
        console.log('Set appointment to:', { date, time: timeIn24HourFormat });
        
        // Close the modal
        setShowSlotModal(false);
        setSelectedDateForSlot('');
        setAvailableTimeSlots([]);
        setBookedSlots({});
        
        // Don't show alert - just silently close the modal
      } else {
        const error = await response.json();
        console.error('Failed to book appointment:', error);
        const detailedMessage =
          (error && error.error && (error.error.message || error.error)) ||
          (error && error.message) ||
          'Booking failed. Please try again.';
        alert('Failed to book appointment: ' + detailedMessage);
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Error booking appointment. Please try again.');
    }
  };

  const handleClearNextVisit = () => {
    setNextVisitDate('');
    setNextVisitTime('');
  };

  const addMedicineRow = () => {
    const newMedicine = {
      id: Date.now(),
      type: '',
      name: '',
      dosage: { m: '0', n: '0', e: '0', n2: '0' },
      foodIntake: 'after',
      duration: '',
      durationType: 'days', // New field to track duration type
      asNeeded: false
    };

    setMedicines([...medicines, newMedicine]);
  };

  const removeMedicineRow = (id) => {
    showConfirmationModal('Are you sure you want to remove this medicine?', () => {
      setMedicines(medicines.filter(medicine => medicine.id !== id));
    });
  };

  const updateMedicine = (id, field, value) => {
    setMedicines(medicines.map(medicine => {
      if (medicine.id === id) {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          return {
            ...medicine,
            [parent]: {
              ...medicine[parent],
              [child]: value
            }
          };
        }

        // Special handling for injection type changes
        if (field === 'type' && value === 'injection') {
          return {
            ...medicine,
            [field]: value,
            durationType: 'everyVisit',
            duration: 'Every Visit',
            dosage: { m: '1', n: '0', e: '0', n2: '0' }, // Single dose for injections
            foodIntake: 'after' // Default for injections
          };
        } else if (field === 'type' && medicine.type === 'injection' && value !== 'injection') {
          // Reset to normal values when changing from injection to other types
          return {
            ...medicine,
            [field]: value,
            durationType: 'days',
            duration: '',
            dosage: { m: '0', n: '0', e: '0', n2: '0' },
            foodIntake: 'after'
          };
        }

        return { ...medicine, [field]: value };
      }
      return medicine;
    }));
  };

  const showConfirmationModal = (message, onConfirm) => {
    setModalMessage(message);
    setModalCallback(() => onConfirm);
    setShowModal(true);
  };

  const handleConfirm = () => {
    if (modalCallback) modalCallback();
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!patientId) {
      alert('Patient ID is required. Please go back to patient selection.');
      return;
    }

    if (!symptoms.trim()) {
      alert('Chief Complaint is required.');
      return;
    }

    if (!diagnosis.trim()) {
      alert('Diagnosis is required.');
      return;
    }

    if (medicines.length === 0) {
      alert('Please add at least one medicine.');
      return;
    }

    // Validate medicines
    for (const medicine of medicines) {
      if (!medicine.asNeeded) {
        if (!medicine.type || !medicine.name) {
          alert('Please fill all medicine details (Type, Name).');
          return;
        }
        // Duration is optional for non-injection medicines now
      }
    }

    setLoading(true);

    try {
      const linkedCaseId = localStorage.getItem('linkedCaseId') || localStorage.getItem('caseId');

      // Prepare prescription data
      const prescriptionData = {
        caseId: linkedCaseId || null,
        patientId: patientId,
        patientData: patientData,
        symptoms: symptoms,
        diagnosis: diagnosis,
          medicines: medicines.map(med => ({
          type: med.type,
          name: med.name,
          dosage: med.dosage,
          foodIntake: med.foodIntake,
          duration: med.type === 'injection' ? 1 : (med.duration ? parseInt(med.duration) : undefined),
          durationType: med.type === 'injection' ? 'everyVisit' : 'days',
          asNeeded: med.asNeeded
        })),
        advice: advice,
        drugAllergies: drugAllergies || 'None',
        dietAllergies: dietAllergies || 'None',
        nextVisitDate: nextVisitDate || null,
        nextVisitTime: nextVisitTime || null,
        doctorId: doctorInfo.id,
        doctorName: doctorInfo.name
      };

      console.log('Sending prescription data:', prescriptionData);

      const response = await fetch('http://localhost:5000/api/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prescriptionData)
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          alert('Prescription saved successfully!');

          // Store prescription ID for later use
          localStorage.setItem('lastPrescriptionId', result.data._id);

          // Optional: store per-case mapping for quick reopen
          if (linkedCaseId) {
            localStorage.setItem(`prescriptionId_case_${linkedCaseId}`, result.data._id);
          }

          // Reset form if needed
          // resetForm();
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          alert('Prescription may have been saved but there was an issue with the response.');
        }
      } else {
        console.error('Response not OK:', response.status, responseText);
        try {
          const error = JSON.parse(responseText);
          throw new Error(error.message || 'Failed to save prescription');
        } catch (parseError) {
          throw new Error(`Server error: ${response.status} - ${responseText}`);
        }
      }
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Error saving prescription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientDataChange = (field, value) => {
    setPatientData({
      ...patientData,
      [field]: value
    });
  };

  const printPrescription = () => {
    // Show the print-only layout on-screen briefly so print preview isn't blank
    try {
      document.body.classList.add('show-print-preview');
    } catch (err) {
      // ignore if document not available
    }

    // Give the browser a short moment to apply styles
    setTimeout(() => {
      window.print();
    }, 200);

    // Remove preview class after printing
    const cleanup = () => {
      try {
        document.body.classList.remove('show-print-preview');
      } catch (err) {}
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
  };

  // Download PDF using html2canvas + jsPDF loaded from CDN at runtime
  const downloadPrescriptionPDF = async () => {
    const loadScript = (src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });

    // Load libraries (CDN) if not present
    try {
      await loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    } catch (err) {
      console.error('Error loading PDF libraries:', err);
      alert('Failed to load PDF libraries. Falling back to print preview.');
      printPrescription();
      return;
    }

    const html2canvas = window.html2canvas || window.HTML2CANVAS;
    const jsPDF = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : (window.jsPDF || (window.jspdf && window.jspdf.jsPDF));
    if (!html2canvas || !jsPDF) {
      console.error('PDF libraries not available after load.');
      printPrescription();
      return;
    }

    // Reveal the print layout so it renders correctly
    try { document.body.classList.add('show-print-preview'); } catch (e) {}

    // small delay to allow styles to apply
    await new Promise(r => setTimeout(r, 220));

    const el = document.querySelector('.print-page');
    if (!el) {
      alert('Printable area not found.');
      try { document.body.classList.remove('show-print-preview'); } catch (e) {}
      return;
    }

    // Wait for images inside the printable area to finish loading to ensure they appear in the canvas
    const waitForImages = (container, timeout = 5000) => new Promise((resolve) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      if (imgs.length === 0) return resolve();
      let loaded = 0;
      let finished = false;

      const checkDone = () => {
        if (finished) return;
        loaded += 1;
        if (loaded >= imgs.length) {
          finished = true;
          resolve();
        }
      };

      imgs.forEach(img => {
        if (img.complete && img.naturalWidth !== 0) {
          checkDone();
        } else {
          img.addEventListener('load', checkDone, { once: true });
          img.addEventListener('error', checkDone, { once: true });
        }
      });

      // safety timeout
      setTimeout(() => { if (!finished) { finished = true; resolve(); } }, timeout);
    });

    await waitForImages(el, 4000);

    try {
      const scale = 2; // higher for better quality
      const canvas = await window.html2canvas(el, { scale, useCORS: true, logging: false, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');

      // A4 in mm and px conversion
      const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // mm
      const pageHeight = 297; // mm
      const margin = 10; // mm

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidthMm = (pageWidth - margin * 2);
      const imgHeightMm = (imgProps.height * imgWidthMm) / imgProps.width;

      let y = margin;
      // If height fits, add single page, else split into pages
      if (imgHeightMm <= (pageHeight - margin * 2)) {
        pdf.addImage(imgData, 'PNG', margin, y, imgWidthMm, imgHeightMm);
      } else {
        // Split by rendering canvas slices per page height
        const pxPerMm = canvas.height / imgHeightMm;
        const pageHeightPx = Math.floor((pageHeight - margin * 2) * pxPerMm);
        let remainingHeight = canvas.height;
        let srcY = 0;
        while (remainingHeight > 0) {
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(pageHeightPx, remainingHeight);
          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, srcY, canvas.width, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height);
          const pageImg = pageCanvas.toDataURL('image/png');
          const pageImgProps = pdf.getImageProperties(pageImg);
          const pageImgHeightMm = (pageImgProps.height * imgWidthMm) / pageImgProps.width;
          pdf.addImage(pageImg, 'PNG', margin, y, imgWidthMm, pageImgHeightMm);
          remainingHeight -= pageCanvas.height;
          srcY += pageCanvas.height;
          if (remainingHeight > 0) pdf.addPage();
        }
      }

      const filename = `prescription_${(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Falling back to print preview.');
      printPrescription();
    } finally {
      try { document.body.classList.remove('show-print-preview'); } catch (e) {}
    }
  };

  return (
    <div className="prescription-container">
      <div className="prescription-form">
        {/* Back to Dashboard Button */}
        <button
          onClick={handleBackToDashboard}
          className="dashboard-back"
          type="button"
        >
          ← Back to Dashboard
        </button>

        <div className="logo-container">
          <img
            src="/logo.png"
            alt="Dental Clinic Logo"
            className="logo"
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
            onError={(e) => {
              console.error('Logo failed to load');
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />

          <h2 className="clinic-name">SRM Dental College</h2>
          <p className="prescription-label">Prescription</p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Patient Name:</label>
              <input
                type="text"
                value={patientData.name}
                onChange={(e) => handlePatientDataChange('name', e.target.value)}
                className="form-input"
                required
                readOnly={!!localStorage.getItem('patientId') || !!localStorage.getItem('CurrentpatientId')} // Make readonly if patient is logged in
              />
            </div>
            <div className="form-field">
              <label className="form-label">Age:</label>
              <input
                type="number"
                value={patientData.age}
                onChange={(e) => handlePatientDataChange('age', e.target.value)}
                className="form-input"
                min="0"
                required
                readOnly={(!!localStorage.getItem('patientId') || !!localStorage.getItem('CurrentpatientId')) && !!patientData.age}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Gender:</label>
              <select
                value={patientData.gender || ''}
                onChange={(e) => handlePatientDataChange('gender', e.target.value)}
                className="form-input"
                disabled={
                  (!!localStorage.getItem('patientId') || !!localStorage.getItem('CurrentpatientId')) &&
                  !!String(patientData.gender || '').trim()
                }
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Date:</label>
              <input
                type="date"
                value={patientData.date}
                onChange={(e) => handlePatientDataChange('date', e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Medicine suggestions list */}
          <datalist id="medicine-suggestions">
            {MEDICINE_LIST.map((med) => (
              <option key={med.name} value={med.name} />
            ))}
          </datalist>

          <div className="form-field">
            <label className="form-label">Chief Complaint:</label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="form-textarea"
              rows="2"
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Diagnosis:</label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="form-textarea"
              rows="2"
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Prescribed Medicines:</label>
            <div className="medicine-table-wrapper">
              <table className="medicine-table">
                <thead>
                  <tr>
                    <th style={{ width: '6%' }}>S.No.</th>
                    <th style={{ width: '12%' }}>Type</th>
                    <th style={{ width: '21%' }}>Medicine Name</th>
                    <th style={{ width: '25%' }}>
                      <div className="dosage-header">
                        <div>Dosage</div>
                        <div className="dosage-label-row dosage-header-labels">
                          <span>Morning</span>
                          <span>Noon</span>
                          <span>Evening</span>
                          <span>Night</span>
                        </div>
                      </div>
                    </th>
                    <th style={{ width: '10%' }}>Food</th>
                    <th style={{ width: '14%' }}>Duration</th>
                    <th style={{ width: '7%' }}>As Needed</th>
                    <th style={{ width: '5%' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((medicine, index) => (
                    <MedicineRow
                      key={medicine.id}
                      index={index}
                      medicine={medicine}
                      updateMedicine={updateMedicine}
                      removeMedicine={removeMedicineRow}
                    />
                  ))}
                  {medicines.length === 0 && (
                    <tr className="no-medicines">
                      <td colSpan="8" className="text-center">
                        No medicines added. Click "Add Medicine" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addMedicineRow}
              className="add-medicine-btn"
            >
              Add Medicine
            </button>
          </div>
            

          <div className="form-field">
            <label className="form-label">Advice:</label>
            <textarea
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              className="form-textarea"
              rows="2"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Next Visit Appointment:</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="date"
                  value={nextVisitDate || ''}
                  readOnly
                  className="form-input"
                  style={{ cursor: 'pointer', backgroundColor: nextVisitDate ? '#e8f5e9' : '#f5f5f5' }}
                  placeholder="Select date from calendar"
                />
              </div>
              <input
                type="time"
                value={nextVisitTime || ''}
                readOnly
                className="form-input"
                style={{ width: '150px', cursor: 'pointer', backgroundColor: nextVisitTime ? '#e8f5e9' : '#f5f5f5' }}
                placeholder="Select time"
              />
              <button
                type="button"
                onClick={() => {
                  if (!patientId || patientId.trim() === '') {
                    alert('Please enter a Patient ID before selecting appointment slots.');
                    return;
                  }
                  setShowSlotModal(true);
                }}
                className="add-medicine-btn"
                style={{ padding: '10px 20px', whiteSpace: 'nowrap', opacity: !patientId ? 0.6 : 1, cursor: !patientId ? 'not-allowed' : 'pointer' }}
                disabled={!patientId || patientId.trim() === ''}
              >
                Select Slots
              </button>
              {(nextVisitDate || nextVisitTime) && (
                <button
                  type="button"
                  onClick={handleClearNextVisit}
                  className="modal-cancel-btn"
                  style={{ padding: '8px 15px' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={loading}
              className={loading ? "submit-btn disabled" : "submit-btn"}
            >
              {loading ? 'Saving...' : 'Save Prescription'}
            </button>
            <button
              type="button"
              onClick={downloadPrescriptionPDF}
              className="print-btn"
            >
              Print Prescription
            </button>
          </div>
        </form>
      </div>  {/* This closes prescription-form */}

      {/* ADD THESE LINES 👇 */}
      <PrintPrescription 
        patientData={patientData}
        doctorInfo={doctorInfo}
        symptoms={symptoms}
        diagnosis={diagnosis}
        medicines={medicines}
        advice={advice}
        drugAllergies={drugAllergies}
        dietAllergies={dietAllergies}
        nextVisitDate={nextVisitDate}
        nextVisitTime={nextVisitTime}
        patientId={patientId}
        prescriptionDate={patientData.date}
        doctorSignature={doctorSignature}
        onDownload={downloadPrescriptionPDF}
        
      />
      {/* END OF ADDITION 👆 */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>{modalMessage}</p>
            <div className="modal-actions">
              <button onClick={handleConfirm} className="modal-confirm-btn">
                Yes
              </button>
              <button onClick={handleCancel} className="modal-cancel-btn">
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Selection Modal */}
      {showSlotModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: '900px', maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '20px', color: 'white', textAlign: 'center', fontSize: '22px', fontWeight: '700' }}>Select Next Visit Date & Time</h3>
            
            {!selectedDateForSlot ? (
              <>
                {/* Calendar Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '20px',
                  padding: '0 10px'
                }}>
                  <button
                    type="button"
                    onClick={() => navigateCalendar('prev')}
                    className="calendar-nav-btn"
                    style={{
                      background: '#1e3a8a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ‹
                  </button>
                  
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {new Date(currentCalendarYear, currentCalendarMonth).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </h4>
                  
                  <button
                    type="button"
                    onClick={() => navigateCalendar('next')}
                    className="calendar-nav-btn"
                    style={{
                      background: '#1e3a8a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ›
                  </button>
                </div>

                {/* Calendar Grid */}
                <div style={{ marginBottom: '20px' }}>
                  {/* Days of week header */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(7, 1fr)', 
                    gap: '2px',
                    marginBottom: '10px'
                  }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} style={{
                        padding: '10px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: '#fff',
                        backgroundColor: 'rgba(60, 141, 255, 0.2)'
                      }}>
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar dates */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(7, 1fr)', 
                    gap: '2px'
                  }}>
                    {generateCalendarDates(currentCalendarMonth, currentCalendarYear).map((dateObj, index) => {
                      const isSelectable = dateObj.isAvailable;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => isSelectable && handleDateSelection(dateObj.fullDate)}
                          disabled={!isSelectable}
                          style={{
                            padding: '12px 8px',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            backgroundColor: dateObj.isToday 
                              ? 'rgba(60, 141, 255, 0.5)' 
                              : dateObj.isCurrentMonth 
                                ? (isSelectable ? 'rgba(60, 141, 255, 0.2)' : 'rgba(107, 114, 128, 0.2)')
                                : 'rgba(0, 0, 0, 0.1)',
                            color: dateObj.isToday
                              ? '#fff'
                              : dateObj.isCurrentMonth
                                ? (isSelectable ? '#fff' : 'rgba(255, 255, 255, 0.5)')
                                : 'rgba(255, 255, 255, 0.3)',
                            cursor: isSelectable ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                            fontWeight: dateObj.isToday ? 'bold' : 'normal',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            minHeight: '45px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            if (isSelectable) {
                              e.target.style.backgroundColor = 'rgba(60, 141, 255, 0.6)';
                              e.target.style.transform = 'scale(1.05)';
                              e.target.style.borderColor = 'rgba(60, 141, 255, 0.8)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isSelectable) {
                              e.target.style.backgroundColor = 'rgba(60, 141, 255, 0.2)';
                              e.target.style.transform = 'scale(1)';
                              e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            }
                          }}
                        >
                          {dateObj.day}
                          {dateObj.isWeekend && dateObj.isCurrentMonth && (
                            <div style={{ fontSize: '10px', color: '#ff6b6b', marginTop: '2px' }}>
                              Weekend
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '20px', 
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(60, 141, 255, 0.5)', border: '2px solid rgba(60, 141, 255, 0.8)' }}></div>
                    Today
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(60, 141, 255, 0.2)', border: '2px solid rgba(255, 255, 255, 0.3)' }}></div>
                    Available
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(107, 114, 128, 0.2)', border: '2px solid rgba(255, 255, 255, 0.3)' }}></div>
                    Unavailable
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => setShowSlotModal(false)}
                    className="modal-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ marginBottom: '15px', fontSize: '14px', fontWeight: '600', color: 'white' }}>
                  <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Date:</strong> <span style={{ color: 'rgba(60, 141, 255, 0.9)' }}>{new Date(selectedDateForSlot).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </p>
                <div className="time-slots-header">Available Slots for {new Date(selectedDateForSlot).toLocaleDateString('en-IN')}:</div>
                {availableTimeSlots.length > 0 ? (
                  <div className="time-slots-container">
                    {availableTimeSlots.map((slot) => {
                      const isBooked = isSlotBooked(slot.time);
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => !isBooked && handleSlotSelection(selectedDateForSlot, slot.time)}
                          disabled={isBooked}
                          className="time-slot-btn"
                          title={isBooked ? 'This slot is already booked' : 'Click to select'}
                        >
                          {slot.time}
                          {isBooked && <span style={{ fontSize: '10px', marginTop: '4px' }}>Booked</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-slots-message">
                    No time slots available for this date. Please select another date.
                  </div>
                )}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateForSlot('');
                      setAvailableTimeSlots([]);
                      setBookedSlots({});
                    }}
                    className="modal-cancel-btn"
                  >
                    Back to Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSlotModal(false);
                      setSelectedDateForSlot('');
                      setAvailableTimeSlots([]);
                      setBookedSlots({});
                    }}
                    className="modal-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MedicineRow = ({ index, medicine, updateMedicine, removeMedicine }) => {
  const handleDosageChange = (time, value) => updateMedicine(medicine.id, `dosage.${time}`, value);
  const handleInputChange = (field, value) => updateMedicine(medicine.id, field, value);
  const isInjection = medicine.type === 'injection';

  return (
    <tr className="medicine-row">
      <td className="serial-no-cell">{index + 1}</td>
      <td>
        <select
          value={medicine.type}
          onChange={(e) => handleInputChange('type', e.target.value)}
          className="medicine-type"
        >
          <option value="">Select</option>
          <option value="tablet">Tablet</option>
          <option value="syrup">Syrup</option>
          <option value="injection">Injection</option>
          <option value="ointment">Ointment</option>
        </select>
      </td>
      <td>
        <input
          type="text"
          value={medicine.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          list="medicine-suggestions"
          placeholder="   search "
          className="medicine-name"
        />
      </td>
      <td className="dosage-cell">
        <div className="dosage-matrix">
          <div className="dosage-input-row">
            <input
              type="number"
              value={medicine.dosage.m}
              onChange={(e) => handleDosageChange('m', e.target.value)}
              className="dosage-input dosage-matrix-input"
              min="0"
            />
            <input
              type="number"
              value={medicine.dosage.n}
              onChange={(e) => handleDosageChange('n', e.target.value)}
              className="dosage-input dosage-matrix-input"
              min="0"
            />
            <input
              type="number"
              value={medicine.dosage.e}
              onChange={(e) => handleDosageChange('e', e.target.value)}
              className="dosage-input dosage-matrix-input"
              min="0"
            />
            <input
              type="number"
              value={medicine.dosage.n2}
              onChange={(e) => handleDosageChange('n2', e.target.value)}
              className="dosage-input dosage-matrix-input"
              min="0"
            />
          </div>
        </div>
      </td>
      <td>
        {isInjection ? (
          <span>-</span>
        ) : (
          <select
            value={medicine.foodIntake}
            onChange={(e) => handleInputChange('foodIntake', e.target.value)}
            className="food-intake-select"
          >
            <option value="after">After</option>
            <option value="before">Before</option>
          </select>
        )}
      </td>
      <td>
        {isInjection ? (
          <span>-</span>
        ) : (
          <div className="duration-input-group">
            <input
              type="number"
              value={medicine.duration}
              onChange={(e) => handleInputChange('duration', e.target.value)}
              className="duration-input"
              min="0"
            />
            <select
              value={medicine.durationType}
              onChange={(e) => handleInputChange('durationType', e.target.value)}
              className="duration-select"
            >
              <option value="days">days</option>
              <option value="weeks">weeks</option>
              <option value="months">months</option>
            </select>
          </div>
        )}
      </td>
      <td className="as-needed-cell">
        <input
          type="checkbox"
          checked={medicine.asNeeded}
          onChange={(e) => handleInputChange('asNeeded', e.target.checked)}
          className="as-needed-checkbox"
        />
      </td>
      <td className="remove-cell">
        <button type="button" onClick={() => removeMedicine(medicine.id)} className="remove-btn" title="Remove medicine">✕</button>
      </td>
    </tr>
  );
};

export default Prescription;
