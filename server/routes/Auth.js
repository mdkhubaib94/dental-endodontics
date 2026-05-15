// server/routes/Auth.js
import { User } from '../models/User.js';
import generateNextPatientId from '../utils/patientIdGenerator.js';
import generateRandomPassword from '../utils/passwordGenerator.js';
import { hash, compare } from 'bcryptjs';
import pkg from 'jsonwebtoken';
const { sign } = pkg;
import dotenv from 'dotenv';
import express,{ Router,json } from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';

dotenv.config();
const router = Router();

const findUserByIdentifier = async (identifier) => {
  const normalizedIdentifier = String(identifier || '').trim();
  const escapedIdentifier = normalizedIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return User.findOne({
    $or: [
      { email: { $regex: new RegExp("^" + escapedIdentifier + "$", "i") } },
      { Identity: { $regex: new RegExp(`^${escapedIdentifier}$`, 'i') } },
    ],
  });
};

const normalizeRoleName = (role) => {
  if (!role) return '';
  return String(role).trim().toLowerCase().replace(/[_\s]+/g, '-');
};

const normalizeDepartmentName = (department) => {
  if (!department) return '';
  return String(department).trim().toLowerCase().replace(/[_\s]+/g, '');
};

const normalizePhoneNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';

  // Convert common Indian country-code format (91XXXXXXXXXX) to 10-digit mobile.
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  return digits;
};

const buildLoosePhoneRegex = (phoneDigits) => {
  if (!phoneDigits) return null;

  const digitPattern = phoneDigits.split('').join('\\D*');
  // Accept optional +91/91 prefix and separators.
  return new RegExp(`^(?:\\+?91\\D*)?${digitPattern}\\D*$`);
};

const sanitizeDoctorProfileResponse = (user) => ({
  name: String(user?.name || '').trim(),
  email: String(user?.email || '').trim(),
  phone: String(user?.phone || '').trim(),
  department: String(user?.department || '').trim(),
  specialization: String(user?.specialization || '').trim(),
  role: normalizeRoleName(user?.role),
  Identity: String(user?.Identity || '').trim(),
});


// ➤ Route: POST /signup
router.post('/signup', async (req, res) => {
  const { name, phone, email, password, role, Identity } = req.body;

  try {
    const normalizedRole = normalizeRoleName(role);
    if (normalizedRole !== 'patient') {
      return res.status(403).json({
        message: 'Public signup is available for patients only.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'User with this email already exists' });

    // Hash password
    const hashedPassword = await hash(password, 10);
    let finalIdentity = Identity; // doctor/admin keep manual ID

    if (normalizedRole === 'patient') {
      // Use shared generator so signup & admin registration share the same sequence
      finalIdentity = await generateNextPatientId();
    }


const newUser = new User({
  name,
  phone: normalizePhoneNumber(phone),
  email,
  password: hashedPassword,
  role: normalizedRole,
  Identity: finalIdentity,
});

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', Identity: newUser.Identity });
    
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

router.post('/login/patientlogin', async (req, res) => {
  const { identifier, password } = req.body;
  const normalizedIdentifier = String(identifier || '').trim();
  const normalizedPhone = normalizePhoneNumber(normalizedIdentifier);
  const loosePhoneRegex = buildLoosePhoneRegex(normalizedPhone);
  console.log("➡️ Login attempt with identifier:", normalizedIdentifier);

  try {
    let user = await User.findOne({
      $or: [
        { Identity: { $regex: new RegExp("^" + escapedIdentifier + "$", "i") } },
        { phone: normalizedIdentifier }
      ]
    });

    if (!user && loosePhoneRegex) {
      user = await User.findOne({
        phone: { $regex: loosePhoneRegex }
      });
    }

    console.log("🔍 Found user:", user);

    if (!user) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // check password
    const storedPassword = typeof user.password === 'string' ? user.password : '';
    let isMatch = false;
    if (storedPassword) {
      isMatch = await compare(password, storedPassword);
    }

    // Migrate plain-text stored password to bcrypt hash
    if (!isMatch && storedPassword && storedPassword === password) {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    // Allow '123456' as default for accounts with no password set
    if (!isMatch && !storedPassword && password === '123456') {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Login successful',
      token,
      role: user.role,
      name: user.name,
      Identity: user.Identity
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/email-retrieve/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;

    // Find user by Identity (patientId from URL)
    const user = await User.findOne({ Identity: patientId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.status(200).json({
      success: true,
      email: user.email,
      phone: user.phone,
      name: user.name,
      Identity: user.Identity,
    });
  } catch (error) {
    console.error('Error fetching patient email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient information',
    });
  }
});

// Fetch basic signup details (name, email, phone) by patient ID
router.get('/patient-basic-details/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const user = await User.findOne({ Identity: patientId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    return res.status(200).json({
      success: true,
      name: user.name,
      email: user.email,
      phone: user.phone,
      Identity: user.Identity,
    });
  } catch (error) {
    console.error('Error fetching basic patient signup details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch patient signup details',
    });
  }
});

router.post('/login/doctorlogin', async (req, res) => {
  const { identifier, password } = req.body;

  if (!String(identifier || '').trim() || !String(password || '').trim()) {
    return res.status(400).json({ message: 'Identifier and password are required.' });
  }

  try {
    const user = await findUserByIdentifier(identifier);
    if (!user)
      return res.status(404).json({ message: 'User not found' });

      // Verify role = doctor/chief/pg/ug (case-insensitive to support legacy records)
      const normalizedRole = String(user.role || '').trim().toLowerCase();
      const allowedDoctorPortalRoles = new Set(['doctor', 'chief', 'chief-doctor', 'pg', 'ug']);
      if (!allowedDoctorPortalRoles.has(normalizedRole)) {
        return res.status(403).json({ message: 'Access denied. Not a doctor/PG/UG account.' });
      }

    // Check password
    let isMatch = false;
    const storedPassword = typeof user.password === 'string' ? user.password : '';
    try {
      isMatch = await compare(password, storedPassword);
    } catch {
      isMatch = false;
    }

    // Legacy compatibility: support old plaintext records, then migrate them to bcrypt
    // on successful login.
    if (!isMatch && storedPassword && storedPassword === password) {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    // Very old records may have an empty password field; allow initial default password
    // only when no password is currently set.
    if (!isMatch && !storedPassword && password === '123456') {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password' });

    // Generate JWT
    const token = sign(
      { userId: user._id, role: normalizedRole },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Login successful',
      token,
      role: normalizedRole,
      name: user.name,
      Identity: user.Identity,
      email: user.email,
      department: user.department || ''
    });
  } catch (err) {
    console.error('Doctor Login Error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/doctor/profile', auth, requireRole(['doctor', 'chief', 'chief-doctor', 'pg']), async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).lean();
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      profile: sanitizeDoctorProfileResponse(currentUser),
    });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

const updateDoctorProfile = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const department = String(req.body?.department || '').trim();
    const specialization = String(req.body?.specialization || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      const existingByEmail = await User.findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        _id: { $ne: req.user._id },
      }).lean();

      if (existingByEmail) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          name,
          email,
          phone,
          department,
          specialization,
        },
      },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: sanitizeDoctorProfileResponse(updatedUser),
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

router.put('/doctor/profile', auth, requireRole(['doctor', 'chief', 'chief-doctor', 'pg']), updateDoctorProfile);
router.patch('/doctor/profile', auth, requireRole(['doctor', 'chief', 'chief-doctor', 'pg']), updateDoctorProfile);

router.get('/me/contact', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).lean();
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      contact: {
        email: String(currentUser.email || '').trim(),
        phone: String(currentUser.phone || '').trim(),
        name: String(currentUser.name || '').trim(),
        role: normalizeRoleName(currentUser.role),
        Identity: String(currentUser.Identity || '').trim(),
      },
    });
  } catch (error) {
    console.error('Error fetching current user contact:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user contact' });
  }
});

