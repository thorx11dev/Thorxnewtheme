/**
 * 4.3 — Unified logging shim.
 *
 * All calls are now forwarded to the project-wide pino logger so that every
 * log line shares the same structured format and goes through the same sink.
 * `debugLog` maps to `logger.debug` (suppressed in production by pino's log
 * level). `errorLog` maps to `logger.error` (always emitted).
 *
 * This shim keeps existing call-sites unchanged while eliminating the mixed
 * console.log / pino strategy identified in audit finding 2-F / 4.3.
 */
import { logger } from "../lib/logger";

export function debugLog(...args: unknown[]): void {
  // Serialise multi-arg calls the same way the old console.log did.
  const [first, ...rest] = args;
  if (rest.length === 0) {
    logger.debug(typeof first === "object" && first !== null ? first : { msg: first });
  } else {
    logger.debug({ details: rest }, typeof first === "string" ? first : JSON.stringify(first));
  }
}

export function errorLog(...args: unknown[]): void {
  const [first, ...rest] = args;
  if (rest.length === 0) {
    logger.error(typeof first === "object" && first !== null ? first : { msg: first });
  } else {
    logger.error({ details: rest }, typeof first === "string" ? first : JSON.stringify(first));
  }
}
