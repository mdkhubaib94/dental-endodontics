// server/Server.js - Updated version with proper route registration
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authRoutes from './routes/Auth.js';
import otpRoutes from './routes/send-otp.js';
import appointmentRoutes from './routes/appointment.js';
import doctorPatientRoutes from './routes/doctor-patient-route.js';
import pedodonticsRoutes from './routes/caseSheetRoutes.js';
import completeDentureRoutes from './routes/complete-denture.js';
import casesheetRoutes from './routes/casesheets.js';
import FpdRoutes from './routes/fpd-route.js';
import implantRoutes from './routes/Implant-route.js';  
import implantPatientRoute from './routes/ImplantPatient-route.js';
import partialRoute from './routes/partial-route.js';
import oralRoutes from './routes/oral-route.js';
import generalCaseRoutes from './routes/general-case.js';
import consentFormRoutes from './routes/consent-form.js';
import caseDraftRoutes from './routes/case-draft.js';
import conservativeRoutes from './routes/conservative-route.js';

import prescriptionRoutes from './routes/prescription.js';
import patientDetailsRoutes from './routes/patient-details-route.js';
import reportsRoutes from './routes/reports.js';
import billingRoutes from './routes/bill-route.js';
import debugQueryRoutes from './routes/debug-query.js';

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

let dbInitError = null;

if (!process.env.MONGO_URI) {
  console.error('❌ Missing required env var: MONGO_URI');
  console.error('   Set MONGO_URI in deployment environment variables.');
  if (!isVercel) process.exit(1);
}

if (isProduction && !process.env.JWT_SECRET) {
  console.error('❌ Missing required env var in production: JWT_SECRET');
  console.error('   Set JWT_SECRET in deployment environment variables.');
  if (!isVercel) process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');

// Connect to MongoDB
connectDB().catch((error) => {
  dbInitError = error;
  console.error('❌ MongoDB initialization failed:', error?.message || error);
});

// If DB config is missing or initialization failed, fail fast with a helpful message.
// (On Vercel we don't `process.exit`, so without this the API can look like random 404s/timeouts.)
app.use('/api', (req, res, next) => {
  const isDebugRoute = req.path === '/debug/routes';
  const isHealthRoute = req.path === '/health';
  const isOtpDiagnosticRoute = req.path === '/otp/email-status' || req.path === '/otp/test-email';
  if (isHealthRoute) return next();
  if (isOtpDiagnosticRoute) return next();
  if (isDebugRoute) return next();

  if (!process.env.MONGO_URI) {
    const publicMessage = isProduction
      ? 'Service temporarily unavailable. Please try again shortly.'
      : 'Database not configured: missing MONGO_URI environment variable.';
    return res.status(503).json({
      success: false,
      message: publicMessage,
      hint: isProduction
        ? null
        : 'Set MONGO_URI in Vercel Project Settings → Environment Variables and redeploy.',
      timestamp: new Date().toISOString(),
    });
  }

  if (dbInitError || mongoose.connection.readyState === 0) {
    const publicMessage = isProduction
      ? 'Service temporarily unavailable. Please try again shortly.'
      : 'Database not connected. Check MONGO_URI and MongoDB network access.';
    return res.status(503).json({
      success: false,
      message: publicMessage,
      error: process.env.NODE_ENV === 'development' ? (dbInitError?.message || null) : null,
      timestamp: new Date().toISOString(),
    });
  }

  return next();
});

// Middlewares
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// In development, allow requests from any origin (Vite, local network testing, etc.).
// In production, allow only explicitly configured origins (or same-origin when `origin:false`).
const corsOptions = {
  origin: !isProduction ? true : corsOrigins.length > 0 ? corsOrigins : false,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// Ensure preflight (OPTIONS) requests are handled consistently.
// Express 5 (path-to-regexp v6+) does not accept "*" as a route pattern.
app.options(/.*/, cors(corsOptions));

// Increase payload limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve React build in production
if (isProduction) {
  app.use(express.static(clientDistPath));
}

// Add request logging middleware for debugging (development only)
if (!isProduction) {
  app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });
}

