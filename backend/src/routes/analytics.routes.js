import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export const analyticsRouter = Router();

// Executive dashboard and cohort analytics (Exclusively Counselor & Admin)
analyticsRouter.get('/dashboard', authenticateToken, requireRole('counselor', 'admin'), analyticsController.getDashboard);
analyticsRouter.get('/at-risk', authenticateToken, requireRole('counselor', 'admin'), analyticsController.getAtRisk);
analyticsRouter.get('/career-breaks', authenticateToken, requireRole('counselor', 'admin'), analyticsController.getCareerBreaks);
analyticsRouter.get('/task-summary', authenticateToken, requireRole('counselor', 'admin'), analyticsController.getTaskSummary);

export default analyticsRouter;
