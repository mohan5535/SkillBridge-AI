import { userService } from '../services/user.service.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export const userController = {
  async list(req, res, next) {
    try {
      const { page, limit, q } = req.query;
      const result = await userService.listUsers({ page, limit, search: q });
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: result.users,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const newUser = await userService.createUser(req.body);
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: newUser,
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const updatedUser = await userService.updateUser(req.params.id, req.body);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  },

  async getEducation(req, res, next) {
    try {
      const education = await userService.getUserEducation(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: education,
        meta: { total: education.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async addEducation(req, res, next) {
    try {
      const record = await userService.addEducation(req.params.id, req.body);
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: record,
      });
    } catch (err) {
      next(err);
    }
  },

  async getSkills(req, res, next) {
    try {
      const skills = await userService.getUserSkills(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: skills,
        meta: { total: skills.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async addSkill(req, res, next) {
    try {
      const skill = await userService.addUserSkill(req.params.id, req.body);
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: skill,
      });
    } catch (err) {
      next(err);
    }
  },

  async getExperiences(req, res, next) {
    try {
      const experiences = await userService.getUserExperiences(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: experiences,
        meta: { total: experiences.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async addExperience(req, res, next) {
    try {
      const experience = await userService.addExperience(req.params.id, req.body);
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: experience,
      });
    } catch (err) {
      next(err);
    }
  },

  async getCertifications(req, res, next) {
    try {
      const certifications = await userService.getUserCertifications(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: certifications,
        meta: { total: certifications.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async addCertification(req, res, next) {
    try {
      const certification = await userService.addCertification(req.params.id, req.body);
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: certification,
      });
    } catch (err) {
      next(err);
    }
  },

  async getCareerBreaks(req, res, next) {
    try {
      const breaks = await userService.getUserCareerBreaks(req.params.id);
      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: breaks,
        meta: { total: breaks.length },
      });
    } catch (err) {
      next(err);
    }
  },

  async addCareerBreak(req, res, next) {
    try {
      const record = await userService.addCareerBreak(req.params.id, req.body);
      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: record,
      });
    } catch (err) {
      next(err);
    }
  },
};

