-- SkillBridge AI: Corrected read-only integrity audit
-- Database: skillbridge_db (PostgreSQL 18)
-- This script does NOT INSERT/UPDATE/DELETE or alter permanent schema/data.
-- Temporary tables are used only for collecting FK audit results during this session.

\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';
SET search_path = public;

SELECT 'CHECK 1: TABLE INVENTORY AND EXACT ROW COUNTS' AS audit_section;

SELECT
    t.table_name,
    COALESCE(s.n_live_tup, 0)::bigint AS estimated_rows,
    CASE WHEN c.reltuples < 0 THEN 'ESTIMATE UNAVAILABLE; exact count follows'
         ELSE 'Estimate only; exact count follows' END AS note
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.table_schema AND s.relname = t.table_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

SELECT 'users' AS table_name, count(*) AS exact_rows FROM users
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

SELECT 'CHECK 2: PRIMARY KEY DEFINITIONS' AS audit_section;
SELECT t.table_name,
       COALESCE(string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position), '(MISSING PRIMARY KEY)') AS primary_key_columns,
       CASE WHEN count(kcu.column_name) > 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc
  ON tc.table_schema = t.table_schema AND tc.table_name = t.table_name
 AND tc.constraint_type = 'PRIMARY KEY'
LEFT JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_schema = tc.constraint_schema
 AND kcu.constraint_name = tc.constraint_name
 AND kcu.table_name = tc.table_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;

SELECT 'CHECK 3: FOREIGN KEY DEFINITIONS AND ORPHAN ROWS' AS audit_section;
CREATE TEMP TABLE audit_fk_results (
    table_name text,
    constraint_name text,
    referenced_table text,
    orphan_count bigint
) ON COMMIT PRESERVE ROWS;

DO $audit$
DECLARE
    fk record;
    join_condition text;
    child_nonnull_condition text;
    probe_column text;
    sql_text text;
    n bigint;
BEGIN
    FOR fk IN
        SELECT con.oid,
               con.conname,
               child_ns.nspname AS child_schema,
               child.relname AS child_table,
               parent_ns.nspname AS parent_schema,
               parent.relname AS parent_table,
               con.conkey,
               con.confkey
        FROM pg_constraint con
        JOIN pg_class child ON child.oid = con.conrelid
        JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
        JOIN pg_class parent ON parent.oid = con.confrelid
        JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
        WHERE con.contype = 'f' AND child_ns.nspname = 'public'
        ORDER BY child.relname, con.conname
    LOOP
        -- Build FK column mapping using the constraint's actual child/parent relations.
        SELECT string_agg(format('c.%I = p.%I', ca.attname, pa.attname), ' AND ' ORDER BY k.ord),
               string_agg(format('c.%I IS NOT NULL', ca.attname), ' AND ' ORDER BY k.ord),
               (array_agg(pa.attname ORDER BY k.ord))[1]
          INTO join_condition, child_nonnull_condition, probe_column
        FROM unnest(fk.conkey, fk.confkey) WITH ORDINALITY AS k(child_attnum, parent_attnum, ord)
        JOIN pg_attribute ca ON ca.attrelid = (SELECT oid FROM pg_class WHERE relname = fk.child_table AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = fk.child_schema)) AND ca.attnum = k.child_attnum
        JOIN pg_attribute pa ON pa.attrelid = (SELECT oid FROM pg_class WHERE relname = fk.parent_table AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = fk.parent_schema)) AND pa.attnum = k.parent_attnum;

        sql_text := format(
            'SELECT count(*) FROM %I.%I c LEFT JOIN %I.%I p ON %s WHERE (%s) AND p.%I IS NULL',
            fk.child_schema, fk.child_table, fk.parent_schema, fk.parent_table,
            join_condition, child_nonnull_condition, probe_column
        );
        EXECUTE sql_text INTO n;
        INSERT INTO pg_temp.audit_fk_results VALUES
            (fk.child_table, fk.conname, fk.parent_table, n);
    END LOOP;
END
$audit$;

SELECT table_name, constraint_name, referenced_table, orphan_count,
       CASE WHEN orphan_count = 0 THEN 'PASS' ELSE 'FAIL: ORPHANS FOUND' END AS status
FROM audit_fk_results
ORDER BY table_name, constraint_name;

SELECT 'CHECK 4: UNIQUE CONSTRAINTS' AS audit_section;
SELECT tc.table_name, tc.constraint_name,
       string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS unique_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_schema = kcu.constraint_schema
 AND tc.constraint_name = kcu.constraint_name
 AND tc.table_name = kcu.table_name
WHERE tc.table_schema = 'public' AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;

