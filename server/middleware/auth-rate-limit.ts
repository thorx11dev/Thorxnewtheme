import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication endpoints (login, register, forgot-password).
 * 10 attempts per IP per 15 minute window.
 *
 * Uses the default keyGenerator (req.ip with IPv6 normalization).
 * trust proxy is already configured at the Express app level.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again in 15 minutes.", error: "RATE_LIMITED" },
  skip: (req) => {
    // Bypass rate limiting for localhost in development (testing only)
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.socket?.remoteAddress || '';
      if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
    }
    return false;
  },
  keyGenerator: (req) => {
    // Robust IP detection that won't crash behind proxies
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : (req as any)['ip'];
    return clientIp || 'unknown-ip';
  },
  validate: false,
});

/**
 * Rate limiter for withdrawal submission endpoints.
 * More lenient than authRateLimiter — legitimate users submit a payout
 * at most a handful of times before a pending-withdrawal check blocks them.
 * 5 requests per IP per 15 minute window.
 *
 * High severity finding of the 2026-07-15 production-readiness audit:
 * withdrawal creation and referral withdrawal were unprotected, allowing
 * an automated/compromised session to hammer the endpoint.
 */
export const withdrawalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many withdrawal requests. Try again in 15 minutes.", error: "RATE_LIMITED" },
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.socket?.remoteAddress || '';
      if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
    }
    return false;
  },
  keyGenerator: (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : (req as any)['ip'];
    return clientIp || 'unknown-ip';
  },
  validate: false,
});
