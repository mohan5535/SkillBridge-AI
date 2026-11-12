import { learningService } from '../services/learning.service.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export const learningController = {
  async getPlansByUserId(req, res, next) {
    try {
      const plans = await learningService.getLearningPlansByUserId(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: plans,
        meta: { total: plans.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async getPlanById(req, res, next) {
    try {
      const plan = await learningService.getLearningPlanById(req.params.planId);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  },

  async createPlan(req, res, next) {
    try {
      const plan = await learningService.createLearningPlan(req.params.goalId, req.body);
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateItemStatus(req, res, next) {
    try {
      const item = await learningService.updatePlanItemStatus(req.params.itemId, req.body.status);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  },

  async listResources(req, res, next) {
    try {
      const { role_id, resource_type, difficulty } = req.query;
      const resources = await learningService.listResources({
        roleId: role_id,
        resourceType: resource_type,
        difficulty,
      });
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: resources,
        meta: { total: resources.length },
      });
    } catch (err) {
      next(err);
    }
  },
};

