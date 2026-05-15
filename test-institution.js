// Test creating patient with institution info
import fetch from 'node-fetch';

const testPatient = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/patient-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: 'C1010',
        personalInfo: {
          firstName: 'Test Student With Institution',
          phone: '9876543210'
        },
        institutionInfo: {
          institutionName: 'Test School',
          institutionAddress: '123 Test Street',
          campDate: '2024-12-15'
        },
        status: 'active',
        walkIn: true,
        createAccount: true
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Patient created successfully!');
      console.log('Institution Name:', result.patient?.institutionInfo?.institutionName);
    } else {
      console.log('\n❌ Failed:', result.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testPatient();