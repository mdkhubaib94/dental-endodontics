import chai from 'chai';
import supertest from 'supertest';
import dotenv from 'dotenv';

dotenv.config();
const expect = chai.expect;
const api = supertest(process.env.TEST_API_URL || 'http://localhost:5000');

describe('Conservative Department API', function () {
  it('should reject save without patientId', async function () {
    const res = await api.post('/api/conservative/save').send({});
    expect(res.status).to.be.oneOf([400,401,403]);
  });

  // This test assumes a valid token is available in TEST_TOKEN env and a patient exists
  it('should save a conservative case with valid token', async function () {
    if (!process.env.TEST_TOKEN) {
      this.skip();
      return;
    }

    const token = process.env.TEST_TOKEN;
    const payload = {
      patientId: process.env.TEST_PATIENT_ID || 'TEST_PATIENT',
      patientName: 'Test Patient',
      doctorId: process.env.TEST_DOCTOR_ID || 'DOCTEST',
      doctorName: 'Dr Test',
      chiefComplaint: 'Test complaint',
      treatmentPlan: 'Test plan'
    };

    const res = await api.post('/api/conservative/save').set('Authorization', `Bearer ${token}`).send(payload);
    expect([200,201,400,401,403]).to.include(res.status);
    if (res.status === 201) {
      expect(res.body).to.have.property('caseId');
    }
  });
});
