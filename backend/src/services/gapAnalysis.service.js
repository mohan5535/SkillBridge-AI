import { query } from '../config/db.js';
import { GAP_QUERIES } from '../queries/gapQueries.js';
import { NotFoundError } from '../errors/NotFoundError.js';

export class GapAnalysisService {
  async getGoalsByUserId(userId) {
    const id = parseInt(userId, 10);
    const res = await query(GAP_QUERIES.GET_GOALS_BY_USER_ID, [id]);
    return res.rows;
  }

  async createGoal(userId, data) {
    const id = parseInt(userId, 10);
    const params = [
      id,
      data.target_role_id,
      data.target_completion_date || null,
      data.priority || 3,
      data.status || 'exploring',
      data.notes || null,
    ];
    const res = await query(GAP_QUERIES.CREATE_GOAL, params);
    return res.rows[0];
  }

  async getSkillMatch(goalId) {
    const id = parseInt(goalId, 10);
    const goalRes = await query(GAP_QUERIES.GET_GOAL_BY_ID, [id]);

    if (goalRes.rows.length === 0) {
      throw new NotFoundError(`Career goal with goal_id = ${id} was not found`);
    }

    const matchRes = await query(GAP_QUERIES.GET_SKILL_MATCH_QUERY_8, [id]);

    const total = matchRes.rows.length;
    const met = matchRes.rows.filter((r) => r.match_status === 'MET').length;
    const matchPercentage = total > 0 ? parseFloat(((met / total) * 100).toFixed(2)) : 0;

    return {
      goal: goalRes.rows[0],
      summary: {
        total_skills_required: total,
        skills_met: met,
        skills_missing: total - met,
        match_percentage: matchPercentage,
      },
      skills: matchRes.rows,
    };
  }

  async getGapAnalysisById(analysisId) {
    const id = parseInt(analysisId, 10);
    const analysisRes = await query(GAP_QUERIES.GET_GAP_ANALYSIS_BY_ID, [id]);

    if (analysisRes.rows.length === 0) {
      throw new NotFoundError(`Gap analysis with analysis_id = ${id} was not found`);
    }

    const itemsRes = await query(GAP_QUERIES.GET_GAP_ITEMS_QUERY_6, [id]);

    return {
      ...analysisRes.rows[0],
      gap_items: itemsRes.rows,
    };
  }

  async createGapAnalysis(goalId, data) {
    const id = parseInt(goalId, 10);
    const params = [
      id,
      data.overall_readiness_pct || null,
      data.status || 'in_progress',
      data.conducted_at || null,
      data.summary_notes || null,
    ];
    const res = await query(GAP_QUERIES.CREATE_GAP_ANALYSIS, params);
    return res.rows[0];
  }
}

export const gapAnalysisService = new GapAnalysisService();

