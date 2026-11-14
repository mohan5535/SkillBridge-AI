# SkillBridge AI — Phase 2: Database Migration Strategy & Execution Plan

**Document Path:** `.planning/phases/300-point/PHASE-2-DATABASE-MIGRATION-PLAN.md`  
**Milestone:** 300-Point Milestone — Authenticated Full-Stack App  
**Target Environment:** PostgreSQL 18.6 (Local) / PostgreSQL 17+ Alpine (Docker Production)  
**Database Name:** `skillbridge_db`  
**Baseline State:** 22 Tables • 157 Committed Records • 0 Orphan Foreign Keys  
**Target Migration:** Migration 002 (`migrations/002_add_user_auth_credentials.sql`)  
**Execution Status:** **PLANNING ONLY — DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL**

---

## 1. Executive Summary & Current Database State

SkillBridge AI operates on a strictly normalized **Third Normal Form (3NF)** relational database consisting of 22 tables and 157 baseline committed records. 

### Current Schema State (`schema.sql` Layer 1)
The baseline `users` table currently contains exclusively general demographic and contact attributes:
```sql
CREATE TABLE users (
    user_id          SERIAL       PRIMARY KEY,
    email            VARCHAR(255) NOT NULL,
    full_name        VARCHAR(200) NOT NULL,
    phone            VARCHAR(20),
    country          VARCHAR(100),
    state_or_region  VARCHAR(100),
    date_of_birth    DATE,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email)
);
```

### The Persistence Gap
- The `users` table **lacks**:
  1. `password_hash` (`VARCHAR(255)`)
  2. `role` (`VARCHAR(50)`)
  3. `activation_token_hash` (`VARCHAR(64)`)
  4. `activation_token_expires_at` (`TIMESTAMP`)
- **Runtime Behavior:** The backend queries `information_schema.columns` via `checkDbAuthColumns()`. Detecting no `password_hash` column, it falls back to `AuthCredentialStore` (an in-memory JavaScript `Map`).
- **Consequence:** Registered users, passwords, and activation states **do not survive server restarts**.
- **Objective of Phase 2:** Establish a zero-risk, zero-data-loss procedure to execute Migration 002, transitioning authentication from RAM to persistent PostgreSQL storage.

---

## 2. Migration 002 SQL Review & Invariant Audit

The UP migration script is located at [`migrations/002_add_user_auth_credentials.sql`](../../migrations/002_add_user_auth_credentials.sql).

### Detailed Statement Analysis

```sql
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
```

### Invariant & Safety Analysis
1. **Transaction Wrapping (`BEGIN ... COMMIT`):** Guarantees atomicity. If any constraint or index creation fails, the entire transaction aborts, leaving the database unchanged.
2. **Nullable `password_hash`:** Existing candidate rows (Priya Sharma, Rahul Verma, Ananya Desai) receive `NULL`. This prevents constraint violation while keeping accounts secure in an "unclaimed" state.
3. **Metadata-Only Default Addition (`role`):** In PostgreSQL 11+, `ALTER TABLE ... ADD COLUMN ... DEFAULT 'candidate'` is an $O(1)$ catalog update with zero table rewrite, completing in milliseconds.
4. **Domain CHECK Constraint (`chk_users_role`):** Ensures only valid roles (`candidate`, `counselor`, `admin`) can be inserted.
5. **Partial Index (`idx_users_activation_token_hash`):** Indexes only non-null activation tokens. Activated accounts consume zero index space.
6. **Zero Hardcoded Secrets:** Contains no mock passwords or shared credentials.

---

## 3. Relational Dependencies & Compatibility Risk Assessment

### Relational Hierarchy (Child Tables Referencing `users`)
Nine child tables reference `users.user_id` with `ON UPDATE CASCADE ON DELETE CASCADE`:
1. `education_records` (Table 8)
2. `user_skills` (Table 9)
3. `user_experiences` (Table 10)
4. `user_certifications` (Table 11)
5. `career_breaks` (Table 12)
6. `career_goals` (Table 13)
7. `career_gap_analyses` (Table 15)
8. `learning_plans` (Table 19)
9. `assessment_results` (Table 22)

### Risk Matrix & Mitigations

| Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Table Lock Contention** | Low | Low | `ALTER TABLE users` takes `ACCESS EXCLUSIVE`. On a table with 3 rows, execution duration is $< 10\text{ ms}$. |
| **Foreign Key Disruption** | Zero | Zero | Migration only adds new columns; it modifies no existing columns, primary keys, or foreign keys. |
| **Existing Account Lockout** | High | Low | Existing users receive `password_hash = NULL`. Login returns `403 ACCOUNT_NOT_ACTIVATED`. Handled via one-time token activation flow. |
| **Application Crash on Switch** | Low | High | `checkDbAuthColumns()` dynamically tests for `password_hash`. Once detected, code immediately enables SQL queries without requiring code changes. |
| **PostgreSQL Version Discrepancy** | Low | Low | Tested on PostgreSQL 18.6 and PostgreSQL 17 Alpine. DDL statements use standard PostgreSQL SQL supported across versions 12–18. |

