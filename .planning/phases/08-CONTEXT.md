# Phase 8 Context & Architectural Specification: Authentication, Authorization & User Session Security (FINAL SECURITY REVISED)

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Phase:** Phase 8 — Authentication, Authorization & User Session Security  
**Milestone:** Milestone 2 — Backend API & Service Layer Implementation  
**Technology:** Node.js 24 (ESM), Express.js, PostgreSQL 18.6, `pg`, `bcrypt` (cost 12, max 72 bytes), `jsonwebtoken`, `cookie-parser`, `zod`, `crypto` (native)  
**Database:** `skillbridge_db` (22 tables, 174 committed records)  
**Revision Date:** 2026-11-10  
**Status:** Approved Security Architecture (Planning & Architecture Only — Zero Code or Migration Executed)  

---

## 1. Executive Summary & Strict Operational Directives

This document represents the finalized, security-hardened architectural specification for **Phase 8: Authentication, Authorization & User Session Security** of SkillBridge AI. It incorporates all mandatory security directives from the Final Security Review:

1. **Zero Database Mutations in Discuss Phase:** The database remains 100% frozen. No DDL statements, migrations, or data alterations are executed.
2. **Preservation of 174 Committed Records:** All existing records across all 22 normalized tables are strictly preserved. `sample_data.sql` will **never** be rerun.
3. **No Password Setup via Email Alone:** Account takeover is eliminated by requiring a cryptographically secure, single-use, time-bounded activation token.
4. **Token Security:** Only SHA-256 hashes of activation tokens are stored in the database. Raw tokens are never persisted, and tokens are invalidated immediately upon use.
5. **Signed Double-Submit CSRF Protection:** All state-changing authenticated mutations (`POST`, `PUT`, `PATCH`, `DELETE`) require an `X-CSRF-Token` header validated against an HMAC-signed cookie.
6. **Bcrypt Work Factor & Byte Limit:** Hashing utilizes `bcrypt` with cost factor **12** and strictly enforces the **72-byte maximum length limit** (pre-hash byte boundary).
7. **Strict Redaction & Privacy:** Passwords, password hashes, JWTs, and CSRF secrets are **never** logged to stdout, logs, or diagnostic dumps.
8. **Documented Rollback Warning:** The DOWN migration permanently drops authentication credentials and requires explicit user authorization and a full pre-rollback backup.
9. **Rigorous Security Verification Suite:** Concrete test plans covering account takeover, token replay, role escalation, CSRF forgery, and candidate isolation.
10. **Phase 7 Preservation:** All 28 Phase 7 API endpoints remain backward-compatible and functional.

---

## 2. Reversible Schema Migration Specification (Migration 002)

### 2.1 Forward Migration (`migrations/002_add_user_auth_credentials.sql`)
Staged in `migrations/` (unexecuted). Extends `users` with authentication and token state:

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

-- 5. Index on activation_token_hash for constant-time lookup
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

---

### 2.2 Rollback Migration & Permanent Data Loss Warning (`migrations/002_add_user_auth_credentials_down.sql`)

> [!CAUTION]
> **IRREVERSIBLE DATA LOSS NOTICE:**
> Executing `migrations/002_add_user_auth_credentials_down.sql` permanently drops `password_hash`, `role`, `activation_token_hash`, and `activation_token_expires_at`.
> - **ALL user passwords, roles, and credential hashes will be irretrievably destroyed.**
> - This script must **never** be executed automatically.
> - A full physical or logical database backup (`pg_dump -U postgres -d skillbridge_db -Fc -f backup_pre_auth_down.dump`) and explicit human confirmation are **mandatory** prior to execution.

```sql
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
```

---

## 3. Account Lifecycle & Activation Security

### 3.1 Existing User Activation Workflow (Anti-Takeover Guarantee)

Under no circumstances is password setup allowed via an unverified email address alone. An attacker possessing Priya Sharma's email cannot claim or hijack her account.

