import { config } from 'dotenv';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = `.env.${nodeEnv}.local`;

config({ path: envFile });

const required = ['PORT', 'DB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required env vars in ${envFile}: ${missing.join(', ')}`);
}

export const {
  PORT,
  DB_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN,
} = process.env;

export const NODE_ENV = nodeEnv;
export const FRONTEND_APP_URL =
  process.env.FRONTEND_APP_URL || 'http://localhost:5173';
