# SkillBridge AI — Database Audit Report

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Database:** `skillbridge_db` (PostgreSQL 18.6 x86_64)  
**Database Backup Archive:** `skillbridge_backup.dump` (PostgreSQL Custom Format 1.16-0, dumped 2026-11-01 11:05:35)  
**Lead Engineers:** Senior PostgreSQL Database Engineer, QA Engineer, Application Security Specialist  
**Audit Date:** 2026-11-01  
**Status:** Audit Complete — Verified Ground Truth  

---

## 1. Executive Summary

A comprehensive multi-disciplinary audit of the **SkillBridge AI — Universal Career Gap Tracker** database was conducted across the production schema DDL, the database backup archive (`skillbridge_backup.dump`), seed data (`sample_data.sql`), test queries (`test_queries.sql`), and existing integrity verification suites.

### Key Audit Conclusions:
1. **Core Relational Structure is Sound**: All **22 relational tables** are defined in 3NF/BCNF. All 22 tables possess primary keys, composite unique business constraints, and valid foreign key definitions.
2. **Data Consistency is 100% Intact**: The committed seed dataset consists of exactly **174 records**. Zero foreign-key orphans, zero date-logic inversions, zero out-of-range scores, zero invalid pass/fail flags, and zero polymorphic constraint violations exist in the actual database backup.
3. **Previous Audit Script Defect Identified**: Prior integrity verification scripts (`integrity_checks.sql` and `encoding_audit_and_fix.sql`) failed because they assumed hypothetical column names and status vocabularies that did not match the real PostgreSQL schema.
4. **17 Foreign Key Columns Lack Covering Indexes**: While foreign keys referencing `user_id` are indexed, 17 foreign keys referencing secondary parent tables (`skills`, `career_roles`, `career_goals`, `certifications`, `qualification_types`, `gap_types`) lack single-column covering indexes, risking sequential scans during parent deletions or joins.
5. **Analytical Query Improvements Applied**: Test queries (specifically Queries 1, 4, 8, 9, 11) have been refined in `corrected_test_queries.sql` to prevent unintentional omission of users with missing optional data, eliminate possible row duplication from historical analysis snapshots, and ensure clean zero-handling.

---

## 2. Schema Ground Truth Verification

The table below confirms the actual column names in `skillbridge_db` and `skillbridge_backup.dump` versus the assumptions made by earlier tooling:

| Table | Actual Schema Column (Ground Truth) | Hypothetical / Flawed Column Name | Data Type & Constraint | Status |
| :--- | :--- | :--- | :--- | :--- |
| `user_certifications` | `date_obtained` | `issue_date` | `date NULL` | **VERIFIED** |
| `career_gap_items` | `gap_severity` | `severity` | `varchar(20) NOT NULL` (low, medium, high, critical) | **VERIFIED** |
| `career_gap_items` | `required_state` | `desired_state` | `text NULL` | **VERIFIED** |
| `career_roles` | `experience_years_required` | `min_experience_years` | `numeric(4,1) NULL CHECK (>= 0)` | **VERIFIED** |
| `user_skills` | `years_of_experience` | `years_experience` | `numeric(4,1) NULL CHECK (>= 0)` | **VERIFIED** |
| `learning_resources` | `estimated_duration_hours` | `duration_hours` | `numeric(6,1) NULL CHECK (> 0)` | **VERIFIED** |
| `learning_resources` | `cost` | `cost_inr` | `numeric(10,2) NULL CHECK (>= 0)` | **VERIFIED** |
| `learning_resources` | `resource_name` | `title` | `varchar(300) NOT NULL` | **VERIFIED** |
| `qualification_types` | `type_name` | `qualification_name` | `varchar(100) NOT NULL UNIQUE` | **VERIFIED** |
| `assessment_results` | `score` | `score_achieved` | `numeric(7,2) NULL CHECK (>= 0)` | **VERIFIED** |
| `assessment_results` | `notes` | `feedback` | `text NULL` | **VERIFIED** |
| `gap_types` | `type_name` | `gap_type_name` / `type_code` | `varchar(100) NOT NULL UNIQUE` | **VERIFIED** |

---

## 3. Detailed Audit Findings

```
================================================================================
SEVERITY MATRIX
--------------------------------------------------------------------------------
CRITICAL : Immediate system outage, data corruption, or severe security breach.
HIGH     : Functional failure, broken constraints, or major query errors.
MEDIUM   : Performance degradation, missing indexes, or edge-case query omission.
LOW      : Minor display artifacts, cosmetic naming, or advisory warnings.
================================================================================
```

