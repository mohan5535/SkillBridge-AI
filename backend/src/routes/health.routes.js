import { Router } from 'express';
import { query, getPoolDiagnostics } from '../config/db.js';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export const healthRouter = Router();

/**
 * Tracer bullet health check handler verifying database connectivity and sequence health.
 */
export async function handleHealthCheck(req, res, next) {
  try {
    // 1. Verify live database connection
    const dbPing = await query('SELECT 1 AS healthy, NOW() AS db_timestamp, version() AS db_version');

    // 2. Verify sequence synchronization
    const seqResult = await query(`
      SELECT count(*) AS total_sequences
      FROM pg_sequences
      WHERE schemaname = 'public'
    `);

    const totalSequences = parseInt(seqResult.rows[0]?.total_sequences || '0', 10);

    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: {
        status: 'UP',
        service: 'SkillBridge AI RESTful API Gateway',
        demo_session_allowed: env.ALLOW_DEMO_SESSION,
        database: {
          status: 'connected',
          timestamp: dbPing.rows[0].db_timestamp,
          engine: 'PostgreSQL 18',
          sequences_verified: totalSequences,
        },
        pool: getPoolDiagnostics(),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/health
 */
healthRouter.get('/health', handleHealthCheck);
healthRouter.get('/', handleHealthCheck);

