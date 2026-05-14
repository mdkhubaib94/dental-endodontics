import { Router } from 'express';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';
import { setOtp, verifyOtp as verifyStoredOtp } from '../utils/otpStore.js';

dotenv.config();
const router = Router();

// OTP store is shared via server/utils/otpStore.js

// Email setup with primary + fallback providers
let emailConfigured = false;
let transporter;
let resendClient;
let emailService = 'none';
const preferredEmailProvider = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
const hasResend = Boolean(process.env.RESEND_API_KEY);
const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
const hasGmail = Boolean(process.env.MAIL_USER && process.env.MAIL_PASSWORD);

if (hasResend) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
}

if (hasSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

if (hasGmail) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  console.log(`ℹ️  Testing Gmail SMTP connection...`);
  console.log(`   From: ${process.env.MAIL_USER}`);

  transporter.verify((err, success) => {
    if (err) {
      console.error('❌ Gmail SMTP failed:', err.message);
    } else if (success) {
      console.log('✅ Gmail SMTP ready to send emails');
    }
  });
}

const availableServices = [];
if (hasResend) availableServices.push('resend');
if (hasSendGrid) availableServices.push('sendgrid');
if (hasGmail) availableServices.push('gmail');

const isPreferredAvailable = preferredEmailProvider && availableServices.includes(preferredEmailProvider);
emailService = availableServices.includes('gmail')
  ? 'gmail'
  : (isPreferredAvailable
      ? preferredEmailProvider
      : (availableServices.includes('resend') ? 'resend' : availableServices[0] || 'none'));

emailConfigured = availableServices.length > 0;

if (emailConfigured) {
  console.log(`✅ Email configured. Primary provider: ${emailService}. Fallback chain enabled.`);
} else {
  console.warn('⚠️  Email service NOT configured');
}

const buildServiceOrder = () => {
  const order = [];
  if (emailService !== 'none') order.push(emailService);
  for (const service of ['resend', 'sendgrid', 'gmail']) {
    if (availableServices.includes(service) && !order.includes(service)) {
      order.push(service);
    }
  }
  return order;
};

const sendOtpEmailWithFallback = async ({ to, userName, otp }) => {
  const fromResend = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromSendGrid = process.env.SENDGRID_FROM_EMAIL || process.env.MAIL_USER || fromResend;
  const subject = 'SRM Dental OTP Verification';
  const html = `Hi ${userName},<br><br>Your OTP is: <strong>${otp}</strong><br><br>Valid for 10 minutes.<br><br>Thank you,<br>SRM Dental College`;

  const order = buildServiceOrder();
  let lastError = null;

  for (const service of order) {
    try {
      if (service === 'resend') {
        await resendClient.emails.send({
          to,
          from: fromResend,
          subject,
          html,
        });
      } else if (service === 'sendgrid') {
        await sgMail.send({
          to,
          from: fromSendGrid,
          subject,
          html,
        });
      } else if (service === 'gmail') {
        await transporter.sendMail({
          from: process.env.MAIL_USER,
          to,
          subject,
          html,
        });
      }

      return { ok: true, service };
    } catch (error) {
      lastError = error;
      console.error(`❌ OTP email via ${service} failed:`, error.message);
    }
  }

  return { ok: false, error: lastError };
};

// Diagnostic endpoint for email status
router.get('/email-status', (req, res) => {
  res.json({
    emailConfigured,
    emailService,
    resendKey: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
    sendgridKey: process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET',
    gmailUser: process.env.MAIL_USER ? process.env.MAIL_USER : 'NOT SET',
    gmailPassword: process.env.MAIL_PASSWORD ? '***' : 'NOT SET',
    message: emailConfigured ? `Email ready via ${emailService}` : 'Email not configured'
  });
});

// Development utility endpoint to validate outbound email without database dependency
router.post('/test-email', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Disabled in production' });
  }

  const to = String(req.body?.email || process.env.MAIL_USER || '').trim();
  const userName = String(req.body?.name || 'Test User').trim();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (!to) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  if (!emailConfigured) {
    return res.status(503).json({
      success: false,
      message: 'Email not configured. Set RESEND_API_KEY or SENDGRID_API_KEY or Gmail credentials.',
    });
  }

  const result = await sendOtpEmailWithFallback({ to, userName, otp });
  if (!result.ok) {
    return res.status(500).json({
      success: false,
      message: `Email failed: ${result.error?.message || 'Unknown error'}`,
    });
  }

  setOtp(to, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    method: 'email',
    name: userName,
  });

  return res.json({
    success: true,
    message: 'Test email sent successfully',
    service: result.service,
  });
});

