import { Router } from 'express';
import { learningController } from '../controllers/learning.controller.js';
import {
  authenticateToken,
  requireOwnershipOrCounselor,
  requireResourceOwnershipOrCounselor,
} from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import {
  positiveIntParam,
  learningPlanSchema,
  updateLearningItemStatusSchema,
} from '../validators/schemas.js';

export const learningRouter = Router();
const validateUserId = validate(positiveIntParam('id'), 'params');
const validatePlanId = validate(positiveIntParam('planId'), 'params');
const validateGoalId = validate(positiveIntParam('goalId'), 'params');
const validateItemId = validate(positiveIntParam('itemId'), 'params');
const requireGoalOwnership = requireResourceOwnershipOrCounselor('goal', 'goalId');
const requirePlanOwnership = requireResourceOwnershipOrCounselor('learningPlan', 'planId');
const requirePlanItemOwnership = requireResourceOwnershipOrCounselor('learningPlanItem', 'itemId');

// Candidate learning plans (Guarded by DB resource ownership or Counselor/Admin role)
learningRouter.get('/users/:id/learning-plans', authenticateToken, validateUserId, requireOwnershipOrCounselor('id'), learningController.getPlansByUserId);
learningRouter.get('/learning-plans/:planId', authenticateToken, validatePlanId, requirePlanOwnership, learningController.getPlanById);
learningRouter.post('/goals/:goalId/learning-plans', authenticateToken, validateGoalId, requireGoalOwnership, csrfProtection, validate(learningPlanSchema), learningController.createPlan);
learningRouter.patch('/learning-plan-items/:itemId', authenticateToken, validateItemId, requirePlanItemOwnership, csrfProtection, validate(updateLearningItemStatusSchema), learningController.updateItemStatus);

// Learning catalog resources (Public browsing)
learningRouter.get('/resources', learningController.listResources);

export default learningRouter;
