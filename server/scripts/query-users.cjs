const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://DentalUser:DentalUser%40123@cluster0.6iyogx8.mongodb.net/Dental?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const users = await usersCollection.find(
      { email: /test_/ },
      { projection: { name: 1, email: 1, role: 1, isGeneralDoctor: 1, isDeptDoctor: 1 } }
    ).toArray();

    users.forEach(user => {
      console.log(JSON.stringify(user, null, 2));
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
