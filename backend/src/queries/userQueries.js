/**
 * Parameterized SQL Queries for Domain 1 (User Profiles & History).
 * Strictly references verified columns from schema.sql and test_queries.sql.
 */

export const USER_QUERIES = {
  // List candidates with search and pagination
  LIST_USERS: `
    SELECT
      user_id,
      email,
      full_name,
      phone,
      country,
      state_or_region,
      date_of_birth,
      created_at,
      updated_at
    FROM users
    WHERE ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
    ORDER BY user_id ASC
    LIMIT $2 OFFSET $3;
  `,

  COUNT_USERS: `
    SELECT count(*) AS total
    FROM users
    WHERE ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%');
  `,

  GET_USER_BY_ID: `
    SELECT
      user_id,
      email,
      full_name,
      phone,
      country,
      state_or_region,
      date_of_birth,
      created_at,
      updated_at
    FROM users
    WHERE user_id = $1;
  `,

  CREATE_USER: `
    INSERT INTO users (
      email, full_name, phone, country, state_or_region, date_of_birth
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `,

  UPDATE_USER: `
    UPDATE users
    SET
      full_name = COALESCE($2, full_name),
      phone = COALESCE($3, phone),
      country = COALESCE($4, country),
      state_or_region = COALESCE($5, state_or_region),
      date_of_birth = COALESCE($6, date_of_birth),
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
    RETURNING *;
  `,

  // Query 1: User Education Roster with Qualification Rank
  GET_USER_EDUCATION: `
    SELECT
      er.education_id,
      er.user_id,
      u.full_name,
      er.institution_name,
      qt.type_name AS qualification,
      qt.level_rank,
      er.field_of_study,
      er.start_date,
      er.end_date,
      er.grade_or_score,
      er.grade_or_score AS grade_or_gpa,
      er.status
    FROM users u
    LEFT JOIN education_records er ON u.user_id = er.user_id
    LEFT JOIN qualification_types qt ON er.qualification_type_id = qt.qualification_type_id
    WHERE u.user_id = $1
    ORDER BY qt.level_rank DESC NULLS LAST;
  `,

  ADD_USER_EDUCATION: `
    INSERT INTO education_records (
      user_id, qualification_type_id, institution_name,
      field_of_study, start_date, end_date, grade_or_score,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `,

  // Query 2: Acquired Skills with Proficiency and Experience
  GET_USER_SKILLS: `
    SELECT
      us.user_skill_id,
      us.user_id,
      s.skill_id,
      s.skill_name,
      s.category,
      us.proficiency_level,
      us.years_of_experience,
      us.evidence,
      us.evidence AS evidence_url,
      us.last_used_date
    FROM user_skills us
    JOIN skills s ON us.skill_id = s.skill_id
    WHERE us.user_id = $1
    ORDER BY us.years_of_experience DESC NULLS LAST;
  `,

  ADD_USER_SKILL: `
    INSERT INTO user_skills (
      user_id, skill_id, proficiency_level,
      years_of_experience, evidence, last_used_date
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `,

  // Query 3: Employment and Work Experience History
  GET_USER_EXPERIENCES: `
    SELECT
      ue.experience_id,
      ue.user_id,
      ue.organization_name AS company_name,
      ue.organization_name,
      ue.job_title,
      ue.experience_type,
      cf.field_name AS career_field,
      ue.field_id,
      ue.start_date,
      ue.end_date,
      ue.description
    FROM user_experiences ue
    LEFT JOIN career_fields cf ON ue.field_id = cf.field_id
    WHERE ue.user_id = $1
    ORDER BY ue.start_date DESC;
  `,

  ADD_USER_EXPERIENCE: `
    INSERT INTO user_experiences (
      user_id, job_title, organization_name, experience_type,
      field_id, start_date, end_date, description
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `,

  // User Certifications (date_obtained NOT issue_date)
  GET_USER_CERTIFICATIONS: `
    SELECT
      uc.user_certification_id AS user_cert_id,
      uc.user_certification_id,
      uc.user_id,
      c.certification_name AS cert_name,
      c.certification_name,
      c.issuing_body AS issuing_organization,
      c.issuing_body,
      uc.credential_id,
      uc.date_obtained,
      uc.expiry_date,
      uc.status
    FROM user_certifications uc
    LEFT JOIN certifications c ON uc.certification_id = c.certification_id
    WHERE uc.user_id = $1
    ORDER BY uc.date_obtained DESC NULLS LAST;
  `,

  ADD_USER_CERTIFICATION: `
    INSERT INTO user_certifications (
      user_id, certification_id, credential_id,
      date_obtained, expiry_date, status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `,

  // Career Break Recording (Neutral Intake per FR-02)
  GET_USER_CAREER_BREAKS: `
    SELECT
      cb.break_id,
      cb.user_id,
      cb.start_date,
      cb.end_date,
      cb.break_reason,
      cb.description,
      cb.created_at
    FROM career_breaks cb
    WHERE cb.user_id = $1
    ORDER BY cb.start_date DESC;
  `,

  ADD_USER_CAREER_BREAK: `
    INSERT INTO career_breaks (
      user_id, start_date, end_date, break_reason, description
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `,
};

