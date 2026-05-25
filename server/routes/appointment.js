import { Router } from "express";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { Resend } from "resend";
import jwt from "jsonwebtoken";

import Appointment from "../models/AppoitmentBooked.js";
import { User } from "../models/User.js";
import AssignmentState from "../models/AssignmentState.js";
import AuditLog from "../models/AuditLog.js";
import fs from 'fs';
import path from 'path';
import requireRole from "../middleware/role.js";

dotenv.config();
const router = Router()

const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '');
const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
const GENERAL_DOCTOR_DEPARTMENT_KEYS = new Set(['general', 'generaldentistry']);

/* ✅ CONFIRM ROUTER LOAD */
console.log("✅ Appointment router loaded successfully");

/* ================= EMAIL CONFIG ================= */
let transporter = null;
let resendClient = null;
let emailService = 'none';
let emailConfigured = false;
const preferredEmailProvider = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
const hasResend = Boolean(process.env.RESEND_API_KEY);
const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
const hasGmail = Boolean(process.env.MAIL_USER && process.env.MAIL_PASSWORD);

// Provider resolution order:
// 1) If Gmail credentials exist, prefer Gmail so booking emails come from the mailbox users expect.
// 2) Otherwise honor EMAIL_PROVIDER override when available.
// 3) Fall back to other configured services.
if (hasGmail) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 5,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });
  emailService = 'gmail';
  emailConfigured = true;
  console.log('✅ Appointment emails: Gmail configured (preferred)');
} else if (preferredEmailProvider === 'resend' && hasResend) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
  emailService = 'resend';
  emailConfigured = true;
  console.log('✅ Appointment emails: Resend configured (EMAIL_PROVIDER=resend)');
} else if (preferredEmailProvider === 'sendgrid' && hasSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  emailService = 'sendgrid';
  emailConfigured = true;
  console.log('✅ Appointment emails: SendGrid configured (EMAIL_PROVIDER=sendgrid)');
} else if (hasResend) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
  emailService = 'resend';
  emailConfigured = true;
  console.log('✅ Appointment emails: Resend configured');
} else if (hasSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  emailService = 'sendgrid';
  emailConfigured = true;
  console.log('✅ Appointment emails: SendGrid configured');
} else {
  console.warn('⚠️  Appointment emails: NOT configured (set SENDGRID_API_KEY or MAIL_USER/MAIL_PASSWORD)');
}

const isValidEmail = (value) => {
  if (typeof value !== "string") return false;
  const email = value.trim();
  if (!email) return false;
  // Simple sanity check (avoid heavy validation)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const getPatientEmail = async (patientId) => {
  const user = await User.findOne(
    { Identity: patientId },
    { email: 1 }
  );
  return user?.email || null;
};

const resolvePatientEmail = async (patientId, providedEmail = null) => {
  const provided = isValidEmail(providedEmail) ? String(providedEmail).trim() : null;
  if (provided) return provided;

  const fallback = await getPatientEmail(patientId);
  return isValidEmail(fallback) ? String(fallback).trim() : null;
};

const getDoctorIdentityKeys = (user) => {
  const keys = [
    user?._id ? String(user._id).trim() : '',
    user?.Identity ? String(user.Identity).trim() : '',
  ].filter(Boolean);

  return Array.from(new Set(keys));
};

const isGeneralDoctorUser = (user) => {
  if (!user) return false;

  if (user.isGeneralDoctor === true) return true;
  if (user.isDeptDoctor === true) return false;

  const normalizedRole = normalizeRole(user.role);
  if (normalizedRole !== 'doctor' && normalizedRole !== 'chief-doctor' && normalizedRole !== 'chief') {
    return false;
  }

  return GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizeDepartment(user.department));
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/* ================= 🔥 ADDED: GET PHONE FROM DB ================= */
const getPatientPhone = async (patientId) => {
  const user = await User.findOne(
    { Identity: patientId },
    { phone: 1 }
  );
  return user?.phone || null;
};

/* ================= AUTH ================= */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token" });
    }

    const token = authHeader.split(" ")[1];
    // Debug: log JWT secret presence (length only) to help diagnose signature issues
    try {
      console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    } catch (e) {
      // ignore
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(401).json({ success: false });

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err && err.message ? err.message : err);
    return res.status(401).json({ success: false, message: err && err.message ? err.message : 'Unauthorized' });
  }
};

/* ================= UTILS ================= */
/* 🔥 RANDOM 6-DIGIT BOOKING ID */
const generateBookingId = () => {
  return "SRMDNT" + Math.floor(100000 + Math.random() * 900000).toString();
};

// Appointment slot rules
// Default departments: 30-minute slots from 9:00 AM to 2:00 PM
// Oral Medicine: 15-minute slots from 9:00 AM to 2:00 PM (skips lunch 1:00–2:00 and 11:00 break)
const ALLOWED_APPOINTMENT_TIMES = new Set([
  // 30-minute slots (all departments)
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "2:00 PM",
  // 15-minute slots (Oral Medicine)
  "9:15 AM",
  "9:45 AM",
  "10:15 AM",
  "10:45 AM",
  "11:15 AM",
  "11:45 AM",
  "12:15 PM",
  "12:45 PM",
  "2:15 PM",
  "2:30 PM",
  "2:45 PM",
  "3:00 PM",
]);

const normalizeAppointmentTime = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return trimmed;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12) return trimmed;

  // Remove leading zero if provided (e.g., 09:00 AM -> 9:00 AM)
  hour = Number(hour);
  return `${hour}:${minute} ${period}`;
};

const isAllowedAppointmentTime = (value) => {
  const normalized = normalizeAppointmentTime(value);
  return ALLOWED_APPOINTMENT_TIMES.has(normalized);
};

const isValidObjectIdString = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

const getAssignableDoctors = async () => {
  const doctors = await User.find(
    { role: "doctor" },
    { _id: 1, name: 1, Identity: 1, role: 1, department: 1 }
  ).lean();

  const generalDoctors = doctors.filter((doctor) => {
    return GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizeDepartment(doctor.department));
  });

  generalDoctors.sort((a, b) => {
    const aId = (a.Identity || "").toString();
    const bId = (b.Identity || "").toString();
    const byIdentity = aId.localeCompare(bId, "en", { numeric: true, sensitivity: "base" });
    if (byIdentity !== 0) return byIdentity;
    return String(a._id).localeCompare(String(b._id));
  });

  return generalDoctors;
};

const getNextRoundRobinStartIndex = async (doctorsLength) => {
  if (!doctorsLength) return 0;

  // NOTE:
  // - Avoid updating the same field via $setOnInsert and $inc (Mongo rejects it).
  // - Avoid update pipelines for maximum Mongo compatibility.
  // We increment `counter` and derive the start index from (counter - 1)
  // so that the very first assignment uses index 0 (D1).
  const state = await AssignmentState.findOneAndUpdate(
    { key: "appointmentRoundRobin" },
    {
      $setOnInsert: { key: "appointmentRoundRobin" },
      $inc: { counter: 1 },
    },
    { new: true, upsert: true }
  ).lean();

  const counter = typeof state?.counter === "number" ? state.counter : 1;
  const startCounter = counter - 1;
  return ((startCounter % doctorsLength) + doctorsLength) % doctorsLength;
};

const pickDoctorForSlot = async ({ appointmentDate, appointmentTime }) => {
  const doctors = await getAssignableDoctors();
  if (!doctors.length) {
    return { ok: false, status: 503, message: "No doctors available to assign right now." };
  }

  const normalizedAppointmentTime = normalizeAppointmentTime(appointmentTime);

  const existingAtSlot = await Appointment.find(
    {
      appointmentDate,
      appointmentTime: normalizedAppointmentTime,
      status: { $ne: "cancelled" },
    },
    { doctorId: 1 }
  ).lean();

  const slotCapacity = doctors.length;
  if (existingAtSlot.length >= slotCapacity) {
    return { ok: false, status: 409, message: "This time slot is fully booked. Please choose a different time." };
  }

  const bookedDoctorIds = new Set(
    existingAtSlot
      .map((a) => (a.doctorId == null ? null : String(a.doctorId)))
      .filter(Boolean)
  );

  // Global round-robin: D1 -> D2 -> ... -> DN -> D1 across ALL appointments.
  // Still skips any doctor already booked in this specific slot.
  const startIndex = await getNextRoundRobinStartIndex(doctors.length);

  for (let offset = 0; offset < doctors.length; offset++) {
    const doctor = doctors[(startIndex + offset) % doctors.length];
    const doctorIdStr = String(doctor._id);
    if (!bookedDoctorIds.has(doctorIdStr)) {
      return {
        ok: true,
        doctor,
        slotCapacity,
        normalizedAppointmentTime,
      };
    }
  }

  return { ok: false, status: 409, message: "This time slot is fully booked. Please choose a different time." };
};

/* ================= SEND EMAIL ================= */
const sendEmail = async (to, subject, html) => {
  if (!emailConfigured) {
    console.warn(`⚠️  Email not sent (service not configured). Subject: ${subject}`);
    return { ok: false, reason: "not_configured" };
  }

  if (!isValidEmail(to)) {
    console.warn(`⚠️  Email not sent (invalid recipient): ${to}`);
    return { ok: false, reason: "invalid_recipient" };
  }

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (emailService === 'sendgrid') {
        await sgMail.send({
          to,
          from: process.env.SENDGRID_FROM_EMAIL || 'srmdental2026@gmail.com',
          subject,
          html,
        });
      } else if (emailService === 'resend') {
        await resendClient.emails.send({
          to,
          from: process.env.RESEND_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || process.env.MAIL_USER || 'onboarding@resend.dev',
          subject,
          html,
        });
      } else if (transporter) {
        await transporter.sendMail({
          from: process.env.MAIL_USER,
          to,
          subject,
          html,
        });
      }

      return { ok: true };
    } catch (err) {
      const statusCode = Number(err?.code || err?.statusCode || err?.response?.statusCode || 0);
      const canRetry =
        attempt < maxAttempts &&
        (
          [408, 429, 500, 502, 503, 504].includes(statusCode) ||
          /timed? ?out|econnreset|eai_again|socket|network/i.test(String(err?.message || ''))
        );

      if (!canRetry) {
        console.error("Email error:", err.message);
        return { ok: false, reason: "send_failed", message: err.message };
      }

      await wait(700 * attempt);
    }
  }

  return { ok: false, reason: "send_failed", message: "Email delivery retry attempts exhausted" };
};

