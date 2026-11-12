# Architectural Concerns & Technical Debt — SkillBridge AI

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Target Environment:** Local / Server Database Host  
**Analysis Date:** 2026-11-10  

---

## 1. Sequence Health Verification Scope (Caveat 1)

* **Finding:** Check 11 in `database_integrity_checks.sql` compares `pg_sequences.last_value` with `MAX(id)` for all 22 SERIAL sequences.
* **Scope & Limitation:** This is a **sequence synchronization check** that verifies sequences are not trailing committed records (preventing primary key collisions). It is **not** a complete validation of:
  * Sequence ownership (`SEQUENCE OWNED BY` catalog metadata).
  * Sequence increment steps or min/max parameters.
  * Internal `is_called` flag behavior across transactions.
  * Transactional concurrency or sequence allocation under multi-client loads.
* **Risk Level:** Low. Adequate for current single-instance and batch-insert workloads, but production deployment should introduce sequence ownership DDL audits.

---

## 2. 17 Unindexed Foreign Keys (Caveat 2)

* **Finding:** Check 12 identified 17 foreign-key columns across 13 child tables that lack covering indexes.
* **Affected Columns:**
  * `assessments(skill_id)`
  * `career_goals(role_id)`
  * `career_requirements(certification_id, qualification_type_id, skill_id)`
  * `education_records(qualification_type_id)`
  * `career_gap_analyses(goal_id)`
  * `career_gap_items(requirement_id, gap_type_id)`
  * `learning_plans(goal_id)`
  * `learning_plan_items(gap_item_id, resource_id)`
  * `resource_skills(skill_id)`
  * `assessment_results(assessment_id)`
  * `user_certifications(certification_id)`
  * `user_experiences(field_id)`
  * `user_skills(skill_id)`
* **Performance Impact:**
  * Child tables perform sequential table scans during joins.
  * When parent records are updated or deleted, PostgreSQL is forced to acquire share locks on entire child tables to verify referential integrity.
* **Status:** A migration script (`migrations/001_add_fk_covering_indexes.sql`) has been prepared. In accordance with safety rules, it remains **unapplied** pending formal deployment sign-off.
* **Risk Level:** Medium. High impact on query latency once child tables exceed 100,000 rows.

---

## 3. Terminal & Client Character Encoding Discrepancy

* **Finding:** Windows Command Prompt defaults to code pages 437 or 1252. Displaying UTF-8 characters (such as en-dashes `–` U+2013 and em-dashes `—` U+2014) causes mojibake (`ÔÇö` / `ÔÇô`).
* **Mitigation:**
  * Windows console must execute `chcp 65001`.
  * All SQL scripts enforce `SET client_encoding = 'UTF8'`.
  * Script `encoding_audit_and_fix.sql` provides hex-level byte verification proving underlying database data is clean UTF-8.

---

## 4. Single-Node Scalability & Connection Pooling

* **Finding:** The database is hosted on a single PostgreSQL 18 instance with default connection parameters.
* **Future Need:** Production workloads will require:
  * PgBouncer connection pooling to handle high-concurrency API client connections.
  * Read-replica architecture for offloading analytical reporting queries (such as Query 15).

---

## 5. Pending Application & UI Tier Implementation

* **Finding:** The workspace currently comprises the relational database architecture, DDL, sample datasets, integrity test suites, and academic documentation.
* **Status:** The backend RESTful API controllers and frontend user interfaces (Next.js / React) represent future implementation phases.

