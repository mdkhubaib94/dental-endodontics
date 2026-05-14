import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="login">
      <div className="overlay1"></div>

      <div className="logincontainer">
        <div className="logo-box-user">
          <img src="/images/logo.png" alt="Clinic Logo" className="logo-img-user" />
        </div>

        <h1 style={{ color: 'white' }}>SRM DENTAL COLLEGE</h1>

        <p className="address">
          BHARATHI SALAI, RAMAPURAM, CHENNAI - 600 089<br />
          Ph.No: 044 2249 0526
        </p>

        <div className="btn-group">
          <div className="btn" onClick={() => navigate('/login/patientlogin')}>
            <img src="/images/patient.png" alt="Patient" />
            <div className="btn-label">Patient</div>
          </div>

          <div className="btn" onClick={() => navigate('/login/doctorlogin')}>
            <img src="/images/doctor.png" alt="Doctor" />
            <div className="btn-label">Doctor</div>
          </div>

          <div className="btn" onClick={() => navigate('/login/adminlogin')}>
            <img src="/images/admin.png" alt="Admin" />
            <div className="btn-label">Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
 