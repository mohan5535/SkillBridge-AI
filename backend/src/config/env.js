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
 * Parses PostgreSQL SSL mode explicitly.
 * Ensures PGSSL=false or PGSSLMODE=disable explicitly disables TLS in pg.Pool,
 * overriding any implicit or environment-injected defaults.
 * @param {object} [envVars] - Environment variables object
 * @returns {boolean}
 */
export function parsePgSsl(envVars = process.env) {
  if (envVars.PGSSL === 'false') {
    return false;
  }
  if (envVars.PGSSL === 'true') {
    return true;
  }
  if (envVars.PGSSLMODE === 'disable') {
    return false;
  }
  if (['require', 'verify-ca', 'verify-full'].includes(envVars.PGSSLMODE)) {
    return true;
  }
  return false;
}

/**
 * Parses whether SSL certificate verification should be enforced.
 * Defaults strictly to true (rejectUnauthorized: true) when TLS is active.
 * Never silently turns off certificate validation.
 * @param {object} [envVars] - Environment variables object
 * @returns {boolean}
 */
export function parsePgSslRejectUnauthorized(envVars = process.env) {
  if (envVars.PGSSL_REJECT_UNAUTHORIZED === 'false' || envVars.PGSSLMODE === 'no-verify') {
    return false;
  }
  return true;
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
  const host = config.PGHOST !== undefined ? config.PGHOST : env.PGHOST;
  const database = config.PGDATABASE !== undefined ? config.PGDATABASE : env.PGDATABASE;
  const user = config.PGUSER !== undefined ? config.PGUSER : env.PGUSER;
  const port = config.PGPORT !== undefined ? config.PGPORT : env.PGPORT;
  const password = config.PGPASSWORD !== undefined ? config.PGPASSWORD : env.PGPASSWORD;

  if (!host || String(host).trim().length === 0) {
    errors.push('PGHOST must be configured when NODE_ENV=production.');
  }
  if (!database || String(database).trim().length === 0) {
    errors.push('PGDATABASE must be configured when NODE_ENV=production.');
  }
  if (!user || String(user).trim().length === 0) {
    errors.push('PGUSER must be configured when NODE_ENV=production.');
  }
  if (!password || String(password).trim().length === 0) {
    errors.push('PGPASSWORD must be configured when NODE_ENV=production.');
  }
  if (!port || isNaN(port) || Number(port) <= 0 || Number(port) > 65535) {
    errors.push('PGPORT must be a valid port number (1-65535) when NODE_ENV=production.');
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
  PGSSL: parsePgSsl(process.env),
  PGSSL_REJECT_UNAUTHORIZED: parsePgSslRejectUnauthorized(process.env),
  PGSSL_CA: process.env.PGSSL_CA || process.env.PGSSLROOTCERT || null,
  AUTO_INIT_DB: process.env.AUTO_INIT_DB !== 'false',
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