### Finding 1: 17 Foreign Key Columns Lack Covering Indexes
* **Severity**: `MEDIUM`
* **Affected Objects**:
  - `assessments.skill_id` $\rightarrow$ `skills`
  - `career_goals.role_id` $\rightarrow$ `career_roles`
  - `career_requirements.certification_id` $\rightarrow$ `certifications`
  - `career_requirements.qualification_type_id` $\rightarrow$ `qualification_types`
  - `career_requirements.skill_id` $\rightarrow$ `skills`
  - `education_records.qualification_type_id` $\rightarrow$ `qualification_types`
  - `career_gap_analyses.goal_id` $\rightarrow$ `career_goals`
  - `career_gap_items.requirement_id` $\rightarrow$ `career_requirements`
  - `career_gap_items.gap_type_id` $\rightarrow$ `gap_types`
  - `learning_plans.goal_id` $\rightarrow$ `career_goals`
  - `learning_plan_items.gap_item_id` $\rightarrow$ `career_gap_items`
  - `learning_plan_items.resource_id` $\rightarrow$ `learning_resources`
  - `resource_skills.skill_id` $\rightarrow$ `skills`
  - `assessment_results.assessment_id` $\rightarrow$ `assessments`
  - `user_certifications.certification_id` $\rightarrow$ `certifications`
  - `user_experiences.field_id` $\rightarrow$ `career_fields`
  - `user_skills.skill_id` $\rightarrow$ `skills`
* **Root Cause**: PostgreSQL enforces foreign key constraints via internal triggers, but it does **not** automatically create indexes on referencing columns. While primary keys and unique constraints automatically receive indexes, foreign keys referencing secondary parents lack indexes unless explicitly created.
* **Impact**: Updates or deletes on parent tables (e.g., updating a `skill_id` or deleting a test `qualification_type`) require full table scans of the referencing child tables, creating lock contention and slow execution. Joins on these columns perform Hash/Merge joins rather than Index Scans.
* **Recommended Fix**: Apply migration `001_add_fk_covering_indexes.sql` to add non-blocking B-tree covering indexes on these columns.
* **Verification**: Query `pg_index` and `pg_constraint` before and after migration.

---

### Finding 2: Previous Audit Scripts Contained Invalid Column References & Assumed Vocabularies
* **Severity**: `HIGH` (Tooling Defect)
* **Affected Files**: `integrity_checks.sql`, `encoding_audit_and_fix.sql`
* **Root Cause**: Scripts were generated without inspecting `dump_schema.sql` or `pg_attribute`, resulting in calls to non-existent columns (`min_experience_years`, `years_experience`, `issue_date`, `duration_hours`, `cost_inr`, `score_achieved`, `desired_state`, `feedback`, `title`) and checking vocabularies against incorrect domains (e.g. checking `priority` as varchar `'high'/'medium'` when defined as `smallint CHECK (priority BETWEEN 1 AND 5)`).
* **Impact**: Running the legacy `integrity_checks.sql` resulted in runtime SQL syntax errors (`column does not exist`), falsely giving the impression that the database was corrupted when in fact the test script itself was malformed.
* **Recommended Fix**: Replace `integrity_checks.sql` with `database_integrity_checks.sql`, which strictly queries verified schema columns and check constraints.
* **Verification**: Execute `database_integrity_checks.sql` against the database; verify that all 13 check sections run cleanly with 0 syntax errors.

---

### Finding 3: Test Queries Unintentionally Excluded Users with Missing Optional Data
* **Severity**: `MEDIUM`
* **Affected Queries**: `test_queries.sql` (Query 1 and Query 11)
* **Root Cause**:
  - In **Query 1**, an `INNER JOIN education_records` excluded any user who had not yet recorded their formal education.
  - In **Query 11**, an `INNER JOIN learning_plans` and `INNER JOIN learning_plan_items` excluded any registered user who had not yet generated or started a learning plan.
* **Impact**: Executive reports on learning task progress or educational backgrounds under-counted registered users, giving a skewed view of organizational readiness.
* **Recommended Fix**: Refactor Query 1 and Query 11 to use `LEFT JOIN` and `COALESCE` in `corrected_test_queries.sql`, ensuring all users appear with `0 tasks` and clean `0.0%` completion metrics.
* **Verification**: Tested against SQLite/Postgres in-memory harness; confirmed all users are preserved in output rosters.

---

