const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://DentalUser:DentalUser%40123@cluster0.6iyogx8.mongodb.net/Dental?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true';

async function main() {
  const action = process.argv[2];
  const param = process.argv[3];

  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    if (action === 'users') {
      const users = await db.collection('users').find(
        { email: /test_/ },
        { projection: { name: 1, email: 1, role: 1, isGeneralDoctor: 1, isDeptDoctor: 1 } }
      ).toArray();
      console.log(JSON.stringify(users, null, 2));
    } else if (action === 'appointment') {
      if (!param) {
        console.error('Please specify bookingId');
        process.exit(1);
      }
      const appointment = await db.collection('appointments').findOne(
        { bookingId: param }
      );
      if (appointment) {
        console.log(JSON.stringify({
          _id: appointment._id,
          bookingId: appointment.bookingId,
          status: appointment.status,
          assignedPgUgId: appointment.assignedPgUgId,
          supervisingDeptDoctorId: appointment.supervisingDeptDoctorId,
          generalDoctorId: appointment.generalDoctorId
        }, null, 2));
      } else {
        console.log('null');
      }
    } else {
      console.log('Unknown action. Supported: users, appointment');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
