# System Requirements Specification — SkillBridge AI

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Milestone:** Milestone 1 — Core Database Architecture & Integrity Validation  
**Last Updated:** 2026-11-10  

---

## 1. Functional Requirements

* **FR-01 (Candidate Profile Management):** The system must maintain candidate identity, contact information, geographic location, educational history, acquired skills, certifications, and employment history.
* **FR-02 (Career Break Recording):** The system must capture career pauses including start date, end date, reason, and descriptive context without triggering profile disqualification.
* **FR-03 (Dynamic Catalog Definition):** Administrators must be able to define career fields, roles, skills, and qualifications dynamically via SQL `INSERT` statements without altering table structures.
* **FR-04 (Polymorphic Career Requirements):** The system must support polymorphic requirements in `career_requirements` enforcing mutual exclusivity across skills, qualifications, and certifications.
* **FR-05 (Automated Gap Analysis & Readiness Scoring):** The system must compare a candidate's current background against target role requirements and compute an overall readiness percentage (0.00% to 100.00%).
* **FR-06 (Actionable Learning Roadmaps):** The system must generate sequenced learning plan items linked to verified learning resources to resolve specific identified gaps.
* **FR-07 (Assessment Scoring & Pass/Fail Tracking):** The system must record assessment attempts, scores, and pass/fail flags, ensuring scores do not exceed maximum assessment thresholds.
* **FR-08 (Skill Growth & Retake Detection):** The system must identify score improvements across repeated attempts on the same assessment to document candidate growth.
* **FR-09 (Executive Dashboard Reporting):** The system must produce aggregated executive dashboards summarizing candidates, target roles, readiness scores, gaps, and task milestones without Cartesian row multiplication.
* **FR-10 (Sequence Synchronization):** All SERIAL sequences must remain synchronized with table `MAX(id)` values to prevent primary key collision upon subsequent inserts.

---

## 2. Non-Functional Requirements

* **NFR-01 (ACID Compliance):** All database operations must strictly preserve Atomicity, Consistency, Isolation, and Durability.
* **NFR-02 (100% Referential Integrity):** Zero orphan child records across all 32 foreign-key relationships.
* **NFR-03 (Performance & Query Efficiency):** Analytical queries must execute in under 15ms on sample datasets and maintain sub-second latency with index coverage.
* **NFR-04 (Privacy by Design & Data Minimization):** Sensitive government identifiers (such as Aadhaar or SSN) and medical diagnostics are strictly excluded.
* **NFR-05 (Encoding Fidelity):** All database interactions and scripts must enforce UTF-8 character encoding to eliminate mojibake defect risks.

---

## 3. Data Integrity Invariants & Constraints

| Invariant Class | Scope | Enforcement Mechanism | Verification Status |
| :--- | :--- | :--- | :---: |
| Primary Key Uniqueness | All 22 tables | `SERIAL PRIMARY KEY` | 22/22 Defined (PASS) |
| Foreign Key Integrity | 32 relationships | Foreign key constraints (`ON DELETE CASCADE/SET NULL`) | 0 Orphans (PASS) |
| Chronological Ordering | 5 date-pair tables | `CHECK (end_date >= start_date)` | 0 Inversions (PASS) |
| Polymorphic Exclusivity | `career_requirements` | `chk_career_req_polymorphic` | 27/27 Valid (PASS) |
| Domain Vocabularies | 14 status/enum columns | Table-level `CHECK (col IN (...))` | 0 Invalid (PASS) |
| Scoring Boundaries | Assessments & Results | `CHECK (score >= 0 AND score <= max_score)` | 5/5 Valid (PASS) |
| Sequence Health | All 22 sequences | `pg_sequences.last_value >= MAX(id)` | 22/22 In-Sync (PASS) |

