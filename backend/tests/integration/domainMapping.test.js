import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EDUCATION_STATUS,
  PROFICIENCY_LEVEL,
  EXPERIENCE_TYPE,
  USER_CERT_STATUS,
  BREAK_REASON,
  REQUIREMENT_TYPE,
  CAREER_GOAL_STATUS,
  GAP_SEVERITY,
  GAP_ITEM_STATUS,
  LEARNING_PLAN_STATUS,
  LEARNING_ITEM_STATUS,
  ASSESSMENT_TYPE,
} from '../../src/constants/statusEnums.js';

describe('Domain Mapping & Schema CHECK Constraint Vocabulary Integrity', () => {
  it('EDUCATION_STATUS should match chk_education_status exactly', () => {
    assert.deepEqual([...EDUCATION_STATUS], ['in_progress', 'completed', 'incomplete', 'deferred']);
  });

  it('PROFICIENCY_LEVEL should match chk_user_skills_proficiency exactly', () => {
    assert.deepEqual([...PROFICIENCY_LEVEL], ['beginner', 'intermediate', 'advanced', 'expert']);
  });

  it('EXPERIENCE_TYPE should match chk_experience_type exactly', () => {
    assert.deepEqual(
      [...EXPERIENCE_TYPE],
      ['full_time', 'part_time', 'internship', 'freelance', 'volunteer', 'apprenticeship']
    );
  });

  it('USER_CERT_STATUS should match chk_user_cert_status exactly', () => {
    assert.deepEqual([...USER_CERT_STATUS], ['active', 'expired', 'revoked', 'in_progress']);
  });

  it('BREAK_REASON should match chk_break_reason neutral categorizations', () => {
    assert.deepEqual(
      [...BREAK_REASON],
      ['parental_leave', 'health', 'caregiving', 'education', 'travel', 'personal', 'layoff', 'career_change', 'other']
    );
  });

  it('REQUIREMENT_TYPE should match chk_career_req_type polymorphic categories', () => {
    assert.deepEqual(
      [...REQUIREMENT_TYPE],
      ['skill', 'education', 'certification', 'experience', 'eligibility', 'other']
    );
  });

  it('CAREER_GOAL_STATUS and GAP_SEVERITY should match respective CHECK constraints', () => {
    assert.deepEqual([...CAREER_GOAL_STATUS], ['exploring', 'active', 'achieved', 'paused', 'abandoned']);
    assert.deepEqual([...GAP_SEVERITY], ['low', 'medium', 'high', 'critical']);
    assert.deepEqual([...GAP_ITEM_STATUS], ['identified', 'in_progress', 'resolved', 'not_applicable']);
    assert.deepEqual([...LEARNING_PLAN_STATUS], ['draft', 'active', 'completed', 'paused', 'abandoned']);
    assert.deepEqual([...LEARNING_ITEM_STATUS], ['pending', 'in_progress', 'completed', 'skipped']);
    assert.deepEqual(
      [...ASSESSMENT_TYPE],
      ['quiz', 'practical', 'project', 'interview', 'peer_review', 'certification_exam', 'other']
    );
  });
});

