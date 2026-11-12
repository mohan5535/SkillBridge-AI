/**
 * Parameterized SQL Queries for Domain 6 (Executive Analytics Engine).
 * Integrates Query 7, Query 9, Query 11, and Query 15 from test_queries.sql.
 */

export const ANALYTICAL_QUERIES = {
  // Query 15: Executive Readiness Dashboard using 3 isolated CTEs (eliminating Cartesian explosion)
  Q15_EXECUTIVE_DASHBOARD: `
    WITH latest_analysis AS (
      SELECT DISTINCT ON (cga.goal_id)
        cga.analysis_id,
        cga.goal_id,
        cga.overall_readiness_pct,
        cga.status AS analysis_status,
        cga.analysis_date
      FROM career_gap_analyses cga
      ORDER BY cga.goal_id, cga.analysis_date DESC
    ),
    gap_summary AS (
      SELECT
        cgi.analysis_id,
        COUNT(cgi.gap_item_id) AS total_gaps,
        COUNT(cgi.gap_item_id) FILTER (WHERE cgi.gap_severity = 'critical') AS critical_gaps,
        COUNT(cgi.gap_item_id) FILTER (WHERE cgi.gap_severity = 'high') AS high_gaps,
        COUNT(cgi.gap_item_id) FILTER (WHERE cgi.status = 'resolved') AS resolved_gaps
      FROM career_gap_items cgi
      GROUP BY cgi.analysis_id
    ),
    learning_summary AS (
      SELECT
        lp.goal_id,
        COUNT(lpi.plan_item_id) AS total_tasks,
        COUNT(lpi.plan_item_id) FILTER (WHERE lpi.status = 'completed') AS completed_tasks
      FROM learning_plans lp
      LEFT JOIN learning_plan_items lpi ON lp.plan_id = lpi.plan_id
      GROUP BY lp.goal_id
    )
    SELECT
      u.user_id,
      u.full_name AS candidate_name,
      COALESCE(u.state_or_region, '') || ', ' || COALESCE(u.country, '') AS location,
      cr.role_title AS target_role,
      cg.priority AS goal_priority,
      la.overall_readiness_pct,
      la.analysis_status,
      COALESCE(gs.total_gaps, 0)::integer AS total_gaps,
      COALESCE(gs.critical_gaps, 0)::integer AS critical_gaps,
      COALESCE(gs.resolved_gaps, 0)::integer AS resolved_gaps,
      COALESCE(ls.total_tasks, 0)::integer AS total_learning_tasks,
      COALESCE(ls.completed_tasks, 0)::integer AS completed_learning_tasks,
      CASE
        WHEN ls.total_tasks > 0 THEN
          ROUND((ls.completed_tasks::NUMERIC / ls.total_tasks) * 100, 1)
        ELSE 0.0
      END AS roadmap_progress_pct
    FROM users u
    JOIN career_goals cg ON u.user_id = cg.user_id
    JOIN career_roles cr ON cg.role_id = cr.role_id
    LEFT JOIN latest_analysis la ON cg.goal_id = la.goal_id
    LEFT JOIN gap_summary gs ON la.analysis_id = gs.analysis_id
    LEFT JOIN learning_summary ls ON cg.goal_id = ls.goal_id
    ORDER BY la.overall_readiness_pct ASC NULLS FIRST;
  `,

  // Query 7: At-Risk Candidates with latest readiness < 60%
  Q07_AT_RISK_CANDIDATES: `
    WITH latest_analyses AS (
      SELECT DISTINCT ON (ga.goal_id)
        ga.analysis_id,
        ga.goal_id,
        ga.overall_readiness_pct,
        ga.analysis_date
      FROM career_gap_analyses ga
      ORDER BY ga.goal_id, ga.analysis_date DESC
    )
    SELECT
      u.user_id,
      u.full_name,
      u.email,
      cr.role_title AS target_role,
      la.overall_readiness_pct,
      la.analysis_date AS last_assessed_date
    FROM latest_analyses la
    JOIN career_goals cg ON la.goal_id = cg.goal_id
    JOIN users u ON cg.user_id = u.user_id
    JOIN career_roles cr ON cg.role_id = cr.role_id
    WHERE la.overall_readiness_pct < 60.00
    ORDER BY la.overall_readiness_pct ASC;
  `,

  // Query 9: Career Break Cohort Analysis
  Q09_CAREER_BREAK_COHORTS: `
    SELECT
      u.user_id,
      u.full_name,
      cb.break_reason,
      cb.start_date AS break_start,
      cb.end_date AS break_end,
      cr.role_title AS target_role,
      cga.overall_readiness_pct
    FROM users u
    JOIN career_breaks cb ON u.user_id = cb.user_id
    JOIN career_goals cg ON u.user_id = cg.user_id
    JOIN career_roles cr ON cg.role_id = cr.role_id
    LEFT JOIN career_gap_analyses cga ON cg.goal_id = cga.goal_id
    ORDER BY cb.start_date DESC;
  `,

  // Query 11: Candidate Roadmap Task Completion Summary
  Q11_TASK_COMPLETION_SUMMARY: `
    SELECT
      u.user_id,
      u.full_name,
      COUNT(lpi.plan_item_id)::integer AS total_tasks,
      COUNT(CASE WHEN lpi.status = 'completed' THEN 1 END)::integer AS completed_tasks,
      COUNT(CASE WHEN lpi.status = 'in_progress' THEN 1 END)::integer AS in_progress_tasks,
      COUNT(CASE WHEN lpi.status = 'pending' THEN 1 END)::integer AS pending_tasks,
      COALESCE(
        ROUND(
          COUNT(CASE WHEN lpi.status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(lpi.plan_item_id), 0) * 100,
          1
        ),
        0.0
      ) AS completion_rate_pct
    FROM users u
    LEFT JOIN career_goals cg ON u.user_id = cg.user_id
    LEFT JOIN learning_plans lp ON cg.goal_id = lp.goal_id
    LEFT JOIN learning_plan_items lpi ON lp.plan_id = lpi.plan_id
    GROUP BY u.user_id, u.full_name
    ORDER BY completion_rate_pct DESC, u.user_id ASC;
  `,
};

