import { query } from '../config/db.js';
import { CATALOG_QUERIES } from '../queries/catalogQueries.js';
import { NotFoundError } from '../errors/NotFoundError.js';

export class CatalogService {
  async listFields() {
    const res = await query(CATALOG_QUERIES.LIST_FIELDS);
    return res.rows;
  }

  async listRoles({ fieldId = null } = {}) {
    const parsedFieldId = fieldId ? parseInt(fieldId, 10) : null;
    const res = await query(CATALOG_QUERIES.LIST_ROLES, [parsedFieldId]);
    return res.rows;
  }

  async getRoleById(roleId) {
    const id = parseInt(roleId, 10);
    const roleRes = await query(CATALOG_QUERIES.GET_ROLE_BY_ID, [id]);

    if (roleRes.rows.length === 0) {
      throw new NotFoundError(`Career role with role_id = ${id} was not found`);
    }

    const reqsRes = await query(CATALOG_QUERIES.GET_ROLE_REQUIREMENTS, [id]);

    return {
      ...roleRes.rows[0],
      requirements: reqsRes.rows,
    };
  }

  async listSkills({ category = null } = {}) {
    const res = await query(CATALOG_QUERIES.LIST_SKILLS, [category]);
    return res.rows;
  }

  async listQualifications() {
    const res = await query(CATALOG_QUERIES.LIST_QUALIFICATIONS);
    return res.rows;
  }

  async listCertifications() {
    const res = await query(CATALOG_QUERIES.LIST_CERTIFICATIONS);
    return res.rows;
  }
}

export const catalogService = new CatalogService();

