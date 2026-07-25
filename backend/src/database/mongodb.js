import mongoose from 'mongoose';
import { DB_URI, NODE_ENV } from '../config/env.js';

const connectToDatabase = async () => {
  await mongoose.connect(DB_URI);
  console.log(`MongoDB connected in ${NODE_ENV} mode`);
};

export default connectToDatabase;
