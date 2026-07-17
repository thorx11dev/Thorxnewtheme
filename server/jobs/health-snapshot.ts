/**
 * Hourly health snapshot cron job.
 * Calls computeAndSaveHealthSnapshot() every 60 minutes in both dev and prod.
 */
import { computeAndSaveHealthSnapshot } from "../modules/health-engine";
import { logger } from "../lib/logger";

export function startHealthSnapshotJob(): void {
  // Run immediately on start, then every 60 minutes
  computeAndSaveHealthSnapshot();
  setInterval(computeAndSaveHealthSnapshot, 60 * 60 * 1000);
  logger.info("[HealthEngine] Hourly snapshot job started.");
}
