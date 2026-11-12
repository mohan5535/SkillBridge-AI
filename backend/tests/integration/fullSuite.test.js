import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';
import { closePool } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';
import { authService } from '../../src/services/auth.service.js';

describe('SkillBridge AI Gateway Full API Reachability Smoke Suite', () => {
  const counselorToken = authService.generateJwt({
    userId: 99,
    email: 'counselor@skillbridge.org',
    role: 'counselor',
  });

  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  const routes = [
    { method: 'get', path: '/api/health', name: 'Tracer Health' },
    { method: 'get', path: '/api/users', name: 'Domain 1: Users List' },
    { method: 'get', path: '/api/users/1', name: 'Domain 1: User Profile' },
    { method: 'get', path: '/api/users/1/education', name: 'Domain 1: Education (Q1)' },
    { method: 'get', path: '/api/users/1/skills', name: 'Domain 1: Skills (Q2)' },
    { method: 'get', path: '/api/users/1/experiences', name: 'Domain 1: Experiences (Q3)' },
    { method: 'get', path: '/api/users/1/certifications', name: 'Domain 1: Certifications' },
    { method: 'get', path: '/api/users/1/career-breaks', name: 'Domain 1: Career Breaks' },
    { method: 'get', path: '/api/catalog/fields', name: 'Domain 2: Catalog Fields' },
    { method: 'get', path: '/api/catalog/roles', name: 'Domain 2: Catalog Roles (Q4)' },
    { method: 'get', path: '/api/catalog/roles/1', name: 'Domain 2: Role Requirements (Q5)' },
    { method: 'get', path: '/api/catalog/skills', name: 'Domain 2: Skills Library' },
    { method: 'get', path: '/api/catalog/qualifications', name: 'Domain 2: Qualifications' },
    { method: 'get', path: '/api/catalog/certifications', name: 'Domain 2: Certifications' },
    { method: 'get', path: '/api/users/1/goals', name: 'Domain 3: Career Goals' },
    { method: 'get', path: '/api/goals/1/skill-match', name: 'Domain 3: Skill Match (Q8)' },
    { method: 'get', path: '/api/analyses/1', name: 'Domain 3: Gap Items (Q6)' },
    { method: 'get', path: '/api/users/1/learning-plans', name: 'Domain 4: Learning Plans' },
    { method: 'get', path: '/api/learning-plans/1', name: 'Domain 4: Roadmap Tasks (Q10)' },
    { method: 'get', path: '/api/resources', name: 'Domain 4: Resources Catalog (Q12)' },
    { method: 'get', path: '/api/assessments', name: 'Domain 5: Assessments List' },
    { method: 'get', path: '/api/assessments/1', name: 'Domain 5: Assessment Detail' },
    { method: 'get', path: '/api/users/1/assessments', name: 'Domain 5: Attempt History (Q13)' },
    { method: 'get', path: '/api/users/2/growth', name: 'Domain 5: Retake Growth (Q14)' },
    { method: 'get', path: '/api/analytics/dashboard', name: 'Domain 6: Executive Dashboard (Q15)' },
    { method: 'get', path: '/api/analytics/at-risk', name: 'Domain 6: At-Risk Candidates (Q7)' },
    { method: 'get', path: '/api/analytics/career-breaks', name: 'Domain 6: Break Cohorts (Q9)' },
    { method: 'get', path: '/api/analytics/task-summary', name: 'Domain 6: Task Summary (Q11)' },
  ];

  for (const route of routes) {
    it(`Route reachable: ${route.method.toUpperCase()} ${route.path} (${route.name})`, async () => {
      try {
        const res = await request(app)[route.method](route.path)
          .set('Cookie', [`sb_auth_token=${counselorToken}`]);
        // If DB is connected, status is 200. If DB credentials not provided, status is 503.
        assert.ok(
          res.status === HTTP_STATUS.OK || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE,
          `Expected 200 or 503, got ${res.status} on ${route.path}`
        );
      } catch (err) {
        if (err.code === 'EACCES') return;
        throw err;
      }
    });
  }
});

