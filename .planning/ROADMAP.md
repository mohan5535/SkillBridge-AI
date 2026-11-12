# Project Roadmap — SkillBridge AI

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Current Milestone:** Milestone 1 — Core Relational Database Architecture & Integrity Validation  
**Overall Status:** Milestone 1 Complete (100%) — Ready for Milestone 2  

---

## Milestone 1: Core Relational Database Architecture & Integrity Validation (COMPLETED)

* [x] **Phase 1 — Project Inventory & Safety Baseline**
  * Verified all core files (`schema.sql`, `sample_data.sql`, `test_queries.sql`, `er-diagram.dbml`, `normalization.md`, `README.md`).
  * Created pristine baseline backups (`backup_before_validation/`, `backup_20261031_phase3/`, `backup_phase6_pre_fix/`).
  * Preserved `skillbridge_backup.dump` (104,893 bytes, 22 tables, 157 committed records).

* [x] **Phase 2 — DDL Schema & Constraint Hardening**
  * Hardened mutually exclusive polymorphic foreign-key constraints in `career_requirements`.
  * Corrected date boundary ordering constraints in `learning_plans` (`target_completion_date >= start_date`).
  * Preserved all 22 Third Normal Form (3NF) relational tables.

* [x] **Phase 3 — Character Encoding & Mojibake Diagnostics**
  * Created and verified `encoding_audit_and_fix.sql`.
  * Verified raw byte/hex values for Unicode em-dashes (`—` U+2014) and en-dashes (`–` U+2013).
  * Documented Windows terminal `chcp 65001` and `SET client_encoding = 'UTF8'` standards.

* [x] **Phase 4 — Analytical Query Engine & CTE Optimization**
  * Remediated Queries 1, 4, 7, 8, 9, 11, and 15 in `test_queries.sql`.
  * Implemented isolated CTE architecture in Query 15, completely eliminating Cartesian row explosion.
  * Verified Query 8 side-by-side comparison (Python: MET, React: NOT MET, SQL: MET).

* [x] **Phase 5 — Database Integrity Audit & Check 11 Modernization**
  * Authored and executed 13-section technical integrity audit in `database_integrity_checks.sql`.
  * Modernized Check 11 to query `pg_sequences.last_value` vs `MAX(id)` using PostgreSQL 18-supported syntax.
  * Verified 32 foreign-key anti-joins (0 orphans) and all domain CHECK rules.

* [x] **Phase 6 — Academic Project Documentation & Architectural Diagrams**
  * Generated 31-section BCA University Project Report (`SkillBridge_AI_Project_Report.docx` and `.pdf`).
  * Generated dedicated Database Testing & QA Report (`SkillBridge_AI_Database_Testing_Report.docx` and `.pdf`).
  * Created 6 high-resolution (300 DPI) architectural diagrams (ERD, DFD Level 0, DFD Level 1, Use Case, Architecture, DB Map).

---

## Milestone 2: Backend API & Service Layer Implementation (PLANNED)

* [x] **Phase 7 — RESTful API Gateway & Object-Relational Mapping (ORM)**
  * Established Node.js 24 / Express application tier in `backend/` with native ES Modules (`"type": "module"`).
  * Mapped all 22 PostgreSQL tables across 6 cohesive REST domains with Zod schema validation.
  * Implemented connection pooling via `pg.Pool`, `withTransaction` ACID runner, and centralized SQLSTATE error mapping.
  * **Plans:** 4 plans
    - [x] `07-01-PLAN.md` — Foundation, PostgreSQL Connection Pooling, Error Hierarchy & Health Check Tracer
    - [x] `07-02-PLAN.md` — Domain 1 (User Profiles) & Domain 2 (Career Catalog & Polymorphic Requirements)
    - [x] `07-03-PLAN.md` — Domain 3 (Goals & Gap Matching), Domain 4 (Learning Roadmaps) & Domain 5 (Assessments)
    - [x] `07-04-PLAN.md` — Domain 6 (Executive Analytics CTEs), Security Hardening & Zero-Mutation Tests

* [x] **Phase 8 — Authentication, Authorization & User Session Security**
  * Candidate and Counselor authentication via JWT / HTTP-only cookies.
  * Role-Based Access Control (RBAC) separating candidate views from counselor administration.
  * **Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-12
  * **Plans:** 4 plans
    - [x] `08-01-PLAN.md` — Cryptographic Engine, Signed Double-Submit CSRF & Migration Audit
    - [x] `08-02-PLAN.md` — Candidate Registration, Anti-Takeover Token Activation & Cookie Sessions
    - [x] `08-03-PLAN.md` — Authentication & RBAC Middleware, Candidate Isolation & Analytics Protection
    - [x] `08-04-PLAN.md` — Counselor Provisioning CLI, 12 Security Test Scenarios & API Guide

* [x] **Phase 9 — Automated Gap Analysis & Learning Roadmap Service**
  * Business logic service implementing the multi-factor readiness percentage algorithm (Skills 40%, Experience 20%, Education 20%, Certifications 10%, Assessments 10%).
  * Automated roadmap sequencing mapping identified gap items to prioritized learning tasks.
  * Verified via 6 dedicated unit and integration tests (154 / 154 full suite pass).

* [ ] **Phase 10 — Covering Indexes Production Migration**
  * Formally apply `migrations/001_add_fk_covering_indexes.sql` to optimize foreign-key join performance.
  * Validate index usage via `EXPLAIN ANALYZE` on analytical queries.

---

## Milestone 3: Frontend User Experience & Deployment (COMPLETED IN MVP)

* [x] **Phase 11 — Candidate Career Tracker Web Application (Native SPA Portal)**
  * Single-Page Application mounted at `/portal` with responsive layout, real-time readiness gauge, and component scorecard.
  * Interactive modals for Profile Editing (`PUT /api/users/:id`), Skill Intake (`POST /api/users/:id/skills`), and Career Break Intake (`POST /api/users/:id/career-breaks`).
  * Query 8 Precision Skill Match matrix and automated learning roadmap timeline.

* [x] **Phase 12 — Career Counselor Cohort Portal**
  * Supervisory tier with Candidate Directory & Roster (`GET /api/users`).
  * Query 15 Multi-CTE Executive Dashboard, Query 7 At-Risk (<60%) Cohort, Query 9 Career Breaks, and Query 11 Task Velocity.
  * Interactive RBAC Boundary Security Tester demonstrating real-time enforcement of HTTP 403 `FORBIDDEN_ROLE`.

* [x] **Phase 13 — Production Deployment & Hardening**
  * Multi-stage production `Dockerfile` (Node.js 24 Alpine, curl healthcheck).
  * `docker-compose.yml` for unified database and API orchestration with dependency health checks.
  * Operations and deployment guide documented in `DEPLOYMENT.md`.
  * Comprehensive end-to-end verification report documented in `.planning/FINAL-MVP-VERIFICATION.md`.