// routes/auth.js - Admin Login Route
router.post('/login/adminlogin', async (req, res) => {
  const { identifier, password } = req.body;

  if (!String(identifier || '').trim() || !String(password || '').trim()) {
    return res.status(400).json({ message: 'Identifier and password are required.' });
  }

  try {
    const user = await findUserByIdentifier(identifier);
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    const normalizedRole = String(user.role || '').trim().toLowerCase();
    // Allowed admin-portal roles: admin, phc1, phc2, c (camp)
    const adminPortalRoles = new Set(['admin', 'phc1', 'phc2', 'c']);
    if (!adminPortalRoles.has(normalizedRole)) {
      return res.status(403).json({ message: 'Access denied. Not an administrator.' });
    }

    // Check password
    let isMatch = false;
    const storedPassword = typeof user.password === 'string' ? user.password : '';
    try {
      isMatch = await compare(password, storedPassword);
    } catch {
      isMatch = false;
    }

    // Legacy compatibility: support old plaintext admin records,
    // then migrate them to a bcrypt hash on successful login.
    if (!isMatch && storedPassword && storedPassword === password) {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    // Very old records may have an empty password field; allow initial default password
    // only when no password is currently set.
    if (!isMatch && !storedPassword && password === '123456') {
      user.password = await hash(password, 10);
      await user.save();
      isMatch = true;
    }

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password' });

    // Generate JWT
    const token = sign(
      { userId: user._id, role: normalizedRole },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Login successful',
      token,
      role: normalizedRole,
      name: user.name,
      Identity: user.Identity,
      email: user.email
    });
  } catch (err) {
    console.error('Admin Login Error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Password reset route
// Check if user exists
router.post('/check-user', async (req, res) => {
  const { email, phone } = req.body;
  
  try {
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    }
    
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Check user error:', err);
    res.status(500).json({ message: 'Server error checking user' });
  }
});

// Password reset route
router.post('/reset-password', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    console.log('🔄 Password reset request:', { email, phone, hasPassword: !!password });

    // Validate required fields
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone is required'
      });
    }

    // Find user by email or phone
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash the new password
    const hashedPassword = await hash(password, 10);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password reset successful for:', email || phone);

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (err) {
    console.error('❌ Reset Password Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// ➤ Route: POST /auth/create-doctor (Chief Doctor assigns a new doctor)
router.post('/create-doctor', auth, requireRole(['chief', 'chief-doctor']), async (req, res) => {
  const { staffId, doctorName, doctorEmail, doctorPhone, department, specialization } = req.body;

  try {
    const requesterDepartment = String(req.user?.department || '').trim();
    const normalizedRequesterDepartment = normalizeDepartmentName(requesterDepartment);
    const normalizedRequestedDepartment = normalizeDepartmentName(department);

    // Validate required fields
    if (!staffId || !doctorName || !doctorEmail || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staffId, doctorName, doctorEmail, department'
      });
    }

    // Check if staff ID already exists
    const existingStaff = await User.findOne({ staffId });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: 'Staff ID already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: doctorEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const normalizedRequesterRole = normalizeRoleName(req.user.role);
    if (normalizedRequesterRole !== 'chief-doctor' && normalizedRequesterRole !== 'chief') {
      return res.status(403).json({
        success: false,
        message: 'Invalid chief doctor. Only chief doctors can create new doctors.'
      });
    }

    if (!normalizedRequesterDepartment) {
      return res.status(403).json({
        success: false,
        message: 'Your chief doctor account does not have a department assigned.'
      });
    }

    if (normalizedRequestedDepartment !== normalizedRequesterDepartment) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign doctors in your own department.'
      });
    }

    // Generate a random password
    const generatedPassword = generateRandomPassword(staffId);
    const hashedPassword = await hash(generatedPassword, 10);

    // Create new doctor user
    const newDoctor = new User({
      name: doctorName,
      email: doctorEmail,
      phone: doctorPhone || '',
      password: hashedPassword,
      role: 'doctor',
      Identity: staffId, // Using staffId as Identity for doctors
      department: requesterDepartment,
      specialization: String(specialization || '').trim() || null,
      staffId: staffId,
      createdBy: req.user._id
    });

    await newDoctor.save();

    res.status(201).json({
      success: true,
      message: 'Doctor account created successfully',
      doctor: {
        _id: newDoctor._id,
        name: newDoctor.name,
        email: newDoctor.email,
        phone: newDoctor.phone,
        staffId: newDoctor.staffId,
        department: newDoctor.department,
        specialization: newDoctor.specialization,
        role: newDoctor.role,
        generatedPassword: generatedPassword // Send password to chief doctor to share with new doctor
      }
    });

  } catch (err) {
    console.error('❌ Create Doctor Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating doctor account'
    });
  }
});

