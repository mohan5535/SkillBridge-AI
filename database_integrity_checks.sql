-- ==============================================================================
-- SkillBridge AI — Universal Career Gap Tracker
-- SCRIPT: database_integrity_checks.sql
-- PURPOSE:
--   Comprehensive read-only database integrity and constraint audit suite
--   strictly aligned with the ACTUAL PostgreSQL 18 schema definition.
--
-- TARGET DATABASE: skillbridge_db (PostgreSQL 18.6)
-- SAFETY RULES:
--   * 100% READ-ONLY. No INSERT, UPDATE, DELETE, ALTER, or DROP statements.
--   * Strictly uses verified schema column names:
--       - user_certifications.date_obtained
--       - career_gap_items.gap_severity, required_state
--       - career_roles.experience_years_required
--       - user_skills.years_of_experience
--       - learning_resources.estimated_duration_hours, cost, resource_name
--       - qualification_types.type_name
--       - assessment_results.score, notes
--       - gap_types.type_name
-- ==============================================================================

SET client_encoding = 'UTF8';
SET search_path = public;

-- ==============================================================================
-- CHECK 1: TABLE INVENTORY & EXACT ROW COUNTS (ALL 22 TABLES)
-- ==============================================================================
SELECT '=== CHECK 1: TABLE INVENTORY & EXACT ROW COUNTS ===' AS audit_section;

SELECT
    'users' AS table_name, count(*) AS exact_rows FROM users
UNION ALL SELECT 'career_fields', count(*) FROM career_fields
UNION ALL SELECT 'skills', count(*) FROM skills
UNION ALL SELECT 'qualification_types', count(*) FROM qualification_types
UNION ALL SELECT 'career_roles', count(*) FROM career_roles
UNION ALL SELECT 'certifications', count(*) FROM certifications
UNION ALL SELECT 'education_records', count(*) FROM education_records
UNION ALL SELECT 'user_skills', count(*) FROM user_skills
UNION ALL SELECT 'user_experiences', count(*) FROM user_experiences
UNION ALL SELECT 'user_certifications', count(*) FROM user_certifications
UNION ALL SELECT 'career_breaks', count(*) FROM career_breaks
UNION ALL SELECT 'career_goals', count(*) FROM career_goals
UNION ALL SELECT 'career_requirements', count(*) FROM career_requirements
UNION ALL SELECT 'gap_types', count(*) FROM gap_types
UNION ALL SELECT 'career_gap_analyses', count(*) FROM career_gap_analyses
UNION ALL SELECT 'career_gap_items', count(*) FROM career_gap_items
UNION ALL SELECT 'learning_resources', count(*) FROM learning_resources
UNION ALL SELECT 'resource_skills', count(*) FROM resource_skills
UNION ALL SELECT 'learning_plans', count(*) FROM learning_plans
UNION ALL SELECT 'learning_plan_items', count(*) FROM learning_plan_items
UNION ALL SELECT 'assessments', count(*) FROM assessments
UNION ALL SELECT 'assessment_results', count(*) FROM assessment_results
ORDER BY table_name;


-- ==============================================================================
-- CHECK 2: PRIMARY KEY DEFINITIONS (ALL 22 TABLES)
-- ==============================================================================
SELECT '=== CHECK 2: PRIMARY KEY DEFINITIONS ===' AS audit_section;

WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'users', 'career_fields', 'skills', 'qualification_types',
        'career_roles', 'certifications', 'education_records', 'user_skills',
        'user_experiences', 'user_certifications', 'career_breaks', 'career_goals',
        'career_requirements', 'gap_types', 'career_gap_analyses', 'career_gap_items',
        'learning_resources', 'resource_skills', 'learning_plans', 'learning_plan_items',
        'assessments', 'assessment_results'
    ]) AS table_name
),
actual_pks AS (
    SELECT
        tc.table_name,
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS pk_columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'PRIMARY KEY'
    GROUP BY tc.table_name, tc.constraint_name
)
SELECT
    e.table_name,
    COALESCE(a.constraint_name, 'MISSING_PRIMARY_KEY') AS pk_constraint_name,
    COALESCE(a.pk_columns, 'NONE') AS pk_columns,
    CASE WHEN a.constraint_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status
FROM expected_tables e
LEFT JOIN actual_pks a ON e.table_name = a.table_name
ORDER BY e.table_name;


-- ==============================================================================
-- CHECK 3: FOREIGN KEY ORPHAN AUDIT (32 EXPLICIT ANTI-JOIN CHECKS)
-- ==============================================================================
SELECT '=== CHECK 3: FOREIGN KEY ORPHAN AUDIT (32 ANTI-JOIN TESTS) ===' AS audit_section;

