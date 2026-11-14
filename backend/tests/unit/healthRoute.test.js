import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/db.js';
import { healthRouter } from '../../src/routes/health.routes.js';

function getHealthHandler() {
  const layer = healthRouter.stack.find((l) => l.route && l.route.path === '/health');
  return layer.route.stack[0].handle;
}

describe('Health Router Unit Tests', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('responds with 200 and health diagnostics when database is reachable', async () => {
    mock.method(pool, 'query', async (sql) => {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ healthy: 1, db_timestamp: '2026-11-13T10:00:00Z', db_version: 'PostgreSQL 18.6' }] };
      }
      if (sql.includes('pg_sequences')) {
        return { rows: [{ total_sequences: '22' }] };
      }
      return { rows: [] };
    });

    const handler = getHealthHandler();
    let resStatus = null;
    let resBody = null;
    const res = {
      status(code) {
        resStatus = code;
        return this;
      },
      json(data) {
        resBody = data;
        return this;
      },
    };

    await handler({}, res, () => {});

    assert.equal(resStatus, 200);
    assert.equal(resBody.status, 'success');
    assert.equal(resBody.data.status, 'UP');
    assert.equal(typeof resBody.data.demo_session_allowed, 'boolean');
    assert.equal(resBody.data.database.sequences_verified, 22);
  });

  it('propagates error to next() when database check throws', async () => {
    const dbErr = new Error('Database ping timeout');
    mock.method(pool, 'query', async () => {
      throw dbErr;
    });

    const handler = getHealthHandler();
    let passedErr = null;
    await handler({}, {}, (err) => {
      passedErr = err;
    });

    assert.equal(passedErr, dbErr);
  });
});

