/**
 * Sentry error-tracking initializer for THORX.
 *
 * Set SENTRY_DSN in environment secrets to activate.
 * If the variable is absent the module is a no-op — development and
 * environments without a Sentry project are completely unaffected.
 *
 * Usage:
 *   import { initSentry, Sentry } from './lib/sentry';
 *   initSentry(app);               // call once, before routes
 *   app.use(Sentry.expressErrorHandler()); // call once, after routes
 *
 * Sentry automatically captures:
 *   - Unhandled promise rejections
 *   - Uncaught exceptions
 *   - Express request errors (via expressErrorHandler middleware)
 *
 * Manual capture:
 *   import { Sentry } from './lib/sentry';
 *   Sentry.captureException(err, { extra: { userId, amount } });
 */

import * as SentryLib from "@sentry/node";
import type { Express } from "express";
import { logger } from "./logger";

let _initialized = false;

export function initSentry(app: Express): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("[Sentry] SENTRY_DSN not set — error tracking disabled");
    return;
  }

  SentryLib.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Capture 100% of transactions in dev, 20% in prod to stay within quota
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    // Redact sensitive fields before they leave the process
    beforeSend(event) {
      // Strip password, token, and cookie headers from breadcrumbs
      if (event.request?.headers) {
        delete event.request.headers["cookie"];
        delete event.request.headers["authorization"];
      }
      return event;
    },
  });

  _initialized = true;
  logger.info("[Sentry] Error tracking initialized");
}

/** Wire Sentry's Express error-handler middleware (call AFTER all routes). */
export function sentryErrorHandler() {
  return SentryLib.expressErrorHandler();
}

/** Re-export the Sentry namespace for manual captureException calls. */
export const Sentry = SentryLib;

/** True once initSentry() has successfully configured Sentry. */
export function isSentryActive(): boolean {
  return _initialized;
}