/* ================= ATTACH PATIENT NAME ================= */
const attachPatientName = async (appointments) => {
  const patientIds = [...new Set(appointments.map(a => a.patientId))];

  const { PatientDetails } = await import('../models/patientDetails.js');

  const doctorObjectIds = [...new Set(
    appointments
      .map((a) => (a.doctorId == null ? null : String(a.doctorId)))
      .filter((id) => isValidObjectIdString(id))
  )];

  const users = await User.find(
    { Identity: { $in: patientIds } },
    { Identity: 1, name: 1, personalInfo: 1 }
  );

  const patientProfiles = patientIds.length
    ? await PatientDetails.find(
        { patientId: { $in: patientIds } },
        { patientId: 1, personalInfo: 1, medicalInfo: 1 }
      ).lean()
    : [];

  const doctors = doctorObjectIds.length
    ? await User.find(
        { _id: { $in: doctorObjectIds } },
        { _id: 1, name: 1, Identity: 1 }
      ).lean()
    : [];

  const map = {};
  users.forEach(u => {
    map[u.Identity] =
      u.personalInfo?.firstName ||
      u.name ||
      u.Identity;
  });

  const patientProfileMap = new Map(
    patientProfiles.map((profile) => {
      const firstName = String(profile?.personalInfo?.firstName || '').trim();
      const lastName = String(profile?.personalInfo?.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();

      return [
        String(profile.patientId || '').trim(),
        {
          patientName: fullName || null,
          chiefComplaint: String(profile?.medicalInfo?.chiefComplaint || '').trim(),
        },
      ];
    })
  );

  const doctorMap = {};
  doctors.forEach((d) => {
    doctorMap[String(d._id)] = d.name || d.Identity || String(d._id);
  });

  return appointments.map((appointmentDoc) => {
    const appointment = typeof appointmentDoc?.toObject === 'function'
      ? appointmentDoc.toObject()
      : appointmentDoc;

    const patientId = String(appointment?.patientId || '').trim();
    const profile = patientProfileMap.get(patientId);

    return {
      ...appointment,
      patientName: profile?.patientName || map[patientId] || patientId,
      chiefComplaint: String(appointment?.chiefComplaint || profile?.chiefComplaint || '').trim(),
      doctorName: appointment?.doctorId ? (doctorMap[String(appointment.doctorId)] || null) : null,
    };
  });
};

/* ================= CREATE ================= */

router.post(["/", "/appointments"], async (req, res) => {
  try {
    const {
      patientId,
      patientEmail,
      chiefComplaint,
      appointmentDate,
      appointmentTime,
    } = req.body;

    console.log("📥 Create appointment request:", {
      patientId,
      patientEmail,
      chiefComplaint,
      appointmentDate,
      appointmentTime,
    });

    // Basic validation to avoid 500s from missing data
    if (!patientId || !chiefComplaint || !appointmentDate || !appointmentTime) {
      console.warn("⚠️ Missing required fields for appointment", {
        patientId,
        patientEmail,
        chiefComplaint,
        appointmentDate,
        appointmentTime,
      });
      return res.status(400).json({
        success: false,
        message: "Missing required fields for appointment",
      });
    }

    // 🔒 Enforce allowed appointment times
    if (!isAllowedAppointmentTime(appointmentTime)) {
      console.warn("⚠️ Attempt to book an invalid time slot", {
        appointmentDate,
        appointmentTime,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid appointment time. Please select one of the available slots.",
      });
    }

    const assignment = await pickDoctorForSlot({ appointmentDate, appointmentTime });
    if (!assignment.ok) {
      return res.status(assignment.status).json({
        success: false,
        message: assignment.message,
      });
    }

    const normalizedAppointmentTime = assignment.normalizedAppointmentTime;
    const assignedDoctorId = String(assignment.doctor._id);
    const resolvedPatientEmail = await resolvePatientEmail(patientId, patientEmail);

    if (!resolvedPatientEmail) {
      return res.status(400).json({
        success: false,
        message: "Patient email not found. Please update the patient profile email before booking.",
      });
    }

    const normalizedComplaint = chiefComplaint.charAt(0).toUpperCase() + chiefComplaint.slice(1).toLowerCase();

    // bookingId is unique; retry a couple times in the (rare) event of a collision.
    let appointment = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const bookingId = generateBookingId();
      try {
        // 🔥 Appointments start as PENDING when patient books
        // General doctor auto-accepts by viewing them (no explicit approval button)
        appointment = await Appointment.create({
          bookingId,
          patientId,
          patientEmail: resolvedPatientEmail,
          chiefComplaint: normalizedComplaint,
          appointmentDate,
          appointmentTime: normalizedAppointmentTime,
          doctorId: assignedDoctorId,
          status: "pending", // PENDING - general doctor sees and accepts implicitly
          needsGeneralApproval: false,
          needsPgApproval: false,
        });
        break;
      } catch (createErr) {
        const isDuplicateKey = createErr?.code === 11000;
        if (!isDuplicateKey || attempt === 2) throw createErr;
      }
    }

    if (!appointment) {
      throw new Error("Failed to create appointment after retries");
    }

    const bookingEmailResult = await sendEmail(
      resolvedPatientEmail,
      "Your Appointment has been Booked",
      `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>Your Appointment has been Booked</h2>
        <p>Dear Patient,</p>

        <p>Your appointment has been successfully booked with the following details:</p>

        <ul>
          <li><b>Booking ID:</b> ${appointment.bookingId}</li>
          <li><b>Date:</b> ${appointmentDate}</li>
          <li><b>Time:</b> ${appointmentTime}</li>
          <li><b>Chief Complaint:</b> ${chiefComplaint}</li>
        </ul>

        <p>Thank you,<br/>
        <b>SRM Dental College</b></p>
      </div>
      `
    );

    if (bookingEmailResult?.ok) {
      console.log(`📧 Booking email sent to ${resolvedPatientEmail} via ${emailService}`);
    } else {
      console.warn(
        `⚠️ Booking email not sent to ${resolvedPatientEmail}:`,
        bookingEmailResult?.reason || 'unknown_reason'
      );
    }

    console.log("✅ Appointment created:", {
      bookingId: appointment.bookingId,
      patientId: appointment.patientId,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
    });

    res.status(201).json({
      success: true,
      appointment: {
        ...appointment.toObject(),
        doctorName: assignment.doctor.name || assignment.doctor.Identity || assignedDoctorId,
      },
    });
  } catch (err) {
    console.error("❌ Error creating appointment:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create appointment",
      error:
        process.env.NODE_ENV !== "production"
          ? {
              name: err?.name,
              message: err?.message,
              code: err?.code,
            }
          : undefined,
    });
  }
});

/* ================= PATIENT APPOINTMENTS ================= */
router.get("/appointments/patient/:patientId", async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patientId: req.params.patientId,
    }).sort({ createdAt: -1 });

    const enriched = await attachPatientName(appointments);
    res.json({ success: true, appointments: enriched });
  } catch {
    res.status(500).json({ success: false });
  }
});

/* ================= DOCTOR – MY UPCOMING APPOINTMENTS ================= */
router.get("/my-appointments", auth, requireRole(["doctor", "chief-doctor"]), async (req, res) => {
  try {
    const doctorId = String(req.user._id);
    const userDepartment = String(req.user?.department || '').trim();
    const isGeneralDoctor = GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizeDepartment(userDepartment));

    // Compare as ISO date string (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split("T")[0];

    let appointments;
    
    if (isGeneralDoctor) {
      // 🔥 FIX: General doctors see ALL pending and assigned appointments (not just assigned to them)
      appointments = await Appointment.find({
        status: { $in: ["pending", "assigned", "rescheduled"] },
        appointmentDate: { $gte: todayStr },
        isProcessed: { $ne: true },
      }).sort({ appointmentDate: 1, appointmentTime: 1 });
    } else {
      // Specialist doctors see only appointments assigned to them
      appointments = await Appointment.find({
        doctorId,
        status: { $in: ["pending", "assigned", "in_progress", "rescheduled"] },
        appointmentDate: { $gte: todayStr },
      }).sort({ appointmentDate: 1, appointmentTime: 1 });
    }

    const enriched = await attachPatientName(appointments);
    res.json({ success: true, appointments: enriched });
  } catch (err) {
    console.error("❌ Error fetching my appointments:", err);
    res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
  }
});

