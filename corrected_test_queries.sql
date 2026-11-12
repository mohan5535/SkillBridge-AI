-- ==============================================================================
-- SkillBridge AI — Universal Career Gap Tracker
-- SCRIPT: corrected_test_queries.sql
-- PURPOSE:
--   Comprehensive, verified read-only reporting and analytical test queries.
--   Strictly aligned with the ACTUAL PostgreSQL 18 schema column names and
--   designed to handle edge cases (NULLs, missing optional data, latest snapshots).
--
-- TARGET DATABASE: skillbridge_db (PostgreSQL 18.6)
-- SAFETY: 100% READ-ONLY. No data or schema modifications.
-- ==============================================================================

SET client_encoding = 'UTF8';
SET search_path = public;

-- ==============================================================================
-- SECTION A: USER PROFILE & BACKGROUND (Queries 1–3)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Query 1: List users with their education records and qualification types
-- IMPROVEMENT: Uses LEFT JOIN so users without education records are not omitted.
-- ------------------------------------------------------------------------------
SELECT
    u.user_id,
    u.full_name,
    u.email,
    COALESCE(qt.type_name, 'No education recorded') AS qualification_type,
    qt.level_rank                                   AS qualification_level,
    er.field_of_study,
    er.institution_name,
    er.start_date,
    er.end_date,
    er.status                                       AS education_status,
    er.grade_or_score
FROM
    users                u
    LEFT JOIN education_records   er ON u.user_id = er.user_id
    LEFT JOIN qualification_types qt ON er.qualification_type_id = qt.qualification_type_id
ORDER BY
    u.full_name,
    qt.level_rank DESC NULLS LAST;


-- ------------------------------------------------------------------------------
-- Query 2: Show each user's skills with proficiency level and skill category
-- ------------------------------------------------------------------------------
SELECT
    u.user_id,
    u.full_name,
    s.skill_name,
    s.category             AS skill_category,
    us.proficiency_level,
    us.years_of_experience,
    us.last_used_date,
    us.evidence
FROM
    users       u
    INNER JOIN user_skills us ON u.user_id = us.user_id
    INNER JOIN skills      s  ON us.skill_id = s.skill_id
ORDER BY
    u.full_name,
    s.category,
    s.skill_name;


-- ------------------------------------------------------------------------------
-- Query 3: List all users' work experience with career field names
-- ------------------------------------------------------------------------------
SELECT
    u.user_id,
    u.full_name,
    ue.job_title,
    ue.organization_name,
    ue.experience_type,
    COALESCE(cf.field_name, 'Unspecified Field') AS career_field,
    ue.start_date,
    ue.end_date,
    ue.description
FROM
    users            u
    INNER JOIN user_experiences ue ON u.user_id  = ue.user_id
    LEFT  JOIN career_fields   cf ON ue.field_id = cf.field_id
ORDER BY
    u.full_name,
    ue.start_date DESC;


-- ==============================================================================
-- SECTION B: CAREER ROLES & REQUIREMENTS (Queries 4–5)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Query 4: Career roles with field names and total requirement counts
-- IMPROVEMENT: Wrapped SUM in COALESCE to guarantee 0 instead of NULL.
-- ------------------------------------------------------------------------------
SELECT
    cr.role_id,
    cr.role_title,
    cf.field_name           AS career_field,
    cr.jurisdiction,
    cr.organization,
    cr.experience_years_required,
    COUNT(creq.requirement_id) AS total_requirements,
    COALESCE(SUM(CASE WHEN creq.is_mandatory = TRUE THEN 1 ELSE 0 END), 0) AS mandatory_requirements,
    COALESCE(SUM(CASE WHEN creq.is_mandatory = FALSE THEN 1 ELSE 0 END), 0) AS optional_requirements
FROM
    career_roles        cr
    INNER JOIN career_fields       cf   ON cr.field_id = cf.field_id
    LEFT  JOIN career_requirements creq ON cr.role_id  = creq.role_id
