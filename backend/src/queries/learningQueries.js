/**
 * Parameterized SQL Queries for Domain 4 (Learning Roadmaps & Resources).
 * Integrates Query 10 and Query 12 from test_queries.sql.
 */

export const LEARNING_QUERIES = {
  GET_PLANS_BY_USER_ID: `
    SELECT
      lp.plan_id,
      lp.goal_id,
      lp.plan_name AS title,
      lp.plan_name,
      cr.role_title AS target_role,
      lp.start_date,
      lp.target_completion_date,
      lp.status,
      lp.description AS notes,
      lp.created_at,
      lp.updated_at
    FROM learning_plans lp
    JOIN career_goals cg ON lp.goal_id = cg.goal_id
    JOIN career_roles cr ON cg.role_id = cr.role_id
    WHERE cg.user_id = $1
    ORDER BY lp.start_date DESC;
  `,

  GET_PLAN_BY_ID: `
    SELECT
      lp.plan_id,
      lp.goal_id,
      lp.plan_name AS title,
      lp.plan_name,
      cr.role_title AS target_role,
      lp.start_date,
      lp.target_completion_date,
      lp.status,
      lp.description AS notes
    FROM learning_plans lp
    JOIN career_goals cg ON lp.goal_id = cg.goal_id
    JOIN career_roles cr ON cg.role_id = cr.role_id
    WHERE lp.plan_id = $1;
  `,

  CREATE_PLAN: `
    INSERT INTO learning_plans (
      goal_id, plan_name, start_date, target_completion_date, status, description
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `,

  // Query 10: Sequenced learning plan items with linked resources
  GET_PLAN_ITEMS_QUERY_10: `
    SELECT
      lpi.plan_item_id AS item_id,
      lpi.plan_item_id,
      lpi.plan_id,
      lpi.sequence_order,
      lpi.task_description,
      lr.resource_name,
      lr.resource_type,
      lr.provider,
      lr.estimated_duration_hours,
      lr.cost,
      lpi.status,
      lpi.due_date,
      lpi.completed_date,
      lpi.completed_date AS completion_date,
      lpi.notes
    FROM learning_plan_items lpi
    LEFT JOIN learning_resources lr ON lpi.resource_id = lr.resource_id
    WHERE lpi.plan_id = $1
    ORDER BY lpi.sequence_order ASC;
  `,

  UPDATE_PLAN_ITEM_STATUS: `
    UPDATE learning_plan_items
    SET
      status = $2,
      completed_date = CASE WHEN $2 = 'completed' THEN COALESCE(completed_date, CURRENT_DATE) ELSE completed_date END,
      updated_at = CURRENT_TIMESTAMP
    WHERE plan_item_id = $1
    RETURNING *;
  `,

  // Query 12: Role-Aligned Learning Resources
  LIST_RESOURCES_QUERY_12: `
    SELECT DISTINCT
      lr.resource_id,
      lr.resource_name,
      lr.resource_type,
      lr.provider,
      lr.url,
      lr.estimated_duration_hours,
      lr.cost,
      lr.description,
      lr.is_active,
      lr.created_at
    FROM learning_resources lr
    LEFT JOIN resource_skills rs ON lr.resource_id = rs.resource_id
    LEFT JOIN career_requirements req ON rs.skill_id = req.skill_id
    WHERE ($1::integer IS NULL OR req.role_id = $1)
      AND ($2::text IS NULL OR lr.resource_type = $2)
      AND ($3::text IS NULL OR TRUE)
    ORDER BY lr.resource_id ASC;
  `,
};

