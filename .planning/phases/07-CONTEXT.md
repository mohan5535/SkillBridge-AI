# Phase 7 Context & Architectural Specification: RESTful API Gateway & Database Integration

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Phase:** Phase 7 — RESTful API Gateway and Database Integration  
**Milestone:** Milestone 2 — Backend API & Service Layer Implementation  
**Technology:** Node.js, Express.js, PostgreSQL 18.6, `pg` (node-postgres), JavaScript (ES Modules / CommonJS)  
**Database:** `skillbridge_db` (22 tables, 174 committed records)  
**Created:** 2026-11-10  
**Status:** Architecture Discussed & Documented (Pending User Approval Before Implementation)  

---

## 1. Executive Overview & Ground Rules

This document establishes the complete architectural contract and technical specification for **Phase 7: RESTful API Gateway and Database Integration**.

### Strict Operational Constraints:
1. **Source of Truth:** The existing PostgreSQL 18.6 schema (`schema.sql`) and committed database (`skillbridge_db` / `skillbridge_backup.dump`, 174 records) are the immutable source of truth.
2. **Zero Schema Mutations:** No tables, columns, or constraints will be altered, dropped, or recreated.
3. **Zero Data Loss:** No sample records will be deleted, truncated, or overwritten. `sample_data.sql` will **not** be rerun.
4. **No Migration Application:** The 17 pending indexes in `migrations/001_add_fk_covering_indexes.sql` remain unapplied until specifically approved.
5. **No Code Implementation in Discuss Phase:** This phase defines architecture, endpoints, data flow, security, and testing strategies. No application source code is written until this plan is formally approved.

---

## 2. Table-to-API Domain Mapping (All 22 Tables)

The 22 normalized tables are partitioned across six cohesive API resource domains:

```
+---------------------------------------------------------------------------------------------------+
|                                  SKILLBRIDGE AI API GATEWAY (/api)                                |
+---------------------------------------------------------------------------------------------------+
  │
  ├── /api/users (Domain 1: User Identity & Multi-Profile History)
  │     ├── users, education_records, user_skills, user_experiences,
  │     ├── user_certifications, career_breaks
  │
  ├── /api/catalog (Domain 2: Career Fields, Roles, Skills & Standards)
  │     ├── career_fields, career_roles, skills, qualification_types,
  │     ├── certifications, career_requirements (polymorphic)
  │
  ├── /api/goals & /api/analyses (Domain 3: Career Goals & Gap Analytics)
  │     ├── career_goals, gap_types, career_gap_analyses, career_gap_items
  │
  ├── /api/learning (Domain 4: Learning Roadmaps & Educational Resources)
  │     ├── learning_resources, resource_skills, learning_plans, learning_plan_items
  │
  ├── /api/assessments (Domain 5: Skill Assessment, Scoring & Growth)
  │     ├── assessments, assessment_results
  │
  └── /api/analytics (Domain 6: Executive Reporting & Cohort Intelligence)
        └── Integrates Verified SQL Queries Q1 through Q15
```

---

## 3. Comprehensive RESTful API Endpoint Catalog

### Domain 1: Candidates & Profiles (`/api/users`)
* `GET /api/users` — List candidates (supports pagination `?page=1&limit=10` and search `?q=Priya`).
* `GET /api/users/:id` — Retrieve full profile (user details + aggregated education, skills, experiences, certifications, career breaks).
* `POST /api/users` — Register new candidate identity (`email`, `full_name`, `country`, etc.).
* `PUT /api/users/:id` — Update candidate profile details.
* `GET /api/users/:id/education` — List candidate education records with qualification rank (Query 1).
* `POST /api/users/:id/education` — Add education record (enforces `end_date >= start_date`).
* `GET /api/users/:id/skills` — List candidate acquired skills with proficiency levels (Query 2).
* `POST /api/users/:id/skills` — Add acquired skill with experience years and evidence.
* `GET /api/users/:id/experiences` — List employment history (Query 3).
* `POST /api/users/:id/experiences` — Add work experience entry.
* `GET /api/users/:id/certifications` — List candidate certifications.
* `POST /api/users/:id/certifications` — Add certification credential.
* `GET /api/users/:id/career-breaks` — List career pauses and reasons.
* `POST /api/users/:id/career-breaks` — Record career break (neutral informational intake).

