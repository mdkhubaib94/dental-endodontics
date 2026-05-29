const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://DentalUser:DentalUser%40123@cluster0.6iyogx8.mongodb.net/Dental?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true').then(async () => {
  const db = mongoose.connection.db;
  const hash = await bcrypt.hash('123456', 10);
  
  await db.collection('users').updateOne({ Identity: 'AD100' }, { $set: { password: hash } });
  await db.collection('users').updateOne({ Identity: 'DNT02' }, { $set: { password: hash } });
  
  console.log("Passwords updated for AD100 and DNT02 to '123456'");
  process.exit(0);
});
