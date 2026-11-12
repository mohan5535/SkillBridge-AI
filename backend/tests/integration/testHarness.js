/**
 * In-Memory Request/Response Test Harness
 * Directly invokes Express controllers and middleware without binding TCP ports,
 * completely avoiding Windows EACCES / sandbox loopback socket restrictions.
 */
import { errorHandler } from '../../src/middleware/errorHandler.js';

export function createMockRes() {
  let statusCode = 200;
  const resHeaders = {};
  const resCookies = [];

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    cookie(name, val, opts) {
      resCookies.push({ name, val, opts });
    },
    clearCookie(name, opts) {
      resCookies.push({ name, val: '', cleared: true, opts });
    },
    setHeader(name, val) {
      resHeaders[name.toLowerCase()] = val;
    },
    getHeader(name) {
      return resHeaders[name.toLowerCase()];
    },
    get cookies() {
      return resCookies;
    },
    get statusCode() {
      return statusCode;
    },
    json(body) {
      return { status: statusCode, body, cookies: resCookies, headers: resHeaders };
    },
  };
}

export function invokeHandler(handler, reqOptions = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const resHeaders = {};
    const resCookies = [];

    const req = {
      method: reqOptions.method || 'GET',
      url: reqOptions.url || '/',
      body: reqOptions.body || {},
      params: reqOptions.params || {},
      query: reqOptions.query || {},
      headers: reqOptions.headers || {},
      cookies: reqOptions.cookies || {},
      user: reqOptions.user || null,
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      cookie(name, val, opts) {
        resCookies.push({ name, val, opts });
      },
      clearCookie(name, opts) {
        resCookies.push({ name, val: '', cleared: true, opts });
      },
      setHeader(name, val) {
        resHeaders[name.toLowerCase()] = val;
      },
      getHeader(name) {
        return resHeaders[name.toLowerCase()];
      },
      json(body) {
        resolve({
          status: statusCode,
          body,
          cookies: resCookies,
          headers: resHeaders,
        });
      },
    };

    const next = (err) => {
      if (err) {
        errorHandler(err, req, res, () => {});
      } else {
        resolve({
          status: statusCode,
          body: null,
          cookies: resCookies,
          headers: resHeaders,
          nextCalled: true,
        });
      }
    };

    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        result.catch((e) => next(e));
      }
    } catch (e) {
      next(e);
    }
  });
}