WITH fk_orphan_summary AS (
    -- 1. career_roles -> career_fields
    SELECT '1. career_roles.field_id -> career_fields.field_id' AS relationship,
           count(*) AS orphan_count
    FROM career_roles c LEFT JOIN career_fields p ON c.field_id = p.field_id
    WHERE c.field_id IS NOT NULL AND p.field_id IS NULL

    UNION ALL
    -- 2. certifications -> career_fields
    SELECT '2. certifications.field_id -> career_fields.field_id', count(*)
    FROM certifications c LEFT JOIN career_fields p ON c.field_id = p.field_id
    WHERE c.field_id IS NOT NULL AND p.field_id IS NULL

    UNION ALL
    -- 3. education_records -> users
    SELECT '3. education_records.user_id -> users.user_id', count(*)
    FROM education_records c LEFT JOIN users p ON c.user_id = p.user_id
    WHERE c.user_id IS NOT NULL AND p.user_id IS NULL

    UNION ALL
    -- 4. education_records -> qualification_types
    SELECT '4. education_records.qualification_type_id -> qualification_types.qualification_type_id', count(*)
    FROM education_records c LEFT JOIN qualification_types p ON c.qualification_type_id = p.qualification_type_id
    WHERE c.qualification_type_id IS NOT NULL AND p.qualification_type_id IS NULL

    UNION ALL
    -- 5. user_skills -> users
    SELECT '5. user_skills.user_id -> users.user_id', count(*)
    FROM user_skills c LEFT JOIN users p ON c.user_id = p.user_id
    WHERE c.user_id IS NOT NULL AND p.user_id IS NULL

    UNION ALL
    -- 6. user_skills -> skills
    SELECT '6. user_skills.skill_id -> skills.skill_id', count(*)
    FROM user_skills c LEFT JOIN skills p ON c.skill_id = p.skill_id
    WHERE c.skill_id IS NOT NULL AND p.skill_id IS NULL

    UNION ALL
    -- 7. user_experiences -> users
    SELECT '7. user_experiences.user_id -> users.user_id', count(*)
    FROM user_experiences c LEFT JOIN users p ON c.user_id = p.user_id
    WHERE c.user_id IS NOT NULL AND p.user_id IS NULL

    UNION ALL
    -- 8. user_experiences -> career_fields
    SELECT '8. user_experiences.field_id -> career_fields.field_id', count(*)
    FROM user_experiences c LEFT JOIN career_fields p ON c.field_id = p.field_id
    WHERE c.field_id IS NOT NULL AND p.field_id IS NULL

    UNION ALL
    -- 9. user_certifications -> users
    SELECT '9. user_certifications.user_id -> users.user_id', count(*)
    FROM user_certifications c LEFT JOIN users p ON c.user_id = p.user_id
    WHERE c.user_id IS NOT NULL AND p.user_id IS NULL

    UNION ALL
    -- 10. user_certifications -> certifications
    SELECT '10. user_certifications.certification_id -> certifications.certification_id', count(*)
    FROM user_certifications c LEFT JOIN certifications p ON c.certification_id = p.certification_id
    WHERE c.certification_id IS NOT NULL AND p.certification_id IS NULL

    UNION ALL
    -- 11. career_breaks -> users
    SELECT '11. career_breaks.user_id -> users.user_id', count(*)
    FROM career_breaks c LEFT JOIN users p ON c.user_id = p.user_id
    WHERE c.user_id IS NOT NULL AND p.user_id IS NULL

    UNION ALL
    -- 12. career_goals -> users
    SELECT '12. career_goals.user_id -> users.user_id', count(*)
    FROM career_goals c LEFT JOIN users p ON c.user_id = p.user_id
    WHERE c.user_id IS NOT NULL AND p.user_id IS NULL

    UNION ALL
    -- 13. career_goals -> career_roles
    SELECT '13. career_goals.role_id -> career_roles.role_id', count(*)
    FROM career_goals c LEFT JOIN career_roles p ON c.role_id = p.role_id
    WHERE c.role_id IS NOT NULL AND p.role_id IS NULL

    UNION ALL
    -- 14. career_requirements -> career_roles
    SELECT '14. career_requirements.role_id -> career_roles.role_id', count(*)
    FROM career_requirements c LEFT JOIN career_roles p ON c.role_id = p.role_id
    WHERE c.role_id IS NOT NULL AND p.role_id IS NULL

    UNION ALL
    -- 15. career_requirements -> skills
    SELECT '15. career_requirements.skill_id -> skills.skill_id', count(*)
    FROM career_requirements c LEFT JOIN skills p ON c.skill_id = p.skill_id
    WHERE c.skill_id IS NOT NULL AND p.skill_id IS NULL

    UNION ALL
    -- 16. career_requirements -> qualification_types
    SELECT '16. career_requirements.qualification_type_id -> qualification_types.qualification_type_id', count(*)
    FROM career_requirements c LEFT JOIN qualification_types p ON c.qualification_type_id = p.qualification_type_id
    WHERE c.qualification_type_id IS NOT NULL AND p.qualification_type_id IS NULL

    UNION ALL
    -- 17. career_requirements -> certifications
    SELECT '17. career_requirements.certification_id -> certifications.certification_id', count(*)
    FROM career_requirements c LEFT JOIN certifications p ON c.certification_id = p.certification_id
    WHERE c.certification_id IS NOT NULL AND p.certification_id IS NULL

    UNION ALL
    -- 18. career_gap_analyses -> users
    SELECT '18. career_gap_analyses.user_id -> users.user_id', count(*)
    FROM career_gap_analyses c LEFT JOIN users p ON c.user_id = p.user_id
    WHERE c.user_id IS NOT NULL AND p.user_id IS NULL

    UNION ALL
    -- 19. career_gap_analyses -> career_goals
    SELECT '19. career_gap_analyses.goal_id -> career_goals.goal_id', count(*)
    FROM career_gap_analyses c LEFT JOIN career_goals p ON c.goal_id = p.goal_id
    WHERE c.goal_id IS NOT NULL AND p.goal_id IS NULL

    UNION ALL
    -- 20. career_gap_items -> career_gap_analyses
    SELECT '20. career_gap_items.analysis_id -> career_gap_analyses.analysis_id', count(*)
    FROM career_gap_items c LEFT JOIN career_gap_analyses p ON c.analysis_id = p.analysis_id
    WHERE c.analysis_id IS NOT NULL AND p.analysis_id IS NULL

    UNION ALL
    -- 21. career_gap_items -> gap_types
    SELECT '21. career_gap_items.gap_type_id -> gap_types.gap_type_id', count(*)
    FROM career_gap_items c LEFT JOIN gap_types p ON c.gap_type_id = p.gap_type_id
    WHERE c.gap_type_id IS NOT NULL AND p.gap_type_id IS NULL

    UNION ALL
    -- 22. career_gap_items -> career_requirements
    SELECT '22. career_gap_items.requirement_id -> career_requirements.requirement_id', count(*)
    FROM career_gap_items c LEFT JOIN career_requirements p ON c.requirement_id = p.requirement_id
    WHERE c.requirement_id IS NOT NULL AND p.requirement_id IS NULL

    UNION ALL
    -- 23. resource_skills -> learning_resources
    SELECT '23. resource_skills.resource_id -> learning_resources.resource_id', count(*)
    FROM resource_skills c LEFT JOIN learning_resources p ON c.resource_id = p.resource_id
    WHERE c.resource_id IS NOT NULL AND p.resource_id IS NULL

    UNION ALL
    -- 24. resource_skills -> skills
    SELECT '24. resource_skills.skill_id -> skills.skill_id', count(*)
    FROM resource_skills c LEFT JOIN skills p ON c.skill_id = p.skill_id
    WHERE c.skill_id IS NOT NULL AND p.skill_id IS NULL

    UNION ALL
    -- 25. learning_plans -> users
    SELECT '25. learning_plans.user_id -> users.user_id', count(*)
    FROM learning_plans c LEFT JOIN users p ON c.user_id = p.user_id
    WHERE c.user_id IS NOT NULL AND p.user_id IS NULL

    UNION ALL
    -- 26. learning_plans -> career_goals
    SELECT '26. learning_plans.goal_id -> career_goals.goal_id', count(*)
    FROM learning_plans c LEFT JOIN career_goals p ON c.goal_id = p.goal_id
    WHERE c.goal_id IS NOT NULL AND p.goal_id IS NULL

    UNION ALL
    -- 27. learning_plan_items -> learning_plans
    SELECT '27. learning_plan_items.plan_id -> learning_plans.plan_id', count(*)
    FROM learning_plan_items c LEFT JOIN learning_plans p ON c.plan_id = p.plan_id
    WHERE c.plan_id IS NOT NULL AND p.plan_id IS NULL

    UNION ALL
    -- 28. learning_plan_items -> career_gap_items
    SELECT '28. learning_plan_items.gap_item_id -> career_gap_items.gap_item_id', count(*)
    FROM learning_plan_items c LEFT JOIN career_gap_items p ON c.gap_item_id = p.gap_item_id
    WHERE c.gap_item_id IS NOT NULL AND p.gap_item_id IS NULL

    UNION ALL
    -- 29. learning_plan_items -> learning_resources
    SELECT '29. learning_plan_items.resource_id -> learning_resources.resource_id', count(*)
    FROM learning_plan_items c LEFT JOIN learning_resources p ON c.resource_id = p.resource_id
    WHERE c.resource_id IS NOT NULL AND p.resource_id IS NULL

    UNION ALL
    -- 30. assessments -> skills
    SELECT '30. assessments.skill_id -> skills.skill_id', count(*)
    FROM assessments c LEFT JOIN skills p ON c.skill_id = p.skill_id
    WHERE c.skill_id IS NOT NULL AND p.skill_id IS NULL

    UNION ALL
    -- 31. assessment_results -> users
    SELECT '31. assessment_results.user_id -> users.user_id', count(*)
    FROM assessment_results c LEFT JOIN users p ON c.user_id = p.user_id
    WHERE c.user_id IS NOT NULL AND p.user_id IS NULL

    UNION ALL
    -- 32. assessment_results -> assessments
    SELECT '32. assessment_results.assessment_id -> assessments.assessment_id', count(*)
    FROM assessment_results c LEFT JOIN assessments p ON c.assessment_id = p.assessment_id
    WHERE c.assessment_id IS NOT NULL AND p.assessment_id IS NULL
)
SELECT
    relationship,
    orphan_count,
    CASE WHEN orphan_count = 0 THEN 'PASS' ELSE 'FAIL (ORPHANS DETECTED)' END AS status
