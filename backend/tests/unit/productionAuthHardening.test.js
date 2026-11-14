import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/config/db.js';
import {
  checkDbAuthColumns,
  resetDbAuthColumnsCache,
  authCredentialStore,
  insertCandidate,
  findUserByEmail,
  findUserById,
} from '../../src/queries/authQueries.js';
import { DatabaseError } from '../../src/errors/DatabaseError.js';

describe('Production Authentication Hardening & Fail-Fast Fallback Guard (Phase 4B)', () => {
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

  it('verifies that in production, database introspection failure throws DatabaseError', async () => {
    env.NODE_ENV = 'production';
    pool.query = async (sql) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        throw new Error('Connection timeout to PostgreSQL');
      }
      return originalPoolQuery(sql);
    };

    await assert.rejects(
      async () => {
        await checkDbAuthColumns();
      },
      (err) => {
        assert.ok(err instanceof DatabaseError, 'Must be instance of DatabaseError');
        assert.match(err.message, /Failed to introspect database authentication schema/);
        return true;
      }
    );
  });

  it('verifies that in production, missing auth columns (0 rows returned) throws DatabaseError', async () => {
    env.NODE_ENV = 'production';
    pool.query = async (sql) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        return { rows: [] }; // Simulate missing Migration 002
      }
      return originalPoolQuery(sql);
    };

    await assert.rejects(
      async () => {
        await checkDbAuthColumns();
      },
      (err) => {
        assert.ok(err instanceof DatabaseError);
        assert.match(err.message, /Database authentication schema is missing in production/);
        return true;
      }
    );
  });

  it('verifies that production cannot use in-memory AuthCredentialStore fallback', async () => {
    env.NODE_ENV = 'production';

    assert.throws(
      () => {
        authCredentialStore.initUser(999, 'fail@prod.org', 'Fail User');
      },
      (err) => {
        assert.ok(err instanceof DatabaseError);
        assert.match(err.message, /AuthCredentialStore cannot be accessed in production environment/);
        return true;
      }
    );

    assert.throws(
      () => {
        authCredentialStore.registerCandidate('fail@prod.org', 'Fail User', 'hash');
      },
      (err) => {
        assert.ok(err instanceof DatabaseError);
        assert.match(err.message, /AuthCredentialStore cannot be accessed in production environment/);
        return true;
      }
    );
  });

  it('verifies that insertCandidate throws DatabaseError in production if fallback is reached', async () => {
    env.NODE_ENV = 'production';
    // Simulate checkDbAuthColumns returning false (or bypassed)
    pool.query = async (sql) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        return { rows: [] };
      }
      return originalPoolQuery(sql);
    };

    await assert.rejects(
      async () => {
        await insertCandidate('prod.fail@example.com', 'Prod Fail', 'hash');
      },
      (err) => {
        assert.ok(err instanceof DatabaseError);
        return true;
      }
    );
  });

  it('verifies that successful database introspection caches true and enables PostgreSQL path', async () => {
    env.NODE_ENV = 'production';
    let queryCount = 0;

    pool.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        queryCount++;
        return { rows: [{ column_name: 'password_hash' }] };
      }
      return originalPoolQuery(sql, params);
    };

    const firstCheck = await checkDbAuthColumns();
    assert.equal(firstCheck, true);
    assert.equal(queryCount, 1);

    // Second check should use cached true without querying database again
    const secondCheck = await checkDbAuthColumns();
    assert.equal(secondCheck, true);
    assert.equal(queryCount, 1, 'Subsequent checks must use cached true');

    // Reset cache and verify query executes again
    resetDbAuthColumnsCache();
    const thirdCheck = await checkDbAuthColumns();
    assert.equal(thirdCheck, true);
    assert.equal(queryCount, 2, 'After resetDbAuthColumnsCache, query must execute again');
  });

  it('verifies that in development/test, failed introspection does not cache false permanently', async () => {
    env.NODE_ENV = 'test';
    let failQuery = true;

    pool.query = async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('information_schema.columns')) {
        if (failQuery) {
          throw new Error('Transient DB socket error');
        }
        return { rows: [{ column_name: 'password_hash' }] };
      }
      return originalPoolQuery(sql, params);
    };

    // First attempt fails transiently: returns false without throwing in test mode
    const firstAttempt = await checkDbAuthColumns();
    assert.equal(firstAttempt, false);

    // Database recovers
    failQuery = false;

    // Second attempt should not be permanently locked to false; it should query again and succeed
    const secondAttempt = await checkDbAuthColumns();
    assert.equal(secondAttempt, true, 'Transient failure in dev/test must not permanently lock cache to false');
  });
});

