import { runtimeConfig } from "../config/runtime";

/**
 * Debug logger that only emits output in non-production environments.
 * Drop-in replacement for console.log in server routes.
 * In production, all messages are silently discarded.
 */
export function debugLog(...args: unknown[]): void {
  if (!runtimeConfig.isProd) {
    console.log(...args);
  }
}

/** Always-on logger for errors (these should always be visible). */
export function errorLog(...args: unknown[]): void {
  console.error(...args);
}
