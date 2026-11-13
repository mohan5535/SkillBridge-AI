import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasUnsafeXssPayload,
  isSafeHttpUrl,
  sanitizeRequestInputs,
  rejectMultipartUploads,
} from '../../src/utils/inputSanitizer.js';
import { ValidationError } from '../../src/errors/ValidationError.js';
import { AppError } from '../../src/errors/AppError.js';

describe('Input Sanitizer Branches & Edge Cases Unit Tests', () => {
  describe('hasUnsafeXssPayload & isSafeHttpUrl edge cases', () => {
    it('handles non-string, empty, and control character inputs in hasUnsafeXssPayload', () => {
      assert.equal(hasUnsafeXssPayload(null), false);
      assert.equal(hasUnsafeXssPayload(undefined), false);
      assert.equal(hasUnsafeXssPayload(12345), false);
      assert.equal(hasUnsafeXssPayload(''), false);
      assert.equal(hasUnsafeXssPayload('Hello world'), false);
      assert.equal(hasUnsafeXssPayload('test\x00string'), true);
    });

    it('handles empty, control char, invalid syntax, and protocol checks in isSafeHttpUrl', () => {
      assert.equal(isSafeHttpUrl(null), false);
      assert.equal(isSafeHttpUrl(''), false);
      assert.equal(isSafeHttpUrl('   '), false);
      assert.equal(isSafeHttpUrl('https://example.com/\x00test'), false);
      assert.equal(isSafeHttpUrl('not-a-valid-url'), false);
      assert.equal(isSafeHttpUrl('ftp://example.com'), false);
      assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
      assert.equal(isSafeHttpUrl('http://localhost:3000'), true);
      assert.equal(isSafeHttpUrl('https://skillbridge.org'), true);
    });
  });

  describe('sanitizeRequestInputs middleware recursive branches', () => {
    it('handles null/undefined values and passes clean payloads', () => {
      const req = {
        params: { id: null },
        query: { filter: undefined },
        body: { active: true, count: 10, nested: { status: 'ok' } },
      };
      let calledNext = false;
      sanitizeRequestInputs(req, {}, () => {
        calledNext = true;
      });
      assert.equal(calledNext, true);
    });

    it('catches control chars inside strings and arrays', () => {
      const reqControl = {
        params: {},
        query: {},
        body: { items: ['clean', 'polluted\x05string'] },
      };
      let passedError = null;
      sanitizeRequestInputs(reqControl, {}, (err) => {
        passedError = err;
      });
      assert.ok(passedError instanceof ValidationError);
      assert.match(passedError.message, /Request rejected by input security sanitizer/);
      assert.ok(passedError.errors.some((e) => e.message.includes('Control characters')));
    });

    it('catches XSS vectors inside arrays and nested objects', () => {
      const reqXss = {
        params: {},
        query: {},
        body: { tags: ['tech', '<script>alert(1)</script>'] },
      };
      let passedError = null;
      sanitizeRequestInputs(reqXss, {}, (err) => {
        passedError = err;
      });
      assert.ok(passedError instanceof ValidationError);
      assert.ok(passedError.errors.some((e) => e.message.includes('Unsafe HTML/script tags')));
    });
  });

  describe('rejectMultipartUploads middleware', () => {
    it('allows non-multipart requests and missing headers to pass', () => {
      let next1 = false;
      rejectMultipartUploads({ headers: {} }, {}, () => {
        next1 = true;
      });
      assert.equal(next1, true);

      let next2 = false;
      rejectMultipartUploads({ headers: { 'content-type': 'application/json' } }, {}, () => {
        next2 = true;
      });
      assert.equal(next2, true);
    });

    it('blocks multipart/form-data with 415 AppError', () => {
      let passedError = null;
      rejectMultipartUploads(
        { headers: { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary' } },
        {},
        (err) => {
          passedError = err;
        }
      );
      assert.ok(passedError instanceof AppError);
      assert.equal(passedError.statusCode, 415);
      assert.equal(passedError.code, 'UNSUPPORTED_MEDIA_TYPE');
    });
  });
});

