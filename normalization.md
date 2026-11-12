# SkillBridge AI — Normalization Analysis

## What Is Normalization?

**Database normalization** is a step-by-step process of organizing a relational database so that data is stored **efficiently, consistently, and without unnecessary duplication**. Think of it like organizing a library: instead of writing the full author biography inside every single book, you keep one author card in a central catalog and simply reference it. Normalization follows the same idea — store each fact in **exactly one place** and link to it wherever it is needed.

Why does this matter? Without normalization, databases suffer from three classic problems called **anomalies**. An **update anomaly** means changing one fact (e.g., a skill's name) requires updating dozens of scattered copies — miss one and your data is inconsistent. A **deletion anomaly** means removing a record accidentally destroys unrelated information (e.g., deleting a user's only education record also loses the qualification type definition). An **insertion anomaly** means you cannot add new data without unrelated data already existing (e.g., you cannot define a new certification until at least one user earns it).

Normalization solves all three problems by breaking data into well-structured tables, each focused on **one subject**, and connecting them through **foreign keys**. The process is described in progressive levels called **Normal Forms**: First (1NF), Second (2NF), and Third (3NF). Each level builds on the previous one, adding stricter rules. Our SkillBridge AI database is designed to satisfy all three, which is considered the gold standard for most real-world applications.

---

## The Three Normal Forms

---

### First Normal Form (1NF)

> **Rule:** Every column must contain a **single, atomic (indivisible) value**. There must be no repeating groups, no arrays, and no comma-separated lists hiding inside a single cell.

#### How Our Database Satisfies 1NF

The most common 1NF violation in beginner designs is stuffing multiple values into one column — like cramming a whole grocery list into a single sticky note. Our schema avoids this by **creating separate tables** and linking them with foreign keys.

Here are concrete examples:

---

**Example 1 — User Skills**

| Approach | Design | Problem / Benefit |
|----------|--------|-------------------|
| ❌ **Bad** | `users` table has a column `skills TEXT` → `"Python, SQL, React, Communication"` | One cell holds multiple values. Searching for "SQL" requires string parsing. Adding or removing a skill means editing a long string. |
| ✅ **Good (Our Design)** | Separate `skills` table (skill catalog) + `user_skills` junction table linking `user_id` → `skill_id` | Each skill is its own row. Every column holds one atomic value. Easy to search, update, or delete individual skills. |

```
-- Our design: each user-skill is its own row with atomic values
user_skills
├── user_skill_id  = 1
├── user_id        = 42        ← one user
├── skill_id       = 7         ← one skill (e.g., "Python")
├── proficiency_level = 'intermediate'  ← one value
└── years_of_experience = 3.0  ← one value
```

---

**Example 2 — Certifications**

| Approach | Design | Problem / Benefit |
|----------|--------|-------------------|
| ❌ **Bad** | `users` table has a column `certifications TEXT` → `"AWS Solutions Architect (2024), CPA License (2023)"` | Dates, names, and statuses are all jammed into one string. Impossible to query "who has an expired cert?" |
| ✅ **Good (Our Design)** | Separate `certifications` table (catalog) + `user_certifications` junction table with individual columns for `date_obtained`, `expiry_date`, `status` | Each certification held by a user is its own row. Dates and status are separate, queryable columns. |

---

**Example 3 — Career Requirements**

| Approach | Design | Problem / Benefit |
|----------|--------|-------------------|
| ❌ **Bad** | `career_roles` table has a column `requirements TEXT` → `"Bachelor's degree in CS, 2 years experience, knows Python and SQL"` | A paragraph of mixed requirement types. Cannot compare against a user's profile programmatically. |
| ✅ **Good (Our Design)** | Separate `career_requirements` table where each requirement is its own row with typed columns: `requirement_type`, `skill_id`, `qualification_type_id`, `is_mandatory`, etc. | Each requirement is atomic and individually addressable. Gap analysis can compare one requirement at a time. |

---

**Example 4 — Education Records**

| Approach | Design | Problem / Benefit |
|----------|--------|-------------------|
| ❌ **Bad** | `users` table has a column `education TEXT` → `"B.Tech from IIT Delhi 2020, M.Tech from IISc 2022"` | Degree name, institution, and year are all mashed together. Cannot filter users by degree level. |
| ✅ **Good (Our Design)** | Separate `education_records` table with individual columns: `qualification_type_id`, `institution_name`, `field_of_study`, `start_date`, `end_date`, `status` | Each education record is its own row. Each attribute is in its own column. Fully queryable. |

