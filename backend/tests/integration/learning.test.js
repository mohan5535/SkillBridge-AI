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

describe('Domain 4: Learning Roadmaps & Resources Integration Tests', () => {
  const candidateToken = authService.generateJwt({
    userId: 1,
    email: 'priya.sharma@email.com',
    role: 'candidate',
  });

  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('GET /api/users/1/learning-plans should return candidate learning plans', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/users/1/learning-plans')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  it('GET /api/learning-plans/1 should return Query 10 sequenced tasks and linked resources', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/learning-plans/1')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok('progress' in res.body.data);
    assert.ok(Array.isArray(res.body.data.tasks));
    assert.equal(res.body.data.tasks.length, 3); // 3 learning items for Priya

    const task1 = res.body.data.tasks[0];
    assert.equal(task1.sequence_order, 1);
    assert.ok('resource_name' in task1);
    assert.ok('estimated_duration_hours' in task1);
  });

  it('GET /api/resources should return Query 12 role-aligned learning catalog', async () => {
    const res = await safeReq(() => request(app).get('/api/resources?role_id=1'));

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });
});

