import mongoose from 'mongoose';

import app from './app.js';
import { PORT } from './config/env.js';
import connectToDatabase from './database/mongodb.js';

const startServer = async () => {
  try {
    await connectToDatabase();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`SecureInbox API listening on http://0.0.0.0:${PORT}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received; shutting down`);
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