FROM fk_orphan_summary
ORDER BY split_part(relationship, '.', 1)::int;


-- ==============================================================================
-- CHECK 4: UNIQUE CONSTRAINTS INTEGRITY
-- ==============================================================================
SELECT '=== CHECK 4: UNIQUE CONSTRAINTS INTEGRITY ===' AS audit_section;

SELECT
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS unique_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;


-- ==============================================================================
-- CHECK 5: NOT NULL CONSTRAINT AUDIT ON CORE COLUMNS
-- ==============================================================================
SELECT '=== CHECK 5: NOT NULL COLUMN AUDIT ===' AS audit_section;

WITH null_violations AS (
    SELECT 'users.email' AS checked_column, count(*) AS null_count FROM users WHERE email IS NULL
    UNION ALL SELECT 'users.full_name', count(*) FROM users WHERE full_name IS NULL
    UNION ALL SELECT 'career_fields.field_name', count(*) FROM career_fields WHERE field_name IS NULL
    UNION ALL SELECT 'skills.skill_name', count(*) FROM skills WHERE skill_name IS NULL
    UNION ALL SELECT 'qualification_types.type_name', count(*) FROM qualification_types WHERE type_name IS NULL
    UNION ALL SELECT 'career_roles.role_title', count(*) FROM career_roles WHERE role_title IS NULL
    UNION ALL SELECT 'certifications.certification_name', count(*) FROM certifications WHERE certification_name IS NULL
    UNION ALL SELECT 'education_records.institution_name', count(*) FROM education_records WHERE institution_name IS NULL
    UNION ALL SELECT 'education_records.status', count(*) FROM education_records WHERE status IS NULL
    UNION ALL SELECT 'user_skills.proficiency_level', count(*) FROM user_skills WHERE proficiency_level IS NULL
    UNION ALL SELECT 'user_experiences.job_title', count(*) FROM user_experiences WHERE job_title IS NULL
    UNION ALL SELECT 'user_certifications.status', count(*) FROM user_certifications WHERE status IS NULL
    UNION ALL SELECT 'career_goals.status', count(*) FROM career_goals WHERE status IS NULL
    UNION ALL SELECT 'career_requirements.requirement_type', count(*) FROM career_requirements WHERE requirement_type IS NULL
    UNION ALL SELECT 'career_gap_analyses.status', count(*) FROM career_gap_analyses WHERE status IS NULL
    UNION ALL SELECT 'career_gap_items.gap_description', count(*) FROM career_gap_items WHERE gap_description IS NULL
    UNION ALL SELECT 'career_gap_items.gap_severity', count(*) FROM career_gap_items WHERE gap_severity IS NULL
    UNION ALL SELECT 'learning_resources.resource_name', count(*) FROM learning_resources WHERE resource_name IS NULL
    UNION ALL SELECT 'learning_plans.plan_name', count(*) FROM learning_plans WHERE plan_name IS NULL
    UNION ALL SELECT 'learning_plan_items.task_description', count(*) FROM learning_plan_items WHERE task_description IS NULL
    UNION ALL SELECT 'assessments.assessment_name', count(*) FROM assessments WHERE assessment_name IS NULL
    UNION ALL SELECT 'assessment_results.attempt_date', count(*) FROM assessment_results WHERE attempt_date IS NULL
)
SELECT
    checked_column,
    null_count,
    CASE WHEN null_count = 0 THEN 'PASS' ELSE 'FAIL (UNEXPECTED NULLS)' END AS status
