#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GeneralCase from '../models/GeneralCase.js';
import ConservativeCase from '../models/ConservativeCase.js';

dotenv.config();

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '');

const matchesConservative = (gc) => {
  const sel = Array.isArray(gc.selectedDepartments) ? gc.selectedDepartments.join(' ') : String(gc.selectedDepartments || '');
  const referred = String(gc.referredDepartment || '');
  return normalize(sel).includes('conservative') || normalize(referred).includes('conservative') || normalize(sel).includes('endodontic') || normalize(referred).includes('endodontic');
};

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGO_URI in .env to run migration');
    process.exit(1);
  }

  await mongoose.connect(uri, { autoIndex: false });
  console.log('Connected to MongoDB');

  const dryRun = process.argv.includes('--apply') ? false : true;
  console.log(dryRun ? 'Running migration in dry-run mode (no writes). Use --apply to perform writes).' : 'Running migration in apply mode');

  const candidates = await GeneralCase.find({}).lean();
  console.log(`Found ${candidates.length} general case documents`);

  const toMigrate = candidates.filter(matchesConservative);
  console.log(`Candidate conservative cases: ${toMigrate.length}`);

  for (const gc of toMigrate) {
    // Avoid duplicate migration: check unique combination or flag
    const exists = await ConservativeCase.findOne({ patientId: gc.patientId, createdAt: gc.createdAt }).lean();
    if (exists) {
      console.log(`Skipping (already exists): ${gc._id}`);
      continue;
    }

    const doc = new ConservativeCase({
      patientId: gc.patientId,
      patientName: gc.patientName,
      doctorId: gc.doctorId,
      doctorName: gc.doctorName,
      generalDoctorId: gc.generalDoctorId || '',
      generalDoctorName: gc.generalDoctorName || '',
      chiefComplaint: gc.chiefComplaint || '',
      presentIllness: gc.presentIllness || '',
      pastMedical: gc.pastMedical || '',
      pastDental: gc.pastDental || '',
      personalHistory: gc.personalHistory || '',
      familyHistory: gc.familyHistory || '',
      clinicalFindings: gc.clinicalFindings || '',
      provisionalDiagnosis: gc.provisionalDiagnosis || '',
      investigations: gc.investigations || '',
      finalDiagnosis: gc.finalDiagnosis || '',
      description: gc.description || '',
      generalDescription: gc.generalDescription || '',
      selectedDepartments: gc.selectedDepartments || [],
      treatmentPlan: gc.treatmentPlan || '',
      xrayImage: gc.xrayImage || '',
      referredDepartment: gc.referredDepartment || '',
      specialistDoctorId: gc.specialistDoctorId || '',
      specialistDoctorName: gc.specialistDoctorName || '',
      specialistAssignedAt: gc.specialistAssignedAt || null,
      specialistStatus: gc.specialistStatus || 'not-required',
      specialistRescheduleReason: gc.specialistRescheduleReason || '',
      specialistReviewedBy: gc.specialistReviewedBy || '',
      specialistReviewedAt: gc.specialistReviewedAt || null,
      assignedPgId: gc.assignedPgId || '',
      assignedPgName: gc.assignedPgName || '',
      pgAssignedAt: gc.pgAssignedAt || null,
      chiefApproval: gc.chiefApproval || '',
      approvedBy: gc.approvedBy || '',
      approvedAt: gc.approvedAt || null,
      createdAt: gc.createdAt || new Date(),
      updatedAt: gc.updatedAt || new Date(),
    });

    if (!dryRun) {
      await doc.save();
      console.log(`Migrated GeneralCase ${gc._id} => ConservativeCase ${doc._id}`);
    } else {
      console.log(`[dry-run] Would migrate GeneralCase ${gc._id}`);
    }
  }

  console.log('Migration finished');
  await mongoose.disconnect();
};

run().catch((err) => { console.error(err); process.exit(1); });