// ➤ Route: POST /auth/create-pg (Doctor assigns a new PG student)
router.post('/create-pg', auth, requireRole(['doctor']), async (req, res) => {
  const { staffId, pgName, pgEmail, pgPhone, department, specialization } = req.body;

  console.log('📝 Create PG Request:', { staffId, pgName, pgEmail, department, doctorId: req.user?._id });

  try {
    // Validate required fields
    if (!staffId || !pgName || !pgEmail || !department) {
      console.log('❌ Missing fields:', { staffId, pgName, pgEmail, department });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staffId, pgName, pgEmail, department'
      });
    }

    // Check if staff ID already exists
    const existingStaff = await User.findOne({ staffId });
    if (existingStaff) {
      console.log('❌ Staff ID already exists:', staffId);
      return res.status(409).json({
        success: false,
        message: 'Staff ID already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: pgEmail });
    if (existingEmail) {
      console.log('❌ Email already registered:', pgEmail);
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const supervisor = await User.findById(req.user._id);

    console.log('👨‍⚕️ Doctor found:', supervisor ? supervisor.name : 'NOT FOUND');

    if (!supervisor || normalizeRoleName(supervisor.role) !== 'doctor') {
      console.log('❌ Doctor not found for authenticated user:', req.user?._id);
      return res.status(403).json({
        success: false,
        message: 'Invalid doctor. Only doctors can create new PG students.'
      });
    }

    // Generate a random password
    const generatedPassword = generateRandomPassword(staffId);
    const hashedPassword = await hash(generatedPassword, 10);

    // Create new PG user
    const newPG = new User({
      name: pgName,
      email: pgEmail,
      phone: pgPhone || '',
      password: hashedPassword,
      role: 'pg',
      Identity: staffId, // Using staffId as Identity for PGs
      department: department,
      specialization: String(specialization || '').trim() || null,
      staffId: staffId,
      createdBy: supervisor._id,
      supervisingDoctor: supervisor._id
    });

    await newPG.save();

    console.log('✅ PG created successfully:', newPG.name);

    res.status(201).json({
      success: true,
      message: 'PG account created successfully',
      pg: {
        _id: newPG._id,
        name: newPG.name,
        email: newPG.email,
        phone: newPG.phone,
        staffId: newPG.staffId,
        department: newPG.department,
        specialization: newPG.specialization,
        role: newPG.role,
        generatedPassword: generatedPassword // Send password to doctor to share with PG
      }
    });

  } catch (err) {
    console.error('❌ Create PG Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating PG account: ' + err.message
    });
  }
});

// ➤ Route: POST /auth/create-ug (Doctor assigns a new UG student)
router.post('/create-ug', auth, requireRole(['doctor']), async (req, res) => {
  const { staffId, ugName, ugEmail, ugPhone, department, specialization } = req.body;

  console.log('📝 Create UG Request:', { staffId, ugName, ugEmail, department, doctorId: req.user?._id });

  try {
    if (!staffId || !ugName || !ugEmail || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staffId, ugName, ugEmail, department'
      });
    }

    const existingStaff = await User.findOne({ staffId });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: 'Staff ID already exists'
      });
    }

    const existingEmail = await User.findOne({ email: ugEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const supervisor = await User.findById(req.user._id);
    if (!supervisor || normalizeRoleName(supervisor.role) !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Invalid doctor. Only doctors can create new UG students.'
      });
    }

    const generatedPassword = generateRandomPassword(staffId);
    const hashedPassword = await hash(generatedPassword, 10);

    const newUG = new User({
      name: ugName,
      email: ugEmail,
      phone: ugPhone || '',
      password: hashedPassword,
      role: 'ug',
      Identity: staffId,
      department: department,
      specialization: String(specialization || '').trim() || null,
      staffId: staffId,
      createdBy: supervisor._id,
    });

    await newUG.save();

    return res.status(201).json({
      success: true,
      message: 'UG account created successfully',
      ug: {
        _id: newUG._id,
        name: newUG.name,
        email: newUG.email,
        phone: newUG.phone,
        staffId: newUG.staffId,
        department: newUG.department,
        specialization: newUG.specialization,
        role: newUG.role,
        generatedPassword,
      },
    });
  } catch (err) {
    console.error('❌ Create UG Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating UG account: ' + err.message,
    });
  }
});