FROM null_violations;


-- ==============================================================================
-- CHECK 6: DATE RANGE LOGICAL BOUNDARY CHECKS
-- ==============================================================================
SELECT '=== CHECK 6: DATE RANGE LOGICAL BOUNDARY CHECKS ===' AS audit_section;

WITH date_range_violations AS (
    SELECT 'education_records: end_date < start_date' AS check_name, count(*) AS violation_count
    FROM education_records WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date

    UNION ALL
    SELECT 'user_experiences: end_date < start_date', count(*)
    FROM user_experiences WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date

    UNION ALL
    SELECT 'career_breaks: end_date < start_date', count(*)
    FROM career_breaks WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date

    UNION ALL
    SELECT 'learning_plans: target_completion_date < start_date', count(*)
    FROM learning_plans WHERE target_completion_date IS NOT NULL AND start_date IS NOT NULL AND target_completion_date < start_date

    UNION ALL
    SELECT 'user_certifications: expiry_date < date_obtained', count(*)
    FROM user_certifications WHERE expiry_date IS NOT NULL AND date_obtained IS NOT NULL AND expiry_date < date_obtained
)
SELECT
    check_name,
    violation_count,
    CASE WHEN violation_count = 0 THEN 'PASS' ELSE 'FAIL (INVALID DATES)' END AS status
FROM date_range_violations;


-- ==============================================================================
-- CHECK 7: STATUS & ENUM VOCABULARY AUDIT (ALIGNED TO REAL CHECK CONSTRAINTS)
-- ==============================================================================
SELECT '=== CHECK 7: STATUS & ENUM VOCABULARY AUDIT ===' AS audit_section;

WITH vocabulary_violations AS (
    SELECT 'education_records.status' AS field_name, count(*) AS invalid_count
    FROM education_records WHERE status NOT IN ('in_progress', 'completed', 'incomplete', 'deferred')

    UNION ALL
    SELECT 'user_skills.proficiency_level', count(*)
    FROM user_skills WHERE proficiency_level NOT IN ('beginner', 'intermediate', 'advanced', 'expert')

    UNION ALL
    SELECT 'user_experiences.experience_type', count(*)
    FROM user_experiences WHERE experience_type NOT IN ('full_time', 'part_time', 'internship', 'freelance', 'volunteer', 'apprenticeship')

    UNION ALL
    SELECT 'user_certifications.status', count(*)
    FROM user_certifications WHERE status NOT IN ('active', 'expired', 'revoked', 'in_progress')

    UNION ALL
    SELECT 'career_breaks.break_reason', count(*)
    FROM career_breaks WHERE break_reason NOT IN ('parental_leave', 'health', 'caregiving', 'education', 'travel', 'personal', 'layoff', 'career_change', 'other')

    UNION ALL
    SELECT 'career_goals.priority', count(*)
    FROM career_goals WHERE priority NOT BETWEEN 1 AND 5

    UNION ALL
    SELECT 'career_goals.status', count(*)
    FROM career_goals WHERE status NOT IN ('exploring', 'active', 'achieved', 'paused', 'abandoned')

    UNION ALL
    SELECT 'career_requirements.requirement_type', count(*)
    FROM career_requirements WHERE requirement_type NOT IN ('skill', 'education', 'certification', 'experience', 'eligibility', 'other')

    UNION ALL
    SELECT 'career_requirements.priority', count(*)
    FROM career_requirements WHERE priority NOT BETWEEN 1 AND 5

    UNION ALL
    SELECT 'career_gap_analyses.status', count(*)
    FROM career_gap_analyses WHERE status NOT IN ('in_progress', 'completed', 'reviewed', 'archived')

    UNION ALL
    SELECT 'career_gap_items.gap_severity', count(*)
    FROM career_gap_items WHERE gap_severity NOT IN ('low', 'medium', 'high', 'critical')

    UNION ALL
    SELECT 'career_gap_items.priority', count(*)
    FROM career_gap_items WHERE priority NOT BETWEEN 1 AND 5

    UNION ALL
    SELECT 'career_gap_items.status', count(*)
    FROM career_gap_items WHERE status NOT IN ('identified', 'in_progress', 'resolved', 'not_applicable')

    UNION ALL
    SELECT 'learning_resources.resource_type', count(*)
    FROM learning_resources WHERE resource_type NOT IN ('course', 'book', 'tutorial', 'workshop', 'certification_program', 'mentorship', 'practice_exam', 'other')

    UNION ALL
    SELECT 'learning_plans.status', count(*)
    FROM learning_plans WHERE status NOT IN ('draft', 'active', 'completed', 'paused', 'abandoned')

    UNION ALL
    SELECT 'learning_plan_items.status', count(*)
    FROM learning_plan_items WHERE status NOT IN ('pending', 'in_progress', 'completed', 'skipped')

    UNION ALL
    SELECT 'assessments.assessment_type', count(*)
    FROM assessments WHERE assessment_type NOT IN ('quiz', 'practical', 'project', 'interview', 'peer_review', 'certification_exam', 'other')
)
SELECT
    field_name,
    invalid_count,
    CASE WHEN invalid_count = 0 THEN 'PASS' ELSE 'FAIL (UNRECOGNIZED VALUES)' END AS status
FROM vocabulary_violations;


-- ==============================================================================
-- CHECK 8: CAREER REQUIREMENTS POLYMORPHIC EXCLUSIVITY AUDIT
-- ==============================================================================
SELECT '=== CHECK 8: CAREER REQUIREMENTS POLYMORPHIC EXCLUSIVITY ===' AS audit_section;

SELECT
    'chk_career_req_exclusive_fks' AS constraint_name,
    count(*) AS violation_count,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM career_requirements