### Finding 4: Career Break Query Lacked Latest-Snapshot Scoping
* **Severity**: `MEDIUM`
* **Affected Query**: `test_queries.sql` (Query 9)
* **Root Cause**: Query 9 joined `career_breaks` to `career_gap_analyses` via a direct `LEFT JOIN career_gap_analyses cga ON u.user_id = cga.user_id`. If a user with a career break undergoes periodic gap evaluations (e.g., monthly re-evaluations), the query returns multiple duplicate rows for the same career break.
* **Recommended Fix**: Isolate the gap analysis join in Query 9 using a `latest_user_analysis` CTE with `DISTINCT ON (user_id) ... ORDER BY user_id, analysis_date DESC`.
* **Verification**: Tested in `corrected_test_queries.sql`; verified that exactly 1 row per career break is returned, reflecting the user's most current readiness percentage.

---

### Finding 5: Windows Console OEM Code Page 850 Mojibake Display Artifact
* **Severity**: `LOW` (Client Display Artifact)
* **Affected Data**: 16 text fields containing Unicode em-dashes (`—`) or en-dashes (`–`).
* **Root Cause**: The PostgreSQL database and SQL source files store clean UTF-8 (`0xE2 0x80 0x94` and `0xE2 0x80 0x93`). Windows Command Prompt (`cmd.exe`) defaults to code page 850 or 437. When `psql` outputs the 3-byte sequence for `—`, OEM 850 renders the individual bytes as `Ô` (`0xE2`), `Ç` (`0x80`), and `ö` (`0x94`), displaying `ÔÇö`.
* **Impact**: Text appears visually corrupted in the console, although the database bytes are 100% valid.
* **Recommended Fix**:
  1. Execute `chcp 65001` in CMD prior to launching `psql`.
  2. Use `corrected_test_queries.sql` which enforces `SET client_encoding = 'UTF8';`.
* **Verification**: Verified using `pg_restore` byte analysis: no literal `ÔÇö` bytes exist in `skillbridge_backup.dump`.

---

### Finding 6: Identity and SERIAL Sequence Health
* **Severity**: `LOW` (Informational / Healthy)
* **Affected Objects**: All 22 PostgreSQL sequences (`users_user_id_seq`, etc.)
* **Audit Finding**: Every sequence's `last_value` exactly equals the `MAX(id)` of its corresponding table, with `is_called = true`.
* **Status**: **PASS** — Next `INSERT` without an explicit ID will safely assign `max(id) + 1` with zero primary key collisions.

---

## 4. Application Security & SQL Injection Assessment

1. **Test Queries Safety**: All queries in `test_queries.sql` and `corrected_test_queries.sql` are strictly read-only `SELECT` statements with no dynamic SQL construction (`EXECUTE`, `eval`) or concatenated string parameters.
2. **Parameterized Interface Recommendation**: When integrating with backend APIs (e.g. Node.js `pg`, Python `asyncpg` / `psycopg3`), all user input (e.g. `user_id`, `role_title`, `goal_id`) must be passed as parameterized positional variables (`$1`, `$2`), never through string interpolation.
3. **Role-Based Access Control (RBAC)**:
   - Analytical reporting queries should execute under a read-only role (`GRANT SELECT ON ALL TABLES IN SCHEMA public TO skillbridge_readonly;`).
   - Write operations (profile updates, assessment submissions) should be restricted to authenticated application connection pools.

---

## 5. Summary Audit Matrix

| Audit Area | Scope | Violations Found | Health Status |
| :--- | :--- | :---: | :---: |
| Table Inventory | 22 Base Tables | 0 missing | **PASS (100%)** |
| Primary Keys | 22 Primary Key constraints | 0 missing | **PASS (100%)** |
| Foreign Key Orphans | 32 Distinct Relationships | 0 orphans | **PASS (100%)** |
| Composite Unique Rules | 10 Junction / Identity constraints | 0 duplicates | **PASS (100%)** |
| Date Logical Boundaries | 5 Date range check constraints | 0 inversions | **PASS (100%)** |
| Status & Vocabulary Domains | 17 Status/Enum columns | 0 invalid | **PASS (100%)** |
| Polymorphic Exclusive FKs | `career_requirements` exclusivity | 0 violations | **PASS (100%)** |
| Scoring & Numeric Bounds | Assessments & Analyses | 0 out-of-range | **PASS (100%)** |
| Cross-Entity Ownership | User / Goal / Plan / Analysis chains | 0 mismatches | **PASS (100%)** |
| Sequence Positions | 22 SERIAL sequences | 0 desyncs | **PASS (100%)** |
| Index Coverage | 32 Foreign Key columns | 17 unindexed | **FIX AVAILABLE (Migration 001)** |