// Get doctors assigned by the logged-in chief doctor
router.get('/chief/assigned-doctors', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const requesterDepartment = String(req.user?.department || '').trim();
    const doctors = await User.find(
      {
        role: 'doctor',
        createdBy: req.user._id,
        ...(requesterDepartment ? { department: requesterDepartment } : {}),
      },
      { _id: 1, name: 1, email: 1, phone: 1, Identity: 1, staffId: 1, department: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, doctors });
  } catch (err) {
    console.error('Error fetching assigned doctors:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned doctors' });
  }
});

// List available chief doctors for reassignment
router.get('/chief/chief-doctors', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const requesterDepartment = String(req.user?.department || '').trim();
    const chiefDoctors = await User.find(
      {
        role: { $in: ['chief-doctor', 'chief'] },
        _id: { $ne: req.user._id },
        ...(requesterDepartment ? { department: requesterDepartment } : {}),
      },
      { _id: 1, name: 1, Identity: 1, email: 1, department: 1 }
    )
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, chiefDoctors });
  } catch (err) {
    console.error('Error fetching chief doctors:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chief doctors' });
  }
});

// Reassign a doctor from current chief to another chief doctor
router.patch('/chief/assigned-doctors/:doctorId/reassign', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { newChiefIdentity } = req.body;

    if (!newChiefIdentity) {
      return res.status(400).json({ success: false, message: 'newChiefIdentity is required' });
    }

    const targetChief = await User.findOne({
      Identity: newChiefIdentity,
      role: { $in: ['chief-doctor', 'chief'] },
    });

    if (!targetChief) {
      return res.status(404).json({ success: false, message: 'Target chief doctor not found' });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      createdBy: req.user._id,
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found under your assignment list' });
    }

    if (normalizeDepartmentName(doctor.department) !== normalizeDepartmentName(req.user?.department)) {
      return res.status(403).json({ success: false, message: 'You can only reassign doctors from your own department.' });
    }

    if (normalizeDepartmentName(targetChief.department) !== normalizeDepartmentName(req.user?.department)) {
      return res.status(403).json({ success: false, message: 'Doctors can only be reassigned to a chief doctor in the same department.' });
    }

    doctor.createdBy = targetChief._id;
    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor reassigned successfully',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        Identity: doctor.Identity,
        department: doctor.department,
      },
      reassignedTo: {
        _id: targetChief._id,
        name: targetChief.name,
        Identity: targetChief.Identity,
      },
    });
  } catch (err) {
    console.error('Error reassigning doctor:', err);
    res.status(500).json({ success: false, message: 'Failed to reassign doctor' });
  }
});

// Remove current chief as owner of an assigned doctor
router.patch('/chief/assigned-doctors/:doctorId/unassign', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      createdBy: req.user._id,
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found under your assignment list' });
    }

    if (normalizeDepartmentName(doctor.department) !== normalizeDepartmentName(req.user?.department)) {
      return res.status(403).json({ success: false, message: 'You can only unassign doctors from your own department.' });
    }

    doctor.createdBy = null;
    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor removed from your assigned list',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        Identity: doctor.Identity,
        department: doctor.department,
      },
    });
  } catch (err) {
    console.error('Error unassigning doctor:', err);
    res.status(500).json({ success: false, message: 'Failed to unassign doctor' });
  }
});

/* ================= DOCTOR - ASSIGNED UGs ROUTES ================= */

// Get all UGs assigned by this doctor
router.get('/doctor/assigned-ugs', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const ugs = await User.find(
      { role: 'ug', createdBy: req.user._id },
      { _id: 1, name: 1, email: 1, phone: 1, Identity: 1, staffId: 1, department: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, ugs });
  } catch (err) {
    console.error('Error fetching assigned UGs:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch assigned UGs' });
  }
});

