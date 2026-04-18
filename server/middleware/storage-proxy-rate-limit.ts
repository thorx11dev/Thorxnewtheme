import rateLimit from "express-rate-limit";

/**
 * Limits abuse of GET /api/thorx/storage-proxy (bandwidth + upstream load).
 * Tune with STORAGE_PROXY_RATE_LIMIT_MAX (requests per window).
 */
export const storageProxyRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.max(1, parseInt(process.env.STORAGE_PROXY_RATE_LIMIT_MAX || "120", 10)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many image requests. Try again shortly." },
  validate: { trustProxy: true },
});