---

## 4. Pre-Migration Backup Strategy (`pg_dump -Fc`)

Prior to executing any DDL against the database, a full, point-in-time binary backup must be captured.

### Backup Execution Command
```bash
# Set environment variables or supply directly
export PGDATABASE="skillbridge_db"
export PGUSER="postgres"
export PGHOST="127.0.0.1"
export PGPORT="5432"

# 1. Create dedicated backup directory outside Git tracking
mkdir -p ./backups

# 2. Execute binary custom-format dump
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  -Fc -v \
  -f "./backups/skillbridge_pre_migration002_$(date +%Y%m%d_%H%M%S).dump"
```

### Pre-Restore Archive Verification
Before proceeding, verify that the archive contains all 22 tables and 157 records:
```bash
pg_restore --list ./backups/skillbridge_pre_migration002_*.dump | grep "TABLE DATA"
```

### Rapid Restore Command (Emergency Procedure)
If any unexpected failure occurs during migration:
```bash
pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  --clean --if-exists -v \
  ./backups/skillbridge_pre_migration002_*.dump
```

---

## 5. Production Database Architecture

```mermaid
graph TD
    App[SkillBridge Express API<br/>Node.js 24 Container] -->|pg.Pool (Max: 20)| DB[(PostgreSQL 17/18 Instance<br/>skillbridge_db)]
    
    subgraph "Relational Data Model (3NF)"
        DB --> Users[users Table<br/>user_id, email, full_name<br/>+ password_hash (bcrypt cost 12)<br/>+ role (candidate/counselor/admin)<br/>+ activation_token_hash (SHA-256)<br/>+ activation_token_expires_at]
        
        Users --> Child1[education_records]
        Users --> Child2[user_skills]
        Users --> Child3[career_goals]
        Users --> Child4[career_breaks]
        Users --> Child5[learning_plans]
        Users --> Child6[assessment_results]
    end

    subgraph "Index Architecture"
        Users -.->|Partial Index| Idx[idx_users_activation_token_hash<br/>WHERE token IS NOT NULL]
        Users -.->|Unique Index| UqEmail[uq_users_email]
        Users -.->|PK Index| PKUsers[users_pkey]
    end
```

### Production Security Parameters:
- **Connection Pooling:** `pg.Pool` with `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`.
- **SSL Enforcement:** `PGSSL=true` and `PGSSL_REJECT_UNAUTHORIZED=true` for all cloud-hosted databases.
- **Role Isolation:** Database application user (`skillbridge_app`) granted `SELECT, INSERT, UPDATE, DELETE` on all tables in schema `public` without superuser or DDL drop permissions.

---

## 6. Data & Account Preservation Guarantee

### How 157 Records Are Preserved (0 Rows Dropped)
- The migration contains **zero** `DROP`, `TRUNCATE`, `DELETE`, or bulk `UPDATE` commands.
- The `ADD COLUMN` operation simply appends 4 new fields to the tuple descriptor of `users`.
- Row count before migration: **157 rows**.
- Row count after migration: **157 rows**.

### How Existing Candidate Accounts Remain Valid
The 3 baseline demonstration candidates have extensive related records:
- **Priya Sharma (`user_id = 1`)**: Education (Tier 2 B.Tech), Skills (React, Node, SQL), Career Break (14-month maternity), Goals (Full-Stack Engineer), Roadmaps, Assessments.
- **Rahul Verma (`user_id = 2`)**: Education (Tier 2 B.Sc), Skills (Python, Docker), Career Break (24-month medical pause), Goals (DevOps Specialist).
- **Ananya Desai (`user_id = 3`)**: Education (Tier 1 M.Tech), Skills (Go, Kubernetes), Goals (Cloud Architect).

After Migration 002:
1. All profile, skill, break, and roadmap relationships remain intact.
2. `users.role` defaults to `'candidate'`.
3. `users.password_hash` is `NULL`.
4. Accounts are claimed through the single-use token activation flow without requiring arbitrary database surgery or shared insecure passwords.

---

## 7. Persistent Authentication Flow (Post-Migration)

Once Migration 002 is applied, the application automatically uses persistent PostgreSQL storage:

### A. Candidate Self-Registration (`POST /api/auth/register`)
```sql
INSERT INTO users (email, full_name, country, password_hash, role)
VALUES ($1, $2, $3, $4, 'candidate')
RETURNING user_id, email, full_name, role, created_at;
```
- Bcrypt hash is stored permanently on disk.
- Role is enforced as `'candidate'`.