// Add validation middleware
router.post('/send-otp', async (req, res) => {
  console.log('📧 OTP request received:', req.body);
  
  const { name, email, phone, method, patientId, type } = req.body;

  // Validate required fields
  if (!method) {
    return res.status(400).json({ 
      success: false, 
      message: 'Method is required' 
    });
  }

  // Name is required only for signup, NOT for forgot password
  if (!type || type !== 'forgot-password') {
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name is required' 
      });
    }
  }

  if (method === 'email' && !email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required when method is email' 
    });
  }

  if (method === 'phone' && !phone) {
    return res.status(400).json({ 
      success: false, 
      message: 'Phone is required when method is phone' 
    });
  }

  if (method !== 'email' && method !== 'phone') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid method. Use "email" or "phone"' 
    });
  }

  try {
    let existing = null;
    if (email) existing = await User.findOne({ email });
    if (!existing && phone) existing = await User.findOne({ phone });

    console.log('🔍 Existing user check:', existing);

    // For forgot password, user MUST exist
    if (type === 'forgot-password') {
      if (!existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email or phone not found' 
        });
      }
    } else {
      // For signup, user must NOT exist
      if (existing && patientId && existing.Identity === patientId) {
        console.log('✅ Existing user updating own profile – OTP allowed');
      } else if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email or phone already exists' 
        });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const identifier = method === 'email' ? email : phone;
    const userName = name || (existing ? existing.name : 'User');

    setOtp(identifier, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      method,
      name: userName
    });

    console.log(`📝 Stored OTP for ${identifier}: ${otp}`);

    if (method === 'email') {
      if (!emailConfigured) {
        console.warn('⚠️  Email not configured');
        console.log(`📧 [DEV MODE - OTP for ${email}]: ${otp}`);
        return res.status(503).json({ 
          success: false, 
          message: 'Email not configured. Set RESEND_API_KEY or SENDGRID_API_KEY or Gmail credentials.' 
        });
      }

      const result = await sendOtpEmailWithFallback({ to: email, userName, otp });
      if (!result.ok) {
        return res.status(500).json({ 
          success: false, 
          message: `Email failed: ${result.error?.message || 'Unknown error'}` 
        });
      }
      console.log(`✅ OTP email sent via ${result.service} to ${email}`);
    } else if (method === 'phone') {
      console.log(`📱 [SMS OTP for ${phone}]: ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent successfully' });

  } catch (err) {
    console.error('❌ OTP Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during OTP sending' 
    });
  }
});

// New OTP verification endpoint
router.post('/verify-otp', async (req, res) => {
  console.log('🔍 OTP verification request:', req.body);
  
  const { email, phone, method, otp, consume } = req.body;

  try {
    const identifier = method === 'email' ? email : phone;
    const shouldConsume = consume === undefined ? true : Boolean(consume);
    const result = verifyStoredOtp(identifier, otp, { consume: shouldConsume });

    if (!result.success) {
      console.log('❌ OTP verification failed for:', identifier, result.message);
      return res.status(400).json({ success: false, message: result.message });
    }

    console.log('✅ OTP verified successfully for:', identifier, `(consume=${shouldConsume})`);
    return res.json({ success: true, message: result.message });
  } catch (err) {
    console.error('❌ OTP verification error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during OTP verification' 
    });
  }
});

router.post("/update", async (req, res) => {
  const { Identity, name, email, phone } = req.body;

  try {
    if (!Identity) {
      return res.status(400).json({ success: false, message: "Identity is required" });
    }

    const patient = await User.findOne({ Identity });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // If updating -> check phone uniqueness (ignore same patient's current phone)
    if (phone && phone !== patient.phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: "Phone already exists" });
      }
      patient.phone = phone;
    }

    if (name) patient.name = name;
    if (email) patient.email = email;

    await patient.save();
    return res.json({ success: true, message: "Patient updated", patient });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post('/send-otp-reset', async (req, res) => {
  console.log('📧 OTP request received:', req.body);
  
  const { name, email, phone, method } = req.body;

  // Validate required fields
  if (!name || !method) {
    console.log('❌ Missing required fields: name or method');
    return res.status(400).json({ 
      success: false, 
      message: 'Name and method are required' 
    });
  }

  if (method === 'email' && !email) {
    console.log('❌ Email required for email method');
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required when method is email' 
    });
  }

  if (method === 'phone' && !phone) {
    console.log('❌ Phone required for phone method');
    return res.status(400).json({ 
      success: false, 
      message: 'Phone is required when method is phone' 
    });
  }

  if (method !== 'email' && method !== 'phone') {
    console.log('❌ Invalid method:', method);
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid method. Use "email" or "phone"' 
    });
  }

  try {
    // User must exist for a profile-reset OTP
    let existing = null;
    if (email) existing = await User.findOne({ email });
    if (!existing && phone) existing = await User.findOne({ phone });

    console.log('🔍 Existing user check:', existing);

    if (!existing) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone not found'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const identifier = method === 'email' ? email : phone;
    const userName = name || existing.name || 'User';

    // Store OTP with 10-minute expiration
    otpStore.set(identifier, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      method,
      name: userName
    });

    console.log(`📝 Stored OTP for ${identifier}: ${otp}`);

    if (method === 'email') {
      if (!emailConfigured) {
        console.warn('⚠️  Email not configured');
        console.log(`📧 [DEV MODE - OTP for ${email}]: ${otp}`);
        return res.status(503).json({
          success: false,
          message: 'Email not configured. Set RESEND_API_KEY or SENDGRID_API_KEY or Gmail credentials.'
        });
      }

      const result = await sendOtpEmailWithFallback({ to: email, userName, otp });
      if (!result.ok) {
        return res.status(500).json({ success: false, message: `Email failed: ${result.error?.message || 'Unknown error'}` });
      }
      console.log(`✅ OTP email sent via ${result.service} to ${email}`);
    } else if (method === 'phone') {
      console.log(`📱 [SMS OTP for ${phone}]: ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent successfully' });

  } catch (err) {
    console.error('❌ OTP Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP sending'
    });
  }
});

export default router;
