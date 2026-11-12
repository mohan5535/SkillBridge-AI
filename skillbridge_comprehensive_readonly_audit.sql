-- ============================================================================
-- SkillBridge AI — Comprehensive Read-Only Data Quality Audit
-- PostgreSQL 18 compatible
--
-- Purpose:
--   Check schema objects, row counts, sequence positions, and cross-table
--   business rules without modifying permanent data.
--
-- IMPORTANT:
--   Run this against skillbridge_db AFTER connecting to the database.
--   This script is READ-ONLY except for PostgreSQL's normal query execution.
--   It does not INSERT, UPDATE, DELETE, DROP, or ALTER application tables.
--   Each anomaly query returns rows only when it finds a potential issue.
-- ============================================================================

\echo
\echo '============================================================'
\echo '1. TABLE ROW COUNTS'
\echo '============================================================'

SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'career_fields', COUNT(*) FROM career_fields
UNION ALL SELECT 'skills', COUNT(*) FROM skills
UNION ALL SELECT 'qualification_types', COUNT(*) FROM qualification_types
UNION ALL SELECT 'career_roles', COUNT(*) FROM career_roles
UNION ALL SELECT 'certifications', COUNT(*) FROM certifications
UNION ALL SELECT 'education_records', COUNT(*) FROM education_records
UNION ALL SELECT 'user_skills', COUNT(*) FROM user_skills
UNION ALL SELECT 'user_experiences', COUNT(*) FROM user_experiences
UNION ALL SELECT 'user_certifications', COUNT(*) FROM user_certifications
UNION ALL SELECT 'career_breaks', COUNT(*) FROM career_breaks
UNION ALL SELECT 'career_goals', COUNT(*) FROM career_goals
UNION ALL SELECT 'career_requirements', COUNT(*) FROM career_requirements
UNION ALL SELECT 'gap_types', COUNT(*) FROM gap_types
UNION ALL SELECT 'career_gap_analyses', COUNT(*) FROM career_gap_analyses
UNION ALL SELECT 'career_gap_items', COUNT(*) FROM career_gap_items
UNION ALL SELECT 'learning_resources', COUNT(*) FROM learning_resources
UNION ALL SELECT 'resource_skills', COUNT(*) FROM resource_skills
UNION ALL SELECT 'learning_plans', COUNT(*) FROM learning_plans
UNION ALL SELECT 'learning_plan_items', COUNT(*) FROM learning_plan_items
UNION ALL SELECT 'assessments', COUNT(*) FROM assessments
UNION ALL SELECT 'assessment_results', COUNT(*) FROM assessment_results
ORDER BY table_name;

\echo
\echo '============================================================'
\echo '2. EXPECTED CORE OBJECTS / CONSTRAINTS'
\echo '============================================================'

