import { z } from 'zod';

/**
 * Ethiopian phone number format:
 *   +251XXXXXXXXX  (international, 13 chars)
 *   09XXXXXXXX     (local mobile, 10 digits)
 *   07XXXXXXXX     (local mobile, 10 digits — Safaricom/newer)
 *
 * This regex accepts all three forms.
 */
const ETHIOPIAN_PHONE_REGEX = /^(\+251[1-9]\d{8}|0[79]\d{8})$/;

/**
 * Password must contain at least one uppercase letter, one lowercase
 * letter, and one digit. This balances security with usability --
 * overly strict rules (special characters, 16+ length) lead to
 * users writing passwords down or using simple patterns.
 */
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/**
 * Validation for user registration.
 * These same rules run on both the frontend (form validation)
 * and backend (API request validation).
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .trim()
    .toLowerCase(),
  phone: z
    .string()
    .regex(
      ETHIOPIAN_PHONE_REGEX,
      'Please enter a valid Ethiopian phone number (e.g., +251912345678 or 0912345678)',
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(
      PASSWORD_COMPLEXITY_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
    ),
});

/**
 * Validation for login.
 */
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim(),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Validation for forgot password request.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim(),
});

/**
 * Validation for resetting password with a token.
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});
