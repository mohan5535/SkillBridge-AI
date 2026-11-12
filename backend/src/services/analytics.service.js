import { query } from '../config/db.js';
import { ANALYTICAL_QUERIES } from '../queries/analyticalQueries.js';

export class AnalyticsService {
  async getExecutiveDashboard() {
    const startTime = Date.now();
    const res = await query(ANALYTICAL_QUERIES.Q15_EXECUTIVE_DASHBOARD);
    const durationMs = Date.now() - startTime;

    return {
      candidates: res.rows,
      meta: {
        total_active_goals: res.rowCount,
        execution_time_ms: durationMs,
        architecture: '3 Isolated Common Table Expressions (Zero Cartesian Multiplication)',
      },
    };
  }

  async getAtRiskCandidates() {
    const res = await query(ANALYTICAL_QUERIES.Q07_AT_RISK_CANDIDATES);
    return {
      at_risk_candidates: res.rows,
      meta: {
        threshold_pct: 60.0,
        total: res.rowCount,
      },
    };
  }

  async getCareerBreakCohort() {
    const res = await query(ANALYTICAL_QUERIES.Q09_CAREER_BREAK_COHORTS);
    return {
      cohort: res.rows,
      meta: {
        total: res.rowCount,
      },
    };
  }

  async getTaskCompletionSummary() {
    const res = await query(ANALYTICAL_QUERIES.Q11_TASK_COMPLETION_SUMMARY);
    return {
      candidates: res.rows,
      meta: {
        total_candidates: res.rowCount,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();