// Update a UG's basic details (doctor can update only their own created UGs)
router.patch('/doctor/assigned-ugs/:ugId/update', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { ugId } = req.params;
    const { name, email, phone, department } = req.body || {};

    const ug = await User.findOne({
      _id: ugId,
      role: 'ug',
      createdBy: req.user._id,
    });

    if (!ug) {
      return res.status(404).json({ success: false, message: 'UG not found under your assignment list' });
    }

    if (email !== undefined && String(email).trim()) {
      const existing = await User.findOne({
        email: String(email).trim(),
        _id: { $ne: ug._id },
      }).lean();

      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
    }

    if (name !== undefined) ug.name = String(name).trim();
    if (email !== undefined) ug.email = String(email).trim();
    if (phone !== undefined) ug.phone = String(phone).trim();
    if (department !== undefined) ug.department = String(department).trim();

    await ug.save();

    return res.json({
      success: true,
      message: 'UG updated successfully',
      ug: {
        _id: ug._id,
        name: ug.name,
        email: ug.email,
        phone: ug.phone,
        Identity: ug.Identity,
        department: ug.department,
      },
    });
  } catch (err) {
    console.error('Error updating UG:', err);
    return res.status(500).json({ success: false, message: 'Failed to update UG' });
  }
});

// Remove a UG from doctor's assigned list
router.patch('/doctor/assigned-ugs/:ugId/unassign', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { ugId } = req.params;

    const ug = await User.findOne({
      _id: ugId,
      role: 'ug',
      createdBy: req.user._id,
    });

    if (!ug) {
      return res.status(404).json({ success: false, message: 'UG not found under your assignment list' });
    }

    ug.createdBy = null;
    await ug.save();

    return res.json({
      success: true,
      message: 'UG removed from your assigned list',
      ug: {
        _id: ug._id,
        name: ug.name,
        Identity: ug.Identity,
        department: ug.department,
      },
    });
  } catch (err) {
    console.error('Error unassigning UG:', err);
    return res.status(500).json({ success: false, message: 'Failed to unassign UG' });
  }
});

/* ================= DOCTOR - ASSIGNED PGs ROUTES ================= */

// Get all PGs assigned by this doctor
router.get('/doctor/assigned-pgs', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const pgs = await User.find(
      { role: 'pg', createdBy: req.user._id },
      { _id: 1, name: 1, email: 1, phone: 1, Identity: 1, staffId: 1, department: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, pgs });
  } catch (err) {
    console.error('Error fetching assigned PGs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned PGs' });
  }
});

