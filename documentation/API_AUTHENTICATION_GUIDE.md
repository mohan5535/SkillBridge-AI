# SkillBridge AI — API Authentication, Authorization & Security Integration Guide

**Document Version:** 1.0.0  
**Phase:** Phase 8 — Authentication, Authorization & User Session Security  
**Audience:** Frontend Engineers, API Integrators, System Administrators & Evaluators  
**Last Updated:** 2026-11-10  

---

## 1. Security Architecture Overview

SkillBridge AI employs a zero-trust, defense-in-depth authentication and authorization architecture:

```
+-----------------------------------------------------------------------------+
|                                CLIENT BROWSER                               |
|                                                                             |
|   Cookies:                                                                  |
|   - sb_auth_token: HTTP-only, Secure, SameSite=Strict (JWT session, 30m)    |
|   - sb_csrf_token: Non-HTTP-only, SameSite=Strict (rawToken.hmacSignature)  |
|                                                                             |
|   Headers (on mutating methods: POST, PUT, PATCH, DELETE):                  |
|   - X-CSRF-Token: <rawToken extracted from sb_csrf_token cookie>            |
+-----------------------------------------------------------------------------+
                                      │
                                      ▼ HTTPS
+-----------------------------------------------------------------------------+
|                             API GATEWAY PIPELINE                            |
|                                                                             |
|   1. Rate Limiter (5 req / 15m on login/activation; 100 req / 15m global)   |
|   2. Helmet (Security Headers: Content-Type, Frame-Options, XSS filter)     |
|   3. CORS Middleware (Origin matching, credentials enabled)                 |
|   4. Cookie-Parser Middleware (Parses ambient cookies)                      |
|   5. CSRF Guard (Verifies X-CSRF-Token matches HMAC signature on cookie)    |
|   6. Auth Guard (Verifies JWT sb_auth_token & unpacks userId, role)         |
|   7. RBAC Guard (requireRole, requireOwnershipOrCounselor)                  |
|   8. Controller & Business Logic Layer                                      |
+-----------------------------------------------------------------------------+
```

### Core Cryptographic Standards
* **Password Hashing:** `bcrypt` with cost factor **12** ($2^{12} = 4096$ derivation rounds).
* **Bcrypt 72-Byte Boundary Guard:** Passwords exceeding 72 bytes UTF-8 are strictly rejected with HTTP 400 (`PASSWORD_TOO_LONG`) before reaching bcrypt's internal truncation boundary.
* **Token Hashes:** Activation tokens are generated with 256-bit entropy (`crypto.randomBytes(32)`). **Only SHA-256 hex digests are persisted in the database store**; raw tokens are never stored.
* **Ambient Cookie Security:** JWT session tokens are stored exclusively in HTTP-only cookies (`sb_auth_token`), rendering them immune to Cross-Site Scripting (XSS) extraction.
* **CSRF Defense:** HMAC-SHA256 signed double-submit cookies protect all state-changing mutations (`POST`, `PUT`, `PATCH`, `DELETE`).

---

## 2. Authentication API Endpoints Reference

### 2.1 Candidate Self-Registration
* **Method & URL:** `POST /api/auth/register`
* **Access Level:** Public (Unauthenticated)
* **Anti-Escalation Rule:** The `role` is strictly forced to `'candidate'`. The Zod schema rejects any request body containing `role`, `is_admin`, or `permissions`.
* **Request Headers:**
  ```http
  Content-Type: application/json
  ```
* **Request Body:**
  ```json
  {
    "email": "new.candidate@example.org",
    "full_name": "Pooja Hegde",
    "password": "StrongCandidatePass123!",
    "country": "India"
  }
  ```
* **Success Response (`HTTP 201 Created`):**
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "user_id": 1001,
        "email": "new.candidate@example.org",
        "full_name": "Pooja Hegde",
        "role": "candidate",
        "created_at": "2026-11-10T14:30:00.000Z"
      },
      "csrfToken": "a1b2c3d4..."
    }
  }
  ```
* **Set-Cookie Headers Issued:**
  - `sb_auth_token=<JWT>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`
  - `sb_csrf_token=<rawToken.signature>; Secure; SameSite=Strict; Path=/; Max-Age=86400`

---

### 2.2 Account Login
* **Method & URL:** `POST /api/auth/login`
* **Access Level:** Public (Protected by 5 req / 15 min Brute-Force Rate Limiter)
* **Anti-Takeover Check:** Unactivated accounts (`password_hash IS NULL`) are rejected with `HTTP 403 Forbidden` (`ACCOUNT_NOT_ACTIVATED`).
* **Request Body:**
  ```json
  {
    "email": "new.candidate@example.org",
    "password": "StrongCandidatePass123!"
  }
  ```
* **Success Response (`HTTP 200 OK`):**
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "user_id": 1001,
        "email": "new.candidate@example.org",
        "full_name": "Pooja Hegde",
        "role": "candidate"
      },
      "csrfToken": "a1b2c3d4..."
    }
  }
  ```

