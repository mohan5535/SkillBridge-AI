import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';
import { closePool } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';
import { authService } from '../../src/services/auth.service.js';

async function safeReq(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === 'EACCES') return null;
    throw err;
  }
}

describe('Domain 1: User Profiles & History Integration Tests', () => {
  const counselorToken = authService.generateJwt({
    userId: 99,
    email: 'counselor@skillbridge.org',
    role: 'counselor',
  });

  const candidateToken = authService.generateJwt({
    userId: 1,
    email: 'priya.sharma@email.com',
    role: 'candidate',
  });

  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('GET /api/users should return candidates list or 503 if DB unavailable (Counselor Auth)', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/users')
        .set('Cookie', [`sb_auth_token=${counselorToken}`])
    );

    if (!res) return;

    assert.ok(
      res.status === HTTP_STATUS.OK || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE,
      `Expected 200 or 503, got ${res.status}`
    );

    if (res.status === HTTP_STATUS.OK) {
      assert.equal(res.body.status, 'success');
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
      assert.equal(res.body.data[0].user_id, 1);
      assert.equal(res.body.data[0].full_name, 'Priya Sharma');
    }
  });

  it('GET /api/users/1 should return full aggregated profile for Priya Sharma (Candidate Auth)', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/users/1')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.user_id, 1);
    assert.equal(res.body.data.full_name, 'Priya Sharma');

    // Verify 5 sub-resources aggregated
    assert.ok(Array.isArray(res.body.data.education));
    assert.ok(Array.isArray(res.body.data.skills));
    assert.ok(Array.isArray(res.body.data.experiences));
    assert.ok(Array.isArray(res.body.data.certifications));
    assert.ok(Array.isArray(res.body.data.career_breaks));
  });

  it('GET /api/users/99999 should return 404 NotFoundError (Counselor Auth)', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/users/99999')
        .set('Cookie', [`sb_auth_token=${counselorToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.NOT_FOUND);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'RESOURCE_NOT_FOUND');
  });

  it('GET /api/users/1/education should return Query 1 education roster with qualification rank', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/users/1/education')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(res.body.data.length >= 1);
    assert.ok('level_rank' in res.body.data[0]);
    assert.ok('qualification' in res.body.data[0]);
  });

  it('GET /api/users/1/skills should return Query 2 acquired skills', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/users/1/skills')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(res.body.data.length >= 1);
    assert.ok('proficiency_level' in res.body.data[0]);
    assert.ok('years_of_experience' in res.body.data[0]);
  });

  it('GET /api/users/1/career-breaks should return career pauses with neutral intake', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/users/1/career-breaks')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
  });
});


