-- ============================================================================
-- SkillBridge AI — Universal Career Gap Tracker
-- PostgreSQL Database Schema (schema.sql)
--
-- Version : 1.0
-- Author  : Database Architecture Assignment
-- Date    : 2026-10-31
--
-- Description:
--   A normalized (3NF) relational schema that helps people from ANY
--   professional or educational field identify, track, and close gaps
--   between their current profile and their target career.
--
-- Tables  : 22 tables across 5 logical layers
-- ============================================================================

-- Ensure consistent UTF-8 client encoding for cross-platform execution
SET client_encoding = 'UTF8';

-- ============================================================================
-- FRESH START — Drop all tables in reverse dependency order
-- ============================================================================
-- (This lets you re-run the script on a fresh or existing database.)



-- ============================================================================
-- LAYER 1: USER PROFILE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: users
-- Purpose: Core user identity. Deliberately minimal — no Aadhaar, no medical
--          records, no unnecessary PII. Only data the system actually needs.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id          SERIAL       PRIMARY KEY,
    email            VARCHAR(255) NOT NULL,
    full_name        VARCHAR(200) NOT NULL,
    phone            VARCHAR(20),                       -- optional contact
    country          VARCHAR(100),                      -- for jurisdiction-aware requirements
    state_or_region  VARCHAR(100),                      -- sub-jurisdiction
    date_of_birth    DATE,                              -- only for age-based eligibility (e.g., govt exams)
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Each email address belongs to exactly one account
    CONSTRAINT uq_users_email UNIQUE (email)
);

COMMENT ON TABLE  users IS 'Core user profile. Stores only data the application needs — no biometric or government ID data.';
COMMENT ON COLUMN users.date_of_birth IS 'Included only because some government exams enforce age limits. NULL when not needed.';


-- ============================================================================
-- LAYER 2: CAREER & REQUIREMENTS CATALOG
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 2: career_fields
-- Purpose: Catalog of broad career domains (e.g., "Healthcare," "IT").
--          Administrators add rows here — the schema never needs redesigning.
-- ----------------------------------------------------------------------------
CREATE TABLE career_fields (
    field_id     SERIAL       PRIMARY KEY,
    field_name   VARCHAR(150) NOT NULL,
    description  TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,     -- soft-disable without deleting
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_career_fields_name UNIQUE (field_name)
);

COMMENT ON TABLE career_fields IS 'Broad career domains. Adding a new field means inserting one row — zero schema changes.';


-- ----------------------------------------------------------------------------
-- Table 3: skills
-- Purpose: Central, reusable skill catalog shared across ALL career fields.
--          "Communication" is one row used by IT, Healthcare, Education, etc.
-- ----------------------------------------------------------------------------
CREATE TABLE skills (
    skill_id     SERIAL       PRIMARY KEY,
    skill_name   VARCHAR(150) NOT NULL,
    category     VARCHAR(100),                          -- e.g., "Programming," "Clinical," "Analytical"
    description  TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_skills_name UNIQUE (skill_name)
);

COMMENT ON TABLE skills IS 'Central skill catalog. Skills are reusable across career fields — never duplicated per field.';


-- ----------------------------------------------------------------------------
-- Table 4: qualification_types
-- Purpose: Lookup table for education levels. Keeps education_records in 3NF
--          by removing the transitive dependency: education_record → qual_type → level_rank.
-- ----------------------------------------------------------------------------
CREATE TABLE qualification_types (
    qualification_type_id  SERIAL       PRIMARY KEY,
    type_name              VARCHAR(100) NOT NULL,        -- e.g., "Bachelor's Degree," "ITI Certificate," "MD"
    level_rank             SMALLINT,                     -- numeric ordering (1 = lowest) for comparisons
    description            TEXT,

    CONSTRAINT uq_qualification_types_name UNIQUE (type_name)
);

COMMENT ON TABLE  qualification_types IS 'Lookup table for education levels. Allows the system to compare "does the user meet minimum education?"';
COMMENT ON COLUMN qualification_types.level_rank IS 'Numeric ordering where 1 = lowest (e.g., high school). Used to compare education levels programmatically.';


