import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateCsrfToken, setCsrfCookie, csrfProtection } from '../../src/middleware/csrf.js';

describe('CSRF Middleware - HMAC Signed Double-Submit Defense', () => {
  it('generates valid token and signed cookie value', () => {
    const { rawToken, cookieValue } = generateCsrfToken();
    assert.strictEqual(typeof rawToken, 'string');
    assert.strictEqual(rawToken.length, 64, 'Raw token must be 32 bytes hex (64 chars)');

    assert.ok(cookieValue.includes('.'), 'Cookie value must contain rawToken.signature delimiter');
    const [tokenPart, sigPart] = cookieValue.split('.');
    assert.strictEqual(tokenPart, rawToken);
    assert.strictEqual(sigPart.length, 64, 'Signature must be 64-char HMAC-SHA256');
  });

  it('setCsrfCookie sets non-httpOnly cookie with strict sameSite and returns raw token', () => {
    let cookieName, cookieVal, cookieOptions;
    const mockRes = {
      cookie: (name, val, opts) => {
        cookieName = name;
        cookieVal = val;
        cookieOptions = opts;
      },
    };

    const returnedToken = setCsrfCookie(mockRes);
    assert.strictEqual(cookieName, 'sb_csrf_token');
    assert.strictEqual(cookieOptions.httpOnly, false, 'Cookie must NOT be httpOnly so client JS can read it');
    assert.strictEqual(cookieOptions.sameSite, 'strict');
    assert.ok(cookieVal.startsWith(returnedToken + '.'));
  });

  it('allows safe methods (GET, HEAD, OPTIONS) to pass without CSRF tokens', () => {
    ['GET', 'HEAD', 'OPTIONS'].forEach((method) => {
      let nextCalled = false;
      const req = { method, headers: {}, cookies: {} };
      const res = {};
      csrfProtection(req, res, (err) => {
        assert.ifError(err);
        nextCalled = true;
      });
      assert.strictEqual(nextCalled, true, `${method} must pass without CSRF tokens`);
    });
  });

  it('rejects POST request when X-CSRF-Token header is missing', () => {
    const { cookieValue } = generateCsrfToken();
    const req = {
      method: 'POST',
      headers: {},
      cookies: { sb_csrf_token: cookieValue },
    };
    let receivedError = null;
    csrfProtection(req, {}, (err) => {
      receivedError = err;
    });

    assert.ok(receivedError, 'Must fail when header is missing');
    assert.strictEqual(receivedError.statusCode, 403);
    assert.strictEqual(receivedError.code, 'CSRF_TOKEN_MISSING');
  });

  it('rejects POST request when sb_csrf_token cookie is missing', () => {
    const { rawToken } = generateCsrfToken();
    const req = {
      method: 'POST',
      headers: { 'x-csrf-token': rawToken },
      cookies: {},
    };
    let receivedError = null;
    csrfProtection(req, {}, (err) => {
      receivedError = err;
    });

    assert.ok(receivedError, 'Must fail when cookie is missing');
    assert.strictEqual(receivedError.statusCode, 403);
    assert.strictEqual(receivedError.code, 'CSRF_TOKEN_MISSING');
  });

  it('rejects POST request when header token does not match cookie raw token', () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();

    const req = {
      method: 'POST',
      headers: { 'x-csrf-token': token1.rawToken },
      cookies: { sb_csrf_token: token2.cookieValue },
    };
    let receivedError = null;
    csrfProtection(req, {}, (err) => {
      receivedError = err;
    });

    assert.ok(receivedError);
    assert.strictEqual(receivedError.statusCode, 403);
    assert.strictEqual(receivedError.code, 'CSRF_TOKEN_INVALID');
  });

  it('rejects POST request with tampered HMAC signature', () => {
    const { rawToken } = generateCsrfToken();
    const tamperedCookieValue = `${rawToken}.0000000000000000000000000000000000000000000000000000000000000000`;

    const req = {
      method: 'POST',
      headers: { 'x-csrf-token': rawToken },
      cookies: { sb_csrf_token: tamperedCookieValue },
    };
    let receivedError = null;
    csrfProtection(req, {}, (err) => {
      receivedError = err;
    });

    assert.ok(receivedError);
    assert.strictEqual(receivedError.statusCode, 403);
    assert.strictEqual(receivedError.code, 'CSRF_TOKEN_INVALID');
  });

  it('successfully passes valid POST request with matching token and valid HMAC signature', () => {
    const { rawToken, cookieValue } = generateCsrfToken();

    const req = {
      method: 'POST',
      headers: { 'x-csrf-token': rawToken },
      cookies: { sb_csrf_token: cookieValue },
    };
    let nextCalled = false;
    csrfProtection(req, {}, (err) => {
      assert.ifError(err);
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'Valid CSRF credentials must pass');
  });

  it('binds CSRF token to authenticated user session and accepts matching session', () => {
    const userId = 42;
    const { rawToken, cookieValue } = generateCsrfToken(userId);

    const req = {
      method: 'POST',
      user: { userId },
      headers: { 'x-csrf-token': rawToken },
      cookies: { sb_csrf_token: cookieValue },
    };
    let nextCalled = false;
    csrfProtection(req, {}, (err) => {
      assert.ifError(err);
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'Matching authenticated session must pass');
  });

  it('rejects CSRF token bound to User A when submitted by User B', () => {
    const userAToken = generateCsrfToken(1); // Bound to User 1

    const req = {
      method: 'POST',
      user: { userId: 2 }, // User 2 submits User 1's token
      headers: { 'x-csrf-token': userAToken.rawToken },
      cookies: { sb_csrf_token: userAToken.cookieValue },
    };
    let receivedError = null;
    csrfProtection(req, {}, (err) => {
      receivedError = err;
    });

    assert.ok(receivedError, 'Must reject cross-user CSRF token submission');
    assert.strictEqual(receivedError.statusCode, 403);
    assert.strictEqual(receivedError.code, 'CSRF_TOKEN_INVALID');
  });

  it('rejects anonymous CSRF token when submitted by authenticated user', () => {
    const anonymousToken = generateCsrfToken('anonymous');

    const req = {
      method: 'POST',
      user: { userId: 1 },
      headers: { 'x-csrf-token': anonymousToken.rawToken },
      cookies: { sb_csrf_token: anonymousToken.cookieValue },
    };
    let receivedError = null;
    csrfProtection(req, {}, (err) => {
      receivedError = err;
    });

    assert.ok(receivedError, 'Must reject anonymous token on authenticated session');
    assert.strictEqual(receivedError.statusCode, 403);
    assert.strictEqual(receivedError.code, 'CSRF_TOKEN_INVALID');
  });
});

