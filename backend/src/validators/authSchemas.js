import { z } from 'zod';
import { hasUnsafeXssPayload } from '../utils/inputSanitizer.js';

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const safeText = (schema) =>
  schema.refine((val) => !hasUnsafeXssPayload(val), {
    message: 'Unsafe HTML/script tags or dangerous URI schemes are not allowed',
  });

/**
 * Custom Zod validator ensuring UTF-8 byte length <= 72 (Bcrypt boundary guard)
 */
const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .regex(
    passwordComplexityRegex,
    'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special symbol'
  )
  .refine(
    (val) => Buffer.byteLength(val, 'utf8') <= 72,
    {
      message: 'Password exceeds maximum length of 72 bytes (Bcrypt boundary limit)',
      params: { code: 'PASSWORD_TOO_LONG' },
    }
  );

/**
 * Candidate self-registration schema.
 * Uses .strict() to reject any role tampering (is_admin, role, permissions, etc.).
 */
export const registerSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .max(255, 'Email cannot exceed 255 characters'),
    full_name: safeText(
      z
        .string({ required_error: 'Full name is required' })
        .trim()
        .min(1, 'Full name cannot be empty')
        .max(100, 'Full name cannot exceed 100 characters')
    ),
    password: passwordSchema,
    country: safeText(z.string().trim().max(100)).optional().default('India'),
    phone: safeText(z.string().trim().max(20)).optional(),
    state_or_region: safeText(z.string().trim().max(100)).optional(),
  })
  .strict('Unrecognized fields detected. Role tampering or unauthorized fields are forbidden.');

/**
 * Login schema
 */
export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format'),
    password: z
      .string({ required_error: 'Password is required' })
      .refine(
        (val) => Buffer.byteLength(val, 'utf8') <= 72,
        {
          message: 'Password cannot exceed 72 bytes due to cryptographic limits',
          params: { code: 'PASSWORD_TOO_LONG' },
        }
      ),
  })
  .strict();

/**
 * Account activation schema for single-use token password setup.
 */
export const activateAccountSchema = z
  .object({
    token: z
      .string({ required_error: 'Activation token is required' })
      .trim()
      .regex(/^[0-9a-fA-F]{64}$/, 'Activation token must be a 64-character hex string (256-bit token)'),
    password: passwordSchema,
  })
  .strict();

export const demoSessionSchema = z.preprocess(
  (val) => (val === undefined ? {} : val),
  z
    .object({
      persona: z
        .enum(['candidate-1', 'candidate-2', 'candidate-3', 'counselor'])
        .optional()
        .default('candidate-1'),
    })
    .strict('Unrecognized persona field')
);

export const authSchemas = {
  registerSchema,
  loginSchema,
  activateAccountSchema,
  demoSessionSchema,
};

export default authSchemas;