### Domain 2: Career Catalog & Industry Standards (`/api/catalog`)
* `GET /api/catalog/fields` — List all career fields (`field_id`, `field_name`, `is_active`).
* `GET /api/catalog/roles` — List career roles with mandatory/optional requirement counts (Query 4).
* `GET /api/catalog/roles/:id` — Retrieve role details and complete polymorphic requirements (Query 5).
* `GET /api/catalog/skills` — List skill library (filterable by category: `category=programming`).
* `GET /api/catalog/qualifications` — List educational tiers ordered by `level_rank`.
* `GET /api/catalog/certifications` — List recognized professional certifications.

### Domain 3: Career Goals & Gap Analysis (`/api/goals` & `/api/analyses`)
* `GET /api/users/:id/goals` — List candidate target career goals.
* `POST /api/users/:id/goals` — Set new career goal (links user to target `role_id`).
* `GET /api/goals/:goalId/skill-match` — Execute side-by-side skill match comparison (Query 8: Python MET, React NOT MET, SQL MET).
* `POST /api/goals/:goalId/analyses` — Trigger automated gap analysis computation.
* `GET /api/analyses/:analysisId` — Retrieve detailed gap items with severity ratings (Query 6).

### Domain 4: Learning Roadmaps & Resources (`/api/learning`)
* `GET /api/users/:id/learning-plans` — List learning plans for a candidate.
* `GET /api/learning-plans/:planId` — Retrieve learning plan with sequenced tasks and resources (Query 10).
* `POST /api/goals/:goalId/learning-plans` — Generate new learning plan for an active goal.
* `PATCH /api/learning-plan-items/:itemId` — Update task progress status (`pending` $\rightarrow$ `in_progress` $\rightarrow$ `completed`).
* `GET /api/learning/resources` — Search learning catalog (supports role alignment filter, Query 12).

### Domain 5: Skill Assessments & Verification (`/api/assessments`)
* `GET /api/assessments` — List active skill assessments with passing scores and test types.
* `GET /api/assessments/:id` — Get assessment details and rubrics.
* `POST /api/assessments/:id/submit` — Submit test attempt (`score`, `evidence`, evaluates pass flag).
* `GET /api/users/:id/assessments` — Candidate assessment attempt history (Query 13).
* `GET /api/users/:id/growth` — Evaluate score improvements on re-tests (Query 14).

### Domain 6: Executive Analytics & Cohort Intelligence (`/api/analytics`)
* `GET /api/analytics/dashboard` — Full executive readiness dashboard across all candidates (Query 15, isolated CTEs).
* `GET /api/analytics/at-risk` — List at-risk candidates with latest readiness < 60% (Query 7).
* `GET /api/analytics/task-summary` — Task completion breakdown by user (Query 11).
* `GET /api/analytics/career-breaks` — Cohort analysis of career break candidates (Query 9).

---

