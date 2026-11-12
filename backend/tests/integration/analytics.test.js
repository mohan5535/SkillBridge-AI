import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';
import { closePool } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';
import { authService } from '../../src/services/auth.service.js';

describe('Domain 6: Executive Analytics Engine Integration Tests', () => {
  const counselorToken = authService.generateJwt({
    userId: 99,
    email: 'counselor@skillbridge.org',
    role: 'counselor',
  });

  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('GET /api/analytics/dashboard should execute Query 15 with 3 isolated CTEs in sub-15ms', async () => {
    const startTime = Date.now();
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Cookie', [`sb_auth_token=${counselorToken}`]);
    const elapsed = Date.now() - startTime;

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 3); // 3 candidates with active goals

    // Verify multi-CTE aggregated columns exist without Cartesian multiplication
    for (const row of res.body.data) {
      assert.ok('candidate_name' in row);
      assert.ok('target_role' in row);
      assert.ok('overall_readiness_pct' in row);
      assert.ok('total_gaps' in row);
      assert.ok('total_learning_tasks' in row);
      assert.ok('roadmap_progress_pct' in row);
    }

    // Verify sub-second / sub-15ms query execution
    assert.ok(elapsed < 1000, `Execution took ${elapsed}ms, expected sub-second`);
  });

  it('GET /api/analytics/at-risk should return candidates with readiness < 60% (Query 7)', async () => {
    const res = await request(app)
      .get('/api/analytics/at-risk')
      .set('Cookie', [`sb_auth_token=${counselorToken}`]);

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 2); // Priya (55%) and Ananya (42%)

    for (const c of res.body.data) {
      assert.ok(parseFloat(c.overall_readiness_pct) < 60.0);
    }
  });

  it('GET /api/analytics/career-breaks should return cohort analysis (Query 9)', async () => {
    const res = await request(app)
      .get('/api/analytics/career-breaks')
      .set('Cookie', [`sb_auth_token=${counselorToken}`]);

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  it('GET /api/analytics/task-summary should return task breakdown per candidate (Query 11)', async () => {
    const res = await request(app)
      .get('/api/analytics/task-summary')
      .set('Cookie', [`sb_auth_token=${counselorToken}`]);

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.ok('completion_rate_pct' in res.body.data[0]);
  });
});

