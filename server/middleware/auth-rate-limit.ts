import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication endpoints (login, register, forgot-password).
 * 10 attempts per IP per 15 minute window.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again in 15 minutes.", error: "RATE_LIMITED" },
  keyGenerator: (req) => req.ip || "unknown",
  validate: { trustProxy: true },
});
