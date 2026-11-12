# Code Conventions & Database Standards — SkillBridge AI

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Target Environment:** Local / Server Database Host  
**Analysis Date:** 2026-11-10  

---

## 1. Relational Naming Standards

### 1.1 Tables
* **Format:** `snake_case`, pluralized nouns (e.g., `users`, `career_roles`, `career_gap_items`, `learning_plan_items`).
* **Associative / Junction Tables:** Named after the composite relationship: `<entity1>_<entity2_plural>` (e.g., `user_skills`, `resource_skills`, `user_certifications`).
* **Lookup / Catalog Tables:** Prefixed with semantic domain (e.g., `qualification_types`, `gap_types`, `career_fields`).

### 1.2 Columns & Keys
* **Primary Keys:** Surrogate auto-incrementing integer named `<singular_table>_id` (e.g., `user_id`, `skill_id`, `analysis_id`).
* **Foreign Keys:** Named identically to the referenced primary key column (e.g., `user_id`, `role_id`, `resource_id`).
* **Booleans:** Prefixed with `is_` or `has_` or named with past tense states (e.g., `is_active`, `is_mandatory`, `passed`).
* **Timestamps:** Suffixed with `_at` (e.g., `created_at`, `updated_at`).
* **Dates:** Suffixed with `_date` (e.g., `start_date`, `end_date`, `target_date`, `analysis_date`, `last_used_date`).

### 1.3 Constraints & Indexes
* **Check Constraints:** Prefixed with `chk_` followed by table and purpose:
  `chk_<table_name>_<rule>` (e.g., `chk_career_req_polymorphic`, `chk_learning_plan_dates`, `chk_assessment_score_bounds`).
* **Unique Constraints:** Prefixed with `uq_` (e.g., `uq_users_email`, `uq_skills_name`, `uq_user_skills_user_skill`).
* **Indexes:** Prefixed with `idx_` followed by table and column:
  `idx_<table_name>_<column>` (e.g., `idx_assessments_skill`, `idx_career_goals_role`).

---

## 2. Standard Data Types

| Semantic Usage | PostgreSQL Data Type | Example Columns | Rationale |
| :--- | :--- | :--- | :--- |
| Surrogate ID | `SERIAL` (`integer`) | `user_id`, `goal_id`, `skill_id` | Standard 4-byte auto-increment sequence |
| Name / Title | `VARCHAR(100)` to `VARCHAR(300)` | `full_name`, `role_title`, `resource_name` | Prevents arbitrary string allocation |
| Long Text / Notes | `TEXT` | `description`, `notes`, `summary_notes` | Variable length text without truncation |
| Fractional Quantities | `NUMERIC(4,1)` | `experience_years_required`, `years_of_experience` | Exact decimal precision (e.g., 2.5 years) |
| Durations | `NUMERIC(6,1)` | `estimated_duration_hours` | Decimal hours (e.g., 45.5 hours) |
| Financial Costs | `NUMERIC(10,2)` | `cost` | Accurate currency representation (e.g., 1499.00) |
| Scores & Percentages | `NUMERIC(5,2)` to `NUMERIC(7,2)` | `overall_readiness_pct`, `score`, `passing_score` | High precision scoring (e.g., 78.50%) |
| Calendar Dates | `DATE` | `start_date`, `end_date`, `date_of_birth` | Pure date without timezone overhead |
| Audit Timestamps | `TIMESTAMP WITH TIME ZONE` | `created_at`, `updated_at` | Timezone-aware audit logging |
| Logical Flags | `BOOLEAN` | `is_mandatory`, `is_active`, `passed` | Native binary flag |

---

## 3. SQL Query Authoring Standards

* **Explicit Aliases:** Every joined table must utilize an intuitive table alias (e.g., `users u`, `career_roles cr`, `career_requirements creq`).
* **Isolated CTE Pattern:** Multi-table aggregations must be computed in independent Common Table Expressions (CTEs) before outer joins to avoid Cartesian inflation.
* **Safe NULL Handling:** Outer joins must wrap nullable aggregate metrics in `COALESCE(SUM(...), 0)` and string displays in `COALESCE(col, 'Default')`.
* **Latest Snapshot Scoping:** Time-series tables must utilize `DISTINCT ON (user_id, goal_id) ... ORDER BY user_id, goal_id, analysis_date DESC` before filtering metrics.