GROUP BY
    cr.role_id,
    cr.role_title,
    cf.field_name,
    cr.jurisdiction,
    cr.organization,
    cr.experience_years_required
ORDER BY
    cf.field_name,
    cr.role_title;


-- ------------------------------------------------------------------------------
-- Query 5: Full polymorphic requirements breakdown for a target role
-- ------------------------------------------------------------------------------
SELECT
    cr.role_title,
    creq.requirement_type,
    creq.is_mandatory,
    creq.priority,
    creq.expected_proficiency,
    CASE creq.requirement_type
        WHEN 'skill'         THEN s.skill_name
        WHEN 'education'     THEN qt.type_name
        WHEN 'certification' THEN c.certification_name
        ELSE NULL
    END                     AS requirement_name,
    CASE creq.requirement_type
        WHEN 'skill'         THEN s.category
        WHEN 'certification' THEN c.issuing_body
        ELSE NULL
    END                     AS extra_detail,
    creq.description        AS requirement_description
FROM
    career_requirements  creq
    INNER JOIN career_roles         cr ON creq.role_id              = cr.role_id
    LEFT  JOIN skills               s  ON creq.skill_id             = s.skill_id
    LEFT  JOIN qualification_types  qt ON creq.qualification_type_id = qt.qualification_type_id
    LEFT  JOIN certifications       c  ON creq.certification_id     = c.certification_id
WHERE
    cr.role_title = 'Full-Stack Developer'
ORDER BY
    creq.is_mandatory DESC,
    creq.priority,
    creq.requirement_type;


-- ==============================================================================
-- SECTION C: GAP ANALYSIS & READINESS (Queries 6–9)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Query 6: Show user gap analysis with readiness percentage & individual gap items
-- ------------------------------------------------------------------------------
SELECT
    u.full_name,
    cr.role_title              AS target_role,
    cga.analysis_date,
    cga.overall_readiness_pct,
    cga.status                 AS analysis_status,
    gt.type_name               AS gap_type,
    cgi.gap_description,
    cgi.current_state,
    cgi.required_state,
    cgi.gap_severity,
    cgi.priority               AS gap_priority,
    cgi.status                 AS gap_status
FROM
    career_gap_analyses cga
    INNER JOIN users             u   ON cga.user_id     = u.user_id
    INNER JOIN career_goals      cg  ON cga.goal_id     = cg.goal_id
    INNER JOIN career_roles      cr  ON cg.role_id      = cr.role_id
    INNER JOIN career_gap_items  cgi ON cga.analysis_id  = cgi.analysis_id
    INNER JOIN gap_types         gt  ON cgi.gap_type_id  = gt.gap_type_id
WHERE
    u.user_id = 1
ORDER BY
    cga.analysis_date DESC,
    cgi.priority,
    cgi.gap_severity DESC;


-- ------------------------------------------------------------------------------
-- Query 7: Find users with overall readiness below 60%
-- IMPROVEMENT: Selects the latest analysis snapshot per user-goal FIRST via CTE,
--              then filters by readiness, preventing older analyses from resurfacing.
-- ------------------------------------------------------------------------------
WITH latest_analysis AS (
    SELECT DISTINCT ON (user_id, goal_id)
        analysis_id,
        user_id,
        goal_id,
        overall_readiness_pct,
        analysis_date,
        status,
        summary_notes
    FROM
        career_gap_analyses
    ORDER BY
        user_id,
        goal_id,
        analysis_date DESC
)
SELECT
    u.full_name,
    u.email,
    cr.role_title              AS target_role,
    la.overall_readiness_pct,
    la.analysis_date,
    la.status                 AS analysis_status,
    la.summary_notes
FROM
    latest_analysis la
    INNER JOIN users        u  ON la.user_id = u.user_id
    INNER JOIN career_goals cg ON la.goal_id = cg.goal_id
    INNER JOIN career_roles cr ON cg.role_id = cr.role_id
WHERE
    la.overall_readiness_pct < 60
ORDER BY
    la.overall_readiness_pct ASC,
    u.full_name;


