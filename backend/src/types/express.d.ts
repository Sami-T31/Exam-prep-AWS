/**
 * Extend the Express Request type to include our custom `user` property.
 *
 * When the JwtAuthGuard verifies a token, it attaches the decoded
 * user payload to `request.user`. TypeScript doesn't know about this
 * by default, so we declare the shape here.
 *
 * This is called "declaration merging" — we're adding to Express's
 * existing Request interface without modifying the library's code.
 */
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      role: string;
    };
  }
}
