import { query } from '../config/db.js';
import { USER_QUERIES } from '../queries/userQueries.js';
import { NotFoundError } from '../errors/NotFoundError.js';

export class UserService {
  async listUsers({ page = 1, limit = 10, search = null }) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const [rowsRes, countRes] = await Promise.all([
      query(USER_QUERIES.LIST_USERS, [search, limitNum, offset]),
      query(USER_QUERIES.COUNT_USERS, [search]),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return {
      users: rowsRes.rows,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getUserById(userId) {
    const id = parseInt(userId, 10);
    const userRes = await query(USER_QUERIES.GET_USER_BY_ID, [id]);

    if (userRes.rows.length === 0) {
      throw new NotFoundError(`Candidate with user_id = ${id} was not found`);
    }

    // Parallel load of profile sub-resources
    const [eduRes, skillsRes, expRes, certsRes, breaksRes] = await Promise.all([
      query(USER_QUERIES.GET_USER_EDUCATION, [id]),
      query(USER_QUERIES.GET_USER_SKILLS, [id]),
      query(USER_QUERIES.GET_USER_EXPERIENCES, [id]),
      query(USER_QUERIES.GET_USER_CERTIFICATIONS, [id]),
      query(USER_QUERIES.GET_USER_CAREER_BREAKS, [id]),
    ]);

    return {
      ...userRes.rows[0],
      education: eduRes.rows,
      skills: skillsRes.rows,
      experiences: expRes.rows,
      certifications: certsRes.rows,
      career_breaks: breaksRes.rows,
    };
  }

  async createUser(data) {
    const params = [
      data.email,
      data.full_name,
      data.phone || null,
      data.country || null,
      data.state_or_region || data.state_province || null,
      data.date_of_birth || null,
    ];

    const res = await query(USER_QUERIES.CREATE_USER, params);
    return res.rows[0];
  }

  async updateUser(userId, data) {
    const id = parseInt(userId, 10);
    // Verify existence
    await this.getUserById(id);

    const params = [
      id,
      data.full_name || null,
      data.phone || null,
      data.country || null,
      data.state_or_region || data.state_province || null,
      data.date_of_birth || null,
    ];

    const res = await query(USER_QUERIES.UPDATE_USER, params);
    return res.rows[0];
  }

  async getUserEducation(userId) {
    const id = parseInt(userId, 10);
    const res = await query(USER_QUERIES.GET_USER_EDUCATION, [id]);
    return res.rows;
  }

  async addEducation(userId, data) {
    const id = parseInt(userId, 10);
    const params = [
      id,
      data.qualification_type_id,
      data.institution_name,
      data.field_of_study || null,
      data.start_date || null,
      data.end_date || null,
      data.grade_or_score || data.grade_or_gpa || null,
      data.status || 'completed',
    ];
    const res = await query(USER_QUERIES.ADD_USER_EDUCATION, params);
    return res.rows[0];
  }

  async getUserSkills(userId) {
    const id = parseInt(userId, 10);
    const res = await query(USER_QUERIES.GET_USER_SKILLS, [id]);
    return res.rows;
  }

  async addUserSkill(userId, data) {
    const id = parseInt(userId, 10);
    const params = [
      id,
      data.skill_id,
      data.proficiency_level,
      data.years_of_experience || 0,
      data.evidence || data.evidence_url || null,
      data.last_used_date || null,
    ];
    const res = await query(USER_QUERIES.ADD_USER_SKILL, params);
    return res.rows[0];
  }

  async getUserExperiences(userId) {
    const id = parseInt(userId, 10);
    const res = await query(USER_QUERIES.GET_USER_EXPERIENCES, [id]);
    return res.rows;
  }

  async addExperience(userId, data) {
    const id = parseInt(userId, 10);
    const params = [
      id,
      data.job_title,
      data.organization_name || data.company_name,
      data.experience_type || 'full_time',
      data.field_id || null,
      data.start_date,
      data.end_date || null,
      data.description || null,
    ];
    const res = await query(USER_QUERIES.ADD_USER_EXPERIENCE, params);
    return res.rows[0];
  }

  async getUserCertifications(userId) {
    const id = parseInt(userId, 10);
    const res = await query(USER_QUERIES.GET_USER_CERTIFICATIONS, [id]);
    return res.rows;
  }

  async addCertification(userId, data) {
    const id = parseInt(userId, 10);
    const params = [
      id,
      data.certification_id,
      data.credential_id || null,
      data.date_obtained || null,
      data.expiry_date || null,
      data.status || 'active',
    ];
    const res = await query(USER_QUERIES.ADD_USER_CERTIFICATION, params);
    return res.rows[0];
  }

  async getUserCareerBreaks(userId) {
    const id = parseInt(userId, 10);
    const res = await query(USER_QUERIES.GET_USER_CAREER_BREAKS, [id]);
    return res.rows;
  }

  async addCareerBreak(userId, data) {
    const id = parseInt(userId, 10);
    const params = [
      id,
      data.start_date,
      data.end_date || null,
      data.break_reason,
      data.description || null,
    ];
    const res = await query(USER_QUERIES.ADD_USER_CAREER_BREAK, params);
    return res.rows[0];
  }
}

export const userService = new UserService();