/* ================= PG/UG – APPOINTMENTS FOR ASSIGNED PATIENTS ================= */
router.get("/pg-appointments", auth, requireRole(["doctor", "chief-doctor", "pg", "ug"]), async (req, res) => {
  try {
    const requesterRole = String(req.user?.role || '').trim().toLowerCase();
    const isSupervisor = requesterRole === 'doctor' || requesterRole === 'chief-doctor';
    
    const todayStr = new Date().toISOString().split("T")[0];
    
    if (isSupervisor) {
      // 🔥 FIX: Doctors see appointments for patients assigned to their PG/UG students
      const students = await User.find(
        { createdBy: req.user._id, role: { $in: ['pg', 'ug'] } },
        { Identity: 1, name: 1 }
      ).lean();
      
      const pgIdentities = students.map(s => String(s.Identity || '').trim()).filter(Boolean);
      
      if (!pgIdentities.length) {
        return res.json({ success: true, appointments: [] });
      }

      // Get all patient IDs assigned to these PG/UG students
      const GeneralCase = (await import('../models/GeneralCase.js')).default;
      const assignedCases = await GeneralCase.find(
        { assignedPgId: { $in: pgIdentities }, specialistStatus: 'approved' },
        { patientId: 1, assignedPgId: 1 }
      ).lean();

      const patientIdToPgMap = new Map();
      assignedCases.forEach(c => {
        const pid = String(c.patientId || '').trim();
        const pgId = String(c.assignedPgId || '').trim();
        if (pid && pgId) {
          patientIdToPgMap.set(pid, pgId);
        }
      });

      const assignedPatientIds = Array.from(patientIdToPgMap.keys());

      if (!assignedPatientIds.length) {
        return res.json({ success: true, appointments: [] });
      }

      // Fetch appointments for these patients
      const appointments = await Appointment.find({
        patientId: { $in: assignedPatientIds },
        status: { $in: ["assigned", "in_progress", "rescheduled"] },
        appointmentDate: { $gte: todayStr },
      }).sort({ appointmentDate: 1, appointmentTime: 1 });

      // Enrich with patient names and PG info
      const enriched = await attachPatientName(appointments);
      
      // Add PG information to each appointment
      const studentMap = new Map(students.map(s => [String(s.Identity).trim(), s]));
      const enrichedWithPg = enriched.map(appt => {
        const pgId = patientIdToPgMap.get(String(appt.patientId));
        const student = pgId ? studentMap.get(pgId) : null;
        return {
          ...appt,
          assignedPgId: pgId || null,
          assignedPgName: student?.name || null,
        };
      });

      return res.json({ success: true, appointments: enrichedWithPg });
    } else {
      // 🔥 FIX: PG/UG sees appointments for patients assigned to them
      const pgIdentity = String(req.user?.Identity || '').trim();
      if (!pgIdentity) {
        return res.status(400).json({ success: false, message: 'PG Identity not found on account' });
      }

      // Get all patient IDs assigned to this PG/UG from GeneralCase
      const GeneralCase = (await import('../models/GeneralCase.js')).default;
      const assignedCases = await GeneralCase.find(
        { assignedPgId: pgIdentity, specialistStatus: 'approved' },
        { patientId: 1 }
      ).lean();

      const assignedPatientIds = [...new Set(
        assignedCases.map((c) => String(c.patientId || '').trim()).filter(Boolean)
      )];

      // Fetch appointments for these patients OR appointments directly assigned to this PG
      const appointments = await Appointment.find({
        $or: [
          { patientId: { $in: assignedPatientIds } },
          { doctorId: pgIdentity },
          { assigned_pg_ug_id: pgIdentity },
          { pgDoctorId: pgIdentity },
        ],
        status: { $in: ["assigned", "in_progress", "rescheduled"] },
        appointmentDate: { $gte: todayStr },
      }).sort({ appointmentDate: 1, appointmentTime: 1 });

      const enriched = await attachPatientName(appointments);
      res.json({ success: true, appointments: enriched });
    }
  } catch (err) {
    console.error("❌ Error fetching PG appointments:", err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ================= DOCTOR – ALL ================= */
router.get("/all-appointments", auth, requireRole(["admin", "chief", "chief-doctor"]), async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    const enriched = await attachPatientName(appointments);
    res.json({ success: true, appointments: enriched });
  } catch {
    res.status(500).json({ success: false });
  }
});

/* ================= CHIEF - ASSIGNED DOCTORS OVERVIEW ================= */
router.get('/assigned-doctors/overview', auth, requireRole(['chief', 'chief-doctor']), async (req, res) => {
  try {
    const { PatientDetails } = await import('../models/patientDetails.js');
    const requesterDepartment = String(req.user?.department || '').trim();

    const assignedDoctors = await User.find(
      {
        role: 'doctor',
        createdBy: req.user._id,
        ...(requesterDepartment ? { department: requesterDepartment } : {}),
      },
      { _id: 1, name: 1, Identity: 1, email: 1, phone: 1, department: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    if (!assignedDoctors.length) {
      return res.json({
        success: true,
        doctors: [],
        appointments: [],
        analytics: [],
      });
    }

    // Query appointments by BOTH doctor _id and Identity formats
    const doctorQueryKeys = Array.from(
      new Set(
        assignedDoctors
          .flatMap((d) => [String(d._id), d.Identity ? String(d.Identity).trim() : null])
          .filter(Boolean)
      )
    );

    const appointments = await Appointment.find({ doctorId: { $in: doctorQueryKeys } })
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .lean();

    // Map both formats to canonical _id for consistent grouping
    const doctorKeyToCanonical = new Map();
    assignedDoctors.forEach((doctor) => {
      const idKey = String(doctor._id);
      doctorKeyToCanonical.set(idKey, idKey);
      if (doctor.Identity) {
        doctorKeyToCanonical.set(String(doctor.Identity).trim(), idKey);
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const activeStatuses = new Set(['pending', 'confirmed', 'rescheduled']);

    const doctorLookup = new Map(assignedDoctors.map((d) => [String(d._id), d]));
    const scheduledByDoctor = new Map();
    const patientVisitCountsByDoctor = new Map();
    const uniquePatientIds = new Set();

    appointments.forEach((appt) => {
      const appointmentDoctorKey = String(appt.doctorId || '').trim();
      const doctorKey = doctorKeyToCanonical.get(appointmentDoctorKey);
      if (!doctorKey || !doctorLookup.has(doctorKey)) return;

      const status = String(appt.status || '').toLowerCase();
      const isScheduled = activeStatuses.has(status) && appt.appointmentDate >= todayStr;

      if (isScheduled) {
        if (!scheduledByDoctor.has(doctorKey)) {
          scheduledByDoctor.set(doctorKey, []);
        }

        scheduledByDoctor.get(doctorKey).push({
          bookingId: appt.bookingId,
          patientId: appt.patientId,
          appointmentDate: appt.appointmentDate,
          appointmentTime: appt.appointmentTime,
          chiefComplaint: appt.chiefComplaint,
          status: appt.status,
        });
      }

      if (status !== 'cancelled' && appt.patientId) {
        const patientId = String(appt.patientId);
        uniquePatientIds.add(patientId);

        if (!patientVisitCountsByDoctor.has(doctorKey)) {
          patientVisitCountsByDoctor.set(doctorKey, new Map());
        }

        const doctorPatientCountMap = patientVisitCountsByDoctor.get(doctorKey);
        doctorPatientCountMap.set(patientId, (doctorPatientCountMap.get(patientId) || 0) + 1);
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

    const analytics = assignedDoctors.map((doctor) => {
      const doctorKey = String(doctor._id);
      const doctorPatientCountMap = patientVisitCountsByDoctor.get(doctorKey) || new Map();

      let malePatients = 0;
      let femalePatients = 0;
      let oldPatients = 0;
      let newPatients = 0;

      doctorPatientCountMap.forEach((visitCount, patientId) => {
        if (visitCount > 1) oldPatients += 1;
        else newPatients += 1;

        const p = patientMap.get(patientId);
        const gender = String(p?.gender || '').toLowerCase();
        if (gender === 'male') malePatients += 1;
        if (gender === 'female') femalePatients += 1;
      });

      const totalVisitedPatients = doctorPatientCountMap.size;
      const doctorScheduled = scheduledByDoctor.get(doctorKey) || [];

      return {
        doctorId: doctor._id,
        doctorName: doctor.name,
        doctorIdentity: doctor.Identity,
        department: doctor.department || '',
        totalVisitedPatients,
        malePatients,
        femalePatients,
        oldPatients,
        newPatients,
        scheduledAppointments: doctorScheduled.length,
      };
    });

    // Build flat scheduled appointment list with doctor metadata and patient names
    const scheduledAppointmentsFlat = [];
    scheduledByDoctor.forEach((list, doctorKey) => {
      const doctor = doctorLookup.get(doctorKey);
      list.forEach((appt) => {
        const patientInfo = patientMap.get(String(appt.patientId));
        scheduledAppointmentsFlat.push({
          ...appt,
          chiefComplaint: String(appt.chiefComplaint || patientInfo?.chiefComplaint || '').trim(),
          doctorId: doctor?._id,
          doctorName: doctor?.name || null,
          doctorIdentity: doctor?.Identity || null,
          doctorDepartment: doctor?.department || '',
          patientGender: patientInfo?.gender || null,
        });
      });
    });

    scheduledAppointmentsFlat.sort((a, b) => {
      if (a.appointmentDate !== b.appointmentDate) {
        return a.appointmentDate.localeCompare(b.appointmentDate);
      }
      return String(a.appointmentTime).localeCompare(String(b.appointmentTime));
    });

    res.json({
      success: true,
      doctors: assignedDoctors,
      appointments: scheduledAppointmentsFlat,
      analytics,
    });
  } catch (error) {
    console.error('Chief assigned overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load assigned doctor overview',
    });
  }
});


/* ================= REVISIT CYCLE ROUTES ================= */

// Get revisit appointments needing General Doctor approval
router.get("/revisit-approvals", auth, requireRole(["doctor", "chief-doctor"]), async (req, res) => {
  try {
    // Determine if the requester is a general doctor.
    // Primary check: department indicates general/general dentistry.
    // Fallback: the doctor's Identity may be listed as the generalDoctorId on ANY GeneralCase.
    let isGeneralDoctor = GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizeDepartment(req.user?.department));
    if (!isGeneralDoctor && String(req.user?.role || '').trim().toLowerCase() === 'doctor') {
      try {
        const { default: GeneralCase } = await import('../models/GeneralCase.js');
        const gcase = await GeneralCase.findOne({ generalDoctorId: String(req.user?.Identity || '').trim() }, { _id: 1 }).lean();
        if (gcase) {
          isGeneralDoctor = true;
        }
      } catch (e) {
        console.warn('General doctor fallback check failed:', e && e.message ? e.message : e);
      }
    }
    if (!isGeneralDoctor) {
      return res.status(403).json({ success: false, message: "Only general doctors can access revisit approvals." });
    }

    const appointments = await Appointment.find({
      needsGeneralApproval: true,
      status: "pending"
    }).sort({ createdAt: -1 });

    const enriched = await attachPatientName(appointments);
    res.json({ success: true, appointments: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// General Doctor rejects a revisit appointment -> sends it back to PG/UG
router.put("/:bookingId/revisit/reject", auth, requireRole(["doctor", "chief-doctor"]), async (req, res) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findOne({ bookingId: req.params.bookingId });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

    // Determine if requester is a general doctor using persisted flags first, then department fallback.
    let isGeneralDoctor = isGeneralDoctorUser(req.user);
    if (!isGeneralDoctor) {
      try {
        const { default: GeneralCase } = await import('../models/GeneralCase.js');
        const gcase = await GeneralCase.findOne({ patientId: appointment.patientId }, { generalDoctorId: 1 }).lean();
        if (gcase && String(gcase.generalDoctorId || '').trim() === String(req.user?.Identity || '').trim()) {
          isGeneralDoctor = true;
        }
      } catch (e) {
        console.warn('General doctor fallback check failed (reject):', e && e.message ? e.message : e);
      }
    }

    // Additional fallback: allow the supervisor doctor (createdBy) of the PG/UG who created the appointment
    if (!isGeneralDoctor) {
      try {
        const pgUser = await User.findById(appointment.doctorId).lean();
        if (pgUser && pgUser.createdBy && String(pgUser.createdBy) === String(req.user?._id) && !req.user?.isDeptDoctor) {
          isGeneralDoctor = true;
        }
      } catch (e) {
        console.warn('General doctor supervisor fallback failed (reject):', e && e.message ? e.message : e);
      }
    }

    if (!isGeneralDoctor) {
       return res.status(403).json({ success: false, message: "Only general doctors can reject revisit appointments." });
    }

    // Update status to revisit_pending_approval
    appointment.status = "revisit_pending_approval";
    appointment.needsGeneralApproval = false;
    appointment.needsPgApproval = true;
    await appointment.save();

    // 📧 Notify PG/UG - ACTION REQUIRED
    const studentOrQuery = [{ Identity: appointment.doctorId }];
    if (/^[0-9a-fA-F]{24}$/.test(appointment.doctorId)) {
      studentOrQuery.unshift({ _id: appointment.doctorId });
    }

    User.findOne({ $or: studentOrQuery }).then(student => {
       if (student && student.email) {
          sendEmail(
            student.email, 
            "Action Required: Revisit Appointment Rejected by General Doctor", 
            `
            <div style="font-family: Arial, sans-serif; line-height:1.6;">
              <h2>Revisit Appointment Rejected</h2>
              <p>Hello ${student.name || 'Doctor'},</p>
              <p>The revisit appointment for patient <b>${appointment.patientId}</b> has been <b>rejected</b> by the General Doctor.</p>
              <p><b>Booking ID:</b> ${appointment.bookingId}</p>
              ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ''}
              <p><b>ACTION REQUIRED:</b> Please review and confirm a new date or re-submit from your dashboard.</p>
              <p>Regards,<br/><b>SRM Dental College System</b></p>
            </div>
            `
          ).catch(err => console.error("PG revisit rejection notification failed:", err));
       }
    });

    // 📧 Notify Department Doctor - INFO ONLY
    if (appointment.supervising_dept_doctor_id) {
      User.findOne({ Identity: appointment.supervising_dept_doctor_id }).then(deptDoc => {
        if (deptDoc?.email) {
          sendEmail(
            deptDoc.email,
            "Revisit Appointment Rejected - Department Notification",
            `
            <div style="font-family: Arial, sans-serif; line-height:1.6;">
              <h2>Revisit Appointment Rejected</h2>
              <p>Hello Dr. ${deptDoc.name || 'Doctor'},</p>
              <p>A revisit appointment has been rejected by the General Doctor.</p>
              <ul>
                <li><b>Booking ID:</b> ${appointment.bookingId}</li>
                <li><b>Patient:</b> ${appointment.patientId}</li>
                ${reason ? `<li><b>Reason:</b> ${reason}</li>` : ''}
                <li><b>Status:</b> Pending PG/UG confirmation</li>
              </ul>
              <p>Regards,<br/><b>SRM Dental College System</b></p>
            </div>
            `
          ).catch(err => console.error("Department doctor revisit rejection notification failed:", err));
        }
      });
    }

    // Audit the rejection decision
    try {
      let rejectReason = 'general_unknown';
      if (GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizeDepartment(req.user?.department))) rejectReason = 'general_by_department';
      else {
        try {
          const { default: GeneralCase } = await import('../models/GeneralCase.js');
          const gcase = await GeneralCase.findOne({ patientId: appointment.patientId }, { generalDoctorId: 1 }).lean();
          if (gcase && String(gcase.generalDoctorId || '').trim() === String(req.user?.Identity || '').trim()) rejectReason = 'general_by_generalCase';
        } catch (e) {}
        if (rejectReason === 'general_unknown') {
          try {
            const pgUser = await User.findById(appointment.doctorId).lean();
            if (pgUser && pgUser.createdBy && String(pgUser.createdBy) === String(req.user?._id)) rejectReason = 'general_by_supervisor';
          } catch (e) {}
        }
      }

      const auditDoc = {
        bookingId: appointment.bookingId,
        action: 'revisit_reject',
        actor: { userId: String(req.user?._id || ''), identity: String(req.user?.Identity || ''), role: String(req.user?.role || ''), name: req.user?.name || '' },
        chosenDoctor: { id: String(req.user?._id || ''), identity: String(req.user?.Identity || ''), name: req.user?.name || '' },
        reason: rejectReason,
        previousStatus: null,
        newStatus: appointment.status,
        meta: {},
      };
      try { await AuditLog.create(auditDoc); } catch (e) { console.warn('AuditLog.create failed (reject):', e && e.message ? e.message : e); }
      try { const outDir = path.join(process.cwd(), 'server', 'audit-output'); if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true }); const logPath = path.join(outDir, 'approval-audit.log'); fs.appendFileSync(logPath, JSON.stringify({ ...auditDoc, timestamp: new Date().toISOString() }) + '\n'); } catch (e) { console.warn('Failed to append approval audit file (reject):', e && e.message ? e.message : e); }
    } catch (e) { console.warn('Failed to write audit for revisit reject:', e && e.message ? e.message : e); }

    res.json({ success: true, message: "Revisit appointment rejected and sent back to PG/UG.", appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PG/UG "approves" (re-submits) the revisit appointment back to General Doctor
router.put("/:bookingId/revisit/pg-approve", auth, requireRole(["pg", "ug"]), async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ bookingId: req.params.bookingId });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

    if (!appointment.needsPgApproval) {
       return res.status(400).json({ success: false, message: "This appointment does not require your approval." });
    }

    appointment.needsPgApproval = false;
    appointment.needsGeneralApproval = true;
    await appointment.save();

    res.json({ success: true, message: "Revisit appointment re-submitted to General Doctor.", appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// General Doctor approves revisit appointment -> closes the cycle
router.put("/:bookingId/revisit/approve", auth, requireRole(["doctor", "chief-doctor"]), async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ bookingId: req.params.bookingId });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

    // Determine if requester is a general doctor using persisted flags first, then department fallback.
    let isGeneralDoctor = isGeneralDoctorUser(req.user);
    if (!isGeneralDoctor) {
      try {
        const { default: GeneralCase } = await import('../models/GeneralCase.js');
        const gcase = await GeneralCase.findOne({ patientId: appointment.patientId }, { generalDoctorId: 1 }).lean();
        if (gcase && String(gcase.generalDoctorId || '').trim() === String(req.user?.Identity || '').trim()) {
          isGeneralDoctor = true;
        }
      } catch (e) {
        console.warn('General doctor fallback check failed (approve):', e && e.message ? e.message : e);
      }
    }

    // Additional fallback: allow the supervisor doctor (createdBy) of the PG/UG who created the appointment
    if (!isGeneralDoctor) {
      try {
        const pgUser = await User.findById(appointment.doctorId).lean();
        if (pgUser && pgUser.createdBy && String(pgUser.createdBy) === String(req.user?._id) && !req.user?.isDeptDoctor) {
          isGeneralDoctor = true;
        }
      } catch (e) {
        console.warn('General doctor supervisor fallback failed (approve):', e && e.message ? e.message : e);
      }
    }

    if (!isGeneralDoctor) {
      return res.status(403).json({ success: false, message: "Only general doctors can approve revisit appointments." });
    }

    if (appointment.status !== "revisit_scheduled") {
      return res.status(400).json({ success: false, message: "Appointment is not in revisit_scheduled status." });
    }

    // Update status to revisit_approved then closed
    appointment.status = "revisit_approved";
    appointment.needsGeneralApproval = false;
    appointment.needsPgApproval = false;
    await appointment.save();

    // Immediately close the cycle
    appointment.status = "closed";
    await appointment.save();

    // 📧 Notify Patient with revisit date
    const patientEmail = await resolvePatientEmail(appointment.patientId, appointment.patientEmail);
    if (patientEmail) {
      sendEmail(
        patientEmail,
        "Revisit Appointment Confirmed",
        `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>Your Revisit Appointment is Confirmed</h2>
          <p>Dear Patient,</p>
          <p>Your revisit appointment has been approved by the doctor.</p>
          <ul>
            <li><b>Booking ID:</b> ${appointment.bookingId}</li>
            <li><b>Revisit Date:</b> ${appointment.revisitDate || appointment.appointmentDate}</li>
            <li><b>Time:</b> ${appointment.appointmentTime}</li>
          </ul>
          <p>Please arrive 10 minutes before your scheduled time.</p>
          <p>Regards,<br/><b>SRM Dental College</b></p>
        </div>
        `
      ).catch(err => console.error("Patient revisit approval notification failed:", err));
    }

    // 📧 Notify PG/UG
    const studentOrQuery = [{ Identity: appointment.doctorId }];
    if (/^[0-9a-fA-F]{24}$/.test(appointment.doctorId)) {
      studentOrQuery.unshift({ _id: appointment.doctorId });
    }

    User.findOne({ $or: studentOrQuery }).then(student => {
      if (student && student.email) {
        sendEmail(
          student.email,
          "Revisit Appointment Approved",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Revisit Appointment Approved</h2>
            <p>Hello ${student.name || 'Doctor'},</p>
            <p>The revisit appointment for patient <b>${appointment.patientId}</b> has been <b>approved</b> by the General Doctor.</p>
            <p><b>Booking ID:</b> ${appointment.bookingId}</p>
            <p><b>Status:</b> Closed - Cycle Complete</p>
            <p>Regards,<br/><b>SRM Dental College System</b></p>
          </div>
          `
        ).catch(err => console.error("PG revisit approval notification failed:", err));
      }
    });

    // Audit the approval
    try {
      let approveReason = 'general_unknown';
      if (GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizeDepartment(req.user?.department))) approveReason = 'general_by_department';
      else {
        try {
          const { default: GeneralCase } = await import('../models/GeneralCase.js');
          const gcase = await GeneralCase.findOne({ patientId: appointment.patientId }, { generalDoctorId: 1 }).lean();
          if (gcase && String(gcase.generalDoctorId || '').trim() === String(req.user?.Identity || '').trim()) approveReason = 'general_by_generalCase';
        } catch (e) {}
        if (approveReason === 'general_unknown') {
          try {
            const pgUser = await User.findById(appointment.doctorId).lean();
            if (pgUser && pgUser.createdBy && String(pgUser.createdBy) === String(req.user?._id)) approveReason = 'general_by_supervisor';
          } catch (e) {}
        }
      }

      const auditDoc = {
        bookingId: appointment.bookingId,
        action: 'revisit_approve',
        actor: { userId: String(req.user?._id || ''), identity: String(req.user?.Identity || ''), role: String(req.user?.role || ''), name: req.user?.name || '' },
        chosenDoctor: { id: String(req.user?._id || ''), identity: String(req.user?.Identity || ''), name: req.user?.name || '' },
        reason: approveReason,
        previousStatus: 'revisit_scheduled',
        newStatus: 'closed',
        meta: {},
      };
      try { await AuditLog.create(auditDoc); } catch (e) { console.warn('AuditLog.create failed (revisit approve):', e && e.message ? e.message : e); }
      try { const outDir = path.join(process.cwd(), 'server', 'audit-output'); if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true }); const logPath = path.join(outDir, 'approval-audit.log'); fs.appendFileSync(logPath, JSON.stringify({ ...auditDoc, timestamp: new Date().toISOString() }) + '\n'); } catch (e) { console.warn('Failed to append approval audit file (revisit approve):', e && e.message ? e.message : e); }
    } catch (e) { console.warn('Failed to write audit for revisit approve:', e && e.message ? e.message : e); }

    res.json({ success: true, message: "Revisit appointment approved and cycle closed.", appointment });
  } catch (err) {
    console.error("Revisit approve error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PG/UG confirms revisit date after rejection
router.put("/:bookingId/revisit/confirm", auth, requireRole(["pg", "ug"]), async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ bookingId: req.params.bookingId });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

    if (appointment.status !== "revisit_pending_approval") {
      return res.status(400).json({ success: false, message: "Appointment is not pending your confirmation." });
    }

    // Re-submit to general doctor for approval
    appointment.status = "revisit_scheduled";
    appointment.needsPgApproval = false;
    appointment.needsGeneralApproval = true;
    await appointment.save();

    // 📧 Notify General Doctor
    const supervisor = await User.findById(req.user.createdBy).lean();
    if (supervisor?.email) {
      sendEmail(
        supervisor.email,
        "Action Required: Revisit Date Confirmed by PG/UG",
        `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>Revisit Date Confirmed</h2>
          <p>Hello Dr. ${supervisor.name || 'Doctor'},</p>
          <p>Your assigned PG/UG <b>${req.user.name}</b> has confirmed the revisit date for appointment <b>${appointment.bookingId}</b>.</p>
          <ul>
            <li><b>Patient:</b> ${appointment.patientId}</li>
            <li><b>Revisit Date:</b> ${appointment.revisitDate || appointment.appointmentDate}</li>
            <li><b>Time:</b> ${appointment.appointmentTime}</li>
          </ul>
          <p><b>ACTION REQUIRED:</b> Please review and approve this revisit request in your dashboard.</p>
          <p>Regards,<br/><b>SRM Dental College System</b></p>
        </div>
        `
      ).catch(err => console.error("Supervisor revisit confirm notification failed:", err));
    }

    res.json({ success: true, message: "Revisit date confirmed and sent back to General Doctor for approval.", appointment });
  } catch (err) {
    console.error("Revisit confirm error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PG/UG creates a new revisit appointment
router.post("/:bookingId/set-revisit", auth, requireRole(["pg", "ug"]), async (req, res) => {
  try {
    const { revisitDate } = req.body;
    
    if (!revisitDate) {
      return res.status(400).json({ success: false, message: "Revisit date is required" });
    }

    const pgIdentity = String(req.user?.Identity || '').trim();
    if (!pgIdentity) {
      return res.status(400).json({ success: false, message: 'PG Identity not found' });
    }

    const originalAppointment = await Appointment.findOne({ bookingId: req.params.bookingId });
    if (!originalAppointment) {
      return res.status(404).json({ success: false, message: "Original appointment not found" });
    }

    // Get supervisor (general doctor)
    const supervisor = await User.findById(req.user.createdBy).lean();

    // Create NEW appointment for revisit
    const revisitBookingId = generateBookingId();
    const revisitAppointment = new Appointment({
      bookingId: revisitBookingId,
      patientId: originalAppointment.patientId,
      patientEmail: originalAppointment.patientEmail,
      doctorId: originalAppointment.doctorId, // Same PG/UG
      assignedPgUgId: originalAppointment.assignedPgUgId || originalAppointment.assigned_pg_ug_id || pgIdentity,
      assigned_pg_ug_id: originalAppointment.assigned_pg_ug_id || originalAppointment.assignedPgUgId || pgIdentity,
      supervisingDeptDoctorId: originalAppointment.supervisingDeptDoctorId || originalAppointment.supervising_dept_doctor_id,
      supervising_dept_doctor_id: originalAppointment.supervising_dept_doctor_id || originalAppointment.supervisingDeptDoctorId,
      generalDoctorId: originalAppointment.generalDoctorId || supervisor?.Identity || '',
      chiefComplaint: originalAppointment.chiefComplaint + " (Revisit)",
      appointmentDate: revisitDate,
      appointmentTime: originalAppointment.appointmentTime,
      revisitDate: revisitDate,
      parentBookingId: originalAppointment.bookingId,
      status: "revisit_scheduled",
      needsGeneralApproval: true,
      needsPgApproval: false,
    });

    await revisitAppointment.save();

    // Update original appointment to completed
    originalAppointment.status = "completed";
    await originalAppointment.save();

    // 📧 Notify General Doctor - ACTION REQUIRED
    if (supervisor?.email) {
      sendEmail(
        supervisor.email,
        "Action Required: New Revisit Appointment Created",
        `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>New Revisit Appointment Needs Your Approval</h2>
          <p>Hello Dr. ${supervisor.name || 'Doctor'},</p>
          <p>Your assigned PG/UG <b>${req.user.name}</b> has created a new revisit appointment.</p>
          <ul>
            <li><b>Original Booking ID:</b> ${originalAppointment.bookingId}</li>
            <li><b>New Revisit Booking ID:</b> ${revisitBookingId}</li>
            <li><b>Patient:</b> ${originalAppointment.patientId}</li>
            <li><b>Revisit Date:</b> ${revisitDate}</li>
            <li><b>Time:</b> ${originalAppointment.appointmentTime}</li>
          </ul>
          <p><b>ACTION REQUIRED:</b> Please review and approve/reject this revisit request in your dashboard.</p>
          <p>Regards,<br/><b>SRM Dental College System</b></p>
        </div>
        `
      ).catch(err => console.error("Supervisor revisit notification failed:", err));
    }

    // 📧 Notify Department Doctor - INFO ONLY
    if (originalAppointment.supervising_dept_doctor_id) {
      User.findOne({ Identity: originalAppointment.supervising_dept_doctor_id }).then(deptDoc => {
        if (deptDoc?.email && String(deptDoc._id) !== String(supervisor?._id)) {
          sendEmail(
            deptDoc.email,
            "New Revisit Appointment Created - Department Notification",
            `
            <div style="font-family: Arial, sans-serif; line-height:1.6;">
              <h2>New Revisit Appointment Created</h2>
              <p>Hello Dr. ${deptDoc.name || 'Doctor'},</p>
              <p>A new revisit appointment has been created for patient <b>${originalAppointment.patientId}</b>.</p>
              <ul>
                <li><b>Original Booking ID:</b> ${originalAppointment.bookingId}</li>
                <li><b>New Revisit Booking ID:</b> ${revisitBookingId}</li>
                <li><b>Revisit Date:</b> ${revisitDate}</li>
                <li><b>Status:</b> REVISIT_SCHEDULED - Awaiting General Doctor Approval</li>
              </ul>
              <p>Regards,<br/><b>SRM Dental College System</b></p>
            </div>
            `
          ).catch(err => console.error("Department doctor revisit notification failed:", err));
        }
      });
    }

    return res.json({
      success: true,
      message: "Revisit appointment created successfully. General doctor approval required.",
      appointment: revisitAppointment,
      bookingId: revisitBookingId,
    });
  } catch (err) {
    console.error("Set revisit error:", err);
    res.status(500).json({ success: false, message: "Failed to create revisit appointment" });
  }
});

/* ================= APPROVE ================= */
router.put("/:bookingId/approve", auth, requireRole(["pg", "ug", "doctor", "chief-doctor"]), async (req, res) => {
  try {
    const requesterRole = String(req.user?.role || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
    const isPgRequester = requesterRole === 'pg' || requesterRole === 'ug';
    
    const userId = String(req.user?._id || "").trim();
    const userIdentity = String(req.user?.Identity || "").trim();
    
    const appointment = await Appointment.findOne({ bookingId: req.params.bookingId });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

    // Determine if requester is a general doctor: persisted flag first, then department or assignment fallbacks.
    let isGeneralDoctor = isGeneralDoctorUser(req.user);
    if (!isGeneralDoctor) {
      try {
        const { default: GeneralCase } = await import('../models/GeneralCase.js');
        const gcase = await GeneralCase.findOne({ patientId: appointment.patientId }, { generalDoctorId: 1 }).lean();
        if (gcase && String(gcase.generalDoctorId || '').trim() === String(req.user?.Identity || '').trim()) {
          isGeneralDoctor = true;
        }
      } catch (e) {
        console.warn('General doctor fallback check failed (approve-route):', e && e.message ? e.message : e);
      }
    }

    // Additional fallback: allow the supervisor doctor (createdBy) of the PG/UG who created the appointment
    if (!isGeneralDoctor) {
      try {
        const pgUser = await User.findById(appointment.doctorId).lean();
        if (pgUser && pgUser.createdBy && String(pgUser.createdBy) === String(req.user?._id)) {
          isGeneralDoctor = true;
        }
      } catch (e) {
        console.warn('General doctor supervisor fallback failed (approve-route):', e && e.message ? e.message : e);
      }
    }
    
    // 🔥 FLOW FIX: General doctors can ONLY approve revisit appointments
    if (isGeneralDoctor && !isPgRequester) {
      if (!appointment.needsGeneralApproval) {
        return res.status(403).json({
          success: false,
          message: "General Doctors do not approve regular appointments. They are auto-confirmed when patients book.",
        });
      }
      
      // Approving a revisit appointment
      appointment.needsGeneralApproval = false;
      appointment.status = "revisit_approved";
      await appointment.save();
      
      // Notify patient
      const patientEmail = await resolvePatientEmail(appointment.patientId, appointment.patientEmail);
      if (patientEmail) {
        await sendEmail(
          patientEmail,
          "Revisit Appointment Confirmed",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Your Revisit Appointment is Confirmed</h2>
            <p>Dear Patient,</p>
            <p>Your revisit appointment has been confirmed by the doctor.</p>
            <ul>
              <li><b>Booking ID:</b> ${appointment.bookingId}</li>
              <li><b>Date:</b> ${appointment.appointmentDate}</li>
              <li><b>Time:</b> ${appointment.appointmentTime}</li>
            </ul>
            <p>Thank you,<br/><b>SRM Dental College</b></p>
          </div>
          `
        );
      }
      
      return res.json({ success: true, message: "Revisit appointment approved and patient notified.", appointment });
    }
    const requesterKeys = Array.from(new Set([userId, userIdentity].filter(Boolean)));
    const primaryRequesterId = userId || userIdentity;

    if (!primaryRequesterId) {
      return res.status(400).json({ success: false, message: "Approver identity missing" });
    }

    let actingDoctorId = primaryRequesterId;
    let actingDoctorKeys = requesterKeys;
    let actingDoctorDisplayName = req.user?.name || req.user?.Identity || "Doctor";
    let auditReason = 'unknown';
    let assignment = null;
    let doctorUser = null;

    if (isPgRequester) {
      const pgIdentity = String(req.user?.Identity || '').trim();
      if (!pgIdentity) {
        return res.status(400).json({
          success: false,
          message: 'PG Identity not found on account',
        });
      }

      const { default: GeneralCase } = await import('../models/GeneralCase.js');
      assignment = await GeneralCase.findOne({
        patientId: appointment.patientId,
        assignedPgId: pgIdentity,
        specialistStatus: 'approved',
      })
        .sort({ pgAssignedAt: -1, createdAt: -1 })
        .lean();

      // Fallbacks: some bookings store PG link in appointment fields (assigned_pg_ug_id, pgDoctorId)
      const fallbackMatches = [
        String(appointment.assigned_pg_ug_id || '').trim(),
        String(appointment.pgDoctorId || '').trim(),
      ].filter(Boolean);

      if (!assignment?._id && !fallbackMatches.includes(pgIdentity)) {
        return res.status(403).json({
          success: false,
          message: 'You can only approve appointments for patients assigned to you.',
        });
      }

      const assignedDoctorKey = String(appointment.doctorId || '').trim();
      if (!assignedDoctorKey) {
        return res.status(400).json({
          success: false,
          message: 'This appointment has no assigned doctor and cannot be approved.',
        });
      }

      const doctorOrQuery = [{ Identity: assignedDoctorKey }];
      if (/^[0-9a-fA-F]{24}$/.test(assignedDoctorKey)) {
        doctorOrQuery.unshift({ _id: assignedDoctorKey });
      }

      doctorUser = await User.findOne(
        { $or: doctorOrQuery },
        { name: 1, Identity: 1 }
      ).lean();

      const doctorKeys = doctorUser ? getDoctorIdentityKeys(doctorUser) : [];
      actingDoctorId = doctorUser?._id ? String(doctorUser._id).trim() : assignedDoctorKey;
      actingDoctorKeys = Array.from(new Set([assignedDoctorKey, actingDoctorId, ...doctorKeys].filter(Boolean)));
      actingDoctorDisplayName = doctorUser?.name || assignedDoctorKey || 'Doctor';
    }

    // Determine audit reason and chosen doctor metadata
    // (decide reason before saving so it is recorded)
    if (isPgRequester) {
      const pgIdentity = String(req.user?.Identity || '').trim();
      if (assignment && assignment._id) {
        auditReason = 'pg_assignment_match';
      } else {
        const fallbackMatches = [String(appointment.assigned_pg_ug_id || '').trim(), String(appointment.pgDoctorId || '').trim()].filter(Boolean);
        if (fallbackMatches.includes(pgIdentity)) {
          auditReason = 'pg_fallback_assignment';
        } else {
          auditReason = 'pg_direct_approval';
        }
      }
    } else {
      if (isGeneralDoctor) {
        if (GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizeDepartment(req.user?.department))) {
          auditReason = 'general_by_department';
        } else {
          try {
            const { default: GeneralCase } = await import('../models/GeneralCase.js');
            const gcase = await GeneralCase.findOne({ patientId: appointment.patientId }, { generalDoctorId: 1 }).lean();
            if (gcase && String(gcase.generalDoctorId || '').trim() === String(req.user?.Identity || '').trim()) {
              auditReason = 'general_by_generalCase';
            }
          } catch (e) {
            // ignore
          }
          if (auditReason === 'unknown') {
            try {
              const pgUser = await User.findById(appointment.doctorId).lean();
              if (pgUser && pgUser.createdBy && String(pgUser.createdBy) === String(req.user?._id)) {
                auditReason = 'general_by_supervisor';
              }
            } catch (e) {
              // ignore
            }
          }
        }
      } else if (appointment.doctorId && actingDoctorKeys.includes(String(appointment.doctorId))) {
        auditReason = 'assigned_doctor_match';
      }
    }

    // Avoid re-sending approval email if already confirmed by this doctor
    if (appointment.status === "confirmed" && actingDoctorKeys.includes(String(appointment.approvedDoctorId || ""))) {
      return res.json({ success: true, appointment, emailSent: false, message: "Appointment already approved" });
    }

    // If appointment is already assigned, only that doctor can approve
    if (!isPgRequester && appointment.doctorId && !actingDoctorKeys.includes(String(appointment.doctorId))) {
      return res.status(403).json({
        success: false,
        message: "This appointment is assigned to a different doctor.",
      });
    }

    // Ensure the doctor doesn't already have a conflicting appointment at the same slot
    const conflict = await Appointment.findOne({
      bookingId: { $ne: appointment.bookingId },
      doctorId: { $in: actingDoctorKeys },
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      status: { $ne: "cancelled" },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: "You already have an appointment in this time slot.",
      });
    }

    const previousStatus = String(appointment.status || '').trim().toLowerCase();
    appointment.status = isPgRequester && previousStatus === "assigned" ? "in_progress" : "confirmed";
    
    if (appointment.needsGeneralApproval && isGeneralDoctor) {
      appointment.needsGeneralApproval = false;
    }
    if (!isPgRequester) {
      appointment.doctorId = appointment.doctorId || actingDoctorId;
    }
    appointment.approvedDoctorId = actingDoctorId;
    // Sanitize legacy/invalid rescheduleRequest.requestStatus values to avoid schema enum validation errors
    try {
      const validReqStatuses = new Set(['pending', 'approved', 'rejected']);
      if (appointment.rescheduleRequest && appointment.rescheduleRequest.requestStatus && !validReqStatuses.has(String(appointment.rescheduleRequest.requestStatus))) {
        appointment.rescheduleRequest.requestStatus = null;
      }
    } catch (e) {
      // ignore sanitation errors and proceed to save; logging added for visibility
      console.warn('Reschedule request sanitation failed:', e && e.message ? e.message : e);
    }

    // Create an audit record for this approval decision (best-effort)
    try {
      const intendedNewStatus = isPgRequester && previousStatus === "assigned" ? "in_progress" : "confirmed";

      const auditDoc = {
        bookingId: appointment.bookingId,
        action: 'approve',
        actor: {
          userId: String(req.user?._id || ''),
          identity: String(req.user?.Identity || ''),
          role: String(req.user?.role || ''),
          name: req.user?.name || '',
        },
        chosenDoctor: {
          id: String(actingDoctorId || ''),
          identity: doctorUser?.Identity || '',
          name: actingDoctorDisplayName || '',
        },
        reason: auditReason,
        previousStatus,
        newStatus: intendedNewStatus,
        meta: { actingDoctorKeys },
      };

      // persist to DB
      try {
        await AuditLog.create(auditDoc);
      } catch (e) {
        console.warn('AuditLog.create failed:', e && e.message ? e.message : e);
      }

      // append to a local audit file for easy inspection by the automation
      try {
        const outDir = path.join(process.cwd(), 'server', 'audit-output');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const logPath = path.join(outDir, 'approval-audit.log');
        fs.appendFileSync(logPath, JSON.stringify({ ...auditDoc, timestamp: new Date().toISOString() }) + '\n');
      } catch (e) {
        console.warn('Failed to append approval audit file:', e && e.message ? e.message : e);
      }
    } catch (e) {
      console.warn('Failed to build approval audit record:', e && e.message ? e.message : e);
    }

    await appointment.save();

    const doctorDisplayName = actingDoctorDisplayName;
    const patientEmail = isValidEmail(appointment.patientEmail)
      ? appointment.patientEmail
      : await getPatientEmail(appointment.patientId);

    if (!isValidEmail(patientEmail)) {
      return res.status(400).json({
        success: false,
        message: "Patient email not found. Please update patient profile email.",
      });
    }

    sendEmail(
      patientEmail,
      "Appointment Approved – SRM Dental College",
      `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>Appointment Approved</h2>

        <p>Dear Patient,</p>

        <p>Your appointment has been <b>approved</b> by <b>${doctorDisplayName}</b>.</p>

        <table border="1" cellpadding="8" cellspacing="0">
          <tr>
            <td><b>Booking ID</b></td>
            <td>${appointment.bookingId}</td>
          </tr>
          <tr>
            <td><b>Date</b></td>
            <td>${appointment.appointmentDate}</td>
          </tr>
          <tr>
            <td><b>Time</b></td>
            <td>${appointment.appointmentTime}</td>
          </tr>
          <tr>
            <td><b>Status</b></td>
            <td>CONFIRMED</td>
          </tr>
        </table>

        <p>Regards,<br/>
        <b>SRM Dental College</b></p>
      </div>
      `
    ).catch((err) => console.error('Approve email failed:', err));

    res.json({ success: true, appointment, emailSent: true });
  } catch (err) {
    console.error('Approve route error:', err);
    res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
});


/* ================= CANCEL WITH EMAIL ================= */
router.put("/:bookingId/cancel", async (req, res) => {
  try {
    // 🔥 Fetch appointment first (needed for email)
    const appointment = await Appointment.findOne({
      bookingId: req.params.bookingId,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // 🔥 Update status
    appointment.status = "cancelled";
    await appointment.save();

    // 🔥 SEND CANCELLATION EMAIL
    sendEmail(
      appointment.patientEmail,
      "Appointment Cancelled – SRM Dental College",
      `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>Appointment Cancelled</h2>

        <p>Dear Patient,</p>

        <p>We would like to inform you that your appointment has been <b>cancelled</b>.</p>

        <table border="1" cellpadding="8" cellspacing="0">
          <tr>
            <td><b>Booking ID</b></td>
            <td>${appointment.bookingId}</td>
          </tr>
          <tr>
            <td><b>Date</b></td>
            <td>${appointment.appointmentDate}</td>
          </tr>
          <tr>
            <td><b>Time</b></td>
            <td>${appointment.appointmentTime}</td>
          </tr>
          <tr>
            <td><b>Chief Complaint</b></td>
            <td>${appointment.chiefComplaint}</td>
          </tr>
          <tr>
            <td><b>Status</b></td>
            <td>CANCELLED</td>
          </tr>
        </table>

        <p>If this cancellation was unintentional, you may book a new appointment at your convenience.</p>

        <p>Regards,<br/>
        <b>SRM Dental College</b></p>
      </div>
      `
    ).catch((err) => console.error('Cancel email failed:', err));

    res.json({
      success: true,
      appointment,
    });
  } catch (err) {
    console.error("Cancel appointment error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while cancelling appointment",
    });
  }
});

/* ================= ✅ RESCHEDULE FIX ================= */
router.put("/:bookingId/reschedule", auth, requireRole(["doctor", "chief-doctor", "pg", "ug"]), async (req, res) => {
  try {
    const appointmentDate = req.body.appointmentDate || req.body.proposedDate;
    const appointmentTime = req.body.appointmentTime || req.body.proposedTime;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: "Missing appointmentDate or appointmentTime",
      });
    }

    if (!isAllowedAppointmentTime(appointmentTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment time. Please select one of the available slots.",
      });
    }

    const normalizedAppointmentTime = normalizeAppointmentTime(appointmentTime);

    const requesterRole = String(req.user?.role || '').trim().toLowerCase();
    const isPgRequester = requesterRole === 'pg' || requesterRole === 'ug';
    
    const appointment = await Appointment.findOne({ bookingId: req.params.bookingId });
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // 🔒 Restriction: General Doctors don't manually approve/reschedule EXCEPT for revisits
    const isGeneralDoctor = GENERAL_DOCTOR_DEPARTMENT_KEYS.has(normalizeDepartment(req.user?.department));
    if (isGeneralDoctor && !isPgRequester && !appointment.needsGeneralApproval) {
      return res.status(403).json({
        success: false,
        message: "General Doctors do not need to manually approve or reschedule regular appointments.",
      });
    }
    const requesterKeys = getDoctorIdentityKeys(req.user);
    const primaryRequesterKey = requesterKeys[0] || '';

    // Only upcoming appointments can be rescheduled
    const todayStr = new Date().toISOString().split('T')[0];
    if (String(appointment.appointmentDate || '') < todayStr) {
      return res.status(400).json({
        success: false,
        message: "Only upcoming appointments can be rescheduled.",
      });
    }

    // Authorization:
    // - Doctors can reschedule only appointments assigned to them.
    // - PGs can reschedule only appointments for patients assigned to them (via GeneralCase.assignedPgId).
    if (isPgRequester) {
      const pgIdentity = String(req.user?.Identity || '').trim();
      if (!pgIdentity) {
        return res.status(400).json({
          success: false,
          message: 'PG Identity not found on account',
        });
      }

      const { default: GeneralCase } = await import('../models/GeneralCase.js');
      const assignment = await GeneralCase.findOne({
        patientId: appointment.patientId,
        assignedPgId: pgIdentity,
        specialistStatus: 'approved',
      })
        .sort({ pgAssignedAt: -1, createdAt: -1 })
        .lean();

      // Fallbacks: accept appointment-level assigned_pg_ug_id or pgDoctorId as valid linkage
      const fallbackMatches = [
        String(appointment.assigned_pg_ug_id || '').trim(),
        String(appointment.pgDoctorId || '').trim(),
      ].filter(Boolean);

      if (!assignment?._id && !fallbackMatches.includes(pgIdentity)) {
        return res.status(403).json({
          success: false,
          message: 'You can only reschedule appointments for patients assigned to you.',
        });
      }

      // 🔥 PG RESCHEDULE: Create a request for doctor approval instead of directly rescheduling
      appointment.rescheduleRequest = {
        requestedBy: pgIdentity,
        requestedByName: req.user?.name || pgIdentity,
        proposedDate: appointmentDate,
        proposedTime: normalizedAppointmentTime,
        requestStatus: 'pending',
        requestedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
      };
      appointment.status = 'reschedule_requested';

      await appointment.save();

      // 📧 DUAL NOTIFICATION: Notify BOTH Supervisor (action) AND Department Doctor (info)
      if (req.user.createdBy) {
        // Get supervisor (general doctor) and department doctor
        const supervisorPromise = User.findById(req.user.createdBy).lean();
        const departmentDoctorPromise = User.findOne(
          { role: 'doctor', department: req.user.department },
          { email: 1, name: 1 }
        ).lean();

        Promise.all([supervisorPromise, departmentDoctorPromise]).then(([supervisor, departmentDoctor]) => {
          // Send action-required email to GENERAL DOCTOR (Supervisor)
          if (supervisor && supervisor.email && !isGeneralDoctorUser(supervisor)) {
            sendEmail(
              supervisor.email,
              "Action Required: Reschedule Request Pending Approval",
              `
              <div style="font-family: Arial, sans-serif; line-height:1.6;">
                <h2>Reschedule Request Pending Your Approval</h2>
                <p>Hello Dr. ${supervisor.name || 'Doctor'},</p>
                <p>Your assigned student <b>${req.user.name || pgIdentity}</b> has requested to reschedule an appointment for patient <b>${appointment.patientId}</b>.</p>
                <ul>
                  <li><b>Booking ID:</b> ${appointment.bookingId}</li>
                  <li><b>Current Date & Time:</b> ${appointment.appointmentDate} at ${appointment.appointmentTime}</li>
                  <li><b>Requested Date:</b> ${appointmentDate}</li>
                  <li><b>Requested Time:</b> ${normalizedAppointmentTime}</li>
                </ul>
                <p><b>ACTION REQUIRED:</b> Please log in to your dashboard to approve or reject this request.</p>
                <p>Regards,<br/><b>SRM Dental College System</b></p>
              </div>
              `
            ).catch(err => console.error("Supervisor notification failed:", err));
          }

          // Send info-only email to DEPARTMENT DOCTOR (oversight)
          if (departmentDoctor && departmentDoctor.email && String(departmentDoctor._id || '') !== String(supervisor?._id || '')) {
            sendEmail(
              departmentDoctor.email,
              "Reschedule Request Notification - Department Oversight",
              `
              <div style="font-family: Arial, sans-serif; line-height:1.6;">
                <h2>Reschedule Request Notification</h2>
                <p>Hello Dr. ${departmentDoctor.name || 'Doctor'},</p>
                <p>This is an oversight notification. Your department's PG/UG <b>${req.user.name || pgIdentity}</b> has requested to reschedule an appointment.</p>
                <ul>
                  <li><b>Booking ID:</b> ${appointment.bookingId}</li>
                  <li><b>Patient:</b> ${appointment.patientId}</li>
                  <li><b>Requested Date:</b> ${appointmentDate}</li>
                  <li><b>Requested Time:</b> ${normalizedAppointmentTime}</li>
                </ul>
                <p>The supervising general doctor will review and approve/reject this request.</p>
                <p>Regards,<br/><b>SRM Dental College System</b></p>
              </div>
              `
            ).catch(err => console.error("Department doctor notification failed:", err));
          }
        });
      }

      return res.json({
        success: true,
        message: 'Reschedule request submitted. Waiting for doctor approval.',
        appointment,
        requiresApproval: true,
      });
    } else {
      // Only the assigned doctor can reschedule
      if (!appointment.doctorId || !requesterKeys.includes(String(appointment.doctorId))) {
        return res.status(403).json({
          success: false,
          message: "You can only reschedule appointments assigned to you.",
        });
      }
    }

    // 🔒 Prevent rescheduling into a slot where this doctor is already booked
    const assignedDoctorId = String(appointment.doctorId || '').trim();
    if (!assignedDoctorId) {
      return res.status(400).json({
        success: false,
        message: 'This appointment has no assigned doctor and cannot be rescheduled.',
      });
    }

    const doctorConflict = await Appointment.findOne({
      appointmentDate,
      appointmentTime: normalizedAppointmentTime,
      doctorId: assignedDoctorId,
      status: { $ne: "cancelled" },
      bookingId: { $ne: req.params.bookingId },
    });

    if (doctorConflict) {
      return res.status(409).json({
        success: false,
        message: "You already have an appointment in this time slot.",
      });
    }

    // 🔒 Prevent rescheduling into a globally full slot (same rule used by slot booking)
    const doctors = await getAssignableDoctors();
    const slotCapacity = doctors.length;

    if (!slotCapacity) {
      return res.status(503).json({
        success: false,
        message: "No doctors available to assign right now.",
      });
    }

    const slotBookedCount = await Appointment.countDocuments({
      appointmentDate,
      appointmentTime: normalizedAppointmentTime,
      status: { $ne: "cancelled" },
      bookingId: { $ne: req.params.bookingId },
    });

    if (slotBookedCount >= slotCapacity) {
      return res.status(409).json({
        success: false,
        message: "This time slot is fully booked. Please choose a different time.",
      });
    }

    // 🔥 Store OLD date & time
    const oldDate = appointment.appointmentDate;
    const oldTime = appointment.appointmentTime;

    // 🔥 Update appointment
    appointment.appointmentDate = appointmentDate;
    appointment.appointmentTime = normalizedAppointmentTime;
    appointment.status = "rescheduled"; // lowercase (as you want)
    
    if (appointment.needsGeneralApproval && isGeneralDoctor) {
      appointment.needsGeneralApproval = false;
    }

    await appointment.save();

    // 🔥 SEND RESCHEDULE EMAIL (SEPARATE MAIL)
    const patientEmail = await resolvePatientEmail(appointment.patientId, appointment.patientEmail);
    const rescheduledByLabel = isPgRequester
      ? (req.user?.name || req.user?.Identity || 'PG')
      : (req.user?.name || req.user?.Identity || 'Doctor');
    sendEmail(
      patientEmail || appointment.patientEmail,
      "Appointment Rescheduled – SRM Dental College",
      `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>Appointment Rescheduled</h2>

        <p>Dear Patient,</p>

        <p>Your appointment has been <b>rescheduled</b> by <b>${rescheduledByLabel}</b>.</p>

        <table border="1" cellpadding="8" cellspacing="0">
          <tr>
            <td><b>Booking ID</b></td>
            <td>${appointment.bookingId}</td>
          </tr>
          <tr>
            <td><b>Old Date & Time</b></td>
            <td>${oldDate} at ${oldTime}</td>
          </tr>
          <tr>
            <td><b>New Date & Time</b></td>
            <td>${appointmentDate} at ${normalizedAppointmentTime}</td>
          </tr>
          <tr>
            <td><b>Status</b></td>
            <td>RESCHEDULED</td>
          </tr>
        </table>

        <p>Please attend the appointment at the updated time.</p>

        <p>Regards,<br/>
        <b>SRM Dental College</b></p>
      </div>
      `
    ).catch((err) => console.error('Reschedule email failed:', err));

    res.json({ success: true, appointment });
  } catch {
    res.status(500).json({ success: false });
  }
});

/* ================= DOCTOR VIEW ================= */
// NOTE: duplicate all-appointments route removed (handled above with role protection)

/* ================= BOOKED SLOTS (ALL COMPLAINTS) ================= */
// Variant used by doctor prescription scheduling – no complaint filter
router.get("/booked-slots/:date", async (req, res) => {
  try {
    const { date } = req.params;

    const appointments = await Appointment.find({
      appointmentDate: date,
      status: { $ne: "cancelled" },
    });

    // 🔥 Convert to COUNT MAP
    const bookedSlots = {};

    appointments.forEach(a => {
      bookedSlots[a.appointmentTime] =
        (bookedSlots[a.appointmentTime] || 0) + 1;
    });

    const doctorCount = (await getAssignableDoctors()).length;

    res.json({
      success: true,
      bookedSlots,
      maxSlotsPerTime: doctorCount,
    });
  } catch (err) {
    console.error("Booked slots error:", err);
    res.status(500).json({
      success: false,
      bookedSlots: {},
      maxSlotsPerTime: 0,
    });
  }
});

// Backwards-compatible variant (patient SlotBooking) – complaint param is ignored
router.get("/booked-slots/:date/:complaint", async (req, res) => {
  try {
    const { date } = req.params;

    const appointments = await Appointment.find({
      appointmentDate: date,
      status: { $ne: "cancelled" },
    });

    const bookedSlots = {};

    appointments.forEach((a) => {
      bookedSlots[a.appointmentTime] =
        (bookedSlots[a.appointmentTime] || 0) + 1;
    });

    const doctorCount = (await getAssignableDoctors()).length;

    res.json({
      success: true,
      bookedSlots,
      maxSlotsPerTime: doctorCount,
    });
  } catch (err) {
    console.error("Booked slots error:", err);
    res.status(500).json({
      success: false,
      bookedSlots: {},
      maxSlotsPerTime: 0,
    });
  }
});

/* ================= ✅ GET PENDING RESCHEDULE REQUESTS FOR DOCTOR ================= */
router.get("/reschedule-requests", auth, requireRole(["doctor", "chief-doctor"]), async (req, res) => {
  try {
    // Find PG/UG students assigned (created) by this doctor
    const assignedStudents = await User.find(
      { role: { $in: ['pg', 'ug'] }, createdBy: req.user._id },
      { Identity: 1, name: 1, role: 1 }
    ).lean();

    const studentIdentities = assignedStudents
      .map((s) => String(s.Identity || '').trim())
      .filter(Boolean);

    if (!studentIdentities.length) {
      return res.json({ success: true, requests: [] });
    }

    // Find appointments with pending reschedule requests submitted by those students
    const appointments = await Appointment.find({
      "rescheduleRequest.requestedBy": { $in: studentIdentities },
      "rescheduleRequest.requestStatus": "pending",
    }).sort({ "rescheduleRequest.requestedAt": -1 }).lean();

    // Attach patient name
    const enriched = await attachPatientName(appointments);

    // Attach student name/role from lookup
    const studentMap = new Map(assignedStudents.map((s) => [String(s.Identity || '').trim(), s]));
    const result = enriched.map((appt) => {
      const student = studentMap.get(String(appt.rescheduleRequest?.requestedBy || '').trim());
      return {
        ...appt,
        requestedByName: student?.name || appt.rescheduleRequest?.requestedByName || '—',
        requestedByRole: student?.role || '—',
      };
    });

    res.json({ success: true, requests: result });
  } catch (err) {
    console.error("Fetch reschedule requests error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reschedule requests",
    });
  }
});

/* ================= ✅ APPROVE RESCHEDULE REQUEST ================= */
router.put("/:bookingId/reschedule/approve", auth, requireRole(["doctor", "chief-doctor"]), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const requesterKeys = getDoctorIdentityKeys(req.user);
    const doctorIdentity = requesterKeys[0] || '';

    const appointment = await Appointment.findOne({ bookingId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Verify there's a pending reschedule request
    if (!appointment.rescheduleRequest || appointment.rescheduleRequest.requestStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "No pending reschedule request found for this appointment",
      });
    }

    // Verify the PG/UG who requested this is assigned to the logged-in doctor
    const requestedBy = String(appointment.rescheduleRequest?.requestedBy || '').trim();
    if (!requestedBy) {
      return res.status(400).json({
        success: false,
        message: "Reschedule request has no requester identity",
      });
    }

    const student = await User.findOne({ Identity: requestedBy, role: { $in: ['pg', 'ug'] } }).lean();
    if (!student || String(student.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only approve reschedule requests from your assigned PG/UG students",
      });
    }

    const oldDate = appointment.appointmentDate;
    const oldTime = appointment.appointmentTime;
    const newDate = appointment.rescheduleRequest.proposedDate;
    const newTime = appointment.rescheduleRequest.proposedTime;

    // Check slot availability before approving
    const doctors = await getAssignableDoctors();
    const slotCapacity = doctors.length;

    const slotBookedCount = await Appointment.countDocuments({
      appointmentDate: newDate,
      appointmentTime: newTime,
      status: { $ne: "cancelled" },
      bookingId: { $ne: bookingId },
    });

    if (slotBookedCount >= slotCapacity) {
      return res.status(409).json({
        success: false,
        message: "The requested time slot is now fully booked. Please reject and ask PG to choose another slot.",
      });
    }

    // Check doctor's own schedule
    const doctorConflict = await Appointment.findOne({
      appointmentDate: newDate,
      appointmentTime: newTime,
      doctorId: appointment.doctorId,
      status: { $ne: "cancelled" },
      bookingId: { $ne: bookingId },
    });

    if (doctorConflict) {
      return res.status(409).json({
        success: false,
        message: "You already have an appointment in this time slot. Please reject this request.",
      });
    }

    // Approve the reschedule
    appointment.appointmentDate = newDate;
    appointment.appointmentTime = newTime;
    appointment.status = "rescheduled";
    appointment.rescheduleRequest.requestStatus = "approved";
    appointment.rescheduleRequest.reviewedBy = doctorIdentity;
    appointment.rescheduleRequest.reviewedAt = new Date();

    await appointment.save();

    // 📧 TRIPLE NOTIFICATION: Patient, PG/UG, and Department Doctor
    const patientEmail = await resolvePatientEmail(appointment.patientId, appointment.patientEmail);
    
    // Get PG/UG and Department Doctor for notifications
    const pgPromise = User.findOne({ Identity: requestedBy }).lean();
    const departmentDoctorPromise = User.findOne(
      { role: 'doctor', department: student?.department },
      { email: 1, name: 1 }
    ).lean();

    Promise.all([pgPromise, departmentDoctorPromise]).then(([pgUser, departmentDoctor]) => {
      // 1️⃣ Notify PATIENT
      sendEmail(
        patientEmail || appointment.patientEmail,
        "Appointment Rescheduled – SRM Dental College",
        `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>Appointment Rescheduled - Approved</h2>
          <p>Dear Patient,</p>
          <p>Your appointment reschedule request has been <b>approved</b> by your doctor.</p>
          <table border="1" cellpadding="8" cellspacing="0">
            <tr>
              <td><b>Booking ID</b></td>
              <td>${appointment.bookingId}</td>
            </tr>
            <tr>
              <td><b>Previous Date & Time</b></td>
              <td>${oldDate} at ${oldTime}</td>
            </tr>
            <tr>
              <td><b>New Date & Time</b></td>
              <td>${newDate} at ${newTime}</td>
            </tr>
            <tr>
              <td><b>Status</b></td>
              <td>CONFIRMED</td>
            </tr>
          </table>
          <p>Please attend the appointment at the updated time.</p>
          <p>Regards,<br/><b>SRM Dental College</b></p>
        </div>
        `
      ).catch((err) => console.error('Patient reschedule approval email failed:', err));

      // 2️⃣ Notify PG/UG - INFO ONLY
      if (pgUser && pgUser.email) {
        sendEmail(
          pgUser.email,
          "Reschedule Request Approved - Confirmed",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Reschedule Request Approved</h2>
            <p>Hello ${pgUser.name || requestedBy},</p>
            <p>Your reschedule request has been <b>approved</b> by your supervisor.</p>
            <ul>
              <li><b>Booking ID:</b> ${appointment.bookingId}</li>
              <li><b>Patient:</b> ${appointment.patientId}</li>
              <li><b>New Date & Time:</b> ${newDate} at ${newTime}</li>
            </ul>
            <p>The appointment is now confirmed at the new time.</p>
            <p>Regards,<br/><b>SRM Dental College System</b></p>
          </div>
          `
        ).catch(err => console.error("PG approval notification failed:", err));
      }

      // 3️⃣ Notify DEPARTMENT DOCTOR - CONFIRMATION
      if (departmentDoctor && departmentDoctor.email && String(departmentDoctor._id || '') !== String(req.user._id || '')) {
        sendEmail(
          departmentDoctor.email,
          "Reschedule Request Approved - Department Confirmation",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Reschedule Approval Confirmation</h2>
            <p>Hello Dr. ${departmentDoctor.name || 'Doctor'},</p>
            <p>This is a confirmation that a reschedule request has been approved by your department's supervising general doctor.</p>
            <ul>
              <li><b>Booking ID:</b> ${appointment.bookingId}</li>
              <li><b>Patient:</b> ${appointment.patientId}</li>
              <li><b>Previous Date & Time:</b> ${oldDate} at ${oldTime}</li>
              <li><b>New Date & Time:</b> ${newDate} at ${newTime}</li>
              <li><b>Approved By:</b> ${req.user.name}</li>
            </ul>
            <p>Regards,<br/><b>SRM Dental College System</b></p>
          </div>
          `
        ).catch(err => console.error("Department doctor approval notification failed:", err));
      }
    });

    res.json({
      success: true,
      message: "Reschedule request approved successfully",
      appointment,
    });
  } catch (err) {
    console.error("Approve reschedule error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to approve reschedule request",
    });
  }
});

/* ================= ✅ REJECT RESCHEDULE REQUEST ================= */
router.put("/:bookingId/reschedule/reject", auth, requireRole(["doctor", "chief-doctor"]), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const requesterKeys = getDoctorIdentityKeys(req.user);
    const doctorIdentity = requesterKeys[0] || '';

    const appointment = await Appointment.findOne({ bookingId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Verify there's a pending reschedule request
    if (!appointment.rescheduleRequest || appointment.rescheduleRequest.requestStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "No pending reschedule request found for this appointment",
      });
    }

    // Verify the PG/UG who requested this is assigned to the logged-in doctor
    const requestedByIdentity = String(appointment.rescheduleRequest?.requestedBy || '').trim();
    if (!requestedByIdentity) {
      return res.status(400).json({
        success: false,
        message: "Reschedule request has no requester identity",
      });
    }

    const student = await User.findOne({ Identity: requestedByIdentity, role: { $in: ['pg', 'ug'] } }).lean();
    if (!student || String(student.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only reject reschedule requests from your assigned PG/UG students",
      });
    }

    const requestedDate = appointment.rescheduleRequest.proposedDate;
    const requestedTime = appointment.rescheduleRequest.proposedTime;
    const requestedBy = appointment.rescheduleRequest.requestedByName || 'PG';

    // Reject the reschedule
    appointment.rescheduleRequest.requestStatus = "rejected";
    appointment.rescheduleRequest.reviewedBy = doctorIdentity;
    appointment.rescheduleRequest.reviewedAt = new Date();

    // Increment reschedule loop counter
    appointment.rescheduleLoopCount = (appointment.rescheduleLoopCount || 0) + 1;

    await appointment.save();

    // Check for high loop iteration and alert admin
    if (appointment.rescheduleLoopCount >= 5) {
      console.warn(`⚠️ HIGH LOOP ITERATION WARNING: Appointment ${bookingId} has been rescheduled/rejected ${appointment.rescheduleLoopCount} times`);
      
      // Send admin alert
      const adminUsers = await User.find({ role: { $in: ['admin', 'chief', 'chief-doctor'] } }, { email: 1, name: 1 }).lean();
      adminUsers.forEach(admin => {
        if (admin.email) {
          sendEmail(
            admin.email,
            "⚠️ High Loop Iteration Alert - Appointment System",
            `
            <div style="font-family: Arial, sans-serif; line-height:1.6;">
              <h2 style="color: #d9534f;">⚠️ High Loop Iteration Alert</h2>
              <p>Hello ${admin.name || 'Admin'},</p>
              <p>An appointment has exceeded the normal reschedule iteration threshold.</p>
              <ul>
                <li><b>Booking ID:</b> ${appointment.bookingId}</li>
                <li><b>Patient:</b> ${appointment.patientId}</li>
                <li><b>Loop Count:</b> ${appointment.rescheduleLoopCount} iterations</li>
                <li><b>Current Status:</b> ${appointment.status}</li>
                <li><b>PG/UG:</b> ${requestedByIdentity}</li>
              </ul>
              <p><b>ACTION RECOMMENDED:</b> Please review this appointment for potential issues or conflicts.</p>
              <p>Regards,<br/><b>SRM Dental College System</b></p>
            </div>
            `
          ).catch(err => console.error("Admin alert email failed:", err));
        }
      });
    }

    // 📧 Notify PG/UG (action required) and Department Doctor (info)
    const studentPromise = User.findOne({ Identity: requestedByIdentity }).lean();
    const departmentDoctorPromise = User.findOne(
      { role: 'doctor', department: student?.department },
      { email: 1, name: 1 }
    ).lean();

    Promise.all([studentPromise, departmentDoctorPromise]).then(([pgUser, departmentDoctor]) => {
      // Notify PG/UG - ACTION REQUIRED
      if (pgUser && pgUser.email) {
        sendEmail(
          pgUser.email,
          "Reschedule Request Rejected - Action Required",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Reschedule Request Rejected</h2>
            <p>Hello ${pgUser.name || requestedByIdentity},</p>
            <p>Your request to reschedule appointment <b>${appointment.bookingId}</b> has been <b>rejected</b> by your supervisor.</p>
            <ul>
              <li><b>Patient:</b> ${appointment.patientId}</li>
              <li><b>Current Date & Time:</b> ${appointment.appointmentDate} at ${appointment.appointmentTime}</li>
              <li><b>Requested Date & Time:</b> ${requestedDate} at ${requestedTime}</li>
              ${reason ? `<li><b>Reason:</b> ${reason}</li>` : ''}
            </ul>
            <p><b>ACTION REQUIRED:</b> Please take necessary action - either reschedule again or approve the original appointment.</p>
            <p>Regards,<br/><b>SRM Dental College System</b></p>
          </div>
          `
        ).catch(err => console.error("PG notification failed:", err));
      }

      // Notify Department Doctor - INFO ONLY
      if (departmentDoctor && departmentDoctor.email && String(departmentDoctor._id || '') !== String(req.user._id || '')) {
        sendEmail(
          departmentDoctor.email,
          "Reschedule Request Rejection - Department Oversight",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Reschedule Request Rejection Notification</h2>
            <p>Hello Dr. ${departmentDoctor.name || 'Doctor'},</p>
            <p>This is an oversight notification. Your department's PG/UG has had a reschedule request rejected.</p>
            <ul>
              <li><b>Booking ID:</b> ${appointment.bookingId}</li>
              <li><b>Patient:</b> ${appointment.patientId}</li>
              <li><b>Rejected Date & Time:</b> ${requestedDate} at ${requestedTime}</li>
              ${reason ? `<li><b>Reason:</b> ${reason}</li>` : ''}
            </ul>
            <p>The PG/UG will need to take further action.</p>
            <p>Regards,<br/><b>SRM Dental College System</b></p>
          </div>
          `
        ).catch(err => console.error("Department doctor notification failed:", err));
      }
    });

    // Send email to patient
    const patientEmail = await resolvePatientEmail(appointment.patientId, appointment.patientEmail);
    sendEmail(
      patientEmail || appointment.patientEmail,
      "Appointment Reschedule Request Rejected – SRM Dental College",
      `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>Appointment Reschedule Request Rejected</h2>

        <p>Dear Patient,</p>

        <p>Your appointment reschedule request has been <b>rejected</b> by your doctor.</p>

        <table border="1" cellpadding="8" cellspacing="0">
          <tr>
            <td><b>Booking ID</b></td>
            <td>${appointment.bookingId}</td>
          </tr>
          <tr>
            <td><b>Current Date & Time</b></td>
            <td>${appointment.appointmentDate} at ${appointment.appointmentTime}</td>
          </tr>
          <tr>
            <td><b>Requested Date & Time</b></td>
            <td>${requestedDate} at ${requestedTime}</td>
          </tr>
          <tr>
            <td><b>Requested By</b></td>
            <td>${requestedBy}</td>
          </tr>
          ${reason ? `<tr><td><b>Reason</b></td><td>${reason}</td></tr>` : ''}
          <tr>
            <td><b>Status</b></td>
            <td>REJECTED - Original appointment time remains</td>
          </tr>
        </table>

        <p>Your original appointment time remains unchanged. Please attend at the scheduled time or contact us for assistance.</p>

        <p>Regards,<br/>
        <b>SRM Dental College</b></p>
      </div>
      `
    ).catch((err) => console.error('Reschedule rejection email failed:', err));

    res.json({
      success: true,
      message: "Reschedule request rejected successfully",
      appointment,
    });
  } catch (err) {
    console.error("Reject reschedule error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reject reschedule request",
    });
  }
});

