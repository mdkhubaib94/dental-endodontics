// Quick script to verify users in both Production and Working DBs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const PRODUCTION_URI  = process.env.MONGO_URI_PRODUCTION;
const DEVELOPMENT_URI = process.env.MONGO_URI;

const verify = async () => {
  // Connect to both
  const prodConn = await mongoose.createConnection(PRODUCTION_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
  const workConn = await mongoose.createConnection(DEVELOPMENT_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();

  // List all collections in both
  const prodCollections = (await prodConn.db.listCollections().toArray()).map(c => c.name).sort();
  const workCollections = (await workConn.db.listCollections().toArray()).map(c => c.name).sort();

  console.log('\n📋 PRODUCTION DB collections:');
  for (const name of prodCollections) {
    const count = await prodConn.db.collection(name).countDocuments();
    console.log(`   ${name.padEnd(30)} ${count} docs`);
  }

  console.log('\n📋 WORKING DB collections:');
  for (const name of workCollections) {
    const count = await workConn.db.collection(name).countDocuments();
    console.log(`   ${name.padEnd(30)} ${count} docs`);
  }

  // Specifically check users
  const prodUsers = await prodConn.db.collection('users').countDocuments();
  const workUsers = await workConn.db.collection('users').countDocuments();

  console.log('\n═══════════════════════════════════════');
  console.log(`  PRODUCTION users: ${prodUsers}`);
  console.log(`  WORKING users:    ${workUsers}`);
  console.log('═══════════════════════════════════════');

  if (workUsers > 0) {
    console.log('\n✅ Users ARE present in working DB');
    const sample = await workConn.db.collection('users').find({}).limit(5).toArray();
    sample.forEach(u => {
      console.log(`   - ${u.name} | ${u.email} | ${u.role} | ${u.Identity}`);
    });
  } else {
    console.log('\n❌ Users are MISSING from working DB!');
  }

  await prodConn.close();
  await workConn.close();
  process.exit(0);
};

verify().catch(err => { console.error(err); process.exit(1); });
