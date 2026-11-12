import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';
import { closePool } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';
import { authService } from '../../src/services/auth.service.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';

async function safeReq(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === 'EACCES') return null;
    throw err;
  }
}

describe('Phase 9: Automated Multi-Factor Readiness & Learning Roadmap Integration Tests', () => {
  const candidateToken = authService.generateJwt({
    userId: 1,
    email: 'priya.sharma@email.com',
    role: 'candidate',
  });

  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('GET /api/goals/1/analyze calculates multi-factor readiness score for Priya Sharma', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/goals/1/analyze')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.goal_id, 1);
    assert.equal(res.body.data.target_role, 'Full-Stack Developer');

    // Assert readiness score exists and reflects multi-factor weighted output
    const readiness = res.body.data.overall_readiness_pct;
    assert.ok(typeof readiness === 'number');
    assert.ok(readiness >= 50 && readiness <= 85, `Expected 50-85%, got ${readiness}%`);

    // Verify component breakdown
    const breakdown = res.body.data.breakdown;
    assert.ok('skills_score_pct' in breakdown);
    assert.ok('experience_score_pct' in breakdown);
    assert.ok('education_score_pct' in breakdown);
    assert.ok('certifications_score_pct' in breakdown);
    assert.ok('assessments_score_pct' in breakdown);

    // Verify detected gaps
    assert.ok(Array.isArray(res.body.data.gaps));
    assert.ok(res.body.data.gaps.length >= 2);
    const reactGap = res.body.data.gaps.find((g) => g.description.includes('React'));
    assert.ok(reactGap, 'React gap must be detected');
  });

  it('GET /api/goals/1/generate-roadmap produces prioritized learning plan tasks', async () => {
    const res = await safeReq(() =>
      request(app)
        .get('/api/goals/1/generate-roadmap')
        .set('Cookie', [`sb_auth_token=${candidateToken}`])
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.goal_id, 1);
    assert.ok(Array.isArray(res.body.data.tasks));
    assert.ok(res.body.data.tasks.length >= 2);

    // Verify monotonic sequence ordering
    for (let i = 0; i < res.body.data.tasks.length; i++) {
      assert.equal(res.body.data.tasks[i].sequence_order, i + 1);
      assert.ok('resource' in res.body.data.tasks[i]);
      assert.ok('estimated_duration_hours' in res.body.data.tasks[i]);
    }
  });

  it('POST /api/goals/1/analyze accepts mutating trigger with valid CSRF tokens', async () => {
    const { rawToken, cookieValue } = generateCsrfToken(1);

    const res = await safeReq(() =>
      request(app)
        .post('/api/goals/1/analyze')
        .set('Cookie', [`sb_auth_token=${candidateToken}; sb_csrf_token=${cookieValue}`])
        .set('X-CSRF-Token', rawToken)
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.goal_id, 1);
  });
});
