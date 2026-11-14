import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

/**
 * Derives explicit SSL configuration for pg.Pool / pg.Client.
 * Ensures that if TLS is disabled, `ssl: false` is explicitly passed so that
 * underlying drivers or environment PGSSLMODE do not attempt unintended TLS negotiation.
 * When TLS is enabled, strict certificate verification is enforced by default.
 * @param {object} [envConfig] - Environment configuration object
 * @returns {boolean|object}
 */
export function getDbSslConfig(envConfig = env) {
  if (!envConfig.PGSSL) {
    return false;
  }

  const sslOpts = {
    rejectUnauthorized: envConfig.PGSSL_REJECT_UNAUTHORIZED !== false,
  };

  if (envConfig.PGSSL_CA) {
    sslOpts.ca = envConfig.PGSSL_CA;
  }

  return sslOpts;
}

export const pool = new Pool({
  host: env.PGHOST,
  port: env.PGPORT,
  database: env.PGDATABASE,
  user: env.PGUSER,
  password: env.PGPASSWORD,
  ssl: getDbSslConfig(env),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Mandatory pool error handler to prevent unhandled idle client terminations
pool.on('error', (err) => {
  console.error('[DATABASE POOL ERROR] Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Execute a single parameterized query with automatic client checkout and release.
 * @param {string} text - SQL query text with $1, $2 placeholders
 * @param {Array} [params] - Query parameter values
 * @returns {Promise<pg.QueryResult>}
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Execute an asynchronous callback within an isolated ACID database transaction.
 * Automatically checks out a client, issues BEGIN, commits on success,
 * rolls back on error, and guarantees client release back to pool in finally block.
 * @param {Function} callback - Async function receiving the transactional pg client
 * @returns {Promise<any>}
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[DATABASE ROLLBACK ERROR] Failed to rollback transaction:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database pool connections gracefully.
 */
export async function closePool() {
  await pool.end();
}

/**
 * Get pool health diagnostics.
 */
export function getPoolDiagnostics() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

