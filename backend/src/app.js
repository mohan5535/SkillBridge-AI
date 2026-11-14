import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/index.js';
import { handleHealthCheck } from './routes/health.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './errors/NotFoundError.js';
import { helmetMiddleware, corsMiddleware, rateLimitMiddleware, originValidationMiddleware } from './middleware/security.js';
import { cookieParser } from './middleware/cookieParser.js';
import { setCsrfCookie } from './middleware/csrf.js';
import { authService } from './services/auth.service.js';
import { env } from './config/env.js';
import { sanitizeRequestInputs, rejectMultipartUploads } from './utils/inputSanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');

export function createApp() {
  const app = express();

  // Trust first reverse proxy hop (Nginx, ALB, Render, Railway) for rate limiting & X-Forwarded-Proto
  app.set('trust proxy', 1);

  // 1. Security HTTP Headers (Helmet)
  app.use(helmetMiddleware);

  // 2. Cross-Origin Resource Sharing (CORS)
  app.use(corsMiddleware);

  // 3. Strict Origin Validation on Mutations
  app.use(originValidationMiddleware);

  // 4. IP Rate Limiting
  app.use(rateLimitMiddleware);

  // 4. Cookie Parser Middleware
  app.use(cookieParser(env.COOKIE_SECRET));

  // 4. Reject unexpected multipart file upload attempts before JSON/form parsing
  app.use('/api', rejectMultipartUploads);

  // 5. Standard JSON body parser with 10kb security limit
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // 6. Global input security sanitizer (blocks active XSS, control chars, prototype pollution)
  app.use('/api', sanitizeRequestInputs);

  // Static Frontend Web Application (Candidate & Counselor Portal)
  app.use(
    '/portal',
    express.static(publicDir, {
      dotfiles: 'deny',
      etag: true,
      index: ['index.html'],
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );
  app.get('/app', (req, res) => res.redirect('/portal'));
  app.get('/candidate', (req, res) => res.redirect('/portal'));
  app.get('/counselor', (req, res) => res.redirect('/portal'));

  // Dedicated /health check alias for orchestrators pinging /health directly
  app.get('/health', handleHealthCheck);

  // Root welcome ping
  app.get('/', (req, res) => {
    res.json({
      status: 'success',
      message: 'SkillBridge AI RESTful API Gateway',
      version: '1.0.0',
      documentation: '/api/health',
      portal: '/portal',
    });
  });

  // CSRF Token issuance endpoint
  app.get('/api/auth/csrf-token', (req, res) => {
    let userId = req.user?.userId;
    if (!userId && req.cookies?.sb_auth_token) {
      try {
        const decoded = authService.verifyJwt(req.cookies.sb_auth_token);
        if (decoded?.userId) userId = decoded.userId;
      } catch {
        // ignore
      }
    }
    const rawToken = setCsrfCookie(res, userId || 'anonymous');
    res.json({
      status: 'success',
      data: {
        csrfToken: rawToken,
      },
    });
  });

  // Mount API Gateway routes under /api
  app.use('/api', apiRouter);

  // Catch unmatched routes (404)
  app.use((req, res, next) => {
    next(new NotFoundError(`Resource ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