---

### 2.3 Single-Use Token Account Activation (Anti-Takeover)
* **Method & URL:** `POST /api/auth/activate-account`
* **Access Level:** Public (Requires 256-bit single-use token)
* **Anti-Takeover Guarantee:** Password setup via email alone is strictly rejected with `HTTP 400 Bad Request` (`INVALID_ACTIVATION_TOKEN`).
* **Anti-Replay Guarantee:** Once used, the activation token hash is immediately cleared in an atomic operation.
* **Request Body:**
  ```json
  {
    "token": "4f9b8c2d1e0a3f5b7c9d1e0a2f4b6c8d0e2a4f6b8c0d2e4a6f8b0c2d4e6f8a0b",
    "password": "NewEstablishedPassword123!"
  }
  ```
* **Success Response (`HTTP 200 OK`):**
  ```json
  {
    "status": "success",
    "message": "Account activated and password established successfully.",
    "data": {
      "user": {
        "user_id": 1,
        "email": "priya.sharma@example.com",
        "full_name": "Priya Sharma",
        "role": "candidate"
      },
      "csrfToken": "a1b2c3d4..."
    }
  }
  ```

---

### 2.4 User Session Logout
* **Method & URL:** `POST /api/auth/logout`
* **Access Level:** Authenticated / Public
* **Action:** Clears `sb_auth_token` and `sb_csrf_token` cookies with matched path and domain attributes.
* **Success Response (`HTTP 200 OK`):**
  ```json
  {
    "status": "success",
    "message": "User session terminated and authentication cookies cleared."
  }
  ```

---

### 2.5 Active Session Identity
* **Method & URL:** `GET /api/auth/me`
* **Access Level:** Authenticated (`authenticateToken`)
* **Success Response (`HTTP 200 OK`):**
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "user_id": 1,
        "email": "priya.sharma@example.com",
        "full_name": "Priya Sharma",
        "role": "candidate"
      }
    }
  }
  ```

---

### 2.6 CSRF Token Issuance
* **Method & URL:** `GET /api/auth/csrf-token`
* **Access Level:** Public
* **Action:** Sets `sb_csrf_token` cookie and returns unhashed raw token in response body.
* **Success Response (`HTTP 200 OK`):**
  ```json
  {
    "status": "success",
    "data": {
      "csrfToken": "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
    }
  }
  ```

---

## 3. Role-Based Access Control (RBAC) Matrix

| Endpoint Route | Method | Public | Candidate | Counselor | Authorization Logic |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/auth/register` | `POST` | **ALLOW** | — | — | Public candidate registration (role forced to candidate) |
| `/api/auth/login` | `POST` | **ALLOW** | — | — | Authenticates password hash; sets HTTP-only cookie |
| `/api/auth/activate-account` | `POST` | **ALLOW** | — | — | Validates single-use token hash and sets initial password |
| `/api/auth/csrf-token` | `GET` | **ALLOW** | **ALLOW** | **ALLOW** | Issues signed double-submit CSRF cookie |
| `/api/auth/logout` | `POST` | **ALLOW** | **ALLOW** | **ALLOW** | Clears session cookies |
| `/api/auth/me` | `GET` | — | **ALLOW** | **ALLOW** | Returns active session profile |
| `/api/catalog/*` | `GET` | **ALLOW** | **ALLOW** | **ALLOW** | Public career fields, roles, skills, and qualifications |
| `/api/users` | `GET` | — | — | **ALLOW** | Restricted to `counselor` and `admin` roles |
| `/api/users/:id` | `GET`, `PUT` | — | **OWN ONLY** | **ALLOW** | Candidate may access only self (`userId === :id`); Counselor audits all |
| `/api/users/:id/*` | `GET`, `POST` | — | **OWN ONLY** | — | Candidate modifies own education, skills, certs, breaks |
| `/api/goals/:id/skill-match` | `GET` | — | **OWN ONLY** | **ALLOW** | Candidate views own match; Counselor audits candidate |
| `/api/analytics/*` | `GET` | — | — | **ALLOW** | Executive Analytics CTEs restricted to counselors & admins |

---

## 4. Frontend Integration Guide (React / Next.js / Axios)

Because authentication uses ambient HTTP-only cookies and signed CSRF tokens:
1. All client requests must include `withCredentials: true`.
2. All state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) must extract the raw token from the `sb_csrf_token` cookie and include it in the `X-CSRF-Token` HTTP header.

### Production-Ready Axios Client Interceptor

