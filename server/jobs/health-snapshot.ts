/**
 * Hourly health snapshot cron job.
 * Calls computeAndSaveHealthSnapshot() every 60 minutes in both dev and prod.
 */
import { computeAndSaveHealthSnapshot } from "../modules/health-engine";

export function startHealthSnapshotJob(): void {
  // Run immediately on start, then every 60 minutes
  computeAndSaveHealthSnapshot();
  setInterval(computeAndSaveHealthSnapshot, 60 * 60 * 1000);
  console.log("[HealthEngine] Hourly snapshot job started.");
}
