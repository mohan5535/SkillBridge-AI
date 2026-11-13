import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/db.js';
import { userService } from '../../src/services/user.service.js';
import { NotFoundError } from '../../src/errors/NotFoundError.js';

describe('UserService Comprehensive Unit Tests', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe('listUsers', () => {
    it('returns users and calculated pagination metadata with defaults', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (/count\(\*\)/i.test(sql)) {
          return { rows: [{ total: '25' }] };
        }
        return {
          rows: [
            { user_id: 1, full_name: 'Alice User', email: 'alice@example.com' },
            { user_id: 2, full_name: 'Bob Candidate', email: 'bob@example.com' },
          ],
        };
      });

      const res = await userService.listUsers({});
      assert.equal(res.users.length, 2);
      assert.equal(res.meta.total, 25);
      assert.equal(res.meta.page, 1);
      assert.equal(res.meta.limit, 10);
      assert.equal(res.meta.totalPages, 3);
    });

    it('bounds page to >= 1 and limit to <= 100, and handles empty count rows', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (/count\(\*\)/i.test(sql)) {
          return { rows: [] }; // tests fallback '0'
        }
        assert.equal(params[1], 100); // capped at 100
        assert.equal(params[2], 0); // (page 1 - 1) * 100
        return { rows: [] };
      });

      const res = await userService.listUsers({ page: -5, limit: 500, search: 'test' });
      assert.equal(res.meta.total, 0);
      assert.equal(res.meta.page, 1);
      assert.equal(res.meta.limit, 100);
      assert.equal(res.meta.totalPages, 0);
    });
  });

  describe('getUserById', () => {
    it('returns user with complete parallel-loaded sub-resources', async () => {
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('education_records')) {
          return { rows: [{ education_id: 1, institution_name: 'Tech University' }] };
        }
        if (sql.includes('user_skills')) {
          return { rows: [{ user_skill_id: 2, skill_name: 'PostgreSQL' }] };
        }
        if (sql.includes('user_experiences')) {
          return { rows: [{ experience_id: 3, job_title: 'Junior Developer' }] };
        }
        if (sql.includes('user_certifications')) {
          return { rows: [{ user_cert_id: 4, certification_name: 'AWS Practitioner' }] };
        }
        if (sql.includes('career_breaks')) {
          return { rows: [{ break_id: 5, break_reason: 'Parental' }] };
        }
        if (/FROM\s+users\s+WHERE\s+user_id\s*=\s*\$1/i.test(sql)) {
          return { rows: [{ user_id: 10, full_name: 'Dev Candidate', email: 'dev@test.com' }] };
        }
        return { rows: [] };
      });

      const user = await userService.getUserById(10);
      assert.equal(user.user_id, 10);
      assert.equal(user.education.length, 1);
      assert.equal(user.skills.length, 1);
      assert.equal(user.experiences.length, 1);
      assert.equal(user.certifications.length, 1);
      assert.equal(user.career_breaks.length, 1);
    });

    it('throws NotFoundError when user does not exist', async () => {
      mock.method(pool, 'query', async () => ({ rows: [] }));

      await assert.rejects(
        () => userService.getUserById(999),
        (err) => {
          assert.ok(err instanceof NotFoundError);
          assert.match(err.message, /Candidate with user_id = 999 was not found/);
          return true;
        }
      );
    });
  });

  describe('createUser', () => {
    it('inserts candidate with provided and fallback null values', async () => {
      let passedParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        passedParams = params;
        return { rows: [{ user_id: 101, email: params[0], full_name: params[1] }] };
      });

      const res = await userService.createUser({
        email: 'newuser@example.com',
        full_name: 'New User',
        state_province: 'Ontario',
      });

      assert.equal(res.user_id, 101);
      assert.equal(passedParams[0], 'newuser@example.com');
      assert.equal(passedParams[1], 'New User');
      assert.equal(passedParams[2], null); // phone null fallback
      assert.equal(passedParams[3], null); // country null fallback
      assert.equal(passedParams[4], 'Ontario'); // state_province fallback
      assert.equal(passedParams[5], null); // date_of_birth null fallback
    });
  });

  describe('updateUser', () => {
    it('verifies existence and updates candidate fields', async () => {
      let updateParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        if (/FROM\s+users\s+WHERE\s+user_id\s*=\s*\$1/i.test(sql)) {
          return { rows: [{ user_id: 10, email: 'exist@test.com' }] };
        }
        if (/UPDATE\s+users/i.test(sql)) {
          updateParams = params;
          return { rows: [{ user_id: 10, full_name: params[1] }] };
        }
        return { rows: [] };
      });

      const updated = await userService.updateUser(10, {
        full_name: 'Updated Name',
        phone: '+1234567890',
        state_or_region: 'California',
      });

      assert.equal(updated.full_name, 'Updated Name');
      assert.equal(updateParams[0], 10);
      assert.equal(updateParams[1], 'Updated Name');
      assert.equal(updateParams[2], '+1234567890');
      assert.equal(updateParams[4], 'California');
    });

    it('propagates NotFoundError if candidate does not exist during update', async () => {
      mock.method(pool, 'query', async () => ({ rows: [] }));

      await assert.rejects(
        () => userService.updateUser(999, { full_name: 'Ghost' }),
        NotFoundError
      );
    });
  });

  describe('Sub-resource Methods', () => {
    it('manages education records (get and add with fallbacks)', async () => {
      let addParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('INSERT INTO education_records')) {
          addParams = params;
          return { rows: [{ education_id: 50, institution_name: params[2] }] };
        }
        return { rows: [{ education_id: 50 }] };
      });

      const list = await userService.getUserEducation(10);
      assert.equal(list.length, 1);

      const added = await userService.addEducation(10, {
        qualification_type_id: 3,
        institution_name: 'State College',
        grade_or_gpa: '3.9',
      });
      assert.equal(added.education_id, 50);
      assert.equal(addParams[0], 10);
      assert.equal(addParams[1], 3);
      assert.equal(addParams[2], 'State College');
      assert.equal(addParams[6], '3.9'); // grade_or_gpa fallback
      assert.equal(addParams[7], 'completed'); // default status
    });

    it('manages user skills (get and add with fallbacks)', async () => {
      let addParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('INSERT INTO user_skills')) {
          addParams = params;
          return { rows: [{ user_skill_id: 60, skill_id: params[1] }] };
        }
        return { rows: [{ user_skill_id: 60 }] };
      });

      const list = await userService.getUserSkills(10);
      assert.equal(list.length, 1);

      const added = await userService.addUserSkill(10, {
        skill_id: 15,
        proficiency_level: 'intermediate',
        evidence_url: 'https://github.com/test',
      });
      assert.equal(added.user_skill_id, 60);
      assert.equal(addParams[0], 10);
      assert.equal(addParams[1], 15);
      assert.equal(addParams[2], 'intermediate');
      assert.equal(addParams[3], 0); // default years_of_experience
      assert.equal(addParams[4], 'https://github.com/test'); // evidence_url fallback
    });

    it('manages experiences (get and add with fallbacks)', async () => {
      let addParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('INSERT INTO user_experiences')) {
          addParams = params;
          return { rows: [{ experience_id: 70, job_title: params[1] }] };
        }
        return { rows: [{ experience_id: 70 }] };
      });

      const list = await userService.getUserExperiences(10);
      assert.equal(list.length, 1);

      const added = await userService.addExperience(10, {
        job_title: 'Full Stack Engineer',
        company_name: 'Acme Corp',
        start_date: '2023-01-01',
      });
      assert.equal(added.experience_id, 70);
      assert.equal(addParams[0], 10);
      assert.equal(addParams[1], 'Full Stack Engineer');
      assert.equal(addParams[2], 'Acme Corp'); // company_name fallback
      assert.equal(addParams[3], 'full_time'); // default experience_type
    });

    it('manages certifications (get and add with default status)', async () => {
      let addParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('INSERT INTO user_certifications')) {
          addParams = params;
          return { rows: [{ user_cert_id: 80, certification_id: params[1] }] };
        }
        return { rows: [{ user_cert_id: 80 }] };
      });

      const list = await userService.getUserCertifications(10);
      assert.equal(list.length, 1);

      const added = await userService.addCertification(10, {
        certification_id: 7,
      });
      assert.equal(added.user_cert_id, 80);
      assert.equal(addParams[0], 10);
      assert.equal(addParams[1], 7);
      assert.equal(addParams[5], 'active'); // default status
    });

    it('manages career breaks (get and add)', async () => {
      let addParams = null;
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('INSERT INTO career_breaks')) {
          addParams = params;
          return { rows: [{ break_id: 90, break_reason: params[3] }] };
        }
        return { rows: [{ break_id: 90 }] };
      });

      const list = await userService.getUserCareerBreaks(10);
      assert.equal(list.length, 1);

      const added = await userService.addCareerBreak(10, {
        start_date: '2022-06-01',
        break_reason: 'Medical Leave',
      });
      assert.equal(added.break_id, 90);
      assert.equal(addParams[0], 10);
      assert.equal(addParams[1], '2022-06-01');
      assert.equal(addParams[2], null); // end_date null fallback
      assert.equal(addParams[3], 'Medical Leave');
      assert.equal(addParams[4], null); // description null fallback
    });

    it('manages sub-resources with explicit non-fallback field values', async () => {
      let eduParams, skillParams, expParams, certParams;
      mock.method(pool, 'query', async (sql, params) => {
        if (sql.includes('INSERT INTO education_records')) {
          eduParams = params;
          return { rows: [{ education_id: 1 }] };
        }
        if (sql.includes('INSERT INTO user_skills')) {
          skillParams = params;
          return { rows: [{ user_skill_id: 1 }] };
        }
        if (sql.includes('INSERT INTO user_experiences')) {
          expParams = params;
          return { rows: [{ experience_id: 1 }] };
        }
        if (sql.includes('INSERT INTO user_certifications')) {
          certParams = params;
          return { rows: [{ user_cert_id: 1 }] };
        }
        return { rows: [] };
      });

      await userService.addEducation(10, {
        qualification_type_id: 2,
        institution_name: 'MIT',
        field_of_study: 'CS',
        start_date: '2018-09-01',
        end_date: '2022-06-01',
        grade_or_score: '4.0',
        status: 'graduated',
      });
      assert.equal(eduParams[6], '4.0');
      assert.equal(eduParams[7], 'graduated');

      await userService.addUserSkill(10, {
        skill_id: 5,
        proficiency_level: 'expert',
        years_of_experience: 5,
        evidence: 'https://cert.com',
        last_used_date: '2026-01-01',
      });
      assert.equal(skillParams[3], 5);
      assert.equal(skillParams[4], 'https://cert.com');
      assert.equal(skillParams[5], '2026-01-01');

      await userService.addExperience(10, {
        job_title: 'Lead Architect',
        organization_name: 'BigTech',
        experience_type: 'contract',
        field_id: 2,
        start_date: '2022-07-01',
        end_date: '2025-12-31',
        description: 'Designed systems',
      });
      assert.equal(expParams[2], 'BigTech');
      assert.equal(expParams[3], 'contract');
      assert.equal(expParams[4], 2);

      await userService.addCertification(10, {
        certification_id: 3,
        credential_id: 'CRED-999',
        date_obtained: '2023-01-15',
        expiry_date: '2026-01-15',
        status: 'expired',
      });
      assert.equal(certParams[2], 'CRED-999');
      assert.equal(certParams[3], '2023-01-15');
      assert.equal(certParams[4], '2026-01-15');
      assert.equal(certParams[5], 'expired');
    });
  });
});
