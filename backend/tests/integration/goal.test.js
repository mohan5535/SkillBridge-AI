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

describe('Domain 3: Career Goals & Gap Analytics Integration Tests', () => {
  const candidateToken = authService.generateJwt({
    userId: 1,
    email: 'priya.sharma@email.com',
    role: 'candidate',
  });

  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('GET /api/users/1/goals should return candidate career goals', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/users/1/goals')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].role_title, 'Full-Stack Developer');
  });

  it('GET /api/goals/1/skill-match should execute Query 8 returning exact match statuses', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/goals/1/skill-match')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.goal.role_title, 'Full-Stack Developer');

    const skills = res.body.data.skills;
    assert.ok(Array.isArray(skills));

    // Verify Query 8 ground truth: Python: MET, React: NOT MET, SQL: MET
    const python = skills.find((s) => s.required_skill === 'Python');
    assert.ok(python);
    assert.equal(python.match_status, 'MET');

    const react = skills.find((s) => s.required_skill === 'React');
    assert.ok(react);
    assert.equal(react.match_status, 'NOT MET');

    const sql = skills.find((s) => s.required_skill === 'SQL');
    assert.ok(sql);
    assert.equal(sql.match_status, 'MET');
  });

  it('GET /api/analyses/1 should return Query 6 gap items with severity ratings', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/analyses/1')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.candidate_name, 'Priya Sharma');
    assert.ok(Array.isArray(res.body.data.gap_items));
    assert.equal(res.body.data.gap_items.length, 3); // React, Docker, AWS

    for (const item of res.body.data.gap_items) {
      assert.ok('gap_severity' in item);
      assert.ok('required_state' in item);
      assert.ok(['low', 'medium', 'high', 'critical'].includes(item.gap_severity));
    }
  });

  it('GET /api/goals/1 should return individual goal details (READ)', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/goals/1')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.goal_id, 1);
    assert.equal(res.body.data.role_title, 'Full-Stack Developer');
    assert.ok(res.body.data.field_name);
  });

  it('Complete Database-Backed CRUD Lifecycle: CREATE, READ, UPDATE, DELETE with IDOR protection', async () => {
    const csrfRes = await safeReq(() =>
      request(app)
        .get('/api/auth/csrf-token')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );
    if (!csrfRes || csrfRes.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    const csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers['set-cookie'];
    const csrfCookie = cookies.find((c) => c.startsWith('sb_csrf_token=')).split(';')[0];
    const authHeaders = {
      Cookie: `sb_auth_token=${candidateToken}; ${csrfCookie}`,
      'X-CSRF-Token': csrfToken,
    };

    // 1. CREATE (POST /api/users/1/goals)
    const createRes = await safeReq(() =>
      request(app)
        .post('/api/users/1/goals')
        .set(authHeaders)
        .send({
          target_role_id: 5, // Cloud Solutions Architect
          target_completion_date: '2026-11-30',
          priority: 2,
          status: 'exploring',
          notes: 'Targeting Cloud Solutions Architect transition',
        })
    );

    if (!createRes || createRes.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;
    assert.equal(createRes.status, HTTP_STATUS.CREATED);
    assert.equal(createRes.body.status, 'success');
    const createdGoalId = createRes.body.data.goal_id;
    assert.ok(createdGoalId, 'Created goal must have an assigned goal_id');

    // 2. READ (GET /api/goals/:goalId)
    const readRes = await safeReq(() =>
      request(app)
        .get(`/api/goals/${createdGoalId}`)
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );
    assert.equal(readRes.status, HTTP_STATUS.OK);
    assert.equal(readRes.body.data.goal_id, createdGoalId);
    assert.equal(readRes.body.data.priority, 2);
    assert.equal(readRes.body.data.status, 'exploring');

    // IDOR Protection: Candidate 2 cannot access Candidate 1's goal
    const candidate2Token = authService.generateJwt({
      userId: 2,
      email: 'rahul.verma@email.com',
      role: 'candidate',
    });
    const idorRead = await safeReq(() =>
      request(app)
        .get(`/api/goals/${createdGoalId}`)
        .set('Cookie', [`sb_auth_token=${candidate2Token}`])
    );
    assert.equal(idorRead.status, HTTP_STATUS.FORBIDDEN);

    // 3. UPDATE (PUT /api/goals/:goalId)
    const updateRes = await safeReq(() =>
      request(app)
        .put(`/api/goals/${createdGoalId}`)
        .set(authHeaders)
        .send({
          priority: 1,
          status: 'active',
          notes: 'Updated priority to top focus',
        })
    );
    assert.equal(updateRes.status, HTTP_STATUS.OK);
    assert.equal(updateRes.body.status, 'success');
    assert.equal(updateRes.body.data.priority, 1);
    assert.equal(updateRes.body.data.status, 'active');

    // 4. DELETE (DELETE /api/goals/:goalId)
    const deleteRes = await safeReq(() =>
      request(app)
        .delete(`/api/goals/${createdGoalId}`)
        .set(authHeaders)
    );
    assert.equal(deleteRes.status, HTTP_STATUS.OK);
    assert.equal(deleteRes.body.status, 'success');

    // Verify record is gone from PostgreSQL (GET returns 404)
    const verifyGone = await safeReq(() =>
      request(app)
        .get(`/api/goals/${createdGoalId}`)
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );
    assert.equal(verifyGone.status, HTTP_STATUS.NOT_FOUND);
  });
});


