import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { invokeHandler } from './testHarness.js';
import { authController } from '../../src/controllers/auth.controller.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';

describe('Auth Registration API Integration Tests (AUTH-01, AUTH-02)', () => {
  const uniqueCandidateEmail = `candidate.${Date.now()}@example.org`;

  it('successfully registers candidate with forced role candidate and session cookies', async () => {
    const res = await invokeHandler(authController.register, {
      method: 'POST',
      body: {
        email: uniqueCandidateEmail,
        full_name: 'Aditi Rao',
        password: 'ValidCandidatePass123!',
        country: 'India',
      },
    });

    assert.equal(res.status, HTTP_STATUS.CREATED);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.user.email, uniqueCandidateEmail);
    assert.equal(res.body.data.user.full_name, 'Aditi Rao');
    assert.equal(res.body.data.user.role, 'candidate', 'Role must strictly be candidate');
    assert.equal(res.body.data.user.password_hash, undefined, 'password_hash must never be returned');

    // Verify session cookies set
    assert.ok(res.cookies.some((c) => c.name === 'sb_auth_token'), 'Must set sb_auth_token cookie');
    assert.ok(res.cookies.some((c) => c.name === 'sb_csrf_token'), 'Must set sb_csrf_token cookie');
    const authCookie = res.cookies.find((c) => c.name === 'sb_auth_token');
    assert.equal(authCookie.opts.httpOnly, true, 'sb_auth_token must be HttpOnly');
    assert.equal(authCookie.opts.sameSite, 'strict');
  });

  it('rejects registration with duplicate email address with HTTP 409 Conflict', async () => {
    const res = await invokeHandler(authController.register, {
      method: 'POST',
      body: {
        email: uniqueCandidateEmail,
        full_name: 'Duplicate Candidate',
        password: 'AnotherValidPass123!',
      },
    });

    assert.equal(res.status, HTTP_STATUS.CONFLICT);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'DUPLICATE_EMAIL');
  });

  it('rejects registration payload with role tampering attempts (anti-escalation)', async () => {
    const res = await invokeHandler(authController.register, {
      method: 'POST',
      body: {
        email: `escalation.attempt.${Date.now()}@example.org`,
        full_name: 'Attacker Attempting Escalation',
        password: 'AttackPassword123!',
        role: 'counselor', // Forbidden
      },
    });

    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
  });

  it('rejects registration payload with is_admin field', async () => {
    const res = await invokeHandler(authController.register, {
      method: 'POST',
      body: {
        email: `admin.attempt.${Date.now()}@example.org`,
        full_name: 'Attacker Attempting Admin',
        password: 'AttackPassword123!',
        is_admin: true, // Forbidden
      },
    });

    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
  });

  it('rejects passwords exceeding 72 bytes with HTTP 400 Bad Request', async () => {
    const longPassword = 'P'.repeat(73) + '1!';
    const res = await invokeHandler(authController.register, {
      method: 'POST',
      body: {
        email: `toolong.${Date.now()}@example.org`,
        full_name: 'Long Password User',
        password: longPassword,
      },
    });

    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
  });

  it('rejects weak passwords lacking complexity with HTTP 400 Bad Request', async () => {
    const res = await invokeHandler(authController.register, {
      method: 'POST',
      body: {
        email: `weak.${Date.now()}@example.org`,
        full_name: 'Weak Password User',
        password: 'weakpassword',
      },
    });

    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
  });
});