SELECT 'CHECK 5: NULLS IN ALL DATABASE-DEFINED NOT NULL COLUMNS' AS audit_section;
CREATE TEMP TABLE audit_not_null_results (
    table_name text,
    column_name text,
    null_count bigint
) ON COMMIT PRESERVE ROWS;

DO $audit$
DECLARE col record; n bigint; q text;
BEGIN
    FOR col IN
        SELECT c.table_schema, c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
          AND c.is_nullable = 'NO'
        ORDER BY c.table_name, c.ordinal_position
    LOOP
        q := format('SELECT count(*) FROM %I.%I WHERE %I IS NULL',
                    col.table_schema, col.table_name, col.column_name);
        EXECUTE q INTO n;
        INSERT INTO pg_temp.audit_not_null_results VALUES (col.table_name, col.column_name, n);
    END LOOP;
END
$audit$;

SELECT table_name, column_name, null_count,
       CASE WHEN null_count = 0 THEN 'PASS' ELSE 'FAIL: NULL FOUND' END AS status
FROM audit_not_null_results
ORDER BY table_name, column_name;

SELECT 'CHECK 6: DATE RANGE LOGIC' AS audit_section;
WITH date_checks(check_name, violation_count) AS (
    SELECT 'education_records: end_date before start_date', count(*)
    FROM education_records WHERE end_date IS NOT NULL AND end_date < start_date
    UNION ALL
    SELECT 'user_experiences: end_date before start_date', count(*)
    FROM user_experiences WHERE end_date IS NOT NULL AND end_date < start_date
    UNION ALL
    SELECT 'career_breaks: end_date before start_date', count(*)
    FROM career_breaks WHERE end_date IS NOT NULL AND end_date < start_date
    UNION ALL
    SELECT 'learning_plans: target_completion_date before start_date', count(*)
    FROM learning_plans WHERE target_completion_date IS NOT NULL AND target_completion_date < start_date
    UNION ALL
    SELECT 'user_certifications: expiry_date before date_obtained', count(*)
    FROM user_certifications WHERE expiry_date IS NOT NULL AND date_obtained IS NOT NULL AND expiry_date < date_obtained
)
SELECT check_name, violation_count,
       CASE WHEN violation_count = 0 THEN 'PASS' ELSE 'FAIL: INVALID DATES' END AS status
FROM date_checks;

SELECT 'CHECK 7: DOMAIN VALUES FOR REVIEW (NO ASSUMED VOCABULARY)' AS audit_section;
SELECT 'education_records.status' AS field_name, COALESCE(status, '(NULL)') AS observed_value, count(*) AS rows
FROM education_records GROUP BY status
UNION ALL SELECT 'user_skills.proficiency_level', COALESCE(proficiency_level, '(NULL)'), count(*) FROM user_skills GROUP BY proficiency_level
UNION ALL SELECT 'user_experiences.experience_type', COALESCE(experience_type, '(NULL)'), count(*) FROM user_experiences GROUP BY experience_type
UNION ALL SELECT 'user_certifications.status', COALESCE(status, '(NULL)'), count(*) FROM user_certifications GROUP BY status
UNION ALL SELECT 'career_breaks.break_reason', COALESCE(break_reason, '(NULL)'), count(*) FROM career_breaks GROUP BY break_reason
UNION ALL SELECT 'career_goals.status', COALESCE(status, '(NULL)'), count(*) FROM career_goals GROUP BY status
UNION ALL SELECT 'career_requirements.requirement_type', COALESCE(requirement_type, '(NULL)'), count(*) FROM career_requirements GROUP BY requirement_type
UNION ALL SELECT 'career_gap_analyses.status', COALESCE(status, '(NULL)'), count(*) FROM career_gap_analyses GROUP BY status
UNION ALL SELECT 'career_gap_items.gap_severity', COALESCE(gap_severity, '(NULL)'), count(*) FROM career_gap_items GROUP BY gap_severity
UNION ALL SELECT 'career_gap_items.status', COALESCE(status, '(NULL)'), count(*) FROM career_gap_items GROUP BY status
UNION ALL SELECT 'learning_resources.resource_type', COALESCE(resource_type, '(NULL)'), count(*) FROM learning_resources GROUP BY resource_type
UNION ALL SELECT 'learning_plans.status', COALESCE(status, '(NULL)'), count(*) FROM learning_plans GROUP BY status
UNION ALL SELECT 'learning_plan_items.status', COALESCE(status, '(NULL)'), count(*) FROM learning_plan_items GROUP BY status
ORDER BY field_name, observed_value;

SELECT 'CHECK 8: CAREER REQUIREMENT TARGET COLUMNS' AS audit_section;
SELECT requirement_id, requirement_type, skill_id, qualification_type_id, certification_id,
       'INVALID TARGET COLUMN COMBINATION' AS issue
