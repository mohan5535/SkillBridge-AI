import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { invokeHandler } from './testHarness.js';
import { authenticateToken, requireRole, requireOwnershipOrCounselor } from '../../src/middleware/auth.js';
import { analyticsController } from '../../src/controllers/analytics.controller.js';
import { authService } from '../../src/services/auth.service.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';

describe('RBAC Counselor Domain & Analytics Privilege Gate (AUTH-07, AUTH-08)', () => {
  const candidateToken = authService.generateJwt({ userId: 1, email: 'priya.sharma@example.com', role: 'candidate' });
  const counselorToken = authService.generateJwt({ userId: 99, email: 'counselor.raj@skillbridge.org', role: 'counselor' });

  it('rejects candidate attempting to access Executive Analytics dashboard with HTTP 403 FORBIDDEN_ROLE', async () => {
    // 1. Authenticate candidate
    const authRes = await invokeHandler(authenticateToken, {
      cookies: { sb_auth_token: candidateToken },
    });
    assert.equal(authRes.nextCalled, true);

    // 2. Check counselor role gate
    const counselorGuard = requireRole('counselor', 'admin');
    const guardRes = await invokeHandler(counselorGuard, {
      user: { userId: 1, role: 'candidate' },
    });

    assert.equal(guardRes.status, HTTP_STATUS.FORBIDDEN);
    assert.equal(guardRes.body.status, 'fail');
    assert.equal(guardRes.body.code, 'FORBIDDEN_ROLE');
  });

  it('rejects candidate attempting to access at-risk cohort analytics with HTTP 403', async () => {
    const counselorGuard = requireRole('counselor', 'admin');
    const guardRes = await invokeHandler(counselorGuard, {
      user: { userId: 1, role: 'candidate' },
    });

    assert.equal(guardRes.status, HTTP_STATUS.FORBIDDEN);
    assert.equal(guardRes.body.code, 'FORBIDDEN_ROLE');
  });

  it('authorizes Counselor on Executive Analytics dashboard gate', async () => {
    const counselorGuard = requireRole('counselor', 'admin');
    const guardRes = await invokeHandler(counselorGuard, {
      user: { userId: 99, role: 'counselor' },
    });

    assert.equal(guardRes.nextCalled, true, 'Counselor must be authorized to access analytics');
  });

  it('authorizes Counselor to audit Candidate 1 and Candidate 2 records (supervisory access)', async () => {
    const ownershipGuard = requireOwnershipOrCounselor('id');

    // Counselor auditing Candidate 1
    const guardRes1 = await invokeHandler(ownershipGuard, {
      user: { userId: 99, role: 'counselor' },
      params: { id: '1' },
    });
    assert.equal(guardRes1.nextCalled, true, 'Counselor can audit candidate 1');

    // Counselor auditing Candidate 2
    const guardRes2 = await invokeHandler(ownershipGuard, {
      user: { userId: 99, role: 'counselor' },
      params: { id: '2' },
    });
    assert.equal(guardRes2.nextCalled, true, 'Counselor can audit candidate 2');
  });
});

