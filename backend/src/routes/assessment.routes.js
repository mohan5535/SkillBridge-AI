import { Router } from 'express';
import { assessmentController } from '../controllers/assessment.controller.js';
import {
  authenticateToken,
  requireOwnershipOrCounselor,
  requireBodyUserOwnershipOrCounselor,
} from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import { positiveIntParam, submitAssessmentSchema } from '../validators/schemas.js';

export const assessmentRouter = Router();
const validateAssessmentId = validate(positiveIntParam('id'), 'params');
const validateUserId = validate(positiveIntParam('id'), 'params');

// Assessment catalog (Public)
assessmentRouter.get('/assessments', assessmentController.listAssessments);
assessmentRouter.get('/assessments/:id', validateAssessmentId, assessmentController.getAssessmentById);
assessmentRouter.post(
  '/assessments/:id/submit',
  authenticateToken,
  validateAssessmentId,
  csrfProtection,
  validate(submitAssessmentSchema),
  requireBodyUserOwnershipOrCounselor('user_id'),
  assessmentController.submitResult
);

// Candidate assessment history & growth detection (Guarded by candidate ownership)
assessmentRouter.get('/users/:id/assessments', authenticateToken, validateUserId, requireOwnershipOrCounselor('id'), assessmentController.getUserAssessments);
assessmentRouter.get('/users/:id/growth', authenticateToken, validateUserId, requireOwnershipOrCounselor('id'), assessmentController.getUserGrowth);

export default assessmentRouter;
