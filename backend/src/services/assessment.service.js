import { query } from '../config/db.js';
import { ASSESSMENT_QUERIES } from '../queries/assessmentQueries.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { ValidationError } from '../errors/ValidationError.js';

export class AssessmentService {
  async listAssessments({ skillId = null, assessmentType = null } = {}) {
    const parsedSkillId = skillId ? parseInt(skillId, 10) : null;
    const res = await query(ASSESSMENT_QUERIES.LIST_ASSESSMENTS, [parsedSkillId, assessmentType]);
    return res.rows;
  }

  async getAssessmentById(assessmentId) {
    const id = parseInt(assessmentId, 10);
    const res = await query(ASSESSMENT_QUERIES.GET_ASSESSMENT_BY_ID, [id]);

    if (res.rows.length === 0) {
      throw new NotFoundError(`Assessment with assessment_id = ${id} was not found`);
    }

    return res.rows[0];
  }

  async submitAssessmentResult(assessmentId, userId, data) {
    const aId = parseInt(assessmentId, 10);
    const uId = parseInt(userId, 10);

    const assessment = await this.getAssessmentById(aId);

    const score = parseFloat(data.score);
    if (isNaN(score) || score < 0) {
      throw new ValidationError('Score must be a non-negative number');
    }
    if (score > assessment.max_score) {
      throw new ValidationError(`Score (${score}) exceeds assessment maximum score (${assessment.max_score})`);
    }

    const passed = score >= assessment.passing_score;
    const params = [
      uId,
      aId,
      score,
      passed,
      data.attempt_date || null,
      data.notes || null,
    ];

    const res = await query(ASSESSMENT_QUERIES.SUBMIT_ASSESSMENT, params);
    return res.rows[0];
  }

  async getUserAssessments(userId) {
    const id = parseInt(userId, 10);
    const res = await query(ASSESSMENT_QUERIES.GET_USER_ASSESSMENTS_QUERY_13, [id]);
    return res.rows;
  }

  async getUserGrowthReport(userId = null) {
    const id = userId ? parseInt(userId, 10) : null;
    const res = await query(ASSESSMENT_QUERIES.GET_USER_GROWTH_QUERY_14, [id]);
    return res.rows;
  }
}

export const assessmentService = new AssessmentService();