```
1. UNCLAIMED ACCOUNT IDENTIFICATION:
   - Priya Sharma (user_id = 1) exists in DB with password_hash = NULL.
   - Any attempt to login returns:
     HTTP 403 Forbidden
     {
       "status": "fail",
       "code": "ACCOUNT_NOT_ACTIVATED",
       "message": "Account has not completed secure initial password activation."
     }

2. SECURE TOKEN GENERATION (ADMIN / PROVISIONING CLI):
   - Administrator or provisioning script triggers activation:
     node scripts/generate-activation-token.js --email "priya.sharma@email.com"
   - Generates cryptographically secure 256-bit raw token:
     rawToken = crypto.randomBytes(32).toString('hex')  // 64 hex characters
   - Computes SHA-256 digest:
     tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
   - Sets expiration:
     expiresAt = NOW() + INTERVAL '24 hours'
   - Updates database:
     UPDATE users 
     SET activation_token_hash = $1, activation_token_expires_at = $2 
     WHERE email = $3 AND password_hash IS NULL;
   - Outputs secure link (transmitted out-of-band to user):
     https://app.skillbridge.ai/activate?token=a1b2c3...

3. TOKEN VERIFICATION & PASSWORD SETUP:
   - User submits: POST /api/auth/activate-account
     Body: { "token": "a1b2c3...", "password": "NewSecurePassword123!" }
   - Backend computes:
     submittedHash = crypto.createHash('sha256').update(token).digest('hex')
   - Queries database with strict ownership and expiration check:
     SELECT user_id, email, role, activation_token_expires_at
     FROM users
     WHERE activation_token_hash = $1
       AND activation_token_expires_at > CURRENT_TIMESTAMP
       AND password_hash IS NULL;
   - If no row matches: Returns HTTP 400 Bad Request ("Invalid, expired, or already-used activation token").

4. ATOMIC ACTIVATION & TOKEN INVALIDATION (PREVENTING REUSE):
   - In single atomic transaction (withTransaction):
     a. Hash password via bcrypt (cost factor 12).
     b. UPDATE users SET 
          password_hash = $1,
          activation_token_hash = NULL,
          activation_token_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2;
     c. Sets HTTP-only authentication cookie (sb_auth_token).
     d. Generates and sets signed CSRF cookie (sb_csrf_token).
   - Subsequent submissions with the same raw token fail immediately because activation_token_hash is NULL.
```

---

### 3.2 Candidate Self-Registration (No Role Tampering)
* **Endpoint:** `POST /api/auth/register`
* **Payload:** `{ "email": "new.candidate@example.com", "password": "...", "full_name": "...", "country": "India" }`
* **Anti-Escalation Hardening:**
  1. The Zod input validation schema rejects any request body containing `role`, `user_type`, `is_admin`, or `permissions` (`strip` / `strict`).
  2. The SQL query explicitly hardcodes `'candidate'`:
     ```sql
     INSERT INTO users (email, full_name, country, password_hash, role)
     VALUES ($1, $2, $3, $4, 'candidate')
     RETURNING user_id, email, full_name, role, created_at;
     ```
  3. Public users cannot assign themselves `counselor` or `admin` roles under any condition.

---

### 3.3 Secure Counselor Account Provisioning (No Hardcoded Passwords)
* Counselor accounts cannot be self-registered via public endpoints.
* **Administrative CLI Script (`scripts/provision-counselor.js`):**
  - Executed locally on the server by system administrators.
  - Takes counselor identity: `--email "counselor.raj@skillbridge.org" --name "Rajesh Mehta"`.
  - Inserts record into `users` with `role = 'counselor'` and `password_hash = NULL`.
  - Generates 256-bit activation token, computes SHA-256 hash, and sets 24-hour expiration.
  - Generates single-use counselor activation link.
  - Counselor activates account and chooses their own private password via the exact same secure activation endpoint (`POST /api/auth/activate-account`).
  - **Zero hardcoded passwords are ever created, displayed, or committed.**

---

## 4. Bcrypt Hashing & Memory Safety

### 4.1 Work Factor & Byte Limit Enforcement
* **Algorithm:** `bcrypt` (native C++ bindings via `node-postgres` ecosystem).
* **Cost Factor:** Exactly **12** ($2^{12} = 4096$ key derivation rounds).
  - Provides ~250–350ms computational cost on modern server CPUs, resisting multi-GPU parallel hash cracking.
* **Bcrypt 72-Byte Boundary Hardening:**
  - Standard bcrypt implementations truncate input passwords at **72 bytes**. A password with identical first 72 bytes and different subsequent bytes produces the same hash.
  - **Enforcement Mechanism:**
    1. Zod schema measures raw UTF-8 byte length using `Buffer.byteLength(val, 'utf8') <= 72`.
    2. Passwords exceeding 72 bytes are rejected with HTTP 400 Bad Request (`PASSWORD_TOO_LONG`, "Password cannot exceed 72 bytes due to cryptographic limits").
    3. Minimum length: 8 characters; complexity: uppercase, lowercase, digit, special symbol.

