/**
 * Guild Vault weekly resolution job.
 *
 * Every fixed UTC week (Monday 00:00:00 -> Sunday 23:59:59.999), each guild's
 * per-member "held" vault buckets (15% of every earn event, see
 * DatabaseStorage.recordEarnEvent) must be resolved: released to the member's
 * spendable balance, with a rank-based bonus multiplier if the guild hit its
 * weekly points target, or at 1.0x (principal only, no bonus, plus one guild
 * strike) if it did not. See DatabaseStorage.resolveGuildWeeklyCycle for the
 * full mechanics and the documented design decisions behind them.
 *
 * Runs every 30 minutes in all environments — cheap no-op when nothing is
 * resolvable — rather than trying to schedule an exact Monday-midnight cron,
 * since a fixed-interval sweep is simpler and self-healing if the process
 * was down when a week boundary passed.
 */
import { storage } from "../storage";

export function startGuildVaultResolutionJob(): void {
  const THIRTY_MINUTES = 30 * 60 * 1000;

  const run = async () => {
    try {
      const { resolvedCycles, frozenGuilds } = await storage.runGuildWeeklyResolution();
      if (resolvedCycles > 0) {
        console.log(`[GuildVault] Resolved ${resolvedCycles} weekly cycle(s), froze ${frozenGuilds} guild(s).`);
      }
    } catch (error) {
      console.error("[GuildVault] Weekly resolution sweep failed:", error);
    }
  };

  setTimeout(run, 15_000); // 15s after startup to avoid boot contention
  setInterval(run, THIRTY_MINUTES);
  console.log("[GuildVault] Weekly resolution job started.");
}
