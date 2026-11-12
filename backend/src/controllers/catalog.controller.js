import { catalogService } from '../services/catalog.service.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export const catalogController = {
  async listFields(req, res, next) {
    try {
      const fields = await catalogService.listFields();
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: fields,
        meta: { total: fields.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async listRoles(req, res, next) {
    try {
      const { field_id } = req.query;
      const roles = await catalogService.listRoles({ fieldId: field_id });
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: roles,
        meta: { total: roles.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async getRoleById(req, res, next) {
    try {
      const role = await catalogService.getRoleById(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: role,
      });
    } catch (err) {
      next(err);
    }
  },

  async listSkills(req, res, next) {
    try {
      const { category } = req.query;
      const skills = await catalogService.listSkills({ category });
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: skills,
        meta: { total: skills.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async listQualifications(req, res, next) {
    try {
      const qualifications = await catalogService.listQualifications();
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: qualifications,
        meta: { total: qualifications.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async listCertifications(req, res, next) {
    try {
      const certifications = await catalogService.listCertifications();
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: certifications,
        meta: { total: certifications.length },
      });
    } catch (err) {
      next(err);
    }
  },
};

