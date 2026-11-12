import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { NotFoundError } from '../../src/errors/NotFoundError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';
import { HTTP_STATUS } from '../../src/constants/httpCodes.js';

function createMockResponse() {
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

const mockReq = { method: 'POST', url: '/api/test' };
const mockNext = () => {};

describe('Centralized Error Handler Middleware (SQLSTATE Mapping)', () => {
  it('should map 23505 unique_violation to HTTP 409 Conflict', () => {
    const err = { code: '23505', detail: 'Key (email)=(priya.sharma@example.com) already exists.' };
    const res = createMockResponse();

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, HTTP_STATUS.CONFLICT);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'UNIQUE_VIOLATION');
    assert.match(res.body.message, /already exists/);
  });

  it('should map 23503 foreign_key_violation to HTTP 400 Bad Request', () => {
    const err = { code: '23503', detail: 'Key (user_id)=(999) is not present in table "users".' };
    const res = createMockResponse();

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'FOREIGN_KEY_VIOLATION');
    assert.match(res.body.message, /Referenced parent or child entity does not exist/);
  });

  it('should map 23514 check_violation to HTTP 422 Unprocessable Entity', () => {
    const err = { code: '23514', constraint: 'chk_break_reason' };
    const res = createMockResponse();

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'CHECK_VIOLATION');
    assert.equal(res.body.constraint, 'chk_break_reason');
  });

  it('should map 22P02 invalid_text_representation to HTTP 400 Bad Request', () => {
    const err = { code: '22P02' };
    const res = createMockResponse();

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'INVALID_DATA_TYPE');
  });

  it('should map 23502 not_null_violation to HTTP 400 Bad Request', () => {
    const err = { code: '23502', column: 'full_name' };
    const res = createMockResponse();

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, HTTP_STATUS.BAD_REQUEST);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'NOT_NULL_VIOLATION');
    assert.match(res.body.message, /full_name/);
  });

  it('should map ECONNREFUSED to HTTP 503 Service Unavailable', () => {
    const err = { code: 'ECONNREFUSED' };
    const res = createMockResponse();

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, HTTP_STATUS.SERVICE_UNAVAILABLE);
    assert.equal(res.body.status, 'error');
    assert.equal(res.body.code, 'DATABASE_UNAVAILABLE');
  });

  it('should handle custom NotFoundError with HTTP 404', () => {
    const err = new NotFoundError('Candidate with user_id = 999 not found');
    const res = createMockResponse();

    errorHandler(err, mockReq, res, mockNext);

    assert.equal(res.statusCode, HTTP_STATUS.NOT_FOUND);
    assert.equal(res.body.status, 'fail');
    assert.equal(res.body.code, 'RESOURCE_NOT_FOUND');
    assert.match(res.body.message, /user_id = 999 not found/);
  });
});

