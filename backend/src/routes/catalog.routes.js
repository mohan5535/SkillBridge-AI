import { Router } from 'express';
import { catalogController } from '../controllers/catalog.controller.js';

export const catalogRouter = Router();

// Industry standard catalog endpoints
catalogRouter.get('/fields', catalogController.listFields);
catalogRouter.get('/roles', catalogController.listRoles);
catalogRouter.get('/roles/:id', catalogController.getRoleById);
catalogRouter.get('/skills', catalogController.listSkills);
catalogRouter.get('/qualifications', catalogController.listQualifications);
catalogRouter.get('/certifications', catalogController.listCertifications);

