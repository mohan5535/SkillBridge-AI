import { authService } from '../services/auth.service.js';
import { query } from '../config/db.js';
import { AppError } from '../errors/AppError.js';
import { NotFoundError } from '../errors/NotFoundError.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

const AUTH_COOKIE_NAME = 'sb_auth_token';

/**
 * Express middleware to authenticate JWT access tokens from HTTP-only cookie or Authorization header.
 * Attaches decoded identity claims to req.user.
 */
export function authenticateToken(req, res, next) {
  let token = null;

  // 1. Primary: Extract from HTTP-only cookie
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    token = req.cookies[AUTH_COOKIE_NAME];
  }

  // 2. Fallback: Extract from Authorization Bearer header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    }
  }

  if (!token) {
    return next(
      new AppError(
        'Authentication required. Please log in or provide a valid session token.',
        HTTP_STATUS.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED'
      )
    );
  }

  try {
    const decoded = authService.verifyJwt(token);
    req.user = {
      userId: decoded.userId || decoded.sub,
      email: decoded.email,
      role: decoded.role || 'candidate',
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError(
          'Authentication token has expired. Please log in again.',
          HTTP_STATUS.UNAUTHORIZED,
          'TOKEN_EXPIRED'
        )
      );
    }
    return next(
      new AppError(
        'Authentication token is invalid or corrupted.',
        HTTP_STATUS.UNAUTHORIZED,
        'TOKEN_INVALID'
      )
    );
  }
}

/**
 * Role-Based Access Control (RBAC) middleware generator.
 * Restricts access exclusively to specified roles.
 *
 * @param {...string} allowedRoles - Authorized roles (e.g. 'counselor', 'admin')
 * @returns {Function} Express middleware function
 */
export function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required.',
          HTTP_STATUS.UNAUTHORIZED,
          'AUTHENTICATION_REQUIRED'
        )
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access restricted. Required role(s): [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'.`,
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN_ROLE'
        )
      );
    }

    next();
  };
}

/**
 * Candidate Ownership Isolation Guard.
 * Ensures Candidates can access only their own user resources,
 * while Counselors and Administrators have read/audit privileges.
 *
 * @param {string} paramName - Name of route param containing target user ID (default: 'id')
 * @returns {Function} Express middleware function
 */
export function requireOwnershipOrCounselor(paramName = 'id') {
  return function ownershipMiddleware(req, res, next) {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required.',
          HTTP_STATUS.UNAUTHORIZED,
          'AUTHENTICATION_REQUIRED'
        )
      );
    }

    // Counselors and Admins have supervisory access
    if (req.user.role === 'counselor' || req.user.role === 'admin') {
      return next();
    }

    const targetUserId = parseInt(req.params[paramName], 10);
    const candidateUserId = parseInt(req.user.userId, 10);

    if (isNaN(targetUserId) || candidateUserId !== targetUserId) {
      return next(
        new AppError(
          'Forbidden. Candidates are strictly restricted to accessing only their own profile and records.',
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN_RESOURCE_ACCESS'
        )
      );
    }

    next();
  };
}

const RESOURCE_OWNER_QUERIES = Object.freeze({
  goal: 'SELECT user_id FROM career_goals WHERE goal_id = $1',
  analysis: 'SELECT user_id FROM career_gap_analyses WHERE analysis_id = $1',
  learningPlan: 'SELECT user_id FROM learning_plans WHERE plan_id = $1',
  learningPlanItem:
    'SELECT lp.user_id FROM learning_plan_items lpi JOIN learning_plans lp ON lpi.plan_id = lp.plan_id WHERE lpi.plan_item_id = $1',
});

/**
 * Database-backed Secondary Resource Ownership Guard (IDOR defense).
 * Resolves owner user_id from PostgreSQL for indirect resource IDs (goalId, analysisId, planId, itemId).
 * Counselors and Administrators retain supervisory read/audit access.
 */
export function requireResourceOwnershipOrCounselor(resourceType, paramName = 'id', queryFn = query) {
  const sql = RESOURCE_OWNER_QUERIES[resourceType];
  if (!sql) {
    throw new Error(`Unsupported ownership resource type: ${resourceType}`);
  }

  return async function resourceOwnershipMiddleware(req, res, next) {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required.',
          HTTP_STATUS.UNAUTHORIZED,
          'AUTHENTICATION_REQUIRED'
        )
      );
    }

    if (req.user.role === 'counselor' || req.user.role === 'admin') {
      return next();
    }

    const resourceId = parseInt(req.params[paramName], 10);
    const candidateUserId = parseInt(req.user.userId, 10);

    if (Number.isNaN(resourceId) || resourceId <= 0 || Number.isNaN(candidateUserId)) {
      return next(
        new AppError(
          'Forbidden. Invalid resource ownership context.',
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN_RESOURCE_ACCESS'
        )
      );
    }

    try {
      const result = await queryFn(sql, [resourceId]);
      if (result.rows.length === 0) {
        return next(new NotFoundError(`Requested ${resourceType} resource with ${paramName} = ${resourceId} was not found`));
      }

      const ownerUserId = parseInt(result.rows[0].user_id, 10);
      if (ownerUserId !== candidateUserId) {
        return next(
          new AppError(
            'Forbidden. Candidates are strictly restricted to accessing and modifying their own resources.',
            HTTP_STATUS.FORBIDDEN,
            'FORBIDDEN_RESOURCE_ACCESS'
          )
        );
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Request-Body Candidate Ownership Guard (e.g. POST /api/assessments/:id/submit).
 * Prevents a candidate from submitting assessment records under another candidate's user_id.
 */
export function requireBodyUserOwnershipOrCounselor(fieldName = 'user_id') {
  return function bodyOwnershipMiddleware(req, res, next) {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required.',
          HTTP_STATUS.UNAUTHORIZED,
          'AUTHENTICATION_REQUIRED'
        )
      );
    }

    if (req.user.role === 'counselor' || req.user.role === 'admin') {
      return next();
    }

    const targetUserId = parseInt(req.body?.[fieldName], 10);
    const candidateUserId = parseInt(req.user.userId, 10);

    if (Number.isNaN(targetUserId) || Number.isNaN(candidateUserId) || candidateUserId !== targetUserId) {
      return next(
        new AppError(
          'Forbidden. Candidates are strictly restricted to submitting records for their own account.',
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN_RESOURCE_ACCESS'
        )
      );
    }

    return next();
  };
}

export const auth = {
  authenticateToken,
  requireRole,
  requireOwnershipOrCounselor,
  requireResourceOwnershipOrCounselor,
  requireBodyUserOwnershipOrCounselor,
};

export default auth;

