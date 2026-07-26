import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from 'prom-client';

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
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    next(error);
  }
};

