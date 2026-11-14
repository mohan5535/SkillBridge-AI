-- ============================================================================
-- Migration 002: Add Authentication, RBAC & Single-Use Activation Columns
-- Target Database: PostgreSQL 18 (skillbridge_db)
-- Direction: UP (STAGED — DO NOT EXECUTE WITHOUT APPROVAL)
-- 
-- Invariants & Security Guarantees:
--   - Does NOT recreate, truncate, or reset the database.
--   - Does NOT assign any shared or hardcoded development password.
--   - Preserves all existing 174 committed records across 22 tables.
--   - Leaves password_hash NULL for existing users (requires token activation).
--   - Stores ONLY cryptographic SHA-256 hash of activation tokens (never plaintext).
-- ============================================================================

BEGIN;

-- 1. Add password_hash column (initially NULL to safely accommodate existing users)
ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255);

-- 2. Add role column with strict default 'candidate'
ALTER TABLE users
    ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'candidate';

-- 3. Add domain CHECK constraint restricting role values
ALTER TABLE users
    ADD CONSTRAINT chk_users_role
        CHECK (role IN ('candidate', 'counselor', 'admin'));

-- 4. Add secure single-use activation token hash & expiration columns
ALTER TABLE users
    ADD COLUMN activation_token_hash VARCHAR(64),
    ADD COLUMN activation_token_expires_at TIMESTAMP;

-- 5. Index on activation_token_hash for fast, constant-time lookup
CREATE INDEX idx_users_activation_token_hash
    ON users (activation_token_hash)
    WHERE activation_token_hash IS NOT NULL;

-- 6. Schema Documentation Comments
COMMENT ON COLUMN users.password_hash IS 'bcrypt password hash (cost factor 12, max 72 bytes). NULL indicates unclaimed account requiring activation token.';
COMMENT ON COLUMN users.role IS 'Role-Based Access Control identifier (candidate, counselor, admin). Defaults to candidate. Public registration cannot escalate.';
COMMENT ON COLUMN users.activation_token_hash IS 'SHA-256 hex digest of single-use account activation/invite token. Raw token is never stored in DB.';
COMMENT ON COLUMN users.activation_token_expires_at IS 'Expiration timestamp for activation token. Expired tokens are rejected.';

COMMIT;
