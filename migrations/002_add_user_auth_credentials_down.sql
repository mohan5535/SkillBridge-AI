-- ============================================================================
-- Migration 002: Add Authentication, RBAC & Single-Use Activation Columns
-- Target Database: PostgreSQL 18 (skillbridge_db)
-- Direction: DOWN (STAGED — REQUIRES EXPLICIT APPROVAL AND BACKUP)
-- 
-- WARNING — IRREVERSIBLE DATA LOSS NOTICE:
--   Executing this script PERMANENTLY DROPS the 'password_hash', 'role',
--   'activation_token_hash', and 'activation_token_expires_at' columns.
--   ALL USER PASSWORDS, ROLES, AND AUTH CREDENTIALS WILL BE IRRETRIEVABLY DELETED.
--   A full database dump (pg_dump) must be performed prior to running this script.
--   Preserves all other 22 relational tables and baseline user profile data.
-- ============================================================================

BEGIN;

-- 1. Drop index on activation token hash
DROP INDEX IF EXISTS idx_users_activation_token_hash;

-- 2. Drop role domain CHECK constraint
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_role;

-- 3. Permanently drop auth and token columns
ALTER TABLE users
    DROP COLUMN IF EXISTS activation_token_expires_at;

ALTER TABLE users
    DROP COLUMN IF EXISTS activation_token_hash;

ALTER TABLE users
    DROP COLUMN IF EXISTS role;

ALTER TABLE users
    DROP COLUMN IF EXISTS password_hash;

COMMIT;
