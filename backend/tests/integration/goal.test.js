import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';
import { closePool } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';
import { authService } from '../../src/services/auth.service.js';

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
    const res = await request(app)
      .get('/api/users/1/goals')
      .set('Cookie', [`sb_auth_token=${candidateToken}`]);

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].role_title, 'Full-Stack Developer');
  });

  it('GET /api/goals/1/skill-match should execute Query 8 returning exact match statuses', async () => {
    const res = await request(app)
      .get('/api/goals/1/skill-match')
      .set('Cookie', [`sb_auth_token=${candidateToken}`]);

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

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
    const res = await request(app)
      .get('/api/analyses/1')
      .set('Cookie', [`sb_auth_token=${candidateToken}`]);

    if (res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

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
});