```javascript
import axios from 'axios';

// 1. Create configured Axios client instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // MANDATORY: Transmits HTTP-only session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Helper to extract raw CSRF token from document.cookie
function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/sb_csrf_token=([^;]+)/);
  if (!match) return null;
  // Cookie value format: rawToken.hmacSignature -> extract rawToken before dot
  const rawCookie = decodeURIComponent(match[1]);
  return rawCookie.split('.')[0];
}

// 3. Request Interceptor: Attach X-CSRF-Token header on mutating requests
api.interceptors.request.use(
  async (config) => {
    const method = config.method ? config.method.toUpperCase() : 'GET';
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (mutatingMethods.includes(method)) {
      let csrfToken = getCsrfTokenFromCookie();

      // If cookie not yet present, bootstrap CSRF token from backend
      if (!csrfToken) {
        try {
          const res = await axios.get('http://localhost:5000/api/auth/csrf-token', {
            withCredentials: true,
          });
          csrfToken = res.data?.data?.csrfToken;
        } catch (err) {
          console.error('[CSRF BOOTSTRAP ERROR] Failed to fetch CSRF token:', err);
        }
      }

      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 4. Response Interceptor: Handle unauthenticated or expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response.data?.code;
      if (code === 'TOKEN_EXPIRED' || code === 'AUTHENTICATION_REQUIRED') {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 5. Administrative CLI Provisioning Guide

System administrators provision counselor identities and generate single-use candidate activation links via server-side CLI scripts:

### Provisioning a Counselor Account (Zero Hardcoded Passwords)
```bash
node scripts/provision-counselor.js --email "counselor.raj@skillbridge.org" --name "Rajesh Mehta"
```
* **Output:**
  ```text
  ================================================================
   COUNSELOR ACCOUNT PROVISIONED SUCCESSFULLY (ZERO HARDCODED PASSWORDS)
  ================================================================
   User ID:         1002
   Full Name:       Rajesh Mehta
   Email:           counselor.raj@skillbridge.org
   Role:            counselor
   Password Hash:   [NULL - Unclaimed Account]
   Token Hash (DB): 8a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9
   Expiration:      2026-11-11T14:30:00.000Z
  ----------------------------------------------------------------
   SECURE SINGLE-USE ACTIVATION LINK:
   https://app.skillbridge.ai/activate?token=f0e1d2c3b4a5...
  ================================================================
  ```

### Generating Activation Link for Existing Unclaimed Candidate
```bash
node scripts/generate-activation-token.js --email "priya.sharma@example.com"
```
* **Output:** Generates a 24-hour single-use token and prints the activation URL. The candidate establishes their private password upon opening the link.

---

## 6. Semantic Security Error Code Dictionary

| Error Code | HTTP Status | Description | Action Required |
| :--- | :---: | :--- | :--- |
| `AUTHENTICATION_REQUIRED` | `401` | Missing `sb_auth_token` cookie and Authorization header. | Redirect user to `/login`. |
| `TOKEN_EXPIRED` | `401` | JWT session token expiration (30 minutes) reached. | Refresh session or re-authenticate. |
| `TOKEN_INVALID` | `401` | JWT token signature corrupted or forged. | Terminate session and prompt login. |
| `INVALID_CREDENTIALS` | `401` | Email or password does not match. | Display invalid credentials message. |
| `ACCOUNT_NOT_ACTIVATED` | `403` | User account exists but `password_hash` is NULL. | Prompt user to complete token activation. |
| `FORBIDDEN_ROLE` | `403` | User role does not possess privileges for endpoint. | Restrict UI view based on `req.user.role`. |
| `FORBIDDEN_RESOURCE_ACCESS` | `403` | Candidate attempted to access another candidate's records. | Isolate candidate navigation to own ID. |
| `CSRF_TOKEN_MISSING` | `403` | Mutating request lacks `X-CSRF-Token` header. | Verify Axios request interceptor is active. |
| `CSRF_TOKEN_INVALID` | `403` | `X-CSRF-Token` header does not match HMAC cookie. | Refresh CSRF token via `GET /csrf-token`. |
| `INVALID_ACTIVATION_TOKEN` | `400` | Token is invalid, expired (>24h), or already used. | Request new token from administrator. |
| `PASSWORD_TOO_LONG` | `400` | Password exceeds 72 UTF-8 bytes (Bcrypt boundary limit). | Advise user to choose password <= 72 bytes. |
| `DUPLICATE_EMAIL` | `409` | Registration attempted with existing email address. | Prompt user to log in instead. |
| `RATE_LIMIT_EXCEEDED` | `429` | 5 failed authentication attempts exceeded within 15 min. | Wait 15 minutes before re-attempting. |
| `DATABASE_UNAVAILABLE` | `503` | PostgreSQL service connection unavailable. | Retry connection shortly. |

---

## 7. Zero Database Mutation Guarantee & Production Migration Notice

* **Database State:** PostgreSQL `skillbridge_db` remains 100% frozen.
* **Existing Records:** All 174 committed records across 22 normalized tables are strictly preserved.
* **Production Deployment:** When applying Phase 8 to a live database during scheduled maintenance, administrators execute the staged script:
  ```bash
  psql -U postgres -d skillbridge_db -f migrations/002_add_user_auth_credentials.sql
  ```
* **Rollback Warning:** The companion DOWN script `migrations/002_add_user_auth_credentials_down.sql` permanently drops credential columns and destroys user passwords. A full `pg_dump` backup is mandatory prior to any rollback operation.