// Get overview of assigned PGs with analytics
router.get('/doctor/assigned-pgs/overview', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { PatientDetails } = await import('../models/patientDetails.js');
    const generalCaseModule = await import('../models/GeneralCase.js');
    const prescriptionModule = await import('../models/Prescription.js');
    const pedodonticsModule = await import('../models/PedodonticsCase.js');
    const completeDentureModule = await import('../models/CompleteDentureCase.js');
    const fpdModule = await import('../models/Fpd-model.js');
    const implantModule = await import('../models/Implant-model.js');
    const implantPatientModule = await import('../models/ImplantPatient-model.js');
    const partialModule = await import('../models/partial-model.js');

    const GeneralCase = generalCaseModule.default;
    const Prescription = prescriptionModule.default;
    const PedodonticsCase = pedodonticsModule.default;
    const CompleteDentureCase = completeDentureModule.default;
    const FPD = fpdModule.default;
    const Implant = implantModule.default;
    const ImplantPatient = implantPatientModule.default;
    const PartialDenture = partialModule.default;

    const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '');
    const getDepartmentBucket = (departmentLabel) => {
      const normalized = normalizeDepartment(departmentLabel);

      if (!normalized) return 'all';
      if (normalized.includes('pedodont')) return 'pedodontics';
      if (
        normalized.includes('prostho') ||
        normalized.includes('protho') ||
        normalized.includes('prosth') ||
        normalized === 'fpd' ||
        normalized === 'fixedpartialdenture' ||
        normalized.includes('implant') ||
        normalized.includes('partial')
      ) {
        return 'prosthodontics';
      }

      return 'all';
    };

    const extractResendReason = (chiefApprovalText) => {
      const rawText = String(chiefApprovalText || '').trim();
      if (!rawText) return '';

      const match = rawText.match(/(?:redo|resend)\s*:?\s*(.*)$/i);
      if (!match) return '';

      return String(match[1] || '').trim();
    };

    const assignedPGs = await User.find(
      { role: 'pg', createdBy: req.user._id },
      { _id: 1, name: 1, Identity: 1, email: 1, phone: 1, department: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    if (!assignedPGs.length) {
      return res.json({
        success: true,
        pgs: [],
        appointments: [],
        analytics: [],
      });
    }

    // Query appointments by BOTH PG _id and Identity formats
    const pgQueryKeys = Array.from(
      new Set(
        assignedPGs
          .map((pg) => (pg.Identity ? String(pg.Identity).trim() : null))
          .filter(Boolean)
      )
    );

    const referrals = await GeneralCase.find({ assignedPgId: { $in: pgQueryKeys }, specialistStatus: 'approved' })
      .sort({ pgAssignedAt: -1, createdAt: -1 })
      .lean();

    const referralPatientIds = Array.from(
      new Set(
        referrals
          .map((referral) => String(referral.patientId || '').trim())
          .filter(Boolean)
      )
    );

    const caseSources = [
      { model: PedodonticsCase, department: 'Pedodontics', bucket: 'pedodontics' },
      { model: CompleteDentureCase, department: 'Complete Denture', bucket: 'prosthodontics' },
      { model: FPD, department: 'FPD', bucket: 'prosthodontics' },
      { model: Implant, department: 'Implant', bucket: 'prosthodontics' },
      { model: ImplantPatient, department: 'Implant Patient Surgery', bucket: 'prosthodontics' },
      { model: PartialDenture, department: 'Partial Denture', bucket: 'prosthodontics' },
    ];

    const allCases = referralPatientIds.length
      ? (
          await Promise.all(
            caseSources.map(async ({ model, department, bucket }) => {
              try {
                const cases = await model.find(
                  {
                    doctorId: { $in: pgQueryKeys },
                    patientId: { $in: referralPatientIds },
                  },
                  {
                    _id: 1,
                    patientId: 1,
                    doctorId: 1,
                    chiefApproval: 1,
                    createdAt: 1,
                  }
                ).lean();

                return cases.map((caseItem) => ({
                  caseId: String(caseItem._id),
                  patientId: String(caseItem.patientId || '').trim(),
                  doctorId: String(caseItem.doctorId || '').trim(),
                  chiefApproval: String(caseItem.chiefApproval || ''),
                  createdAt: caseItem.createdAt,
                  caseDepartment: department,
                  caseBucket: bucket,
                }));
              } catch (error) {
                console.error(`Error fetching ${department} cases for PG overview:`, error.message || error);
                return [];
              }
            })
          )
        ).flat()
      : [];

    const casesByPgPatient = new Map();
    allCases.forEach((caseItem) => {
      const key = `${caseItem.doctorId}::${caseItem.patientId}`;
      if (!casesByPgPatient.has(key)) {
        casesByPgPatient.set(key, []);
      }
      casesByPgPatient.get(key).push(caseItem);
    });

    casesByPgPatient.forEach((caseList) => {
      caseList.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    });

    const caseIds = allCases.map((caseItem) => caseItem.caseId).filter(Boolean);
    const prescriptionsByCase = caseIds.length
      ? await Prescription.find(
          { caseId: { $in: caseIds } },
          { caseId: 1 }
        ).lean()
      : [];

    const prescriptionsByPatientDoctor = referralPatientIds.length
      ? await Prescription.find(
          {
            patientId: { $in: referralPatientIds },
            doctorId: { $in: pgQueryKeys },
          },
          { patientId: 1, doctorId: 1 }
        ).lean()
      : [];

    const prescriptionCaseIdSet = new Set(
      prescriptionsByCase
        .map((prescription) => String(prescription.caseId || '').trim())
        .filter(Boolean)
    );

    const prescriptionPatientDoctorSet = new Set(
      prescriptionsByPatientDoctor
        .map((prescription) => `${String(prescription.doctorId || '').trim()}::${String(prescription.patientId || '').trim()}`)
        .filter((key) => key !== '::')
    );

    const pgLookup = new Map(assignedPGs.map((pg) => [String(pg._id), pg]));
    const pgIdentityToCanonical = new Map(
      assignedPGs.map((pg) => [String(pg.Identity || '').trim(), String(pg._id)])
    );
    const scheduledByPG = new Map();
    const patientVisitCountsByPG = new Map();
    const uniquePatientIds = new Set();

    referrals.forEach((referral) => {
      const pgKey = pgIdentityToCanonical.get(String(referral.assignedPgId || '').trim());
      if (!pgKey || !pgLookup.has(pgKey)) return;

      if (!scheduledByPG.has(pgKey)) {
        scheduledByPG.set(pgKey, []);
      }

      const referralPatientId = String(referral.patientId || '').trim();
      const assignedPgIdentity = String(referral.assignedPgId || '').trim();
      const caseLookupKey = `${assignedPgIdentity}::${referralPatientId}`;
      const candidateCases = casesByPgPatient.get(caseLookupKey) || [];

      const preferredBucket = getDepartmentBucket(
        referral.referredDepartment || referral.selectedDepartments?.[0] || ''
      );

      const bucketCases = preferredBucket === 'all'
        ? candidateCases
        : candidateCases.filter((caseItem) => caseItem.caseBucket === preferredBucket);

      const latestCase = bucketCases[0] || candidateCases[0] || null;
      const resendReason = extractResendReason(latestCase?.chiefApproval || '');

      const hasCaseSheet = Boolean(latestCase);
      const hasPrescription = latestCase
        ? prescriptionCaseIdSet.has(String(latestCase.caseId || '')) || prescriptionPatientDoctorSet.has(caseLookupKey)
        : false;

      let completionStatus = 'pending';
      let statusTag = '';

      if (resendReason) {
        completionStatus = 'pending';
        statusTag = 'resent';
      } else if (hasCaseSheet && hasPrescription) {
        completionStatus = 'completed';
      }

      scheduledByPG.get(pgKey).push({
        referralId: referral._id,
        patientId: referral.patientId,
        patientName: referral.patientName,
        referredDepartment: referral.referredDepartment || referral.selectedDepartments?.[0] || '',
        chiefComplaint: referral.chiefComplaint,
        status: completionStatus,
        statusTag,
        resendReason,
        hasCaseSheet,
        hasPrescription,
        caseId: latestCase?.caseId || '',
        caseDepartment: latestCase?.caseDepartment || '',
        chiefApproval: latestCase?.chiefApproval || '',
        assignedAt: referral.pgAssignedAt || referral.specialistReviewedAt || referral.createdAt,
      });

      if (referral.patientId) {
        const patientId = String(referral.patientId);
        uniquePatientIds.add(patientId);

        if (!patientVisitCountsByPG.has(pgKey)) {
          patientVisitCountsByPG.set(pgKey, new Map());
        }

        const pgPatientCountMap = patientVisitCountsByPG.get(pgKey);
        pgPatientCountMap.set(patientId, (pgPatientCountMap.get(patientId) || 0) + 1);
      }
    });

    const patientDetails = uniquePatientIds.size
      ? await PatientDetails.find(
          { patientId: { $in: Array.from(uniquePatientIds) } },
          { patientId: 1, personalInfo: 1, medicalInfo: 1 }
        ).lean()
      : [];

    const patientMap = new Map(
      patientDetails.map((p) => [
        String(p.patientId),
        {
          gender: p.personalInfo?.gender || null,
          chiefComplaint: String(p.medicalInfo?.chiefComplaint || '').trim(),
        },
      ])
    );

    const analytics = assignedPGs.map((pg) => {
      const pgKey = String(pg._id);
      const pgPatientCountMap = patientVisitCountsByPG.get(pgKey) || new Map();

      let malePatients = 0;
      let femalePatients = 0;
      let oldPatients = 0;
      let newPatients = 0;

      pgPatientCountMap.forEach((visitCount, patientId) => {
        const patient = patientMap.get(patientId);
        if (patient) {
          const gender = patient.gender?.toLowerCase();
          if (gender === 'male') malePatients++;
          else if (gender === 'female') femalePatients++;
        }

        if (visitCount === 1) newPatients++;
        else if (visitCount > 1) oldPatients++;
      });

      const scheduledAppointments = scheduledByPG.get(pgKey) || [];

      return {
        pgName: pg.name,
        pgIdentity: pg.Identity,
        pgEmail: pg.email,
        department: pg.department,
        totalVisitedPatients: pgPatientCountMap.size,
        malePatients,
        femalePatients,
        newPatients,
        oldPatients,
        scheduledAppointments: scheduledAppointments.length,
      };
    });

    const enrichedAppointments = [];
    assignedPGs.forEach((pg) => {
      const pgKey = String(pg._id);
      const appointments = scheduledByPG.get(pgKey) || [];

      appointments.forEach((appt) => {
        const patientInfo = patientMap.get(String(appt.patientId || ''));
        enrichedAppointments.push({
          ...appt,
          chiefComplaint: String(appt.chiefComplaint || patientInfo?.chiefComplaint || '').trim(),
          pgName: pg.name,
          pgIdentity: pg.Identity,
          pgDepartment: pg.department,
        });
      });
    });

    res.json({
      success: true,
      pgs: assignedPGs,
      appointments: enrichedAppointments,
      analytics,
    });
  } catch (err) {
    console.error('Error fetching PG overview:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch PG overview' });
  }
});