-- ------------------------------------------------------------------------------
-- Query 8: Compare a user's skills vs target role requirements
-- IMPROVEMENT: Explicitly includes user's name and goal identifier.
-- ------------------------------------------------------------------------------
SELECT
    u.full_name                  AS user_name,
    cr.role_title                AS target_role,
    s.skill_name,
    s.category                   AS skill_category,
    creq.expected_proficiency    AS required_proficiency,
    creq.is_mandatory,
    COALESCE(us.proficiency_level, 'not_acquired') AS user_proficiency,
    COALESCE(us.years_of_experience, 0.0)          AS user_years_experience,
    CASE
        WHEN us.proficiency_level IS NULL THEN 'NOT MET'
        WHEN (
            CASE us.proficiency_level
                WHEN 'beginner'     THEN 1
                WHEN 'intermediate' THEN 2
                WHEN 'advanced'     THEN 3
                WHEN 'expert'       THEN 4
                ELSE 0
            END
        ) >= (
            CASE creq.expected_proficiency
                WHEN 'beginner'     THEN 1
                WHEN 'intermediate' THEN 2
                WHEN 'advanced'     THEN 3
                WHEN 'expert'       THEN 4
                ELSE 0
            END
        ) THEN 'MET'
        ELSE 'NOT MET'
    END                          AS requirement_status
FROM
    career_goals        cg
    INNER JOIN users               u    ON cg.user_id               = u.user_id
    INNER JOIN career_roles        cr   ON cg.role_id               = cr.role_id
    INNER JOIN career_requirements creq ON cr.role_id               = creq.role_id
    INNER JOIN skills              s    ON creq.skill_id            = s.skill_id
    LEFT  JOIN user_skills         us   ON cg.user_id               = us.user_id
                                       AND creq.skill_id            = us.skill_id
WHERE
    cg.goal_id = 1
    AND creq.requirement_type = 'skill'
ORDER BY
    creq.is_mandatory DESC,
    s.skill_name;


-- ------------------------------------------------------------------------------
-- Query 9: Users with career breaks and their LATEST career gap analysis
-- IMPROVEMENT: Joins only the most recent gap analysis per user to prevent duplicate rows.
-- ------------------------------------------------------------------------------
WITH latest_user_analysis AS (
    SELECT DISTINCT ON (user_id)
        analysis_id,
        user_id,
        goal_id,
        overall_readiness_pct,
        analysis_date,
        status
    FROM
        career_gap_analyses
    ORDER BY
        user_id,
        analysis_date DESC
)
SELECT
    u.full_name,
    cb.break_reason,
    cb.start_date              AS break_start,
    cb.end_date                AS break_end,
    cb.description             AS break_description,
    cr.role_title              AS target_role,
    la.overall_readiness_pct,
    la.analysis_date           AS latest_analysis_date,
    la.status                  AS analysis_status
FROM
    users                   u
    INNER JOIN career_breaks         cb ON u.user_id   = cb.user_id
    LEFT  JOIN latest_user_analysis  la ON u.user_id   = la.user_id
    LEFT  JOIN career_goals          cg ON la.goal_id  = cg.goal_id
    LEFT  JOIN career_roles          cr ON cg.role_id  = cr.role_id
ORDER BY
    u.full_name,
    cb.start_date DESC;


-- ==============================================================================
-- SECTION D: LEARNING PLANS & RESOURCES (Queries 10–12)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Query 10: Show a user's learning plan items, resources, and completion status
-- ------------------------------------------------------------------------------
SELECT
    u.full_name,
    lp.plan_name,
    lp.status                    AS plan_status,
    lp.start_date                AS plan_start,
    lp.target_completion_date,
    lpi.sequence_order,
    lpi.task_description,
    lpi.status                   AS task_status,
    lpi.due_date,
    lpi.completed_date,
    lr.resource_name,
    lr.resource_type,
    lr.provider,
    lr.url                       AS resource_url,
    lr.estimated_duration_hours,
    lr.cost
