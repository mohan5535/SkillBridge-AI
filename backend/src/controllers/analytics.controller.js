import { analyticsService } from '../services/analytics.service.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export const analyticsController = {
  async getDashboard(req, res, next) {
    try {
      const dashboard = await analyticsService.getExecutiveDashboard();
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: dashboard.candidates,
        meta: dashboard.meta,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAtRisk(req, res, next) {
    try {
      const atRisk = await analyticsService.getAtRiskCandidates();
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: atRisk.at_risk_candidates,
        meta: atRisk.meta,
      });
    } catch (err) {
      next(err);
    }
  },

  async getCareerBreaks(req, res, next) {
    try {
      const breaks = await analyticsService.getCareerBreakCohort();
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: breaks.cohort,
        meta: breaks.meta,
      });
    } catch (err) {
      next(err);
    }
  },

  async getTaskSummary(req, res, next) {
    try {
      const summary = await analyticsService.getTaskCompletionSummary();
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: summary.candidates,
        meta: summary.meta,
      });
    } catch (err) {
      next(err);
    }
  },
};

