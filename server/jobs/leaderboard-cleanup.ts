import { db } from "../db";
import { leaderboardCache } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Periodically prune leaderboard_cache rows older than 7 days.
 * Runs every 6 hours via setInterval (no external cron dependency).
 */
export function startLeaderboardCleanup(): void {
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  const cleanup = async () => {
    try {
      const result = await db
        .delete(leaderboardCache)
        .where(sql`recorded_at < NOW() - INTERVAL '7 days'`);
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`[cleanup] Pruned ${result.rowCount} stale leaderboard_cache rows`);
      }
    } catch (error) {
      console.error("[cleanup] Leaderboard cache cleanup failed:", error);
    }
  };

  // Run immediately on startup, then every 6 hours
  setTimeout(cleanup, 10_000); // 10s after startup to avoid boot contention
  setInterval(cleanup, SIX_HOURS);
}
