import { Router } from 'express';
import { goalController } from '../controllers/goal.controller.js';
import {
  authenticateToken,
  requireOwnershipOrCounselor,
  requireResourceOwnershipOrCounselor,
} from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import {
  positiveIntParam,
  careerGoalSchema,
  createGapAnalysisSchema,
  emptyBodySchema,
} from '../validators/schemas.js';

export const goalRouter = Router();
const validateUserId = validate(positiveIntParam('id'), 'params');
const validateGoalId = validate(positiveIntParam('goalId'), 'params');
const validateAnalysisId = validate(positiveIntParam('analysisId'), 'params');
const requireGoalOwnership = requireResourceOwnershipOrCounselor('goal', 'goalId');
const requireAnalysisOwnership = requireResourceOwnershipOrCounselor('analysis', 'analysisId');

// Goal management & skill matching
goalRouter.get('/users/:id/goals', authenticateToken, validateUserId, requireOwnershipOrCounselor('id'), goalController.getGoalsByUserId);
goalRouter.post('/users/:id/goals', authenticateToken, validateUserId, requireOwnershipOrCounselor('id'), csrfProtection, validate(careerGoalSchema), goalController.createGoal);
goalRouter.get('/goals/:goalId/skill-match', authenticateToken, validateGoalId, requireGoalOwnership, goalController.getSkillMatch);
goalRouter.post('/goals/:goalId/analyses', authenticateToken, validateGoalId, requireGoalOwnership, csrfProtection, validate(createGapAnalysisSchema), goalController.createGapAnalysis);

// Automated multi-factor gap analysis & learning roadmap service
goalRouter.get('/goals/:goalId/analyze', authenticateToken, validateGoalId, requireGoalOwnership, goalController.analyzeGoal);
goalRouter.post('/goals/:goalId/analyze', authenticateToken, validateGoalId, requireGoalOwnership, csrfProtection, validate(emptyBodySchema), goalController.analyzeGoal);
goalRouter.get('/goals/:goalId/generate-roadmap', authenticateToken, validateGoalId, requireGoalOwnership, goalController.generateRoadmap);
goalRouter.post('/goals/:goalId/generate-roadmap', authenticateToken, validateGoalId, requireGoalOwnership, csrfProtection, validate(emptyBodySchema), goalController.generateRoadmap);

// Gap item analytics
goalRouter.get('/analyses/:analysisId', authenticateToken, validateAnalysisId, requireAnalysisOwnership, goalController.getGapAnalysisById);

export default goalRouter;
