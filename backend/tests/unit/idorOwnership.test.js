import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  requireResourceOwnershipOrCounselor,
  requireBodyUserOwnershipOrCounselor,
} from '../../src/middleware/auth.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';

describe('IDOR Resource Ownership & Body Ownership Guards (Unit Tests)', () => {
  it('requireResourceOwnershipOrCounselor blocks unauthenticated requests with 401', async () => {
    const middleware = requireResourceOwnershipOrCounselor('goal', 'goalId', async () => ({ rows: [] }));
    await new Promise((resolve) => {
      middleware({ params: { goalId: '2' } }, {}, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, HTTP_STATUS.UNAUTHORIZED);
        assert.equal(err.code, 'AUTHENTICATION_REQUIRED');
        resolve();
      });
    });
  });

  it('requireResourceOwnershipOrCounselor permits counselor/admin supervisory access without blocking', async () => {
    let dbCalled = false;
    const middleware = requireResourceOwnershipOrCounselor('goal', 'goalId', async () => {
      dbCalled = true;
      return { rows: [{ user_id: 2 }] };
    });

    await new Promise((resolve, reject) => {
      middleware({ user: { userId: 99, role: 'counselor' }, params: { goalId: '2' } }, {}, (err) => {
        if (err) return reject(err);
        assert.equal(dbCalled, false);
        resolve();
      });
    });
  });

  it('requireResourceOwnershipOrCounselor blocks candidate accessing another candidate resource with 403', async () => {
    const middleware = requireResourceOwnershipOrCounselor('learningPlan', 'planId', async (sql, params) => {
      assert.match(sql, /FROM learning_plans/i);
      assert.deepEqual(params, [2]);
      return { rows: [{ user_id: 2 }] };
    });

    await new Promise((resolve) => {
      middleware({ user: { userId: 1, role: 'candidate' }, params: { planId: '2' } }, {}, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN);
        assert.equal(err.code, 'FORBIDDEN_RESOURCE_ACCESS');
        resolve();
      });
    });
  });

  it('requireResourceOwnershipOrCounselor allows owning candidate and returns 404 when resource missing', async () => {
    const ownerMw = requireResourceOwnershipOrCounselor('learningPlanItem', 'itemId', async () => ({
      rows: [{ user_id: 1 }],
    }));

    await new Promise((resolve, reject) => {
      ownerMw({ user: { userId: 1, role: 'candidate' }, params: { itemId: '1' } }, {}, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const missingMw = requireResourceOwnershipOrCounselor('analysis', 'analysisId', async () => ({
      rows: [],
    }));

    await new Promise((resolve) => {
      missingMw({ user: { userId: 1, role: 'candidate' }, params: { analysisId: '99999' } }, {}, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, HTTP_STATUS.NOT_FOUND);
        resolve();
      });
    });
  });

  it('requireBodyUserOwnershipOrCounselor prevents candidates from submitting records for other user IDs', async () => {
    const guard = requireBodyUserOwnershipOrCounselor('user_id');

    await new Promise((resolve) => {
      guard({ user: { userId: 1, role: 'candidate' }, body: { user_id: 2, score: 95 } }, {}, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN);
        assert.equal(err.code, 'FORBIDDEN_RESOURCE_ACCESS');
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      guard({ user: { userId: 1, role: 'candidate' }, body: { user_id: 1, score: 95 } }, {}, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      guard({ user: { userId: 99, role: 'counselor' }, body: { user_id: 2, score: 95 } }, {}, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
});

