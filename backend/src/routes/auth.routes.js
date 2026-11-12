import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authSchemas } from '../validators/authSchemas.js';
import { emptyBodySchema } from '../validators/schemas.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export const authRouter = Router();

/**
 * Dedicated Brute-Force Rate Limiter for Authentication Endpoints (AUTH-10)
 * Allows max 5 failed attempts per 15-minute window per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});

// 1. Candidate Self-Registration (Public)
authRouter.post('/register', authController.register);

// 2. Candidate & Counselor Login (Protected by brute-force limiter)
authRouter.post('/login', authRateLimiter, authController.login);

// 3. Single-Use Token Account Activation (Protected by brute-force limiter)
authRouter.post('/activate-account', authRateLimiter, authController.activateAccount);

// 4. Session Termination & Cookie Clearance
authRouter.post('/logout', validate(emptyBodySchema), authController.logout);

// 5. Active Session Identity
authRouter.get('/me', authenticateToken, authController.getMe);

// 6. CSRF Token Issuance
authRouter.get('/csrf-token', authController.getCsrfToken);

// 7. Demo Persona Session Switcher (MVP Frontend)
authRouter.post('/demo-session', validate(authSchemas.demoSessionSchema), authController.setDemoSession);

export default authRouter;

