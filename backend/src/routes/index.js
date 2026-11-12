import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { userRouter } from './user.routes.js';
import { catalogRouter } from './catalog.routes.js';
import { goalRouter } from './goal.routes.js';
import { learningRouter } from './learning.routes.js';
import { assessmentRouter } from './assessment.routes.js';
import { analyticsRouter } from './analytics.routes.js';

export const apiRouter = Router();

// Mount Authentication & Session Router (/api/auth)
apiRouter.use('/auth', authRouter);

// Mount Health Check Tracer
apiRouter.use(healthRouter);

// Mount Domain 1: User Identity & Profiles (/api/users)
apiRouter.use('/users', userRouter);

// Mount Domain 2: Dynamic Career Catalog (/api/catalog)
apiRouter.use('/catalog', catalogRouter);

// Mount Domain 3: Career Goals & Gap Analytics
apiRouter.use(goalRouter);

// Mount Domain 4: Learning Roadmaps & Resources
apiRouter.use(learningRouter);

// Mount Domain 5: Skill Assessments & Verification
apiRouter.use(assessmentRouter);

// Mount Domain 6: Executive Analytics Engine (/api/analytics)
apiRouter.use('/analytics', analyticsRouter);