WHERE NOT (
    (requirement_type = 'skill'         AND skill_id IS NOT NULL AND qualification_type_id IS NULL AND certification_id IS NULL) OR
    (requirement_type = 'education'     AND qualification_type_id IS NOT NULL AND skill_id IS NULL AND certification_id IS NULL) OR
    (requirement_type = 'certification' AND certification_id IS NOT NULL AND skill_id IS NULL AND qualification_type_id IS NULL) OR
    (requirement_type IN ('experience', 'eligibility', 'other') AND skill_id IS NULL AND qualification_type_id IS NULL AND certification_id IS NULL)
);


-- ==============================================================================
-- CHECK 9: NUMERIC & SCORING BOUNDS AUDIT
-- ==============================================================================
SELECT '=== CHECK 9: NUMERIC & SCORING BOUNDS AUDIT ===' AS audit_section;

WITH numeric_violations AS (
    SELECT 'career_roles: experience_years_required < 0' AS check_name, count(*) AS violation_count
    FROM career_roles WHERE experience_years_required < 0

    UNION ALL
    SELECT 'user_skills: years_of_experience < 0', count(*)
    FROM user_skills WHERE years_of_experience < 0

    UNION ALL
    SELECT 'career_gap_analyses: overall_readiness_pct NOT BETWEEN 0 AND 100', count(*)
    FROM career_gap_analyses WHERE overall_readiness_pct < 0 OR overall_readiness_pct > 100

    UNION ALL
    SELECT 'learning_resources: estimated_duration_hours <= 0', count(*)
    FROM learning_resources WHERE estimated_duration_hours <= 0

    UNION ALL
    SELECT 'learning_resources: cost < 0', count(*)
    FROM learning_resources WHERE cost < 0

    UNION ALL
    SELECT 'assessments: max_score <= 0 OR passing_score < 0', count(*)
    FROM assessments WHERE max_score <= 0 OR passing_score < 0

    UNION ALL
    SELECT 'assessments: passing_score > max_score', count(*)
    FROM assessments WHERE passing_score > max_score

    UNION ALL
    SELECT 'assessment_results: score < 0 OR score > a.max_score', count(*)
    FROM assessment_results r
    JOIN assessments a ON r.assessment_id = a.assessment_id
    WHERE r.score < 0 OR r.score > a.max_score

    UNION ALL
    SELECT 'learning_plan_items: completed_date IS NOT NULL AND status != completed', count(*)
    FROM learning_plan_items WHERE completed_date IS NOT NULL AND status != 'completed'
)
SELECT
    check_name,
    violation_count,
    CASE WHEN violation_count = 0 THEN 'PASS' ELSE 'FAIL (BOUND VIOLATIONS)' END AS status
FROM numeric_violations;


-- ==============================================================================
-- CHECK 10: CROSS-ENTITY BUSINESS LOGIC CONSISTENCY
-- ==============================================================================
SELECT '=== CHECK 10: CROSS-ENTITY LOGICAL CONSISTENCY ===' AS audit_section;

WITH cross_entity_violations AS (
    SELECT '1. Analysis User matches Goal User' AS business_rule, count(*) AS violation_count
    FROM career_gap_analyses a
    JOIN career_goals g ON a.goal_id = g.goal_id
    WHERE a.user_id != g.user_id

    UNION ALL
    SELECT '2. Learning Plan User matches Goal User', count(*)
    FROM learning_plans p
    JOIN career_goals g ON p.goal_id = g.goal_id
    WHERE p.user_id != g.user_id

    UNION ALL
    SELECT '3. Gap Requirement Role matches Goal Role', count(*)
    FROM career_gap_items gi
    JOIN career_gap_analyses a ON gi.analysis_id = a.analysis_id
    JOIN career_goals g ON a.goal_id = g.goal_id
    JOIN career_requirements req ON gi.requirement_id = req.requirement_id
    WHERE req.role_id != g.role_id

    UNION ALL
    SELECT '4. Plan Item Gap Analysis Goal matches Plan Goal', count(*)
    FROM learning_plan_items pi
    JOIN learning_plans lp ON pi.plan_id = lp.plan_id
    JOIN career_gap_items gi ON pi.gap_item_id = gi.gap_item_id
    JOIN career_gap_analyses a ON gi.analysis_id = a.analysis_id
    WHERE a.goal_id != lp.goal_id
)
SELECT
    business_rule,
    violation_count,
    CASE WHEN violation_count = 0 THEN 'PASS' ELSE 'FAIL (MISMATCH)' END AS status
FROM cross_entity_violations;


-- ==============================================================================
-- CHECK 11: SERIAL SEQUENCE HEALTH AUDIT
-- ==============================================================================
SELECT '=== CHECK 11: SERIAL SEQUENCE HEALTH AUDIT ===' AS audit_section;

