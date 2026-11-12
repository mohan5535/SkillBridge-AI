-- ==============================================================================
-- SkillBridge AI — Migration 001 (UP)
-- MIGRATION: 001_add_fk_covering_indexes.sql
-- PURPOSE:
--   Add covering indexes for unindexed foreign key columns across child tables.
--   Prevents table-level sequential scans during parent deletes/updates and
--   dramatically accelerates relational join performance.
--
-- SAFETY:
--   * Uses CREATE INDEX IF NOT EXISTS to prevent locking or failure if present.
--   * 100% reversible via 001_add_fk_covering_indexes_down.sql.
-- ==============================================================================

-- 1. Assessments -> Skills
CREATE INDEX IF NOT EXISTS idx_assessments_skill
    ON assessments(skill_id);

-- 2. Career Goals -> Career Roles
CREATE INDEX IF NOT EXISTS idx_career_goals_role
    ON career_goals(role_id);

-- 3. Career Requirements -> Certifications, Qualifications, Skills
CREATE INDEX IF NOT EXISTS idx_career_requirements_cert
    ON career_requirements(certification_id);

CREATE INDEX IF NOT EXISTS idx_career_requirements_qual
    ON career_requirements(qualification_type_id);

CREATE INDEX IF NOT EXISTS idx_career_requirements_skill
    ON career_requirements(skill_id);

-- 4. Education Records -> Qualification Types
CREATE INDEX IF NOT EXISTS idx_education_records_qual
    ON education_records(qualification_type_id);

-- 5. Career Gap Analyses -> Goals
CREATE INDEX IF NOT EXISTS idx_gap_analyses_goal
    ON career_gap_analyses(goal_id);

-- 6. Career Gap Items -> Requirements & Gap Types
CREATE INDEX IF NOT EXISTS idx_gap_items_requirement
    ON career_gap_items(requirement_id);

CREATE INDEX IF NOT EXISTS idx_gap_items_type
    ON career_gap_items(gap_type_id);

-- 7. Learning Plans -> Goals
CREATE INDEX IF NOT EXISTS idx_learning_plans_goal
    ON learning_plans(goal_id);

-- 8. Learning Plan Items -> Gap Items & Resources
CREATE INDEX IF NOT EXISTS idx_plan_items_gap
    ON learning_plan_items(gap_item_id);

CREATE INDEX IF NOT EXISTS idx_plan_items_resource
    ON learning_plan_items(resource_id);

-- 9. Resource Skills -> Skills
CREATE INDEX IF NOT EXISTS idx_resource_skills_skill
    ON resource_skills(skill_id);

-- 10. Assessment Results -> Assessments
CREATE INDEX IF NOT EXISTS idx_results_assessment
    ON assessment_results(assessment_id);

-- 11. User Certifications -> Certifications
CREATE INDEX IF NOT EXISTS idx_user_certs_cert
    ON user_certifications(certification_id);

-- 12. User Experiences -> Career Fields
CREATE INDEX IF NOT EXISTS idx_user_experiences_field
    ON user_experiences(field_id);

-- 13. User Skills -> Skills
CREATE INDEX IF NOT EXISTS idx_user_skills_skill
    ON user_skills(skill_id);