/* ================= CONSULTATION COMPLETION: MARK REVISIT NEEDED ================= */
router.put("/:bookingId/mark-revisit", auth, requireRole(["pg", "ug"]), async (req, res) => {
  try {
    const pgIdentity = String(req.user?.Identity || '').trim();
    if (!pgIdentity) {
      return res.status(400).json({ success: false, message: 'PG Identity not found' });
    }

    const appointment = await Appointment.findOne({ bookingId: req.params.bookingId });
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Verify PG/UG is assigned to this appointment
    const { default: GeneralCase } = await import('../models/GeneralCase.js');
    const assignment = await GeneralCase.findOne({
      patientId: appointment.patientId,
      assignedPgId: pgIdentity,
      specialistStatus: 'approved',
    }).lean();

    if (!assignment) {
      return res.status(403).json({ success: false, message: "You are not assigned to this appointment" });
    }

    // Mark appointment as REVISIT_SCHEDULED and flag for general doctor approval
    appointment.status = "revisit_scheduled";
    appointment.needsGeneralApproval = true;
    appointment.needsPgApproval = false;
    await appointment.save();

    // 📧 Notify General Doctor and Department Doctor about revisit decision
    const supervisor = await User.findById(req.user.createdBy).lean();
    const departmentDoctor = await User.findOne(
      { role: 'doctor', department: req.user.department },
      { email: 1, name: 1 }
    ).lean();

    Promise.all([supervisor, departmentDoctor]).then(([superv, deptDoc]) => {
      // Notify GENERAL DOCTOR - ACTION REQUIRED
      if (superv?.email) {
        sendEmail(
          superv.email,
          "Action Required: Revisit Appointment Scheduled",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Revisit Appointment Needs Your Approval</h2>
            <p>Hello Dr. ${superv.name || 'Doctor'},</p>
            <p>Your assigned PG/UG <b>${req.user.name}</b> has marked appointment <b>${appointment.bookingId}</b> as requiring a revisit.</p>
            <ul>
              <li><b>Patient:</b> ${appointment.patientId}</li>
              <li><b>Current Date & Time:</b> ${appointment.appointmentDate} at ${appointment.appointmentTime}</li>
              <li><b>Status:</b> REVISIT_SCHEDULED - Pending Your Approval</li>
            </ul>
            <p><b>ACTION REQUIRED:</b> Please review and approve/reject this revisit request in your dashboard.</p>
            <p>Regards,<br/><b>SRM Dental College System</b></p>
          </div>
          `
        ).catch(err => console.error("Supervisor revisit notification failed:", err));
      }

      // Notify DEPARTMENT DOCTOR - INFO ONLY
      if (deptDoc?.email && String(deptDoc._id) !== String(superv?._id)) {
        sendEmail(
          deptDoc.email,
          "Revisit Appointment Scheduled - Department Notification",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Revisit Appointment Scheduled</h2>
            <p>Hello Dr. ${deptDoc.name || 'Doctor'},</p>
            <p>A revisit has been scheduled for patient <b>${appointment.patientId}</b> following consultation by your department's PG/UG.</p>
            <ul>
              <li><b>Booking ID:</b> ${appointment.bookingId}</li>
              <li><b>Original Date & Time:</b> ${appointment.appointmentDate} at ${appointment.appointmentTime}</li>
              <li><b>Status:</b> REVISIT_SCHEDULED - Awaiting General Doctor Approval</li>
            </ul>
            <p>Regards,<br/><b>SRM Dental College System</b></p>
          </div>
          `
        ).catch(err => console.error("Department doctor revisit notification failed:", err));
      }
    });

    return res.json({
      success: true,
      message: "Revisit marked. General doctor approval required.",
      appointment,
    });
  } catch (err) {
    console.error("Mark revisit error:", err);
    res.status(500).json({ success: false, message: "Failed to mark revisit" });
  }
});

