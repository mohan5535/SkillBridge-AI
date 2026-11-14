import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePgSsl,
  parsePgSslRejectUnauthorized,
  validateProductionEnv,
} from '../../src/config/env.js';
import { getDbSslConfig } from '../../src/config/db.js';
import {
  getExistingTables,
  checkMigration002Applied,
  ensureDatabaseInitialized,
} from '../../src/database/initDb.js';
import { DatabaseError } from '../../src/errors/DatabaseError.js';

describe('Render Production Database Deployment, SSL & Safe Initialization Suite', () => {
  describe('Phase 1: PostgreSQL SSL Configuration Parsing', () => {
    it('ensures PGSSL=false explicitly disables TLS even if PGSSLMODE=require', () => {
      assert.equal(parsePgSsl({ PGSSL: 'false', PGSSLMODE: 'require' }), false);
      assert.equal(parsePgSsl({ PGSSL: 'false' }), false);
      assert.equal(parsePgSsl({ PGSSLMODE: 'disable' }), false);
    });

    it('ensures PGSSL=true enables TLS', () => {
      assert.equal(parsePgSsl({ PGSSL: 'true' }), true);
      assert.equal(parsePgSsl({ PGSSL: 'true', PGSSLMODE: 'disable' }), true);
    });

    it('falls back to standard PGSSLMODE when PGSSL is unset', () => {
      assert.equal(parsePgSsl({ PGSSLMODE: 'require' }), true);
      assert.equal(parsePgSsl({ PGSSLMODE: 'verify-ca' }), true);
      assert.equal(parsePgSsl({ PGSSLMODE: 'verify-full' }), true);
      assert.equal(parsePgSsl({ PGSSLMODE: 'prefer' }), false);
      assert.equal(parsePgSsl({}), false);
    });

    it('enforces strict certificate verification by default (rejectUnauthorized: true)', () => {
      assert.equal(parsePgSslRejectUnauthorized({}), true);
      assert.equal(parsePgSslRejectUnauthorized({ PGSSL: 'true' }), true);
      assert.equal(parsePgSslRejectUnauthorized({ PGSSL_REJECT_UNAUTHORIZED: 'true' }), true);
      assert.equal(parsePgSslRejectUnauthorized({ PGSSL_REJECT_UNAUTHORIZED: 'false' }), false);
      assert.equal(parsePgSslRejectUnauthorized({ PGSSLMODE: 'no-verify' }), false);
    });

    it('getDbSslConfig returns false when PGSSL is disabled to prevent unintended TLS negotiation in pg', () => {
      const sslConfig = getDbSslConfig({ PGSSL: false });
      assert.equal(sslConfig, false, 'Must explicitly pass ssl: false to pg.Pool constructor');
    });

    it('getDbSslConfig returns strict verification object with optional CA when enabled', () => {
      const strictConfig = getDbSslConfig({
        PGSSL: true,
        PGSSL_REJECT_UNAUTHORIZED: true,
      });
      assert.deepEqual(strictConfig, { rejectUnauthorized: true });

      const caConfig = getDbSslConfig({
        PGSSL: true,
        PGSSL_REJECT_UNAUTHORIZED: true,
        PGSSL_CA: '-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----',
      });
      assert.equal(caConfig.rejectUnauthorized, true);
      assert.match(caConfig.ca, /BEGIN CERTIFICATE/);
    });
  });

  describe('Phase 2: Database Configuration Validation', () => {
    it('validates that production fails fast on missing PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT', () => {
      const baseValid = {
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(48),
        CSRF_SECRET: 'b'.repeat(48),
        COOKIE_SECRET: 'c'.repeat(48),
        PGHOST: 'dpg-mock-render-internal',
        PGPORT: 5432,
        PGDATABASE: 'skillbridge_db',
        PGUSER: 'postgres',
        PGPASSWORD: 'SecureProductionPassword123!',
      };

      assert.equal(validateProductionEnv(baseValid), true);

      // Missing PGHOST
      assert.throws(
        () => validateProductionEnv({ ...baseValid, PGHOST: '' }),
        /PGHOST must be configured/
      );

      // Missing PGDATABASE
      assert.throws(
        () => validateProductionEnv({ ...baseValid, PGDATABASE: '   ' }),
        /PGDATABASE must be configured/
      );

      // Missing PGUSER
      assert.throws(
        () => validateProductionEnv({ ...baseValid, PGUSER: null }),
        /PGUSER must be configured/
      );

      // Invalid PGPORT
      assert.throws(
        () => validateProductionEnv({ ...baseValid, PGPORT: 70000 }),
        /PGPORT must be a valid port number/
      );
      assert.throws(
        () => validateProductionEnv({ ...baseValid, PGPORT: -5 }),
        /PGPORT must be a valid port number/
      );
    });
  });

  describe('Phase 3: Database Schema Safe Initialization Engine', () => {
    it('getExistingTables returns lowercased set of table names', async () => {
      const mockClient = {
        query: mock.fn(async () => ({
          rows: [{ table_name: 'USERS' }, { table_name: 'career_fields' }],
        })),
      };

      const tables = await getExistingTables(mockClient);
      assert.equal(tables.has('users'), true);
      assert.equal(tables.has('career_fields'), true);
      assert.equal(tables.size, 2);
    });

    it('checkMigration002Applied detects presence of password_hash column', async () => {
      const mockWithCol = {
        query: mock.fn(async () => ({ rows: [{ column_name: 'password_hash' }] })),
      };
      assert.equal(await checkMigration002Applied(mockWithCol), true);

      const mockWithoutCol = {
        query: mock.fn(async () => ({ rows: [] })),
      };
      assert.equal(await checkMigration002Applied(mockWithoutCol), false);
    });

    it('preserves existing database without mutations when tables and password_hash are present', async () => {
      const mockClient = {
        query: mock.fn(async (sql) => {
          if (sql.includes('information_schema.tables')) {
            return {
              rows: [
                { table_name: 'users' },
                { table_name: 'career_fields' },
                { table_name: 'skills' },
              ],
            };
          }
          if (sql.includes('information_schema.columns')) {
            return { rows: [{ column_name: 'password_hash' }] };
          }
          return { rows: [] };
        }),
      };

      const result = await ensureDatabaseInitialized({ dbClient: mockClient });
      assert.equal(result.action, 'verified');
      assert.match(result.message, /already present/);

      // Must never have issued BEGIN, DROP, or CREATE
      const executedSqls = mockClient.query.mock.calls.map((c) => c.arguments[0]);
      assert.equal(executedSqls.some((s) => s.includes('DROP TABLE')), false);
      assert.equal(executedSqls.some((s) => s.includes('CREATE TABLE')), false);
      assert.equal(executedSqls.some((s) => s === 'BEGIN'), false);
    });

    it('safely applies Migration 002 in a transaction if existing database lacks auth columns', async () => {
      const mockClient = {
        query: mock.fn(async (sql) => {
          if (sql.includes('information_schema.tables')) {
            return { rows: [{ table_name: 'users' }] };
          }
          if (sql.includes('information_schema.columns')) {
            return { rows: [] }; // password_hash missing
          }
          return { rows: [] };
        }),
      };

      const result = await ensureDatabaseInitialized({ dbClient: mockClient });
      assert.equal(result.action, 'migrated');

      const executedSqls = mockClient.query.mock.calls.map((c) => c.arguments[0]);
      assert.ok(executedSqls.includes('BEGIN'));
      assert.ok(executedSqls.includes('COMMIT'));
      assert.ok(executedSqls.some((s) => s.includes('ADD COLUMN password_hash')));
    });

    it('rolls back and throws DatabaseError if Migration 002 execution fails', async () => {
      const mockClient = {
        query: mock.fn(async (sql) => {
          if (sql.includes('information_schema.tables')) {
            return { rows: [{ table_name: 'users' }] };
          }
          if (sql.includes('information_schema.columns')) {
            return { rows: [] };
          }
          if (sql.includes('ADD COLUMN password_hash')) {
            throw new Error('Lock timeout');
          }
          return { rows: [] };
        }),
      };

      await assert.rejects(
        () => ensureDatabaseInitialized({ dbClient: mockClient }),
        (err) => {
          assert.ok(err instanceof DatabaseError);
          assert.match(err.message, /Failed to apply Migration 002: Lock timeout/);
          return true;
        }
      );

      const executedSqls = mockClient.query.mock.calls.map((c) => c.arguments[0]);
      assert.ok(executedSqls.includes('ROLLBACK'));
    });

    it('initializes schema, sample data, and migration in single transaction on empty database', async () => {
      const mockClient = {
        query: mock.fn(async (sql) => {
          if (sql.includes('information_schema.tables')) {
            return { rows: [] }; // 0 tables
          }
          return { rows: [] };
        }),
      };

      const result = await ensureDatabaseInitialized({ dbClient: mockClient });
      assert.equal(result.action, 'initialized');

      const executedSqls = mockClient.query.mock.calls.map((c) => c.arguments[0]);
      assert.ok(executedSqls.includes('BEGIN'));
      assert.ok(executedSqls.includes('COMMIT'));
      assert.ok(executedSqls.some((s) => s.includes('CREATE TABLE users')));
      assert.ok(executedSqls.some((s) => s.includes('INSERT INTO users')));
      assert.ok(executedSqls.some((s) => s.includes('ADD COLUMN password_hash')));
      assert.equal(executedSqls.some((s) => s.includes('DROP TABLE')), false);
    });

    it('fails fast and throws DatabaseError when partial schema without users is detected', async () => {
      const mockClient = {
        query: mock.fn(async () => ({
          rows: [{ table_name: 'career_fields' }], // partial tables, users missing
        })),
      };

      await assert.rejects(
        () => ensureDatabaseInitialized({ dbClient: mockClient }),
        (err) => {
          assert.ok(err instanceof DatabaseError);
          assert.match(err.message, /Inconsistent schema detected/);
          return true;
        }
      );
    });
  });
});