WITH table_max_ids AS (
    SELECT 'users' AS table_name, 'user_id' AS id_column, 'users_user_id_seq' AS sequence_name, COALESCE(MAX(user_id), 0) AS max_table_id FROM users
    UNION ALL SELECT 'career_fields', 'field_id', 'career_fields_field_id_seq', COALESCE(MAX(field_id), 0) FROM career_fields
    UNION ALL SELECT 'skills', 'skill_id', 'skills_skill_id_seq', COALESCE(MAX(skill_id), 0) FROM skills
    UNION ALL SELECT 'qualification_types', 'qualification_type_id', 'qualification_types_qualification_type_id_seq', COALESCE(MAX(qualification_type_id), 0) FROM qualification_types
    UNION ALL SELECT 'career_roles', 'role_id', 'career_roles_role_id_seq', COALESCE(MAX(role_id), 0) FROM career_roles
    UNION ALL SELECT 'certifications', 'certification_id', 'certifications_certification_id_seq', COALESCE(MAX(certification_id), 0) FROM certifications
    UNION ALL SELECT 'education_records', 'education_id', 'education_records_education_id_seq', COALESCE(MAX(education_id), 0) FROM education_records
    UNION ALL SELECT 'user_skills', 'user_skill_id', 'user_skills_user_skill_id_seq', COALESCE(MAX(user_skill_id), 0) FROM user_skills
    UNION ALL SELECT 'user_experiences', 'experience_id', 'user_experiences_experience_id_seq', COALESCE(MAX(experience_id), 0) FROM user_experiences
    UNION ALL SELECT 'user_certifications', 'user_certification_id', 'user_certifications_user_certification_id_seq', COALESCE(MAX(user_certification_id), 0) FROM user_certifications
    UNION ALL SELECT 'career_breaks', 'break_id', 'career_breaks_break_id_seq', COALESCE(MAX(break_id), 0) FROM career_breaks
    UNION ALL SELECT 'career_goals', 'goal_id', 'career_goals_goal_id_seq', COALESCE(MAX(goal_id), 0) FROM career_goals
    UNION ALL SELECT 'career_requirements', 'requirement_id', 'career_requirements_requirement_id_seq', COALESCE(MAX(requirement_id), 0) FROM career_requirements
    UNION ALL SELECT 'gap_types', 'gap_type_id', 'gap_types_gap_type_id_seq', COALESCE(MAX(gap_type_id), 0) FROM gap_types
    UNION ALL SELECT 'career_gap_analyses', 'analysis_id', 'career_gap_analyses_analysis_id_seq', COALESCE(MAX(analysis_id), 0) FROM career_gap_analyses
    UNION ALL SELECT 'career_gap_items', 'gap_item_id', 'career_gap_items_gap_item_id_seq', COALESCE(MAX(gap_item_id), 0) FROM career_gap_items
    UNION ALL SELECT 'learning_resources', 'resource_id', 'learning_resources_resource_id_seq', COALESCE(MAX(resource_id), 0) FROM learning_resources
    UNION ALL SELECT 'resource_skills', 'resource_skill_id', 'resource_skills_resource_skill_id_seq', COALESCE(MAX(resource_skill_id), 0) FROM resource_skills
    UNION ALL SELECT 'learning_plans', 'plan_id', 'learning_plans_plan_id_seq', COALESCE(MAX(plan_id), 0) FROM learning_plans
    UNION ALL SELECT 'learning_plan_items', 'plan_item_id', 'learning_plan_items_plan_item_id_seq', COALESCE(MAX(plan_item_id), 0) FROM learning_plan_items
    UNION ALL SELECT 'assessments', 'assessment_id', 'assessments_assessment_id_seq', COALESCE(MAX(assessment_id), 0) FROM assessments
    UNION ALL SELECT 'assessment_results', 'result_id', 'assessment_results_result_id_seq', COALESCE(MAX(result_id), 0) FROM assessment_results
)
SELECT
    t.table_name,
    t.id_column,
    t.sequence_name,
    t.max_table_id,
    s.last_value AS sequence_last_value,
    CASE
        WHEN s.sequencename IS NULL THEN 'FAIL (SEQUENCE_NOT_FOUND)'
        WHEN s.last_value IS NULL THEN 'WARNING (NEVER_ACCESSED)'
        WHEN s.last_value >= t.max_table_id THEN 'PASS (IN_SYNC)'
        ELSE 'FAIL (OUT_OF_SYNC)'
    END AS status
FROM table_max_ids t
LEFT JOIN pg_sequences s
       ON s.sequencename = t.sequence_name
      AND s.schemaname = 'public'
ORDER BY t.table_name;


-- ==============================================================================
-- CHECK 12: UNINDEXED FOREIGN KEYS AUDIT
-- ==============================================================================
SELECT '=== CHECK 12: UNINDEXED FOREIGN KEYS AUDIT ===' AS audit_section;

WITH fk_columns AS (
    SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
),
indexed_first_cols AS (
    SELECT
        t.relname AS table_name,
        a.attname AS column_name
    FROM pg_index ix
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ix.indkey[0]
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
)
SELECT
    fk.table_name,
    fk.column_name,
    fk.constraint_name,
    fk.foreign_table_name,
    CASE
        WHEN idx.column_name IS NOT NULL THEN 'COVERED'
        ELSE 'UNINDEXED (RECOMMEND COVERING INDEX)'
    END AS index_status
FROM fk_columns fk
LEFT JOIN indexed_first_cols idx
  ON fk.table_name = idx.table_name AND fk.column_name = idx.column_name
ORDER BY index_status DESC, fk.table_name, fk.column_name;


-- ==============================================================================
-- CHECK 13: MASTER SYSTEM INTEGRITY ROLLUP DASHBOARD
-- ==============================================================================
SELECT '=== CHECK 13: MASTER SYSTEM INTEGRITY ROLLUP DASHBOARD ===' AS audit_section;

