const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  console.log('Starting MongoDB Memory Server on port 27017...');
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'Dental',
    }
  });

  const uri = mongod.getUri();
  console.log(`\n============================================================`);
  console.log(`✅ MongoDB Memory Server running at: ${uri}`);
  console.log(`============================================================\n`);
  console.log('Press Ctrl+C to stop.');

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('Stopping MongoDB Memory Server...');
    await mongod.stop();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Failed to start MongoDB Memory Server:', err);
  process.exit(1);
});
