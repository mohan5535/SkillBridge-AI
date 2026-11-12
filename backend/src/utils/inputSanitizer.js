import { ValidationError } from '../errors/ValidationError.js';
import { AppError } from '../errors/AppError.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

/**
 * Shared security input validation & XSS defense utilities.
 */

const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

const DANGEROUS_XSS_PATTERNS = [
  /<\s*script\b/i,
  /<\s*\/\s*script\b/i,
  /<\s*iframe\b/i,
  /<\s*object\b/i,
  /<\s*embed\b/i,
  /<\s*svg\b[^>]*\bon[a-z]+\s*=/i,
  /<\s*[a-z][a-z0-9:-]*\b[^>]*\bon(?:error|load|click|mouseover|focus|mouseenter|submit|toggle|input|change|blur|pointerover)\s*=/i,
  /^\s*(?:javascript|vbscript)\s*:\s*(?:[a-z_$][\w$.]*\s*\(|\/\/)/i,
  /<[^>]*\b(?:href|src|action|formaction|xlink:href)\s*=\s*['"\s]*(?:javascript|vbscript|data\s*:\s*text\/html)\b/i,
  /\bdata\s*:\s*text\/html\b/i,
  /\bexpression\s*\(/i,
];

const PROTO_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Checks whether a string contains null/control chars or dangerous HTML/script payloads.
 * @param {string} value
 * @returns {boolean}
 */
export function hasUnsafeXssPayload(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  if (CONTROL_CHAR_REGEX.test(value)) {
    return true;
  }
  return DANGEROUS_XSS_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Validates that a URL string strictly uses http: or https: protocol.
 * Blocks javascript:, vbscript:, data:, and file: URIs.
 * @param {string} value
 * @returns {boolean}
 */
export function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  if (CONTROL_CHAR_REGEX.test(value)) {
    return false;
  }
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Recursively walks incoming payloads to detect null bytes, prototype pollution keys,
 * and active XSS / dangerous URI vectors.
 * Skips HTML heuristics on raw secret fields (`password`) while still enforcing null-byte checks.
 */
function inspectValueForThreats(value, pathPrefix = '', findings = [], keyName = '') {
  if (value === null || value === undefined) {
    return findings;
  }

  if (typeof value === 'string') {
    if (CONTROL_CHAR_REGEX.test(value)) {
      findings.push({
        field: pathPrefix || keyName || 'input',
        message: 'Control characters or null bytes are not permitted.',
      });
      return findings;
    }

    if (keyName !== 'password' && hasUnsafeXssPayload(value)) {
      findings.push({
        field: pathPrefix || keyName || 'input',
        message: 'Unsafe HTML/script tags, inline event handlers, or dangerous URI schemes are not permitted.',
      });
    }
    return findings;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      inspectValueForThreats(value[i], `${pathPrefix}[${i}]`, findings, keyName);
    }
    return findings;
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (PROTO_POLLUTION_KEYS.has(key)) {
        findings.push({
          field: pathPrefix ? `${pathPrefix}.${key}` : key,
          message: 'Forbidden object property name detected.',
        });
        continue;
      }
      const nextPath = pathPrefix ? `${pathPrefix}.${key}` : key;
      inspectValueForThreats(value[key], nextPath, findings, key);
    }
  }

  return findings;
}

/**
 * Express middleware that blocks active XSS payloads, control characters, and prototype
 * pollution keys across req.body, req.query, and req.params before handlers run.
 */
export function sanitizeRequestInputs(req, res, next) {
  const findings = [];

  inspectValueForThreats(req.params, 'params', findings);
  inspectValueForThreats(req.query, 'query', findings);
  inspectValueForThreats(req.body, 'body', findings);

  if (findings.length > 0) {
    return next(
      new ValidationError('Request rejected by input security sanitizer.', findings)
    );
  }

  return next();
}

/**
 * Express middleware that fails closed on unsupported multipart/form-data file upload requests.
 * SkillBridge AI currently accepts only JSON and URL-encoded payloads and exposes zero upload endpoints.
 */
export function rejectMultipartUploads(req, res, next) {
  const contentType = req.headers?.['content-type'];
  if (typeof contentType === 'string' && contentType.toLowerCase().includes('multipart/form-data')) {
    return next(
      new AppError(
        'File uploads via multipart/form-data are not supported by this API endpoint.',
        HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE || 415,
        'UNSUPPORTED_MEDIA_TYPE'
      )
    );
  }
  return next();
}

