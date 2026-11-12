import { query } from '../config/db.js';
import { LEARNING_QUERIES } from '../queries/learningQueries.js';
import { NotFoundError } from '../errors/NotFoundError.js';

export class LearningService {
  async getLearningPlansByUserId(userId) {
    const id = parseInt(userId, 10);
    const res = await query(LEARNING_QUERIES.GET_PLANS_BY_USER_ID, [id]);
    return res.rows;
  }

  async getLearningPlanById(planId) {
    const id = parseInt(planId, 10);
    const planRes = await query(LEARNING_QUERIES.GET_PLAN_BY_ID, [id]);

    if (planRes.rows.length === 0) {
      throw new NotFoundError(`Learning plan with plan_id = ${id} was not found`);
    }

    const itemsRes = await query(LEARNING_QUERIES.GET_PLAN_ITEMS_QUERY_10, [id]);

    const total = itemsRes.rows.length;
    const completed = itemsRes.rows.filter((item) => item.status === 'completed').length;
    const inProgress = itemsRes.rows.filter((item) => item.status === 'in_progress').length;
    const progressPct = total > 0 ? parseFloat(((completed / total) * 100).toFixed(2)) : 0;

    return {
      ...planRes.rows[0],
      progress: {
        total_tasks: total,
        completed_tasks: completed,
        in_progress_tasks: inProgress,
        pending_tasks: total - completed - inProgress,
        progress_percentage: progressPct,
      },
      tasks: itemsRes.rows,
    };
  }

  async createLearningPlan(goalId, data) {
    const id = parseInt(goalId, 10);
    const params = [
      id,
      data.title,
      data.start_date || null,
      data.target_completion_date || null,
      data.status || 'draft',
      data.notes || null,
    ];
    const res = await query(LEARNING_QUERIES.CREATE_PLAN, params);
    return res.rows[0];
  }

  async updatePlanItemStatus(itemId, status) {
    const id = parseInt(itemId, 10);
    const res = await query(LEARNING_QUERIES.UPDATE_PLAN_ITEM_STATUS, [id, status]);

    if (res.rows.length === 0) {
      throw new NotFoundError(`Learning plan item with item_id = ${id} was not found`);
    }

    return res.rows[0];
  }

  async listResources({ roleId = null, resourceType = null, difficulty = null } = {}) {
    const parsedRoleId = roleId ? parseInt(roleId, 10) : null;
    const res = await query(LEARNING_QUERIES.LIST_RESOURCES_QUERY_12, [
      parsedRoleId,
      resourceType,
      difficulty,
    ]);
    return res.rows;
  }
}

export const learningService = new LearningService();