/* ================= CONSULTATION COMPLETION: CLOSE WITHOUT REVISIT ================= */
router.put("/:bookingId/consultation/complete", auth, requireRole(["pg", "ug"]), async (req, res) => {
  try {
    const pgIdentity = String(req.user?.Identity || '').trim();
    if (!pgIdentity) {
      return res.status(400).json({ success: false, message: 'PG Identity not found' });
    }

    const appointment = await Appointment.findOne({ bookingId: req.params.bookingId });
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Verify PG/UG is assigned to this appointment
    const { default: GeneralCase } = await import('../models/GeneralCase.js');
    const assignment = await GeneralCase.findOne({
      patientId: appointment.patientId,
      assignedPgId: pgIdentity,
      specialistStatus: 'approved',
    }).lean();

    if (!assignment) {
      return res.status(403).json({ success: false, message: "You are not assigned to this appointment" });
    }

    // Mark appointment as CLOSED - no revisit needed
    appointment.status = "closed";
    appointment.needsGeneralApproval = false;
    appointment.needsPgApproval = false;
    await appointment.save();

    // 📧 Notify General Doctor, Department Doctor, and Patient that case is closed
    const supervisor = await User.findById(req.user.createdBy).lean();
    const departmentDoctor = await User.findOne(
      { role: 'doctor', department: req.user.department },
      { email: 1, name: 1 }
    ).lean();
    const patientEmail = await resolvePatientEmail(appointment.patientId, appointment.patientEmail);

    Promise.all([supervisor, departmentDoctor]).then(([superv, deptDoc]) => {
      // Notify PATIENT - INFO ONLY
      if (patientEmail) {
        sendEmail(
          patientEmail,
          "Your Appointment is Complete - No Further Action Needed",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Appointment Completed</h2>
            <p>Dear Patient,</p>
            <p>Your appointment on <b>${appointment.appointmentDate}</b> at <b>${appointment.appointmentTime}</b> has been completed.</p>
            <ul>
              <li><b>Booking ID:</b> ${appointment.bookingId}</li>
              <li><b>Status:</b> CLOSED - No Further Revisits Required</li>
            </ul>
            <p>Thank you for your visit to SRM Dental College. If you have any concerns, please contact us.</p>
            <p>Regards,<br/><b>SRM Dental College</b></p>
          </div>
          `
        ).catch(err => console.error("Patient closure notification failed:", err));
      }

      // Notify GENERAL DOCTOR - INFO ONLY
      if (superv?.email) {
        sendEmail(
          superv.email,
          "Appointment Closed - No Revisit Required",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Appointment Closed</h2>
            <p>Hello Dr. ${superv.name || 'Doctor'},</p>
            <p>Your assigned PG/UG <b>${req.user.name}</b> has completed the consultation for appointment <b>${appointment.bookingId}</b>.</p>
            <ul>
              <li><b>Patient:</b> ${appointment.patientId}</li>
              <li><b>Date & Time:</b> ${appointment.appointmentDate} at ${appointment.appointmentTime}</li>
              <li><b>Status:</b> CLOSED - No Revisit Required</li>
            </ul>
            <p>Regards,<br/><b>SRM Dental College System</b></p>
          </div>
          `
        ).catch(err => console.error("Supervisor closure notification failed:", err));
      }

      // Notify DEPARTMENT DOCTOR - INFO ONLY
      if (deptDoc?.email && String(deptDoc._id) !== String(superv?._id)) {
        sendEmail(
          deptDoc.email,
          "Appointment Closed - Department Notification",
          `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2>Appointment Closed</h2>
            <p>Hello Dr. ${deptDoc.name || 'Doctor'},</p>
            <p>The consultation for patient <b>${appointment.patientId}</b> (Booking ID: <b>${appointment.bookingId}</b>) has been completed without requiring a revisit.</p>
            <p>Regards,<br/><b>SRM Dental College System</b></p>
          </div>
          `
        ).catch(err => console.error("Department doctor closure notification failed:", err));
      }
    });

    return res.json({
      success: true,
      message: "Consultation marked as complete. Case closed without revisit.",
      appointment,
    });
  } catch (err) {
    console.error("Complete consultation error:", err);
    res.status(500).json({ success: false, message: "Failed to complete consultation" });
  }
});

export default router;
