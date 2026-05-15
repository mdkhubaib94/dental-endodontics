// server/middleware/role.js
const normalizeRole = (role) => {
  if (!role) return '';
  return String(role).trim().toLowerCase().replace(/[_\s]+/g, '-');
};

const expandAllowedRoles = (roles) => {
  const list = Array.isArray(roles) ? roles : [roles];
  const expanded = new Set();

  for (const role of list) {
    const normalized = normalizeRole(role);
    if (!normalized) continue;

    expanded.add(normalized);

    // Backward-compatible aliases used across routes and user documents.
    if (normalized === 'chief') expanded.add('chief-doctor');
    if (normalized === 'chief-doctor') expanded.add('chief');

    // Admin-portal role aliases: phc1 and phc2 are treated as admin for route access
    if (normalized === 'admin') {
      expanded.add('phc1');
      expanded.add('phc2');
    }
    if (normalized === 'phc1' || normalized === 'phc2') {
      expanded.add('admin');
    }
  }

  return expanded;
};

const requireRole = (roles) => {
  const allowedRoles = expandAllowedRoles(roles);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = normalizeRole(req.user.role);
    if (!allowedRoles.has(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

export default requireRole;