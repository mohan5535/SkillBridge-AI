/**
 * Parameterized SQL Queries for Domain 3 (Career Goals & Gap Analytics).
 * Integrates Query 6 and Query 8 from test_queries.sql.
 */

export const GAP_QUERIES = {
  GET_GOALS_BY_USER_ID: `
    SELECT
      cg.goal_id,
      cg.user_id,
      cg.role_id AS target_role_id,
      cg.role_id,
      cr.role_title,
      cf.field_name,
      cg.target_date AS target_completion_date,
      cg.target_date,
      cg.priority,
      cg.status,
      cg.notes,
      cg.created_at,
      cg.updated_at
    FROM career_goals cg
    JOIN career_roles cr ON cg.role_id = cr.role_id
    JOIN career_fields cf ON cr.field_id = cf.field_id
    WHERE cg.user_id = $1
    ORDER BY cg.priority ASC, cg.created_at DESC;
  `,

  CREATE_GOAL: `
    INSERT INTO career_goals (
      user_id, role_id, target_date, priority, status, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `,

  GET_GOAL_BY_ID: `
    SELECT
      cg.goal_id,
      cg.user_id,
      u.full_name AS candidate_name,
      cg.role_id AS target_role_id,
      cg.role_id,
      cr.role_title,
      cg.target_date AS target_completion_date,
      cg.target_date,
      cg.priority,
      cg.status,
      cg.notes
    FROM career_goals cg
    JOIN users u ON cg.user_id = u.user_id
    JOIN career_roles cr ON cg.role_id = cr.role_id
    WHERE cg.goal_id = $1;
  `,

  // Query 8: Skills Comparison vs Target Role Requirements (Python MET, React NOT MET, SQL MET)
  GET_SKILL_MATCH_QUERY_8: `
    SELECT
      u.full_name AS candidate_name,
      cr.role_title AS target_role,
      s.skill_name AS required_skill,
      req.requirement_type,
      req.is_mandatory,
      COALESCE(us.proficiency_level, 'not_acquired') AS candidate_proficiency,
      CASE
        WHEN us.proficiency_level IS NULL THEN 'NOT MET'
        WHEN (
          CASE us.proficiency_level
            WHEN 'beginner' THEN 1
            WHEN 'intermediate' THEN 2
            WHEN 'advanced' THEN 3
            WHEN 'expert' THEN 4
            ELSE 0
          END
        ) >= (
          CASE req.expected_proficiency
            WHEN 'beginner' THEN 1
            WHEN 'intermediate' THEN 2
            WHEN 'advanced' THEN 3
            WHEN 'expert' THEN 4
            ELSE 0
          END
        ) THEN 'MET'
        ELSE 'NOT MET'
      END AS match_status
    FROM career_goals cg
    JOIN users u ON cg.user_id = u.user_id
    JOIN career_roles cr ON cg.role_id = cr.role_id
    JOIN career_requirements req ON cr.role_id = req.role_id AND req.requirement_type = 'skill'
    JOIN skills s ON req.skill_id = s.skill_id
    LEFT JOIN user_skills us ON cg.user_id = us.user_id AND req.skill_id = us.skill_id
    WHERE cg.goal_id = $1
    ORDER BY req.is_mandatory DESC, s.skill_name ASC;
  `,

  GET_GAP_ANALYSIS_BY_ID: `
    SELECT
      cga.analysis_id,
      cga.goal_id,
      cga.user_id,
      u.full_name AS candidate_name,
      cr.role_title AS target_role,
      cga.overall_readiness_pct,
      cga.status,
      cga.analysis_date AS conducted_at,
      cga.analysis_date,
      cga.summary_notes,
      cga.created_at
    FROM career_gap_analyses cga
    JOIN career_goals cg ON cga.goal_id = cg.goal_id
    JOIN users u ON cga.user_id = u.user_id
    JOIN career_roles cr ON cg.role_id = cr.role_id
    WHERE cga.analysis_id = $1;
  `,

  CREATE_GAP_ANALYSIS: `
    INSERT INTO career_gap_analyses (
      goal_id, overall_readiness_pct, status, analysis_date, summary_notes
    )
    VALUES ($1, $2, $3, COALESCE($4, CURRENT_TIMESTAMP), $5)
    RETURNING *;
  `,

  // Query 6: User Gap Analysis & Gap Items with Severity Ratings
  GET_GAP_ITEMS_QUERY_6: `
    SELECT
      cgi.gap_item_id AS item_id,
      cgi.gap_item_id,
      cgi.analysis_id,
      gt.type_name AS gap_type,
      CASE
        WHEN req.skill_id IS NOT NULL THEN s.skill_name
        WHEN req.qualification_type_id IS NOT NULL THEN qt.type_name
        WHEN req.certification_id IS NOT NULL THEN c.certification_name
        ELSE 'General'
      END AS gap_subject,
      cgi.gap_severity,
      cgi.priority,
      cgi.current_state,
      cgi.required_state,
      cgi.status,
      cgi.gap_description AS notes,
      cgi.gap_description,
      cgi.evidence
    FROM career_gap_items cgi
    JOIN gap_types gt ON cgi.gap_type_id = gt.gap_type_id
    LEFT JOIN career_requirements req ON cgi.requirement_id = req.requirement_id
    LEFT JOIN skills s ON req.skill_id = s.skill_id
    LEFT JOIN qualification_types qt ON req.qualification_type_id = qt.qualification_type_id
    LEFT JOIN certifications c ON req.certification_id = c.certification_id
    WHERE cgi.analysis_id = $1
    ORDER BY cgi.priority ASC, cgi.gap_item_id ASC;
  `,
};

