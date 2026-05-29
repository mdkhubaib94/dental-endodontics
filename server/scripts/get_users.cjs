const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://DentalUser:DentalUser%40123@cluster0.6iyogx8.mongodb.net/Dental?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true').then(async () => {
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({
    role: { $in: ['admin', 'doctor', 'chief-doctor', 'chief'] }
  }).limit(10).toArray();
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
});
