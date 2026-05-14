// server/middleware/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '');

const doctorDepartmentCaseApiPrefixes = {
  pedodontics: ['/api/pedodontics'],
  prosthodontics: ['/api/complete-denture', '/api/fpd', '/api/implant', '/api/implantpatient', '/api/partial'],
  prothodontics: ['/api/complete-denture', '/api/fpd', '/api/implant', '/api/implantpatient', '/api/partial'],
  prosthondontics: ['/api/complete-denture', '/api/fpd', '/api/implant', '/api/implantpatient', '/api/partial'],
  completedenture: ['/api/complete-denture'],
  fpd: ['/api/fpd'],
  fixedpartialdenture: ['/api/fpd'],
  implantology: ['/api/implant', '/api/implantpatient'],
  implant: ['/api/implant'],
  implantpatient: ['/api/implantpatient'],
  partial: ['/api/partial'],
  partialdenture: ['/api/partial'],
  general: [],
  generaldentistry: []
};

const allRestrictedDoctorCasePrefixes = Array.from(
  new Set(Object.values(doctorDepartmentCaseApiPrefixes).flat().filter(Boolean))
);

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    console.log('Auth middleware - incoming token header:', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    const user = await User.findOne({ 
      _id: decoded.userId 
    }).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Token invalid' 
      });
    }

    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole === 'doctor' || normalizedRole === 'pg') {
      const requestPath = String(req.originalUrl || req.url || '').split('?')[0].toLowerCase();
      const isRestrictedCaseApi = allRestrictedDoctorCasePrefixes.some((prefix) => requestPath.startsWith(prefix));

      if (isRestrictedCaseApi) {
        const normalizedDepartment = normalizeDepartment(user.department);
        const allowedPrefixes = doctorDepartmentCaseApiPrefixes[normalizedDepartment] || [];
        const isAllowed = allowedPrefixes.some((prefix) => requestPath.startsWith(prefix));

        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: 'Access denied for this department'
          });
        }
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.name, error.message);
    // Provide more specific feedback for common JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    return res.status(401).json({ success: false, message: 'Authentication failed', error: error.message });
  }
};

export default auth;