import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { invokeHandler } from './testHarness.js';
import { authController } from '../../src/controllers/auth.controller.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';
import { authService } from '../../src/services/auth.service.js';
import { authCredentialStore } from '../../src/queries/authQueries.js';

describe('Auth Session API Integration Tests (AUTH-04, AUTH-05, AUTH-10)', () => {
  const sessionUserEmail = `session.tester.${Date.now()}@example.org`;
  const rawPassword = 'ActiveSessionP@ss123!';

  it('rejects login on unactivated account with HTTP 403 ACCOUNT_NOT_ACTIVATED', async () => {
    // Priya Sharma has password_hash = null initially
    const res = await invokeHandler(authController.login, {
      method: 'POST',
      body: {
        email: 'priya.sharma@example.com',
        password: 'AnyPassword123!',
      },
    });

    assert.equal(res.status, HTTP_STATUS.FORBIDDEN);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'ACCOUNT_NOT_ACTIVATED');
  });

  it('rejects login with non-existent email with HTTP 401 Unauthorized', async () => {
    const res = await invokeHandler(authController.login, {
      method: 'POST',
      body: {
        email: 'nonexistent.user.xyz@example.org',
        password: 'ValidFormatPass123!',
      },
    });

    assert.equal(res.status, HTTP_STATUS.UNAUTHORIZED);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'INVALID_CREDENTIALS');
  });

  it('successfully logs in activated user and sets HTTP-only session cookies', async () => {
    // Setup activated user
    const hash = await authService.hashPassword(rawPassword);
    authCredentialStore.registerCandidate(sessionUserEmail, 'Session Tester', hash);

    const res = await invokeHandler(authController.login, {
      method: 'POST',
      body: {
        email: sessionUserEmail,
        password: rawPassword,
      },
    });

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.user.email, sessionUserEmail);
    assert.equal(res.body.data.user.role, 'candidate');
    assert.equal(res.body.data.user.password_hash, undefined);

    assert.ok(res.cookies.some((c) => c.name === 'sb_auth_token'), 'Must issue sb_auth_token cookie');
    const authCookie = res.cookies.find((c) => c.name === 'sb_auth_token');
    assert.equal(authCookie.opts.httpOnly, true, 'sb_auth_token must be HttpOnly');
    assert.equal(authCookie.opts.sameSite, 'strict');
  });

  it('rejects login with incorrect password with HTTP 401 Unauthorized', async () => {
    const res = await invokeHandler(authController.login, {
      method: 'POST',
      body: {
        email: sessionUserEmail,
        password: 'IncorrectPassword123!',
      },
    });

    assert.equal(res.status, HTTP_STATUS.UNAUTHORIZED);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'INVALID_CREDENTIALS');
  });

  it('clears session cookies on POST /api/auth/logout', async () => {
    const res = await invokeHandler(authController.logout, {
      method: 'POST',
    });

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');

    assert.ok(res.cookies.some((c) => c.name === 'sb_auth_token' && c.cleared));
    assert.ok(res.cookies.some((c) => c.name === 'sb_csrf_token' && c.cleared));
  });

  it('issues CSRF token and cookie on GET /api/auth/csrf-token', async () => {
    const res = await invokeHandler(authController.getCsrfToken, {
      method: 'GET',
    });

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(res.body.data.csrfToken, 'Must provide raw csrfToken in body');
    assert.ok(res.cookies.some((c) => c.name === 'sb_csrf_token'), 'Must set sb_csrf_token cookie');
  });

  it('GET /api/auth/me returns authenticated identity (Candidate and Counselor)', async () => {
    const unauthRes = await invokeHandler(authController.getMe, { method: 'GET' });
    assert.equal(unauthRes.status, HTTP_STATUS.UNAUTHORIZED);

    const counselorRes = await invokeHandler(authController.getMe, {
      method: 'GET',
      user: { userId: 99, email: 'counselor@skillbridge.org', role: 'counselor' },
    });
    assert.equal(counselorRes.status, HTTP_STATUS.OK);
    assert.equal(counselorRes.body.data.user.role, 'counselor');
    assert.equal(counselorRes.body.data.user.user_id, 99);
  });
});
