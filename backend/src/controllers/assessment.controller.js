import { assessmentService } from '../services/assessment.service.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export const assessmentController = {
  async listAssessments(req, res, next) {
    try {
      const { skill_id, assessment_type } = req.query;
      const assessments = await assessmentService.listAssessments({
        skillId: skill_id,
        assessmentType: assessment_type,
      });
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: assessments,
        meta: { total: assessments.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async getAssessmentById(req, res, next) {
    try {
      const assessment = await assessmentService.getAssessmentById(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: assessment,
      });
    } catch (err) {
      next(err);
    }
  },

  async submitResult(req, res, next) {
    try {
      const result = await assessmentService.submitAssessmentResult(
        req.params.id,
        req.body.user_id,
        req.body
      );
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async getUserAssessments(req, res, next) {
    try {
      const results = await assessmentService.getUserAssessments(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: results,
        meta: { total: results.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async getUserGrowth(req, res, next) {
    try {
      const growth = await assessmentService.getUserGrowthReport(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: growth,
        meta: { total: growth.length },
      });
    } catch (err) {
      next(err);
    }
  },
};

