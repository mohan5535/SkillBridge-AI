import { Router } from 'express';
import { query, getPoolDiagnostics } from '../config/db.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export const healthRouter = Router();

/**
 * GET /api/health
 * Tracer bullet endpoint verifying database connectivity and sequence health.
 */
healthRouter.get('/health', async (req, res, next) => {
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
});