// Update a PG's basic details (doctor can update only their own created PGs)
router.patch('/doctor/assigned-pgs/:pgId/update', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { pgId } = req.params;
    const { name, email, phone, department } = req.body || {};

    const pg = await User.findOne({
      _id: pgId,
      role: 'pg',
      createdBy: req.user._id,
    });

    if (!pg) {
      return res.status(404).json({ success: false, message: 'PG not found under your assignment list' });
    }

    // Enforce unique email if email is being changed
    if (email !== undefined && String(email).trim()) {
      const existing = await User.findOne({
        email: String(email).trim(),
        _id: { $ne: pg._id },
      }).lean();

      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
    }

    if (name !== undefined) pg.name = String(name).trim();
    if (email !== undefined) pg.email = String(email).trim();
    if (phone !== undefined) pg.phone = String(phone).trim();
    if (department !== undefined) pg.department = String(department).trim();

    await pg.save();

    res.json({
      success: true,
      message: 'PG updated successfully',
      pg: {
        _id: pg._id,
        name: pg.name,
        email: pg.email,
        phone: pg.phone,
        Identity: pg.Identity,
        department: pg.department,
      },
    });
  } catch (err) {
    console.error('Error updating PG:', err);
    res.status(500).json({ success: false, message: 'Failed to update PG' });
  }
});

// Remove a PG from doctor's assigned list
router.patch('/doctor/assigned-pgs/:pgId/unassign', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { pgId } = req.params;

    const pg = await User.findOne({
      _id: pgId,
      role: 'pg',
      createdBy: req.user._id,
    });

    if (!pg) {
      return res.status(404).json({ success: false, message: 'PG not found under your assignment list' });
    }

    pg.createdBy = null;
    await pg.save();

    res.json({
      success: true,
      message: 'PG removed from your assigned list',
      pg: {
        _id: pg._id,
        name: pg.name,
        Identity: pg.Identity,
        department: pg.department,
      },
    });
  } catch (err) {
    console.error('Error unassigning PG:', err);
    res.status(500).json({ success: false, message: 'Failed to unassign PG' });
  }
});

