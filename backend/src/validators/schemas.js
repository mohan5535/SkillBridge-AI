import { z } from 'zod';
import {
  EDUCATION_STATUS,
  PROFICIENCY_LEVEL,
  EXPERIENCE_TYPE,
  USER_CERT_STATUS,
  BREAK_REASON,
  CAREER_GOAL_STATUS,
  LEARNING_PLAN_STATUS,
  LEARNING_ITEM_STATUS,
} from '../constants/statusEnums.js';
import { hasUnsafeXssPayload, isSafeHttpUrl } from '../utils/inputSanitizer.js';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const safeString = (schema) =>
  schema.refine((val) => !hasUnsafeXssPayload(val), {
    message: 'Unsafe HTML/script tags or dangerous URI schemes are not allowed',
  });

const isoDateSchema = z
  .string()
  .regex(ISO_DATE_REGEX, 'Date format must be YYYY-MM-DD')
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid calendar date' });

const isoTimestampOrDateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .or(isoDateSchema);

const safeOptionalHttpUrl = (maxLen = 500) =>
  z
    .string()
    .url('Invalid URL format')
    .max(maxLen)
    .refine((val) => isSafeHttpUrl(val), {
      message: 'URL must use http:// or https:// protocol',
    })
    .optional()
    .nullable();

// Date boundary helper: ensures end_date >= start_date
const dateOrderingRefinement = (data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
};

/**
 * Factory for positive-integer route parameter schemas.
 */
export function positiveIntParam(paramName = 'id') {
  return z
    .object({
      [paramName]: z
        .string()
        .regex(/^[1-9]\d{0,9}$/, `${paramName} must be a positive integer`),
    })
    .strict();
}

/**
 * Empty body schema for parameter-only POST actions (analyze, generate-roadmap, logout).
 */
export const emptyBodySchema = z.preprocess(
  (val) => (val === undefined ? {} : val),
  z.object({}).strict('Unexpected request body parameters are not allowed')
);

// 1. User Creation Schema (Aligned to PostgreSQL `users` table)
export const createUserSchema = z
  .object({
    email: z.string().trim().email('Invalid email address format').max(255),
    full_name: safeString(z.string().trim().min(1, 'Full name is required').max(200)),
    phone: safeString(z.string().trim().max(20)).optional().nullable(),
    country: safeString(z.string().trim().max(100)).optional().nullable(),
    state_or_region: safeString(z.string().trim().max(100)).optional().nullable(),
    state_province: safeString(z.string().trim().max(100)).optional().nullable(), // legacy alias read by userService
    date_of_birth: isoDateSchema.optional().nullable(),
  })
  .strict('Unexpected fields detected on user creation payload');

// 1b. User Profile Update Schema (PUT /api/users/:id)
export const updateUserSchema = z
  .object({
    full_name: safeString(z.string().trim().min(1, 'Full name cannot be empty').max(200)).optional(),
    phone: safeString(z.string().trim().max(20)).optional().nullable(),
    country: safeString(z.string().trim().max(100)).optional().nullable(),
    state_or_region: safeString(z.string().trim().max(100)).optional().nullable(),
    state_province: safeString(z.string().trim().max(100)).optional().nullable(),
    date_of_birth: isoDateSchema.optional().nullable(),
  })
  .strict('Unexpected fields detected on user profile update payload')
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one updatable profile field is required',
  });

// 2. Education Record Schema (Aligned to PostgreSQL `education_records`)
export const educationSchema = z
  .object({
    qualification_type_id: z.number().int().positive(),
    institution_name: safeString(z.string().trim().min(1).max(300)),
    field_of_study: safeString(z.string().trim().max(200)).optional().nullable(),
    start_date: isoDateSchema.optional().nullable(),
    end_date: isoDateSchema.optional().nullable(),
    grade_or_score: safeString(z.string().trim().max(50)).optional().nullable(),
    grade_or_gpa: safeString(z.string().trim().max(50)).optional().nullable(), // legacy alias
    status: z.enum(EDUCATION_STATUS).optional(),
  })
  .strict('Unexpected fields detected on education payload')
  .refine(dateOrderingRefinement, {
    message: 'end_date must be greater than or equal to start_date',
    path: ['end_date'],
  });

// 3. User Skill Schema (Aligned to PostgreSQL `user_skills`)
export const userSkillSchema = z
  .object({
    skill_id: z.number().int().positive(),
    proficiency_level: z.enum(PROFICIENCY_LEVEL),
    years_of_experience: z.number().finite().min(0, 'years_of_experience must be non-negative').max(80).optional(),
    evidence: safeString(z.string().trim().max(500)).optional().nullable(),
    evidence_url: safeOptionalHttpUrl(500),
    last_used_date: isoDateSchema.optional().nullable(),
  })
  .strict('Unexpected fields detected on user skill payload');

