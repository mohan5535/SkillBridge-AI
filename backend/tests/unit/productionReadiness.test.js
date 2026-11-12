import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateProductionEnv, env } from '../../src/config/env.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { authService } from '../../src/services/auth.service.js';
import { authController } from '../../src/controllers/auth.controller.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';

describe('Production Readiness, Environment Validation & Container Hardening', () => {
  it('validateProductionEnv rejects dev/placeholder secrets and missing PGPASSWORD in production', () => {
    assert.throws(
      () =>
        validateProductionEnv({
          NODE_ENV: 'production',
          JWT_SECRET: 'dev_jwt_secret_key_minimum_256_bits_for_skillbridge_ai_development_mode_only',
          CSRF_SECRET: 'a'.repeat(48),
          COOKIE_SECRET: 'b'.repeat(48),
          PGPASSWORD: 'strong_db_password',
        }),
      /JWT_SECRET/
    );

    assert.throws(
      () =>
        validateProductionEnv({
          NODE_ENV: 'production',
          JWT_SECRET: 'a'.repeat(48),
          CSRF_SECRET: 'b'.repeat(48),
          COOKIE_SECRET: 'c'.repeat(48),
          PGPASSWORD: '',
        }),
      /PGPASSWORD/
    );

    assert.equal(
      validateProductionEnv({
        NODE_ENV: 'production',
        JWT_SECRET: '9f8e7d6c5b4a39281716151413121110fedcba9876543210',
        CSRF_SECRET: '1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7081',
        COOKIE_SECRET: '5f4e3d2c1b0a9f8e7d6c5b4a392817161514131211109f8e',
        PGPASSWORD: 'strong_runtime_password',
      }),
      true
    );
  });

  it('errorHandler masks internal 500 error message, detail, and constraint in production', () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      let capturedStatus = null;
      let capturedBody = null;
      const res = {
        status(code) {
          capturedStatus = code;
          return this;
        },
        json(payload) {
          capturedBody = payload;
          return this;
        },
      };

      errorHandler(
        {
          message: 'FATAL: relation "users" internal host 10.0.0.4',
          detail: 'Internal stack detail',
          constraint: 'uq_secret',
        },
        {},
        res,
        () => {}
      );

      assert.equal(capturedStatus, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      assert.equal(capturedBody.message, 'An unexpected internal server error occurred');
      assert.equal(capturedBody.detail, undefined);
      assert.equal(capturedBody.constraint, undefined);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('verifyJwt enforces pinned HS256 algorithm and rejects alg=none unsigned tokens', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 1, role: 'admin' })).toString('base64url');
    const forgedToken = `${header}.${payload}.`;

    assert.throws(() => authService.verifyJwt(forgedToken));
  });

  it('setDemoSession fails closed with HTTP 403 when ALLOW_DEMO_SESSION is disabled', async () => {
    const prevAllow = env.ALLOW_DEMO_SESSION;
    env.ALLOW_DEMO_SESSION = false;
    try {
      let capturedErr = null;
      await authController.setDemoSession(
        { body: { persona: 'counselor' } },
        {},
        (err) => {
          capturedErr = err;
        }
      );
      assert.ok(capturedErr);
      assert.equal(capturedErr.statusCode, HTTP_STATUS.FORBIDDEN);
      assert.equal(capturedErr.code, 'DEMO_SESSION_DISABLED');
    } finally {
      env.ALLOW_DEMO_SESSION = prevAllow;
    }
  });

  it('Dockerfile, docker-compose.yml, and .gitignore enforce non-root runtime, zero fallback secrets, and secret exclusion', () => {
    const rootDir = path.resolve('..');
    const dockerfile = fs.readFileSync(path.join(rootDir, 'Dockerfile'), 'utf8');
    const compose = fs.readFileSync(path.join(rootDir, 'docker-compose.yml'), 'utf8');
    const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');

    assert.match(dockerfile, /^USER node$/m);
    assert.doesNotMatch(compose, /SkillBridgeSecure2026!/);
    assert.doesNotMatch(compose, /production_jwt_secret/);
    assert.match(compose, /127\.0\.0\.1:5432:5432/);
    assert.match(compose, /ALLOW_DEMO_SESSION/);

    assert.match(gitignore, /^backend\/\.env$/m);
    assert.match(gitignore, /^\*\.dump$/m);
    assert.match(gitignore, /^backup_\*\/$/m);
  });
});

