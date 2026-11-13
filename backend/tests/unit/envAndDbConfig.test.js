import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as signature from 'cookie-signature';
import { validateProductionEnv } from '../../src/config/env.js';
import { pool, getPoolDiagnostics, withTransaction } from '../../src/config/db.js';
import { cookieParser } from '../../src/middleware/cookieParser.js';
import { DatabaseError } from '../../src/errors/DatabaseError.js';

describe('Environment, Database Configuration & CookieParser Unit Tests', () => {
  describe('validateProductionEnv', () => {
    it('bypasses validation when NODE_ENV is not production', () => {
      assert.equal(validateProductionEnv({ NODE_ENV: 'development' }), true);
      assert.equal(validateProductionEnv({ NODE_ENV: 'test' }), true);
    });

    it('throws when secrets are weak, placeholders, or PGPASSWORD is missing in production', () => {
      // Weak / placeholder secrets
      assert.throws(
        () =>
          validateProductionEnv({
            NODE_ENV: 'production',
            JWT_SECRET: 'short',
            CSRF_SECRET: 'dev_csrf_secret_key_minimum_256_bits_long',
            COOKIE_SECRET: 'super_secret_cookie_key_minimum_256_bits',
            PGPASSWORD: '',
          }),
        (err) => {
          assert.match(err.message, /\[PRODUCTION ENV ERROR\]/);
          assert.match(err.message, /JWT_SECRET must be at least 32 characters/);
          assert.match(err.message, /CSRF_SECRET must be at least 32 characters/);
          assert.match(err.message, /COOKIE_SECRET must be at least 32 characters/);
          assert.match(err.message, /PGPASSWORD must be configured/);
          return true;
        }
      );

      // Non-string or null secrets
      assert.throws(
        () =>
          validateProductionEnv({
            NODE_ENV: 'production',
            JWT_SECRET: null,
            CSRF_SECRET: undefined,
            COOKIE_SECRET: 12345,
            PGPASSWORD: null,
          }),
        (err) => {
          assert.match(err.message, /\[PRODUCTION ENV ERROR\]/);
          return true;
        }
      );
    });

    it('passes when strong, valid secrets and database credentials are provided in production', () => {
      const validConfig = {
        NODE_ENV: 'production',
        JWT_SECRET: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
        CSRF_SECRET: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        COOKIE_SECRET: '8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b',
        PGPASSWORD: 'StrongProductionPassword2026!',
      };

      assert.equal(validateProductionEnv(validConfig), true);
    });
  });

  describe('Database Pool & Diagnostics', () => {
    it('returns pool diagnostics metrics object', () => {
      const diag = getPoolDiagnostics();
      assert.ok('totalCount' in diag);
      assert.ok('idleCount' in diag);
      assert.ok('waitingCount' in diag);
    });

    it('logs idle client errors without crashing', () => {
      let logged = false;
      const originalConsoleError = console.error;
      console.error = (msg) => {
        if (msg.includes('[DATABASE POOL ERROR]')) logged = true;
      };

      try {
        pool.emit('error', new Error('Simulated idle client disconnect'));
        assert.equal(logged, true);
      } finally {
        console.error = originalConsoleError;
      }
    });

    it('withTransaction executes commit on success and handles rollback on failure', async () => {
      const fakeClient = {
        query: mock.fn(async (sql) => ({ rows: [] })),
        release: mock.fn(),
      };
      mock.method(pool, 'connect', async () => fakeClient);

      // Success path
      const res = await withTransaction(async (client) => {
        await client.query('SELECT 1');
        return 'success_val';
      });

      assert.equal(res, 'success_val');
      assert.equal(fakeClient.query.mock.calls[0].arguments[0], 'BEGIN');
      assert.equal(fakeClient.query.mock.calls[1].arguments[0], 'SELECT 1');
      assert.equal(fakeClient.query.mock.calls[2].arguments[0], 'COMMIT');
      assert.equal(fakeClient.release.mock.calls.length, 1);

      // Failure path with rollback error catch
      let rollbackLogged = false;
      const originalConsoleError = console.error;
      console.error = (msg) => {
        if (typeof msg === 'string' && msg.includes('[DATABASE ROLLBACK ERROR]')) rollbackLogged = true;
      };

      const failingClient = {
        query: mock.fn(async (sql) => {
          if (sql === 'ROLLBACK') throw new Error('Simulated rollback network failure');
          return { rows: [] };
        }),
        release: mock.fn(),
      };
      mock.method(pool, 'connect', async () => failingClient);

      try {
        await assert.rejects(
          () =>
            withTransaction(async () => {
              throw new Error('Business error requiring rollback');
            }),
          /Business error requiring rollback/
        );
        assert.equal(rollbackLogged, true);
        assert.equal(failingClient.release.mock.calls.length, 1);
      } finally {
        console.error = originalConsoleError;
        mock.restoreAll();
      }
    });
  });

  describe('cookieParser Middleware', () => {
    it('skips parsing if req.cookies is already populated', (t) => {
      const middleware = cookieParser('secret');
      const req = { cookies: { existing: 'token' } };
      let calledNext = false;

      middleware(req, {}, () => {
        calledNext = true;
      });

      assert.equal(calledNext, true);
      assert.equal(req.cookies.existing, 'token');
    });

    it('handles requests without cookie header by setting empty objects', () => {
      const middleware = cookieParser('secret');
      const req = { headers: {} };
      let calledNext = false;

      middleware(req, {}, () => {
        calledNext = true;
      });

      assert.equal(calledNext, true);
      assert.deepEqual(req.cookies, {});
      assert.deepEqual(req.signedCookies, {});
    });

    it('parses unsigned cookies and decrypts signed cookies with single or array of secrets', () => {
      const primarySecret = 'primary_cookie_secret_key_12345';
      const secondarySecret = 'secondary_cookie_secret_key_6789';

      const signedVal = 's:' + signature.sign('session_data_123', primarySecret);
      const secondarySignedVal = 's:' + signature.sign('backup_session_456', secondarySecret);
      const tamperedVal = 's:tampered_signature_payload';

      const middleware = cookieParser([secondarySecret, primarySecret]);
      const req = {
        headers: {
          cookie: `regular=plain_value; session=${signedVal}; backup=${secondarySignedVal}; invalid=${tamperedVal}`,
        },
      };

      let calledNext = false;
      middleware(req, {}, () => {
        calledNext = true;
      });

      assert.equal(calledNext, true);
      assert.equal(req.cookies.regular, 'plain_value');
      assert.equal(req.signedCookies.session, 'session_data_123');
      assert.equal(req.signedCookies.backup, 'backup_session_456');
      assert.equal(req.cookies.invalid, tamperedVal); // remains in unsigned cookies
    });

    it('works without secret parameter and leaves cookies untouched', () => {
      const middleware = cookieParser();
      const req = {
        headers: {
          cookie: 'user=bob; token=s:unsigned_with_no_secret',
        },
      };

      middleware(req, {}, () => {});
      assert.equal(req.cookies.user, 'bob');
      assert.equal(req.cookies.token, 's:unsigned_with_no_secret');
      assert.deepEqual(req.signedCookies, {});
    });
  });

  describe('DatabaseError Class', () => {
    it('instantiates with defaults and maps original PostgreSQL error properties', () => {
      const defaultErr = new DatabaseError();
      assert.equal(defaultErr.message, 'A database error occurred');
      assert.equal(defaultErr.statusCode, 500);
      assert.equal(defaultErr.code, 'DATABASE_ERROR');
      assert.equal(defaultErr.pgCode, undefined);

      const pgErr = {
        code: '23505',
        detail: 'Key (email)=(alice@example.com) already exists.',
        constraint: 'users_email_key',
      };
      const customErr = new DatabaseError('Duplicate user violation', pgErr);
      assert.equal(customErr.message, 'Duplicate user violation');
      assert.equal(customErr.pgCode, '23505');
      assert.equal(customErr.detail, 'Key (email)=(alice@example.com) already exists.');
      assert.equal(customErr.constraint, 'users_email_key');
    });
  });
});

