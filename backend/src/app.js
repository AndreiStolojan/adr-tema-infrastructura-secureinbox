import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';

import sendErrorResponse from './common/http/send-error-response.js';
import { FRONTEND_APP_URL } from './config/env.js';
import errorMiddleware from './middlewares/error.middleware.js';
import {
  metricsHandler,
  observeHttpRequests,
} from './monitoring/metrics.js';
import authRouter from './routes/auth.routes.js';
import emailRouter from './routes/email.routes.js';
import scanRouter from './routes/scan.routes.js';
import userRouter from './routes/user.routes.js';

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.get('/metrics', metricsHandler);
app.use(observeHttpRequests);
app.use(cors({ origin: FRONTEND_APP_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(
  '/api/v1',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => req.path === '/health' || req.path === '/ready',
  })
);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.get('/api/v1/ready', async (req, res) => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return res
      .status(503)
      .json({ success: false, data: { status: 'not_ready' } });
  }

  try {
    await mongoose.connection.db.admin().ping();
    return res
      .status(200)
      .json({ success: true, data: { status: 'ready' } });
  } catch {
    return res
      .status(503)
      .json({ success: false, data: { status: 'not_ready' } });
  }
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/emails', emailRouter);
app.use('/api/v1/scans', scanRouter);

app.use((req, res) =>
  sendErrorResponse(
    res,
    404,
    'Route not found',
    'ROUTE_NOT_FOUND',
    [`No route matches ${req.method} ${req.originalUrl}`]
  )
);

app.use(errorMiddleware);

export default app;
