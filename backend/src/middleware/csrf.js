import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';
import { authService } from '../services/auth.service.js';

const CSRF_COOKIE_NAME = 'sb_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const AUTH_COOKIE_NAME = 'sb_auth_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Compute HMAC-SHA256 signature for rawToken bound to userId/session.
 *
 * @param {string} rawToken
 * @param {string|number} [userId='anonymous']
 * @returns {string}
 */
export function computeCsrfSignature(rawToken, userId = 'anonymous') {
  const payload = `${rawToken}:${userId}`;
  return crypto.createHmac('sha256', env.CSRF_SECRET).update(payload).digest('hex');
}

/**
 * Generate a cryptographically secure CSRF token pair (raw token + HMAC signature).
 *
 * @param {string|number} [userId='anonymous']
 * @returns {{ rawToken: string, cookieValue: string }}
 */
export function generateCsrfToken(userId = 'anonymous') {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const signature = computeCsrfSignature(rawToken, userId);
  const cookieValue = `${rawToken}.${signature}`;
  return { rawToken, cookieValue };
}

/**
 * Set the signed double-submit CSRF cookie on response.
 * Cookie is NOT httpOnly so client scripts can extract rawToken for X-CSRF-Token header.
 *
 * @param {object} res - Express response object
 * @param {string|number} [userId='anonymous'] - Authenticated user ID or 'anonymous'
 * @returns {string} - Raw CSRF token
 */
export function setCsrfCookie(res, userId = 'anonymous') {
  const { rawToken, cookieValue } = generateCsrfToken(userId);

  res.cookie(CSRF_COOKIE_NAME, cookieValue, {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  return rawToken;
}

/**
 * Express middleware enforcing HMAC-signed double-submit CSRF protection on mutating methods.
 * Session-bound: verifies HMAC signature against current user session identity.
 */
export function csrfProtection(req, res, next) {
  // Allow safe read queries to pass through
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[CSRF_HEADER_NAME.toUpperCase()];
  const cookieValue = req.cookies?.[CSRF_COOKIE_NAME];

  if (!headerToken || !cookieValue) {
    const error = new AppError(
      'CSRF token missing. Include X-CSRF-Token header matching sb_csrf_token cookie.',
      HTTP_STATUS.FORBIDDEN,
      'CSRF_TOKEN_MISSING'
    );
    return next(error);
  }

  const parts = cookieValue.split('.');
  if (parts.length !== 2) {
    const error = new AppError(
      'Malformed CSRF cookie format.',
      HTTP_STATUS.FORBIDDEN,
      'CSRF_TOKEN_INVALID'
    );
    return next(error);
  }

  const [cookieRawToken, cookieSignature] = parts;

  // Header token must match raw token in cookie
  if (headerToken !== cookieRawToken) {
    const error = new AppError(
      'CSRF token header does not match cookie.',
      HTTP_STATUS.FORBIDDEN,
      'CSRF_TOKEN_INVALID'
    );
    return next(error);
  }

  // Determine user identity bound to session
  let userId = req.user?.userId;
  if (!userId && req.cookies?.[AUTH_COOKIE_NAME]) {
    try {
      const decoded = authService.verifyJwt(req.cookies[AUTH_COOKIE_NAME]);
      if (decoded?.userId) userId = decoded.userId;
    } catch {
      // not authenticated
    }
  }
  if (!userId) {
    userId = 'anonymous';
  }

  // Compute expected HMAC signature over raw token bound to userId
  const expectedSignature = computeCsrfSignature(headerToken, userId);

  const cookieSigBuffer = Buffer.from(cookieSignature, 'utf8');
  const expectedSigBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    cookieSigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(cookieSigBuffer, expectedSigBuffer)
  ) {
    const error = new AppError(
      'Invalid CSRF signature. Token has been tampered with or is not bound to the authenticated user session.',
      HTTP_STATUS.FORBIDDEN,
      'CSRF_TOKEN_INVALID'
    );
    return next(error);
  }

  next();
}

export const csrf = {
  computeCsrfSignature,
  generateCsrfToken,
  setCsrfCookie,
  csrfProtection,
};

export default csrf;

