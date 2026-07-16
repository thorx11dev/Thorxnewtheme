/**
 * Structured JSON logger for THORX server.
 *
 * Uses pino in production (JSON output, queryable by log aggregators) and
 * pino-pretty in development (colourised human-readable format).
 *
 * Usage:
 *   import { logger } from './lib/logger';
 *   logger.info({ userId, amount }, 'Withdrawal submitted');
 *   logger.error({ err, userId }, 'Financial operation failed');
 *
 * Log levels: trace < debug < info < warn < error < fatal
 * Production threshold: info (trace/debug suppressed).
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino(
  {
    level: isDev ? "debug" : "info",
    // Redact sensitive fields from all log lines — belt-and-suspenders
    // protection in case a caller accidentally logs a full user object.
    redact: {
      paths: [
        "*.passwordHash",
        "*.password",
        "*.verificationToken",
        "*.sessionId",
        "req.headers.cookie",
        "req.headers.authorization",
      ],
      censor: "[REDACTED]",
    },
    // Attach base fields to every line for correlation in log aggregators.
    base: {
      service: "thorx-api",
      env: process.env.NODE_ENV ?? "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
      })
    : undefined
);

export type Logger = typeof logger;
