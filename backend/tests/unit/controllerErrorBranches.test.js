import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsController } from '../../src/controllers/analytics.controller.js';
import { catalogController } from '../../src/controllers/catalog.controller.js';
import { goalController } from '../../src/controllers/goal.controller.js';
import { learningController } from '../../src/controllers/learning.controller.js';
import { assessmentController } from '../../src/controllers/assessment.controller.js';
import { userController } from '../../src/controllers/user.controller.js';

import { analyticsService } from '../../src/services/analytics.service.js';
import { catalogService } from '../../src/services/catalog.service.js';
import { gapAnalysisService } from '../../src/services/gapAnalysis.service.js';
import { readinessEngine } from '../../src/services/readinessEngine.js';
import { learningService } from '../../src/services/learning.service.js';
import { assessmentService } from '../../src/services/assessment.service.js';
import { userService } from '../../src/services/user.service.js';

describe('Controller Catch-Block & Error Propagation Unit Tests', () => {
  const dummyErr = new Error('Simulated service rejection');

  describe('analyticsController', () => {
    it('propagates errors from all analytics handlers to next()', async () => {
      mock.method(analyticsService, 'getExecutiveDashboard', async () => { throw dummyErr; });
      mock.method(analyticsService, 'getAtRiskCandidates', async () => { throw dummyErr; });
      mock.method(analyticsService, 'getCareerBreakCohort', async () => { throw dummyErr; });
      mock.method(analyticsService, 'getTaskCompletionSummary', async () => { throw dummyErr; });

      try {
        let err1 = null;
        await analyticsController.getDashboard({}, {}, (e) => { err1 = e; });
        assert.equal(err1, dummyErr);

        let err2 = null;
        await analyticsController.getAtRisk({}, {}, (e) => { err2 = e; });
        assert.equal(err2, dummyErr);

        let err3 = null;
        await analyticsController.getCareerBreaks({}, {}, (e) => { err3 = e; });
        assert.equal(err3, dummyErr);

        let err4 = null;
        await analyticsController.getTaskSummary({}, {}, (e) => { err4 = e; });
        assert.equal(err4, dummyErr);
      } finally {
        mock.restoreAll();
      }
    });
  });

  describe('catalogController', () => {
    it('propagates errors from catalog handlers to next()', async () => {
      mock.method(catalogService, 'listFields', async () => { throw dummyErr; });
      mock.method(catalogService, 'listRoles', async () => { throw dummyErr; });
      mock.method(catalogService, 'getRoleById', async () => { throw dummyErr; });
      mock.method(catalogService, 'listSkills', async () => { throw dummyErr; });
      mock.method(catalogService, 'listQualifications', async () => { throw dummyErr; });
      mock.method(catalogService, 'listCertifications', async () => { throw dummyErr; });

      try {
        let err1 = null;
        await catalogController.listFields({}, {}, (e) => { err1 = e; });
        assert.equal(err1, dummyErr);

        let err2 = null;
        await catalogController.listRoles({ query: {} }, {}, (e) => { err2 = e; });
        assert.equal(err2, dummyErr);

        let err3 = null;
        await catalogController.getRoleById({ params: { id: 1 } }, {}, (e) => { err3 = e; });
        assert.equal(err3, dummyErr);

        let err4 = null;
        await catalogController.listSkills({ query: {} }, {}, (e) => { err4 = e; });
        assert.equal(err4, dummyErr);

        let err5 = null;
        await catalogController.listQualifications({}, {}, (e) => { err5 = e; });
        assert.equal(err5, dummyErr);

        let err6 = null;
        await catalogController.listCertifications({}, {}, (e) => { err6 = e; });
        assert.equal(err6, dummyErr);
      } finally {
        mock.restoreAll();
      }
    });
  });

  describe('goalController', () => {
    it('propagates errors from goal and readiness handlers to next()', async () => {
      mock.method(gapAnalysisService, 'getGoalsByUserId', async () => { throw dummyErr; });
      mock.method(gapAnalysisService, 'createGoal', async () => { throw dummyErr; });
      mock.method(gapAnalysisService, 'getSkillMatch', async () => { throw dummyErr; });
      mock.method(gapAnalysisService, 'getGapAnalysisById', async () => { throw dummyErr; });
      mock.method(gapAnalysisService, 'createGapAnalysis', async () => { throw dummyErr; });
      mock.method(readinessEngine, 'evaluateGoalReadiness', async () => { throw dummyErr; });
      mock.method(readinessEngine, 'generateLearningRoadmap', async () => { throw dummyErr; });

      try {
        let err1 = null;
        await goalController.getGoalsByUserId({ params: { id: 1 } }, {}, (e) => { err1 = e; });
        assert.equal(err1, dummyErr);

        let err2 = null;
        await goalController.createGoal({ params: { id: 1 }, body: {} }, {}, (e) => { err2 = e; });
        assert.equal(err2, dummyErr);

        let err3 = null;
        await goalController.getSkillMatch({ params: { goalId: 1 } }, {}, (e) => { err3 = e; });
        assert.equal(err3, dummyErr);

        let err4 = null;
        await goalController.getGapAnalysisById({ params: { analysisId: 1 } }, {}, (e) => { err4 = e; });
        assert.equal(err4, dummyErr);

        let err5 = null;
        await goalController.createGapAnalysis({ params: { goalId: 1 }, body: {} }, {}, (e) => { err5 = e; });
        assert.equal(err5, dummyErr);

        let err6 = null;
        await goalController.analyzeGoal({ params: { goalId: 1 } }, {}, (e) => { err6 = e; });
        assert.equal(err6, dummyErr);

        let err7 = null;
        await goalController.generateRoadmap({ params: { goalId: 1 } }, {}, (e) => { err7 = e; });
        assert.equal(err7, dummyErr);
      } finally {
        mock.restoreAll();
      }
    });
  });

  describe('learningController', () => {
    it('propagates errors from learning handlers to next()', async () => {
      mock.method(learningService, 'getLearningPlansByUserId', async () => { throw dummyErr; });
      mock.method(learningService, 'getLearningPlanById', async () => { throw dummyErr; });
      mock.method(learningService, 'createLearningPlan', async () => { throw dummyErr; });
      mock.method(learningService, 'updatePlanItemStatus', async () => { throw dummyErr; });
      mock.method(learningService, 'listResources', async () => { throw dummyErr; });

      try {
        let err1 = null;
        await learningController.getPlansByUserId({ params: { id: 1 } }, {}, (e) => { err1 = e; });
        assert.equal(err1, dummyErr);

        let err2 = null;
        await learningController.getPlanById({ params: { planId: 1 } }, {}, (e) => { err2 = e; });
        assert.equal(err2, dummyErr);

        let err3 = null;
        await learningController.createPlan({ params: { goalId: 1 }, body: {} }, {}, (e) => { err3 = e; });
        assert.equal(err3, dummyErr);

        let err4 = null;
        await learningController.updateItemStatus({ params: { itemId: 1 }, body: {} }, {}, (e) => { err4 = e; });
        assert.equal(err4, dummyErr);

        let err5 = null;
        await learningController.listResources({ query: {} }, {}, (e) => { err5 = e; });
        assert.equal(err5, dummyErr);
      } finally {
        mock.restoreAll();
      }
    });
  });

  describe('assessmentController', () => {
    it('propagates errors from assessment handlers to next()', async () => {
      mock.method(assessmentService, 'listAssessments', async () => { throw dummyErr; });
      mock.method(assessmentService, 'getAssessmentById', async () => { throw dummyErr; });
      mock.method(assessmentService, 'submitAssessmentResult', async () => { throw dummyErr; });
      mock.method(assessmentService, 'getUserAssessments', async () => { throw dummyErr; });
      mock.method(assessmentService, 'getUserGrowthReport', async () => { throw dummyErr; });

      try {
        let err1 = null;
        await assessmentController.listAssessments({ query: {} }, {}, (e) => { err1 = e; });
        assert.equal(err1, dummyErr);

        let err2 = null;
        await assessmentController.getAssessmentById({ params: { id: 1 } }, {}, (e) => { err2 = e; });
        assert.equal(err2, dummyErr);

        let err3 = null;
        await assessmentController.submitResult({ params: { id: 1 }, body: { user_id: 2 } }, {}, (e) => { err3 = e; });
        assert.equal(err3, dummyErr);

        let err4 = null;
        await assessmentController.getUserAssessments({ params: { id: 1 } }, {}, (e) => { err4 = e; });
        assert.equal(err4, dummyErr);

        let err5 = null;
        await assessmentController.getUserGrowth({ params: { id: 1 } }, {}, (e) => { err5 = e; });
        assert.equal(err5, dummyErr);
      } finally {
        mock.restoreAll();
      }
    });
  });

  describe('userController', () => {
    it('propagates errors from user and sub-resource handlers to next()', async () => {
      mock.method(userService, 'listUsers', async () => { throw dummyErr; });
      mock.method(userService, 'getUserById', async () => { throw dummyErr; });
      mock.method(userService, 'createUser', async () => { throw dummyErr; });
      mock.method(userService, 'updateUser', async () => { throw dummyErr; });
      mock.method(userService, 'getUserEducation', async () => { throw dummyErr; });
      mock.method(userService, 'addEducation', async () => { throw dummyErr; });
      mock.method(userService, 'getUserSkills', async () => { throw dummyErr; });
      mock.method(userService, 'addUserSkill', async () => { throw dummyErr; });
      mock.method(userService, 'getUserExperiences', async () => { throw dummyErr; });
      mock.method(userService, 'addExperience', async () => { throw dummyErr; });
      mock.method(userService, 'getUserCertifications', async () => { throw dummyErr; });
      mock.method(userService, 'addCertification', async () => { throw dummyErr; });
      mock.method(userService, 'getUserCareerBreaks', async () => { throw dummyErr; });
      mock.method(userService, 'addCareerBreak', async () => { throw dummyErr; });

      try {
        let err1 = null;
        await userController.list({ query: {} }, {}, (e) => { err1 = e; });
        assert.equal(err1, dummyErr);

        let err2 = null;
        await userController.getById({ params: { id: 1 } }, {}, (e) => { err2 = e; });
        assert.equal(err2, dummyErr);

        let err3 = null;
        await userController.create({ body: {} }, {}, (e) => { err3 = e; });
        assert.equal(err3, dummyErr);

        let err4 = null;
        await userController.update({ params: { id: 1 }, body: {} }, {}, (e) => { err4 = e; });
        assert.equal(err4, dummyErr);

        let err5 = null;
        await userController.getEducation({ params: { id: 1 } }, {}, (e) => { err5 = e; });
        assert.equal(err5, dummyErr);

        let err6 = null;
        await userController.addEducation({ params: { id: 1 }, body: {} }, {}, (e) => { err6 = e; });
        assert.equal(err6, dummyErr);

        let err7 = null;
        await userController.getSkills({ params: { id: 1 } }, {}, (e) => { err7 = e; });
        assert.equal(err7, dummyErr);

        let err8 = null;
        await userController.addSkill({ params: { id: 1 }, body: {} }, {}, (e) => { err8 = e; });
        assert.equal(err8, dummyErr);

        let err9 = null;
        await userController.getExperiences({ params: { id: 1 } }, {}, (e) => { err9 = e; });
        assert.equal(err9, dummyErr);

        let err10 = null;
        await userController.addExperience({ params: { id: 1 }, body: {} }, {}, (e) => { err10 = e; });
        assert.equal(err10, dummyErr);

        let err11 = null;
        await userController.getCertifications({ params: { id: 1 } }, {}, (e) => { err11 = e; });
        assert.equal(err11, dummyErr);

        let err12 = null;
        await userController.addCertification({ params: { id: 1 }, body: {} }, {}, (e) => { err12 = e; });
        assert.equal(err12, dummyErr);

        let err13 = null;
        await userController.getCareerBreaks({ params: { id: 1 } }, {}, (e) => { err13 = e; });
        assert.equal(err13, dummyErr);

        let err14 = null;
        await userController.addCareerBreak({ params: { id: 1 }, body: {} }, {}, (e) => { err14 = e; });
        assert.equal(err14, dummyErr);
      } finally {
        mock.restoreAll();
      }
    });
  });
});