---

✅ **Verdict: Our database satisfies 1NF.** Every column in every table contains exactly one atomic value. Multi-valued data is always handled through separate tables and foreign key relationships.

---

### Second Normal Form (2NF)

> **Rule:** The table must already be in 1NF, **AND** every non-key column must depend on the **entire** primary key — not just part of it.

#### When Does 2NF Matter?

2NF is specifically relevant for tables that have **composite keys** (primary keys made up of two or more columns). If a non-key column depends on only *part* of the composite key, it violates 2NF — this is called a **partial dependency**.

In our schema, the junction tables are the primary place where composite keys (or UNIQUE constraints acting as logical composite keys) appear. Let's analyze each one:

---

**Junction Table 1: `user_skills`**

| Column | Depends On |
|--------|------------|
| `proficiency_level` | Both `user_id` AND `skill_id` — a user's proficiency in *Python* may be different from their proficiency in *SQL*. You need both parts of the key. ✅ |
| `years_of_experience` | Both `user_id` AND `skill_id` — experience years are specific to one user's relationship with one skill. ✅ |
| `evidence` | Both `user_id` AND `skill_id` — evidence like "Built 3 React apps" is about *this user's* experience with *this skill*. ✅ |
| `last_used_date` | Both `user_id` AND `skill_id` — when *this user* last used *this particular skill*. ✅ |

> The `skill_name` is NOT stored in `user_skills` — it lives only in the `skills` table. If skill name were stored here, it would depend only on `skill_id` (partial dependency) → 2NF violation. Our design avoids this.

---

**Junction Table 2: `user_certifications`**

| Column | Depends On |
|--------|------------|
| `date_obtained` | Both `user_id` AND `certification_id` — when *this user* obtained *this certification*. ✅ |
| `expiry_date` | Both `user_id` AND `certification_id` — when *this user's* copy of *this cert* expires. ✅ |
| `credential_id` | Both `user_id` AND `certification_id` — a specific user's unique credential number. ✅ |
| `status` | Both `user_id` AND `certification_id` — whether *this user's* cert is active, expired, etc. ✅ |

> The `certification_name` and `issuing_body` are NOT stored in `user_certifications`. They live in the `certifications` table only. No partial dependency.

---

**Junction Table 3: `resource_skills`**

| Column | Depends On |
|--------|------------|
| `proficiency_taught` | Both `resource_id` AND `skill_id` — what level *this resource* teaches for *this skill*. A single course might teach Python to "intermediate" but SQL only to "beginner." ✅ |

> The `skill_name` is NOT stored here. The `resource_name` is NOT stored here. Both live in their respective parent tables.

---

**What About Tables with Single-Column Primary Keys?**

Tables like `users`, `skills`, `career_roles`, and `learning_resources` all use a single-column surrogate key (e.g., `user_id SERIAL PRIMARY KEY`). 2NF partial dependency violations **cannot occur** with single-column keys — if the key has only one part, every dependency on it is automatically a "full" dependency. So all of these tables satisfy 2NF trivially.

---

✅ **Verdict: Our database satisfies 2NF.** Every non-key attribute in every junction table depends on the **full** composite key, never on just a part. Tables with single-column primary keys satisfy 2NF automatically.

---

### Third Normal Form (3NF)

> **Rule:** The table must already be in 2NF, **AND** no non-key column can depend on another non-key column. Every non-key column must depend **directly** on the primary key — not through an intermediary. This eliminates **transitive dependencies**.

#### What Is a Transitive Dependency?

Imagine this chain: **Primary Key → Column A → Column B**. Column B doesn't depend directly on the PK — it depends on the PK *through* Column A. That's a transitive dependency, and it creates duplication: every time Column A appears, Column B gets repeated alongside it.

#### How Our Database Avoids Transitive Dependencies

---

**Example 1 — Qualification Types (Removing Transitive Dependency from `education_records`)**