// 4. Work Experience Schema (Aligned to PostgreSQL `user_experiences`)
export const userExperienceSchema = z
  .object({
    job_title: safeString(z.string().trim().min(1).max(200)),
    organization_name: safeString(z.string().trim().min(1).max(300)).optional(),
    company_name: safeString(z.string().trim().min(1).max(300)).optional(), // legacy alias
    experience_type: z.enum(EXPERIENCE_TYPE).optional(),
    field_id: z.number().int().positive().optional().nullable(),
    start_date: isoDateSchema,
    end_date: isoDateSchema.optional().nullable(),
    description: safeString(z.string().trim().max(2000)).optional().nullable(),
  })
  .strict('Unexpected fields detected on experience payload')
  .refine((data) => Boolean(data.organization_name || data.company_name), {
    message: 'organization_name (or company_name) is required',
    path: ['organization_name'],
  })
  .refine(dateOrderingRefinement, {
    message: 'end_date must be greater than or equal to start_date',
    path: ['end_date'],
  });

// 5. User Certification Schema (Aligned to PostgreSQL `user_certifications`)
export const userCertificationSchema = z
  .object({
    certification_id: z.number().int().positive(),
    credential_id: safeString(z.string().trim().max(100)).optional().nullable(),
    date_obtained: isoDateSchema.optional().nullable(),
    expiry_date: isoDateSchema.optional().nullable(),
    status: z.enum(USER_CERT_STATUS).optional(),
  })
  .strict('Unexpected fields detected on certification payload')
  .refine(
    (data) => {
      if (data.date_obtained && data.expiry_date) {
        return new Date(data.expiry_date) >= new Date(data.date_obtained);
      }
      return true;
    },
    {
      message: 'expiry_date must be greater than or equal to date_obtained',
      path: ['expiry_date'],
    }
  );

// 6. Career Break Recording Schema (Aligned to PostgreSQL `career_breaks`)
export const careerBreakSchema = z
  .object({
    start_date: isoDateSchema,
    end_date: isoDateSchema.optional().nullable(),
    break_reason: z.enum(BREAK_REASON),
    description: safeString(z.string().trim().max(2000)).optional().nullable(),
  })
  .strict('Unexpected fields detected on career break payload')
  .refine(dateOrderingRefinement, {
    message: 'end_date must be greater than or equal to start_date',
    path: ['end_date'],
  });

// 7. Career Goal Schema (Aligned to PostgreSQL `career_goals`)
export const careerGoalSchema = z
  .object({
    target_role_id: z.number().int().positive(),
    target_completion_date: isoDateSchema.optional().nullable(),
    priority: z.number().int().min(1).max(5).optional(),
    status: z.enum(CAREER_GOAL_STATUS).optional(),
    notes: safeString(z.string().trim().max(2000)).optional().nullable(),
  })
  .strict('Unexpected fields detected on career goal payload');

// 7b. Gap Analysis Snapshot Schema (Aligned to PostgreSQL `career_gap_analyses`)
export const createGapAnalysisSchema = z
  .object({
    overall_readiness_pct: z.number().finite().min(0).max(100).optional().nullable(),
    status: z.enum(['in_progress', 'completed', 'reviewed', 'archived']).optional(),
    conducted_at: isoTimestampOrDateSchema.optional().nullable(),
    summary_notes: safeString(z.string().trim().max(2000)).optional().nullable(),
  })
  .strict('Unexpected fields detected on gap analysis payload');

// 8. Learning Plan Creation Schema (Aligned to PostgreSQL `learning_plans`)
export const learningPlanSchema = z
  .object({
    title: safeString(z.string().trim().min(1).max(200)),
    start_date: isoDateSchema.optional().nullable(),
    target_completion_date: isoDateSchema.optional().nullable(),
    status: z.enum(LEARNING_PLAN_STATUS).optional(),
    notes: safeString(z.string().trim().max(2000)).optional().nullable(),
  })
  .strict('Unexpected fields detected on learning plan payload')
  .refine(
    (data) => {
      if (data.start_date && data.target_completion_date) {
        return new Date(data.target_completion_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message: 'target_completion_date must be greater than or equal to start_date',
      path: ['target_completion_date'],
    }
  );

// 8b. Learning Plan Item Status Patch Schema
export const updateLearningItemStatusSchema = z
  .object({
    status: z.enum(LEARNING_ITEM_STATUS),
  })
  .strict('Only status updates are permitted on this endpoint');

// 9. Assessment Submission Schema (Aligned to PostgreSQL `assessment_results`)
export const submitAssessmentSchema = z
  .object({
    user_id: z.number().int().positive(),
    score: z.number().finite().min(0, 'Score must be non-negative'),
    attempt_date: isoTimestampOrDateSchema.optional().nullable(),
    notes: safeString(z.string().trim().max(2000)).optional().nullable(),
  })
  .strict('Unexpected fields detected on assessment submission payload');