// Update a doctor's basic details (chief can update only their own created doctors)
router.patch('/chief/assigned-doctors/:doctorId/update', auth, requireRole(['chief-doctor', 'chief']), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { name, email, phone, department } = req.body || {};
    const requesterDepartment = String(req.user?.department || '').trim();
    const normalizedRequesterDepartment = normalizeDepartmentName(requesterDepartment);

    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      createdBy: req.user._id,
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found under your assignment list' });
    }

    if (!normalizedRequesterDepartment) {
      return res.status(403).json({ success: false, message: 'Your chief doctor account does not have a department assigned.' });
    }

    if (normalizeDepartmentName(doctor.department) !== normalizedRequesterDepartment) {
      return res.status(403).json({ success: false, message: 'You can only manage doctors from your own department.' });
    }

    if (email !== undefined && String(email).trim()) {
      const existing = await User.findOne({
        email: String(email).trim(),
        _id: { $ne: doctor._id },
      }).lean();

      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }
    }

    if (name !== undefined) doctor.name = String(name).trim();
    if (email !== undefined) doctor.email = String(email).trim();
    if (phone !== undefined) doctor.phone = String(phone).trim();
    if (department !== undefined) {
      const normalizedRequestedDepartment = normalizeDepartmentName(department);
      if (normalizedRequestedDepartment !== normalizedRequesterDepartment) {
        return res.status(403).json({ success: false, message: 'You cannot move a doctor outside your department.' });
      }
      doctor.department = requesterDepartment;
    }

    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        Identity: doctor.Identity,
        department: doctor.department,
      },
    });
  } catch (err) {
    console.error('Error updating doctor:', err);
    res.status(500).json({ success: false, message: 'Failed to update doctor' });
  }
});

// Get all cases from assigned PGs across all departments
router.get('/doctor/assigned-pgs/cases', auth, requireRole(['doctor']), async (req, res) => {
  try {
    // Get all PGs assigned by this doctor
    const assignedPGs = await User.find(
      { role: 'pg', createdBy: req.user._id },
      { Identity: 1, name: 1 }
    ).lean();

    if (!assignedPGs.length) {
      return res.json({ success: true, cases: [] });
    }

    // Get all PG identities
    const pgIdentities = assignedPGs.map(pg => pg.Identity).filter(Boolean);
    const pgNames = new Map(assignedPGs.map(pg => [pg.Identity, pg.name]));

    // Import all case models
    const pedodonticsModule = await import('../models/PedodonticsCase.js');
    const completeDentureModule = await import('../models/CompleteDentureCase.js');
    const fpdModule = await import('../models/Fpd-model.js');
    const implantModule = await import('../models/Implant-model.js');
    const implantPatientModule = await import('../models/ImplantPatient-model.js');
    const partialModule = await import('../models/partial-model.js');

    const PedodonticsCase = pedodonticsModule.default;
    const CompleteDentureCase = completeDentureModule.default;
    const FPD = fpdModule.default;
    const Implant = implantModule.default;
    const ImplantPatient = implantPatientModule.default;
    const PartialDenture = partialModule.default;

    const endpoints = [
      { model: PedodonticsCase, department: 'Pedodontics' },
      { model: CompleteDentureCase, department: 'Complete Denture' },
      { model: FPD, department: 'FPD' },
      { model: Implant, department: 'Implant' },
      { model: ImplantPatient, department: 'Implant Patient Surgery' },
      { model: PartialDenture, department: 'Partial Denture' },
    ];

    const casePromises = endpoints.map(async ({ model, department }) => {
      try {
        const cases = await model.find({ doctorId: { $in: pgIdentities } })
          .sort({ createdAt: -1 })
          .lean();

        return cases.map(c => ({
          ...c,
          department,
          pgName: pgNames.get(c.doctorId) || c.doctorName,
        }));
      } catch (err) {
        console.error(`Error fetching ${department} cases:`, err);
        return [];
      }
    });

    const results = await Promise.all(casePromises);
    const allCases = results.flat();

    // Sort by creation date
    allCases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, cases: allCases });
  } catch (err) {
    console.error('Error fetching PG cases:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch cases from assigned PGs' });
  }
});

// Approve a case from an assigned PG
router.patch('/doctor/assigned-pgs/cases/:caseId/approve', auth, requireRole(['doctor']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { department, chiefApproval, approvedBy } = req.body;

    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required' });
    }

    // Map department to model
    const modelMap = {
      'Pedodontics': '../models/PedodonticsCase.js',
      'Complete Denture': '../models/CompleteDentureCase.js',
      'FPD': '../models/Fpd-model.js',
      'Implant': '../models/Implant-model.js',
      'Implant Patient Surgery': '../models/ImplantPatient-model.js',
      'Partial Denture': '../models/partial-model.js',
    };

    const modelPath = modelMap[department];
    if (!modelPath) {
      return res.status(400).json({ success: false, message: 'Invalid department' });
    }

    // Import the correct model
    const modelModule = await import(modelPath);
    const Model = modelModule.default || modelModule[Object.keys(modelModule)[0]];

    // Find the case
    const caseItem = await Model.findById(caseId);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    // Verify the case belongs to an assigned PG
    const pg = await User.findOne({
      Identity: caseItem.doctorId,
      role: 'pg',
      createdBy: req.user._id,
    });

    if (!pg) {
      return res.status(403).json({ success: false, message: 'You can only approve cases from your assigned PGs' });
    }

    // Update the case
    caseItem.chiefApproval = chiefApproval || 'Approved';
    caseItem.approvedBy = approvedBy || req.user.name;
    caseItem.approvedAt = new Date();

    await caseItem.save();

    res.json({
      success: true,
      message: 'Case approved successfully',
      case: caseItem,
    });
  } catch (err) {
    console.error('Error approving case:', err);
    res.status(500).json({ success: false, message: 'Failed to approve case' });
  }
});

export default router;


