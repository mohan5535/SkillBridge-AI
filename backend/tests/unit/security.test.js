import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { helmetMiddleware, corsMiddleware, originValidationMiddleware, rateLimitMiddleware } from '../../src/middleware/security.js';

function createMockResponse() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    setHeader(name, value) {
      headers[name.toLowerCase()] = String(value);
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    removeHeader(name) {
      delete headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end() {
      // noop for preflight
    },
  };
}

describe('Security Middleware & HTTP Headers Hardening (In-Memory Unit Test)', () => {
  it('should enforce Helmet security headers on responses', async () => {
    const req = { headers: {} };
    const res = createMockResponse();

    await new Promise((resolve) => {
      helmetMiddleware(req, res, () => {
        assert.equal(res.getHeader('x-content-type-options'), 'nosniff');
        assert.equal(res.getHeader('x-frame-options'), 'DENY');
        assert.ok(!res.getHeader('x-powered-by'));
        const csp = res.getHeader('content-security-policy');
        assert.ok(csp, 'Content-Security-Policy header must be present');
        assert.match(csp, /script-src 'self'/);
        assert.match(csp, /script-src-attr 'none'/);
        assert.match(csp, /style-src 'self' https:\/\/fonts\.googleapis\.com/);
        assert.match(csp, /style-src-attr 'none'/);
        assert.doesNotMatch(csp, /'unsafe-inline'/);
        assert.match(csp, /object-src 'none'/);
        assert.match(csp, /frame-ancestors 'none'/);
        resolve();
      });
    });
  });

  it('should apply CORS headers on request and allow X-CSRF-Token', async () => {
    const req = {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-headers': 'content-type,x-csrf-token',
        'access-control-request-method': 'POST',
      },
    };
    const res = createMockResponse();

    await new Promise((resolve) => {
      res.end = () => {
        assert.equal(res.getHeader('access-control-allow-origin'), 'http://localhost:3000');
        assert.equal(res.getHeader('access-control-allow-credentials'), 'true');
        const allowedHeaders = res.getHeader('access-control-allow-headers');
        assert.ok(
          allowedHeaders && allowedHeaders.toLowerCase().includes('x-csrf-token'),
          'CORS must allow X-CSRF-Token header'
        );
        resolve();
      };
      corsMiddleware(req, res, () => {
        resolve();
      });
    });
  });

  it('originValidationMiddleware allows safe GET and same-origin requests', async () => {
    const req = {
      method: 'GET',
      headers: { origin: 'http://evil.com' },
    };
    await new Promise((resolve, reject) => {
      originValidationMiddleware(req, {}, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });

  it('originValidationMiddleware blocks unauthorized cross-origin POST request', async () => {
    const req = {
      method: 'POST',
      headers: { origin: 'http://attacker-controlled-domain.xyz' },
    };
    await new Promise((resolve) => {
      originValidationMiddleware(req, {}, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'CORS_ORIGIN_DENIED');
        resolve();
      });
    });
  });

  it('originValidationMiddleware allows authorized origin POST request', async () => {
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    };
    await new Promise((resolve, reject) => {
      originValidationMiddleware(req, {}, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });

  it('originValidationMiddleware dynamically allows same-origin Host header across any deployment port while blocking external origin', async () => {
    const sameOriginReq = {
      method: 'POST',
      protocol: 'http',
      headers: {
        origin: 'http://127.0.0.1:5055',
        host: '127.0.0.1:5055',
      },
    };
    await new Promise((resolve, reject) => {
      originValidationMiddleware(sameOriginReq, {}, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const crossOriginReq = {
      method: 'POST',
      protocol: 'http',
      headers: {
        origin: 'http://attacker-domain.xyz',
        host: '127.0.0.1:5055',
      },
    };
    await new Promise((resolve) => {
      originValidationMiddleware(crossOriginReq, {}, (err) => {
        assert.ok(err);
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'CORS_ORIGIN_DENIED');
        resolve();
      });
    });
  });

  it('rateLimitMiddleware explicitly skips /health, /api/health, and / without throttling', async () => {
    const healthPaths = ['/health', '/api/health', '/health?verbose=true', '/api/health?probe=1', '/'];

    for (const testPath of healthPaths) {
      for (let i = 0; i < 20; i++) {
        let nextCalled = false;
        const req = {
          ip: '127.0.0.1',
          path: testPath.split('?')[0],
          originalUrl: testPath,
          headers: {},
        };
        const res = createMockResponse();

        await new Promise((resolve) => {
          rateLimitMiddleware(req, res, () => {
            nextCalled = true;
            resolve();
          });
        });

        assert.equal(nextCalled, true, `Expected next() to be called for ${testPath} on iteration ${i}`);
        assert.notEqual(res.statusCode, 429, `Health endpoint ${testPath} must never return 429`);
      }
    }
  });
});
