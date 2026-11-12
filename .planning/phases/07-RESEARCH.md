# Phase 7: RESTful API Gateway and Database Integration - Research

**Researched:** 2026-11-10  
**Domain:** RESTful API Gateway, Express.js (ESM), PostgreSQL Connection Pooling (`pg`), Database Error Mapping, Zod Validation  
**Confidence:** HIGH  

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
From [07-CONTEXT.md:17-23](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/.planning/phases/07-CONTEXT.md#L17-L23):
* **Source of Truth:** The existing PostgreSQL 18.6 schema (`schema.sql`) and committed database (`skillbridge_db` / `skillbridge_backup.dump`, 174 records) are the immutable source of truth.
* **Zero Schema Mutations:** No tables, columns, or constraints will be altered, dropped, or recreated.
* **Zero Data Loss:** No sample records will be deleted, truncated, or overwritten. `sample_data.sql` will **not** be rerun.
* **No Migration Application:** The 17 pending indexes in `migrations/001_add_fk_covering_indexes.sql` remain unapplied until specifically approved.
* **No Code Implementation in Discuss Phase:** This phase defines architecture, endpoints, data flow, security, and testing strategies. No application source code is written until this plan is formally approved.

From [07-CONTEXT.md:26-54](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/.planning/phases/07-CONTEXT.md#L26-L54):
* **Architecture:** 6 cohesive API resource domains partitioned across 22 normalized tables:
  1. `/api/users` (Domain 1: User Identity & Multi-Profile History — 6 tables)
  2. `/api/catalog` (Domain 2: Career Fields, Roles, Skills & Standards — 6 tables)
  3. `/api/goals` & `/api/analyses` (Domain 3: Career Goals & Gap Analytics — 4 tables)
  4. `/api/learning` (Domain 4: Learning Roadmaps & Educational Resources — 4 tables)
  5. `/api/assessments` (Domain 5: Skill Assessment, Scoring & Growth — 2 tables)
  6. `/api/analytics` (Domain 6: Executive Reporting & Cohort Intelligence — Queries 1-15)

From [07-CONTEXT.md:207-244](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/.planning/phases/07-CONTEXT.md#L207-L244):
* **Response Envelope:** Strict adherence to JSend JSON specification (`status`: "success" | "fail" | "error").
* **PostgreSQL Error Mapping:** Intercept and translate PostgreSQL error codes (`23505` $\rightarrow$ 409, `23503` $\rightarrow$ 400, `23514` $\rightarrow$ 422, `22P02` $\rightarrow$ 400, `23502` $\rightarrow$ 400, `ECONNREFUSED`/`57P01` $\rightarrow$ 503).
* **Write-Safety Guarantee:** Integration tests performing mutations must execute within a database transaction and immediately issue a `ROLLBACK` (`BEGIN ... ROLLBACK`).

### the agent's Discretion
* Choice of validation library: `zod` selected for schema-driven validation matching PostgreSQL domain constraints.
* Choice of test framework: Native `node:test` and `node:assert/strict` with `supertest` for seamless Node.js 24 ESM execution without transpilation overhead.
* Logging middleware configuration: Structured JSON request logger outputting method, path, status, duration, and client IP.
* Parameterized query structure and SQL constant separation in `src/queries/`.

### Deferred Ideas (OUT OF SCOPE)
* JWT authentication, candidate/counselor session handling, and RBAC (Deferred to Phase 8).
* Multi-factor automated gap analysis calculation engine & automated learning roadmap sequencer (Deferred to Phase 9).
* Production migration of 17 covering indexes in `migrations/001_add_fk_covering_indexes.sql` (Deferred to Phase 10).
* Frontend web client development (Deferred to Milestone 3 / Phase 11 & 12).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **FR-01** | Candidate Profile Management | CRUD endpoints on `/api/users` and sub-resources (`/education`, `/skills`, `/experiences`, `/certifications`), backed by `userService` and parameterized queries. |
| **FR-02** | Career Break Recording | Neutral career pause intake on `POST /api/users/:id/career-breaks` validating reasons against `chk_break_reason` without disqualification flags. |
| **FR-03** | Dynamic Catalog Definition | Catalog browsing endpoints (`/api/catalog/fields`, `/roles`, `/skills`, `/qualifications`, `/certifications`) reading directly from normalized catalog tables. |
| **FR-04** | Polymorphic Career Requirements | Verification of mutually exclusive foreign keys (`chk_career_req_exclusive_fks`) on `career_requirements` resolution in `catalogService.getRoleRequirements(roleId)`. |
| **FR-05** | Automated Gap Analysis & Readiness Scoring | Delivery of Query 6 (gap items with severity) and Query 8 (skill comparison) via `/api/analyses/:id` and `/api/goals/:goalId/skill-match`. |
| **FR-06** | Actionable Learning Roadmaps | Endpoint `/api/learning-plans/:planId` implementing Query 10 (sequenced plan items linked to learning resources). |
| **FR-07** | Assessment Scoring & Pass/Fail Tracking | Endpoints `/api/assessments` and `/api/assessments/:id/submit` validating non-negative scores and `score <= max_score`. |
| **FR-08** | Skill Growth & Retake Detection | Endpoint `/api/users/:id/growth` executing Query 14 (identifying pass after chronological fail on repeated attempts). |
| **FR-09** | Executive Dashboard Reporting | Endpoint `/api/analytics/dashboard` executing Query 15 with 3 isolated CTEs (`latest_analysis`, `gap_summary`, `learning_summary`) preventing row multiplication. |
| **FR-10** | Sequence Synchronization | Health endpoint `/api/health` validating sequence synchronization (`last_value >= MAX(id)`) and database connectivity via `SELECT 1`. |
| **NFR-01** | ACID Compliance | `withTransaction` helper in `src/config/db.js` guaranteeing automatic client checkout, `BEGIN`, `COMMIT`, and `ROLLBACK` on error. |
| **NFR-02** | 100% Referential Integrity | 400 Bad Request error translation on PostgreSQL `23503` (foreign_key_violation); preventing orphaned child records. |
| **NFR-03** | Performance & Query Efficiency | Sub-15ms execution via `pg.Pool` connection pooling (max 20 clients, 30s idle timeout) and isolated CTE query structures. |
| **NFR-04** | Privacy by Design & Data Minimization | Omission of government IDs/medical PII; sanitize user responses; strip internal database credentials. |
| **NFR-05** | Encoding Fidelity | Enforce UTF-8 client encoding via node-postgres pool and HTTP `Content-Type: application/json; charset=utf-8` headers. |
</phase_requirements>

---

## Summary

Phase 7 establishes the foundational RESTful API Gateway for SkillBridge AI, bridging the client tier to the PostgreSQL 18.6 `skillbridge_db` containing 22 Third Normal Form (3NF) relational tables and 174 committed records. Built using Node.js 24 and Express 5/4 in native ECMAScript Modules (`"type": "module"`), the API exposes 6 cohesive resource domains: User Profiles, Career Catalog, Goals & Gap Analysis, Learning Roadmaps, Assessments, and Executive Analytics.

The database integration utilizes `pg` (`node-postgres`) configured with connection pooling (`max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`), centralizing parameterized query execution with automatic client release. A specialized transaction helper (`withTransaction`) guarantees ACID compliance and enables zero-mutation testing via `ROLLBACK`. Centralized error handling transparently maps PostgreSQL error codes (`23505`, `23503`, `23514`, `22P02`, `23502`, `ECONNREFUSED`) to standardized HTTP status codes (`409`, `400`, `422`, `503`) inside a JSend response envelope.

All 15 pre-verified analytical SQL queries from `test_queries.sql` and `corrected_test_queries.sql`—including Query 15's multi-CTE executive dashboard and Query 8's side-by-side skill comparison—are integrated into dedicated service modules. Security hardening via `helmet`, `cors`, and `express-rate-limit` prevents abuse and ensures data minimization, while integration tests leverage the native `node:test` runner and `supertest` with strict read-only and transactional rollback guarantees.

**Primary recommendation:** Build the backend inside `backend/` using native Node.js ESM, Express 5.3.0, `pg.Pool`, and `zod` validation, maintaining an exact service-query-controller layer separation that mirrors the 6 domains and preserves the existing database records without mutations.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| HTTP Routing & Middleware | API Gateway (Express) | — | Express handles incoming requests, URL parsing, and middleware pipelining. |
| Security Headers & Rate Limiting | API Gateway (Express) | Edge / Reverse Proxy | Express applies Helmet security headers and rate limits per IP before hitting business logic. |
| Request Input Validation | API Gateway (Express) | Database Constraints | Zod middleware rejects malformed payloads and invalid enums before queries hit the database. |
| Business Logic & Orchestration | Service Tier (Node.js) | — | Services encapsulate domain algorithms, readiness comparisons, and data transformations. |
| Data Persistence & Integrity | Database Tier (PostgreSQL 18.6) | — | PostgreSQL enforces relational constraints, checks, foreign keys, and serial sequences. |
| Analytical CTE Aggregations | Database Tier (PostgreSQL 18.6) | Service Tier (Node.js) | Complex multi-table aggregations (Queries 1-15) execute within PostgreSQL for sub-15ms performance. |
| Client Presentation & State | Browser / Client Tier | API Gateway | Frontend applications consume JSend JSON payloads; presentation logic belongs on client. |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Node.js** | 24.7.0 [VERIFIED: local runtime] | Runtime Environment | Current system LTS/active Node runtime, native ESM support, built-in test runner. |
| **Express** | 5.3.0 [VERIFIED: npm registry] | RESTful Web Framework | Industry-standard web framework; version 5 natively handles rejected promises in async middleware. |
| **pg** (`node-postgres`) | 8.23.1 [VERIFIED: npm registry] | PostgreSQL Client & Pool | High-performance PostgreSQL driver supporting native parameterized queries, connection pooling, and binary cursors. |
| **dotenv** | 18.0.10 [VERIFIED: npm registry] | Environment Configuration | Standard 12-factor application configuration loader for `.env` credentials. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zod** | 4.6.7 (or 3.24.2) [VERIFIED: npm registry] | Schema Validation | Request body, query string, and parameter validation matching database constraints. |
| **helmet** | 8.3.0 [VERIFIED: npm registry] | HTTP Security Headers | Disables `X-Powered-By`, sets `nosniff`, `X-Frame-Options: DENY`, and strict referrer policy. |
| **cors** | 2.8.6 [VERIFIED: npm registry] | Cross-Origin Resource Sharing | Whitelists approved origins (e.g., frontend development server on port 3000). |
| **express-rate-limit** | 8.7.4 [VERIFIED: npm registry] | IP Rate Limiting | Protects public endpoints from brute-force attempts and denial of service. |
| **supertest** | 7.3.2 [VERIFIED: npm registry] | HTTP API Integration Testing | Executes HTTP assertions against the Express app instance without binding to external network ports. |
| **node:test** & **node:assert** | Built-in [VERIFIED: local runtime] | Native Test Runner | Zero-dependency, native ESM test suite runner with subtests and mock support. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pg.Pool` (Raw SQL) | Prisma / TypeORM / Sequelize | Heavy ORMs struggle with polymorphic foreign keys (`career_requirements`), complex multi-CTE queries (Query 15), and risk altering existing DB schemas. Raw `pg` provides zero abstraction overhead and direct execution of verified SQL. |
| Native `node:test` | Jest | Jest requires experimental VM modules or Babel to support native ES Modules (`"type": "module"`). Native `node:test` runs immediately in Node 24 with zero setup friction. |
| `zod` | Joi / express-validator | Zod provides clean schema composition, strong type inference, and runs synchronously with zero dependencies. |

**Installation:**
```bash
npm install express pg dotenv cors helmet express-rate-limit zod
npm install --save-dev supertest
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `express` | npm | 15.9 yrs | ~196M/wk | github.com/expressjs/express | `[OK]` | Approved [VERIFIED: npm registry] |
| `pg` | npm | 15.9 yrs | ~95M/wk | github.com/brianc/node-postgres | `[OK]` | Approved [VERIFIED: npm registry] |
| `dotenv` | npm | 13.3 yrs | ~260M/wk | github.com/motdotla/dotenv | `[OK]` | Approved [VERIFIED: npm registry] |
| `cors` | npm | 13.8 yrs | ~123M/wk | github.com/expressjs/cors | `[OK]` | Approved [VERIFIED: npm registry] |
| `helmet` | npm | 14.8 yrs | ~22M/wk | github.com/helmetjs/helmet | `[OK]` | Approved [VERIFIED: npm registry] |
| `express-rate-limit` | npm | 11.9 yrs | ~95M/wk | github.com/express-rate-limit/express-rate-limit | `[OK]` | Approved [VERIFIED: npm registry] |
| `zod` | npm | 6.7 yrs | ~454M/wk | github.com/colinhacks/zod | `[OK]` | Approved [VERIFIED: npm registry] |
| `supertest` | npm | 14.4 yrs | ~25M/wk | github.com/ladjs/supertest | `[OK]` | Approved [VERIFIED: npm registry] |

* Postinstall check: Every package returned `scripts.postinstall: none`.
* Verdicts: All 8 packages are mature, battle-tested, high-download foundational packages. Zero `[SUS]` or `[SLOP]` packages.

---

## Architecture Patterns

### System Architecture Diagram

```mermaid
flowchart TD
    Client["Client / Supertest HTTP Request"] --> SecurityMW["Security Middleware (Helmet, CORS, RateLimit)"]
    SecurityMW --> JSONParser["Body Parser (express.json limit: 10kb)"]
    JSONParser --> Router["Domain Routers (/api/users, /catalog, etc.)"]
    Router --> Validator["Zod Schema Validator Middleware"]
    Validator --> Controller["Controller Layer (Extracts params/body, delegates)"]
    Controller --> Service["Service Layer (Business rules & Analytical logic)"]
    Service --> QueryConstants["SQL Constants (Queries Q1-Q15 & Parameterized SQL)"]
    QueryConstants --> DBPool["pg.Pool Connection / Transaction Helper"]
    DBPool --> PGDatabase[("PostgreSQL 18.6 skillbridge_db")]
    
    PGDatabase -->|Result Rows| DBPool
    DBPool -->|Data| Service
    Service -->|Entities| Controller
    Controller -->|JSend 200/201 Envelope| Client
    
    Validator -.->|Validation Fail 400/422| ErrorHandler["Centralized Error Handler"]
    PGDatabase -.->|PG Error (23505, 23503, etc.)| DBPool
    DBPool -.->|Throws Error| ErrorHandler
    ErrorHandler -->|JSend Fail/Error Envelope| Client
```

### Recommended Project Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # pg.Pool instance, query(), withTransaction(), lifecycle
│   │   └── env.js                # Environment schema validation (PGHOST, PGPORT, etc.)
│   ├── constants/
│   │   ├── statusEnums.js        # Status vocabularies matching schema CHECK constraints
│   │   └── httpCodes.js          # Standard HTTP status code constants
│   ├── middleware/
│   │   ├── errorHandler.js       # Centralized error handler & PG error code translator
│   │   ├── validate.js           # Generic schema validation middleware (body, query, params)
│   │   ├── security.js           # Helmet, CORS, and rate limiting configuration
│   │   └── requestLogger.js      # Structured HTTP request logger
│   ├── routes/
│   │   ├── index.js              # Master API router mounting all domain sub-routers
│   │   ├── health.routes.js      # /api/health (DB connectivity & sequence health)
│   │   ├── user.routes.js        # /api/users (Domain 1)
│   │   ├── catalog.routes.js     # /api/catalog (Domain 2)
│   │   ├── goal.routes.js        # /api/goals & /api/analyses (Domain 3)
│   │   ├── learning.routes.js    # /api/learning (Domain 4)
│   │   ├── assessment.routes.js  # /api/assessments (Domain 5)
│   │   └── analytics.routes.js   # /api/analytics (Domain 6)
│   ├── controllers/
│   │   ├── user.controller.js
│   │   ├── catalog.controller.js
│   │   ├── goal.controller.js
│   │   ├── learning.controller.js
│   │   ├── assessment.controller.js
│   │   └── analytics.controller.js
│   ├── services/
│   │   ├── user.service.js
│   │   ├── catalog.service.js
│   │   ├── gapAnalysis.service.js   # Gap items & Query 8 skill match
│   │   ├── learning.service.js      # Query 10 learning plans & Query 12 resources
│   │   ├── assessment.service.js    # Query 13 history & Query 14 growth report
│   │   └── analytics.service.js     # Query 15 dashboard, Query 7 at-risk, Query 9 breaks, Query 11 tasks
│   ├── queries/
│   │   ├── userQueries.js
│   │   ├── catalogQueries.js
│   │   ├── gapQueries.js
│   │   ├── learningQueries.js
│   │   ├── assessmentQueries.js
│   │   └── analyticalQueries.js     # SQL constants for Queries 1 through 15
│   ├── errors/
│   │   ├── AppError.js              # Operational error base class
│   │   ├── NotFoundError.js         # 404 handler
│   │   ├── ValidationError.js       # 400/422 validation failure
│   │   └── DatabaseError.js         # PostgreSQL exception wrapper
│   └── app.js                       # Express app factory with middleware pipeline
├── tests/
│   ├── unit/                        # Pure validation & error mapper tests
│   └── integration/                 # Supertest endpoint test suite (read-only + rollback)
├── .env.example                     # Environment template (PGHOST, PGPORT, etc.)
├── package.json                     # Node.js dependencies ("type": "module")
└── server.js                        # HTTP listener with graceful shutdown
```

---

## In-Repo Schema Truth & Discrete Values

The database integrity of `skillbridge_db` depends on strict adherence to verified column names and domain vocabularies. The following values have been opened, read, and verified verbatim from `schema.sql` this session:

### 1. Education Status Vocabulary
[VERIFIED: schema.sql:229-230](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L229-L230)
```sql
    CONSTRAINT chk_education_status
        CHECK (status IN ('in_progress', 'completed', 'incomplete', 'deferred')),
```
Allowed values: `'in_progress'`, `'completed'`, `'incomplete'`, `'deferred'`.

### 2. User Skills Proficiency & Experience
[VERIFIED: schema.sql:268-273](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L268-L273)
```sql
    CONSTRAINT chk_user_skills_proficiency
        CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),

    CONSTRAINT chk_user_skills_exp_positive
        CHECK (years_of_experience IS NULL OR years_of_experience >= 0)
```
Allowed values: `'beginner'`, `'intermediate'`, `'advanced'`, `'expert'`. Column name: `years_of_experience` (NOT `years_experience`).

### 3. Work Experience Types
[VERIFIED: schema.sql:305-309](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L305-L309)
```sql
    CONSTRAINT chk_experience_type
        CHECK (experience_type IN (
            'full_time', 'part_time', 'internship',
            'freelance', 'volunteer', 'apprenticeship'
        )),
```
Allowed values: `'full_time'`, `'part_time'`, `'internship'`, `'freelance'`, `'volunteer'`, `'apprenticeship'`.

### 4. User Certification Status & Date Obtained
[VERIFIED: schema.sql:347-352](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L347-L352)
```sql
    CONSTRAINT chk_user_cert_status
        CHECK (status IN ('active', 'expired', 'revoked', 'in_progress')),

    CONSTRAINT chk_user_cert_dates
        CHECK (expiry_date IS NULL OR date_obtained IS NULL OR expiry_date >= date_obtained)
```
Allowed values: `'active'`, `'expired'`, `'revoked'`, `'in_progress'`. Column name: `date_obtained` (NOT `issue_date`).

### 5. Career Break Reasons (Neutral Categorization)
[VERIFIED: schema.sql:379-383](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L379-L383)
```sql
    CONSTRAINT chk_break_reason
        CHECK (break_reason IN (
            'parental_leave', 'health', 'caregiving', 'education',
            'travel', 'personal', 'layoff', 'career_change', 'other'
        )),
```
Allowed values: `'parental_leave'`, `'health'`, `'caregiving'`, `'education'`, `'travel'`, `'personal'`, `'layoff'`, `'career_change'`, `'other'`.

### 6. Career Goals Status & Priority
[VERIFIED: schema.sql:427-432](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L427-L432)
```sql
    CONSTRAINT chk_career_goals_priority
        CHECK (priority BETWEEN 1 AND 5),

    CONSTRAINT chk_career_goals_status
        CHECK (status IN ('exploring', 'active', 'achieved', 'paused', 'abandoned'))
```
Allowed status: `'exploring'`, `'active'`, `'achieved'`, `'paused'`, `'abandoned'`. Priority: integer `1` to `5`.

### 7. Career Requirements Polymorphic Rules
[VERIFIED: schema.sql:480-513](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L480-L513)
```sql
    CONSTRAINT chk_career_req_type
        CHECK (requirement_type IN (
            'skill', 'education', 'certification',
            'experience', 'eligibility', 'other'
        )),

    CONSTRAINT chk_career_req_exclusive_fks
        CHECK (
            (requirement_type = 'skill'
                AND skill_id IS NOT NULL
                AND qualification_type_id IS NULL
                AND certification_id IS NULL)
            OR
            (requirement_type = 'education'
                AND qualification_type_id IS NOT NULL
                AND skill_id IS NULL
                AND certification_id IS NULL)
            OR
            (requirement_type = 'certification'
                AND certification_id IS NOT NULL
                AND skill_id IS NULL
                AND qualification_type_id IS NULL)
            OR
            (requirement_type IN ('experience', 'eligibility', 'other')
                AND skill_id IS NULL
                AND qualification_type_id IS NULL
                AND certification_id IS NULL)
        )
```
Allowed requirement types: `'skill'`, `'education'`, `'certification'`, `'experience'`, `'eligibility'`, `'other'`.

### 8. Career Gap Analyses & Items
[VERIFIED: schema.sql:565-570](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L565-L570) and [schema.sql:611-620](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L611-L620)
```sql
    CONSTRAINT chk_gap_analyses_pct
        CHECK (overall_readiness_pct IS NULL OR overall_readiness_pct BETWEEN 0 AND 100),

    CONSTRAINT chk_gap_analyses_status
        CHECK (status IN ('in_progress', 'completed', 'reviewed', 'archived'))
```
```sql
    CONSTRAINT chk_gap_items_severity
        CHECK (gap_severity IN ('low', 'medium', 'high', 'critical')),

    CONSTRAINT chk_gap_items_priority
        CHECK (priority BETWEEN 1 AND 5),

    CONSTRAINT chk_gap_items_status
        CHECK (status IN ('identified', 'in_progress', 'resolved', 'not_applicable'))
```
Analysis status: `'in_progress'`, `'completed'`, `'reviewed'`, `'archived'`.  
Gap severity: `'low'`, `'medium'`, `'high'`, `'critical'` (Column: `gap_severity`, NOT `severity`).  
Gap status: `'identified'`, `'in_progress'`, `'resolved'`, `'not_applicable'`.  
Target state column: `required_state` (NOT `desired_state`).

### 9. Learning Resources & Plans
[VERIFIED: schema.sql:648-660](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L648-L660) and [schema.sql:717-726](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L717-L726)
```sql
    CONSTRAINT chk_resource_type
        CHECK (resource_type IN (
            'course', 'book', 'tutorial', 'workshop',
            'certification_program', 'mentorship', 'practice_exam', 'other'
        )),
```
Columns: `resource_name` (NOT `title`), `estimated_duration_hours` (NOT `duration_hours`), `cost` (NOT `cost_inr`).  
Learning plan status: `'draft'`, `'active'`, `'completed'`, `'paused'`, `'abandoned'`.  
Plan item status [VERIFIED: schema.sql:765]: `'pending'`, `'in_progress'`, `'completed'`, `'skipped'`.

### 10. Assessments & Assessment Results
[VERIFIED: schema.sql:800-819](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L800-L819) and [schema.sql:850-851](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/schema.sql#L850-L851)
```sql
    CONSTRAINT chk_assessment_type
        CHECK (assessment_type IN (
            'quiz', 'practical', 'project', 'interview',
            'peer_review', 'certification_exam', 'other'
        )),
```
Columns: `score` (NOT `score_achieved`), `notes` (NOT `feedback`). Bounds: `score >= 0`, `passing_score <= max_score`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection Management | Custom TCP socket or singleton client | `pg.Pool` from `node-postgres` | Hand-rolled connection managers leak sockets, fail to handle server restarts, lack connection queuing, and don't manage pool timeouts under concurrent traffic. |
| SQL Injection Protection | String interpolation or custom regex cleaners | Parameterized SQL queries (`$1, $2, ...`) | Hand-rolled string sanitization regularly suffers bypasses with quotes, escapes, and multibyte encodings. `pg` sends query text and parameters in separate protocol messages. |
| Database Error Translation | Ad-hoc regex checks on `err.message` | PostgreSQL SQLSTATE Error Codes (`23505`, `23503`, `23514`, `22P02`, etc.) | Error messages change across localized PostgreSQL builds and database versions, whereas SQLSTATE codes are standardized ANSI SQL codes. |
| Rate Limiting | In-memory `setInterval` counter loops | `express-rate-limit` | Hand-rolled timer loops leak memory, fail to handle header standards (`RateLimit-*`), and suffer race conditions. |
| Security Headers | Manual `res.setHeader()` calls | `helmet` | Helmet maintains up-to-date best practice HTTP security headers (nosniff, frame-guard, xss-filter, hide-powered-by). |
| Multi-table Analytical Metrics | In-memory nested JavaScript loops across endpoints | PostgreSQL Multi-CTE queries (e.g., Query 15) | Computing dashboard metrics in JavaScript requires fetching thousands of raw rows into memory, risking Cartesian duplication and high latency. Query 15 runs in <15ms inside PostgreSQL. |

---

## Common Pitfalls

### Pitfall 1: Unhandled Idle Client Error Crashing Node Process
**What goes wrong:** Node.js application process suddenly crashes with an unhandled `'error'` event when PostgreSQL restarts, drops an idle socket, or reaches a network timeout.  
**Why it happens:** In `node-postgres`, when an idle connection in the pool encounters a network interruption or TCP reset, the error is emitted on the `Pool` instance. If no error listener is attached to `pool.on('error')`, Node treats it as an uncaught exception and terminates.  
**How to avoid:** Always attach an error listener directly to the pool upon initialization:
```javascript
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});
```
**Warning signs:** Application crashes intermittently during low-traffic periods or overnight database backup windows.

### Pitfall 2: Connection Pool Starvation / Client Leaks
**What goes wrong:** The API gateway becomes unresponsive; incoming HTTP requests hang until client timeout.  
**Why it happens:** Calling `pool.connect()` without releasing the client in a `finally` block when an error occurs causes all 20 connections in the pool to stay checked out indefinitely.  
**How to avoid:** Prefer `pool.query(text, params)` for single queries (which checks out and releases automatically). For multi-statement transactions, encapsulate client usage inside a `try ... finally { client.release(); }` block or use a `withTransaction` helper.  
**Warning signs:** `pool.waitingCount` steadily increments; server stops responding to any endpoint after 20 errors.

### Pitfall 3: Column Name Mismatches with Hypothetical Schemas
**What goes wrong:** Queries fail at runtime with PostgreSQL error `42703 (undefined_column)`.  
**Why it happens:** Previous audit tooling assumed hypothetical column names (e.g. `title`, `duration_hours`, `issue_date`, `severity`, `feedback`).  
**How to avoid:** Adhere strictly to the verified schema definitions:
- `learning_resources`: `resource_name`, `estimated_duration_hours`, `cost`
- `user_certifications`: `date_obtained`
- `career_gap_items`: `gap_severity`, `required_state`
- `career_roles`: `experience_years_required`
- `user_skills`: `years_of_experience`
- `assessment_results`: `score`, `notes`
- `qualification_types` & `gap_types`: `type_name`
**Warning signs:** Error `column "issue_date" of relation "user_certifications" does not exist`.

### Pitfall 4: Modifying Live Sample Data During Integration Tests
**What goes wrong:** The 174 committed sample records in `skillbridge_db` are modified or deleted, violating locked user constraint #2 and #3.  
**Why it happens:** Test suites executing `POST`, `PUT`, or `DELETE` requests directly against the live database without transaction isolation.  
**How to avoid:** All mutation testing in integration suites must wrap queries in a database transaction and issue a mandatory `ROLLBACK`:
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // run mutation tests
} finally {
  await client.query('ROLLBACK');
  client.release();
}
```
**Warning signs:** `verify_counts.sql` or Check 1 in `database_integrity_checks.sql` reports record count $\neq$ 174.

