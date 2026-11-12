import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createUserSchema,
  educationSchema,
  careerBreakSchema,
  submitAssessmentSchema,
} from '../../src/validators/schemas.js';

describe('Zod Validation Schemas Matching Database Invariants', () => {
  it('should accept valid candidate registration payload', () => {
    const valid = {
      email: 'priya.test@example.com',
      full_name: 'Priya Test',
      country: 'India',
    };
    const parsed = createUserSchema.parse(valid);
    assert.equal(parsed.email, 'priya.test@example.com');
  });

  it('should reject malformed email format', () => {
    assert.throws(() => {
      createUserSchema.parse({
        email: 'not-an-email',
        full_name: 'Test',
      });
    });
  });

  it('should reject education record when end_date < start_date', () => {
    assert.throws(() => {
      educationSchema.parse({
        qualification_type_id: 1,
        institution_name: 'University of Delhi',
        start_date: '2022-01-01',
        end_date: '2020-01-01', // Date inversion
      });
    });
  });

  it('should accept education record when end_date >= start_date', () => {
    const valid = {
      qualification_type_id: 1,
      institution_name: 'University of Delhi',
      start_date: '2020-01-01',
      end_date: '2022-01-01',
    };
    const parsed = educationSchema.parse(valid);
    assert.equal(parsed.institution_name, 'University of Delhi');
  });

  it('should reject career break with invalid out-of-vocabulary reason', () => {
    assert.throws(() => {
      careerBreakSchema.parse({
        start_date: '2023-01-01',
        break_reason: 'unauthorized_reason', // Violates chk_break_reason
      });
    });
  });

  it('should accept career break with valid neutral reason', () => {
    const valid = {
      start_date: '2023-01-01',
      break_reason: 'parental_leave',
    };
    const parsed = careerBreakSchema.parse(valid);
    assert.equal(parsed.break_reason, 'parental_leave');
  });

  it('should reject negative score on assessment submit', () => {
    assert.throws(() => {
      submitAssessmentSchema.parse({
        user_id: 1,
        score: -5,
      });
    });
  });
});