## 4. Backend Modular Folder Architecture

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # PostgreSQL 18 connection pool (pg.Pool)
│   │   └── env.js                # Environment variable loader & schema validation
│   ├── constants/
│   │   ├── statusEnums.js        # Status vocabularies matching schema CHECK constraints
│   │   └── httpCodes.js          # Standard HTTP status code constants
│   ├── middleware/
│   │   ├── errorHandler.js       # Centralized error handler & PG error code translator
│   │   ├── validate.js           # Schema-based request validation middleware
│   │   ├── security.js           # Helmet, CORS, and rate limiting configuration
│   │   └── requestLogger.js      # Structured HTTP request logger
│   ├── routes/
│   │   ├── index.js              # Master API router (/api)
│   │   ├── health.routes.js      # /api/health
│   │   ├── user.routes.js        # /api/users
│   │   ├── catalog.routes.js     # /api/catalog
│   │   ├── goal.routes.js        # /api/goals & /api/analyses
│   │   ├── learning.routes.js    # /api/learning
│   │   ├── assessment.routes.js  # /api/assessments
│   │   └── analytics.routes.js   # /api/analytics
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
│   │   ├── gapAnalysis.service.js   # Gap calculation & readiness percentage algorithm
│   │   ├── learning.service.js      # Plan sequencing & resource mapping
│   │   ├── assessment.service.js    # Score evaluation & growth detection
│   │   └── analytics.service.js     # Query 1-15 query execution wrappers
│   ├── queries/                     # Reusable SQL query constants & CTEs
│   │   ├── userQueries.js
│   │   ├── catalogQueries.js
│   │   ├── gapQueries.js
│   │   ├── learningQueries.js
│   │   ├── assessmentQueries.js
│   │   └── analyticalQueries.js     # Queries 1 to 15 from test_queries.sql
│   ├── errors/
│   │   ├── AppError.js              # Base operational error class
│   │   ├── NotFoundError.js         # 404 handler
│   │   ├── ValidationError.js       # 400/422 handler
│   │   └── DatabaseError.js         # PostgreSQL exception wrapper
│   └── app.js                       # Express application factory & middleware pipeline
├── tests/
│   ├── unit/                        # Pure service & validation unit tests
│   └── integration/                 # Supertest API endpoint test suite
├── .env.example                     # Environment template (PGHOST, PGPORT, etc.)
├── package.json                     # Node.js dependencies
└── server.js                        # HTTP server listener & graceful shutdown handlers
```

---

## 5. PostgreSQL Connection Pooling (`pg`)

Connection pooling is configured using `pg.Pool` from `node-postgres`:

```javascript
// src/config/db.js
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

// Helper for single parameterized query
export const query = (text, params) => pool.query(text, params);

// Helper for multi-statement ACID transactions
export const getClient = () => pool.connect();
```

* **Health Ping:** `/api/health` issues `SELECT 1;` to verify database connectivity.
* **Graceful Termination:** Listens to `SIGTERM` and `SIGINT` to invoke `await pool.end()` cleanly.

---

## 6. Standardized Request & Response Envelope

All API responses strictly adhere to the JSend JSON specification:

### Success Response (`200 OK`, `201 Created`):
```json
{
  "status": "success",
  "data": {
    "user_id": 1,
    "full_name": "Priya Sharma",
    "email": "priya.sharma@example.com"
  },
  "meta": {
    "timestamp": "2026-11-10T02:40:00.000Z",
    "total": 1
  }
}
```

### Error Response (`400`, `404`, `409`, `422`, `500`):
```json
{
  "status": "fail",
  "message": "Resource with specified identifier was not found",
  "code": "RESOURCE_NOT_FOUND",
  "errors": [
    {
      "field": "id",
      "message": "No candidate found with user_id = 999"
    }
  ]
}
```

---

## 7. Centralized Error Handling & PostgreSQL Error Code Mapping

The centralized error handler (`errorHandler.js`) intercepts all exceptions and translates PostgreSQL error codes into semantic HTTP status codes:

| PostgreSQL Error Code | Error Class | HTTP Status | User-Facing Message |
| :--- | :--- | :---: | :--- |
| `23505` | `unique_violation` | **409 Conflict** | "A record with this identifier or natural key already exists." |
| `23503` | `foreign_key_violation` | **400 Bad Request** | "Referenced entity does not exist in the database." |
| `23514` | `check_violation` | **422 Unprocessable** | "Input violates business domain rules (e.g. date ordering or score bounds)." |
| `22P02` | `invalid_text_representation` | **400 Bad Request** | "Invalid parameter format (e.g. non-numeric ID supplied)." |
| `23502` | `not_null_violation` | **400 Bad Request** | "A required mandatory field is missing." |
| `ECONNREFUSED` / `57P01` | Connection Failure | **503 Unavailable** | "Database service currently unreachable. Please retry shortly." |

---

## 8. Input Validation Strategy

Validation middleware intercepts incoming requests before reaching controller logic:
1. **Route Parameters:** Validates integer IDs (`/api/users/:id` $\implies$ `parseInt(id) > 0`).
2. **Domain Vocabularies:** Rejects out-of-domain enums (e.g. `proficiency_level` must be one of `'beginner'`, `'intermediate'`, `'advanced'`, `'expert'`).
3. **Date Boundaries:** Validates that `end_date >= start_date` for education, experience, and learning plans.
4. **Scoring Bounds:** Validates `0 <= score <= max_score`.
5. **Polymorphic Exclusivity:** Verifies that career requirements specify exactly one reference (`skill_id`, `qualification_type_id`, or `certification_id`).

---

## 9. API Security Architecture

* **Parameterized SQL:** Every query utilizes `$1, $2, ...` placeholders. **Zero string concatenation**, eliminating SQL injection risks.
* **HTTP Security Headers:** Configured via `helmet` (Disables `X-Powered-By`, enables `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`).
* **CORS Policy:** Strict origin whitelisting (`cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' })`).
* **Rate Limiting:** `express-rate-limit` restricting requests (e.g., 100 requests / 15 minutes per IP on public routes).
* **Data Minimization:** Sensitive internal fields and credentials are never returned in JSON payloads.

