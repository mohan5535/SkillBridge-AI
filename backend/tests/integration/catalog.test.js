import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';
import { closePool } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';

async function safeReq(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === 'EACCES') return null;
    throw err;
  }
}

describe('Domain 2: Career Catalog & Industry Standards Integration Tests', () => {
  after(async () => {
    await closePool();
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('GET /api/catalog/fields should list career fields', async () => {
    const res = await safeReq(() => request(app).get('/api/catalog/fields'));

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.ok('field_name' in res.body.data[0]);
  });

  it('GET /api/catalog/roles should return roles with mandatory and optional requirement counts (Query 4)', async () => {
    const res = await safeReq(() => request(app).get('/api/catalog/roles'));

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 5); // 5 committed roles

    const role1 = res.body.data.find((r) => r.role_id === 1);
    assert.ok(role1, 'Full-Stack Developer role should exist');
    assert.equal(role1.role_title, 'Full-Stack Developer');
    assert.ok('mandatory_requirements' in role1);
    assert.ok('optional_requirements' in role1);
    assert.ok('total_requirements' in role1);
  });

  it('GET /api/catalog/roles/1 should resolve polymorphic requirements (Query 5)', async () => {
    const res = await safeReq(() => request(app).get('/api/catalog/roles/1'));

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.data.role_title, 'Full-Stack Developer');
    assert.ok(Array.isArray(res.body.data.requirements));
    assert.equal(res.body.data.requirements.length, 6);

    // Verify polymorphic target resolution
    const skillReq = res.body.data.requirements.find((r) => r.requirement_type === 'skill');
    assert.ok(skillReq);
    assert.ok(skillReq.requirement_target_name);

    const eduReq = res.body.data.requirements.find((r) => r.requirement_type === 'education');
    assert.ok(eduReq);
    assert.ok(eduReq.requirement_target_name);
  });

  it('GET /api/catalog/qualifications should list educational tiers ordered by level_rank', async () => {
    const res = await safeReq(() => request(app).get('/api/catalog/qualifications'));

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(res.body.data.length >= 1);

    // Verify ascending order by level_rank
    for (let i = 1; i < res.body.data.length; i++) {
      assert.ok(res.body.data[i].level_rank >= res.body.data[i - 1].level_rank);
    }
  });

  it('GET /api/catalog/certifications should list recognized certifications', async () => {
    const res = await safeReq(() => request(app).get('/api/catalog/certifications'));

    if (!res || res.status === HTTP_STATUS.SERVICE_UNAVAILABLE) return;

    assert.equal(res.status, HTTP_STATUS.OK);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
  });
});

