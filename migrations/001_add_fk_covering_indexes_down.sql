-- ==============================================================================
-- SkillBridge AI — Migration 001 (DOWN / REVERT)
-- MIGRATION: 001_add_fk_covering_indexes_down.sql
-- PURPOSE:
--   Roll back covering indexes added in migration 001.
-- ==============================================================================

DROP INDEX IF EXISTS idx_assessments_skill;
DROP INDEX IF EXISTS idx_career_goals_role;
DROP INDEX IF EXISTS idx_career_requirements_cert;
DROP INDEX IF EXISTS idx_career_requirements_qual;
DROP INDEX IF EXISTS idx_career_requirements_skill;
DROP INDEX IF EXISTS idx_education_records_qual;
DROP INDEX IF EXISTS idx_gap_analyses_goal;
DROP INDEX IF EXISTS idx_gap_items_requirement;
DROP INDEX IF EXISTS idx_gap_items_type;
DROP INDEX IF EXISTS idx_learning_plans_goal;
DROP INDEX IF EXISTS idx_plan_items_gap;
DROP INDEX IF EXISTS idx_plan_items_resource;
DROP INDEX IF EXISTS idx_resource_skills_skill;
DROP INDEX IF EXISTS idx_results_assessment;
DROP INDEX IF EXISTS idx_user_certs_cert;
DROP INDEX IF EXISTS idx_user_experiences_field;
DROP INDEX IF EXISTS idx_user_skills_skill;