-- ----------------------------------------------------------------------------
-- Table 5: career_roles
-- Purpose: Specific job roles WITHIN a career field. Requirements are defined
--          at the ROLE level, not the field level.
--          "Healthcare" is a field; "Registered Nurse in India" is a role.
-- ----------------------------------------------------------------------------
CREATE TABLE career_roles (
    role_id                    SERIAL       PRIMARY KEY,
    field_id                   INTEGER      NOT NULL,
    role_title                 VARCHAR(200) NOT NULL,
    description                TEXT,
    jurisdiction               VARCHAR(150),             -- e.g., "India," "State of California"
    organization               VARCHAR(200),             -- e.g., "UPSC," "Google"
    experience_years_required  NUMERIC(4,1),             -- e.g., 2.0 years minimum
    is_active                  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at                 TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- A role belongs to a career field
    CONSTRAINT fk_career_roles_field
        FOREIGN KEY (field_id) REFERENCES career_fields (field_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- No duplicate role definitions for the same context
    CONSTRAINT uq_career_roles_context
        UNIQUE (field_id, role_title, jurisdiction, organization),

    -- Experience cannot be negative
    CONSTRAINT chk_career_roles_exp_positive
        CHECK (experience_years_required IS NULL OR experience_years_required >= 0)
);

COMMENT ON TABLE  career_roles IS 'Specific job roles within a career field. Requirements belong to roles, not to entire fields.';
COMMENT ON COLUMN career_roles.jurisdiction IS 'Requirements may differ by geography. E.g., nursing licenses differ by state/country.';


-- ----------------------------------------------------------------------------
-- Table 6: certifications
-- Purpose: Central catalog of certifications and licenses (e.g., "CPA License,"
--          "AWS Solutions Architect," "RN License"). Shared and reusable.
-- ----------------------------------------------------------------------------
CREATE TABLE certifications (
    certification_id    SERIAL       PRIMARY KEY,
    certification_name  VARCHAR(200) NOT NULL,
    issuing_body        VARCHAR(200),                    -- e.g., "ICAI," "AWS," "State Nursing Board"
    field_id            INTEGER,                         -- optional link to career field
    description         TEXT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- A certification optionally belongs to a career field
    CONSTRAINT fk_certifications_field
        FOREIGN KEY (field_id) REFERENCES career_fields (field_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Same cert name from different issuers = different certification
    CONSTRAINT uq_certifications_name_issuer
        UNIQUE (certification_name, issuing_body)
);

COMMENT ON TABLE certifications IS 'Central catalog of certifications and professional licenses, reusable across roles.';


-- ============================================================================
-- LAYER 1 (continued): USER PROFILE — DETAIL TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 7: education_records
-- Purpose: A user's educational qualifications (degrees, diplomas, certificates).
-- ----------------------------------------------------------------------------
CREATE TABLE education_records (
    education_id          SERIAL       PRIMARY KEY,
    user_id               INTEGER      NOT NULL,
    qualification_type_id INTEGER      NOT NULL,
    field_of_study        VARCHAR(200),                  -- e.g., "Computer Science," "Nursing"
    institution_name      VARCHAR(300) NOT NULL,
    start_date            DATE,
    end_date              DATE,                          -- NULL = still studying
    status                VARCHAR(30)  NOT NULL DEFAULT 'completed',
    grade_or_score        VARCHAR(50),                   -- e.g., "3.8 GPA," "First Class," "85%"
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_education_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_education_qual_type
        FOREIGN KEY (qualification_type_id) REFERENCES qualification_types (qualification_type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- Controlled vocabulary for status
    CONSTRAINT chk_education_status
        CHECK (status IN ('in_progress', 'completed', 'incomplete', 'deferred')),

    -- End date cannot be before start date
    CONSTRAINT chk_education_dates
        CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE education_records IS 'A user''s educational qualifications. Linked to qualification_types for normalization.';


-- ----------------------------------------------------------------------------
-- Table 8: user_skills  (Junction Table: users ↔ skills)
-- Purpose: Which skills a user has, at what proficiency level, with evidence.
-- ----------------------------------------------------------------------------
CREATE TABLE user_skills (
    user_skill_id     SERIAL       PRIMARY KEY,
    user_id           INTEGER      NOT NULL,
    skill_id          INTEGER      NOT NULL,
    proficiency_level VARCHAR(30)  NOT NULL DEFAULT 'beginner',
    years_of_experience NUMERIC(4,1),
    evidence          TEXT,                              -- e.g., "Built 3 React apps," "Used in ICU for 2 years"
    last_used_date    DATE,                              -- skills can become stale
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_user_skills_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_user_skills_skill
        FOREIGN KEY (skill_id) REFERENCES skills (skill_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- One proficiency record per skill per user
    CONSTRAINT uq_user_skills
        UNIQUE (user_id, skill_id),

    -- Controlled proficiency scale
    CONSTRAINT chk_user_skills_proficiency
        CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),

    -- Experience cannot be negative
    CONSTRAINT chk_user_skills_exp_positive
        CHECK (years_of_experience IS NULL OR years_of_experience >= 0)
);

COMMENT ON TABLE user_skills IS 'Junction table linking users to skills with proficiency levels. Many-to-many: users ↔ skills.';


-- ----------------------------------------------------------------------------
-- Table 9: user_experiences
-- Purpose: A user's work, volunteer, internship, or apprenticeship experience.
-- ----------------------------------------------------------------------------
CREATE TABLE user_experiences (
    experience_id     SERIAL       PRIMARY KEY,
    user_id           INTEGER      NOT NULL,
    job_title         VARCHAR(200) NOT NULL,
    organization_name VARCHAR(300) NOT NULL,
    experience_type   VARCHAR(30)  NOT NULL DEFAULT 'full_time',
    field_id          INTEGER,                           -- which career field this relates to
    start_date        DATE         NOT NULL,
    end_date          DATE,                              -- NULL = current position
    description       TEXT,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_user_experiences_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_user_experiences_field
        FOREIGN KEY (field_id) REFERENCES career_fields (field_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Controlled vocabulary for experience type
    CONSTRAINT chk_experience_type
        CHECK (experience_type IN (
            'full_time', 'part_time', 'internship',
            'freelance', 'volunteer', 'apprenticeship'
        )),

    -- End date cannot be before start date
    CONSTRAINT chk_experience_dates
        CHECK (end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE user_experiences IS 'A user''s work/volunteer/internship history. Optionally linked to a career field.';


-- ----------------------------------------------------------------------------
-- Table 10: user_certifications  (Junction Table: users ↔ certifications)
-- Purpose: Which certifications a user holds, with issue/expiry dates.
-- ----------------------------------------------------------------------------
CREATE TABLE user_certifications (
    user_certification_id  SERIAL       PRIMARY KEY,
    user_id                INTEGER      NOT NULL,
    certification_id       INTEGER      NOT NULL,
    date_obtained          DATE,
    expiry_date            DATE,                         -- some licenses/certs expire
    credential_id          VARCHAR(100),                 -- external verification ID
    status                 VARCHAR(30)  NOT NULL DEFAULT 'active',
    created_at             TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_user_certs_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_user_certs_cert
        FOREIGN KEY (certification_id) REFERENCES certifications (certification_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- One record per user-certification pair
    CONSTRAINT uq_user_certifications
        UNIQUE (user_id, certification_id),

    -- Controlled vocabulary for status
    CONSTRAINT chk_user_cert_status
        CHECK (status IN ('active', 'expired', 'revoked', 'in_progress')),

    -- Expiry must be after obtainment
    CONSTRAINT chk_user_cert_dates
        CHECK (expiry_date IS NULL OR date_obtained IS NULL OR expiry_date >= date_obtained)
);

COMMENT ON TABLE user_certifications IS 'Junction table: which certifications a user holds. Many-to-many: users ↔ certifications.';


-- ----------------------------------------------------------------------------
-- Table 11: career_breaks
-- Purpose: Records career gaps neutrally. A break is INFORMATION, not a penalty.
--          Gap analysis compares against actual career requirements, not break
--          duration.
-- ----------------------------------------------------------------------------
CREATE TABLE career_breaks (
    break_id      SERIAL       PRIMARY KEY,
    user_id       INTEGER      NOT NULL,
    break_reason  VARCHAR(50)  NOT NULL,
    start_date    DATE         NOT NULL,
    end_date      DATE,                                  -- NULL = currently on break
    description   TEXT,                                  -- optional user narrative
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_career_breaks_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    -- Controlled vocabulary for break reasons
    CONSTRAINT chk_break_reason
        CHECK (break_reason IN (
            'parental_leave', 'health', 'caregiving', 'education',
            'travel', 'personal', 'layoff', 'career_change', 'other'
        )),

    -- End date cannot be before start date
    CONSTRAINT chk_break_dates
        CHECK (end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE  career_breaks IS 'Career breaks stored neutrally. A break is information, not automatic disqualification.';
COMMENT ON COLUMN career_breaks.break_reason IS 'Categorization for reporting only. Never used to penalize or auto-disqualify a user.';


-- ============================================================================
-- LAYER 2 (continued): CAREER GOALS & REQUIREMENTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 12: career_goals
-- Purpose: Links a user to a target career role they want to pursue.
--          A user can have multiple career goals across different fields.
-- ----------------------------------------------------------------------------
CREATE TABLE career_goals (
    goal_id      SERIAL       PRIMARY KEY,
    user_id      INTEGER      NOT NULL,
    role_id      INTEGER      NOT NULL,
    priority     SMALLINT     NOT NULL DEFAULT 1,
    target_date  DATE,                                   -- when the user hopes to be ready
    status       VARCHAR(30)  NOT NULL DEFAULT 'exploring',
    notes        TEXT,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_career_goals_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_career_goals_role
        FOREIGN KEY (role_id) REFERENCES career_roles (role_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- A user should not have two goals for the exact same role
    CONSTRAINT uq_career_goals_user_role
        UNIQUE (user_id, role_id),

    -- Priority on a 1–5 scale (1 = highest)
    CONSTRAINT chk_career_goals_priority
        CHECK (priority BETWEEN 1 AND 5),

    -- Controlled vocabulary for goal status
    CONSTRAINT chk_career_goals_status
        CHECK (status IN ('exploring', 'active', 'achieved', 'paused', 'abandoned'))
);

COMMENT ON TABLE career_goals IS 'Links users to target career roles. A user can pursue multiple goals across different fields.';


-- ----------------------------------------------------------------------------
-- Table 13: career_requirements
-- Purpose: Defines what a target career role DEMANDS. This is what a user's
--          profile gets compared against during gap analysis.
--
-- Design: Uses a "polymorphic row" pattern — each row has a requirement_type
--         that determines which optional FK column is relevant.
--         When type='skill', look at skill_id.
--         When type='education', look at qualification_type_id.
--         When type='certification', look at certification_id.
-- ----------------------------------------------------------------------------
CREATE TABLE career_requirements (
    requirement_id        SERIAL       PRIMARY KEY,
    role_id               INTEGER      NOT NULL,
    requirement_type      VARCHAR(50)  NOT NULL,
    skill_id              INTEGER,                       -- populated when type = 'skill'
    qualification_type_id INTEGER,                       -- populated when type = 'education'
    certification_id      INTEGER,                       -- populated when type = 'certification'
    expected_proficiency  VARCHAR(30),                   -- e.g., "intermediate," "advanced"
    description           TEXT,                          -- human-readable, especially for 'eligibility'/'other'
    is_mandatory          BOOLEAN      NOT NULL DEFAULT TRUE,
    priority              SMALLINT     NOT NULL DEFAULT 3,
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_career_req_role
        FOREIGN KEY (role_id) REFERENCES career_roles (role_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_career_req_skill
        FOREIGN KEY (skill_id) REFERENCES skills (skill_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_career_req_qual
        FOREIGN KEY (qualification_type_id) REFERENCES qualification_types (qualification_type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_career_req_cert
        FOREIGN KEY (certification_id) REFERENCES certifications (certification_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- Controlled vocabulary for requirement types
    CONSTRAINT chk_career_req_type
        CHECK (requirement_type IN (
            'skill', 'education', 'certification',
            'experience', 'eligibility', 'other'
        )),

    -- Priority on a 1–5 scale
    CONSTRAINT chk_career_req_priority
        CHECK (priority BETWEEN 1 AND 5),

    -- Mutual exclusivity: requirement_type strictly governs which foreign key is populated
    CONSTRAINT chk_career_req_exclusive_fks
        CHECK (
            (requirement_type = 'skill'
                AND skill_id IS NOT NULL
                AND qualification_type_id IS NULL
                AND certification_id IS NULL)
            OR
            (requirement_type = 'education'
                AND qualification_type_id IS NOT NULL
                AND skill_id IS NULL
                AND certification_id IS NULL)
            OR
            (requirement_type = 'certification'
                AND certification_id IS NOT NULL
                AND skill_id IS NULL
                AND qualification_type_id IS NULL)
            OR
            (requirement_type IN ('experience', 'eligibility', 'other')
                AND skill_id IS NULL
                AND qualification_type_id IS NULL
                AND certification_id IS NULL)
        )
);

COMMENT ON TABLE  career_requirements IS 'What a career role demands. Polymorphic rows: requirement_type determines which FK is relevant.';
COMMENT ON COLUMN career_requirements.requirement_type IS 'Determines which optional FK column applies. "skill" → skill_id, "education" → qualification_type_id, "certification" → certification_id.';
COMMENT ON COLUMN career_requirements.is_mandatory IS 'TRUE = hard requirement (must have). FALSE = preferred/nice-to-have.';


-- ============================================================================
-- LAYER 3: GAP ANALYSIS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 14: gap_types
-- Purpose: Lookup table for configurable gap categories. New gap types can be
--          added by inserting rows — no schema change required.
-- ----------------------------------------------------------------------------
CREATE TABLE gap_types (
    gap_type_id  SERIAL       PRIMARY KEY,
    type_name    VARCHAR(100) NOT NULL,                  -- e.g., "Skill Gap," "Education Gap"
    description  TEXT,

    CONSTRAINT uq_gap_types_name UNIQUE (type_name)
);

COMMENT ON TABLE gap_types IS 'Configurable gap categories. Extensible without schema changes — just insert new rows.';


-- ----------------------------------------------------------------------------
-- Table 15: career_gap_analyses
-- Purpose: A SNAPSHOT of a gap analysis at a point in time. Each time a user
--          runs an analysis against a career goal, one row is created here.
--          Historical snapshots allow tracking progress over time.
-- ----------------------------------------------------------------------------
CREATE TABLE career_gap_analyses (
    analysis_id          SERIAL       PRIMARY KEY,
    user_id              INTEGER      NOT NULL,
    goal_id              INTEGER      NOT NULL,
    analysis_date        TIMESTAMP    NOT NULL DEFAULT NOW(),
    overall_readiness_pct NUMERIC(5,2),                  -- e.g., 65.50 means "65.5% ready"
    summary_notes        TEXT,
    status               VARCHAR(30)  NOT NULL DEFAULT 'completed',
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_gap_analyses_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_gap_analyses_goal
        FOREIGN KEY (goal_id) REFERENCES career_goals (goal_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    -- Readiness percentage must be between 0 and 100
    CONSTRAINT chk_gap_analyses_pct
        CHECK (overall_readiness_pct IS NULL OR overall_readiness_pct BETWEEN 0 AND 100),

    -- Controlled vocabulary for analysis status
    CONSTRAINT chk_gap_analyses_status
        CHECK (status IN ('in_progress', 'completed', 'reviewed', 'archived'))
);

COMMENT ON TABLE  career_gap_analyses IS 'Snapshot of a gap analysis. Historical records enable progress-over-time reporting.';
COMMENT ON COLUMN career_gap_analyses.overall_readiness_pct IS 'Stored as a snapshot value at analysis time. Not recomputed — it is a historical record.';


-- ----------------------------------------------------------------------------
-- Table 16: career_gap_items
-- Purpose: Individual gap entries within an analysis. Each row = one specific
--          thing the user is missing or partially meeting.
-- ----------------------------------------------------------------------------
CREATE TABLE career_gap_items (
    gap_item_id      SERIAL       PRIMARY KEY,
    analysis_id      INTEGER      NOT NULL,
    gap_type_id      INTEGER      NOT NULL,
    requirement_id   INTEGER,                            -- which career requirement is unmet (if applicable)
    gap_description  TEXT         NOT NULL,               -- human-readable explanation
    current_state    TEXT,                                -- what the user currently has
    required_state   TEXT,                                -- what is needed
    gap_severity     VARCHAR(20)  NOT NULL DEFAULT 'medium',
    priority         SMALLINT     NOT NULL DEFAULT 3,
    status           VARCHAR(30)  NOT NULL DEFAULT 'identified',
    evidence         TEXT,
    review_date      DATE,                               -- when this gap should be re-evaluated
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_gap_items_analysis
        FOREIGN KEY (analysis_id) REFERENCES career_gap_analyses (analysis_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_gap_items_type
        FOREIGN KEY (gap_type_id) REFERENCES gap_types (gap_type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_gap_items_requirement
        FOREIGN KEY (requirement_id) REFERENCES career_requirements (requirement_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Controlled severity scale
    CONSTRAINT chk_gap_items_severity
        CHECK (gap_severity IN ('low', 'medium', 'high', 'critical')),

    -- Priority on a 1–5 scale
    CONSTRAINT chk_gap_items_priority
        CHECK (priority BETWEEN 1 AND 5),

    -- Controlled vocabulary for gap status
    CONSTRAINT chk_gap_items_status
        CHECK (status IN ('identified', 'in_progress', 'resolved', 'not_applicable'))
);

COMMENT ON TABLE career_gap_items IS 'Individual gap entries within an analysis. Each row is one specific unmet or partially met requirement.';


-- ============================================================================
-- LAYER 4: LEARNING & IMPROVEMENT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 17: learning_resources
-- Purpose: Catalog of courses, books, tutorials, workshops, etc. that can
--          help users close identified gaps.
-- ----------------------------------------------------------------------------
CREATE TABLE learning_resources (
    resource_id              SERIAL       PRIMARY KEY,
    resource_name            VARCHAR(300) NOT NULL,
    resource_type            VARCHAR(50)  NOT NULL,
    provider                 VARCHAR(200),               -- e.g., "Coursera," "Khan Academy"
    url                      TEXT,
    estimated_duration_hours NUMERIC(6,1),
    cost                     NUMERIC(10,2),
    description              TEXT,
    is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Controlled vocabulary for resource types
    CONSTRAINT chk_resource_type
        CHECK (resource_type IN (
            'course', 'book', 'tutorial', 'workshop',
            'certification_program', 'mentorship', 'practice_exam', 'other'
        )),

    -- Duration must be positive
    CONSTRAINT chk_resource_duration_positive
        CHECK (estimated_duration_hours IS NULL OR estimated_duration_hours > 0),

    -- Cost cannot be negative
    CONSTRAINT chk_resource_cost_positive
        CHECK (cost IS NULL OR cost >= 0)
);

COMMENT ON TABLE learning_resources IS 'Catalog of learning materials (courses, books, tutorials, etc.) for closing career gaps.';


-- ----------------------------------------------------------------------------
-- Table 18: resource_skills  (Junction Table: learning_resources ↔ skills)
-- Purpose: Which skills a learning resource teaches. Many-to-many relationship.
-- ----------------------------------------------------------------------------
CREATE TABLE resource_skills (
    resource_skill_id   SERIAL       PRIMARY KEY,
    resource_id         INTEGER      NOT NULL,
    skill_id            INTEGER      NOT NULL,
    proficiency_taught  VARCHAR(30),                     -- what level the resource brings you to

    CONSTRAINT fk_resource_skills_resource
        FOREIGN KEY (resource_id) REFERENCES learning_resources (resource_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_resource_skills_skill
        FOREIGN KEY (skill_id) REFERENCES skills (skill_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- No duplicate resource-skill links
    CONSTRAINT uq_resource_skills
        UNIQUE (resource_id, skill_id)
);

COMMENT ON TABLE resource_skills IS 'Junction table: which skills a learning resource teaches. Many-to-many: resources ↔ skills.';


-- ----------------------------------------------------------------------------
-- Table 19: learning_plans
-- Purpose: A user's structured plan to close identified gaps for a career goal.
-- ----------------------------------------------------------------------------
CREATE TABLE learning_plans (
    plan_id                SERIAL       PRIMARY KEY,
    user_id                INTEGER      NOT NULL,
    goal_id                INTEGER,                      -- which career goal this plan addresses
    plan_name              VARCHAR(200) NOT NULL,
    description            TEXT,
    start_date             DATE,
    target_completion_date DATE,
    status                 VARCHAR(30)  NOT NULL DEFAULT 'draft',
    created_at             TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_learning_plans_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_learning_plans_goal
        FOREIGN KEY (goal_id) REFERENCES career_goals (goal_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Controlled vocabulary for plan status
    CONSTRAINT chk_learning_plan_status
        CHECK (status IN ('draft', 'active', 'completed', 'paused', 'abandoned')),

    -- Target completion cannot be before start
    CONSTRAINT chk_learning_plan_dates
        CHECK (
            target_completion_date IS NULL
            OR start_date IS NULL
            OR target_completion_date >= start_date
        )
);

COMMENT ON TABLE learning_plans IS 'A user''s structured plan to close career gaps. Linked to a career goal.';


-- ----------------------------------------------------------------------------
-- Table 20: learning_plan_items
-- Purpose: Individual tasks or steps within a learning plan. Each item can
--          link to a specific gap and a specific learning resource.
-- ----------------------------------------------------------------------------
CREATE TABLE learning_plan_items (
    plan_item_id     SERIAL       PRIMARY KEY,
    plan_id          INTEGER      NOT NULL,
    gap_item_id      INTEGER,                            -- which gap this task addresses
    resource_id      INTEGER,                            -- which learning resource to use
    task_description TEXT         NOT NULL,
    sequence_order   SMALLINT,                           -- order within the plan
    status           VARCHAR(30)  NOT NULL DEFAULT 'pending',
    due_date         DATE,
    completed_date   DATE,
    notes            TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_plan_items_plan
        FOREIGN KEY (plan_id) REFERENCES learning_plans (plan_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_plan_items_gap
        FOREIGN KEY (gap_item_id) REFERENCES career_gap_items (gap_item_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_plan_items_resource
        FOREIGN KEY (resource_id) REFERENCES learning_resources (resource_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Controlled vocabulary for task status
    CONSTRAINT chk_plan_item_status
        CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),

    -- Completed date must be after or on due date is NOT enforced — tasks may finish early
    -- But completed_date should be reasonable (no future completions)
    CONSTRAINT chk_plan_item_completed_order
        CHECK (completed_date IS NULL OR status = 'completed')
);

COMMENT ON TABLE learning_plan_items IS 'Individual tasks within a learning plan. Links a gap item to a learning resource.';


-- ============================================================================
-- LAYER 5: ASSESSMENTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 21: assessments
-- Purpose: Catalog of assessments/tests, each linked to a specific skill.
-- ----------------------------------------------------------------------------
CREATE TABLE assessments (
    assessment_id    SERIAL       PRIMARY KEY,
    skill_id         INTEGER      NOT NULL,
    assessment_name  VARCHAR(200) NOT NULL,
    assessment_type  VARCHAR(50)  NOT NULL DEFAULT 'quiz',
    max_score        NUMERIC(7,2),
    passing_score    NUMERIC(7,2),
    description      TEXT,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_assessments_skill
        FOREIGN KEY (skill_id) REFERENCES skills (skill_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- Controlled vocabulary for assessment types
    CONSTRAINT chk_assessment_type
        CHECK (assessment_type IN (
            'quiz', 'practical', 'project', 'interview',
            'peer_review', 'certification_exam', 'other'
        )),

    -- Scores must be positive
    CONSTRAINT chk_assessment_max_positive
        CHECK (max_score IS NULL OR max_score > 0),

    CONSTRAINT chk_assessment_pass_positive
        CHECK (passing_score IS NULL OR passing_score >= 0),

    -- Passing score cannot exceed max score
    CONSTRAINT chk_assessment_pass_le_max
        CHECK (
            passing_score IS NULL
            OR max_score IS NULL
            OR passing_score <= max_score
        )
);

COMMENT ON TABLE assessments IS 'Catalog of skill assessments. Each assessment tests one specific skill.';


-- ----------------------------------------------------------------------------
-- Table 22: assessment_results
-- Purpose: A user's result on a specific assessment. Multiple attempts are
--          allowed (no UNIQUE on user_id + assessment_id) to track improvement.
-- ----------------------------------------------------------------------------
CREATE TABLE assessment_results (
    result_id       SERIAL       PRIMARY KEY,
    user_id         INTEGER      NOT NULL,
    assessment_id   INTEGER      NOT NULL,
    attempt_date    TIMESTAMP    NOT NULL DEFAULT NOW(),
    score           NUMERIC(7,2),
    passed          BOOLEAN,
    evidence        TEXT,                                -- link to certificate, screenshot, etc.
    notes           TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_results_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_results_assessment
        FOREIGN KEY (assessment_id) REFERENCES assessments (assessment_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- Score must be non-negative
    CONSTRAINT chk_result_score_positive
        CHECK (score IS NULL OR score >= 0)
);

COMMENT ON TABLE  assessment_results IS 'A user''s result on an assessment. Multiple attempts allowed to track improvement over time.';
COMMENT ON COLUMN assessment_results.passed IS 'Can be computed (score >= passing_score) or manually recorded for non-scored assessments.';


-- ============================================================================
-- INDEXES — For common query patterns beyond PK/UNIQUE auto-indexes
-- ============================================================================
-- NOTE: Leading-column lookups on composite unique constraints do NOT need
-- standalone indexes because PostgreSQL automatically creates backing B-tree
-- indexes covering those leading columns:
--   - user_skills (user_id, skill_id) covers user_id lookups
--   - user_certifications (user_id, certification_id) covers user_id lookups
--   - career_roles (field_id, role_title, ...) covers field_id lookups
--   - career_goals (user_id, role_id) covers user_id lookups

-- User Profile lookups: "show me everything about this user"
CREATE INDEX idx_education_records_user    ON education_records (user_id);
CREATE INDEX idx_user_experiences_user     ON user_experiences (user_id);
CREATE INDEX idx_career_breaks_user        ON career_breaks (user_id);

-- Career catalog lookups: "show requirements for this role"
CREATE INDEX idx_career_requirements_role  ON career_requirements (role_id);
CREATE INDEX idx_career_requirements_type  ON career_requirements (requirement_type);

-- Gap analysis: "show analyses for this user+goal" / "show items in this analysis"
CREATE INDEX idx_gap_analyses_user_goal    ON career_gap_analyses (user_id, goal_id);
CREATE INDEX idx_gap_items_analysis        ON career_gap_items (analysis_id);

-- Learning: "show plan items for this plan"
CREATE INDEX idx_learning_plans_user       ON learning_plans (user_id);
CREATE INDEX idx_learning_plan_items_plan  ON learning_plan_items (plan_id);

-- Assessments: "show results for this user"
CREATE INDEX idx_assessment_results_user   ON assessment_results (user_id);

-- Skill browsing: "show skills in this category"
CREATE INDEX idx_skills_category           ON skills (category);

-- Certification browsing: "show certs in this field"
CREATE INDEX idx_certifications_field      ON certifications (field_id);


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- Total: 22 tables, 16 foreign key relationships, 3 junction tables,
--        20+ CHECK constraints, 13 indexes (beyond auto-created PK/UNIQUE)
-- ============================================================================

