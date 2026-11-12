import * as cookie from 'cookie';
import * as signature from 'cookie-signature';

/**
 * Lightweight cookie parsing middleware utilizing native cookie & cookie-signature packages.
 * Parses Cookie header into req.cookies and decrypts signed cookies into req.signedCookies.
 *
 * @param {string|string[]} secret - Secret string or array of secrets for signed cookies
 * @returns {Function} Express middleware function
 */
export function cookieParser(secret) {
  return function cookieParserMiddleware(req, res, next) {
    if (req.cookies) {
      return next();
    }

    const cookieHeader = req.headers.cookie;
    req.cookies = {};
    req.signedCookies = {};

    if (!cookieHeader) {
      return next();
    }

    req.cookies = cookie.parse(cookieHeader);

    if (secret) {
      const secrets = Array.isArray(secret) ? secret : [secret];
      for (const [key, val] of Object.entries(req.cookies)) {
        if (typeof val === 'string' && val.startsWith('s:')) {
          for (const s of secrets) {
            const unsigned = signature.unsign(val.slice(2), s);
            if (unsigned !== false) {
              req.signedCookies[key] = unsigned;
              delete req.cookies[key];
              break;
            }
          }
        }
      }
    }

    next();
  };
}

export default cookieParser;