### Pitfall 5: Express 4 vs 5 Async Error Bubbling
**What goes wrong:** An unhandled promise rejection inside an `async` controller handler hangs the HTTP request or causes an unhandled rejection warning.  
**Why it happens:** In Express 4, route handlers returning rejected promises do not automatically pass errors to `next(err)`.  
**How to avoid:** In Express 5 (v5.3.0), async rejection forwarding is native. However, to guarantee compatibility and defensive safety across both versions, use a standard `asyncHandler` wrapper:
```javascript
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

---

## Code Examples

### 1. Connection Pool & Transaction Helper (`src/config/db.js`)
```javascript
// Source: node-postgres official documentation & SkillBridge architectural specification
import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'skillbridge_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  max: 20,                          // Maximum client connections in pool
  idleTimeoutMillis: 30000,          // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000,     // Timeout connection attempts after 5 seconds
});

// Mandatory pool error handler to prevent idle client unhandled crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

// Single-query helper (handles checkout and release automatically)
export const query = (text, params) => pool.query(text, params);

// ACID Transaction helper with guaranteed client release
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 2. Centralized Error Handler Middleware (`src/middleware/errorHandler.js`)
```javascript
// Source: PostgreSQL SQLSTATE specification & JSend standard
export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err);

  // Default internal server error
  let statusCode = err.statusCode || 500;
  let response = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message: err.message || 'An unexpected internal server error occurred',
    code: err.code || 'INTERNAL_ERROR',
  };

  // PostgreSQL Error Code Translation
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = 409;
        response = {
          status: 'fail',
          message: 'A record with this identifier or unique natural key already exists.',
          code: 'UNIQUE_VIOLATION',
          detail: err.detail,
        };
        break;

      case '23503': // foreign_key_violation
        statusCode = 400;
        response = {
          status: 'fail',
          message: 'Referenced parent or child entity does not exist in the database.',
          code: 'FOREIGN_KEY_VIOLATION',
          detail: err.detail,
        };
        break;

      case '23514': // check_violation
        statusCode = 422;
        response = {
          status: 'fail',
          message: 'Input violates domain business rules (e.g., date ordering or score bounds).',
          code: 'CHECK_VIOLATION',
          constraint: err.constraint,
        };
        break;

      case '22P02': // invalid_text_representation
        statusCode = 400;
        response = {
          status: 'fail',
          message: 'Invalid parameter format (e.g. non-numeric ID supplied).',
          code: 'INVALID_DATA_TYPE',
        };
        break;

      case '23502': // not_null_violation
        statusCode = 400;
        response = {
          status: 'fail',
          message: `Mandatory field "${err.column}" cannot be null.`,
          code: 'NOT_NULL_VIOLATION',
        };
        break;

      case 'ECONNREFUSED':
      case '57P01': // admin_shutdown
      case '08006': // connection_failure
        statusCode = 503;
        response = {
          status: 'error',
          message: 'Database service is currently unreachable. Please retry shortly.',
          code: 'DATABASE_UNAVAILABLE',
        };
        break;
    }
  }

  // Zod Validation Error formatting
  if (err.name === 'ZodError') {
    statusCode = 400;
    response = {
      status: 'fail',
      message: 'Validation failed for request parameters or payload.',
      code: 'VALIDATION_ERROR',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };
  }

  return res.status(statusCode).json(response);
}
```