### 4.2 Strict Log Redaction Policy
To prevent credential leakage to disk or telemetry:
* Request logging middleware (`src/middleware/requestLogger.js`) sanitizes incoming payloads:
  - Redaction filter: `password`, `password_hash`, `token`, `activation_token`, `confirm_password`, `authorization`, `cookie`.
  - Replaced with string `"[REDACTED]"`.
* Centralized error handler (`src/middleware/errorHandler.js`):
  - Never echoes back the raw SQL query or parameter array on constraint violations.
  - Never leaks JWT tokens or raw token hashes in error details.

---

## 5. Signed Double-Submit CSRF Defense

Because authentication relies on ambient HTTP-only cookies (`sb_auth_token`), Cross-Site Request Forgery (CSRF) protection is mandatory for all state-changing mutations.

### 5.1 Architecture: HMAC-Signed Double-Submit Cookie Pattern

```
                       CSRF DEFENSE ARCHITECTURE
                       
[Client Browser]                                             [API Gateway]
       │                                                           │
       ├──── 1. GET /api/auth/csrf-token ─────────────────────────►│
       │                                                           │ Generate rawToken (32 bytes)
       │                                                           │ Compute signature = HMAC(rawToken, CSRF_SECRET)
       │◄─── 2. Set-Cookie: sb_csrf_token = rawToken.signature ────┤ (httpOnly: false, sameSite: strict)
       │        Response Body: { "csrfToken": rawToken }           │
       │                                                           │
       │                                                           │
       ├──── 3. POST /api/users/1/education ──────────────────────►│
       │        Cookie: sb_auth_token=JWT; sb_csrf_token=raw.sig   │
       │        Header: X-CSRF-Token: rawToken                     │
       │                                                           │
       │                                                           │ Verify Header exists
       │                                                           │ Verify Cookie exists
       │                                                           │ Verify HMAC(Header, SECRET) === Cookie.signature
       │                                                           │
       │                                                           │ MATCH: Proceed to controller
       │                                                           │ MISMATCH: HTTP 403 Forbidden (CSRF_TOKEN_INVALID)
```

### 5.2 Server-Side Middleware Implementation (`src/middleware/csrf.js`)
* **Secret:** Loaded from `process.env.CSRF_SECRET` (256-bit entropy).
* **Safe Methods:** `GET`, `HEAD`, `OPTIONS` bypass verification.
* **Mutating Methods:** `POST`, `PUT`, `PATCH`, `DELETE` are intercepted:
  1. Extract `rawToken` from `req.headers['x-csrf-token']`.
  2. Extract `cookieValue` from `req.cookies['sb_csrf_token']`.
  3. Decompose `cookieValue` into `[cookieRawToken, hmacSignature]`.
  4. Verify `rawToken === cookieRawToken` via constant-time comparison (`crypto.timingSafeEqual`).
  5. Compute expected signature: `crypto.createHmac('sha256', env.CSRF_SECRET).update(rawToken).digest('hex')`.
  6. Verify `expectedSignature === hmacSignature` via `crypto.timingSafeEqual`.
  7. On failure: Reject with `HTTP 403 Forbidden` (`code: 'CSRF_TOKEN_INVALID'`).

### 5.3 Frontend Cookie & Header Integration Guide

```javascript
// Example Frontend API Client (Axios / Fetch)
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // MANDATORY: Transmits HTTP-only auth & CSRF cookies
});

// Helper: Extract CSRF token from document.cookie
function getCsrfToken() {
  const match = document.cookie.match(/sb_csrf_token=([^;]+)/);
  if (!match) return null;
  // Cookie format: rawToken.signature -> extract rawToken before period
  return decodeURIComponent(match[1]).split('.')[0];
}

// Request Interceptor: Attach X-CSRF-Token on mutations
api.interceptors.request.use((config) => {
  const method = config.method ? config.method.toUpperCase() : 'GET';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});
```

---

## 6. Role-Based Access Control (RBAC) Matrix

