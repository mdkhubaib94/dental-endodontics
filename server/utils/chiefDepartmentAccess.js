const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '');

export const isChiefRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'chief' || normalizedRole === 'chief-doctor';
};

export const hasChiefDepartmentAccess = (user, allowedDepartments = []) => {
  if (!isChiefRole(user?.role)) return true;

  const chiefDepartment = normalizeDepartment(user?.department);
  if (!chiefDepartment) return false;

  const allowed = new Set((Array.isArray(allowedDepartments) ? allowedDepartments : [])
    .map((dept) => normalizeDepartment(dept))
    .filter(Boolean));

  return allowed.has(chiefDepartment);
};

export const chiefDepartmentAccessDenied = (res) => {
  return res.status(403).json({
    success: false,
    message: 'Access denied for this department'
  });
};
