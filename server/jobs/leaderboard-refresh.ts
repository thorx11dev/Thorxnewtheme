/**
 * 5-minute leaderboard refresh cron job.
 *
 * Decoupled from earn events (Q4 architectural decision 2026-07-17):
 * running refreshLeaderboardCache() on every earn event caused O(n) DB
 * reads blocking the earn path at scale. The cron approach gives a
 * maximum 5-minute staleness window with zero per-earn overhead.
 *
 * Also triggers a full risk scan on the same cadence so the risk
 * watchlist stays current alongside leaderboard data.
 */
import { storage } from "../storage";
import { logger } from "../lib/logger";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startLeaderboardRefreshJob(): void {
  // Run immediately on startup to populate cache from cold start, then on interval.
  runRefresh();
  setInterval(runRefresh, INTERVAL_MS);
  logger.info("[LeaderboardRefresh] 5-minute cache refresh job started.");
}

async function runRefresh(): Promise<void> {
  try {
    await storage.refreshLeaderboardCache();
    logger.info("[LeaderboardRefresh] Cache refreshed successfully.");

    // Piggyback risk scan on the same cadence — fire-and-forget.
    import("../modules/risk-engine")
      .then((mod) => mod.runFullRiskScan({ broadcastAlerts: true }))
      .catch((err) => logger.error({ err }, "[LeaderboardRefresh] Risk scan failed — will retry next cycle."));
  } catch (err) {
    logger.error({ err }, "[LeaderboardRefresh] Refresh failed — will retry next cycle.");
  }
}