// Health check route (dev only; in production '/' is the React app)
if (!isProduction) {
  app.get('/', (req, res) => {
    res.json({
      message: 'Backend running...',
      timestamp: new Date().toISOString(),
      mongodb_status: 'Connected',
      routes: [
        'GET /',
        'GET /api/test',
        'GET /api/patient-details',
        'POST /api/patient-details',
        'GET /api/patient-details/:id',
        'PUT /api/patient-details/:id',
        'DELETE /api/patient-details/:id',
        'GET /api/patient-details/by-patient-id/:patientId',
        'PUT /api/patient-details/by-patient-id/:patientId',
        'DELETE /api/patient-details/by-patient-id/:patientId',
        'GET /api/patient-details/stats/overview',
        'POST /api/prescriptions',
        'GET /api/prescriptions/test',
        'GET /api/prescriptions/patient/:patientId',
        '/api/auth/*',
        '/api/otp/*',
        '/api/appointment/*',
        '/api/doctor-patient/*',
        '/api/pedodontics/*',
        '/api/consent-forms/*',
      ],
    });
  });
}

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Deployment diagnostics route (safe for production, no secrets exposed)
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStateLabel = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : dbState === 3 ? 'disconnecting' : 'disconnected';

  const payload = {
    success: true,
    message: 'Health check',
    environment: process.env.NODE_ENV || 'development',
    isVercel,
    checks: {
      mongoUriPresent: Boolean(process.env.MONGO_URI),
      jwtSecretPresent: Boolean(process.env.JWT_SECRET),
      dbState,
      dbStateLabel,
      dbInitError: dbInitError ? String(dbInitError.message || dbInitError) : null,
    },
    timestamp: new Date().toISOString(),
  };

  // Return 503 only when DB is clearly unavailable in production.
  if (isProduction && (!payload.checks.mongoUriPresent || payload.checks.dbState === 0 || payload.checks.dbInitError)) {
    return res.status(503).json(payload);
  }

  return res.json(payload);
});

// Routes - Make sure all routes are properly registered
console.log('Registering routes...');

app.use('/api/auth', authRoutes);
console.log('✓ Auth routes registered at /api/auth');

app.use('/api/otp', otpRoutes);
console.log('✓ OTP routes registered at /api/otp');

app.use('/api/appointment', appointmentRoutes);
console.log('✓ Appointment routes registered at /api/appointment');

app.use('/api/doctor-patient', doctorPatientRoutes);
console.log('✓ Doctor-patient routes registered at /api/doctor-patient');

app.use('/api/pedodontics', pedodonticsRoutes);
console.log('✓ Pedodontics routes registered at /api/pedodontics');

app.use('/api/complete-denture', completeDentureRoutes);
console.log('✓ Complete Denture routes registered at /api/complete-denture');

app.use('/api/casesheets', casesheetRoutes);
console.log('✓ Unified casesheets route registered at /api/casesheets');

app.use('/api/fpd', FpdRoutes);
console.log('✓ FPD routes registered at /api/fpd');

app.use('/api/implant', implantRoutes);
console.log('✓ Implant routes registered at /api/implant');  

app.use('/api/ImplantPatient', implantPatientRoute);
console.log('✓ ImplantPatient routes registered at /api/ImplantPatient');

app.use('/api/partial', partialRoute);
console.log('✓ Partial Denture routes registered at /api/partial');

app.use('/api/oral', oralRoutes);
console.log('✓ Oral routes registered at /api/oral');

app.use('/api/general', generalCaseRoutes);
console.log('✓ General Case Sheet routes registered at /api/general');

app.use('/api/case-drafts', caseDraftRoutes);
console.log('✓ Case draft routes registered at /api/case-drafts');

app.use('/api/conservative', conservativeRoutes);
console.log('✓ Conservative routes registered at /api/conservative');

app.use('/api/prescriptions', prescriptionRoutes);
console.log('✓ Prescription routes registered at /api/prescriptions');

// THIS IS THE IMPORTANT ONE - Make sure patient-details routes are registered
app.use('/api/patient-details', patientDetailsRoutes);
console.log('✓ Patient details routes registered at /api/patient-details');

app.use('/api/reports', reportsRoutes);
console.log('✓ Reports routes registered at /api/reports');

app.use('/api/billing', billingRoutes);
console.log('✓ Billing routes registered at /api/billing');

app.use('/api/consent-forms', consentFormRoutes);
console.log('✓ Consent form routes registered at /api/consent-forms');

app.use('/api/debug', debugQueryRoutes);
console.log('✓ Debug routes registered at /api/debug');

