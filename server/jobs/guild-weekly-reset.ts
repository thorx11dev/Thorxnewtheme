/**
 * Sunday guild reset sweep (THORX v3 spec Part E.8/E.10).
 *
 * Runs every 30 minutes (self-healing, matching guild-vault-resolution.ts's
 * pattern) rather than an exact "Sunday 23:59 PKT" cron trigger — a fixed
 * interval sweep can't miss a reset if the process was down at the exact
 * boundary. runWeeklyGuildReset() is idempotent per (guild, week).
 */
import { runWeeklyGuildReset } from "../modules/guild-reset";

export function startGuildWeeklyResetJob(): void {
  const THIRTY_MINUTES = 30 * 60 * 1000;

  const run = async () => {
    try {
      const summary = await runWeeklyGuildReset();
      if (summary.distributed > 0 || summary.voided > 0) {
        console.log(`[GuildReset] Processed ${summary.guildsProcessed} guild(s): ${summary.distributed} distributed, ${summary.voided} voided, ${summary.skipped} already resolved.`);
      }
    } catch (error) {
      console.error("[GuildReset] Weekly reset sweep failed:", error);
    }
  };

  setTimeout(run, 20_000); // stagger after guild-vault-resolution's 15s startup delay
  setInterval(run, THIRTY_MINUTES);
  console.log("[GuildReset] Sunday guild reset job started.");
}
