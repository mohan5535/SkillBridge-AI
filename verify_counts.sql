-- ============================================================================
-- SkillBridge AI — Read-Only Database Inspection (verify_counts.sql)
--
-- Purpose : Safe, non-destructive query to inspect existing tables and their
--           row counts in skillbridge_db.
-- Mode    : READ ONLY — Does not modify, insert, update, or delete any data.
-- ============================================================================

SET client_encoding = 'UTF8';

-- Verify all 22 tables exist in public schema and report exact row counts
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'users'                 THEN (SELECT COUNT(*) FROM users)
        WHEN table_name = 'career_fields'         THEN (SELECT COUNT(*) FROM career_fields)
        WHEN table_name = 'skills'                THEN (SELECT COUNT(*) FROM skills)
        WHEN table_name = 'qualification_types'   THEN (SELECT COUNT(*) FROM qualification_types)
        WHEN table_name = 'career_roles'          THEN (SELECT COUNT(*) FROM career_roles)
        WHEN table_name = 'certifications'        THEN (SELECT COUNT(*) FROM certifications)
        WHEN table_name = 'education_records'     THEN (SELECT COUNT(*) FROM education_records)
        WHEN table_name = 'user_skills'           THEN (SELECT COUNT(*) FROM user_skills)
        WHEN table_name = 'user_experiences'      THEN (SELECT COUNT(*) FROM user_experiences)
        WHEN table_name = 'user_certifications'   THEN (SELECT COUNT(*) FROM user_certifications)
        WHEN table_name = 'career_breaks'         THEN (SELECT COUNT(*) FROM career_breaks)
        WHEN table_name = 'career_goals'          THEN (SELECT COUNT(*) FROM career_goals)
        WHEN table_name = 'career_requirements'   THEN (SELECT COUNT(*) FROM career_requirements)
        WHEN table_name = 'gap_types'             THEN (SELECT COUNT(*) FROM gap_types)
        WHEN table_name = 'career_gap_analyses'   THEN (SELECT COUNT(*) FROM career_gap_analyses)
        WHEN table_name = 'career_gap_items'      THEN (SELECT COUNT(*) FROM career_gap_items)
        WHEN table_name = 'learning_resources'    THEN (SELECT COUNT(*) FROM learning_resources)
        WHEN table_name = 'resource_skills'       THEN (SELECT COUNT(*) FROM resource_skills)
        WHEN table_name = 'learning_plans'        THEN (SELECT COUNT(*) FROM learning_plans)
        WHEN table_name = 'learning_plan_items'   THEN (SELECT COUNT(*) FROM learning_plan_items)
        WHEN table_name = 'assessments'           THEN (SELECT COUNT(*) FROM assessments)
        WHEN table_name = 'assessment_results'    THEN (SELECT COUNT(*) FROM assessment_results)
        ELSE NULL
    END AS actual_row_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

