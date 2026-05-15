import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';

(async function() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ role: /doctor|chief|pg|ug/i }).limit(20).select('Identity department role name email').lean();
    console.log(JSON.stringify(users, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error listing doctors:', err);
    process.exit(1);
  }
})();