SELECT
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       AND table_name IN (
         'users','career_fields','skills','qualification_types','career_roles',
         'certifications','education_records','user_skills','user_experiences',
         'user_certifications','career_breaks','career_goals','career_requirements',
         'gap_types','career_gap_analyses','career_gap_items','learning_resources',
         'resource_skills','learning_plans','learning_plan_items','assessments',
         'assessment_results'
       )) AS expected_tables_found_out_of_22,
    (SELECT COUNT(*) FROM information_schema.table_constraints
     WHERE table_schema = 'public' AND constraint_type = 'PRIMARY KEY') AS primary_key_constraints,
    (SELECT COUNT(*) FROM information_schema.table_constraints
     WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY') AS foreign_key_constraints,
    (SELECT COUNT(*) FROM information_schema.table_constraints
     WHERE table_schema = 'public' AND constraint_type = 'UNIQUE') AS unique_constraints,
    (SELECT COUNT(*) FROM information_schema.table_constraints
     WHERE table_schema = 'public' AND constraint_type = 'CHECK') AS check_constraints;

\echo
\echo '============================================================'
\echo '3. FOREIGN KEY ORPHAN CHECKS'
\echo '============================================================'

-- A declared FK should already prevent these. These queries are also useful
-- if data was imported with constraints disabled or changed.
SELECT 'career_roles.field_id' AS check_name, r.role_id::text AS row_id,
       r.field_id::text AS invalid_reference
FROM career_roles r LEFT JOIN career_fields f ON f.field_id = r.field_id
WHERE f.field_id IS NULL
UNION ALL
SELECT 'education_records.user_id', e.education_id::text, e.user_id::text
FROM education_records e LEFT JOIN users u ON u.user_id = e.user_id
WHERE u.user_id IS NULL
UNION ALL
SELECT 'education_records.qualification_type_id', e.education_id::text, e.qualification_type_id::text
FROM education_records e LEFT JOIN qualification_types q ON q.qualification_type_id = e.qualification_type_id
WHERE q.qualification_type_id IS NULL
UNION ALL
SELECT 'user_skills.user_id', s.user_skill_id::text, s.user_id::text
FROM user_skills s LEFT JOIN users u ON u.user_id = s.user_id
WHERE u.user_id IS NULL
UNION ALL
SELECT 'user_skills.skill_id', s.user_skill_id::text, s.skill_id::text
FROM user_skills s LEFT JOIN skills k ON k.skill_id = s.skill_id
WHERE k.skill_id IS NULL
UNION ALL
SELECT 'user_experiences.user_id', e.experience_id::text, e.user_id::text
FROM user_experiences e LEFT JOIN users u ON u.user_id = e.user_id
WHERE u.user_id IS NULL
UNION ALL
SELECT 'user_certifications.user_id', c.user_certification_id::text, c.user_id::text
FROM user_certifications c LEFT JOIN users u ON u.user_id = c.user_id
WHERE u.user_id IS NULL
UNION ALL
SELECT 'career_goals.user_id', g.goal_id::text, g.user_id::text
FROM career_goals g LEFT JOIN users u ON u.user_id = g.user_id
WHERE u.user_id IS NULL
UNION ALL
SELECT 'career_goals.role_id', g.goal_id::text, g.role_id::text
FROM career_goals g LEFT JOIN career_roles r ON r.role_id = g.role_id
WHERE r.role_id IS NULL
UNION ALL
SELECT 'career_gap_analyses.user_id', a.analysis_id::text, a.user_id::text
FROM career_gap_analyses a LEFT JOIN users u ON u.user_id = a.user_id
WHERE u.user_id IS NULL
UNION ALL
SELECT 'career_gap_analyses.goal_id', a.analysis_id::text, a.goal_id::text
FROM career_gap_analyses a LEFT JOIN career_goals g ON g.goal_id = a.goal_id
WHERE g.goal_id IS NULL
UNION ALL
SELECT 'career_gap_items.analysis_id', i.gap_item_id::text, i.analysis_id::text
FROM career_gap_items i LEFT JOIN career_gap_analyses a ON a.analysis_id = i.analysis_id
WHERE a.analysis_id IS NULL
UNION ALL
SELECT 'career_gap_items.gap_type_id', i.gap_item_id::text, i.gap_type_id::text
FROM career_gap_items i LEFT JOIN gap_types t ON t.gap_type_id = i.gap_type_id
WHERE t.gap_type_id IS NULL
UNION ALL
SELECT 'learning_plans.user_id', p.plan_id::text, p.user_id::text
FROM learning_plans p LEFT JOIN users u ON u.user_id = p.user_id
WHERE u.user_id IS NULL
UNION ALL
SELECT 'learning_plan_items.plan_id', i.plan_item_id::text, i.plan_id::text
FROM learning_plan_items i LEFT JOIN learning_plans p ON p.plan_id = i.plan_id
WHERE p.plan_id IS NULL
UNION ALL
SELECT 'learning_plan_items.gap_item_id', i.plan_item_id::text, i.gap_item_id::text
FROM learning_plan_items i LEFT JOIN career_gap_items g ON g.gap_item_id = i.gap_item_id
WHERE i.gap_item_id IS NOT NULL AND g.gap_item_id IS NULL
UNION ALL
SELECT 'learning_plan_items.resource_id', i.plan_item_id::text, i.resource_id::text
FROM learning_plan_items i LEFT JOIN learning_resources r ON r.resource_id = i.resource_id
WHERE i.resource_id IS NOT NULL AND r.resource_id IS NULL
UNION ALL
SELECT 'assessment_results.user_id', r.result_id::text, r.user_id::text
FROM assessment_results r LEFT JOIN users u ON u.user_id = r.user_id
WHERE u.user_id IS NULL
UNION ALL
SELECT 'assessment_results.assessment_id', r.result_id::text, r.assessment_id::text
FROM assessment_results r LEFT JOIN assessments a ON a.assessment_id = r.assessment_id
WHERE a.assessment_id IS NULL
ORDER BY check_name, row_id;

\echo
\echo '============================================================'
\echo '4. CROSS-TABLE OWNERSHIP / GOAL CONSISTENCY'
\echo '============================================================'

-- An analysis should belong to the same user as its career goal.
SELECT 'analysis_user_does_not_match_goal_user' AS issue,
       a.analysis_id::text AS record_id,
       ('analysis user_id=' || a.user_id || ', goal user_id=' || g.user_id) AS details
FROM career_gap_analyses a
JOIN career_goals g ON g.goal_id = a.goal_id
WHERE a.user_id <> g.user_id;

-- A learning plan should belong to the same user as its linked goal.
SELECT 'learning_plan_user_does_not_match_goal_user' AS issue,
       p.plan_id::text AS record_id,
       ('plan user_id=' || p.user_id || ', goal user_id=' || g.user_id) AS details
FROM learning_plans p
JOIN career_goals g ON g.goal_id = p.goal_id
WHERE p.goal_id IS NOT NULL AND p.user_id <> g.user_id;

-- A gap item requirement should belong to the role targeted by the analysis goal.
SELECT 'gap_requirement_role_does_not_match_goal_role' AS issue,
       i.gap_item_id::text AS record_id,
       ('requirement role_id=' || r.role_id || ', goal role_id=' || g.role_id) AS details
FROM career_gap_items i
JOIN career_gap_analyses a ON a.analysis_id = i.analysis_id
JOIN career_goals g ON g.goal_id = a.goal_id
JOIN career_requirements r ON r.requirement_id = i.requirement_id
WHERE i.requirement_id IS NOT NULL AND r.role_id <> g.role_id;

-- A learning-plan item should not link a gap owned by another user's analysis.
SELECT 'learning_item_gap_belongs_to_different_user' AS issue,
       i.plan_item_id::text AS record_id,
       ('plan user_id=' || p.user_id || ', gap analysis user_id=' || a.user_id) AS details
FROM learning_plan_items i
JOIN learning_plans p ON p.plan_id = i.plan_id
JOIN career_gap_items gi ON gi.gap_item_id = i.gap_item_id
JOIN career_gap_analyses a ON a.analysis_id = gi.analysis_id
WHERE i.gap_item_id IS NOT NULL AND p.user_id <> a.user_id;

-- A plan item's gap should normally relate to the same target role as the plan's goal.
SELECT 'learning_item_gap_role_differs_from_plan_goal' AS issue,
       i.plan_item_id::text AS record_id,
       ('gap role_id=' || goal_gap.role_id || ', plan goal role_id=' || plan_goal.role_id) AS details
FROM learning_plan_items i
JOIN learning_plans p ON p.plan_id = i.plan_id
JOIN career_gap_items gi ON gi.gap_item_id = i.gap_item_id
JOIN career_gap_analyses a ON a.analysis_id = gi.analysis_id
JOIN career_goals goal_gap ON goal_gap.goal_id = a.goal_id
JOIN career_goals plan_goal ON plan_goal.goal_id = p.goal_id
WHERE i.gap_item_id IS NOT NULL
  AND p.goal_id IS NOT NULL
  AND goal_gap.role_id <> plan_goal.role_id;

\echo
\echo '============================================================'
\echo '5. DATE / TIMELINE ANOMALIES'
\echo '============================================================'

-- These are business warnings; the schema already blocks some date errors.
SELECT 'education_end_before_start' AS issue, education_id::text AS record_id,
       ('start=' || start_date || ', end=' || end_date) AS details
FROM education_records
WHERE start_date IS NOT NULL AND end_date IS NOT NULL AND end_date < start_date
UNION ALL
SELECT 'experience_end_before_start', experience_id::text,
       ('start=' || start_date || ', end=' || end_date)
FROM user_experiences
WHERE end_date IS NOT NULL AND end_date < start_date
UNION ALL
SELECT 'career_break_end_before_start', break_id::text,
       ('start=' || start_date || ', end=' || end_date)
FROM career_breaks
WHERE end_date IS NOT NULL AND end_date < start_date
UNION ALL
SELECT 'cert_expiry_before_obtained', user_certification_id::text,
       ('obtained=' || date_obtained || ', expiry=' || expiry_date)
FROM user_certifications
WHERE date_obtained IS NOT NULL AND expiry_date IS NOT NULL AND expiry_date < date_obtained
UNION ALL
SELECT 'learning_plan_target_before_start', plan_id::text,
       ('start=' || start_date || ', target=' || target_completion_date)
FROM learning_plans
WHERE start_date IS NOT NULL AND target_completion_date IS NOT NULL
  AND target_completion_date < start_date
UNION ALL
SELECT 'learning_item_completed_date_without_completed_status', plan_item_id::text,
       ('status=' || status || ', completed_date=' || completed_date)
FROM learning_plan_items
WHERE completed_date IS NOT NULL AND status <> 'completed'
UNION ALL
SELECT 'learning_item_due_date_before_plan_start', i.plan_item_id::text,
       ('plan start=' || p.start_date || ', due=' || i.due_date)
FROM learning_plan_items i
JOIN learning_plans p ON p.plan_id = i.plan_id
WHERE p.start_date IS NOT NULL AND i.due_date IS NOT NULL AND i.due_date < p.start_date
ORDER BY issue, record_id;

-- Active goals with a target date already in the past need review (not always invalid).
SELECT 'active_goal_target_date_in_past' AS issue,
       goal_id::text AS record_id,
       ('status=' || status || ', target_date=' || target_date || ', today=' || CURRENT_DATE) AS details
FROM career_goals
WHERE status = 'active' AND target_date < CURRENT_DATE;

-- Active learning plans whose target date is already in the past need review.
SELECT 'active_plan_target_date_in_past' AS issue,
       plan_id::text AS record_id,
       ('status=' || status || ', target=' || target_completion_date || ', today=' || CURRENT_DATE) AS details
FROM learning_plans
WHERE status = 'active' AND target_completion_date < CURRENT_DATE;

\echo
\echo '============================================================'
\echo '6. ASSESSMENT SCORE / PASSING LOGIC'
\echo '============================================================'

SELECT 'score_exceeds_max_score' AS issue,
       r.result_id::text AS record_id,
       ('score=' || r.score || ', max_score=' || a.max_score) AS details
FROM assessment_results r
JOIN assessments a ON a.assessment_id = r.assessment_id
WHERE r.score IS NOT NULL AND a.max_score IS NOT NULL AND r.score > a.max_score
UNION ALL
SELECT 'passed_flag_conflicts_with_passing_score',
       r.result_id::text,
       ('score=' || r.score || ', passing_score=' || a.passing_score || ', passed=' || r.passed)
FROM assessment_results r
JOIN assessments a ON a.assessment_id = r.assessment_id
WHERE r.score IS NOT NULL AND a.passing_score IS NOT NULL
  AND r.passed IS DISTINCT FROM (r.score >= a.passing_score)
ORDER BY issue, record_id;

\echo
\echo '============================================================'
\echo '7. DUPLICATE / PROFILE QUALITY CHECKS'
\echo '============================================================'

SELECT 'duplicate_user_skill_pair' AS issue,
       user_id::text AS record_id,
       ('skill_id=' || skill_id || ', rows=' || COUNT(*)) AS details
FROM user_skills
GROUP BY user_id, skill_id
HAVING COUNT(*) > 1
UNION ALL
SELECT 'duplicate_user_certification_pair',
       user_id::text,
       ('certification_id=' || certification_id || ', rows=' || COUNT(*))
FROM user_certifications
GROUP BY user_id, certification_id
HAVING COUNT(*) > 1
UNION ALL
SELECT 'duplicate_resource_skill_pair',
       resource_id::text,
       ('skill_id=' || skill_id || ', rows=' || COUNT(*))
FROM resource_skills
GROUP BY resource_id, skill_id
HAVING COUNT(*) > 1
UNION ALL
SELECT 'blank_user_email',
       user_id::text,
       'email is NULL or blank'
FROM users
WHERE email IS NULL OR BTRIM(email) = ''
UNION ALL
SELECT 'blank_user_name',
       user_id::text,
       'full_name is NULL or blank'
FROM users
WHERE full_name IS NULL OR BTRIM(full_name) = ''
UNION ALL
SELECT 'blank_skill_name',
       skill_id::text,
       'skill_name is NULL or blank'
FROM skills
WHERE skill_name IS NULL OR BTRIM(skill_name) = ''
ORDER BY issue, record_id;

\echo
\echo '============================================================'
\echo '8. REQUIREMENT / GAP COMPLETENESS'
\echo '============================================================'

-- Requirement rows should have the FK appropriate to their type.
-- The CHECK constraint enforces this, but this query independently reports it.
SELECT 'requirement_missing_expected_reference' AS issue,
       requirement_id::text AS record_id,
       ('type=' || requirement_type || ', skill_id=' || COALESCE(skill_id::text,'NULL')
        || ', qualification_type_id=' || COALESCE(qualification_type_id::text,'NULL')
        || ', certification_id=' || COALESCE(certification_id::text,'NULL')) AS details
FROM career_requirements
WHERE (requirement_type = 'skill' AND skill_id IS NULL)
   OR (requirement_type = 'education' AND qualification_type_id IS NULL)
   OR (requirement_type = 'certification' AND certification_id IS NULL);

-- Gap items without a requirement can be valid for broad / contextual gaps.
-- This query flags them as review items, not necessarily errors.
SELECT 'gap_item_without_requirement_review' AS issue,
       gap_item_id::text AS record_id,
       ('gap_type=' || t.type_name || ', description=' || LEFT(i.gap_description, 140)) AS details
FROM career_gap_items i
JOIN gap_types t ON t.gap_type_id = i.gap_type_id
WHERE i.requirement_id IS NULL;

-- Analyses with no gap items can be valid, but may indicate an incomplete analysis.
SELECT 'analysis_has_no_gap_items_review' AS issue,
       a.analysis_id::text AS record_id,
       ('user_id=' || a.user_id || ', goal_id=' || a.goal_id || ', status=' || a.status) AS details
FROM career_gap_analyses a
LEFT JOIN career_gap_items i ON i.analysis_id = a.analysis_id
GROUP BY a.analysis_id, a.user_id, a.goal_id, a.status
HAVING COUNT(i.gap_item_id) = 0;

\echo
\echo '============================================================'
\echo '9. LEARNING PLAN / RESOURCE COVERAGE'
\echo '============================================================'

SELECT 'learning_plan_has_no_items_review' AS issue,
       p.plan_id::text AS record_id,
       ('plan_name=' || p.plan_name || ', status=' || p.status) AS details
FROM learning_plans p
LEFT JOIN learning_plan_items i ON i.plan_id = p.plan_id
GROUP BY p.plan_id, p.plan_name, p.status
HAVING COUNT(i.plan_item_id) = 0;

SELECT 'active_resource_without_url_review' AS issue,
       resource_id::text AS record_id,
       ('resource=' || resource_name || ', type=' || resource_type) AS details
FROM learning_resources
WHERE is_active = TRUE AND (url IS NULL OR BTRIM(url) = '');

SELECT 'resource_skill_proficiency_not_in_standard_scale' AS issue,
       resource_skill_id::text AS record_id,
       ('proficiency_taught=' || COALESCE(proficiency_taught, 'NULL')) AS details
FROM resource_skills
WHERE proficiency_taught IS NOT NULL
  AND proficiency_taught NOT IN ('beginner', 'intermediate', 'advanced', 'expert');

\echo
\echo '============================================================'
\echo '10. SERIAL SEQUENCE HEALTH'
\echo '============================================================'

-- For each SERIAL-backed table, compare the sequence's last value with MAX(id).
-- A sequence behind the table maximum can cause duplicate-key errors on next INSERT.
WITH seq_map(table_name, id_column, sequence_name) AS (
    VALUES
      ('users','user_id','users_user_id_seq'),
      ('career_fields','field_id','career_fields_field_id_seq'),
      ('skills','skill_id','skills_skill_id_seq'),
      ('qualification_types','qualification_type_id','qualification_types_qualification_type_id_seq'),
      ('career_roles','role_id','career_roles_role_id_seq'),
      ('certifications','certification_id','certifications_certification_id_seq'),
      ('education_records','education_id','education_records_education_id_seq'),
      ('user_skills','user_skill_id','user_skills_user_skill_id_seq'),
      ('user_experiences','experience_id','user_experiences_experience_id_seq'),
      ('user_certifications','user_certification_id','user_certifications_user_certification_id_seq'),
      ('career_breaks','break_id','career_breaks_break_id_seq'),
      ('career_goals','goal_id','career_goals_goal_id_seq'),
      ('career_requirements','requirement_id','career_requirements_requirement_id_seq'),
      ('gap_types','gap_type_id','gap_types_gap_type_id_seq'),
      ('career_gap_analyses','analysis_id','career_gap_analyses_analysis_id_seq'),
      ('career_gap_items','gap_item_id','career_gap_items_gap_item_id_seq'),
      ('learning_resources','resource_id','learning_resources_resource_id_seq'),
      ('resource_skills','resource_skill_id','resource_skills_resource_skill_id_seq'),
      ('learning_plans','plan_id','learning_plans_plan_id_seq'),
      ('learning_plan_items','plan_item_id','learning_plan_items_plan_item_id_seq'),
      ('assessments','assessment_id','assessments_assessment_id_seq'),
      ('assessment_results','result_id','assessment_results_result_id_seq')
),
max_ids AS (
    SELECT 'users' AS table_name, MAX(user_id)::bigint AS max_id FROM users
    UNION ALL SELECT 'career_fields', MAX(field_id)::bigint FROM career_fields
    UNION ALL SELECT 'skills', MAX(skill_id)::bigint FROM skills
    UNION ALL SELECT 'qualification_types', MAX(qualification_type_id)::bigint FROM qualification_types
    UNION ALL SELECT 'career_roles', MAX(role_id)::bigint FROM career_roles
    UNION ALL SELECT 'certifications', MAX(certification_id)::bigint FROM certifications
    UNION ALL SELECT 'education_records', MAX(education_id)::bigint FROM education_records
    UNION ALL SELECT 'user_skills', MAX(user_skill_id)::bigint FROM user_skills
    UNION ALL SELECT 'user_experiences', MAX(experience_id)::bigint FROM user_experiences
    UNION ALL SELECT 'user_certifications', MAX(user_certification_id)::bigint FROM user_certifications
    UNION ALL SELECT 'career_breaks', MAX(break_id)::bigint FROM career_breaks
    UNION ALL SELECT 'career_goals', MAX(goal_id)::bigint FROM career_goals
    UNION ALL SELECT 'career_requirements', MAX(requirement_id)::bigint FROM career_requirements
    UNION ALL SELECT 'gap_types', MAX(gap_type_id)::bigint FROM gap_types
    UNION ALL SELECT 'career_gap_analyses', MAX(analysis_id)::bigint FROM career_gap_analyses
    UNION ALL SELECT 'career_gap_items', MAX(gap_item_id)::bigint FROM career_gap_items
    UNION ALL SELECT 'learning_resources', MAX(resource_id)::bigint FROM learning_resources
    UNION ALL SELECT 'resource_skills', MAX(resource_skill_id)::bigint FROM resource_skills
    UNION ALL SELECT 'learning_plans', MAX(plan_id)::bigint FROM learning_plans
    UNION ALL SELECT 'learning_plan_items', MAX(plan_item_id)::bigint FROM learning_plan_items
    UNION ALL SELECT 'assessments', MAX(assessment_id)::bigint FROM assessments
    UNION ALL SELECT 'assessment_results', MAX(result_id)::bigint FROM assessment_results
)
SELECT s.table_name, s.id_column, s.sequence_name, m.max_id,
       ps.last_value AS sequence_last_value
FROM seq_map s
JOIN max_ids m USING (table_name)
LEFT JOIN pg_sequences ps
  ON ps.schemaname = 'public' AND ps.sequencename = s.sequence_name
WHERE ps.sequencename IS NULL
   OR (m.max_id IS NOT NULL AND COALESCE(ps.last_value, 0) < m.max_id)
ORDER BY s.table_name;

\echo
\echo '============================================================'
\echo 'AUDIT FINISHED'
\echo '============================================================'
\echo 'Review any rows returned by anomaly sections. Empty anomaly results are good.'
\echo 'Some sections explicitly say REVIEW: these are warnings, not guaranteed errors.'