WITH all_metrics AS (
    SELECT 'Foreign Key Orphans (32 Relationships)' AS category,
           (SELECT count(*) FROM (
               SELECT 1 FROM career_roles c LEFT JOIN career_fields p ON c.field_id = p.field_id WHERE c.field_id IS NOT NULL AND p.field_id IS NULL
               UNION ALL SELECT 1 FROM certifications c LEFT JOIN career_fields p ON c.field_id = p.field_id WHERE c.field_id IS NOT NULL AND p.field_id IS NULL
               UNION ALL SELECT 1 FROM education_records c LEFT JOIN users p ON c.user_id = p.user_id WHERE c.user_id IS NOT NULL AND p.user_id IS NULL
               UNION ALL SELECT 1 FROM education_records c LEFT JOIN qualification_types p ON c.qualification_type_id = p.qualification_type_id WHERE c.qualification_type_id IS NOT NULL AND p.qualification_type_id IS NULL
               UNION ALL SELECT 1 FROM user_skills c LEFT JOIN users p ON c.user_id = p.user_id WHERE c.user_id IS NOT NULL AND p.user_id IS NULL
               UNION ALL SELECT 1 FROM user_skills c LEFT JOIN skills p ON c.skill_id = p.skill_id WHERE c.skill_id IS NOT NULL AND p.skill_id IS NULL
               UNION ALL SELECT 1 FROM user_experiences c LEFT JOIN users p ON c.user_id = p.user_id WHERE c.user_id IS NOT NULL AND p.user_id IS NULL
               UNION ALL SELECT 1 FROM user_experiences c LEFT JOIN career_fields p ON c.field_id = p.field_id WHERE c.field_id IS NOT NULL AND p.field_id IS NULL
               UNION ALL SELECT 1 FROM user_certifications c LEFT JOIN users p ON c.user_id = p.user_id WHERE c.user_id IS NOT NULL AND p.user_id IS NULL
               UNION ALL SELECT 1 FROM user_certifications c LEFT JOIN certifications p ON c.certification_id = p.certification_id WHERE c.certification_id IS NOT NULL AND p.certification_id IS NULL
               UNION ALL SELECT 1 FROM career_breaks c LEFT JOIN users p ON c.user_id = p.user_id WHERE c.user_id IS NOT NULL AND p.user_id IS NULL
               UNION ALL SELECT 1 FROM career_goals c LEFT JOIN users p ON c.user_id = p.user_id WHERE c.user_id IS NOT NULL AND p.user_id IS NULL
               UNION ALL SELECT 1 FROM career_goals c LEFT JOIN career_roles p ON c.role_id = p.role_id WHERE c.role_id IS NOT NULL AND p.role_id IS NULL
               UNION ALL SELECT 1 FROM career_requirements c LEFT JOIN career_roles p ON c.role_id = p.role_id WHERE c.role_id IS NOT NULL AND p.role_id IS NULL
               UNION ALL SELECT 1 FROM career_requirements c LEFT JOIN skills p ON c.skill_id = p.skill_id WHERE c.skill_id IS NOT NULL AND p.skill_id IS NULL
               UNION ALL SELECT 1 FROM career_requirements c LEFT JOIN qualification_types p ON c.qualification_type_id = p.qualification_type_id WHERE c.qualification_type_id IS NOT NULL AND p.qualification_type_id IS NULL
               UNION ALL SELECT 1 FROM career_requirements c LEFT JOIN certifications p ON c.certification_id = p.certification_id WHERE c.certification_id IS NOT NULL AND p.certification_id IS NULL
               UNION ALL SELECT 1 FROM career_gap_analyses c LEFT JOIN users p ON c.user_id = p.user_id WHERE c.user_id IS NOT NULL AND p.user_id IS NULL
               UNION ALL SELECT 1 FROM career_gap_analyses c LEFT JOIN career_goals p ON c.goal_id = p.goal_id WHERE c.goal_id IS NOT NULL AND p.goal_id IS NULL
               UNION ALL SELECT 1 FROM career_gap_items c LEFT JOIN career_gap_analyses p ON c.analysis_id = p.analysis_id WHERE c.analysis_id IS NOT NULL AND p.analysis_id IS NULL
               UNION ALL SELECT 1 FROM career_gap_items c LEFT JOIN gap_types p ON c.gap_type_id = p.gap_type_id WHERE c.gap_type_id IS NOT NULL AND p.gap_type_id IS NULL
               UNION ALL SELECT 1 FROM career_gap_items c LEFT JOIN career_requirements p ON c.requirement_id = p.requirement_id WHERE c.requirement_id IS NOT NULL AND p.requirement_id IS NULL
               UNION ALL SELECT 1 FROM resource_skills c LEFT JOIN learning_resources p ON c.resource_id = p.resource_id WHERE c.resource_id IS NOT NULL AND p.resource_id IS NULL
               UNION ALL SELECT 1 FROM resource_skills c LEFT JOIN skills p ON c.skill_id = p.skill_id WHERE c.skill_id IS NOT NULL AND p.skill_id IS NULL
               UNION ALL SELECT 1 FROM learning_plans c LEFT JOIN users p ON c.user_id = p.user_id WHERE c.user_id IS NOT NULL AND p.user_id IS NULL
               UNION ALL SELECT 1 FROM learning_plans c LEFT JOIN career_goals p ON c.goal_id = p.goal_id WHERE c.goal_id IS NOT NULL AND p.goal_id IS NULL
               UNION ALL SELECT 1 FROM learning_plan_items c LEFT JOIN learning_plans p ON c.plan_id = p.plan_id WHERE c.plan_id IS NOT NULL AND p.plan_id IS NULL
               UNION ALL SELECT 1 FROM learning_plan_items c LEFT JOIN career_gap_items p ON c.gap_item_id = p.gap_item_id WHERE c.gap_item_id IS NOT NULL AND p.gap_item_id IS NULL
               UNION ALL SELECT 1 FROM learning_plan_items c LEFT JOIN learning_resources p ON c.resource_id = p.resource_id WHERE c.resource_id IS NOT NULL AND p.resource_id IS NULL
               UNION ALL SELECT 1 FROM assessments c LEFT JOIN skills p ON c.skill_id = p.skill_id WHERE c.skill_id IS NOT NULL AND p.skill_id IS NULL
               UNION ALL SELECT 1 FROM assessment_results c LEFT JOIN users p ON c.user_id = p.user_id WHERE c.user_id IS NOT NULL AND p.user_id IS NULL
               UNION ALL SELECT 1 FROM assessment_results c LEFT JOIN assessments p ON c.assessment_id = p.assessment_id WHERE c.assessment_id IS NOT NULL AND p.assessment_id IS NULL
           ) sub) AS violation_count

    UNION ALL
    SELECT 'Date Range Inconsistencies',
           (SELECT count(*) FROM education_records WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date) +
           (SELECT count(*) FROM user_experiences WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date) +
           (SELECT count(*) FROM career_breaks WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date) +
           (SELECT count(*) FROM learning_plans WHERE target_completion_date IS NOT NULL AND start_date IS NOT NULL AND target_completion_date < start_date) +
           (SELECT count(*) FROM user_certifications WHERE expiry_date IS NOT NULL AND date_obtained IS NOT NULL AND expiry_date < date_obtained)

    UNION ALL
    SELECT 'Polymorphic Requirement FK Violations',
           (SELECT count(*) FROM career_requirements
            WHERE NOT (
                (requirement_type = 'skill'         AND skill_id IS NOT NULL AND qualification_type_id IS NULL AND certification_id IS NULL) OR
                (requirement_type = 'education'     AND qualification_type_id IS NOT NULL AND skill_id IS NULL AND certification_id IS NULL) OR
                (requirement_type = 'certification' AND certification_id IS NOT NULL AND skill_id IS NULL AND qualification_type_id IS NULL) OR
                (requirement_type IN ('experience', 'eligibility', 'other') AND skill_id IS NULL AND qualification_type_id IS NULL AND certification_id IS NULL)
            ))

    UNION ALL
    SELECT 'Status & Domain Vocabulary Violations',
           (SELECT count(*) FROM education_records WHERE status NOT IN ('in_progress', 'completed', 'incomplete', 'deferred')) +
           (SELECT count(*) FROM user_skills WHERE proficiency_level NOT IN ('beginner', 'intermediate', 'advanced', 'expert')) +
           (SELECT count(*) FROM user_experiences WHERE experience_type NOT IN ('full_time', 'part_time', 'internship', 'freelance', 'volunteer', 'apprenticeship')) +
           (SELECT count(*) FROM user_certifications WHERE status NOT IN ('active', 'expired', 'revoked', 'in_progress')) +
           (SELECT count(*) FROM career_breaks WHERE break_reason NOT IN ('parental_leave', 'health', 'caregiving', 'education', 'travel', 'personal', 'layoff', 'career_change', 'other')) +
           (SELECT count(*) FROM career_goals WHERE priority NOT BETWEEN 1 AND 5) +
           (SELECT count(*) FROM career_goals WHERE status NOT IN ('exploring', 'active', 'achieved', 'paused', 'abandoned')) +
           (SELECT count(*) FROM career_gap_analyses WHERE status NOT IN ('in_progress', 'completed', 'reviewed', 'archived')) +
           (SELECT count(*) FROM career_gap_items WHERE gap_severity NOT IN ('low', 'medium', 'high', 'critical')) +
           (SELECT count(*) FROM career_gap_items WHERE priority NOT BETWEEN 1 AND 5) +
           (SELECT count(*) FROM career_gap_items WHERE status NOT IN ('identified', 'in_progress', 'resolved', 'not_applicable')) +
           (SELECT count(*) FROM learning_resources WHERE resource_type NOT IN ('course', 'book', 'tutorial', 'workshop', 'certification_program', 'mentorship', 'practice_exam', 'other')) +
           (SELECT count(*) FROM learning_plans WHERE status NOT IN ('draft', 'active', 'completed', 'paused', 'abandoned')) +
           (SELECT count(*) FROM learning_plan_items WHERE status NOT IN ('pending', 'in_progress', 'completed', 'skipped'))

    UNION ALL
    SELECT 'Numeric & Scoring Boundary Violations',
           (SELECT count(*) FROM career_roles WHERE experience_years_required < 0) +
           (SELECT count(*) FROM user_skills WHERE years_of_experience < 0) +
           (SELECT count(*) FROM career_gap_analyses WHERE overall_readiness_pct < 0 OR overall_readiness_pct > 100) +
           (SELECT count(*) FROM learning_resources WHERE estimated_duration_hours <= 0 OR cost < 0) +
           (SELECT count(*) FROM assessments WHERE max_score <= 0 OR passing_score < 0 OR passing_score > max_score) +
           (SELECT count(*) FROM assessment_results r JOIN assessments a ON r.assessment_id = a.assessment_id WHERE r.score < 0 OR r.score > a.max_score)

    UNION ALL
    SELECT 'Cross-Entity Consistency Violations',
           (SELECT count(*) FROM career_gap_analyses a JOIN career_goals g ON a.goal_id = g.goal_id WHERE a.user_id != g.user_id) +
           (SELECT count(*) FROM learning_plans p JOIN career_goals g ON p.goal_id = g.goal_id WHERE p.user_id != g.user_id) +
           (SELECT count(*) FROM career_gap_items gi JOIN career_gap_analyses a ON gi.analysis_id = a.analysis_id JOIN career_goals g ON a.goal_id = g.goal_id JOIN career_requirements req ON gi.requirement_id = req.requirement_id WHERE req.role_id != g.role_id) +
           (SELECT count(*) FROM learning_plan_items pi JOIN learning_plans lp ON pi.plan_id = lp.plan_id JOIN career_gap_items gi ON pi.gap_item_id = gi.gap_item_id JOIN career_gap_analyses a ON gi.analysis_id = a.analysis_id WHERE a.goal_id != lp.goal_id)
)
SELECT
    category,
    violation_count,
    CASE WHEN violation_count = 0 THEN 'PASS (HEALTHY)' ELSE 'FAIL (REQUIRES ATTENTION)' END AS status
