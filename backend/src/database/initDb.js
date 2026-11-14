import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';
import { DatabaseError } from '../errors/DatabaseError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSqlFilePath(fileName) {
  // Try backend/database/<fileName>
  const localDbPath = path.resolve(__dirname, '../../database', fileName);
  if (fs.existsSync(localDbPath)) {
    return localDbPath;
  }
  // Fallback to project root if running from repository root
  const rootMap = {
    'schema_ddl.sql': path.resolve(__dirname, '../../../schema.sql'),
    'sample_data.sql': path.resolve(__dirname, '../../../sample_data.sql'),
    '002_migration.sql': path.resolve(__dirname, '../../../migrations/002_add_user_auth_credentials.sql'),
  };
  if (rootMap[fileName] && fs.existsSync(rootMap[fileName])) {
    return rootMap[fileName];
  }
  throw new Error(`Required SQL file not found: ${fileName} (checked ${localDbPath})`);
}

/**
 * Checks the existing tables in the PostgreSQL public schema.
 * @param {object} client - pg client or pool
 * @returns {Promise<Set<string>>} Set of existing table names in lowercase
 */
export async function getExistingTables(client = pool) {
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  return new Set(res.rows.map((r) => r.table_name.toLowerCase()));
}

/**
 * Checks if Migration 002 authentication columns exist on the 'users' table.
 * @param {object} client - pg client or pool
 * @returns {Promise<boolean>}
 */
export async function checkMigration002Applied(client = pool) {
  const res = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password_hash'
  `);
  return res.rows.length > 0;
}

/**
 * Safely initializes the database schema, baseline catalog, and authentication migrations.
 * Guaranteed zero-mutation & zero-data-loss behavior:
 * - If 0 tables exist: executes DDL, seeds baseline domain records, and applies Migration 002.
 * - If tables exist: NEVER drops, recreates, or truncates any table. Preserves existing users and records.
 *   Checks whether Migration 002 is present and applies it safely in a transaction if missing.
 * - If an inconsistent partial schema is detected without 'users', fails fast to protect existing data.
 * @param {object} [options]
 * @param {object} [options.dbClient] - Optional transactional client
 * @returns {Promise<{ action: string, message: string }>}
 */
export async function ensureDatabaseInitialized(options = {}) {
  const client = options.dbClient || (await pool.connect());
  const shouldRelease = !options.dbClient;

  try {
    const existingTables = await getExistingTables(client);

    // Case 1: Completely fresh, empty database (0 tables in public schema)
    if (existingTables.size === 0) {
      console.log('[DATABASE INIT] Empty PostgreSQL database detected (0 tables). Beginning automated zero-loss initialization...');

      const ddlSql = fs.readFileSync(getSqlFilePath('schema_ddl.sql'), 'utf8');
      const seedSql = fs.readFileSync(getSqlFilePath('sample_data.sql'), 'utf8');
      const migSql = fs.readFileSync(getSqlFilePath('002_migration.sql'), 'utf8');

      await client.query('BEGIN');
      try {
        console.log('[DATABASE INIT] Applying 3NF relational schema (22 tables)...');
        await client.query(ddlSql);

        console.log('[DATABASE INIT] Populating baseline catalog and initial candidate records...');
        await client.query(seedSql);

        console.log('[DATABASE INIT] Applying Migration 002 authentication & RBAC columns...');
        await client.query(migSql);

        await client.query('COMMIT');
        console.log('[DATABASE INIT] Production schema initialization completed successfully.');
        return {
          action: 'initialized',
          message: 'Database schema, baseline catalog, and Migration 002 applied successfully.',
        };
      } catch (initErr) {
        await client.query('ROLLBACK');
        throw new DatabaseError(`Failed to initialize database schema: ${initErr.message}`, initErr);
      }
    }

    // Case 2: Standard existing database with 'users' table present
    if (existingTables.has('users')) {
      console.log(`[DATABASE INIT] Existing database detected (${existingTables.size} tables). Preserving all existing records and schema.`);

      const hasMig002 = await checkMigration002Applied(client);
      if (hasMig002) {
        console.log('[DATABASE INIT] PostgreSQL authentication schema verified (Migration 002 active).');
        return {
          action: 'verified',
          message: 'All tables and authentication columns already present.',
        };
      }

      console.log('[DATABASE INIT] Migration 002 authentication columns missing. Applying Migration 002 in transaction...');
      const migSql = fs.readFileSync(getSqlFilePath('002_migration.sql'), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(migSql);
        await client.query('COMMIT');
        console.log('[DATABASE INIT] Migration 002 applied successfully to existing users table.');
        return {
          action: 'migrated',
          message: 'Migration 002 applied successfully to existing database.',
        };
      } catch (migErr) {
        await client.query('ROLLBACK');
        throw new DatabaseError(`Failed to apply Migration 002: ${migErr.message}`, migErr);
      }
    }

    // Case 3: Inconsistent state (tables exist, but 'users' is missing)
    const errMessage = `[DATABASE INIT FATAL] Inconsistent schema detected: ${existingTables.size} tables found, but 'users' table is missing. Refusing to run destructive operations.`;
    console.error(errMessage);
    throw new DatabaseError(errMessage);
  } finally {
    if (shouldRelease && client.release) {
      client.release();
    }
  }
}
