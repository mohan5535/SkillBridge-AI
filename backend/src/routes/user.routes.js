import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticateToken, requireRole, requireOwnershipOrCounselor } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { validate } from '../middleware/validate.js';
import {
  positiveIntParam,
  createUserSchema,
  updateUserSchema,
  educationSchema,
  userSkillSchema,
  userExperienceSchema,
  userCertificationSchema,
  careerBreakSchema,
} from '../validators/schemas.js';

export const userRouter = Router();
const validateUserId = validate(positiveIntParam('id'), 'params');

// Candidate roster list endpoint (Restricted to Counselors and Admins)
userRouter.get('/', authenticateToken, requireRole('counselor', 'admin'), userController.list);

// Single Candidate identity endpoints (Guarded by Ownership or Counselor role)
userRouter.get('/:id', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), userController.getById);
userRouter.post('/', authenticateToken, requireRole('counselor', 'admin'), csrfProtection, validate(createUserSchema), userController.create);
userRouter.put('/:id', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), csrfProtection, validate(updateUserSchema), userController.update);

// Education history sub-resource
userRouter.get('/:id/education', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), userController.getEducation);
userRouter.post('/:id/education', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), csrfProtection, validate(educationSchema), userController.addEducation);

// Skills portfolio sub-resource
userRouter.get('/:id/skills', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), userController.getSkills);
userRouter.post('/:id/skills', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), csrfProtection, validate(userSkillSchema), userController.addSkill);

// Work experience sub-resource
userRouter.get('/:id/experiences', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), userController.getExperiences);
userRouter.post('/:id/experiences', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), csrfProtection, validate(userExperienceSchema), userController.addExperience);

// Professional certifications sub-resource
userRouter.get('/:id/certifications', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), userController.getCertifications);
userRouter.post('/:id/certifications', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), csrfProtection, validate(userCertificationSchema), userController.addCertification);

// Career break recording sub-resource (neutral intake per FR-02)
userRouter.get('/:id/career-breaks', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), userController.getCareerBreaks);
userRouter.post('/:id/career-breaks', validateUserId, authenticateToken, requireOwnershipOrCounselor('id'), csrfProtection, validate(careerBreakSchema), userController.addCareerBreak);

export default userRouter;
