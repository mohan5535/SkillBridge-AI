import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/db.js';
import { gapAnalysisService } from '../../src/services/gapAnalysis.service.js';
import { learningService } from '../../src/services/learning.service.js';
import { catalogService } from '../../src/services/catalog.service.js';
import { assessmentService } from '../../src/services/assessment.service.js';
import { NotFoundError } from '../../src/errors/NotFoundError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';

describe('Catalog, Gap Analysis, Learning & Assessment Services Unit Tests', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe('CatalogService', () => {
    it('lists fields, qualifications, and certifications', async () => {
      mock.method(pool, 'query', async (sql) => {
        if (sql.includes('FROM career_fields')) return { rows: [{ field_id: 1, field_name: 'Software' }] };
        if (sql.includes('FROM qualification_types')) return { rows: [{ qualification_type_id: 1, type_name: 'Bachelor' }] };
        if (sql.includes('FROM certifications')) return { rows: [{ certification_id: 1, certification_name: 'AWS' }] };
        return { rows: [] };
      });

      const fields = await catalogService.listFields();
      assert.equal(fields.length, 1);

      const quals = await catalogService.listQualifications();
      assert.equal(quals.length, 1);

      const certs = await catalogService.listCertifications();
      assert.equal(certs.length, 1);
    });

    it('lists roles with and without fieldId filter', async () => {
      let passedFieldId = null;
      mock.method(pool, 'query', async (sql, params) => {
        passedFieldId = params ? params[0] : null;
        return { rows: [{ role_id: 1, title: 'Dev' }] };
      });

      const allRoles = await catalogService.listRoles();
      assert.equal(allRoles.length, 1);
      assert.equal(passedFieldId, null);

      const filtered = await catalogService.listRoles({ fieldId: '3' });
      assert.equal(filtered.length, 1);
      assert.equal(passedFieldId, 3);
    });

    it('gets role by id with requirements or throws NotFoundError', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('career_roles') && sql.includes('cr.role_id = $1')) {
          if (params[0] === 999) return { rows: [] };
          return { rows: [{ role_id: 5, title: 'Security Analyst' }] };
        }
        if (sql.includes('career_requirements')) {
          return { rows: [{ requirement_id: 10, requirement_type: 'skill' }] };
        }
        return { rows: [] };
      });

      const role = await catalogService.getRoleById(5);
      assert.equal(role.role_id, 5);
      assert.equal(role.requirements.length, 1);

      await assert.rejects(
        () => catalogService.getRoleById(999),
        NotFoundError
      );
    });

    it('lists skills with and without category filter', async () => {
      let passedCategory = null;
      mock.method(pool, 'query', async (sql, params) => {
        passedCategory = params ? params[0] : null;
        return { rows: [{ skill_id: 1, skill_name: 'SQL' }] };
      });

      await catalogService.listSkills();
      assert.equal(passedCategory, null);

      await catalogService.listSkills({ category: 'Database' });
      assert.equal(passedCategory, 'Database');
    });
  });

  describe('GapAnalysisService', () => {
    it('manages goals (get goals by user and create goal with fallbacks)', async () => {
      let createParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('INSERT INTO career_goals')) {
          createParams = params;
          return { rows: [{ goal_id: 10, role_id: params[1] }] };
        }
        return { rows: [{ goal_id: 10 }] };
      });

      const goals = await gapAnalysisService.getGoalsByUserId(1);
      assert.equal(goals.length, 1);

      const created = await gapAnalysisService.createGoal(1, { target_role_id: 4 });
      assert.equal(created.goal_id, 10);
      assert.equal(createParams[0], 1);
      assert.equal(createParams[1], 4);
      assert.equal(createParams[2], null); // default target_completion_date
      assert.equal(createParams[3], 3); // default priority
      assert.equal(createParams[4], 'exploring'); // default status
      assert.equal(createParams[5], null); // default notes
    });

    it('calculates skill match percentage correctly and handles 0 skills', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('match_status')) {
          if (params[0] === 10) {
            return {
              rows: [
                { skill_id: 1, match_status: 'MET' },
                { skill_id: 2, match_status: 'MET' },
                { skill_id: 3, match_status: 'NOT MET' },
                { skill_id: 4, match_status: 'NOT MET' },
              ],
            };
          }
          return { rows: [] }; // 0 skills for goal 20
        }
        if (sql.includes('career_goals') && sql.includes('cg.goal_id = $1')) {
          if (params[0] === 999) return { rows: [] };
          return { rows: [{ goal_id: params[0], role_id: 2 }] };
        }
        return { rows: [] };
      });

      const match10 = await gapAnalysisService.getSkillMatch(10);
      assert.equal(match10.summary.total_skills_required, 4);
      assert.equal(match10.summary.skills_met, 2);
      assert.equal(match10.summary.skills_missing, 2);
      assert.equal(match10.summary.match_percentage, 50.0);

      const match20 = await gapAnalysisService.getSkillMatch(20);
      assert.equal(match20.summary.total_skills_required, 0);
      assert.equal(match20.summary.match_percentage, 0);

      await assert.rejects(
        () => gapAnalysisService.getSkillMatch(999),
        NotFoundError
      );
    });

    it('retrieves gap analysis by id with items or throws NotFoundError', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('career_gap_analyses') && sql.includes('cga.analysis_id = $1')) {
          if (params[0] === 999) return { rows: [] };
          return { rows: [{ analysis_id: 5, overall_readiness_pct: '75.5' }] };
        }
        if (sql.includes('career_gap_items')) {
          return { rows: [{ gap_item_id: 1, gap_severity: 'critical' }] };
        }
        return { rows: [] };
      });

      const analysis = await gapAnalysisService.getGapAnalysisById(5);
      assert.equal(analysis.analysis_id, 5);
      assert.equal(analysis.gap_items.length, 1);

      await assert.rejects(
        () => gapAnalysisService.getGapAnalysisById(999),
        NotFoundError
      );
    });

    it('creates gap analysis with defaults and provided values', async () => {
      let passedParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        passedParams = params;
        return { rows: [{ analysis_id: 12, goal_id: params[0] }] };
      });

      const created = await gapAnalysisService.createGapAnalysis(3, {});
      assert.equal(created.analysis_id, 12);
      assert.equal(passedParams[0], 3);
      assert.equal(passedParams[1], null);
      assert.equal(passedParams[2], 'in_progress'); // default status
      assert.equal(passedParams[3], null);
      assert.equal(passedParams[4], null);
    });
  });

  describe('LearningService', () => {
    it('gets learning plans by user id', async () => {
      mock.method(pool, 'query', async () => ({ rows: [{ plan_id: 1, title: 'Roadmap' }] }));
      const plans = await learningService.getLearningPlansByUserId(1);
      assert.equal(plans.length, 1);
    });

    it('calculates plan progress metrics accurately for mixed and empty task lists', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('learning_plans') && sql.includes('lp.plan_id = $1')) {
          if (params[0] === 999) return { rows: [] };
          return { rows: [{ plan_id: params[0], title: 'Mastery Plan' }] };
        }
        if (sql.includes('lpi.plan_item_id')) {
          if (params[0] === 1) {
            return {
              rows: [
                { item_id: 1, status: 'completed' },
                { item_id: 2, status: 'completed' },
                { item_id: 3, status: 'in_progress' },
                { item_id: 4, status: 'pending' },
              ],
            };
          }
          return { rows: [] }; // empty tasks for plan 2
        }
        return { rows: [] };
      });

      const plan1 = await learningService.getLearningPlanById(1);
      assert.equal(plan1.progress.total_tasks, 4);
      assert.equal(plan1.progress.completed_tasks, 2);
      assert.equal(plan1.progress.in_progress_tasks, 1);
      assert.equal(plan1.progress.pending_tasks, 1);
      assert.equal(plan1.progress.progress_percentage, 50.0);

      const plan2 = await learningService.getLearningPlanById(2);
      assert.equal(plan2.progress.total_tasks, 0);
      assert.equal(plan2.progress.progress_percentage, 0);

      await assert.rejects(
        () => learningService.getLearningPlanById(999),
        NotFoundError
      );
    });

    it('creates learning plan with default status and optional fields', async () => {
      let passedParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        passedParams = params;
        return { rows: [{ plan_id: 30, title: params[1] }] };
      });

      const plan = await learningService.createLearningPlan(5, { title: 'Cloud Architecture' });
      assert.equal(plan.plan_id, 30);
      assert.equal(passedParams[0], 5);
      assert.equal(passedParams[1], 'Cloud Architecture');
      assert.equal(passedParams[2], null);
      assert.equal(passedParams[3], null);
      assert.equal(passedParams[4], 'draft');
      assert.equal(passedParams[5], null);
    });

    it('updates plan item status or throws NotFoundError if item does not exist', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (params[0] === 999) return { rows: [] };
        return { rows: [{ item_id: params[0], status: params[1] }] };
      });

      const updated = await learningService.updatePlanItemStatus(50, 'completed');
      assert.equal(updated.item_id, 50);
      assert.equal(updated.status, 'completed');

      await assert.rejects(
        () => learningService.updatePlanItemStatus(999, 'completed'),
        NotFoundError
      );
    });

    it('lists catalog resources with various filter combinations', async () => {
      let passedParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        passedParams = params;
        return { rows: [{ resource_id: 1, resource_name: 'Node Tutorial' }] };
      });

      const resAll = await learningService.listResources();
      assert.equal(resAll.length, 1);
      assert.equal(passedParams[0], null);
      assert.equal(passedParams[1], null);
      assert.equal(passedParams[2], null);

      const resFiltered = await learningService.listResources({
        roleId: '7',
        resourceType: 'course',
        difficulty: 'intermediate',
      });
      assert.equal(resFiltered.length, 1);
      assert.equal(passedParams[0], 7);
      assert.equal(passedParams[1], 'course');
      assert.equal(passedParams[2], 'intermediate');
    });
  });

  describe('AssessmentService', () => {
    it('lists assessments with filters and gets assessment by id', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('FROM assessments a') && sql.includes('a.assessment_id = $1')) {
          if (params[0] === 999) return { rows: [] };
          return { rows: [{ assessment_id: 1, assessment_name: 'JS Exam', max_score: 100, passing_score: 70 }] };
        }
        return { rows: [{ assessment_id: 1 }] };
      });

      const list = await assessmentService.listAssessments({ skillId: '4', assessmentType: 'quiz' });
      assert.equal(list.length, 1);

      const item = await assessmentService.getAssessmentById(1);
      assert.equal(item.assessment_id, 1);

      await assert.rejects(
        () => assessmentService.getAssessmentById(999),
        NotFoundError
      );
    });

    it('validates score bounds and submits assessment result', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('FROM assessments a') && sql.includes('a.assessment_id = $1')) {
          return { rows: [{ assessment_id: 1, max_score: 100, passing_score: 75 }] };
        }
        if (sql.includes('INSERT INTO assessment_results')) {
          return { rows: [{ result_id: 50, score: params[2], passed: params[3] }] };
        }
        return { rows: [] };
      });

      // Negative score validation
      await assert.rejects(
        () => assessmentService.submitAssessmentResult(1, 10, { score: -10 }),
        (err) => {
          assert.ok(err instanceof ValidationError);
          assert.match(err.message, /Score must be a non-negative number/);
          return true;
        }
      );

      // NaN score validation
      await assert.rejects(
        () => assessmentService.submitAssessmentResult(1, 10, { score: 'not-a-number' }),
        ValidationError
      );

      // Score exceeding max_score validation
      await assert.rejects(
        () => assessmentService.submitAssessmentResult(1, 10, { score: 105 }),
        (err) => {
          assert.ok(err instanceof ValidationError);
          assert.match(err.message, /exceeds assessment maximum score/);
          return true;
        }
      );

      // Valid passing score
      const passingRes = await assessmentService.submitAssessmentResult(1, 10, { score: 85 });
      assert.equal(passingRes.score, 85);
      assert.equal(passingRes.passed, true);

      // Valid failing score
      const failingRes = await assessmentService.submitAssessmentResult(1, 10, { score: 60 });
      assert.equal(failingRes.score, 60);
      assert.equal(failingRes.passed, false);
    });

    it('retrieves user assessments and user growth reports', async () => {
      mock.method(pool, 'query', async () => ({ rows: [{ metric: 'growth' }] }));

      const assessments = await assessmentService.getUserAssessments(1);
      assert.equal(assessments.length, 1);

      const growthWithId = await assessmentService.getUserGrowthReport('5');
      assert.equal(growthWithId.length, 1);

      const growthAll = await assessmentService.getUserGrowthReport();
      assert.equal(growthAll.length, 1);
    });
  });
});