| Approach | Design | Problem / Benefit |
|----------|--------|-------------------|
| ❌ **Bad** | `education_records` stores `qualification_name = "Bachelor's Degree"` and `level_rank = 5` | `level_rank` depends on `qualification_name`, not on `education_id`. If 50 users have a Bachelor's, `level_rank = 5` is stored 50 times. Change the rank? Update 50 rows. |
| ✅ **Good (Our Design)** | `education_records` stores only `qualification_type_id` (FK). The `type_name` and `level_rank` live in the `qualification_types` lookup table. | `level_rank` depends directly on `qualification_type_id` in its own table. Stored once. Updated once. Zero duplication. |

```
-- Transitive dependency ELIMINATED:
-- education_records.education_id → qualification_type_id → (type_name, level_rank)
-- Solution: qualification_types is its own table

qualification_types
├── qualification_type_id = 5
├── type_name  = "Bachelor's Degree"   ← stored ONCE
└── level_rank = 5                     ← stored ONCE
```

---

**Example 2 — Career Field Name Not Stored in `career_roles`**

| Approach | Design | Problem / Benefit |
|----------|--------|-------------------|
| ❌ **Bad** | `career_roles` stores `field_name = "Healthcare"` alongside `field_id` | `field_name` depends on `field_id`, not on `role_id`. If there are 20 Healthcare roles, "Healthcare" is stored 20 times. |
| ✅ **Good (Our Design)** | `career_roles` stores only `field_id` (FK). The `field_name` lives in `career_fields`. | The name "Healthcare" exists in exactly one row in `career_fields`. All 20 roles point to it via `field_id`. |

---

**Example 3 — Skill Name Not Duplicated in `user_skills` or `career_requirements`**

| Approach | Design | Problem / Benefit |
|----------|--------|-------------------|
| ❌ **Bad** | `user_skills` stores `skill_name = "Python"` alongside `skill_id` | `skill_name` depends on `skill_id`, not on the user-skill composite key. Renamed skill? Must update every user-skill row. |
| ✅ **Good (Our Design)** | `user_skills` and `career_requirements` store only `skill_id` (FK). The `skill_name` lives in the `skills` table. | "Python" is stored exactly once. All references use the foreign key. Renaming means updating one row. |

---

**Example 4 — Certification Details Not Duplicated in `user_certifications`**

| Approach | Design | Problem / Benefit |
|----------|--------|-------------------|
| ❌ **Bad** | `user_certifications` stores `certification_name = "AWS Solutions Architect"` and `issuing_body = "AWS"` alongside `certification_id` | Both `certification_name` and `issuing_body` depend on `certification_id`, not on the user-cert composite key. Massive duplication. |
| ✅ **Good (Our Design)** | `user_certifications` stores only `certification_id` (FK). Name and issuing body live in the `certifications` table. | Certification details stored once. No risk of inconsistency across user records. |

---

**Example 5 — Gap Type Name Not Stored in `career_gap_items`**

| Approach | Design | Problem / Benefit |
|----------|--------|-------------------|
| ❌ **Bad** | `career_gap_items` stores `gap_type_name = "Skill Gap"` alongside `gap_type_id` | `gap_type_name` depends on `gap_type_id`, not on `gap_item_id`. Renaming a gap type means updating every gap item row. |
| ✅ **Good (Our Design)** | `career_gap_items` stores only `gap_type_id` (FK). The `type_name` lives in the `gap_types` lookup table. | Gap type names stored once. Adding a new gap category = inserting one row. |

---

✅ **Verdict: Our database satisfies 3NF.** No non-key column depends on another non-key column. Every piece of descriptive data (names, ranks, descriptions) is stored in **exactly one table** and referenced elsewhere via foreign keys.

---

## Normalization Summary Table

| Normal Form | Rule | Status | Key Evidence |
|-------------|------|--------|--------------|
| **1NF** | Every column holds a single atomic value; no repeating groups | ✅ **Satisfied** | Skills, certifications, education, and requirements are each in separate tables — no comma-separated lists or arrays anywhere |
| **2NF** | Every non-key column depends on the **entire** primary key | ✅ **Satisfied** | Junction tables (`user_skills`, `user_certifications`, `resource_skills`) store only attributes that depend on the full composite key; parent-table names are never copied into junctions |
| **3NF** | No non-key column depends on another non-key column (no transitive dependencies) | ✅ **Satisfied** | Lookup tables (`qualification_types`, `gap_types`, `career_fields`, `skills`, `certifications`) eliminate transitive dependencies; descriptive data stored once and referenced via FK |

