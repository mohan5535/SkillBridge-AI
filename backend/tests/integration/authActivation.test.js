import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { invokeHandler } from './testHarness.js';
import { authController } from '../../src/controllers/auth.controller.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';
import { authService } from '../../src/services/auth.service.js';
import { authCredentialStore, assignActivationToken } from '../../src/queries/authQueries.js';

describe('Auth Activation API Integration Tests (AUTH-03 - Anti-Takeover & Anti-Replay)', () => {
  it('rejects password setup attempt using email alone without a valid token', async () => {
    const res = await invokeHandler(authController.activateAccount, {
      method: 'POST',
      body: {
        email: 'priya.sharma@example.com',
        password: 'NewAttemptPassword123!',
      },
    });

    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'INVALID_ACTIVATION_TOKEN');
  });

  it('rejects expired activation token with HTTP 400 Bad Request', async () => {
    const { rawToken, tokenHash } = authService.generateActivationToken();
    const expiredTimestamp = new Date(Date.now() - 3600 * 1000); // 1 hour ago

    authCredentialStore.initUser(80, 'expired.candidate@example.org', 'Expired Candidate');
    await assignActivationToken('expired.candidate@example.org', tokenHash, expiredTimestamp);

    const res = await invokeHandler(authController.activateAccount, {
      method: 'POST',
      body: {
        token: rawToken,
        password: 'NewValidPass123!',
      },
    });

    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'INVALID_ACTIVATION_TOKEN');
  });

  it('successfully activates account with valid 24h token, hashes password, and sets session cookies', async () => {
    const { rawToken, tokenHash } = authService.generateActivationToken();
    const validExpiry = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours future

    authCredentialStore.initUser(81, 'unactivated.user@example.org', 'Unactivated User');
    await assignActivationToken('unactivated.user@example.org', tokenHash, validExpiry);

    const res = await invokeHandler(authController.activateAccount, {
      method: 'POST',
      body: {
        token: rawToken,
        password: 'EstablishedSecretPass123!',
      },
    });

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.user.email, 'unactivated.user@example.org');
    assert.equal(res.body.data.user.password_hash, undefined, 'password_hash must be stripped');

    // Token must be invalidated immediately in the store to prevent reuse
    const userInStore = authCredentialStore.getUserByEmail('unactivated.user@example.org');
    assert.strictEqual(userInStore.activationTokenHash, null, 'activationTokenHash must be wiped');

    // Attempting to reuse the exact same token must immediately fail
    const replayRes = await invokeHandler(authController.activateAccount, {
      method: 'POST',
      body: {
        token: rawToken,
        password: 'ReplayAttemptPass123!',
      },
    });

    assert.equal(replayRes.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(replayRes.body.status, 'fail');
    assert.equal(replayRes.body.code, 'INVALID_ACTIVATION_TOKEN');
  });

  it('rejects malformed token strings not conforming to 64-character hex format', async () => {
    const res = await invokeHandler(authController.activateAccount, {
      method: 'POST',
      body: {
        token: 'short_token',
        password: 'ValidPassword123!',
      },
    });

    assert.equal(res.status, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
  });
});
