import React, { useEffect } from 'react';
import DoctorDashboard from './DoctorDashboard';

// Minimal wrapper for the Endodontics department. It only sets the
// department context and renders the canonical DoctorDashboard with
// a departmentOverride prop so the UI behaves as Endodontics.
const EndodonticsDoctorDashboard = () => {
  useEffect(() => {
    try {
      localStorage.setItem('doctorDepartment', 'Conservative Dentistry and Endodontics');
    } catch (e) {
      // ignore localStorage failures in restricted environments
    }
  }, []);

  return <DoctorDashboard departmentOverride="Conservative Dentistry and Endodontics" />;
};

export default EndodonticsDoctorDashboard;