---

## Tables Quick Reference

Our database contains **22 tables** across 5 logical layers. Here is a summary of every table, its type, and its key relationships:

| # | Table Name | Type | Key Relationships |
|---|-----------|------|-------------------|
| 1 | `users` | Entity | Core table — referenced by most user-related tables |
| 2 | `career_fields` | Lookup / Entity | Referenced by `career_roles`, `certifications`, `user_experiences` |
| 3 | `skills` | Lookup / Entity | Referenced by `user_skills`, `career_requirements`, `resource_skills`, `assessments` |
| 4 | `qualification_types` | Lookup | Referenced by `education_records`, `career_requirements` |
| 5 | `career_roles` | Entity | FK → `career_fields`; referenced by `career_goals`, `career_requirements` |
| 6 | `certifications` | Lookup / Entity | FK → `career_fields`; referenced by `user_certifications`, `career_requirements` |
| 7 | `education_records` | Entity | FK → `users`, `qualification_types` |
| 8 | `user_skills` | **Junction** | FK → `users`, `skills` (many-to-many: users ↔ skills) |
| 9 | `user_experiences` | Entity | FK → `users`, `career_fields` |
| 10 | `user_certifications` | **Junction** | FK → `users`, `certifications` (many-to-many: users ↔ certifications) |
| 11 | `career_breaks` | Entity | FK → `users` |
| 12 | `career_goals` | Entity | FK → `users`, `career_roles` |
| 13 | `career_requirements` | Entity | FK → `career_roles`, `skills`, `qualification_types`, `certifications` |
| 14 | `gap_types` | Lookup | Referenced by `career_gap_items` |
| 15 | `career_gap_analyses` | Entity | FK → `users`, `career_goals` |
| 16 | `career_gap_items` | Entity | FK → `career_gap_analyses`, `gap_types`, `career_requirements` |
| 17 | `learning_resources` | Entity | Referenced by `resource_skills`, `learning_plan_items` |
| 18 | `resource_skills` | **Junction** | FK → `learning_resources`, `skills` (many-to-many: resources ↔ skills) |
| 19 | `learning_plans` | Entity | FK → `users`, `career_goals` |
| 20 | `learning_plan_items` | Entity | FK → `learning_plans`, `career_gap_items`, `learning_resources` |
| 21 | `assessments` | Entity | FK → `skills` |
| 22 | `assessment_results` | Entity | FK → `users`, `assessments` |

> **Table type legend:**
> - **Entity** — Stores core business objects (users, roles, plans, results)
> - **Lookup** — Stores reference/catalog data (types, categories) used to eliminate transitive dependencies
> - **Junction** — Resolves a many-to-many relationship between two entity tables

---

## Common Denormalization in Our Design

While the SkillBridge AI schema rigorously follows 3NF, there is **one intentional denormalization** worth acknowledging:

### `overall_readiness_pct` in `career_gap_analyses`

The `overall_readiness_pct` column (e.g., `65.50` meaning "65.5% ready") is a **stored computed value**. In a perfectly normalized design, this percentage would be calculated on the fly from the `career_gap_items` rows belonging to that analysis — not stored as a column.

**Why is this acceptable?**

1. **It is a historical snapshot, not live data.** Each `career_gap_analyses` row represents the result of a gap analysis *at a specific point in time*. The readiness percentage should **never change** after the analysis is recorded — it captures what was true on `analysis_date`. Recalculating it later from potentially modified gap items would actually be *wrong*.

2. **Performance.** Aggregating dozens of gap items with severity weights every time someone views their analysis history would be expensive. Storing the precomputed result makes reads instant.

3. **The schema explicitly documents this.** The column comment in `schema.sql` states: *"Stored as a snapshot value at analysis time. Not recomputed — it is a historical record."* This transparency ensures future developers understand the design decision.

> **Key takeaway:** Denormalization is not inherently bad — it is a deliberate trade-off. When you have a clear reason (historical snapshots, performance) and document it well, storing a computed value is a widely accepted practice.

---

*This document is part of the SkillBridge AI — Universal Career Gap Tracker learning assignment.*
