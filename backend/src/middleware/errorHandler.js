import { HTTP_STATUS } from '../constants/httpCodes.js';

/**
 * Centralized Express Error Handler Middleware.
 * Translates operational errors and PostgreSQL SQLSTATE codes into standardized JSend payloads.
 */
export function errorHandler(err, req, res, next) {
  // Determine baseline status and message
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let status = statusCode >= 500 ? 'error' : 'fail';
  let message = err.message || 'An unexpected internal server error occurred';
  let code = err.code || 'INTERNAL_ERROR';
  let errors = err.errors || undefined;
  let detail = err.detail || undefined;
  let constraint = err.constraint || undefined;

  // 1. PostgreSQL SQLSTATE Error Code Translation
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = HTTP_STATUS.CONFLICT; // 409
        status = 'fail';
        message = 'A record with this identifier or unique natural key already exists.';
        code = 'UNIQUE_VIOLATION';
        break;

      case '23503': // foreign_key_violation
        statusCode = HTTP_STATUS.BAD_REQUEST; // 400
        status = 'fail';
        message = 'Referenced parent or child entity does not exist in the database.';
        code = 'FOREIGN_KEY_VIOLATION';
        break;

      case '23514': // check_violation
        statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY; // 422
        status = 'fail';
        message = 'Input violates domain business rules (e.g., date ordering or score bounds).';
        code = 'CHECK_VIOLATION';
        break;

      case '22P02': // invalid_text_representation
        statusCode = HTTP_STATUS.BAD_REQUEST; // 400
        status = 'fail';
        message = 'Invalid parameter format (e.g. non-numeric ID supplied where integer expected).';
        code = 'INVALID_DATA_TYPE';
        break;

      case '23502': // not_null_violation
        statusCode = HTTP_STATUS.BAD_REQUEST; // 400
        status = 'fail';
        message = err.column ? `Mandatory field "${err.column}" cannot be null.` : 'A required mandatory field is missing.';
        code = 'NOT_NULL_VIOLATION';
        break;

      case 'EACCES':
      case 'ECONNREFUSED':
      case '57P01': // admin_shutdown
      case '08006': // connection_failure
      case '28P01': // invalid_password
        statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE; // 503
        status = 'error';
        message = 'Database service is currently unreachable or authentication failed. Please retry shortly.';
        code = 'DATABASE_UNAVAILABLE';
        break;
    }
  }

  // Handle SASL / SCRAM missing password client error
  if (err.message && (err.message.includes('SASL') || err.message.includes('password authentication failed') || err.message.includes('no password supplied'))) {
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
    status = 'error';
    message = 'Database authentication failed or unconfigured. Please configure PGPASSWORD in .env.';
    code = 'DATABASE_UNAVAILABLE';
  }

  // 2. Zod Validation Error formatting
  if (err.name === 'ZodError' && Array.isArray(err.errors)) {
    statusCode = HTTP_STATUS.BAD_REQUEST; // 400
    status = 'fail';
    message = 'Validation failed for request parameters or payload.';
    code = 'VALIDATION_ERROR';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected internal server error occurred';
    errors = undefined;
  }

  // Build clean JSend envelope
  const response = {
    status,
    message,
    code,
  };

  if (errors) response.errors = errors;
  if (detail && process.env.NODE_ENV !== 'production') response.detail = detail;
  if (constraint && process.env.NODE_ENV !== 'production') response.constraint = constraint;

  return res.status(statusCode).json(response);
}
