// Test API response format
const testApiResponse = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/patient-details/by-patient-id/C1026');
    const data = await response.json();
    
    console.log('=== API RESPONSE ===');
    console.log('Success:', data.success);
    console.log('Patient ID:', data.patient?.patientId || data.data?.patientId);
    console.log('First Name:', data.patient?.personalInfo?.firstName || data.data?.personalInfo?.firstName);
    console.log('Address:', data.patient?.personalInfo?.address || data.data?.personalInfo?.address);
    console.log('Institution Name:', data.patient?.institutionInfo?.institutionName || data.data?.institutionInfo?.institutionName);
    
    console.log('\n=== FULL RESPONSE ===');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testApiResponse();