| Endpoint Route | Public | Candidate | Counselor | Authorization Logic |
| :--- | :---: | :---: | :---: | :--- |
| `POST /api/auth/register` | **ALLOW** | — | — | Public candidate registration; role hardcoded to `candidate` |
| `POST /api/auth/login` | **ALLOW** | — | — | Credential verification; sets `sb_auth_token` |
| `GET /api/auth/csrf-token` | **ALLOW** | **ALLOW** | **ALLOW** | Issues signed CSRF cookie + header payload |
| `POST /api/auth/activate-account` | **ALLOW** | — | — | Verifies SHA-256 token hash & sets initial password |
| `POST /api/auth/logout` | — | **ALLOW** | **ALLOW** | `authenticateToken` + clears auth & CSRF cookies |
| `GET /api/auth/me` | — | **ALLOW** | **ALLOW** | `authenticateToken` + returns sanitized identity |
| `GET /api/catalog/*` | **ALLOW** | **ALLOW** | **ALLOW** | Public industry standards browsing |
| `GET /api/users` | — | — | **ALLOW** | `requireRole(['counselor', 'admin'])` |
| `GET /api/users/:id` | — | **OWN** | **ALLOW** | Candidate may access **only self** (`req.user.user_id === id`); Counselor access all |
| `PUT /api/users/:id` | — | **OWN** | — | Candidate may edit **only self**; Counselor cannot modify profile details |
| `POST /api/users/:id/*` | — | **OWN** | — | Candidate adds own education, skills, certs, breaks |
| `GET /api/goals/:id/skill-match` | — | **OWN** | **ALLOW** | Candidate checks own match; Counselor audits candidate |
| `GET /api/analytics/*` | — | — | **ALLOW** | `requireRole(['counselor', 'admin'])` (Query 15, Q7, Q9, Q11) |

---

## 7. Concrete Security Test Plan (Wave 4 Gate)

The integration test suite (`tests/integration/auth.test.js` & `tests/integration/securityHardening.test.js`) will execute the following automated security assertions with transaction rollback:

| Test ID | Security Concern | Attack Vector / Scenario | Expected Verdict |
| :---: | :--- | :--- | :---: |
| **SEC-01** | **Account Takeover Prevention** | Attempting to call `POST /api/auth/activate-account` without token, or with arbitrary email | **HTTP 400 Bad Request** (`INVALID_ACTIVATION_TOKEN`) |
| **SEC-02** | **Expired Activation Token** | Attempting activation with token whose `activation_token_expires_at < NOW()` | **HTTP 400 Bad Request** (`ACTIVATION_TOKEN_EXPIRED`) |
| **SEC-03** | **Token Reuse Prevention** | Attempting to reuse an activation token that was already successfully used | **HTTP 400 Bad Request** (`TOKEN_ALREADY_USED`) |
| **SEC-04** | **Token Secret Leakage** | Inspecting database after token generation; verifying raw token is not stored | **PASS** (Assert DB contains only 64-char SHA-256 hex digest) |
| **SEC-05** | **Public Role Escalation** | Submitting `{ "role": "counselor" }` or `{ "role": "admin" }` on public register | **PASS** (DB row created with `role = 'candidate'` or rejected) |
| **SEC-06** | **CSRF Missing Header** | Calling authenticated mutation (`POST /api/users/1/education`) without `X-CSRF-Token` | **HTTP 403 Forbidden** (`CSRF_TOKEN_MISSING`) |
| **SEC-07** | **CSRF Forgery / Tampering** | Calling authenticated mutation with forged `X-CSRF-Token` differing from signed cookie | **HTTP 403 Forbidden** (`CSRF_TOKEN_INVALID`) |
| **SEC-08** | **Cross-Candidate Isolation** | Candidate A (user_id=1) attempting `GET /api/users/2` or `PUT /api/users/2` | **HTTP 403 Forbidden** (`FORBIDDEN_RESOURCE_ACCESS`) |
| **SEC-09** | **Counselor Privilege Gate** | Candidate (user_id=1) attempting `GET /api/analytics/dashboard` (Query 15) | **HTTP 403 Forbidden** (`FORBIDDEN_ROLE`) |
| **SEC-10** | **Bcrypt Byte Limit (72 bytes)** | Submitting password with > 72 bytes | **HTTP 400 Bad Request** (`PASSWORD_TOO_LONG`) |
| **SEC-11** | **Brute-Force Rate Limiting** | Sending 6 rapid failed login attempts from same IP | **HTTP 429 Too Many Requests** (`RATE_LIMIT_EXCEEDED`) |
| **SEC-12** | **Zero Data Loss Guarantee** | Row counts across all 22 tables before vs after running auth test suite | **PASS** (Exactly 174 committed records preserved) |

---

## 8. Status & Ready for Planning

* **Migration 002 UP & DOWN Scripts:** Staged in `migrations/002_add_user_auth_credentials.sql` and `migrations/002_add_user_auth_credentials_down.sql` (Unexecuted).
* **Database State:** 100% frozen, 22 tables, 174 committed records preserved.
* **Architecture:** Formally documented with anti-takeover token activation, HMAC-signed CSRF defense, bcrypt cost 12 with 72-byte checks, and strict candidate isolation.
* **Next Action:** Ready to proceed to Phase 8 task decomposition and plan file generation (`08-01-PLAN.md`, etc.).
