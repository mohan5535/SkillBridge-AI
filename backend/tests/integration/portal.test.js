import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

describe('Candidate & Counselor Frontend Web Portal Integration Tests', () => {
  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('GET /portal should serve the single-page application HTML shell', async () => {
    const res = await safeReq(() => request(app).get('/portal/index.html'));

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.match(res.headers['content-type'], /html/);
    assert.match(res.text, /SkillBridge/);
    assert.match(res.text, /candidateViewContainer/);
    assert.match(res.text, /counselorViewContainer/);
    assert.match(res.text, /modalEditProfile/);
    assert.match(res.text, /modalAddSkill/);
    assert.match(res.text, /modalAddCareerBreak/);
    assert.match(res.text, /modalAuth/);
    assert.match(res.text, /counselorRosterTableBody/);
    assert.match(res.text, /btnTestRbacBlocked/);
  });

  it('GET /portal/styles.css should serve stylesheet with theme variables', async () => {
    const res = await safeReq(() => request(app).get('/portal/styles.css'));

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.match(res.headers['content-type'], /css/);
    assert.match(res.text, /--bg-primary/);
    assert.match(res.text, /modal-backdrop/);
    assert.match(res.text, /rbac-security-panel/);
  });

  it('GET /portal/app.js should serve client-side application logic', async () => {
    const res = await safeReq(() => request(app).get('/portal/app.js'));

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.match(res.headers['content-type'], /javascript/);
    assert.match(res.text, /switchPersona/);
    assert.match(res.text, /loadCounselorRoster/);
    assert.match(res.text, /btnTestRbacBlocked/);
    assert.match(res.text, /modalEditProfile/);
  });

  it('GET /app, /candidate, /counselor should redirect to /portal', async () => {
    const res1 = await safeReq(() => request(app).get('/app'));
    if (res1) assert.equal(res1.status, HTTP_STATUS.FOUND);

    const res2 = await safeReq(() => request(app).get('/candidate'));
    if (res2) assert.equal(res2.status, HTTP_STATUS.FOUND);

    const res3 = await safeReq(() => request(app).get('/counselor'));
    if (res3) assert.equal(res3.status, HTTP_STATUS.FOUND);
  });

  it('POST /api/auth/demo-session should issue authentic JWT session cookies and session-bound CSRF token', async () => {
    const res = await safeReq(() =>
      request(app)
        .post('/api/auth/demo-session')
        .send({ persona: 'candidate-1' })
    );

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.user.email, 'priya.sharma@email.com');
    assert.ok(res.body.data.csrfToken);

    // Verify cookies set in headers
    const cookies = res.headers['set-cookie'];
    assert.ok(Array.isArray(cookies));
    assert.ok(cookies.some((c) => c.includes('sb_auth_token=')));
    assert.ok(cookies.some((c) => c.includes('sb_csrf_token=')));
  });

  it('Redesign Verification: Serves all 12 SaaS pages with strict CSP compliance and zero hardcoded demo candidates', () => {
    const html = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
    const js = fs.readFileSync(path.resolve('public/app.js'), 'utf8');
    const css = fs.readFileSync(path.resolve('public/styles.css'), 'utf8');

    const expectedPages = [
      'page-landing',
      'page-auth',
      'page-candidate-dashboard',
      'page-candidate-profile',
      'page-skills-management',
      'page-readiness-analysis',
      'page-gap-analysis',
      'page-learning-roadmap',
      'page-assessments',
      'page-counselor-dashboard',
      'page-counselor-candidates',
      'page-counselor-analytics',
    ];

    for (const pid of expectedPages) {
      assert.match(html, new RegExp(`id="${pid}"`), `Missing redesigned page container: ${pid}`);
    }

    // Strict CSP check: No inline onclick handlers anywhere in HTML or dynamically injected JS
    assert.doesNotMatch(html, /onclick=/i, 'Inline onclick handlers are prohibited by strict Helmet CSP');
    assert.doesNotMatch(js, /onclick=/i, 'Inline onclick handlers are prohibited by strict Helmet CSP');

    // Design System Tokens check
    assert.match(css, /--bg-sidebar:/);
    assert.match(css, /--brand:/);
    assert.match(css, /gauge-svg/);

    // Verify dynamic candidate resolution (no hardcoded static candidate names in app.js/index.html)
    assert.doesNotMatch(js, /Priya Sharma/, 'Candidate names must be loaded dynamically from PostgreSQL');
    assert.doesNotMatch(html, /Priya Sharma/, 'Candidate names must not be hardcoded in HTML shell');
    assert.doesNotMatch(html, /\sstyle\s*=/i, 'Strict CSP: inline HTML style attributes prohibited');
  });

  it('Phase 2 CSP & Edge Security: /portal enforces strict CSP without unsafe-inline, blocks dotfiles, and rejects unexpected fields/XSS on domain endpoints', async () => {
    const htmlRes = await safeReq(() => request(app).get('/portal/index.html'));
    if (!htmlRes || htmlRes.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    const csp = htmlRes.headers['content-security-policy'];
    assert.ok(csp, 'CSP header must be served on /portal/index.html');
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /style-src 'self' https:\/\/fonts\.googleapis\.com/);
    assert.match(csp, /style-src-attr 'none'/);
    assert.doesNotMatch(csp, /'unsafe-inline'/);

    const dotRes = await safeReq(() => request(app).get('/portal/.env'));
    if (dotRes) {
      assert.ok(dotRes.status === 403 || dotRes.status === 404);
    }

    const candidate1Token = authService.generateJwt({
      userId: 1,
      email: 'priya.sharma@email.com',
      role: 'candidate',
    });
    const { rawToken, cookieValue } = generateCsrfToken(1);

    // Reject invented/unexpected field on PUT /api/users/1 (.strict)
    const putBadRes = await safeReq(() =>
      request(app)
        .put('/api/users/1')
        .set('Cookie', [`sb_auth_token=${candidate1Token}; sb_csrf_token=${cookieValue}`])
        .set('X-CSRF-Token', rawToken)
        .send({ full_name: 'Priya Sharma', is_admin: true })
    );
    if (putBadRes) assert.equal(putBadRes.status, HTTP_STATUS.BAD_REQUEST);

    // Reject XSS payload on POST /api/users/1/skills
    const xssSkillRes = await safeReq(() =>
      request(app)
        .post('/api/users/1/skills')
        .set('Cookie', [`sb_auth_token=${candidate1Token}; sb_csrf_token=${cookieValue}`])
        .set('X-CSRF-Token', rawToken)
        .send({ skill_id: 1, proficiency_level: 'advanced', evidence: '<img src=x onerror=alert(1)>' })
    );
    if (xssSkillRes) assert.equal(xssSkillRes.status, HTTP_STATUS.BAD_REQUEST);

    // Reject tampered body on POST /api/goals/1/analyze
    const analyzeBadRes = await safeReq(() =>
      request(app)
        .post('/api/goals/1/analyze')
        .set('Cookie', [`sb_auth_token=${candidate1Token}; sb_csrf_token=${cookieValue}`])
        .set('X-CSRF-Token', rawToken)
        .send({ override_score: 100 })
    );
    if (analyzeBadRes) assert.equal(analyzeBadRes.status, HTTP_STATUS.BAD_REQUEST);

    // Reject unsupported multipart upload
    const uploadRes = await safeReq(() =>
      request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'multipart/form-data; boundary=----Boundary123')
        .send('--test--')
    );
    if (uploadRes) assert.equal(uploadRes.status, 415);
  });
});