FROM career_requirements
WHERE NOT (
    (requirement_type = 'skill' AND skill_id IS NOT NULL AND qualification_type_id IS NULL AND certification_id IS NULL)
 OR (requirement_type = 'education' AND qualification_type_id IS NOT NULL AND skill_id IS NULL AND certification_id IS NULL)
 OR (requirement_type = 'certification' AND certification_id IS NOT NULL AND skill_id IS NULL AND qualification_type_id IS NULL)
 OR (requirement_type IN ('experience', 'eligibility', 'other') AND skill_id IS NULL AND qualification_type_id IS NULL AND certification_id IS NULL)
);
SELECT 'career_requirements target-column violations' AS check_name, count(*) AS violation_count,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL: REVIEW ROWS ABOVE' END AS status
FROM career_requirements
WHERE NOT (
    (requirement_type = 'skill' AND skill_id IS NOT NULL AND qualification_type_id IS NULL AND certification_id IS NULL)
 OR (requirement_type = 'education' AND qualification_type_id IS NOT NULL AND skill_id IS NULL AND certification_id IS NULL)
 OR (requirement_type = 'certification' AND certification_id IS NOT NULL AND skill_id IS NULL AND qualification_type_id IS NULL)
 OR (requirement_type IN ('experience', 'eligibility', 'other') AND skill_id IS NULL AND qualification_type_id IS NULL AND certification_id IS NULL)
);

SELECT 'CHECK 9: NUMERIC AND SCORING BOUNDS' AS audit_section;
WITH numeric_checks(check_name, violation_count) AS (
    SELECT 'career_roles: experience_years_required < 0', count(*) FROM career_roles WHERE experience_years_required < 0
    UNION ALL SELECT 'user_skills: years_of_experience < 0', count(*) FROM user_skills WHERE years_of_experience < 0
    UNION ALL SELECT 'career_gap_analyses: readiness outside 0..100', count(*) FROM career_gap_analyses WHERE overall_readiness_pct < 0 OR overall_readiness_pct > 100
    UNION ALL SELECT 'learning_resources: estimated_duration_hours < 0', count(*) FROM learning_resources WHERE estimated_duration_hours < 0
    UNION ALL SELECT 'learning_resources: cost < 0', count(*) FROM learning_resources WHERE cost < 0
    UNION ALL SELECT 'assessments: max_score <= 0', count(*) FROM assessments WHERE max_score <= 0
    UNION ALL SELECT 'assessments: passing_score < 0 or > max_score', count(*) FROM assessments WHERE passing_score < 0 OR passing_score > max_score
    UNION ALL SELECT 'assessment_results: score < 0 or > assessment max_score', count(*)
      FROM assessment_results r JOIN assessments a ON r.assessment_id = a.assessment_id
      WHERE r.score < 0 OR r.score > a.max_score
)
SELECT check_name, violation_count,
       CASE WHEN violation_count = 0 THEN 'PASS' ELSE 'FAIL: NUMERIC BOUND' END AS status
FROM numeric_checks;

SELECT 'CHECK 10: CROSS-ENTITY LOGICAL CONSISTENCY' AS audit_section;
WITH business_checks(check_name, violation_count) AS (
    SELECT 'Analysis user matches goal user', count(*)
    FROM career_gap_analyses a JOIN career_goals g ON a.goal_id = g.goal_id
    WHERE a.user_id <> g.user_id
    UNION ALL
    SELECT 'Gap item requirement role matches goal role', count(*)
    FROM career_gap_items gi
    JOIN career_gap_analyses a ON gi.analysis_id = a.analysis_id
    JOIN career_goals g ON a.goal_id = g.goal_id
    JOIN career_requirements req ON gi.requirement_id = req.requirement_id
    WHERE req.role_id <> g.role_id
    UNION ALL
    SELECT 'Learning plan user matches goal user', count(*)
    FROM learning_plans p JOIN career_goals g ON p.goal_id = g.goal_id
    WHERE p.user_id <> g.user_id
    UNION ALL
    SELECT 'Learning plan item gap goal matches plan goal', count(*)
    FROM learning_plan_items pi
    JOIN learning_plans lp ON pi.plan_id = lp.plan_id
    JOIN career_gap_items gi ON pi.gap_item_id = gi.gap_item_id
    JOIN career_gap_analyses a ON gi.analysis_id = a.analysis_id
    WHERE a.goal_id <> lp.goal_id
)
SELECT check_name, violation_count,
       CASE WHEN violation_count = 0 THEN 'PASS' ELSE 'FAIL: BUSINESS LOGIC' END AS status
FROM business_checks;

SELECT 'CHECK 11: INDEX INVENTORY' AS audit_section;
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

SELECT 'AUDIT SUMMARY: any FAIL rows above require review; this script did not modify permanent database data.' AS final_note;
