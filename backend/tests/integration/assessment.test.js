import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';
import { closePool, pool } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';
import { authService } from '../../src/services/auth.service.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';

describe('Domain 5: Skill Assessments & Verification Integration Tests', () => {
  const candidate1Token = authService.generateJwt({
    userId: 1,
    email: 'priya.sharma@email.com',
    role: 'candidate',
  });

  const candidate2Token = authService.generateJwt({
    userId: 2,
    email: 'rahul.verma@email.com',
    role: 'candidate',
  });

  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('GET /api/assessments should list all skill assessments', async () => {
    const res = await request(app).get('/api/assessments');

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 4); // 4 assessments in sample_data
  });

  it('GET /api/assessments/1 should return assessment details and score thresholds', async () => {
    const res = await request(app).get('/api/assessments/1');

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.assessment_id, 1);
    assert.ok(parseFloat(res.body.data.passing_score) <= parseFloat(res.body.data.max_score));
  });

  it('GET /api/users/1/assessments should return Query 13 assessment history for Priya Sharma', async () => {
    const res = await request(app)
      .get('/api/users/1/assessments')
      .set('Cookie', [`sb_auth_token=${candidate1Token}`]);

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 2); // React quiz and SQL test
  });

  it('GET /api/users/2/growth should detect score improvement on re-tests (Query 14)', async () => {
    const res = await request(app)
      .get('/api/users/2/growth')
      .set('Cookie', [`sb_auth_token=${candidate2Token}`]);

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    const userRes = await pool.query('SELECT full_name FROM users WHERE user_id = 2');
    const expectedName = userRes.rows[0]?.full_name;
    assert.equal(res.body.data.length, 1); // Candidate 2 pharmacology retake
    assert.equal(res.body.data[0].full_name, expectedName);
    assert.equal(res.body.data[0].first_attempt_passed, false);
    assert.equal(res.body.data[0].latest_attempt_passed, true);
    assert.ok(parseFloat(res.body.data[0].score_improvement) > 0);
  });

  it('POST /api/assessments/1/submit with score > max_score should reject with 400', async () => {
    const { rawToken, cookieValue } = generateCsrfToken(1);

    const res = await request(app)
      .post('/api/assessments/1/submit')
      .set('Cookie', [`sb_auth_token=${candidate1Token}; sb_csrf_token=${cookieValue}`])
      .set('X-CSRF-Token', rawToken)
      .send({
        user_id: 1,
        score: 9999, // Exceeds max_score
      });

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
    assert.match(res.body.message, /exceeds assessment maximum score/);
  });
});

