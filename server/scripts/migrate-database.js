// server/scripts/migrate-database.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Load root .env (two levels up from server/scripts/)
dotenv.config({ path: resolve(__dirname, '../../.env') });
// Also try server/.env as fallback
dotenv.config({ path: resolve(__dirname, '../.env') });

const PRODUCTION_URI = process.env.MONGO_URI_PRODUCTION;
const DEVELOPMENT_URI = process.env.MONGO_URI;

if (!PRODUCTION_URI || !DEVELOPMENT_URI) {
  console.error('❌ Missing MongoDB URIs in .env file');
  console.error('   MONGO_URI_PRODUCTION:', PRODUCTION_URI ? '✓' : '✗');
  console.error('   MONGO_URI:', DEVELOPMENT_URI ? '✓' : '✗');
  process.exit(1);
}

const migrateDatabase = async () => {
  let sourceConnection = null;
  let targetConnection = null;

  try {
    console.log('🔄 Starting database migration...\n');

    // Connect to PRODUCTION (source)
    console.log('📡 Connecting to PRODUCTION database...');
    sourceConnection = await mongoose.createConnection(PRODUCTION_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    }).asPromise();
    console.log('✅ Connected to PRODUCTION database\n');

    // Connect to DEVELOPMENT (target)
    console.log('📡 Connecting to DEVELOPMENT database...');
    targetConnection = await mongoose.createConnection(DEVELOPMENT_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    }).asPromise();
    console.log('✅ Connected to DEVELOPMENT database\n');

    // Get all collections from source
    const collections = await sourceConnection.db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections to migrate:\n`);
    
    collections.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.name}`);
    });
    console.log('');

    // Migrate each collection
    let totalDocuments = 0;
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      console.log(`\n🔄 Migrating collection: ${collectionName}`);
      
      // Get source collection
      const sourceCollection = sourceConnection.db.collection(collectionName);
      const targetCollection = targetConnection.db.collection(collectionName);
      
      // Count documents
      const count = await sourceCollection.countDocuments();
      console.log(`   📊 Documents to copy: ${count}`);
      
      if (count === 0) {
        console.log(`   ⏭️  Skipping empty collection`);
        continue;
      }
      
      // Clear target collection first
      await targetCollection.deleteMany({});
      console.log(`   🗑️  Cleared target collection`);
      
      // Process in batches to avoid network timeouts
      const BATCH_SIZE = 50;
      let processedCount = 0;
      let hasMore = true;
      
      while (hasMore) {
        const documents = await sourceCollection
          .find({})
          .skip(processedCount)
          .limit(BATCH_SIZE)
          .toArray();
        
        if (documents.length === 0) {
          hasMore = false;
          break;
        }
        
        // Insert batch with retry logic
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            await targetCollection.insertMany(documents, { ordered: false });
            processedCount += documents.length;
            totalDocuments += documents.length;
            process.stdout.write(`\r   📦 Copied ${processedCount}/${count} documents`);
            success = true;
          } catch (err) {
            retries--;
            if (retries === 0) {
              console.log(`\n   ⚠️  Failed to copy batch after 3 retries: ${err.message}`);
              throw err;
            }
            console.log(`\n   ⚠️  Retry ${3 - retries}/3...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          }
        }
        
        if (documents.length < BATCH_SIZE) {
          hasMore = false;
        }
      }
      
      console.log(`\n   ✅ Copied ${processedCount} documents`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`📊 Total collections migrated: ${collections.length}`);
    console.log(`📄 Total documents copied: ${totalDocuments}`);
    console.log('');
    console.log('🎉 Your development database is now ready to use!');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (sourceConnection) {
      await sourceConnection.close();
      console.log('🔌 Closed PRODUCTION connection');
    }
    if (targetConnection) {
      await targetConnection.close();
      console.log('🔌 Closed DEVELOPMENT connection');
    }
    process.exit(0);
  }
};

// Run migration
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     DATABASE MIGRATION TOOL                            ║');
console.log('║     Production → Development                           ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');

migrateDatabase();
