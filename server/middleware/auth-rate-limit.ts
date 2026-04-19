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
  keyGenerator: (req) => {
    // Robust IP detection that won't crash behind proxies
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : req.ip;
    return ip || 'unknown-ip';
  },
});
