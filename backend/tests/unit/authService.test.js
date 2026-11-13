import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  comparePassword,
  generateJwt,
  verifyJwt,
  generateActivationToken,
  hashToken,
  sanitizeUser,
} from '../../src/services/auth.service.js';

describe('Auth Service - Cryptographic Engine & Security Rules', () => {
  it('hashes passwords using bcrypt with cost factor 12', async () => {
    const rawPassword = 'SecureP@ssw0rd2026!';
    const hash = await hashPassword(rawPassword);

    assert.ok(hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$'), 'Hash must use cost factor 12');
    const isMatch = await comparePassword(rawPassword, hash);
    assert.strictEqual(isMatch, true, 'Original password must verify against hash');

    const wrongMatch = await comparePassword('WrongPassword123!', hash);
    assert.strictEqual(wrongMatch, false, 'Incorrect password must be rejected');
  });

  it('rejects passwords exceeding 72 bytes with PASSWORD_TOO_LONG error', async () => {
    const longPassword = 'A'.repeat(73); // 73 UTF-8 bytes
    assert.strictEqual(Buffer.byteLength(longPassword, 'utf8'), 73);

    await assert.rejects(
      async () => {
        await hashPassword(longPassword);
      },
      (err) => {
        assert.strictEqual(err.code, 'PASSWORD_TOO_LONG');
        assert.ok(err.message.includes('72 bytes'));
        return true;
      }
    );

    // comparePassword should return false when given a password exceeding 72 bytes
    const fakeHash = '$2b$12$e8wV4oQ1tW...dummyhash';
    const compareResult = await comparePassword(longPassword, fakeHash);
    assert.strictEqual(compareResult, false);
  });

  it('accepts passwords up to exactly 72 bytes', async () => {
    const maxValidPassword = 'A'.repeat(72);
    assert.strictEqual(Buffer.byteLength(maxValidPassword, 'utf8'), 72);

    const hash = await hashPassword(maxValidPassword);
    assert.ok(hash);
    const verified = await comparePassword(maxValidPassword, hash);
    assert.strictEqual(verified, true);
  });

  it('generates and verifies signed JWT tokens with identity claims', () => {
    const claims = { userId: 1, email: 'priya.sharma@example.com', role: 'candidate' };
    const token = generateJwt(claims);

    assert.ok(token);
    assert.strictEqual(typeof token, 'string');

    const decoded = verifyJwt(token);
    assert.strictEqual(decoded.userId, 1);
    assert.strictEqual(decoded.email, 'priya.sharma@example.com');
    assert.strictEqual(decoded.role, 'candidate');
    assert.ok(decoded.exp, 'Token must have expiration');
  });

  it('generates 256-bit activation token with matching SHA-256 hash', () => {
    const { rawToken, tokenHash } = generateActivationToken();

    assert.strictEqual(typeof rawToken, 'string');
    assert.strictEqual(rawToken.length, 64, 'Raw token must be 64 hex chars (256 bits)');

    assert.strictEqual(typeof tokenHash, 'string');
    assert.strictEqual(tokenHash.length, 64, 'Token hash must be 64 hex chars (SHA-256)');

    const recalculatedHash = hashToken(rawToken);
    assert.strictEqual(tokenHash, recalculatedHash, 'SHA-256 digest must match exactly');
  });

  it('sanitizes user record by stripping credentials and token hashes', () => {
    const rawUser = {
      user_id: 1,
      email: 'priya.sharma@example.com',
      full_name: 'Priya Sharma',
      role: 'candidate',
      password_hash: '$2b$12$somehashedpasswordstring',
      activation_token_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      activation_token_expires_at: new Date(),
      created_at: new Date(),
    };

    const sanitized = sanitizeUser(rawUser);

    assert.strictEqual(sanitized.user_id, 1);
    assert.strictEqual(sanitized.email, 'priya.sharma@example.com');
    assert.strictEqual(sanitized.full_name, 'Priya Sharma');
    assert.strictEqual(sanitized.role, 'candidate');
    assert.strictEqual(sanitized.password_hash, undefined, 'password_hash must be stripped');
    assert.strictEqual(sanitized.activation_token_hash, undefined, 'activation_token_hash must be stripped');
    assert.strictEqual(sanitized.activation_token_expires_at, undefined, 'activation_token_expires_at must be stripped');
  });

  it('rejects empty or non-string passwords and tokens', async () => {
    await assert.rejects(() => hashPassword(''), /Password must be a non-empty string/);
    await assert.rejects(() => hashPassword(null), /Password must be a non-empty string/);
    await assert.rejects(() => hashPassword(12345), /Password must be a non-empty string/);

    assert.equal(await comparePassword(null, 'hash'), false);
    assert.equal(await comparePassword('pass', null), false);
    assert.equal(await comparePassword(123, 'hash'), false);
    assert.equal(await comparePassword('pass', 123), false);

    assert.throws(() => hashToken(''), /Token must be a non-empty string/);
    assert.throws(() => hashToken(null), /Token must be a non-empty string/);
    assert.throws(() => hashToken(12345), /Token must be a non-empty string/);
  });
});


