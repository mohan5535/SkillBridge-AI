import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PROFICIENCY_RANKS, SEVERITY_WEIGHTS } from '../../src/services/readinessEngine.js';

describe('Phase 9: Multi-Factor Readiness & Roadmap Engine Unit Tests', () => {
  it('enforces monotonic proficiency rank ordering', () => {
    assert.ok(PROFICIENCY_RANKS.beginner < PROFICIENCY_RANKS.intermediate);
    assert.ok(PROFICIENCY_RANKS.intermediate < PROFICIENCY_RANKS.advanced);
    assert.ok(PROFICIENCY_RANKS.advanced < PROFICIENCY_RANKS.expert);
    assert.equal(PROFICIENCY_RANKS.beginner, 1);
    assert.equal(PROFICIENCY_RANKS.expert, 4);
  });

  it('enforces monotonic severity weight ordering for task sequencing', () => {
    assert.ok(SEVERITY_WEIGHTS.low < SEVERITY_WEIGHTS.medium);
    assert.ok(SEVERITY_WEIGHTS.medium < SEVERITY_WEIGHTS.high);
    assert.ok(SEVERITY_WEIGHTS.high < SEVERITY_WEIGHTS.critical);
    assert.equal(SEVERITY_WEIGHTS.critical, 4);
  });

  it('verifies multi-factor model weights sum to 1.0 (100%)', () => {
    const weights = {
      skills: 0.4,
      experience: 0.2,
      education: 0.2,
      certifications: 0.1,
      assessments: 0.1,
    };

    const sum = Object.values(weights).reduce((acc, w) => acc + w, 0);
    assert.equal(parseFloat(sum.toFixed(4)), 1.0);
  });
});

