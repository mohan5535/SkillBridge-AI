-- ============================================================================
-- SkillBridge AI — Universal Career Gap Tracker
-- Test Queries (test_queries.sql)
--
-- Version : 1.0
-- Author  : Database Architecture Assignment
-- Date    : 2026-10-31
--
-- Description:
--   15 well-commented test queries that demonstrate the full capabilities of
--   the SkillBridge AI database schema. Covers user profiles, career catalog,
--   gap analysis, learning & progress tracking, assessments, and reporting.
--
-- Prerequisites:
--   - The schema.sql file must be executed first to create all 22 tables.
--   - Tables should be populated with sample data for meaningful results.
--
-- Compatibility: PostgreSQL
-- ============================================================================

-- Ensure consistent UTF-8 client encoding for cross-platform execution
SET client_encoding = 'UTF8';


-- ============================================================================
-- SECTION A: BASIC PROFILE QUERIES (Queries 1–3)
-- ============================================================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 1: List all users with their education and qualification type names
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Build a complete "Education" tab for each user's profile.
-- WHY     : Recruiters and the system need to see what degrees/diplomas a
--           user holds and what level each qualification represents.
-- TABLES  : users, education_records, qualification_types
-- JOIN    : users → education_records (user_id)
--           education_records → qualification_types (qualification_type_id)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 1
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
    qt.level_rank DESC NULLS LAST;   -- highest qualification first per user


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 2: Show each user's skills with proficiency level and skill category
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Display the "Skills Inventory" for every user.
-- WHY     : This is the primary data compared against career requirements
--           during gap analysis. Understanding what each user knows is the
--           foundation of the entire system.
-- TABLES  : users, user_skills, skills
-- JOIN    : users → user_skills (user_id)
--           user_skills → skills (skill_id)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 2
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


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 3: List all users' work experience with career field names
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Show each user's professional history alongside the career field
--           each position relates to.
-- WHY     : Work experience is a key factor in career-readiness evaluation.
--           The career field link helps determine if experience is relevant
--           to the user's target role.
-- TABLES  : users, user_experiences, career_fields
-- JOIN    : users → user_experiences (user_id)
--           user_experiences → career_fields (field_id) — LEFT JOIN because
--           field_id is optional and may be NULL.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 3
SELECT
    u.user_id,
    u.full_name,
    ue.job_title,
    ue.organization_name,
    ue.experience_type,
    cf.field_name          AS career_field,
    ue.start_date,
    ue.end_date,
    ue.description
FROM
    users            u
    INNER JOIN user_experiences ue ON u.user_id  = ue.user_id
    LEFT  JOIN career_fields   cf ON ue.field_id = cf.field_id
ORDER BY
    u.full_name,
    ue.start_date DESC;   -- most recent experience first


-- ============================================================================
-- SECTION B: CAREER CATALOG QUERIES (Queries 4–5)
-- ============================================================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 4: List all career roles with field names and requirement counts
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Provide a high-level catalog view of all career roles showing
--           how many requirements each one has defined.
-- WHY     : Helps administrators audit completeness and helps users browse
--           available roles before setting career goals.
-- TABLES  : career_roles, career_fields, career_requirements (aggregated)
-- JOIN    : career_roles → career_fields (field_id)
--           career_roles → career_requirements (role_id)
-- NOTE    : LEFT JOIN on career_requirements so roles with zero requirements
--           still appear (they need attention from admins).
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 4
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


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 5: For a specific role, list ALL requirements with full details
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Show every requirement for a given role. Because career_requirements
--           uses a polymorphic pattern, we LEFT JOIN skills, qualification_types,
--           and certifications to resolve the human-readable name based on
--           requirement_type.
-- WHY     : A user exploring "Full-Stack Developer" needs to see every skill,
--           education level, and certification they must acquire.
-- TABLES  : career_roles, career_requirements, skills, qualification_types,
--           certifications
-- PATTERN : Polymorphic FK resolution — COALESCE picks the relevant name.
-- NOTE    : Change the WHERE clause to target any role_title you like.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 5
SELECT
    cr.role_title,
    creq.requirement_type,
    creq.is_mandatory,
    creq.priority,
    creq.expected_proficiency,
    -- Resolve the polymorphic FK to a human-readable name
    CASE creq.requirement_type
        WHEN 'skill'         THEN s.skill_name
        WHEN 'education'     THEN qt.type_name
        WHEN 'certification' THEN c.certification_name
        ELSE NULL
    END                     AS requirement_name,
    -- Extra detail depending on type
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
    cr.role_title = 'Full-Stack Developer'   -- [Note: change this to explore other roles]
ORDER BY
    creq.is_mandatory DESC,   -- mandatory first
    creq.priority,
    creq.requirement_type;


