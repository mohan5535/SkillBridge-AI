import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

const PLACEHOLDER_SECRET_PREFIXES = [
  'dev_',
  'super_secret_',
  'production_jwt_secret_',
  'production_csrf_secret_',
  'production_cookie_secret_',
  'changeme',
  'replace_me',
];

function isWeakOrPlaceholderSecret(value) {
  if (typeof value !== 'string' || value.trim().length < 32) {
    return true;
  }
  const lower = value.trim().toLowerCase();
  return PLACEHOLDER_SECRET_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Validates mandatory production environment security invariants.
 * Fails fast on missing/weak signing secrets or missing DB credentials in NODE_ENV=production.
 */
export function validateProductionEnv(config = env) {
  if (config.NODE_ENV !== 'production') {
    return true;
  }

  const errors = [];
  if (isWeakOrPlaceholderSecret(config.JWT_SECRET)) {
    errors.push('JWT_SECRET must be at least 32 characters and must not use a dev/placeholder value in production.');
  }
  if (isWeakOrPlaceholderSecret(config.CSRF_SECRET)) {
    errors.push('CSRF_SECRET must be at least 32 characters and must not use a dev/placeholder value in production.');
  }
  if (isWeakOrPlaceholderSecret(config.COOKIE_SECRET)) {
    errors.push('COOKIE_SECRET must be at least 32 characters and must not use a dev/placeholder value in production.');
  }
  if (!config.PGPASSWORD || String(config.PGPASSWORD).trim().length === 0) {
    errors.push('PGPASSWORD must be configured when NODE_ENV=production.');
  }

  if (errors.length > 0) {
    throw new Error(`[PRODUCTION ENV ERROR]\n - ${errors.join('\n - ')}`);
  }

  return true;
}

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: nodeEnv,
  PGHOST: process.env.PGHOST || '127.0.0.1',
  PGPORT: parseInt(process.env.PGPORT || '5432', 10),
  PGDATABASE: process.env.PGDATABASE || 'skillbridge_db',
  PGUSER: process.env.PGUSER || 'postgres',
  PGPASSWORD: process.env.PGPASSWORD || '',
  PGSSL: process.env.PGSSL === 'true' || process.env.PGSSLMODE === 'require',
  PGSSL_REJECT_UNAUTHORIZED: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_key_minimum_256_bits_for_skillbridge_ai_development_mode_only',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30m',
  CSRF_SECRET: process.env.CSRF_SECRET || 'dev_csrf_secret_key_minimum_256_bits_for_skillbridge_ai_development_mode_only',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev_cookie_secret_key_minimum_256_bits_for_skillbridge_ai_development_mode_only',
  ALLOW_DEMO_SESSION:
    process.env.ALLOW_DEMO_SESSION !== undefined
      ? process.env.ALLOW_DEMO_SESSION === 'true'
      : nodeEnv !== 'production',
};

if (env.NODE_ENV === 'production') {
  validateProductionEnv(env);
}