---

## 10. Reusable SQL Integration (Queries 1 to 15)

The 15 analytical reporting queries from `test_queries.sql` are integrated into `src/queries/analyticalQueries.js`:

* `Q01`: User education with qualification ranks (`LEFT JOIN` pattern).
* `Q04`: Role catalog with requirement counts (`COALESCE(SUM(...), 0)`).
* `Q05`: Full-Stack role polymorphic requirements breakdown.
* `Q06`: Gap items for Priya Sharma with severity ratings.
* `Q07`: At-risk candidates with latest readiness < 60% (`DISTINCT ON` snapshot scoping).
* `Q08`: Side-by-side skill comparison for Priya Sharma (**Python MET**, **React NOT MET**, **SQL MET**).
* `Q09`: Career break cohort correlation.
* `Q11`: Task completion summary per candidate.
* `Q12`: Role-aligned learning resources.
* `Q13`: Assessment attempt history.
* `Q14`: Verified candidate growth on re-tests.
* `Q15`: Executive readiness dashboard utilizing 3 isolated CTEs.

---

## 11. Backend Testing & Verification Strategy

1. **Unit Testing:**
   * Test validation middleware with valid/invalid payloads.
   * Test error translation logic (PG code mapping to HTTP status).
   * Test readiness scoring calculation algorithms.
2. **Integration Testing (Supertest):**
   * Execute read-only API requests against live `skillbridge_db` verifying actual returned rows (e.g., Priya's 3 gap items, 5 career roles, 15 analytical query responses).
   * Verify HTTP status codes (`200 OK`, `400 Bad Request`, `404 Not Found`).
3. **Write-Safety Guarantee:**
   * Any integration test that writes data must execute within a database transaction and immediately issue a `ROLLBACK` (`BEGIN ... ROLLBACK`).
   * **Guarantee:** Zero modification to the existing 174 committed database records.

---

## 12. Phase 7 Implementation Steps (Planned Sequence)

Once approved, implementation will proceed in four structured waves:
* **Wave 1:** Project initialization (`package.json`, Express app, `pg.Pool` connection, environment config, `/api/health`).
* **Wave 2:** Core API routes & controllers (`/api/users`, `/api/catalog`).
* **Wave 3:** Advanced analytics & roadmap routes (`/api/goals`, `/api/analyses`, `/api/learning`, `/api/assessments`, `/api/analytics`).
* **Wave 4:** Centralized error handling, input validation middleware, security hardening, and Supertest suite.

