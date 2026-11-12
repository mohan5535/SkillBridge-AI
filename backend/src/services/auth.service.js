import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { ValidationError } from '../errors/ValidationError.js';

const BCRYPT_COST_FACTOR = 12;
const MAX_PASSWORD_BYTES = 72;

/**
 * Validate password length and hash with bcrypt cost factor 12.
 * Strictly enforces 72-byte UTF-8 limit to prevent silent truncation.
 *
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} - Bcrypt hash
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password must be a non-empty string');
  }

  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength > MAX_PASSWORD_BYTES) {
    const error = new ValidationError(
      `Password exceeds maximum length of ${MAX_PASSWORD_BYTES} bytes (received ${byteLength} bytes). Bcrypt cryptographic boundary enforced.`
    );
    error.code = 'PASSWORD_TOO_LONG';
    throw error;
  }

  return await bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Compare candidate password with stored bcrypt hash.
 * Returns false if candidate password exceeds 72 bytes.
 *
 * @param {string} password - Candidate plaintext password
 * @param {string} hash - Stored bcrypt hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }

  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return false;
  }

  return await bcrypt.compare(password, hash);
}

/**
 * Generate signed JWT access token with 30-minute default expiration.
 *
 * @param {object} payload - Identity claims (userId, email, role)
 * @returns {string} - Signed JWT
 */
export function generateJwt(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN || '30m',
  });
}

/**
 * Verify and decode JWT access token.
 *
 * @param {string} token - Raw JWT
 * @returns {object} - Decoded token payload
 */
export function verifyJwt(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  });
}

/**
 * Generate cryptographically secure 256-bit activation token.
 * Raw token is transmitted to the user out-of-band.
 * Only the SHA-256 digest is stored in the database.
 *
 * @returns {{ rawToken: string, tokenHash: string }}
 */
export function generateActivationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Compute SHA-256 hex digest of a token string.
 *
 * @param {string} token - Raw token string
 * @returns {string} - 64-character SHA-256 hex digest
 */
export function hashToken(token) {
  if (!token || typeof token !== 'string') {
    throw new ValidationError('Token must be a non-empty string');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Sanitize user object by stripping all credentials and token hashes.
 *
 * @param {object} user - User record from database
 * @returns {object} - Sanitized user object safe for client response
 */
export function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return null;

  const sanitized = { ...user };
  delete sanitized.password_hash;
  delete sanitized.activation_token_hash;
  delete sanitized.activation_token_expires_at;

  return sanitized;
}

export const authService = {
  hashPassword,
  comparePassword,
  generateJwt,
  verifyJwt,
  generateActivationToken,
  hashToken,
  sanitizeUser,
};

export default authService;

