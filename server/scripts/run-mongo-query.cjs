const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://DentalUser:DentalUser%40123@cluster0.6iyogx8.mongodb.net/Dental?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true';

async function runQuery() {
  const queryStr = process.argv[2];
  const projectionStr = process.argv[3];
  
  if (!queryStr) {
    console.error('Please provide query as JSON string.');
    process.exit(1);
  }
  
  try {
    await mongoose.connect(MONGO_URI);
    const query = JSON.parse(queryStr);
    
    // Convert regex patterns
    for (const key in query) {
      if (typeof query[key] === 'string' && query[key].startsWith('/') && query[key].endsWith('/')) {
        const parts = query[key].slice(1, -1).split('/');
        query[key] = new RegExp(parts[0], parts[1]);
      } else if (query[key] && typeof query[key] === 'object' && '$regex' in query[key]) {
        query[key].$regex = new RegExp(query[key].$regex);
      }
    }

    const projection = projectionStr ? JSON.parse(projectionStr) : {};
    
    // Find the collection. Default to users unless specified.
    const collectionName = process.argv[4] || 'users';
    const results = await mongoose.connection.db.collection(collectionName)
      .find(query, { projection })
      .toArray();
      
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error running query:', error);
  } finally {
    await mongoose.disconnect();
  }
}

runQuery();
