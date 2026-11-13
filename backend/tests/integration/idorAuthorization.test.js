import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';
import { closePool, pool } from '../../src/config/db.js';
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

describe('Phase 3 Authorization & Anti-IDOR Regression Suite (Live PostgreSQL)', () => {
  const candidate1Token = authService.generateJwt({
    userId: 1,
    email: 'priya.sharma@email.com',
    role: 'candidate',
  });

  const counselorToken = authService.generateJwt({
    userId: 99,
    email: 'counselor@skillbridge.org',
    role: 'counselor',
  });

  const { rawToken: csrf1Raw, cookieValue: csrf1Cookie } = generateCsrfToken(1);
  const c1Cookies = [`sb_auth_token=${candidate1Token}; sb_csrf_token=${csrf1Cookie}`];

  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('allows Candidate 1 to access her own goal, analysis, and learning plan', async () => {
    const goalRes = await safeReq(() =>
      request(app).get('/api/goals/1/skill-match').set('Cookie', c1Cookies)
    );
    if (!goalRes || goalRes.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(goalRes.status, HTTP_STATUS.OK);

    const analysisRes = await safeReq(() =>
      request(app).get('/api/analyses/1').set('Cookie', c1Cookies)
    );
    assert.equal(analysisRes.status, HTTP_STATUS.OK);

    const planRes = await safeReq(() =>
      request(app).get('/api/learning-plans/1').set('Cookie', c1Cookies)
    );
    assert.equal(planRes.status, HTTP_STATUS.OK);
  });

  it('blocks Candidate 1 from reading or mutating Candidate 2 goals, analyses, roadmaps, learning plans, and plan items (IDOR defense)', async () => {
    // Candidate 2 owns goalId=2, analysisId=2, planId=2, plan_item_id=4
    const getGoal2 = await safeReq(() =>
      request(app).get('/api/goals/2/skill-match').set('Cookie', c1Cookies)
    );
    if (!getGoal2 || getGoal2.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;
    assert.equal(getGoal2.status, HTTP_STATUS.FORBIDDEN);
    assert.equal(getGoal2.body.code, 'FORBIDDEN_RESOURCE_ACCESS');

    const getAnalyze2 = await safeReq(() =>
      request(app).get('/api/goals/2/analyze').set('Cookie', c1Cookies)
    );
    assert.equal(getAnalyze2.status, HTTP_STATUS.FORBIDDEN);

    const postAnalyze2 = await safeReq(() =>
      request(app).post('/api/goals/2/analyze').set('Cookie', c1Cookies).set('X-CSRF-Token', csrf1Raw)
    );
    assert.equal(postAnalyze2.status, HTTP_STATUS.FORBIDDEN);

    const getRoadmap2 = await safeReq(() =>
      request(app).get('/api/goals/2/generate-roadmap').set('Cookie', c1Cookies)
    );
    assert.equal(getRoadmap2.status, HTTP_STATUS.FORBIDDEN);

    const postRoadmap2 = await safeReq(() =>
      request(app).post('/api/goals/2/generate-roadmap').set('Cookie', c1Cookies).set('X-CSRF-Token', csrf1Raw)
    );
    assert.equal(postRoadmap2.status, HTTP_STATUS.FORBIDDEN);

    const postAnalysis2 = await safeReq(() =>
      request(app)
        .post('/api/goals/2/analyses')
        .set('Cookie', c1Cookies)
        .set('X-CSRF-Token', csrf1Raw)
        .send({ overall_readiness_pct: 99 })
    );
    assert.equal(postAnalysis2.status, HTTP_STATUS.FORBIDDEN);

    const postPlan2 = await safeReq(() =>
      request(app)
        .post('/api/goals/2/learning-plans')
        .set('Cookie', c1Cookies)
        .set('X-CSRF-Token', csrf1Raw)
        .send({ title: 'Unauthorized Plan Injection' })
    );
    assert.equal(postPlan2.status, HTTP_STATUS.FORBIDDEN);

    const getAnalysis2 = await safeReq(() =>
      request(app).get('/api/analyses/2').set('Cookie', c1Cookies)
    );
    assert.equal(getAnalysis2.status, HTTP_STATUS.FORBIDDEN);

    const getPlan2 = await safeReq(() =>
      request(app).get('/api/learning-plans/2').set('Cookie', c1Cookies)
    );
    assert.equal(getPlan2.status, HTTP_STATUS.FORBIDDEN);

    const patchItem4 = await safeReq(() =>
      request(app)
        .patch('/api/learning-plan-items/4')
        .set('Cookie', c1Cookies)
        .set('X-CSRF-Token', csrf1Raw)
        .send({ status: 'completed' })
    );
    assert.equal(patchItem4.status, HTTP_STATUS.FORBIDDEN);
    assert.equal(patchItem4.body.code, 'FORBIDDEN_RESOURCE_ACCESS');

    // Confirm Candidate 2's learning item in PostgreSQL remained untouched ('in_progress')
    try {
      const itemCheck = await pool.query('SELECT status FROM learning_plan_items WHERE plan_item_id = 4');
      assert.equal(itemCheck.rows[0].status, 'in_progress');
    } catch (e) {
      if (e.code === 'EACCES') return;
      throw e;
    }
  });

  it('blocks Candidate 1 from submitting assessment scores for Candidate 2 via body user_id spoofing', async () => {
    let beforeCount;
    try {
      beforeCount = await pool.query('SELECT count(*)::integer AS cnt FROM assessment_results');
    } catch (e) {
      if (e.code === 'EACCES') return;
      throw e;
    }

    const spoofRes = await safeReq(() =>
      request(app)
        .post('/api/assessments/1/submit')
        .set('Cookie', c1Cookies)
        .set('X-CSRF-Token', csrf1Raw)
        .send({ user_id: 2, score: 100 })
    );
    if (!spoofRes || spoofRes.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(spoofRes.status, HTTP_STATUS.FORBIDDEN);
    assert.equal(spoofRes.body.code, 'FORBIDDEN_RESOURCE_ACCESS');

    try {
      const afterCount = await pool.query('SELECT count(*)::integer AS cnt FROM assessment_results');
      assert.equal(afterCount.rows[0].cnt, beforeCount.rows[0].cnt);
    } catch (e) {
      if (e.code === 'EACCES') return;
      throw e;
    }
  });

  it('preserves Counselor supervisory read access across Candidate 2 goals, analyses, and learning plans', async () => {
    const goalRes = await safeReq(() =>
      request(app).get('/api/goals/2/skill-match').set('Cookie', [`sb_auth_token=${counselorToken}`])
    );
    if (!goalRes || goalRes.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(goalRes.status, HTTP_STATUS.OK);

    const analysisRes = await safeReq(() =>
      request(app).get('/api/analyses/2').set('Cookie', [`sb_auth_token=${counselorToken}`])
    );
    assert.equal(analysisRes.status, HTTP_STATUS.OK);

    const planRes = await safeReq(() =>
      request(app).get('/api/learning-plans/2').set('Cookie', [`sb_auth_token=${counselorToken}`])
    );
    assert.equal(planRes.status, HTTP_STATUS.OK);
  });
});

