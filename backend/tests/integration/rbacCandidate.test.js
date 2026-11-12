import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { invokeHandler } from './testHarness.js';
import { userController } from '../../src/controllers/user.controller.js';
import { catalogController } from '../../src/controllers/catalog.controller.js';
import { authenticateToken, requireOwnershipOrCounselor } from '../../src/middleware/auth.js';
import { authService } from '../../src/services/auth.service.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';

describe('RBAC Candidate Domain & Horizontal Isolation (AUTH-07, AUTH-08)', () => {
  const candidate1Token = authService.generateJwt({ userId: 1, email: 'priya.sharma@example.com', role: 'candidate' });
  const candidate2Token = authService.generateJwt({ userId: 2, email: 'rahul.verma@example.com', role: 'candidate' });

  it('rejects unauthenticated request to protected candidate route with HTTP 401', async () => {
    const res = await invokeHandler(authenticateToken, {
      method: 'GET',
      cookies: {},
    });

    assert.equal(res.status, HTTP_STATUS.UNAUTHORIZED);
    assert.equal(res.body.code, 'AUTHENTICATION_REQUIRED');
  });

  it('rejects tampered or corrupted JWT token with HTTP 401', async () => {
    const res = await invokeHandler(authenticateToken, {
      method: 'GET',
      cookies: { sb_auth_token: 'invalid.corrupted.token' },
    });

    assert.equal(res.status, HTTP_STATUS.UNAUTHORIZED);
    assert.equal(res.body.code, 'TOKEN_INVALID');
  });

  it('allows candidate Priya Sharma (userId=1) to access her own profile', async () => {
    // 1. Authenticate token
    const authRes = await invokeHandler(authenticateToken, {
      method: 'GET',
      cookies: { sb_auth_token: candidate1Token },
    });
    assert.equal(authRes.nextCalled, true);

    // 2. Ownership guard on :id = 1
    const ownershipGuard = requireOwnershipOrCounselor('id');
    const guardRes = await invokeHandler(ownershipGuard, {
      user: { userId: 1, role: 'candidate' },
      params: { id: '1' },
    });
    assert.equal(guardRes.nextCalled, true, 'Candidate must be authorized for own ID');
  });

  it('blocks candidate Priya Sharma (userId=1) from accessing candidate Rahul Verma (userId=2) with HTTP 403', async () => {
    const ownershipGuard = requireOwnershipOrCounselor('id');
    const guardRes = await invokeHandler(ownershipGuard, {
      user: { userId: 1, role: 'candidate' },
      params: { id: '2' },
    });

    assert.equal(guardRes.status, HTTP_STATUS.FORBIDDEN);
    assert.equal(guardRes.body.status, 'fail');
    assert.equal(guardRes.body.code, 'FORBIDDEN_RESOURCE_ACCESS');
  });

  it('blocks candidate Rahul Verma (userId=2) from accessing Priya Sharma education with HTTP 403', async () => {
    const ownershipGuard = requireOwnershipOrCounselor('id');
    const guardRes = await invokeHandler(ownershipGuard, {
      user: { userId: 2, role: 'candidate' },
      params: { id: '1' },
    });

    assert.equal(guardRes.status, HTTP_STATUS.FORBIDDEN);
    assert.equal(guardRes.body.code, 'FORBIDDEN_RESOURCE_ACCESS');
  });

  it('preserves public access to catalog endpoints without authentication', async () => {
    const res = await invokeHandler(catalogController.listFields, {
      method: 'GET',
    });

    // Public catalog returns 200 (or 503 if DB offline), never 401/403
    assert.ok(res.status === HTTP_STATUS.OK || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE);
  });
});
