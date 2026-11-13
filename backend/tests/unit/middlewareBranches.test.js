import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateToken,
  requireRole,
  requireOwnershipOrCounselor,
  requireResourceOwnershipOrCounselor,
  requireBodyUserOwnershipOrCounselor,
} from '../../src/middleware/auth.js';
import { csrfProtection, generateCsrfToken } from '../../src/middleware/csrf.js';
import { originValidationMiddleware } from '../../src/middleware/security.js';
import { authService } from '../../src/services/auth.service.js';
import { AppError } from '../../src/errors/AppError.js';
import { NotFoundError } from '../../src/errors/NotFoundError.js';

describe('Middleware Comprehensive Branches & Edge Cases Unit Tests', () => {
  describe('authenticateToken', () => {
    it('authenticates via cookie and falls back to candidate role', () => {
      mock.method(authService, 'verifyJwt', () => ({
        userId: 42,
        email: 'user@example.com',
      }));

      const req = { cookies: { sb_auth_token: 'valid_cookie_token' }, headers: {} };
      let calledNext = false;

      try {
        authenticateToken(req, {}, () => {
          calledNext = true;
        });

        assert.equal(calledNext, true);
        assert.equal(req.user.userId, 42);
        assert.equal(req.user.role, 'candidate');
      } finally {
        mock.restoreAll();
      }
    });

    it('authenticates via Authorization Bearer header', () => {
      mock.method(authService, 'verifyJwt', () => ({
        sub: 99,
        email: 'counselor@example.com',
        role: 'counselor',
      }));

      const req = {
        cookies: {},
        headers: { authorization: 'Bearer header_jwt_token' },
      };
      let calledNext = false;

      try {
        authenticateToken(req, {}, () => {
          calledNext = true;
        });

        assert.equal(calledNext, true);
        assert.equal(req.user.userId, 99);
        assert.equal(req.user.role, 'counselor');
      } finally {
        mock.restoreAll();
      }
    });

    it('rejects when no token is supplied in cookie or header', () => {
      const req = { cookies: {}, headers: {} };
      let passedError = null;

      authenticateToken(req, {}, (err) => {
        passedError = err;
      });

      assert.ok(passedError instanceof AppError);
      assert.equal(passedError.statusCode, 401);
      assert.equal(passedError.code, 'AUTHENTICATION_REQUIRED');
    });

    it('handles TokenExpiredError and invalid token verification errors', () => {
      // TokenExpiredError
      mock.method(authService, 'verifyJwt', () => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });

      const req1 = { cookies: { sb_auth_token: 'expired' }, headers: {} };
      let err1 = null;
      authenticateToken(req1, {}, (err) => {
        err1 = err;
      });
      assert.equal(err1.statusCode, 401);
      assert.equal(err1.code, 'TOKEN_EXPIRED');

      // Other jwt errors
      mock.method(authService, 'verifyJwt', () => {
        const err = new Error('invalid signature');
        err.name = 'JsonWebTokenError';
        throw err;
      });

      const req2 = { cookies: { sb_auth_token: 'corrupted' }, headers: {} };
      let err2 = null;
      authenticateToken(req2, {}, (err) => {
        err2 = err;
      });
      assert.equal(err2.statusCode, 401);
      assert.equal(err2.code, 'TOKEN_INVALID');

      mock.restoreAll();
    });
  });

  describe('requireRole & requireOwnershipOrCounselor', () => {
    it('requireRole rejects unauthenticated requests and forbidden roles', () => {
      const middleware = requireRole('admin', 'counselor');

      // Unauthenticated
      let errUnauth = null;
      middleware({}, {}, (err) => {
        errUnauth = err;
      });
      assert.equal(errUnauth.statusCode, 401);

      // Forbidden role
      let errForbidden = null;
      middleware({ user: { role: 'candidate' } }, {}, (err) => {
        errForbidden = err;
      });
      assert.equal(errForbidden.statusCode, 403);
      assert.equal(errForbidden.code, 'FORBIDDEN_ROLE');

      // Allowed role
      let allowed = false;
      middleware({ user: { role: 'admin' } }, {}, () => {
        allowed = true;
      });
      assert.equal(allowed, true);
    });

    it('requireOwnershipOrCounselor grants supervisory access and checks candidate ownership', () => {
      const middleware = requireOwnershipOrCounselor('id');

      // Unauthenticated
      let errUnauth = null;
      middleware({}, {}, (err) => {
        errUnauth = err;
      });
      assert.equal(errUnauth.statusCode, 401);

      // Counselor supervisory access
      let counselorAllowed = false;
      middleware({ user: { role: 'counselor', userId: 1 }, params: { id: '99' } }, {}, () => {
        counselorAllowed = true;
      });
      assert.equal(counselorAllowed, true);

      // Candidate matching own id
      let ownAllowed = false;
      middleware({ user: { role: 'candidate', userId: 10 }, params: { id: '10' } }, {}, () => {
        ownAllowed = true;
      });
      assert.equal(ownAllowed, true);

      // Candidate attempting cross-user access or invalid param
      let errCross = null;
      middleware({ user: { role: 'candidate', userId: 10 }, params: { id: '20' } }, {}, (err) => {
        errCross = err;
      });
      assert.equal(errCross.statusCode, 403);
      assert.equal(errCross.code, 'FORBIDDEN_RESOURCE_ACCESS');

      let errNaN = null;
      middleware({ user: { role: 'candidate', userId: 10 }, params: { id: 'abc' } }, {}, (err) => {
        errNaN = err;
      });
      assert.equal(errNaN.statusCode, 403);
    });
  });

  describe('requireResourceOwnershipOrCounselor (IDOR protection)', () => {
    it('throws error for unsupported ownership resource types', () => {
      assert.throws(
        () => requireResourceOwnershipOrCounselor('unsupported_type'),
        /Unsupported ownership resource type/
      );
    });

    it('enforces IDOR defense with mock query function across all outcomes', async () => {
      const mockQuery = mock.fn(async (sql, params) => {
        if (params[0] === 404) return { rows: [] };
        if (params[0] === 500) throw new Error('DB connection reset');
        return { rows: [{ user_id: 10 }] }; // owned by user 10
      });

      const middleware = requireResourceOwnershipOrCounselor('goal', 'id', mockQuery);

      // Unauthenticated
      let errUnauth = null;
      await middleware({}, {}, (err) => {
        errUnauth = err;
      });
      assert.equal(errUnauth.statusCode, 401);

      // Counselor supervisor pass-through
      let counselorPass = false;
      await middleware({ user: { role: 'counselor' } }, {}, () => {
        counselorPass = true;
      });
      assert.equal(counselorPass, true);

      // Invalid / non-positive resource ID
      let errInvalidId = null;
      await middleware({ user: { role: 'candidate', userId: 10 }, params: { id: '-5' } }, {}, (err) => {
        errInvalidId = err;
      });
      assert.equal(errInvalidId.statusCode, 403);

      // Resource not found in database (404)
      let errNotFound = null;
      await middleware({ user: { role: 'candidate', userId: 10 }, params: { id: '404' } }, {}, (err) => {
        errNotFound = err;
      });
      assert.ok(errNotFound instanceof NotFoundError);

      // Cross-candidate access attempt (unowned resource)
      let errForbidden = null;
      await middleware({ user: { role: 'candidate', userId: 99 }, params: { id: '1' } }, {}, (err) => {
        errForbidden = err;
      });
      assert.equal(errForbidden.statusCode, 403);
      assert.equal(errForbidden.code, 'FORBIDDEN_RESOURCE_ACCESS');

      // Valid ownership match
      let validPass = false;
      await middleware({ user: { role: 'candidate', userId: 10 }, params: { id: '1' } }, {}, () => {
        validPass = true;
      });
      assert.equal(validPass, true);

      // Database unexpected failure propagated to next
      let errDb = null;
      await middleware({ user: { role: 'candidate', userId: 10 }, params: { id: '500' } }, {}, (err) => {
        errDb = err;
      });
      assert.equal(errDb.message, 'DB connection reset');
    });
  });

  describe('requireBodyUserOwnershipOrCounselor', () => {
    it('validates request-body ownership against session identity', () => {
      const middleware = requireBodyUserOwnershipOrCounselor('user_id');

      // Unauthenticated
      let errUnauth = null;
      middleware({}, {}, (err) => {
        errUnauth = err;
      });
      assert.equal(errUnauth.statusCode, 401);

      // Counselor supervisor
      let counselorPass = false;
      middleware({ user: { role: 'counselor' } }, {}, () => {
        counselorPass = true;
      });
      assert.equal(counselorPass, true);

      // Cross-user submission in body
      let errCross = null;
      middleware({ user: { role: 'candidate', userId: 5 }, body: { user_id: 12 } }, {}, (err) => {
        errCross = err;
      });
      assert.equal(errCross.statusCode, 403);

      // Valid matching body user_id
      let ownPass = false;
      middleware({ user: { role: 'candidate', userId: 5 }, body: { user_id: '5' } }, {}, () => {
        ownPass = true;
      });
      assert.equal(ownPass, true);
    });
  });

  describe('csrfProtection & originValidationMiddleware', () => {
    it('allows safe HTTP methods to bypass CSRF validation', () => {
      for (const method of ['GET', 'HEAD', 'OPTIONS']) {
        let called = false;
        csrfProtection({ method }, {}, () => {
          called = true;
        });
        assert.equal(called, true);
      }
    });

    it('rejects mutating requests with missing, malformed, or mismatched CSRF tokens', () => {
      // Missing token
      let errMissing = null;
      csrfProtection({ method: 'POST', headers: {}, cookies: {} }, {}, (err) => {
        errMissing = err;
      });
      assert.equal(errMissing.statusCode, 403);
      assert.equal(errMissing.code, 'CSRF_TOKEN_MISSING');

      // Malformed cookie (not raw.sig)
      let errMalformed = null;
      csrfProtection(
        { method: 'POST', headers: { 'x-csrf-token': 'abc' }, cookies: { sb_csrf_token: 'not-split-by-dot' } },
        {},
        (err) => {
          errMalformed = err;
        }
      );
      assert.equal(errMalformed.statusCode, 403);
      assert.equal(errMalformed.code, 'CSRF_TOKEN_INVALID');

      // Header token does not match cookie raw token
      let errMismatch = null;
      csrfProtection(
        { method: 'POST', headers: { 'x-csrf-token': 'header_val' }, cookies: { sb_csrf_token: 'cookie_val.sig' } },
        {},
        (err) => {
          errMismatch = err;
        }
      );
      assert.equal(errMismatch.statusCode, 403);
      assert.equal(errMismatch.code, 'CSRF_TOKEN_INVALID');

      // Tampered signature
      const validPair = generateCsrfToken('anonymous');
      let errTampered = null;
      csrfProtection(
        {
          method: 'POST',
          headers: { 'x-csrf-token': validPair.rawToken },
          cookies: { sb_csrf_token: `${validPair.rawToken}.tampered_sig_1234567890abcdef` },
        },
        {},
        (err) => {
          errTampered = err;
        }
      );
      assert.equal(errTampered.statusCode, 403);
      assert.equal(errTampered.code, 'CSRF_TOKEN_INVALID');
    });

    it('validates genuine CSRF token pairs for anonymous and authenticated sessions', () => {
      // Anonymous
      const anonPair = generateCsrfToken('anonymous');
      let anonPassed = false;
      csrfProtection(
        {
          method: 'POST',
          headers: { 'x-csrf-token': anonPair.rawToken },
          cookies: { sb_csrf_token: anonPair.cookieValue },
        },
        {},
        () => {
          anonPassed = true;
        }
      );
      assert.equal(anonPassed, true);

      // Authenticated with req.user.userId
      const userPair = generateCsrfToken(42);
      let userPassed = false;
      csrfProtection(
        {
          method: 'POST',
          headers: { 'x-csrf-token': userPair.rawToken },
          cookies: { sb_csrf_token: userPair.cookieValue },
          user: { userId: 42 },
        },
        {},
        () => {
          userPassed = true;
        }
      );
      assert.equal(userPassed, true);
    });

    it('originValidationMiddleware blocks unauthorized foreign origins on mutating requests', () => {
      // GET passes regardless of origin
      let getPassed = false;
      originValidationMiddleware({ method: 'GET', headers: { origin: 'http://malicious.com' } }, {}, () => {
        getPassed = true;
      });
      assert.equal(getPassed, true);

      // POST without origin passes (server-to-server or test runner)
      let postNoOrigin = false;
      originValidationMiddleware({ method: 'POST', headers: {} }, {}, () => {
        postNoOrigin = true;
      });
      assert.equal(postNoOrigin, true);

      // POST with authorized origin passes
      let postAllowed = false;
      originValidationMiddleware(
        { method: 'POST', headers: { origin: 'http://localhost:3000' } },
        {},
        () => {
          postAllowed = true;
        }
      );
      assert.equal(postAllowed, true);

      // POST with dynamic Host header origin passes
      let hostAllowed = false;
      originValidationMiddleware(
        {
          method: 'POST',
          headers: { origin: 'http://custom-host:8080', host: 'custom-host:8080' },
          protocol: 'http',
        },
        {},
        () => {
          hostAllowed = true;
        }
      );
      assert.equal(hostAllowed, true);

      // POST with blocked origin
      let errBlocked = null;
      originValidationMiddleware(
        { method: 'POST', headers: { origin: 'http://evil-attacker.site' } },
        {},
        (err) => {
          errBlocked = err;
        }
      );
      assert.equal(errBlocked.statusCode, 403);
      assert.equal(errBlocked.code, 'CORS_ORIGIN_DENIED');
    });
  });
});

