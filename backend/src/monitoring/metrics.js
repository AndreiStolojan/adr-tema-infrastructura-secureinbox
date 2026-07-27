import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from 'prom-client';

import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';
import User from '../models/user.model.js';

collectDefaultMetrics({
  prefix: 'secureinbox_',
});

const httpRequestsTotal = new Counter({
  name: 'secureinbox_http_requests_total',
  help: 'Total number of HTTP requests handled by the backend.',
  labelNames: ['method', 'status_code'],
});

const httpRequestDurationSeconds = new Histogram({
  name: 'secureinbox_http_request_duration_seconds',
  help: 'Duration of HTTP requests handled by the backend in seconds.',
  labelNames: ['method', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const httpRequestsInFlight = new Gauge({
  name: 'secureinbox_http_requests_in_flight',
  help: 'Number of HTTP requests currently being handled by the backend.',
});

const entityTotals = new Gauge({
  name: 'secureinbox_entity_total',
  help: 'Current number of SecureInbox entities stored in MongoDB.',
  labelNames: ['entity'],
});

const riskScoreDistribution = new Gauge({
  name: 'secureinbox_risk_score_distribution',
  help: 'Current number of scans in each risk score range.',
  labelNames: ['risk_range'],
});

const riskRanges = new Map([
  [0, '0-29 Safe'],
  [30, '30-69 Suspicious'],
  [70, '70-100 Likely phishing'],
]);

const updateBusinessMetrics = async () => {
  const [users, emails, scans, scoreBuckets] = await Promise.all([
    User.countDocuments(),
    Email.countDocuments(),
    Scan.countDocuments(),
    Scan.aggregate([
      {
        $bucket: {
          groupBy: '$score',
          boundaries: [0, 30, 70, 101],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
  ]);

  entityTotals.set({ entity: 'Users' }, users);
  entityTotals.set({ entity: 'Emails' }, emails);
  entityTotals.set({ entity: 'Scans' }, scans);

  for (const label of riskRanges.values()) {
    riskScoreDistribution.set({ risk_range: label }, 0);
  }

  for (const bucket of scoreBuckets) {
    const label = riskRanges.get(bucket._id);
    if (label) {
      riskScoreDistribution.set({ risk_range: label }, bucket.count);
    }
  }
};

export const observeHttpRequests = (req, res, next) => {
  if (req.path === '/metrics') {
    return next();
  }

  httpRequestsInFlight.inc();
  const stopTimer = httpRequestDurationSeconds.startTimer({
    method: req.method,
  });
  let completed = false;

  const completeMeasurement = () => {
    if (completed) {
      return;
    }

    completed = true;
    const statusCode = String(res.statusCode);

    httpRequestsInFlight.dec();
    httpRequestsTotal.inc({
      method: req.method,
      status_code: statusCode,
    });
    stopTimer({ status_code: statusCode });
  };

  res.once('finish', completeMeasurement);
  res.once('close', completeMeasurement);

  return next();
};

export const metricsHandler = async (_req, res, next) => {
  try {
    await updateBusinessMetrics();
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    next(error);
  }
};
