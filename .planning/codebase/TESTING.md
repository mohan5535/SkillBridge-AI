# Testing Strategy & Test Suites — SkillBridge AI

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Target Environment:** Local / Server Database Host  
**Analysis Date:** 2026-11-10  

---

## 1. Testing Methodology Overview

Testing in SkillBridge AI is organized into three complementary validation levels:
1. **Automated Static & Constraint Verification:** Static DDL analysis ensuring valid types, constraints, and sequences.
2. **Comprehensive Relational Integrity Auditing (`database_integrity_checks.sql`):** 13 technical audit sections verifying foreign keys, date boundaries, domain vocabularies, polymorphic rules, and sequence synchronizations.
3. **Analytical & Reporting SQL Query Execution (`test_queries.sql`):** 15 complex business queries validating reporting capabilities against committed personas.

---

## 2. Suite 1: Database Integrity Audit (13 Checks)

| Check ID | Verification Category | Verification Query / Logic | Audit Outcome | Status |
| :---: | :--- | :--- | :---: | :---: |
| **Check 1** | Table Inventory & Row Counts | Exact row count across all 22 tables | Exactly 174 rows counted | **PASS** |
| **Check 2** | Primary Key Definitions | Check `information_schema.table_constraints` | 22/22 Primary Keys defined | **PASS** |
| **Check 3** | Foreign Key Orphan Audit | 32 Anti-joins (`LEFT JOIN ... WHERE parent IS NULL`) | 0 orphan records detected | **PASS** |
| **Check 4** | Unique Constraints Integrity | Verify unique keys on users, roles, skills, types | 0 duplicate key violations | **PASS** |
| **Check 5** | NOT NULL Constraint Audit | Scan mandatory business columns for unexpected NULLs | 0 NULL violations detected | **PASS** |
| **Check 6** | Date Range Logical Boundaries | Verify `end_date >= start_date` across 5 date pairs | 0 chronological inversions | **PASS** |
| **Check 7** | Status & Domain Vocabularies | Validate 14 status/enum columns against CHECK rules | 0 out-of-domain values | **PASS** |
| **Check 8** | Polymorphic Exclusivity Audit | Validate 27 rows in `career_requirements` | 27/27 rows mutually exclusive | **PASS** |
| **Check 9** | Numeric & Scoring Bounds | Duration > 0, cost >= 0, score <= max_score | 0 boundary violations | **PASS** |
| **Check 10** | Cross-Entity Business Logic | User-Goal-Plan alignment across 4 relational chains | 0 cross-entity discrepancies | **PASS** |
| **Check 11** | SERIAL Sequence Health Audit | Compare `pg_sequences.last_value` vs `MAX(id)` | 22/22 sequences in sync | **PASS\*** |
| **Check 12** | Unindexed Foreign Keys Audit | Inspect `pg_index` for leading FK column coverage | 17 unindexed FKs identified | **AUDITED** |
| **Check 13** | Master System Integrity Rollup | Global multi-category defect rollup | **0 Defects (PERFECT HEALTH)** | **PASS** |

---

## 3. Suite 2: Analytical SQL Reporting Queries (15 Queries)

| Query ID | Business Purpose | Target Input / Scope | Actual Output Data | Status |
| :---: | :--- | :--- | :--- | :---: |
| **Q1** | User Education Profiles | All users | 6 rows returned (Priya: 2, Rahul: 2, Ananya: 2). LEFT JOIN preserves all. | **PASS** |
| **Q2** | User Skills Profile | All users | 14 rows returned mapping proficiency levels and experience years. | **PASS** |
| **Q3** | Work Experience History | All users | 4 rows returned across IT, Healthcare, and Finance sectors. | **PASS** |
| **Q4** | Career Roles Catalog | All roles | 5 roles returned; mandatory and optional counts tallied with `COALESCE`. | **PASS** |
| **Q5** | Specific Role Requirements | Role #1 (Full-Stack Dev) | 6 requirements: 3 skills (React, Python, TypeScript), 1 edu, 1 cert, 1 exp. | **PASS** |
| **Q6** | User Gap Analysis | User #1 (Priya Sharma) | 3 gap items returned (TypeScript skill gap, degree equivalence, cert). | **PASS** |
| **Q7** | At-Risk Users (< 60%) | Latest snapshot | 2 users: **Ananya Desai** (42.00%) & **Priya Sharma** (55.00%). Scoped via DISTINCT ON. | **PASS** |
| **Q8** | Target Role Skill Match | User #1 vs Goal #1 | Verified: **Python: MET** \| **React: NOT MET** \| **SQL: MET**. | **PASS** |
| **Q9** | Career Breaks & Readiness | Break analysis | 1 row: **Rahul Verma** (12-month health break, Registered Nurse, 70.00% ready). | **PASS** |
| **Q10** | User Learning Plan Tasks | User #1 roadmap | 3 roadmap tasks returned for Priya Sharma with mapped resources and due dates. | **PASS** |
| **Q11** | Task Completion Summary | User task progress | 3 rows: Priya (33.3%), Rahul (50.0%), Ananya (0.0%). Zero users omitted. | **PASS** |
| **Q12** | Role-Aligned Resources | Cloud Architect role | 1 row: AWS Solutions Architect Prep mapped to Cloud Architect requirements. | **PASS** |
| **Q13** | Assessment History | User #1 scores | 2 rows: React Quiz (52/100, **FAIL**) and SQL Test (78/100, **PASS**). | **PASS** |
| **Q14** | Growth / Retest Detection | User assessment retakes | 1 row: **Rahul Verma** (Pharmacology: 24/50 FAIL $\rightarrow$ 38/50 PASS). | **PASS** |
| **Q15** | Executive Dashboard | Multi-user rollup | 3 rows: Isolated CTEs aggregate metrics with zero Cartesian row inflation. | **PASS** |

---

## 4. Execution Commands for Live Testing

To execute both test suites natively on Windows against `skillbridge_db`:
```cmd
cd /d "C:\Users\Mohan\OneDrive\Desktop\Intership\New folder"
chcp 65001
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d skillbridge_db -f database_integrity_checks.sql
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d skillbridge_db -f test_queries.sql
```