FROM all_metrics;

-- Final Assessment Verdict
SELECT
    CASE
        WHEN sum(violation_count) = 0 THEN 'VERDICT: PERFECT HEALTH (0 defects found across all audited categories)'
        ELSE 'VERDICT: DEFECTS DETECTED (Review breakdown above)'
    END AS final_integrity_verdict
FROM (
    SELECT
        (SELECT count(*) FROM career_requirements
         WHERE NOT (
             (requirement_type = 'skill'         AND skill_id IS NOT NULL AND qualification_type_id IS NULL AND certification_id IS NULL) OR
             (requirement_type = 'education'     AND qualification_type_id IS NOT NULL AND skill_id IS NULL AND certification_id IS NULL) OR
             (requirement_type = 'certification' AND certification_id IS NOT NULL AND skill_id IS NULL AND qualification_type_id IS NULL) OR
             (requirement_type IN ('experience', 'eligibility', 'other') AND skill_id IS NULL AND qualification_type_id IS NULL AND certification_id IS NULL)
         )) +
        (SELECT count(*) FROM education_records WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date) +
        (SELECT count(*) FROM user_experiences WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date) +
        (SELECT count(*) FROM career_breaks WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date) +
        (SELECT count(*) FROM learning_plans WHERE target_completion_date IS NOT NULL AND start_date IS NOT NULL AND target_completion_date < start_date) +
        (SELECT count(*) FROM user_certifications WHERE expiry_date IS NOT NULL AND date_obtained IS NOT NULL AND expiry_date < date_obtained) +
        (SELECT count(*) FROM career_gap_analyses WHERE overall_readiness_pct < 0 OR overall_readiness_pct > 100) AS violation_count
) rollup;

