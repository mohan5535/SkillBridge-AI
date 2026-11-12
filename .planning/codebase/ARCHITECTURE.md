# System & Database Architecture — SkillBridge AI

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Target Environment:** Local / Server Database Host  
**Analysis Date:** 2026-11-10  

---

## 1. Five-Tier Relational Architecture

The 22 tables of `skillbridge_db` are organized into five cohesive functional layers designed to decouple candidate identity from evolving industry standards and learning resources:

```
+--------------------------------------------------------------------------+
|                        1. USER PROFILE LAYER                             |
|  users  |  education_records  |  user_skills  |  user_experiences       |
|  user_certifications  |  career_breaks                                   |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                   2. CAREER & REQUIREMENTS CATALOG                       |
|  career_fields  |  career_roles  |  skills  |  qualification_types       |
|  certifications |  career_goals  |  career_requirements                 |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                          3. GAP ANALYSIS LAYER                           |
|  gap_types  |  career_gap_analyses  |  career_gap_items                  |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                   4. LEARNING & IMPROVEMENT LAYER                        |
|  learning_resources  |  resource_skills  |  learning_plans                |
|  learning_plan_items                                                     |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                           5. ASSESSMENT LAYER                            |
|  assessments  |  assessment_results                                      |
+--------------------------------------------------------------------------+
```

---

## 2. Core Architectural Invariants

### 2.1 Universal Extensibility (Zero Hardcoding)
* Neither roles, skills, qualification tiers, nor certification bodies are hardcoded as table schemas or SQL `ENUM` types.
* All professional sectors (IT, Healthcare, Finance, Teaching, Skilled Trades) are managed as records within generic catalog entities (`career_fields`, `career_roles`, `skills`, `qualification_types`).
* Adding a new career sector requires only `INSERT` statements, with zero DDL migrations.

### 2.2 Polymorphic Career Requirements
The `career_requirements` table models diverse qualification requirements (skills, degrees, certifications, experience thresholds) under a unified entity through mutually exclusive foreign keys:
```sql
CHECK (
    (requirement_type = 'skill'         AND skill_id IS NOT NULL AND qualification_type_id IS NULL AND certification_id IS NULL) OR
    (requirement_type = 'education'     AND qualification_type_id IS NOT NULL AND skill_id IS NULL AND certification_id IS NULL) OR
    (requirement_type = 'certification' AND certification_id IS NOT NULL AND skill_id IS NULL AND qualification_type_id IS NULL) OR
    (requirement_type IN ('experience', 'eligibility', 'other') AND skill_id IS NULL AND qualification_type_id IS NULL AND certification_id IS NULL)
)
```

### 2.3 Ethical Career Break Tracking
* The `career_breaks` table records career pauses neutrally (reasons: `parental_leave`, `health`, `caregiving`, `education`, `travel`, `personal`, `layoff`, `career_change`, `other`).
* Career breaks are treated as informational context for human counselors and gap analysis, completely preventing automated algorithmic disqualification.

### 2.4 Multi-CTE Analytical Architecture (Zero Cartesian Row Explosion)
* To prevent Cartesian product inflation when joining multiple 1-to-many child tables (e.g. gap items and learning tasks), reporting queries (such as Query 15) isolate aggregations into independent Common Table Expressions (CTEs) before performing the final join to the parent `users` and `career_goals` records.

---

## 3. Database Normalization (3NF / BCNF)

* **1NF:** Every column holds strictly atomic values. Comma-separated lists of skills or certifications are eliminated through junction tables (`user_skills`, `user_certifications`).
* **2NF:** In composite-key junction tables, all non-key attributes (`proficiency_level`, `years_of_experience`, `date_obtained`) depend on the full composite key. Single-column surrogate keys satisfy 2NF trivially.
* **3NF:** Transitive dependencies are removed. Educational rank hierarchy resides in `qualification_types`, and domain classifications reside in `career_fields`.

