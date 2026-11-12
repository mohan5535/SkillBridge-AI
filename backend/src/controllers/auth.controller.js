import { authSchemas } from '../validators/authSchemas.js';
import { authService } from '../services/auth.service.js';
import { csrf } from '../middleware/csrf.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';
import {
  findUserByEmail,
  findUserById,
  findUserByActivationHash,
  insertCandidate,
  updateUserPassword,
} from '../queries/authQueries.js';

const AUTH_COOKIE_NAME = 'sb_auth_token';

/**
 * Helper to set HTTP-only JWT session cookie.
 */
function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Candidate self-registration controller
 */
export async function register(req, res, next) {
  try {
    const validatedData = authSchemas.registerSchema.parse(req.body);

    const existingUser = await findUserByEmail(validatedData.email);
    if (existingUser) {
      throw new AppError(
        'An account with this email address already exists.',
        HTTP_STATUS.CONFLICT,
        'DUPLICATE_EMAIL'
      );
    }

    const passwordHash = await authService.hashPassword(validatedData.password);

    const user = await insertCandidate(
      validatedData.email,
      validatedData.full_name,
      passwordHash,
      validatedData.country
    );

    const jwtToken = authService.generateJwt({
      userId: user.user_id,
      email: user.email,
      role: 'candidate', // Role is strictly 'candidate'
    });

    setAuthCookie(res, jwtToken);
    const csrfToken = csrf.setCsrfCookie(res, user.user_id);

    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      data: {
        user: authService.sanitizeUser(user),
        csrfToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login controller with credential verification and brute-force protection
 */
export async function login(req, res, next) {
  try {
    const validatedData = authSchemas.loginSchema.parse(req.body);

    const user = await findUserByEmail(validatedData.email);

    if (!user) {
      throw new AppError(
        'Invalid email or password.',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_CREDENTIALS'
      );
    }

    // Unclaimed / unactivated accounts must not be accessed via login
    if (user.password_hash === null) {
      throw new AppError(
        'Account exists but has not completed initial password activation via single-use token.',
        HTTP_STATUS.FORBIDDEN,
        'ACCOUNT_NOT_ACTIVATED'
      );
    }

    const isMatch = await authService.comparePassword(validatedData.password, user.password_hash);
    if (!isMatch) {
      throw new AppError(
        'Invalid email or password.',
        HTTP_STATUS.UNAUTHORIZED,
        'INVALID_CREDENTIALS'
      );
    }

    const jwtToken = authService.generateJwt({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    setAuthCookie(res, jwtToken);
    const csrfToken = csrf.setCsrfCookie(res, user.user_id);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: {
        user: authService.sanitizeUser(user),
        csrfToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Single-use activation token password setup controller (Anti-Takeover)
 */
export async function activateAccount(req, res, next) {
  try {
    if (!req.body.token) {
      throw new AppError(
        'Activation token is required. Setting password with email alone is strictly prohibited.',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_ACTIVATION_TOKEN'
      );
    }

    const validatedData = authSchemas.activateAccountSchema.parse(req.body);

    const tokenHash = authService.hashToken(validatedData.token);
    const user = await findUserByActivationHash(tokenHash);

    if (!user) {
      throw new AppError(
        'Activation token is invalid, expired, or has already been used.',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_ACTIVATION_TOKEN'
      );
    }

    const newPasswordHash = await authService.hashPassword(validatedData.password);
    const updatedUser = await updateUserPassword(user.user_id, newPasswordHash);

    const jwtToken = authService.generateJwt({
      userId: updatedUser.user_id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    setAuthCookie(res, jwtToken);
    const csrfToken = csrf.setCsrfCookie(res, user.user_id);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'Account activated and password established successfully.',
      data: {
        user: authService.sanitizeUser(updatedUser),
        csrfToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Logout controller - explicitly clears authentication and CSRF cookies
 */
export async function logout(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.clearCookie('sb_csrf_token', {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'User session terminated and authentication cookies cleared.',
  });
}

/**
 * Get currently authenticated user profile
 */
export async function getMe(req, res, next) {
  try {
    if (!req.user) {
      throw new AppError(
        'Authentication required to access current session.',
        HTTP_STATUS.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED'
      );
    }

    let user = await findUserById(req.user.userId);
    if (!user && req.user) {
      user = {
        user_id: req.user.userId,
        email: req.user.email,
        full_name: req.user.role === 'counselor' ? 'Academic Advisor & Lead Counselor' : req.user.email,
        role: req.user.role,
      };
    }
    if (!user) {
      throw new AppError('User profile not found.', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: {
        user: authService.sanitizeUser(user),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Issues signed double-submit CSRF cookie and returns raw token in response body
 */
export async function getCsrfToken(req, res) {
  let userId = req.user?.userId;
  if (!userId && req.cookies?.[AUTH_COOKIE_NAME]) {
    try {
      const decoded = authService.verifyJwt(req.cookies[AUTH_COOKIE_NAME]);
      if (decoded?.userId) userId = decoded.userId;
    } catch {
      // ignore
    }
  }
  const rawToken = csrf.setCsrfCookie(res, userId || 'anonymous');
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      csrfToken: rawToken,
    },
  });
}

/**
 * Demo persona switcher for MVP frontend verification
 */
export async function setDemoSession(req, res, next) {
  try {
    if (!env.ALLOW_DEMO_SESSION) {
      throw new AppError(
        'Demo persona switching is disabled in production.',
        HTTP_STATUS.FORBIDDEN,
        'DEMO_SESSION_DISABLED'
      );
    }

    const { persona } = req.body || {};
    let user;

    if (persona === 'counselor') {
      user = {
        user_id: 99,
        email: 'counselor@skillbridge.org',
        full_name: 'Academic Advisor & Lead Counselor',
        role: 'counselor',
      };
    } else if (persona === 'candidate-2') {
      user = {
        user_id: 2,
        email: 'rahul.verma@email.com',
        full_name: 'Rahul Verma',
        role: 'candidate',
      };
    } else if (persona === 'candidate-3') {
      user = {
        user_id: 3,
        email: 'ananya.desai@email.com',
        full_name: 'Ananya Desai',
        role: 'candidate',
      };
    } else {
      user = {
        user_id: 1,
        email: 'priya.sharma@email.com',
        full_name: 'Priya Sharma',
        role: 'candidate',
      };
    }

    const jwtToken = authService.generateJwt({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    setAuthCookie(res, jwtToken);
    const csrfToken = csrf.setCsrfCookie(res, user.user_id);

    res.json({
      status: 'success',
      data: {
        user: authService.sanitizeUser(user),
        csrfToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export const authController = {
  register,
  login,
  activateAccount,
  logout,
  getMe,
  getCsrfToken,
  setDemoSession,
};

export default authController;

