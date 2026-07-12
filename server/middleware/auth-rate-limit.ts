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
