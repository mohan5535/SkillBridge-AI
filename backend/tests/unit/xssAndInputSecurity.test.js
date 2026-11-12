import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {
  hasUnsafeXssPayload,
  isSafeHttpUrl,
  sanitizeRequestInputs,
  rejectMultipartUploads,
} from '../../src/utils/inputSanitizer.js';
import {
  positiveIntParam,
  emptyBodySchema,
  createUserSchema,
  updateUserSchema,
  educationSchema,
  userSkillSchema,
  userExperienceSchema,
  userCertificationSchema,
  careerBreakSchema,
  careerGoalSchema,
  createGapAnalysisSchema,
  learningPlanSchema,
  updateLearningItemStatusSchema,
  submitAssessmentSchema,
} from '../../src/validators/schemas.js';
import { registerSchema, demoSessionSchema } from '../../src/validators/authSchemas.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';

describe('XSS, URI Scheme, Strict Schema Alignment, Sanitization & CSP Hardening', () => {
  it('detects active XSS payloads while avoiding false positives on legitimate technical prose', () => {
    const malicious = [
      '<script>alert(1)</script>',
      '<SCRIPT SRC="https://evil.test/x.js"></SCRIPT>',
      '<img src=x onerror=alert(document.cookie)>',
      '<svg/onload=alert(1)>',
      '<iframe src="https://evil.test"></iframe>',
      'javascript:alert(1)',
      'vbscript:msgbox(1)',
      '<a href="javascript:alert(1)">click</a>',
      'data:text/html,<script>alert(1)</script>',
      'Hello\x00World',
    ];

    for (const payload of malicious) {
      assert.equal(hasUnsafeXssPayload(payload), true, `Should detect XSS payload: ${payload}`);
    }

    const legitimate = [
      "O'Connor-Smith, Priya Jr.",
      'José María García',
      'JavaScript: ES6+, Node.js & React >= 18 (<10ms latency)',
      'Worked on R&D database pipelines using PostgreSQL & Python',
      'Focus on TypeScript & REST APIs (C++ / Go)',
    ];

    for (const text of legitimate) {
      assert.equal(hasUnsafeXssPayload(text), false, `False positive on legitimate text: ${text}`);
    }
  });

  it('enforces http:/https: protocol allowlist on URL helper and evidence_url field', () => {
    assert.equal(isSafeHttpUrl('https://github.com/skillbridge-ai'), true);
    assert.equal(isSafeHttpUrl('http://localhost:3000/docs'), true);
    assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
    assert.equal(isSafeHttpUrl('vbscript:msgbox(1)'), false);
    assert.equal(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.equal(isSafeHttpUrl('file:///etc/passwd'), false);

    assert.throws(() => {
      userSkillSchema.parse({
        skill_id: 1,
        proficiency_level: 'intermediate',
        evidence_url: 'data:text/html,<script>alert(1)</script>',
      });
    });

    assert.throws(() => {
      userSkillSchema.parse({
        skill_id: 1,
        proficiency_level: 'intermediate',
        evidence_url: 'javascript:alert(1)',
      });
    });

    const parsedSkill = userSkillSchema.parse({
      skill_id: 1,
      proficiency_level: 'advanced',
      evidence_url: 'https://github.com/candidate/repo',
    });
    assert.equal(parsedSkill.evidence_url, 'https://github.com/candidate/repo');
  });

  it('rejects invented/nonexistent PostgreSQL columns and unexpected fields (.strict)', () => {
    // Reject phantom user columns and role tampering
    assert.throws(() => {
      createUserSchema.parse({
        email: 'candidate@example.com',
        full_name: 'Candidate User',
        role: 'admin',
      });
    });

    assert.throws(() => {
      createUserSchema.parse({
        email: 'candidate@example.com',
        full_name: 'Candidate User',
        portfolio_url: 'https://example.com',
      });
    });

    // Update requires at least one valid schema column and rejects unknown fields
    assert.throws(() => updateUserSchema.parse({}));
    assert.throws(() => updateUserSchema.parse({ is_admin: true }));

    const validUpdate = updateUserSchema.parse({
      full_name: 'Priya Sharma',
      state_or_region: 'Karnataka',
      country: 'India',
    });
    assert.equal(validUpdate.state_or_region, 'Karnataka');

    // Education rejects nonexistent column names and validates length/date order
    assert.throws(() =>
      educationSchema.parse({
        qualification_type_id: 1,
        institution_name: 'IIT Delhi',
        is_highest_level: true,
      })
    );

    // Experience supports both organization_name and legacy alias company_name, rejects XSS
    const validExp = userExperienceSchema.parse({
      job_title: 'Backend Engineer',
      organization_name: 'SkillBridge Systems',
      experience_type: 'full_time',
      start_date: '2022-01-01',
    });
    assert.equal(validExp.organization_name, 'SkillBridge Systems');

    assert.throws(() =>
      userExperienceSchema.parse({
        company_name: '<script>fetch("//evil.test")</script>',
        job_title: 'Developer',
        experience_type: 'full_time',
        start_date: '2022-01-01',
      })
    );

    // Certifications match user_certifications schema columns cleanly
    const validCert = userCertificationSchema.parse({
      certification_id: 1,
      credential_id: 'AWS-12345',
      date_obtained: '2024-01-10',
      expiry_date: '2027-01-10',
      status: 'active',
    });
    assert.equal(validCert.certification_id, 1);

    assert.throws(() =>
      userCertificationSchema.parse({
        certificate_name: 'Phantom Field',
        issuing_organization: 'Phantom Org',
      })
    );

    // Goal, gap analysis, learning plan, and assessment strict schemas
    assert.ok(careerGoalSchema.parse({ target_role_id: 1, priority: 2, status: 'active' }));
    assert.throws(() => careerGoalSchema.parse({ target_role_id: 1, priority: 9 }));

    assert.ok(createGapAnalysisSchema.parse({ overall_readiness_pct: 75.5, status: 'completed' }));
    assert.throws(() => createGapAnalysisSchema.parse({ overall_readiness_pct: 120 }));

    assert.ok(learningPlanSchema.parse({ title: 'Phase 1 Study', start_date: '2026-01-01', target_completion_date: '2026-02-01' }));
    assert.throws(() => learningPlanSchema.parse({ title: 'Bad Dates', start_date: '2026-05-01', target_completion_date: '2026-01-01' }));

    assert.ok(updateLearningItemStatusSchema.parse({ status: 'completed' }));
    assert.throws(() => updateLearningItemStatusSchema.parse({ status: 'completed', extra: 1 }));

    assert.ok(submitAssessmentSchema.parse({ user_id: 1, score: 85 }));
    assert.ok(emptyBodySchema.parse(undefined));
    assert.ok(emptyBodySchema.parse({}));
    assert.throws(() => emptyBodySchema.parse({ unexpected: true }));

    assert.equal(demoSessionSchema.parse({ persona: 'counselor' }).persona, 'counselor');
    assert.throws(() => demoSessionSchema.parse({ persona: 'admin-override' }));

    assert.equal(positiveIntParam('id').parse({ id: '42' }).id, '42');
    assert.throws(() => positiveIntParam('id').parse({ id: '0' }));
    assert.throws(() => positiveIntParam('id').parse({ id: '1; DROP TABLE users' }));
  });

  it('rejects XSS in registration while keeping valid complex passwords & prose intact', () => {
    assert.throws(() => {
      registerSchema.parse({
        email: 'xss.test@example.com',
        full_name: '<img src=x onerror=alert(1)>',
        password: 'StrongPassword123!',
      });
    });

    const valid = registerSchema.parse({
      email: 'valid.user@example.com',
      full_name: 'Ananya Verma',
      password: 'Valid<Password>123!',
      state_or_region: 'Karnataka',
    });
    assert.equal(valid.full_name, 'Ananya Verma');
  });

  it('sanitizeRequestInputs blocks XSS & prototype pollution while leaving legitimate data unmodified', async () => {
    const xssReq = {
      params: { id: '1' },
      query: { search: '<svg onload=alert(1)>' },
      body: { full_name: 'Clean Name', notes: '<script>alert(1)</script>' },
    };

    await new Promise((resolve) => {
      sanitizeRequestInputs(xssReq, {}, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, HTTP_STATUS.BAD_REQUEST);
        assert.equal(err.code, 'VALIDATION_ERROR');
        assert.ok(Array.isArray(err.errors));
        assert.equal(err.errors.length, 2);
        resolve();
      });
    });

    const protoBody = JSON.parse('{"__proto__":{"isAdmin":true},"email":"a@b.com"}');
    const protoReq = { params: {}, query: {}, body: protoBody };
    await new Promise((resolve) => {
      sanitizeRequestInputs(protoReq, {}, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, HTTP_STATUS.BAD_REQUEST);
        resolve();
      });
    });

    const originalText = 'JavaScript: ES6+, R&D >= 18';
    const cleanReq = {
      params: { id: '1' },
      query: { q: 'Data Analyst' },
      body: { email: 'user@example.com', description: originalText, password: 'Strong!Password#1' },
    };
    await new Promise((resolve, reject) => {
      sanitizeRequestInputs(cleanReq, {}, (err) => {
        if (err) return reject(err);
        assert.equal(cleanReq.body.description, originalText, 'Legitimate user data must not be mutated');
        resolve();
      });
    });
  });

  it('rejectMultipartUploads blocks unsupported multipart/form-data file upload attempts with HTTP 415', async () => {
    const multipartReq = {
      headers: {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
      },
    };

    await new Promise((resolve) => {
      rejectMultipartUploads(multipartReq, {}, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE || 415);
        assert.equal(err.code, 'UNSUPPORTED_MEDIA_TYPE');
        resolve();
      });
    });
  });

  it('portal assets contain zero inline style= or onclick= attributes and app.js sanitizers work strictly', () => {
    const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
    const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

    assert.doesNotMatch(indexHtml, /\sstyle\s*=/i, 'index.html must not contain inline style= attributes');
    assert.doesNotMatch(indexHtml, /\sonclick\s*=/i, 'index.html must not contain inline onclick= attributes');
    assert.doesNotMatch(appJs, /style="/i, 'app.js templates must not generate inline style= attributes');
    assert.doesNotMatch(appJs, /badge-\$\{escapeHtml\(/);

    // Ensure every selectBreakReason option in index.html complies with PostgreSQL chk_break_reason
    const breakBlock = indexHtml.match(/id="selectBreakReason"[\s\S]*?<\/select>/);
    assert.ok(breakBlock);
    const optionValues = [...breakBlock[0].matchAll(/value="([^"]+)"/g)].map((m) => m[1]);
    for (const val of optionValues) {
      assert.doesNotThrow(
        () => careerBreakSchema.parse({ start_date: '2026-01-01', break_reason: val }),
        `Invalid break reason in UI: ${val}`
      );
    }

    // Execute the exact helper functions from app.js in an isolated VM context
    const fnMatch = appJs.match(/function escapeHtml[\s\S]*?return Math\.max\(0, Math\.min\(100, safeNumber\(val, 0\)\)\);\s*\}/);
    assert.ok(fnMatch, 'Could not extract sanitization helpers from public/app.js');

    const sandbox = {};
    vm.runInNewContext(`${fnMatch[0]}\nthis.exported = { escapeHtml, safeToken, safeNumber, safePercent };`, sandbox);
    const { escapeHtml, safeToken, safeNumber, safePercent } = sandbox.exported;

    assert.equal(
      escapeHtml('<img src=x onerror="alert(1)">/`'),
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#x2F;&#x60;'
    );
    assert.equal(safeToken('high" onclick="alert(1)', 'neutral'), 'highonclickalert1');
    assert.equal(safeNumber('85%; background:url(javascript:alert(1))', 0), 0);
    assert.equal(safePercent('150'), 100);
    assert.equal(safePercent('bad-css-injection'), 0);
  });
});
