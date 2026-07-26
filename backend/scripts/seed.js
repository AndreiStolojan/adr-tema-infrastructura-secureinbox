import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import connectToDatabase from '../src/database/mongodb.js';
import User from '../src/models/user.model.js';
import { ensureDemoDataForUser } from '../src/services/demo-seed.service.js';

const demoUser = {
  name: process.env.DEMO_USER_NAME || 'Demo User',
  email: (process.env.DEMO_USER_EMAIL || 'demo@secureinbox.test').toLowerCase(),
  password: process.env.DEMO_USER_PASSWORD || 'Demo123!',
};

const run = async () => {
  try {
    await connectToDatabase();

    let user = await User.findOne({ email: demoUser.email });
    let created = false;

    if (!user) {
      user = await User.create({
        name: demoUser.name,
        email: demoUser.email,
        passwordHash: await bcrypt.hash(demoUser.password, 10),
      });
      created = true;
    }

    const counts = await ensureDemoDataForUser(user._id);

    console.log(`Demo user: ${user.email} (${created ? 'created' : 'reused'})`);
    if (created) {
      console.log(`Demo password: ${demoUser.password}`);
    } else {
      console.log('Existing password was not changed.');
    }
    console.log(`Demo dataset: ${counts.emails} emails, ${counts.scans} scans`);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
