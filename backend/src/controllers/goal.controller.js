import { gapAnalysisService } from '../services/gapAnalysis.service.js';
import { readinessEngine } from '../services/readinessEngine.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export const goalController = {
  async getGoalsByUserId(req, res, next) {
    try {
      const goals = await gapAnalysisService.getGoalsByUserId(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: goals,
        meta: { total: goals.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async createGoal(req, res, next) {
    try {
      const goal = await gapAnalysisService.createGoal(req.params.id, req.body);
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: goal,
      });
    } catch (err) {
      next(err);
    }
  },

  async getSkillMatch(req, res, next) {
    try {
      const match = await gapAnalysisService.getSkillMatch(req.params.goalId);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: match,
      });
    } catch (err) {
      next(err);
    }
  },

  async createGapAnalysis(req, res, next) {
    try {
      const analysis = await gapAnalysisService.createGapAnalysis(req.params.goalId, req.body);
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: analysis,
      });
    } catch (err) {
      next(err);
    }
  },

  async getGapAnalysisById(req, res, next) {
    try {
      const analysis = await gapAnalysisService.getGapAnalysisById(req.params.analysisId);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: analysis,
      });
    } catch (err) {
      next(err);
    }
  },

  async analyzeGoal(req, res, next) {
    try {
      const result = await readinessEngine.evaluateGoalReadiness(req.params.goalId);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async generateRoadmap(req, res, next) {
    try {
      const result = await readinessEngine.generateLearningRoadmap(req.params.goalId);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};