### 3. Zod Input Validation Middleware (`src/middleware/validate.js`)
```javascript
// Generic schema validation for body, query, and params
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // Replace with sanitized/coerced values
      next();
    } catch (error) {
      next(error); // Caught by errorHandler
    }
  };
};
```

### 4. Query 15 Executive Dashboard Service (`src/services/analytics.service.js`)
```javascript
// Source: test_queries.sql lines 658-736 (CTE architecture)
import { query } from '../config/db.js';
import { ANALYTICAL_QUERIES } from '../queries/analyticalQueries.js';

export async function getExecutiveDashboard() {
  const result = await query(ANALYTICAL_QUERIES.Q15_EXECUTIVE_DASHBOARD);
  return {
    candidates: result.rows,
    meta: {
      total: result.rowCount,
      timestamp: new Date().toISOString(),
    },
  };
}
```

### 5. Integration Test with Safe Rollback Pattern (`tests/integration/candidate.test.js`)
```javascript
// Verifies mutation safely without modifying existing database state
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/db.js';

describe('Candidate Creation Mutation (Write-Safety Guarantee)', () => {
  it('should insert candidate within transaction and rollback completely', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO users (email, full_name, country)
         VALUES ($1, $2, $3)
         RETURNING user_id, email, full_name`,
        ['temp.test@skillbridge.org', 'Test Candidate', 'India']
      );

      assert.equal(insertRes.rowCount, 1);
      assert.equal(insertRes.rows[0].email, 'temp.test@skillbridge.org');

      // Verify row exists inside active transaction
      const checkRes = await client.query('SELECT count(*) FROM users WHERE email = $1', [
        'temp.test@skillbridge.org',
      ]);
      assert.equal(parseInt(checkRes.rows[0].count, 10), 1);
    } finally {
      // Rollback unconditionally to preserve 174 baseline rows
      await client.query('ROLLBACK');
      client.release();
    }

    // Verify row does NOT exist after rollback
    const postRes = await pool.query('SELECT count(*) FROM users WHERE email = $1', [
      'temp.test@skillbridge.org',
    ]);
    assert.equal(parseInt(postRes.rows[0].count, 10), 0);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CommonJS (`require` / `module.exports`) | ES Modules (`import` / `export` with `"type": "module"`) | Node.js 14+ standardized; default in 2026 | Native ESM eliminates bundler requirements, enables top-level await, and aligns with modern browser/Node standards. |
