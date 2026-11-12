/**
 * Domain Vocabularies & Enum Constants.
 * Strictly frozen to match table CHECK constraints in schema.sql.
 */

export const EDUCATION_STATUS = Object.freeze([
  'in_progress',
  'completed',
  'incomplete',
  'deferred',
]);

export const PROFICIENCY_LEVEL = Object.freeze([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

export const EXPERIENCE_TYPE = Object.freeze([
  'full_time',
  'part_time',
  'internship',
  'freelance',
  'volunteer',
  'apprenticeship',
]);

export const USER_CERT_STATUS = Object.freeze([
  'active',
  'expired',
  'revoked',
  'in_progress',
]);

export const BREAK_REASON = Object.freeze([
  'parental_leave',
  'health',
  'caregiving',
  'education',
  'travel',
  'personal',
  'layoff',
  'career_change',
  'other',
]);

export const REQUIREMENT_TYPE = Object.freeze([
  'skill',
  'education',
  'certification',
  'experience',
  'eligibility',
  'other',
]);

export const CAREER_GOAL_STATUS = Object.freeze([
  'exploring',
  'active',
  'achieved',
  'paused',
  'abandoned',
]);

export const GAP_SEVERITY = Object.freeze([
  'low',
  'medium',
  'high',
  'critical',
]);

export const GAP_ITEM_STATUS = Object.freeze([
  'identified',
  'in_progress',
  'resolved',
  'not_applicable',
]);

export const LEARNING_PLAN_STATUS = Object.freeze([
  'draft',
  'active',
  'completed',
  'paused',
  'abandoned',
]);

export const LEARNING_ITEM_STATUS = Object.freeze([
  'pending',
  'in_progress',
  'completed',
  'skipped',
]);

export const ASSESSMENT_TYPE = Object.freeze([
  'quiz',
  'practical',
  'project',
  'interview',
  'peer_review',
  'certification_exam',
  'other',
]);

