import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upPath = path.resolve(__dirname, '../../../migrations/002_add_user_auth_credentials.sql');
const downPath = path.resolve(__dirname, '../../../migrations/002_add_user_auth_credentials_down.sql');

describe('Migration 002 - Static Schema Safety & Rollback Audit', () => {
  const upSql = fs.readFileSync(upPath, 'utf8');
  const downSql = fs.readFileSync(downPath, 'utf8');

  it('verifies UP script adds password_hash as nullable to safely accommodate existing records', () => {
    assert.match(
      upSql,
      /ADD\s+COLUMN\s+password_hash\s+VARCHAR\(255\);/i,
      'password_hash must be VARCHAR(255) and nullable (NOT containing NOT NULL)'
    );
    assert.doesNotMatch(
      upSql,
      /ADD\s+COLUMN\s+password_hash\s+VARCHAR\(255\)\s+NOT\s+NULL/i,
      'password_hash must not be marked NOT NULL initially'
    );
  });

  it('verifies UP script defaults role to candidate and enforces domain check constraint', () => {
    assert.match(
      upSql,
      /ADD\s+COLUMN\s+role\s+VARCHAR\(50\)\s+NOT\s+NULL\s+DEFAULT\s+'candidate'/i,
      'role column must default to candidate'
    );
    assert.match(
      upSql,
      /ADD\s+CONSTRAINT\s+chk_users_role\s+CHECK\s*\(\s*role\s+IN\s*\('candidate',\s*'counselor',\s*'admin'\)\s*\)/i,
      'chk_users_role must restrict values to candidate, counselor, and admin'
    );
  });

  it('verifies UP script adds activation token hash and timestamp with index', () => {
    assert.match(
      upSql,
      /ADD\s+COLUMN\s+activation_token_hash\s+VARCHAR\(64\)/i,
      'activation_token_hash must be VARCHAR(64) for SHA-256'
    );
    assert.match(
      upSql,
      /ADD\s+COLUMN\s+activation_token_expires_at\s+TIMESTAMP/i,
      'activation_token_expires_at must be TIMESTAMP'
    );
    assert.match(
      upSql,
      /CREATE\s+INDEX\s+idx_users_activation_token_hash\s+ON\s+users\s*\(\s*activation_token_hash\s*\)/i,
      'idx_users_activation_token_hash must be created'
    );
  });

  it('verifies UP script contains zero hardcoded passwords or bulk updates', () => {
    assert.doesNotMatch(
      upSql,
      /UPDATE\s+users\s+SET\s+password_hash/i,
      'UP script must never backfill existing users with shared passwords'
    );
    assert.doesNotMatch(
      upSql,
      /password123|admin123|counselor123/i,
      'UP script must contain zero hardcoded credentials'
    );
  });

  it('verifies DOWN script documents permanent data loss and drops all 4 columns', () => {
    assert.match(
      downSql,
      /IRREVERSIBLE DATA LOSS NOTICE/i,
      'DOWN script must feature prominent irreversible data loss warning'
    );
    assert.match(
      downSql,
      /pg_dump/i,
      'DOWN script must mandate database dump prior to execution'
    );
    assert.match(
      downSql,
      /DROP\s+INDEX\s+IF\s+EXISTS\s+idx_users_activation_token_hash/i,
      'DOWN script must drop token hash index'
    );
    assert.match(
      downSql,
      /DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+chk_users_role/i,
      'DOWN script must drop role constraint'
    );
    assert.match(downSql, /DROP\s+COLUMN\s+IF\s+EXISTS\s+password_hash/i);
    assert.match(downSql, /DROP\s+COLUMN\s+IF\s+EXISTS\s+role/i);
    assert.match(downSql, /DROP\s+COLUMN\s+IF\s+EXISTS\s+activation_token_hash/i);
    assert.match(downSql, /DROP\s+COLUMN\s+IF\s+EXISTS\s+activation_token_expires_at/i);
  });
});