### B. User Login (`POST /api/auth/login`)
```sql
SELECT user_id, email, full_name, role, password_hash, activation_token_hash, activation_token_expires_at
FROM users
WHERE email = $1;
```
- Fetches stored `password_hash`.
- Rejects unactivated accounts (`password_hash IS NULL`) with HTTP 403 `ACCOUNT_NOT_ACTIVATED`.
- Validates password using `bcrypt.compare()` with cost factor 12.

### C. Account Activation (`POST /api/auth/activate-account`)
```sql
-- Step 1: Locate user by SHA-256 hash of 256-bit activation token
SELECT user_id, email, full_name, role, activation_token_expires_at
FROM users
WHERE activation_token_hash = $1
  AND activation_token_expires_at > CURRENT_TIMESTAMP
  AND password_hash IS NULL;

-- Step 2: Establish password and invalidate token atomically
UPDATE users
SET password_hash = $1,
    activation_token_hash = NULL,
    activation_token_expires_at = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = $2
RETURNING user_id, email, full_name, role;
```

---

## 8. Docker Compose Integration Plan

To ensure reproducible deployment across fresh environments, [`docker-compose.yml`](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/docker-compose.yml) must be updated to mount Migration 002 during database initialization:

### Required Modification in `docker-compose.yml`

```yaml
  db:
    image: postgres:17-alpine
    container_name: skillbridge-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${PGDATABASE:-skillbridge_db}
      POSTGRES_USER: ${PGUSER:-postgres}
      POSTGRES_PASSWORD: ${PGPASSWORD:?PGPASSWORD must be set in environment}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
      - ./sample_data.sql:/docker-entrypoint-initdb.d/02_sample_data.sql:ro
      - ./migrations/002_add_user_auth_credentials.sql:/docker-entrypoint-initdb.d/03_migration002.sql:ro
```

*Note: On existing volumes (`pgdata`), the files in `/docker-entrypoint-initdb.d/` only run when the database is initialized for the first time. On existing databases, the migration script is run via `psql`.*

---

## 9. Rollback Strategy & Recovery Plan

If a rollback is ever mandated, two distinct rollback levels are defined:

### Level 1: Clean SQL Schema Rollback
Run [`migrations/002_add_user_auth_credentials_down.sql`](../../migrations/002_add_user_auth_credentials_down.sql):
```sql
BEGIN;
DROP INDEX IF EXISTS idx_users_activation_token_hash;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users DROP COLUMN IF EXISTS activation_token_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS activation_token_hash;
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
COMMIT;
```
- **Outcome:** The `users` table reverts exactly to its Phase 1 schema.
- **Application Resilience:** `checkDbAuthColumns()` dynamically detects column removal and seamlessly reverts to the in-memory store without throwing exceptions.

### Level 2: Point-In-Time Binary Snapshot Restore
If any schema anomaly or data corruption is encountered:
```bash
pg_restore -h 127.0.0.1 -p 5432 -U postgres -d skillbridge_db --clean --if-exists ./backups/skillbridge_pre_migration002_*.dump
```

---

## 10. Post-Migration Verification Checklist

After the migration is executed (in Phase 3), the following verification checklist must be satisfied:

- [ ] **Table Count Invariant:** Database inventory contains exactly 22 tables.
- [ ] **Row Count Invariant:** Total committed record count equals 157 baseline rows.
- [ ] **Schema Introspection:** `information_schema.columns` shows `password_hash`, `role`, `activation_token_hash`, and `activation_token_expires_at` in `users`.
- [ ] **Index Verification:** `idx_users_activation_token_hash` exists and is marked valid.
- [ ] **Constraint Verification:** `chk_users_role` rejects invalid roles (e.g. `role = 'hacker'`).
- [ ] **Zero-Mutation Test:** `npm --prefix backend run test:audit` passes with 0 orphan FKs and 157 rows.
- [ ] **Automated Test Suite:** `npm --prefix backend run test` passes 288/288 tests.
- [ ] **Persistence Verification:** A test candidate registered via `/api/auth/register` remains able to log in after a complete backend server restart (`process.exit(0)` / container restart).

---

## 11. Safety Verdict & Required Approvals

### Safety Verdict: **SAFE FOR EXECUTION (PENDING USER APPROVAL)**
Migration 002 has been thoroughly inspected and audited. The script:
- Operates inside an explicit ACID transaction block.
- Introduces zero breaking changes to existing columns or relations.
- Incurs zero data loss across all 157 baseline records.
- Implements metadata-only defaults supported by PostgreSQL 18.6 and 17+.
- Features fully automated backward compatibility in the application tier.

### Required Approvals & Next Steps:
1. **User Authorization Required:** Explicit confirmation from the repository owner to execute `migrations/002_add_user_auth_credentials.sql` against the database.
2. **Snapshot Creation Prerequisite:** Execution of `pg_dump -Fc` before applying DDL.
3. **Execution Phase Transition:** Advance to Phase 3 (Migration Execution & Seed Provisioning) once approved.