-- ============================================================================
-- SECTION C: GAP ANALYSIS QUERIES (Queries 6–9)
-- ============================================================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 6: Show a specific user's gap analysis with readiness & all gap items
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Display the complete gap analysis report for a single user,
--           including overall readiness percentage and every individual gap.
-- WHY     : This is the core value of SkillBridge — showing users exactly
--           what they are missing and how severe each gap is.
-- TABLES  : career_gap_analyses, career_gap_items, gap_types, users,
--           career_goals, career_roles
-- JOIN    : career_gap_analyses → career_gap_items (analysis_id)
--           career_gap_items → gap_types (gap_type_id)
--           career_gap_analyses → career_goals → career_roles (for context)
-- NOTE    : Change the WHERE user_id to view any user.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 6
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
    u.user_id = 1              -- [Note: change to the desired user]
ORDER BY
    cga.analysis_date DESC,
    cgi.priority,
    cgi.gap_severity DESC;


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 7: Find all users whose readiness percentage is below 60%
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Identify users who are far from ready for their target roles.
-- WHY     : Enables proactive intervention — the system or a counselor can
--           reach out to users who need the most help.
-- TABLES  : career_gap_analyses, users, career_goals, career_roles
-- FILTER  : overall_readiness_pct < 60
-- NOTE    : We use DISTINCT ON to get only the LATEST analysis per user-goal
--           pair, avoiding duplicates from older snapshots.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 7
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


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 8: Compare a user's current skills vs. required skills for target role
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Side-by-side comparison of what the user has vs. what the role
--           requires for a specific career goal — the heart of skill gap analysis.
-- WHY     : This lets the user (and the AI engine) see each required skill,
--           what proficiency is expected, what the user actually has, and
--           whether that requirement is met.
-- TABLES  : career_goals, career_roles, career_requirements, skills,
--           user_skills
-- SCOPE   : Filtered by cg.goal_id = 1 to target Priya's specific goal (Full-Stack
--           Developer) without cross-contaminating requirements from other goals.
-- LOGIC   : LEFT JOIN user_skills so unmet skills show NULL (the user doesn't
--           have them at all). The "is_met" column compares proficiency ranks
--           using a CASE expression that maps text levels to numbers.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 8
SELECT
    cr.role_title                AS target_role,
    s.skill_name,
    s.category                   AS skill_category,
    creq.expected_proficiency    AS required_proficiency,
    creq.is_mandatory,
    COALESCE(us.proficiency_level, 'not_acquired')
                                 AS user_proficiency,
    us.years_of_experience       AS user_years,
    -- Compare proficiency levels numerically to decide if the requirement is met
    CASE
        WHEN us.proficiency_level IS NULL THEN 'NOT MET'
        WHEN (
            -- Map proficiency text to a numeric rank for comparison
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
    END                          AS is_met
FROM
    career_goals        cg
    INNER JOIN career_roles        cr   ON cg.role_id               = cr.role_id
    INNER JOIN career_requirements creq ON cr.role_id               = creq.role_id
    INNER JOIN skills              s    ON creq.skill_id            = s.skill_id
    LEFT  JOIN user_skills         us   ON cg.user_id               = us.user_id
                                       AND creq.skill_id            = us.skill_id
WHERE
    cg.goal_id = 1                        -- Target specific goal (Priya -> Full-Stack Developer)
    AND creq.requirement_type = 'skill'   -- only compare skill requirements
ORDER BY
    creq.is_mandatory DESC,
    s.skill_name;


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 9: Show users who have career breaks and their current gap analysis
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Correlate career breaks with gap analysis results to understand
--           whether a break has impacted readiness.
-- WHY     : Career breaks are neutral information — this query lets counselors
--           see if users returning from breaks need extra support.
-- TABLES  : users, career_breaks, career_gap_analyses, career_goals,
--           career_roles
-- JOIN    : users → career_breaks (user_id)
--           users → career_gap_analyses (user_id) — LEFT JOIN so users with
--           breaks but no analysis yet still appear.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 9
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


-- ============================================================================
-- SECTION D: LEARNING & PROGRESS QUERIES (Queries 10–12)
-- ============================================================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 10: Show a user's learning plan with items, resources & completion
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Display the full learning plan for a user, including every task,
--           the linked learning resource, and whether it is done.
-- WHY     : This is the actionable roadmap the user follows to close gaps.
--           Seeing linked resources makes it a one-stop study dashboard.
-- TABLES  : learning_plans, learning_plan_items, learning_resources, users
-- JOIN    : learning_plans → learning_plan_items (plan_id)
--           learning_plan_items → learning_resources (resource_id) — LEFT JOIN
--           because not every task is tied to a formal resource.
-- NOTE    : Change the WHERE user_id to view any user's plan.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 10
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
    lr.estimated_duration_hours
FROM
    learning_plans       lp
    INNER JOIN users                u   ON lp.user_id     = u.user_id
    INNER JOIN learning_plan_items  lpi ON lp.plan_id     = lpi.plan_id
    LEFT  JOIN learning_resources   lr  ON lpi.resource_id = lr.resource_id
WHERE
    u.user_id = 1                -- [Note: change to the desired user]
ORDER BY
    lp.plan_name,
    lpi.sequence_order;


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 11: Count completed vs pending vs in-progress learning tasks per user
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Aggregate view of how many learning tasks each user has in each
--           status category.
-- WHY     : Gives a quick progress snapshot — useful for dashboards and
--           progress reports. Admins can spot users who are stalling.
-- TABLES  : users, learning_plans, learning_plan_items
-- AGGREGATE: COUNT with CASE (conditional aggregation pattern)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 11
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


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 12: Find learning resources that teach skills required by a career role
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Given a specific career role, find all learning resources that
--           teach skills the role demands.
-- WHY     : Automates "What should I study?" — the system can recommend
--           courses, books, and tutorials directly linked to requirements.
-- TABLES  : career_roles, career_requirements, skills, resource_skills,
--           learning_resources
-- JOIN    : career_requirements → skills (skill_id)
--           resource_skills → learning_resources (resource_id)
--           resource_skills → skills (skill_id) — links resources to the
--           same skills the role requires.
-- NOTE    : Change the WHERE role_title to explore other roles.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 12
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
    cr.role_title = 'Full-Stack Developer'   -- [Note: change this to explore other roles]
    AND creq.requirement_type = 'skill'
    AND lr.is_active = TRUE
ORDER BY
    s.skill_name,
    lr.resource_type;


-- ============================================================================
-- SECTION E: ASSESSMENT QUERIES (Queries 13–14)
-- ============================================================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 13: Show a user's assessment history with pass/fail and scores
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Display every assessment attempt for a user, including the skill
--           tested, score achieved, passing threshold, and result.
-- WHY     : Tracks a user's testing journey — multiple attempts per assessment
--           are allowed, so this shows improvement over time.
-- TABLES  : assessment_results, assessments, skills, users
-- JOIN    : assessment_results → assessments (assessment_id)
--           assessments → skills (skill_id)
-- NOTE    : Change the WHERE user_id to view any user's history.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 13
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
    -- Show a human-friendly result label
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
    u.user_id = 1              -- [Note: change to the desired user]
ORDER BY
    s.skill_name,
    ar.attempt_date;


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 14: Find users who improved (passed after previously failing same
--           assessment)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : Identify users who failed an assessment at least once and later
--           passed it — a strong indicator of growth and perseverance.
-- WHY     : Celebrates improvement, identifies effective learning patterns,
--           and validates that the learning plans are working.
-- TABLES  : assessment_results (self-joined), assessments, skills, users
-- TECHNIQUE: Subquery — find assessments where a user has at least one fail
--            followed chronologically by a pass.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 14
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
    -- Self-join: find a PASS by the same user on the same assessment AFTER a FAIL
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


-- ============================================================================
-- SECTION F: REPORTING QUERY (Query 15)
-- ============================================================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 15: Career Readiness Dashboard (Optimized with Isolated CTEs)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PURPOSE : A comprehensive dashboard view. For EACH user, show their target
--           role, career field, latest readiness percentage, number of gaps
--           identified vs. resolved, and number of learning tasks completed.
-- WHY     : This is the executive-level report — one row per user-goal with
--           all key metrics side-by-side for quick decision making.
-- TABLES  : users, career_goals, career_roles, career_fields,
--           career_gap_analyses, career_gap_items, learning_plans,
--           learning_plan_items
-- TECHNIQUE: Multi-CTE architecture — isolates gap aggregation and learning task
--            aggregation into independent subqueries before joining. This prevents
--            the Cartesian product (M gap items × N plan items) that occurs
--            when joining two 1-to-many child tables directly in the main FROM clause.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Query 15

-- Step 1: CTE to get the latest analysis per user-goal pair
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
        analysis_date DESC     -- pick the most recent snapshot
),