| Express 4 (`express-async-errors` / manual `try/catch`) | Express 5.x native rejected promise forwarding | Express 5.0 (2024/2025) | Async errors in route handlers bubble directly to `(err, req, res, next)` without third-party wrapper libraries. |
| Heavy ORM schema mapping (Prisma / TypeORM) | Thin repository / query layer with `pg.Pool` | Ongoing industry shift | Prevents ORM migration drift from mutating locked 3NF database schemas; executes complex CTEs (Query 15) with zero overhead. |
| Jest test runner (`jest.config.js` + babel transforms) | Native `node:test` runner | Node.js 18+ LTS, matured in Node 20-24 | Zero dependencies, instant test startup, native ESM execution without ts-jest or babel presets. |
| In-memory Cartesian table joins in JavaScript | Isolated Common Table Expressions (CTEs) in PostgreSQL | Remediated in Phase 4 | Pre-aggregating 1-to-many child tables (`career_gap_items`, `learning_plan_items`) eliminates row explosion and drops latency from seconds to <15ms. |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Express 5.3.0 is preferred over Express 4.22.3, but both are fully supported by adopting defensive `asyncHandler` wrappers. | Standard Stack | Minimal: `asyncHandler` ensures identical error forwarding across both Express 4 and 5. |
| A2 | Local PostgreSQL service `skillbridge_db` is configured on default port `5432` with username `postgres`. | Environment Availability | Low: Connection parameters are fully customizable via environment variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`). |

---

## Open Questions

1. **Database Credentials in Execution Environment:**
   - What we know: PostgreSQL 18.6 is installed at `C:\Program Files\PostgreSQL\18\bin\psql.exe`.
   - What's unclear: What exact password is set for the local `postgres` superuser on this development machine.
   - Recommendation: Provide a `.env.example` template with clear instructions and default fallback to environment variables (`PGUSER`, `PGPASSWORD`).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| **Node.js** | Backend API Runtime | ✓ | 24.7.0 [VERIFIED] | — |
| **npm** | Dependency Management | ✓ | 11.5.1 [VERIFIED] | — |
| **PostgreSQL (`psql`)** | Database CLI & Testing | ✓ | 18.6 (18.0.6.0) [VERIFIED] | Node `pg` client connects directly via TCP |
| **`pg` (node-postgres)** | Database Connection Pooling | ✓ (Registry) | 8.23.1 [VERIFIED] | — |
| **Express** | Web Framework | ✓ (Registry) | 5.3.0 / 4.22.3 [VERIFIED] | — |

**Missing dependencies with no fallback:** None.  
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Native `node:test` + `node:assert/strict` (Node.js 24) [VERIFIED] |
| HTTP Testing | `supertest` 7.3.2 [VERIFIED: npm registry] |
| Config file | `package.json` (`"test": "node --test tests/**/*.test.js"`) |
| Quick run command | `node --test tests/unit/**/*.test.js` |
| Full suite command | `node --test tests/**/*.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **FR-01** | Candidate profile CRUD operations | Integration | `node --test tests/integration/user.test.js` | ❌ Wave 0 |
| **FR-02** | Career break neutral intake | Integration | `node --test tests/integration/user.test.js` | ❌ Wave 0 |
| **FR-03** | Dynamic catalog listing | Integration | `node --test tests/integration/catalog.test.js` | ❌ Wave 0 |
| **FR-04** | Polymorphic requirement resolution | Unit / Integration | `node --test tests/integration/catalog.test.js` | ❌ Wave 0 |
| **FR-05** | Skill match comparison (Query 8) | Integration | `node --test tests/integration/goal.test.js` | ❌ Wave 0 |
| **FR-06** | Learning plan item sequencing (Query 10) | Integration | `node --test tests/integration/learning.test.js` | ❌ Wave 0 |
| **FR-07** | Assessment score validation | Unit / Integration | `node --test tests/integration/assessment.test.js` | ❌ Wave 0 |
| **FR-08** | Growth detection query (Query 14) | Integration | `node --test tests/integration/assessment.test.js` | ❌ Wave 0 |
| **FR-09** | Executive dashboard CTE (Query 15) | Integration | `node --test tests/integration/analytics.test.js` | ❌ Wave 0 |
| **FR-10** | Health ping & sequence sync check | Integration | `node --test tests/integration/health.test.js` | ❌ Wave 0 |
| **NFR-01** | ACID transaction rollback | Unit / Integration | `node --test tests/unit/transaction.test.js` | ❌ Wave 0 |
| **NFR-02** | 400 response on FK violation | Integration | `node --test tests/integration/errorHandling.test.js` | ❌ Wave 0 |
| **NFR-04** | Data minimization & sanitization | Unit | `node --test tests/unit/sanitization.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/unit/**/*.test.js` (< 2s)
- **Per wave merge:** `node --test tests/**/*.test.js` (< 10s)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/package.json` with `"type": "module"` and `"test"` script.
- [ ] `backend/tests/setup.js` setting `NODE_ENV=test` and configuring test environment.
- [ ] `backend/tests/integration/health.test.js` covering `/api/health`.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| **V2 Authentication** | Deferred to Phase 8 | Candidate / Counselor authentication handled in Phase 8; Phase 7 focuses on gateway baseline. |
| **V3 Session Management** | Deferred to Phase 8 | Session state and JWTs configured in Phase 8. |
| **V4 Access Control** | Deferred to Phase 8 | Role-based routing enforced in Phase 8. |
| **V5 Input Validation** | **Yes** | Zod schemas enforce type coercion, integer bounds, regex email format, and strict DB enum checking before queries execute. |
| **V6 Cryptography** | **Yes** | Parameterized SQL queries eliminate injection; TLS/SSL connection support configured for remote database hosts. |

### Known Threat Patterns for Node/Express + PostgreSQL

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection | Tampering | 100% Parameterized queries with `$1, $2, ...` placeholders via `pg.Pool`. Zero string concatenation. |
| Denial of Service via Payload Flooding | Denial of Service | `express.json({ limit: '10kb' })` body size limit; `express-rate-limit` capped at 100 req/15min. |
| Information Disclosure via Stack Traces | Information Disclosure | Production error handler suppresses raw stack traces; returns clean JSend error envelope. |
| Cross-Site Scripting (XSS) & Clickjacking | Tampering / Elevation | `helmet` middleware sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, removes `X-Powered-By`. |
| Cross-Origin Data Leakage | Information Disclosure | `cors` middleware restricts Allowed-Origins to configured domain list. |

---

## Sources

### Primary (HIGH confidence)
- `schema.sql` (Project source of truth, lines 58-860) [VERIFIED: in-repo]
- `test_queries.sql` & `corrected_test_queries.sql` (Analytical queries Q1-Q15) [VERIFIED: in-repo]
- `database_integrity_checks.sql` (13-section integrity check suite) [VERIFIED: in-repo]
- `.planning/phases/07-CONTEXT.md` (Architectural decisions & ground rules) [VERIFIED: in-repo]
- `npm` Registry API (`registry.npmjs.org`) for `express`, `pg`, `dotenv`, `cors`, `helmet`, `express-rate-limit`, `zod`, `supertest` [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Node.js v24.7.0 Documentation (`nodejs.org/api/test.html`) for native `node:test` runner.
- Express.js 5.0 Release Notes (`expressjs.com/en/5x/api.html`) regarding native promise rejection handling.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (all packages verified against npm registry with download/age metrics)
- Architecture: HIGH (fully documented 6 domains mapped to 22 verified tables)
- Pitfalls & Security: HIGH (verified against real PostgreSQL schema column ground truth and STRIDE patterns)

**Research date:** 2026-11-10  
**Valid until:** 2026-12-10 (stable stack)
