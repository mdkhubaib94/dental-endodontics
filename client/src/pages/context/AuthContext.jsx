// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredPatientId, setStoredPatientId } from '../../utils/patientIdentity';

const AuthContext = createContext();

const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
const canonicalRole = (value) => {
  const normalized = normalizeRole(value);
  if (normalized === 'chief') return 'chief-doctor';
  return normalized;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = canonicalRole(localStorage.getItem('role'));
    const patientName = localStorage.getItem('patientName');
    const patientId = getStoredPatientId();
    const doctorName = localStorage.getItem('doctorName');
    const doctorId = localStorage.getItem('doctorId');
    const doctorEmail = localStorage.getItem('doctorEmail');
    const doctorDepartment = localStorage.getItem('doctorDepartment');
    const chiefdoctorName = localStorage.getItem('doctorName');
    const chiefdoctorId = localStorage.getItem('doctorId');
    const adminName = localStorage.getItem('adminName');
    const adminId = localStorage.getItem('adminId');
    const pgName = localStorage.getItem('pgName');
    const pgId = localStorage.getItem('pgId');
    const pgEmail = localStorage.getItem('pgEmail');
    const pgDepartment = localStorage.getItem('pgDepartment');

    const ugName = localStorage.getItem('ugName');
    const ugId = localStorage.getItem('ugId');
    const ugEmail = localStorage.getItem('ugEmail');
    const ugDepartment = localStorage.getItem('ugDepartment');

    if (token) {
      // Determine user type based on stored data
      if (storedRole === 'chief-doctor' && doctorId && doctorName) {
        setUser({
          id: doctorId,
          name: doctorName,
          email: doctorEmail || '',
          department: doctorDepartment || '',
          role: 'chief-doctor',
          token: token
        });
      } else if (storedRole === 'pg' && pgId && pgName) {
        setUser({
          id: pgId,
          name: pgName,
          email: pgEmail || '',
          department: pgDepartment || doctorDepartment || '',
          role: 'pg',
          token: token
        });
      } else if (storedRole === 'ug' && ugId && ugName) {
        setUser({
          id: ugId,
          name: ugName,
          email: ugEmail || '',
          department: ugDepartment || '',
          role: 'ug',
          token: token
        });
      } else if (patientId && patientName) {
        setUser({
          id: patientId,
          name: patientName,
          role: 'patient',
          token: token
        });
      } else if (doctorId && doctorName) {
        setUser({
          id: doctorId,
          name: doctorName,
          email: doctorEmail || '',
          department: doctorDepartment || '',
          role: 'doctor',
          token: token
        });
      } else if (adminId && adminName) {
        setUser({
          id: adminId,
          name: adminName,
          role: 'admin',
          token: token
        });
      } else if (storedRole) {
        // Fallback for partially cleared localStorage: keep session role so protected
        // routes do not fail with false unauthorized until token validation occurs.
        setUser({
          id: pgId || doctorId || adminId || patientId || '',
          name: pgName || doctorName || adminName || patientName || '',
          email: pgEmail || doctorEmail || '',
          department: pgDepartment || doctorDepartment || '',
          role: storedRole,
          token: token
        });
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    const { token, name, Identity, role, email, department } = userData;
    const normalizedRole = canonicalRole(role);
    
    // Store in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('role', normalizedRole);
    
    if (normalizedRole === 'chief-doctor') {
      localStorage.setItem('doctorName', name);
      localStorage.setItem('doctorId', Identity);
      if (email) localStorage.setItem('doctorEmail', email);
      localStorage.setItem('doctorDepartment', department || '');
      setUser({
        id: Identity,
        name: name,
        email: email || '',
        department: department || '',
        role: 'chief-doctor',
        token: token
      });
    } else if (normalizedRole === 'patient') {
      localStorage.setItem('patientName', name);
      setStoredPatientId(Identity);
      setUser({
        id: Identity,
        name: name,
        role: 'patient',
        token: token
      });
    } else if (normalizedRole === 'doctor') {
      localStorage.setItem('doctorName', name);
      localStorage.setItem('doctorId', Identity);
      if (email) localStorage.setItem('doctorEmail', email);
      localStorage.setItem('doctorDepartment', department || '');
      setUser({
        id: Identity,
        name: name,
        email: email || '',
        department: department || '',
        role: 'doctor',
        token: token
      });
    } else if (normalizedRole === 'admin') {
      localStorage.setItem('adminName', name);
      localStorage.setItem('adminId', Identity);
      setUser({
        id: Identity,
        name: name,
        role: 'admin',
        token: token
      });
    } else if (normalizedRole === 'pg') {
      localStorage.setItem('pgName', name);
      localStorage.setItem('pgId', Identity);
      if (email) localStorage.setItem('pgEmail', email);
      localStorage.setItem('pgDepartment', department || '');
      localStorage.setItem('doctorName', name);
      localStorage.setItem('doctorId', Identity);
      if (email) localStorage.setItem('doctorEmail', email);
      localStorage.setItem('doctorDepartment', department || '');
      setUser({
        id: Identity,
        name: name,
        email: email || '',
        department: department || '',
        role: 'pg',
        token: token
      });
    } else if (normalizedRole === 'ug') {
      localStorage.setItem('ugName', name);
      localStorage.setItem('ugId', Identity);
      if (email) localStorage.setItem('ugEmail', email);
      localStorage.setItem('ugDepartment', department || '');
      setUser({
        id: Identity,
        name: name,
        email: email || '',
        department: department || '',
        role: 'ug',
        token: token
      });
    }
  };

  const logout = () => {
    // Clear all stored data
    localStorage.removeItem('token');
    localStorage.removeItem('patientName');
    localStorage.removeItem('patientId');
    localStorage.removeItem('CurrentpatientId');
    localStorage.removeItem('currentPatientId');
    localStorage.removeItem('doctorName');
    localStorage.removeItem('doctorId');
    localStorage.removeItem('doctorEmail');
    localStorage.removeItem('doctorDepartment');
    localStorage.removeItem('adminName');
    localStorage.removeItem('adminId');
    localStorage.removeItem('pgName');
    localStorage.removeItem('pgId');
    localStorage.removeItem('pgEmail');
    localStorage.removeItem('pgDepartment');
    localStorage.removeItem('ugName');
    localStorage.removeItem('ugId');
    localStorage.removeItem('ugEmail');
    localStorage.removeItem('ugDepartment');
    localStorage.removeItem('role');
    
    // Reset state
    setUser(null);
    
    // Redirect to home page
    window.location.href = '/';
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
