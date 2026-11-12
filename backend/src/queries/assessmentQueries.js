/**
 * Parameterized SQL Queries for Domain 5 (Skill Assessments & Verification).
 * Integrates Query 13 and Query 14 from test_queries.sql.
 */

export const ASSESSMENT_QUERIES = {
  LIST_ASSESSMENTS: `
    SELECT
      a.assessment_id,
      a.skill_id,
      s.skill_name,
      s.category AS skill_category,
      a.assessment_name AS title,
      a.assessment_name,
      a.assessment_type,
      a.max_score,
      a.passing_score,
      a.description,
      a.created_at
    FROM assessments a
    LEFT JOIN skills s ON a.skill_id = s.skill_id
    WHERE ($1::integer IS NULL OR a.skill_id = $1)
      AND ($2::text IS NULL OR a.assessment_type = $2)
    ORDER BY a.assessment_id ASC;
  `,

  GET_ASSESSMENT_BY_ID: `
    SELECT
      a.assessment_id,
      a.skill_id,
      s.skill_name,
      a.assessment_name AS title,
      a.assessment_name,
      a.assessment_type,
      a.max_score,
      a.passing_score,
      a.description,
      a.created_at
    FROM assessments a
    LEFT JOIN skills s ON a.skill_id = s.skill_id
    WHERE a.assessment_id = $1;
  `,

  SUBMIT_ASSESSMENT: `
    INSERT INTO assessment_results (
      user_id, assessment_id, score, passed, attempt_date, notes
    )
    VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_TIMESTAMP), $6)
    RETURNING *;
  `,

  // Query 13: User Assessment History
  GET_USER_ASSESSMENTS_QUERY_13: `
    SELECT
      ar.result_id,
      ar.user_id,
      u.full_name,
      a.assessment_id,
      a.assessment_name AS assessment_title,
      a.assessment_name,
      a.assessment_type,
      s.skill_name,
      ar.score,
      a.max_score,
      a.passing_score,
      ar.passed,
      ar.attempt_date,
      ar.notes
    FROM assessment_results ar
    JOIN assessments a ON ar.assessment_id = a.assessment_id
    JOIN users u ON ar.user_id = u.user_id
    LEFT JOIN skills s ON a.skill_id = s.skill_id
    WHERE ar.user_id = $1
    ORDER BY ar.attempt_date DESC;
  `,

  // Query 14: Skill Growth & Retake Detection (pass after chronological fail)
  GET_USER_GROWTH_QUERY_14: `
    WITH ranked_attempts AS (
      SELECT
        ar.result_id,
        ar.user_id,
        u.full_name,
        ar.assessment_id,
        a.assessment_name AS assessment_title,
        ar.score,
        ar.passed,
        ar.attempt_date,
        ROW_NUMBER() OVER (
          PARTITION BY ar.user_id, ar.assessment_id
          ORDER BY ar.attempt_date ASC
        ) AS attempt_order
      FROM assessment_results ar
      JOIN users u ON ar.user_id = u.user_id
      JOIN assessments a ON ar.assessment_id = a.assessment_id
    )
    SELECT
      first_att.full_name,
      first_att.assessment_title,
      first_att.score AS first_attempt_score,
      first_att.passed AS first_attempt_passed,
      first_att.attempt_date AS first_attempt_date,
      latest_att.score AS latest_attempt_score,
      latest_att.passed AS latest_attempt_passed,
      latest_att.attempt_date AS latest_attempt_date,
      (latest_att.score - first_att.score) AS score_improvement
    FROM ranked_attempts first_att
    JOIN ranked_attempts latest_att
      ON first_att.user_id = latest_att.user_id
     AND first_att.assessment_id = latest_att.assessment_id
     AND first_att.attempt_order = 1
     AND latest_att.attempt_order > 1
    WHERE ($1::integer IS NULL OR first_att.user_id = $1)
    ORDER BY score_improvement DESC;
  `,
};

