import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { analyticsService } from '../../src/services/analytics.service.js';
import { pool } from '../../src/config/db.js';
import { validate } from '../../src/middleware/validate.js';
import { ValidationError } from '../../src/errors/ValidationError.js';

import { analyticsController } from '../../src/controllers/analytics.controller.js';
import { catalogController } from '../../src/controllers/catalog.controller.js';
import { goalController } from '../../src/controllers/goal.controller.js';
import { learningController } from '../../src/controllers/learning.controller.js';
import { assessmentController } from '../../src/controllers/assessment.controller.js';
import { userController } from '../../src/controllers/user.controller.js';

import { catalogService } from '../../src/services/catalog.service.js';
import { gapAnalysisService } from '../../src/services/gapAnalysis.service.js';
import { readinessEngine } from '../../src/services/readinessEngine.js';
import { learningService } from '../../src/services/learning.service.js';
import { assessmentService } from '../../src/services/assessment.service.js';
import { userService } from '../../src/services/user.service.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('AnalyticsService, Validate Middleware & Controller Success Paths Unit Tests', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe('AnalyticsService', () => {
    it('executes all 4 analytics methods with mocked query rows', async () => {
      mock.method(pool, 'query', async (sql) => {
        return { rows: [{ metric: 'val' }], rowCount: 1 };
      });

      const dash = await analyticsService.getExecutiveDashboard();
      assert.equal(dash.candidates.length, 1);
      assert.equal(dash.meta.total_active_goals, 1);
      assert.ok(typeof dash.meta.execution_time_ms === 'number');

      const atRisk = await analyticsService.getAtRiskCandidates();
      assert.equal(atRisk.at_risk_candidates.length, 1);
      assert.equal(atRisk.meta.threshold_pct, 60.0);

      const breaks = await analyticsService.getCareerBreakCohort();
      assert.equal(breaks.cohort.length, 1);
      assert.equal(breaks.meta.total, 1);

      const tasks = await analyticsService.getTaskCompletionSummary();
      assert.equal(tasks.candidates.length, 1);
      assert.equal(tasks.meta.total_candidates, 1);
    });
  });

  describe('validate Middleware', () => {
    const testSchema = z.object({
      id: z.coerce.number().positive(),
      name: z.string().min(2),
    });

    it('validates and attaches parsed data from body, query, and params', () => {
      // Body source
      const reqBody = { body: { id: '5', name: 'Alice' } };
      let calledNextBody = false;
      validate(testSchema, 'body')(reqBody, {}, () => { calledNextBody = true; });
      assert.equal(calledNextBody, true);
      assert.equal(reqBody.body.id, 5); // coerced to number

      // Query source
      const reqQuery = { query: { id: '10', name: 'Bob' } };
      let calledNextQuery = false;
      validate(testSchema, 'query')(reqQuery, {}, () => { calledNextQuery = true; });
      assert.equal(calledNextQuery, true);
      assert.equal(reqQuery.query.id, 10);

      // Params source
      const reqParams = { params: { id: '15', name: 'Charlie' } };
      let calledNextParams = false;
      validate(testSchema, 'params')(reqParams, {}, () => { calledNextParams = true; });
      assert.equal(calledNextParams, true);
      assert.equal(reqParams.params.id, 15);
    });

    it('formats Zod validation failure into ValidationError and passes other errors', () => {
      // Zod validation failure
      const reqInvalid = { body: { id: -1, name: 'A' } };
      let passedError = null;
      validate(testSchema, 'body')(reqInvalid, {}, (err) => { passedError = err; });

      assert.ok(passedError instanceof ValidationError);
      assert.equal(passedError.message, 'Request validation failed');
      assert.ok(Array.isArray(passedError.errors));
      assert.equal(passedError.errors.length, 2);

      // Non-Zod unexpected error in schema.parse
      const throwingSchema = {
        parse: () => {
          throw new Error('Custom schema internal crash');
        },
      };
      let unexpectedError = null;
      validate(throwingSchema, 'body')({}, {}, (err) => { unexpectedError = err; });
      assert.equal(unexpectedError.message, 'Custom schema internal crash');
    });
  });

  describe('Controller Success Paths', () => {
    it('executes analyticsController successful responses', async () => {
      mock.method(analyticsService, 'getExecutiveDashboard', async () => ({ candidates: [], meta: {} }));
      mock.method(analyticsService, 'getAtRiskCandidates', async () => ({ at_risk_candidates: [], meta: {} }));
      mock.method(analyticsService, 'getCareerBreakCohort', async () => ({ cohort: [], meta: {} }));
      mock.method(analyticsService, 'getTaskCompletionSummary', async () => ({ candidates: [], meta: {} }));

      const res1 = createMockRes();
      await analyticsController.getDashboard({}, res1, () => {});
      assert.equal(res1.statusCode, 200);

      const res2 = createMockRes();
      await analyticsController.getAtRisk({}, res2, () => {});
      assert.equal(res2.statusCode, 200);

      const res3 = createMockRes();
      await analyticsController.getCareerBreaks({}, res3, () => {});
      assert.equal(res3.statusCode, 200);

      const res4 = createMockRes();
      await analyticsController.getTaskSummary({}, res4, () => {});
      assert.equal(res4.statusCode, 200);
    });

    it('executes catalogController successful responses', async () => {
      mock.method(catalogService, 'listFields', async () => []);
      mock.method(catalogService, 'listRoles', async () => []);
      mock.method(catalogService, 'getRoleById', async () => ({ role_id: 1 }));
      mock.method(catalogService, 'listSkills', async () => []);
      mock.method(catalogService, 'listQualifications', async () => []);
      mock.method(catalogService, 'listCertifications', async () => []);

      const res = createMockRes();
      await catalogController.listFields({}, res, () => {});
      assert.equal(res.statusCode, 200);

      await catalogController.listRoles({ query: {} }, res, () => {});
      assert.equal(res.statusCode, 200);

      await catalogController.getRoleById({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await catalogController.listSkills({ query: {} }, res, () => {});
      assert.equal(res.statusCode, 200);

      await catalogController.listQualifications({}, res, () => {});
      assert.equal(res.statusCode, 200);

      await catalogController.listCertifications({}, res, () => {});
      assert.equal(res.statusCode, 200);
    });

    it('executes goalController successful responses', async () => {
      mock.method(gapAnalysisService, 'getGoalsByUserId', async () => []);
      mock.method(gapAnalysisService, 'createGoal', async () => ({ goal_id: 1 }));
      mock.method(gapAnalysisService, 'getSkillMatch', async () => ({ skills: [] }));
      mock.method(gapAnalysisService, 'getGapAnalysisById', async () => ({ analysis_id: 1 }));
      mock.method(gapAnalysisService, 'createGapAnalysis', async () => ({ analysis_id: 1 }));
      mock.method(readinessEngine, 'evaluateGoalReadiness', async () => ({ status: 'job_ready' }));
      mock.method(readinessEngine, 'generateLearningRoadmap', async () => ({ tasks: [] }));

      const res = createMockRes();
      await goalController.getGoalsByUserId({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await goalController.createGoal({ params: { id: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 201);

      await goalController.getSkillMatch({ params: { goalId: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await goalController.createGapAnalysis({ params: { goalId: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 201);

      await goalController.getGapAnalysisById({ params: { analysisId: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await goalController.analyzeGoal({ params: { goalId: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await goalController.generateRoadmap({ params: { goalId: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);
    });

    it('executes learningController successful responses', async () => {
      mock.method(learningService, 'getLearningPlansByUserId', async () => []);
      mock.method(learningService, 'getLearningPlanById', async () => ({ plan_id: 1 }));
      mock.method(learningService, 'createLearningPlan', async () => ({ plan_id: 1 }));
      mock.method(learningService, 'updatePlanItemStatus', async () => ({ item_id: 1 }));
      mock.method(learningService, 'listResources', async () => []);

      const res = createMockRes();
      await learningController.getPlansByUserId({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await learningController.getPlanById({ params: { planId: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await learningController.createPlan({ params: { goalId: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 201);

      await learningController.updateItemStatus({ params: { itemId: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 200);

      await learningController.listResources({ query: {} }, res, () => {});
      assert.equal(res.statusCode, 200);
    });

    it('executes assessmentController successful responses', async () => {
      mock.method(assessmentService, 'listAssessments', async () => []);
      mock.method(assessmentService, 'getAssessmentById', async () => ({ assessment_id: 1 }));
      mock.method(assessmentService, 'submitAssessmentResult', async () => ({ result_id: 1 }));
      mock.method(assessmentService, 'getUserAssessments', async () => []);
      mock.method(assessmentService, 'getUserGrowthReport', async () => []);

      const res = createMockRes();
      await assessmentController.listAssessments({ query: {} }, res, () => {});
      assert.equal(res.statusCode, 200);

      await assessmentController.getAssessmentById({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await assessmentController.submitResult({ params: { id: 1 }, body: { user_id: 2 } }, res, () => {});
      assert.equal(res.statusCode, 201);

      await assessmentController.getUserAssessments({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await assessmentController.getUserGrowth({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);
    });

    it('executes userController successful responses', async () => {
      mock.method(userService, 'listUsers', async () => ({ users: [], meta: {} }));
      mock.method(userService, 'getUserById', async () => ({ user_id: 1 }));
      mock.method(userService, 'createUser', async () => ({ user_id: 1 }));
      mock.method(userService, 'updateUser', async () => ({ user_id: 1 }));
      mock.method(userService, 'getUserEducation', async () => []);
      mock.method(userService, 'addEducation', async () => ({ education_id: 1 }));
      mock.method(userService, 'getUserSkills', async () => []);
      mock.method(userService, 'addUserSkill', async () => ({ user_skill_id: 1 }));
      mock.method(userService, 'getUserExperiences', async () => []);
      mock.method(userService, 'addExperience', async () => ({ experience_id: 1 }));
      mock.method(userService, 'getUserCertifications', async () => []);
      mock.method(userService, 'addCertification', async () => ({ user_cert_id: 1 }));
      mock.method(userService, 'getUserCareerBreaks', async () => []);
      mock.method(userService, 'addCareerBreak', async () => ({ break_id: 1 }));

      const res = createMockRes();
      await userController.list({ query: {} }, res, () => {});
      assert.equal(res.statusCode, 200);

      await userController.getById({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await userController.create({ body: {} }, res, () => {});
      assert.equal(res.statusCode, 201);

      await userController.update({ params: { id: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 200);

      await userController.getEducation({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await userController.addEducation({ params: { id: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 201);

      await userController.getSkills({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await userController.addSkill({ params: { id: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 201);

      await userController.getExperiences({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await userController.addExperience({ params: { id: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 201);

      await userController.getCertifications({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await userController.addCertification({ params: { id: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 201);

      await userController.getCareerBreaks({ params: { id: 1 } }, res, () => {});
      assert.equal(res.statusCode, 200);

      await userController.addCareerBreak({ params: { id: 1 }, body: {} }, res, () => {});
      assert.equal(res.statusCode, 201);
    });
  });
});

