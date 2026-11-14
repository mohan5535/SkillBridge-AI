import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/config/db.js';
import { authService } from '../../src/services/auth.service.js';
import { authController } from '../../src/controllers/auth.controller.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';
import { DatabaseError } from '../../src/errors/DatabaseError.js';
import {
  checkDbAuthColumns,
  resetDbAuthColumnsCache,
  findUserByEmail,
  findUserById,
  insertCandidate,
} from '../../src/queries/authQueries.js';
import { authenticateToken, requireRole } from '../../src/middleware/auth.js';

describe('Phase 2 & 3: Persistent Authentication, Security Hardening & Failure Scenarios', () => {
  const originalNodeEnv = env.NODE_ENV;
  let originalPoolQuery;

  beforeEach(() => {
    resetDbAuthColumnsCache();
    originalPoolQuery = pool.query.bind(pool);
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    pool.query = originalPoolQuery;
    resetDbAuthColumnsCache();
  });

  // 1. Password Hashing & Bcrypt Verification
  it('hashes passwords using bcrypt with cost factor 12 and never exposes plaintext', async () => {
    const plaintext = 'SecurePassphrase2026!';
    const hash = await authService.hashPassword(plaintext);

    assert.ok(hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$'), 'Must use bcrypt cost factor 12');
    assert.notEqual(hash, plaintext, 'Hash must never equal plaintext password');

    // Verify bcrypt comparison works
    const isMatch = await authService.comparePassword(plaintext, hash);
    assert.equal(isMatch, true, 'Valid password must match hash');

    const wrongMatch = await authService.comparePassword('WrongPassword123!', hash);
    assert.equal(wrongMatch, false, 'Invalid password must not match hash');
  });

  // 2. Candidate Registration with Persistent PostgreSQL Storage
  it('registers candidate with bcrypt password hash and returns sanitized identity', async () => {
    let capturedInsertSql = null;
    let capturedInsertParams = null;

    pool.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        return { rows: [{ column_name: 'password_hash' }] };
      }
      if (typeof sql === 'string' && sql.includes('WHERE email = $1')) {
        return { rows: [] }; // No existing user
      }
      if (typeof sql === 'string' && sql.includes('INSERT INTO users')) {
        capturedInsertSql = sql;
        capturedInsertParams = params;
        return {
          rows: [
            {
              user_id: 101,
              email: params[0],
              full_name: params[1],
              role: 'candidate',
              created_at: new Date(),
            },
          ],
        };
      }
      return originalPoolQuery(sql, params);
    };

    const req = {
      body: {
        email: 'persistent.candidate@skillbridge.org',
        full_name: 'Persistent Candidate',
        password: 'ValidCandidatePass123!',
        country: 'India',
      },
    };

    let responseStatus = null;
    let responseBody = null;
    let setCookies = [];

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      cookie(name, val, opts) {
        setCookies.push({ name, val, opts });
      },
    };

    await authController.register(req, res, () => {});

    assert.equal(responseStatus, HTTP_STATUS.CREATED);
    assert.equal(responseBody.status, 'success');
    assert.equal(responseBody.data.user.email, 'persistent.candidate@skillbridge.org');
    assert.equal(responseBody.data.user.role, 'candidate');
    assert.equal(responseBody.data.user.password_hash, undefined, 'password_hash must be sanitized');

    // Verify SQL query and parameters
    assert.ok(capturedInsertSql.includes('INSERT INTO users'), 'Must insert into PostgreSQL users table');
    assert.equal(capturedInsertParams[0], 'persistent.candidate@skillbridge.org');
    assert.equal(capturedInsertParams[1], 'Persistent Candidate');
    assert.equal(capturedInsertParams[2], 'India');
    assert.ok(capturedInsertParams[3].startsWith('$2b$12$') || capturedInsertParams[3].startsWith('$2a$12$'), 'Password must be stored as bcrypt hash');

    // Verify cookies set
    assert.ok(setCookies.some((c) => c.name === 'sb_auth_token'), 'Must issue sb_auth_token cookie');
    assert.ok(setCookies.some((c) => c.name === 'sb_csrf_token'), 'Must issue sb_csrf_token cookie');
  });

  // 3. Login Verification: Stored Password Hash Matching
  it('successfully logs in candidate when password matches stored bcrypt hash', async () => {
    const rawPass = 'CorrectCandidatePass123!';
    const passwordHash = await bcrypt.hash(rawPass, 10);

    pool.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        return { rows: [{ column_name: 'password_hash' }] };
      }
      if (typeof sql === 'string' && sql.includes('WHERE email = $1')) {
        return {
          rows: [
            {
              user_id: 102,
              email: 'candidate.login@skillbridge.org',
              full_name: 'Login Candidate',
              role: 'candidate',
              password_hash: passwordHash,
              activation_token_hash: null,
              activation_token_expires_at: null,
            },
          ],
        };
      }
      return originalPoolQuery(sql, params);
    };

    const req = {
      body: {
        email: 'candidate.login@skillbridge.org',
        password: rawPass,
      },
    };

    let responseStatus = null;
    let responseBody = null;
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      cookie() {},
    };

    await authController.login(req, res, () => {});

    assert.equal(responseStatus, HTTP_STATUS.OK);
    assert.equal(responseBody.status, 'success');
    assert.equal(responseBody.data.user.email, 'candidate.login@skillbridge.org');
  });

  // 4. Login Rejection: Incorrect Password
  it('rejects login with HTTP 401 when password does not match hash', async () => {
    const passwordHash = await bcrypt.hash('CorrectPass123!', 10);

    pool.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        return { rows: [{ column_name: 'password_hash' }] };
      }
      if (typeof sql === 'string' && sql.includes('WHERE email = $1')) {
        return {
          rows: [
            {
              user_id: 103,
              email: 'candidate.login@skillbridge.org',
              full_name: 'Login Candidate',
              role: 'candidate',
              password_hash: passwordHash,
            },
          ],
        };
      }
      return originalPoolQuery(sql, params);
    };

    const req = {
      body: {
        email: 'candidate.login@skillbridge.org',
        password: 'WrongPassword123!',
      },
    };

    let capturedError = null;
    await authController.login(req, {}, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError, 'Must pass error to next()');
    assert.equal(capturedError.statusCode, HTTP_STATUS.UNAUTHORIZED);
    assert.equal(capturedError.code, 'INVALID_CREDENTIALS');
  });

  // 5. Login Rejection: Unactivated Account (password_hash IS NULL)
  it('rejects login with HTTP 403 when candidate has not activated password', async () => {
    pool.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        return { rows: [{ column_name: 'password_hash' }] };
      }
      if (typeof sql === 'string' && sql.includes('WHERE email = $1')) {
        return {
          rows: [
            {
              user_id: 1,
              email: 'priya.sharma@email.com',
              full_name: 'Priya Sharma',
              role: 'candidate',
              password_hash: null, // Unactivated account
            },
          ],
        };
      }
      return originalPoolQuery(sql, params);
    };

    const req = {
      body: {
        email: 'priya.sharma@email.com',
        password: 'AttemptPassword123!',
      },
    };

    let capturedError = null;
    await authController.login(req, {}, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError);
    assert.equal(capturedError.statusCode, HTTP_STATUS.FORBIDDEN);
    assert.equal(capturedError.code, 'ACCOUNT_NOT_ACTIVATED');
  });

  // 6. Logout: Clears Session and CSRF Cookies
  it('terminates session and clears cookies on logout', async () => {
    const clearedCookies = [];
    const res = {
      clearCookie(name, opts) {
        clearedCookies.push({ name, opts });
      },
      status(code) {
        assert.equal(code, HTTP_STATUS.OK);
        return this;
      },
      json(data) {
        assert.equal(data.status, 'success');
        return this;
      },
    };

    await authController.logout({}, res);

    assert.ok(clearedCookies.some((c) => c.name === 'sb_auth_token'), 'sb_auth_token cookie must be cleared');
    assert.ok(clearedCookies.some((c) => c.name === 'sb_csrf_token'), 'sb_csrf_token cookie must be cleared');
  });

  // 7. Session/Profile Retrieval: GET /api/auth/me
  it('returns authenticated user profile when session is valid and 401 when absent', async () => {
    pool.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        return { rows: [{ column_name: 'password_hash' }] };
      }
      if (typeof sql === 'string' && sql.includes('WHERE user_id = $1')) {
        return {
          rows: [
            {
              user_id: 104,
              email: 'candidate.me@skillbridge.org',
              full_name: 'Me Candidate',
              role: 'candidate',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return originalPoolQuery(sql, params);
    };

    // Authenticated request
    const authReq = {
      user: { userId: 104, email: 'candidate.me@skillbridge.org', role: 'candidate' },
    };

    let meStatus = null;
    let meBody = null;
    const res = {
      status(code) {
        meStatus = code;
        return this;
      },
      json(data) {
        meBody = data;
        return this;
      },
    };

    await authController.getMe(authReq, res, () => {});

    assert.equal(meStatus, HTTP_STATUS.OK);
    assert.equal(meBody.data.user.email, 'candidate.me@skillbridge.org');

    // Unauthenticated request
    let unauthError = null;
    await authController.getMe({}, {}, (err) => {
      unauthError = err;
    });

    assert.ok(unauthError);
    assert.equal(unauthError.statusCode, HTTP_STATUS.UNAUTHORIZED);
    assert.equal(unauthError.code, 'AUTHENTICATION_REQUIRED');
  });

  // 8. Protected Routes & RBAC Enforcement
  it('authenticateToken rejects unauthenticated requests with HTTP 401 and accepts valid JWT', async () => {
    let unauthError = null;
    authenticateToken({ cookies: {}, headers: {} }, {}, (err) => {
      unauthError = err;
    });

    assert.ok(unauthError);
    assert.equal(unauthError.statusCode, HTTP_STATUS.UNAUTHORIZED);

    // Valid JWT
    const token = authService.generateJwt({ userId: 105, email: 'user@skillbridge.org', role: 'candidate' });
    const req = { cookies: { sb_auth_token: token }, headers: {} };
    let passed = false;

    authenticateToken(req, {}, (err) => {
      assert.ifError(err);
      passed = true;
    });

    assert.equal(passed, true);
    assert.equal(req.user.userId, 105);
    assert.equal(req.user.role, 'candidate');
  });

  it('requireRole rejects unauthorized role with HTTP 403 and allows authorized role', () => {
    const candidateReq = { user: { userId: 106, role: 'candidate' } };
    let forbiddenError = null;

    requireRole('counselor')(candidateReq, {}, (err) => {
      forbiddenError = err;
    });

    assert.ok(forbiddenError);
    assert.equal(forbiddenError.statusCode, HTTP_STATUS.FORBIDDEN);
    assert.equal(forbiddenError.code, 'FORBIDDEN_ROLE');

    // Authorized counselor
    const counselorReq = { user: { userId: 107, role: 'counselor' } };
    let counselorPassed = false;

    requireRole('counselor')(counselorReq, {}, (err) => {
      assert.ifError(err);
      counselorPassed = true;
    });

    assert.equal(counselorPassed, true);
  });

  // 9. Database Error Scenarios: Duplicate Registration (23505) and Connection Failure
  it('handles duplicate registration conflict (HTTP 409) when user email already exists', async () => {
    pool.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        return { rows: [{ column_name: 'password_hash' }] };
      }
      if (typeof sql === 'string' && sql.includes('WHERE email = $1')) {
        return { rows: [{ user_id: 1, email: 'duplicate@skillbridge.org' }] };
      }
      return originalPoolQuery(sql, params);
    };

    const req = {
      body: {
        email: 'duplicate@skillbridge.org',
        full_name: 'Duplicate Candidate',
        password: 'ValidCandidatePass123!',
      },
    };

    let capturedError = null;
    await authController.register(req, {}, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError);
    assert.equal(capturedError.statusCode, HTTP_STATUS.CONFLICT);
    assert.equal(capturedError.code, 'DUPLICATE_EMAIL');
  });

  it('verifies production fail-fast throws DatabaseError when PostgreSQL is unavailable', async () => {
    env.NODE_ENV = 'production';
    pool.query = async (sql) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        throw new Error('Database connection refused at 127.0.0.1:5432');
      }
      return originalPoolQuery(sql);
    };

    await assert.rejects(
      async () => {
        await checkDbAuthColumns();
      },
      (err) => {
        assert.ok(err instanceof DatabaseError);
        assert.match(err.message, /Failed to introspect database authentication schema/);
        return true;
      }
    );
  });
});