// React Router fallback (GET non-API routes)
if (isProduction) {
  app.get(/^\/(?!api).*/, (req, res) => {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Debug endpoint to list all registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];

  // Express 5 uses `app.router` (Express 4 used `app._router`).
  const activeRouter = app?._router || app?.router;
  const stack = Array.isArray(activeRouter?.stack) ? activeRouter.stack : [];

  stack.forEach((layer) => {
    if (layer?.route) {
      routes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods || {}),
      });
      return;
    }

    // Nested routers
    const nestedStack = layer?.handle?.stack;
    if (layer?.name === 'router' && Array.isArray(nestedStack)) {
      nestedStack.forEach((nestedLayer) => {
        if (nestedLayer?.route) {
          routes.push({
            // Mount path introspection differs between Express versions; keep it simple.
            path: nestedLayer.route.path,
            methods: Object.keys(nestedLayer.route.methods || {}),
          });
        }
      });
    }
  });

  res.json({
    success: true,
    message: 'Available routes',
    routes: routes,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for patient-details specifically
app.get('/api/debug/patient-details-test', async (req, res) => {
  try {
    // Import the model to test
    const { PatientDetails } = await import('./models/patientDetails.js');

    const count = await PatientDetails.countDocuments();
    const sample = await PatientDetails.find({}).limit(2);

    res.json({
      success: true,
      message: 'Patient details endpoint is working',
      database_connection: 'OK',
      patient_count: count,
      sample_patients: sample,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing patient details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler caught error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Test prescription endpoint specifically
app.post('/api/test-prescription', async (req, res) => {
  try {
    console.log('Test prescription endpoint hit');
    console.log('Body:', req.body);

    // Import the model
    const Prescription = (await import('./models/Prescription.js')).default;

    const testPrescription = new Prescription({
      patientId: 'TEST123',
      patientData: {
        name: 'Test Patient',
        age: 25,
        gender: 'male',
        date: new Date()
      },
      symptoms: 'Test symptoms',
      diagnosis: 'Test diagnosis',
      medicines: [{
        type: 'pills',
        name: 'Test Medicine',
        dosage: { m: '1', n: '0', e: '1', n2: '0' },
        foodIntake: 'after',
        duration: 5,
        asNeeded: false
      }],
      doctorId: 'DOC001',
      doctorName: 'Dr. Test'
    });

    const saved = await testPrescription.save();

    res.json({
      success: true,
      message: 'Test prescription saved successfully',
      data: saved
    });
  } catch (error) {
    console.error('Test prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Test prescription failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// 404 handler - MUST be last
app.use((req, res, next) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);

  // List available patient-details routes specifically since that's what's failing
  const patientDetailsRoutes = [
    'GET /api/patient-details - Get all patients',
    'POST /api/patient-details - Create new patient',
    'GET /api/patient-details/:id - Get patient by ID',
    'PUT /api/patient-details/:id - Update patient by ID',
    'DELETE /api/patient-details/:id - Delete patient by ID',
    'GET /api/patient-details/by-patient-id/:patientId - Get patient by patientId',
    'PUT /api/patient-details/by-patient-id/:patientId - Update patient by patientId',
    'DELETE /api/patient-details/by-patient-id/:patientId - Delete patient by patientId',
    'GET /api/patient-details/stats/overview - Get patient statistics'
  ];

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /',
      'GET /api/test',
      'GET /api/debug/routes',
      'GET /api/debug/patient-details-test',
      ...patientDetailsRoutes,
      'POST /api/prescriptions',
      'GET /api/prescriptions/test',
      'GET /api/prescriptions/patient/:patientId',
      'POST /api/consent-forms',
      'GET /api/consent-forms',
      'GET /api/consent-forms/:id',
      'GET /api/consent-forms/patient/:patientId'
    ]
  });
});

const PORT = process.env.PORT || 5000;
if (!isVercel) {
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('='.repeat(60));
    console.log('Available endpoints:');
    console.log(`   Home: http://localhost:${PORT}/`);
    console.log(`   Test: http://localhost:${PORT}/api/test`);
    console.log(`   Debug Routes: http://localhost:${PORT}/api/debug/routes`);
    console.log(`   Patient Details:`);
    console.log(`      • GET    http://localhost:${PORT}/api/patient-details`);
    console.log(`      • POST   http://localhost:${PORT}/api/patient-details`);
    console.log(`      • GET    http://localhost:${PORT}/api/patient-details/:id`);
    console.log(`      • PUT    http://localhost:${PORT}/api/patient-details/:id`);
    console.log(`   Prescriptions: http://localhost:${PORT}/api/prescriptions`);
    console.log(`   Consent Forms: http://localhost:${PORT}/api/consent-forms`);
    console.log('='.repeat(60) + '\n');
  });
}

export default app;
