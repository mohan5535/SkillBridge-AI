import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../../src/middleware/errorHandler.js';

function createMockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('ErrorHandler Comprehensive Branches Unit Tests', () => {
  it('translates PostgreSQL 23505 (unique_violation) to 409 Conflict', () => {
    const res = createMockRes();
    const err = { code: '23505', detail: 'Key already exists', constraint: 'users_email_key' };
    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'UNIQUE_VIOLATION');
    assert.match(res.body.message, /already exists/);
    assert.equal(res.body.detail, 'Key already exists');
    assert.equal(res.body.constraint, 'users_email_key');
  });

  it('translates PostgreSQL 23503 (foreign_key_violation) to 400 Bad Request', () => {
    const res = createMockRes();
    const err = { code: '23503' };
    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'FOREIGN_KEY_VIOLATION');
    assert.match(res.body.message, /Referenced parent or child entity does not exist/);
  });

  it('translates PostgreSQL 23514 (check_violation) to 422 Unprocessable Entity', () => {
    const res = createMockRes();
    const err = { code: '23514' };
    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 422);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'CHECK_VIOLATION');
    assert.match(res.body.message, /violates domain business rules/);
  });

  it('translates PostgreSQL 22P02 (invalid_text_representation) to 400 Bad Request', () => {
    const res = createMockRes();
    const err = { code: '22P02' };
    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'INVALID_DATA_TYPE');
    assert.match(res.body.message, /Invalid parameter format/);
  });

  it('translates PostgreSQL 23502 (not_null_violation) with and without column name', () => {
    // With column name
    const res1 = createMockRes();
    const err1 = { code: '23502', column: 'email' };
    errorHandler(err1, {}, res1, () => {});

    assert.equal(res1.statusCode, 400);
    assert.equal(res1.body.status, 'fail');
    assert.equal(res1.body.code, 'NOT_NULL_VIOLATION');
    assert.equal(res1.body.message, 'Mandatory field "email" cannot be null.');

    // Without column name
    const res2 = createMockRes();
    const err2 = { code: '23502' };
    errorHandler(err2, {}, res2, () => {});

    assert.equal(res2.statusCode, 400);
    assert.equal(res2.body.message, 'A required mandatory field is missing.');
  });

  it('translates connection & auth errors to 503 Service Unavailable', () => {
    const connectionCodes = ['EACCES', 'ECONNREFUSED', '57P01', '08006', '28P01'];
    for (const code of connectionCodes) {
      const res = createMockRes();
      errorHandler({ code }, {}, res, () => {});
      assert.equal(res.statusCode, 503);
      assert.equal(res.body.status, 'error');
      assert.equal(res.body.code, 'DATABASE_UNAVAILABLE');
    }
  });

  it('translates SASL, password authentication failed, and no password messages to 503', () => {
    const messages = [
      'SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string',
      'password authentication failed for user "postgres"',
      'no password supplied for connection',
    ];

    for (const message of messages) {
      const res = createMockRes();
      errorHandler({ message }, {}, res, () => {});
      assert.equal(res.statusCode, 503);
      assert.equal(res.body.status, 'error');
      assert.equal(res.body.code, 'DATABASE_UNAVAILABLE');
      assert.match(res.body.message, /Database authentication failed or unconfigured/);
    }
  });

  it('formats ZodError arrays into structured field error arrays', () => {
    const res = createMockRes();
    const zodError = {
      name: 'ZodError',
      errors: [
        { path: ['user', 'email'], message: 'Invalid email format' },
        { path: ['age'], message: 'Must be greater than 18' },
      ],
    };

    errorHandler(zodError, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.equal(res.body.errors.length, 2);
    assert.equal(res.body.errors[0].field, 'user.email');
    assert.equal(res.body.errors[0].message, 'Invalid email format');
    assert.equal(res.body.errors[1].field, 'age');
  });

  it('masks internal server error details in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = createMockRes();
      const err = {
        statusCode: 500,
        message: 'Raw database connection pool exhausted at tcp://10.0.0.1:5432',
        detail: 'Stack trace information',
        constraint: 'secret_key_info',
        errors: [{ path: ['db'], message: 'leak' }],
      };

      errorHandler(err, {}, res, () => {});

      assert.equal(res.statusCode, 500);
      assert.equal(res.body.status, 'error');
      assert.equal(res.body.message, 'An unexpected internal server error occurred');
      assert.equal(res.body.errors, undefined);
      assert.equal(res.body.detail, undefined);
      assert.equal(res.body.constraint, undefined);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

