// Simple test to check patient creation API
const testPatientCreation = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/patient-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientId: 'C1001',
        personalInfo: {
          firstName: 'Test Student',
          phone: '9876543210'
        },
        status: 'active',
        walkIn: true,
        createAccount: true
      })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.error('API Error:', result.message);
    } else {
      console.log('Success! Patient created:', result.patient?.patientId);
    }
  } catch (error) {
    console.error('Network error:', error.message);
  }
};

testPatientCreation();