-- Step 2: CTE to pre-aggregate gap metrics per analysis (avoids Cartesian joins)
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

-- Step 3: CTE to pre-aggregate learning tasks per user-goal (avoids Cartesian joins)
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

-- Step 4: Main query — join user-goal rows to pre-aggregated CTE summaries
SELECT
    u.full_name,
    u.email,
    cr.role_title              AS target_role,
    cf.field_name              AS career_field,
    cg.status                  AS goal_status,
    cg.target_date             AS goal_target_date,
    la.overall_readiness_pct,
    la.analysis_date           AS latest_analysis_date,

    -- Pre-aggregated gap metrics (COALESCE to 0 if no gaps/analysis exist)
    COALESCE(gs.total_gaps, 0)         AS total_gaps,
    COALESCE(gs.gaps_identified, 0)    AS gaps_identified,
    COALESCE(gs.gaps_in_progress, 0)   AS gaps_in_progress,
    COALESCE(gs.gaps_resolved, 0)      AS gaps_resolved,

    -- Pre-aggregated learning task metrics (COALESCE to 0 if no plan items exist)
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
    la.overall_readiness_pct ASC NULLS LAST,   -- least ready users first
    u.full_name;


-- ============================================================================
-- END OF TEST QUERIES
-- ============================================================================
-- Total: 15 queries across 6 categories
--   • 3 Basic Profile Queries      (Queries 1–3)
--   • 2 Career Catalog Queries     (Queries 4–5)
--   • 4 Gap Analysis Queries       (Queries 6–9)
--   • 3 Learning & Progress Queries (Queries 10–12)
--   • 2 Assessment Queries         (Queries 13–14)
--   • 1 Reporting Dashboard Query  (Query 15)
-- ============================================================================
