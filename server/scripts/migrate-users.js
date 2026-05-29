// server/scripts/migrate-users.js
// Migrates ALL users from PRODUCTION MongoDB → DEVELOPMENT (Working) MongoDB
// Preserves every field: name, email, phone, password, role, Identity,
// department, specialization, staffId, createdBy, createdAt, etc.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Load environment variables (root .env first, then server/.env as fallback)
dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config({ path: resolve(__dirname, '../.env') });

// Production = source, Development/Working = target
const PRODUCTION_URI  = process.env.MONGO_URI_PRODUCTION;
const DEVELOPMENT_URI = process.env.MONGO_URI;

if (!PRODUCTION_URI || !DEVELOPMENT_URI) {
  console.error('❌ Missing MongoDB URIs in .env file');
  console.error('   MONGO_URI_PRODUCTION:', PRODUCTION_URI ? '✓ set' : '✗ MISSING');
  console.error('   MONGO_URI (working):',  DEVELOPMENT_URI ? '✓ set' : '✗ MISSING');
  console.error('\nMake sure your root .env has both:');
  console.error('   MONGO_URI_PRODUCTION=mongodb+srv://...');
  console.error('   MONGO_URI=mongodb+srv://...');
  process.exit(1);
}

const COLLECTION_NAME = 'users'; // MongoDB collection name for User model
const BATCH_SIZE = 100;

const migrateUsers = async () => {
  let sourceConn = null;
  let targetConn = null;

  try {
    console.log('🔄 Starting USER migration...\n');

    // ── Connect to PRODUCTION (source) ──────────────────────────────────
    console.log('📡 Connecting to PRODUCTION database (source)...');
    sourceConn = await mongoose.createConnection(PRODUCTION_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 15000,
    }).asPromise();
    console.log('✅ Connected to PRODUCTION database\n');

    // ── Connect to DEVELOPMENT / WORKING (target) ───────────────────────
    console.log('📡 Connecting to WORKING database (target)...');
    targetConn = await mongoose.createConnection(DEVELOPMENT_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 15000,
    }).asPromise();
    console.log('✅ Connected to WORKING database\n');

    // ── Read all users from production ──────────────────────────────────
    const sourceCollection = sourceConn.db.collection(COLLECTION_NAME);
    const targetCollection = targetConn.db.collection(COLLECTION_NAME);

    const totalSourceUsers = await sourceCollection.countDocuments();
    console.log(`📊 Total users in PRODUCTION: ${totalSourceUsers}`);

    if (totalSourceUsers === 0) {
      console.log('⚠️  No users found in PRODUCTION database. Nothing to migrate.');
      return;
    }

    // Show a preview of the users being migrated
    const sampleUsers = await sourceCollection
      .find({})
      .project({ name: 1, email: 1, role: 1, Identity: 1, department: 1 })
      .limit(10)
      .toArray();

    console.log('\n📋 Sample users to migrate:');
    console.log('─'.repeat(80));
    console.log(
      'Name'.padEnd(25) +
      'Email'.padEnd(30) +
      'Role'.padEnd(15) +
      'Identity'
    );
    console.log('─'.repeat(80));
    sampleUsers.forEach((u) => {
      console.log(
        String(u.name || '').padEnd(25) +
        String(u.email || '').padEnd(30) +
        String(u.role || '').padEnd(15) +
        String(u.Identity || '')
      );
    });
    if (totalSourceUsers > 10) {
      console.log(`   ... and ${totalSourceUsers - 10} more users`);
    }
    console.log('─'.repeat(80));

    // ── Check existing users in working DB ──────────────────────────────
    const existingTargetCount = await targetCollection.countDocuments();
    console.log(`\n📊 Existing users in WORKING database: ${existingTargetCount}`);

    // Clear existing users in the working database before migration
    if (existingTargetCount > 0) {
      console.log('🗑️  Clearing existing users in WORKING database...');
      await targetCollection.deleteMany({});
      console.log('✅ Cleared existing users');
    }

    // ── Migrate in batches ──────────────────────────────────────────────
    console.log(`\n🚀 Migrating ${totalSourceUsers} users in batches of ${BATCH_SIZE}...\n`);

    let copied = 0;
    let failed = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await sourceCollection
        .find({})
        .skip(copied)
        .limit(BATCH_SIZE)
        .toArray();

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      // Retry logic for each batch
      let retries = 3;
      let success = false;

      while (retries > 0 && !success) {
        try {
          const result = await targetCollection.insertMany(batch, { ordered: false });
          copied += result.insertedCount;
          process.stdout.write(`\r   📦 Copied ${copied}/${totalSourceUsers} users`);
          success = true;
        } catch (err) {
          // Handle duplicate key errors gracefully — some users may already exist
          if (err.code === 11000) {
            // Some succeeded, some were duplicates
            const insertedCount = err.result?.nInserted || err.insertedCount || 0;
            const duplicateCount = batch.length - insertedCount;
            copied += insertedCount;
            failed += duplicateCount;
            process.stdout.write(
              `\r   📦 Copied ${copied}/${totalSourceUsers} users (${duplicateCount} duplicates skipped)`
            );
            success = true;
          } else {
            retries--;
            if (retries === 0) {
              console.error(`\n   ❌ Failed batch after 3 retries: ${err.message}`);
              throw err;
            }
            console.log(`\n   ⚠️  Retry ${3 - retries}/3...`);
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }

      if (batch.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // ── Verify migration ────────────────────────────────────────────────
    const finalTargetCount = await targetCollection.countDocuments();

    console.log('\n\n' + '═'.repeat(60));
    console.log('✅ USER MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log(`📊 Users in PRODUCTION (source):  ${totalSourceUsers}`);
    console.log(`📊 Users in WORKING (target):     ${finalTargetCount}`);
    console.log(`📦 Users copied:                  ${copied}`);
    if (failed > 0) {
      console.log(`⚠️  Duplicates skipped:            ${failed}`);
    }
    console.log('═'.repeat(60));

    // Verify by role breakdown
    const roleBreakdown = await targetCollection.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\n📋 Users by role in WORKING database:');
    console.log('─'.repeat(40));
    roleBreakdown.forEach((r) => {
      console.log(`   ${String(r._id || 'unknown').padEnd(20)} ${r.count}`);
    });
    console.log('─'.repeat(40));
    console.log(`   ${'TOTAL'.padEnd(20)} ${finalTargetCount}`);

    console.log('\n🎉 All user details have been migrated to the working database!');
    console.log('   Fields preserved: name, email, phone, password, role, Identity,');
    console.log('   department, specialization, staffId, createdBy, createdAt\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (sourceConn) {
      await sourceConn.close();
      console.log('🔌 Closed PRODUCTION connection');
    }
    if (targetConn) {
      await targetConn.close();
      console.log('🔌 Closed WORKING connection');
    }
    process.exit(0);
  }
};

// ── Run ─────────────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     USER MIGRATION TOOL                                 ║');
console.log('║     Production DB → Working DB                          ║');
console.log('║     Migrates ALL user details                           ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

migrateUsers();
