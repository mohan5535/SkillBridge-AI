/**
 * Parameterized SQL Queries for Domain 2 (Dynamic Career Catalog & Standards).
 * Integrates Query 4 and Query 5 from test_queries.sql.
 */

export const CATALOG_QUERIES = {
  // List career fields
  LIST_FIELDS: `
    SELECT
      field_id,
      field_name,
      description,
      is_active,
      created_at
    FROM career_fields
    ORDER BY field_id ASC;
  `,

  // Query 4: Career roles with count of mandatory and optional requirements
  LIST_ROLES: `
    SELECT
      cr.role_id,
      cr.field_id,
      cf.field_name,
      cr.role_title,
      cr.description,
      cr.jurisdiction,
      cr.organization,
      cr.experience_years_required,
      cr.is_active,
      COUNT(req.requirement_id)::integer AS total_requirements,
      COALESCE(SUM(CASE WHEN req.is_mandatory = TRUE THEN 1 ELSE 0 END), 0)::integer AS mandatory_requirements,
      COALESCE(SUM(CASE WHEN req.is_mandatory = FALSE THEN 1 ELSE 0 END), 0)::integer AS optional_requirements
    FROM career_roles cr
    JOIN career_fields cf ON cr.field_id = cf.field_id
    LEFT JOIN career_requirements req ON cr.role_id = req.role_id
    WHERE ($1::integer IS NULL OR cr.field_id = $1)
    GROUP BY cr.role_id, cr.field_id, cf.field_name, cr.role_title, cr.description,
             cr.jurisdiction, cr.organization, cr.experience_years_required, cr.is_active
    ORDER BY cr.role_id ASC;
  `,

  GET_ROLE_BY_ID: `
    SELECT
      cr.role_id,
      cr.field_id,
      cf.field_name,
      cr.role_title,
      cr.description,
      cr.jurisdiction,
      cr.organization,
      cr.experience_years_required,
      cr.is_active,
      cr.created_at,
      cr.updated_at
    FROM career_roles cr
    JOIN career_fields cf ON cr.field_id = cf.field_id
    WHERE cr.role_id = $1;
  `,

  // Query 5: Full-Stack Developer requirements with polymorphic breakdown
  GET_ROLE_REQUIREMENTS: `
    SELECT
      req.requirement_id,
      req.role_id,
      cr.role_title,
      req.requirement_type,
      req.skill_id,
      req.qualification_type_id,
      req.certification_id,
      CASE
        WHEN req.requirement_type = 'skill' THEN s.skill_name
        WHEN req.requirement_type = 'education' THEN qt.type_name
        WHEN req.requirement_type = 'certification' THEN c.certification_name
        ELSE req.description
      END AS requirement_target_name,
      req.is_mandatory,
      req.priority,
      req.description
    FROM career_requirements req
    JOIN career_roles cr ON req.role_id = cr.role_id
    LEFT JOIN skills s ON req.skill_id = s.skill_id
    LEFT JOIN qualification_types qt ON req.qualification_type_id = qt.qualification_type_id
    LEFT JOIN certifications c ON req.certification_id = c.certification_id
    WHERE req.role_id = $1
    ORDER BY req.is_mandatory DESC, req.priority ASC;
  `,

  // Skills library filterable by category
  LIST_SKILLS: `
    SELECT
      skill_id,
      skill_name,
      category,
      description,
      is_active,
      created_at
    FROM skills
    WHERE ($1::text IS NULL OR category ILIKE $1)
    ORDER BY category ASC, skill_name ASC;
  `,

  // Educational qualification types ordered by level_rank
  LIST_QUALIFICATIONS: `
    SELECT
      qualification_type_id,
      type_name,
      level_rank,
      description
    FROM qualification_types
    ORDER BY level_rank ASC;
  `,

  // Recognized professional certifications
  LIST_CERTIFICATIONS: `
    SELECT
      certification_id,
      certification_name,
      issuing_body,
      field_id,
      description,
      is_active,
      created_at
    FROM certifications
    ORDER BY certification_id ASC;
  `,
};

