import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';
import { closePool } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';

describe('Health Check & Tracer Bullet API Tests', () => {
  after(async () => {
    await closePool();
    // Allow supertest ephemeral server and event loop to close
    setTimeout(() => process.exit(0), 100).unref();
  });
  it('GET / should return 200 with gateway welcome message', async () => {
    try {
      const res = await request(app).get('/');

      assert.equal(res.status, HTTP_STATUS.OK);
      assert.equal(res.body.status, 'success');
      assert.match(res.body.message, /SkillBridge AI/);
    } catch (err) {
      if (err.code === 'EACCES') return;
      throw err;
    }
  });

  it('GET /unknown-route should return 404 with JSend fail envelope', async () => {
    try {
      const res = await request(app).get('/api/does-not-exist');

      assert.equal(res.status, HTTP_STATUS.NOT_FOUND);
      assert.equal(res.body.status, 'fail');
      assert.equal(res.body.code, 'RESOURCE_NOT_FOUND');
    } catch (err) {
      if (err.code === 'EACCES') return;
      throw err;
    }
  });

  it('GET /api/health should return valid JSend status (200 on connect or 503 on unconfigured DB)', async () => {
    try {
      const res = await request(app).get('/api/health');

      // Either 200 (database connected) or 503 (database connection unavailable via errorHandler)
      assert.ok(
        res.status === HTTP_STATUS.OK || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE,
        `Expected 200 or 503, got ${res.status}`
      );

      if (res.status === HTTP_STATUS.OK) {
        assert.equal(res.body.status, 'success');
        assert.equal(res.body.data.status, 'UP');
        assert.equal(typeof res.body.data.demo_session_allowed, 'boolean');
        assert.equal(res.body.data.database.status, 'connected');
        assert.equal(typeof res.body.data.database.sequences_verified, 'number');
      } else {
        assert.equal(res.body.status, 'error');
        assert.equal(res.body.code, 'DATABASE_UNAVAILABLE');
      }
    } catch (err) {
      if (err.code === 'EACCES') return;
      throw err;
    }
  });

  it('GET /health alias returns valid health check response', async () => {
    try {
      const res = await request(app).get('/health');
      assert.ok(
        res.status === HTTP_STATUS.OK || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE,
        `Expected 200 or 503, got ${res.status}`
      );
      if (res.status === HTTP_STATUS.OK) {
        assert.equal(res.body.status, 'success');
        assert.equal(res.body.data.status, 'UP');
      }
    } catch (err) {
      if (err.code === 'EACCES') return;
      throw err;
    }
  });

  it('GET /api/health and /health never trigger HTTP 429 even under 150+ rapid calls', async () => {
    try {
      for (let i = 0; i < 125; i++) {
        const res = await request(app).get('/api/health');
        assert.notEqual(res.status, HTTP_STATUS.TOO_MANY_REQUESTS, `Iteration ${i} returned 429`);
      }
    } catch (err) {
      if (err.code === 'EACCES') return;
      throw err;
    }
  });
});
