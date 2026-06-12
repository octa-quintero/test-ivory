import rateLimit from 'express-rate-limit';

/**
 * Global limiter — applied to all routes in app.ts.
 * Protects against general API abuse.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/**
 * Auth limiter — applied only to POST /v1/auth/login.
 * skipSuccessfulRequests: only failed attempts count toward the limit,
 * so a legitimate user logging in successfully is never blocked.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts, please try again in 15 minutes' },
});
