import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';
import { AppError } from '../errors/AppError.js';

/**
 * Configure Helmet HTTP Security Headers including strict Content-Security-Policy (CSP).
 */
export const helmetMiddleware = helmet({
  hidePoweredBy: true,
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      styleSrcAttr: ["'none'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
});

function parseCorsOrigins(rawOrigin = env.CORS_ORIGIN) {
  return String(rawOrigin || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Configure Cross-Origin Resource Sharing.
 * Supports single origin or comma-separated origin list and explicitly allows X-CSRF-Token.
 */
export const corsMiddleware = cors({
  origin(origin, callback) {
    // Allow non-browser / same-origin requests without an Origin header
    if (!origin) return callback(null, true);
    const configured = parseCorsOrigins(env.CORS_ORIGIN);
    if (configured.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-csrf-token'],
  credentials: true,
});

/**
 * Strict Origin Validation Middleware for State-Changing Requests.
 * Rejects mutating requests (POST, PUT, PATCH, DELETE) with unauthorized Origin headers.
 */
export function originValidationMiddleware(req, res, next) {
  const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  if (!mutatingMethods.has(req.method.toUpperCase())) {
    return next();
  }

  const origin = req.headers.origin;
  if (origin) {
    // Expected origins from env.CORS_ORIGIN plus active same-origin Host header
    const allowedOrigins = new Set([
      ...parseCorsOrigins(env.CORS_ORIGIN),
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ]);

    const hostHeader = req.headers?.host;
    if (hostHeader) {
      const protocol = req.protocol || 'http';
      allowedOrigins.add(`${protocol}://${hostHeader}`);
    }

    if (!allowedOrigins.has(origin)) {
      return next(
        new AppError(
          `Cross-Origin request blocked. Origin "${origin}" is not authorized.`,
          HTTP_STATUS.FORBIDDEN,
          'CORS_ORIGIN_DENIED'
        )
      );
    }
  }

  next();
}

/**
 * Configure IP Rate Limiting.
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      status: 'fail',
      message: 'Too many requests from this client IP. Please retry later.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});
