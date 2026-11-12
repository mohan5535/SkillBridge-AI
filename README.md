# SkillBridge AI — Universal Career Gap Tracker & Learning Engine

> A full-stack career intelligence platform pairing a normalized **PostgreSQL (3NF, 22 tables)** relational architecture with an **Express REST API Gateway**, **Multi-Factor Readiness & Roadmap Engine**, and a **Zero-Build Candidate & Counselor Web Portal**.

---

## Key Highlights

- **Universal Across Sectors:** Generic polymorphic requirement modeling (`career_requirements`) across Information Technology, Healthcare & Nursing, Commerce & Accounting, Engineering, Education, Civil Services, and Skilled Trades — zero domain hardcoding.
- **Multi-Factor Readiness Engine:** Quantitative scoring across **Skills (40%)**, **Experience (20%)**, **Education (20%)**, **Certifications (10%)**, and **Assessments (10%)**, paired with automated gap detection and dependency-sequenced learning roadmaps.
- **Ethical Career Break Modeling:** `career_breaks` captures pauses (`parental_leave`, `health`, `caregiving`, `education`, `travel`, `personal`, `layoff`, `career_change`, `other`) neutrally for context rather than automatic disqualification.
- **Defense-in-Depth Security:**
  - HTTP-only `HS256` JWT session cookies + `bcrypt` (cost factor 12, 72-byte UTF-8 boundary guard) + 256-bit single-use SHA-256 activation tokens.
  - Session-bound HMAC double-submit CSRF tokens (`sb_csrf_token` + `X-CSRF-Token`) using `crypto.timingSafeEqual`.
  - Candidate horizontal isolation + database-backed anti-IDOR ownership guards across goals, gap analyses, learning plans, learning plan items, and assessment submissions; vertical RBAC gates (`counselor` / `admin`) on directory and executive analytics.
  - Strict Content-Security-Policy (`script-src 'self'`, `script-src-attr 'none'`, `style-src-attr 'none'`, zero `'unsafe-inline'`), CORS + `Origin` validation, `.strict()` PostgreSQL-aligned Zod validation, XSS/prototype-pollution request sanitization, and fail-closed `415` rejection of unsupported multipart uploads.

---

## Architecture & Repository Layout

```text
.
├── backend/
│   ├── server.js                    # HTTP server bootstrap & graceful SIGTERM/SIGINT drain
│   ├── src/
│   │   ├── app.js                   # Express middleware pipeline, /portal static shell, /api mount
│   │   ├── config/                  # env.js (fail-fast production guard) & db.js (pg.Pool + ACID tx)
│   │   ├── constants/               # HTTP status codes & CHECK-aligned domain vocabularies
│   │   ├── controllers/             # Auth, User, Catalog, Goal, Learning, Assessment, Analytics
│   │   ├── errors/                  # AppError, ValidationError, NotFoundError
│   │   ├── middleware/              # Auth/RBAC/IDOR, CSRF, Helmet/CORS/Origin, Validate, ErrorHandler
│   │   ├── queries/                 # Parameterized PostgreSQL SQL across Domains 1–6
│   │   ├── routes/                  # API routers wired with auth, CSRF, ownership & Zod schemas
│   │   ├── services/                # Business logic & Phase 9 Multi-Factor Readiness Engine
│   │   ├── utils/                   # Request input sanitizer & safe URL/XSS guards
│   │   └── validators/              # Schema-aligned .strict() Zod schemas
│   ├── public/                      # 12-page SPA Portal (HTML5 + CSS3 + Vanilla JS)
│   ├── tests/
│   │   ├── unit/                    # Crypto, CSRF, error mapping, schema, XSS, IDOR, readiness, env tests
│   │   └── integration/             # Supertest + live PostgreSQL integration & zero-mutation tests
│   ├── .env.example                 # Environment template (copy to backend/.env locally)
│   └── package.json
├── migrations/                      # Staged SQL migrations (e.g., 002_auth_credentials.sql)
├── documentation/                   # System architecture, ER diagrams, DFD, API auth guide & reports
├── schema.sql                       # PostgreSQL DDL (22 normalized tables, CHECKs, FKs, 13 indexes)
├── sample_data.sql                  # Transactional sample data across IT, Healthcare, and Finance
├── test_queries.sql                 # 15 analytical & operational SQL queries (Q1–Q15)
├── integrity_checks.sql             # Read-only foreign key, constraint & cardinality verification suite
├── Dockerfile                       # Multi-stage Node 24 Alpine image (non-root USER node)
├── docker-compose.yml               # Isolated PostgreSQL + API orchestration (explicit secrets required)
├── DEPLOYMENT.md                    # Production environment, TLS proxy & pg_dump/pg_restore runbook
└── normalization.md                 # 1NF, 2NF, and 3NF proof
```

---

## Database Architecture (22 Tables, 3NF)

1. **User Profile Layer:** `users`, `education_records`, `user_skills`, `user_experiences`, `user_certifications`, `career_breaks`
2. **Career & Requirements Catalog:** `career_fields`, `career_roles`, `skills`, `qualification_types`, `certifications`, `career_goals`, `career_requirements`
3. **Gap Analysis Layer:** `gap_types`, `career_gap_analyses`, `career_gap_items`
4. **Learning & Improvement Layer:** `learning_resources`, `resource_skills`, `learning_plans`, `learning_plan_items`
5. **Assessment Layer:** `assessments`, `assessment_results`

Privacy by design: excludes government ID numbers and medical records, and links polymorphic role requirements safely via `chk_career_req_exclusive_fks`.

---

## Local Installation & Quick Start

### Prerequisites
- **Node.js** `>= 20.0.0` (tested on Node 24)
- **PostgreSQL** `>= 15` (tested on PostgreSQL 18.6; Docker image uses PostgreSQL 17 Alpine)

### 1. Initialize PostgreSQL Database
```bash
createdb -U postgres skillbridge_db
psql -U postgres -d skillbridge_db -f schema.sql
psql -U postgres -d skillbridge_db -f sample_data.sql
```
*(Optional verification queries: `psql -U postgres -d skillbridge_db -f test_queries.sql` and `psql -U postgres -d skillbridge_db -f integrity_checks.sql`)*

### 2. Configure Environment & Install Dependencies
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set PGPASSWORD, JWT_SECRET, CSRF_SECRET, and COOKIE_SECRET
npm --prefix backend install
```

Generate cryptographically strong secrets (`>= 32` characters) cleanly:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Run the Application
```bash
npm --prefix backend start
```

Open in your browser:
- **Portal Application:** `http://localhost:5000/portal` (`/candidate` and `/counselor` redirect to `/portal`)
- **Health Check:** `http://localhost:5000/api/health`

---

## Docker Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production environment variables, reverse-proxy TLS configuration, and `pg_dump` / `pg_restore` backup operations.

```bash
# Supply PGPASSWORD, CORS_ORIGIN, JWT_SECRET, CSRF_SECRET, and COOKIE_SECRET via environment or external .env
docker compose up --build -d
```

---

## Testing & Verification

```bash
# Run complete unit + live PostgreSQL integration test suite
npm --prefix backend run test

# Run unit tests only (in-memory, no live PostgreSQL required)
npm --prefix backend run test:unit

# Run zero-mutation database integrity audit (verifies 22 tables & 157 baseline rows)
npm --prefix backend run test:audit
```
