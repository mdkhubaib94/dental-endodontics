import React from 'react';
import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';

const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '');
const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');

const getDashboardRouteByRole = (role) => {
  const normalized = normalizeRole(role);
  if (normalized === 'patient') return '/patient-dashboard';
  if (normalized === 'doctor') return '/doctor-dashboard';
  if (normalized === 'pg') return '/pg-dashboard';
  if (normalized === 'ug') return '/ug-dashboard';
  if (normalized === 'chief' || normalized === 'chief-doctor') return '/chief-doctor-dashboard';
  if (normalized === 'admin') return '/admin-dashboard';
  return '/';
};

const expandAllowedRoles = (roles = []) => {
  const expanded = new Set();

  (Array.isArray(roles) ? roles : [roles]).forEach((role) => {
    const normalized = normalizeRole(role);
    if (!normalized) return;

    expanded.add(normalized);
    if (normalized === 'chief') expanded.add('chief-doctor');
    if (normalized === 'chief-doctor') expanded.add('chief');
  });

  return expanded;
};

const ProtectedRoute = ({ children, allowedRoles = [], allowedDepartments = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; 
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const fallbackRoute = getDashboardRouteByRole(user?.role);

  const userRole = normalizeRole(user.role);
  const allowedRoleSet = expandAllowedRoles(allowedRoles);

  if (allowedRoleSet.size > 0 && !allowedRoleSet.has(userRole)) {
    return <Navigate to={fallbackRoute} replace />;
  }

  if (allowedDepartments.length > 0 && (userRole === 'doctor' || userRole === 'pg' || userRole === 'ug')) {
    const userDepartment = normalizeDepartment(
      user.department ||
      localStorage.getItem('doctorDepartment') ||
      localStorage.getItem('pgDepartment') ||
      localStorage.getItem('ugDepartment')
    );
    const allowed = allowedDepartments.map((dept) => normalizeDepartment(dept));
    if (!allowed.includes(userDepartment)) {
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;