FROM
    learning_plans       lp
    INNER JOIN users                u   ON lp.user_id      = u.user_id
    INNER JOIN learning_plan_items  lpi ON lp.plan_id      = lpi.plan_id
    LEFT  JOIN learning_resources   lr  ON lpi.resource_id = lr.resource_id
WHERE
    u.user_id = 1
ORDER BY
    lp.plan_name,
    lpi.sequence_order;


-- ------------------------------------------------------------------------------
-- Query 11: Task completion summary per user across all learning plans
-- IMPROVEMENT: Uses LEFT JOIN so users without learning plans are not silently omitted.
-- ------------------------------------------------------------------------------
SELECT
    u.user_id,
    u.full_name,
    COUNT(lpi.plan_item_id)                                             AS total_tasks,
    COALESCE(SUM(CASE WHEN lpi.status = 'completed'   THEN 1 ELSE 0 END), 0) AS completed,
    COALESCE(SUM(CASE WHEN lpi.status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress,
    COALESCE(SUM(CASE WHEN lpi.status = 'pending'     THEN 1 ELSE 0 END), 0) AS pending,
    COALESCE(SUM(CASE WHEN lpi.status = 'skipped'     THEN 1 ELSE 0 END), 0) AS skipped,
    ROUND(
        COALESCE(SUM(CASE WHEN lpi.status = 'completed' THEN 1 ELSE 0 END), 0) * 100.0
        / NULLIF(COUNT(lpi.plan_item_id), 0),
        1
    )                                                                   AS completion_pct
FROM
    users               u
    LEFT JOIN learning_plans      lp  ON u.user_id  = lp.user_id
    LEFT JOIN learning_plan_items lpi ON lp.plan_id = lpi.plan_id
GROUP BY
    u.user_id,
    u.full_name
ORDER BY
    completion_pct DESC NULLS LAST,
    u.full_name;


-- ------------------------------------------------------------------------------
-- Query 12: Find active learning resources that address skills required by a role
-- ------------------------------------------------------------------------------
SELECT
    cr.role_title,
    s.skill_name,
    creq.expected_proficiency    AS required_proficiency,
    lr.resource_name,
    lr.resource_type,
    lr.provider,
    rs.proficiency_taught,
    lr.estimated_duration_hours,
    lr.cost,
    lr.url
FROM
    career_roles         cr
    INNER JOIN career_requirements  creq ON cr.role_id     = creq.role_id
    INNER JOIN skills               s    ON creq.skill_id  = s.skill_id
    INNER JOIN resource_skills      rs   ON s.skill_id     = rs.skill_id
    INNER JOIN learning_resources   lr   ON rs.resource_id = lr.resource_id
WHERE
    cr.role_title = 'Full-Stack Developer'
    AND creq.requirement_type = 'skill'
    AND lr.is_active = TRUE
ORDER BY
    s.skill_name,
    lr.resource_type;


-- ==============================================================================
-- SECTION E: ASSESSMENTS & GROWTH METRICS (Queries 13–14)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Query 13: User's complete assessment history with scores and pass/fail status
-- ------------------------------------------------------------------------------
SELECT
    u.full_name,
    s.skill_name,
    a.assessment_name,
    a.assessment_type,
    ar.attempt_date,
    ar.score,
    a.max_score,
    a.passing_score,
    ar.passed,
    CASE
        WHEN ar.passed = TRUE  THEN 'PASS'
        WHEN ar.passed = FALSE THEN 'FAIL'
        ELSE 'PENDING'
    END                        AS result_label,
    ar.notes
FROM
    assessment_results ar
    INNER JOIN assessments a ON ar.assessment_id = a.assessment_id
    INNER JOIN skills      s ON a.skill_id       = s.skill_id
    INNER JOIN users       u ON ar.user_id       = u.user_id
WHERE
    u.user_id = 1
ORDER BY
    s.skill_name,
    ar.attempt_date;


-- ------------------------------------------------------------------------------
-- Query 14: Identify users who improved (Passed an assessment after previously failing)
-- ------------------------------------------------------------------------------
SELECT DISTINCT
    u.full_name,
    u.email,
    s.skill_name,
    a.assessment_name,
    fail.attempt_date          AS first_fail_date,
    fail.score                 AS fail_score,
    pass.attempt_date          AS pass_date,
    pass.score                 AS pass_score
FROM
    assessment_results fail
    INNER JOIN assessment_results pass
        ON  fail.user_id       = pass.user_id
        AND fail.assessment_id = pass.assessment_id
        AND fail.passed        = FALSE
        AND pass.passed        = TRUE
        AND pass.attempt_date  > fail.attempt_date
    INNER JOIN assessments a ON fail.assessment_id = a.assessment_id
    INNER JOIN skills      s ON a.skill_id         = s.skill_id
    INNER JOIN users       u ON fail.user_id       = u.user_id
ORDER BY
    u.full_name,
    a.assessment_name,
    fail.attempt_date;


-- ==============================================================================
-- SECTION F: MASTER EXECUTIVE DASHBOARD (Query 15)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Query 15: Career Readiness Dashboard (Optimized Multi-CTE Architecture)
-- Isolates gap and learning plan metrics to prevent Cartesian row explosion.
-- ------------------------------------------------------------------------------
WITH latest_analysis AS (
    SELECT DISTINCT ON (user_id, goal_id)
        analysis_id,
        user_id,
        goal_id,
        overall_readiness_pct,
        analysis_date,
        status
    FROM
        career_gap_analyses
    ORDER BY
        user_id,
        goal_id,
        analysis_date DESC
),
gap_summary AS (
    SELECT
        cgi.analysis_id,
        COUNT(cgi.gap_item_id)                                         AS total_gaps,
        COUNT(CASE WHEN cgi.status = 'identified'  THEN 1 END)         AS gaps_identified,
        COUNT(CASE WHEN cgi.status = 'in_progress' THEN 1 END)         AS gaps_in_progress,
        COUNT(CASE WHEN cgi.status = 'resolved'    THEN 1 END)         AS gaps_resolved
    FROM
        career_gap_items cgi
    GROUP BY
        cgi.analysis_id
),
learning_summary AS (
    SELECT
        lp.user_id,
        lp.goal_id,
        COUNT(lpi.plan_item_id)                                        AS total_learning_tasks,
        COUNT(CASE WHEN lpi.status = 'completed' THEN 1 END)           AS tasks_completed
    FROM
        learning_plans lp
        INNER JOIN learning_plan_items lpi ON lp.plan_id = lpi.plan_id
    GROUP BY
        lp.user_id,
        lp.goal_id
)
SELECT
    u.full_name,
    u.email,
    cr.role_title              AS target_role,
    cf.field_name              AS career_field,
    cg.status                  AS goal_status,
    cg.target_date             AS goal_target_date,
    la.overall_readiness_pct,
    la.analysis_date           AS latest_analysis_date,
    COALESCE(gs.total_gaps, 0)           AS total_gaps,
    COALESCE(gs.gaps_identified, 0)      AS gaps_identified,
    COALESCE(gs.gaps_in_progress, 0)     AS gaps_in_progress,
    COALESCE(gs.gaps_resolved, 0)        AS gaps_resolved,
    COALESCE(ls.total_learning_tasks, 0) AS total_learning_tasks,
    COALESCE(ls.tasks_completed, 0)      AS tasks_completed
FROM
    users                   u
    INNER JOIN career_goals       cg ON u.user_id      = cg.user_id
    INNER JOIN career_roles       cr ON cg.role_id     = cr.role_id
    INNER JOIN career_fields      cf ON cr.field_id    = cf.field_id
    LEFT  JOIN latest_analysis    la ON cg.user_id     = la.user_id
                                    AND cg.goal_id     = la.goal_id
    LEFT  JOIN gap_summary        gs ON la.analysis_id = gs.analysis_id
    LEFT  JOIN learning_summary   ls ON cg.user_id     = ls.user_id
                                    AND cg.goal_id     = ls.goal_id
ORDER BY
    la.overall_readiness_pct ASC NULLS LAST,
    u.full_name;

