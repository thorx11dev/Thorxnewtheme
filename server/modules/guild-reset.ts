// THORX v3 — Sunday Guild Reset (spec Part E.8).
//
// Distributes each active guild's weekly bonus pool (30% captain / 70% members,
// proportional to weeklyPointsContributed) if the guild hit its weeklyTarget,
// or voids the pool if it did not. Then resets the guild's weekly counters.
//
// Design note: the spec's pseudocode assumes an exact "Sunday 23:59 PKT" cron
// firing once. This codebase intentionally avoids exact-time cron scheduling
// in favor of self-healing periodic sweeps (see server/jobs/guild-vault-resolution.ts
// and leaderboard-cleanup.ts) so a missed process restart doesn't skip a reset.
// runWeeklyGuildReset() is therefore idempotent and safe to call on a fixed
// interval (see server/jobs/guild-weekly-reset.ts): it always resolves the most
// recently-completed UTC week (Monday–Sunday) for each guild exactly once,
// keyed by the unique (guildId, weekStart) constraint on guild_weekly_snapshots
// and the `resolved` flag on guild_weekly_cycles.
import Decimal from "decimal.js";
import { db } from "../db";
import { guilds, guildMembers, guildWeeklyCycles, guildWeeklySnapshots, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { awardMilestoneGPS } from "./gps-engine";
import { emitFeedEvent } from "./live-feed";
import { storage } from "../storage";
import { logger } from "../lib/logger";

// Fixed UTC week boundary: Monday 00:00:00 UTC through Sunday 23:59:59.999 UTC.
// Mirrors the private getUtcWeekBounds() in storage.ts (kept local here to avoid
// a cross-module export just for this one helper).
function getUtcWeekBounds(reference: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() + diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface WeeklyGuildResetSummary {
  guildsProcessed: number;
  distributed: number;
  voided: number;
  skipped: number;
}

/**
 * Resolves the most recently-completed UTC week for every active guild that
 * hasn't already been resolved. Safe to call repeatedly (e.g. every 30 min).
 */
export async function runWeeklyGuildReset(): Promise<WeeklyGuildResetSummary> {
  const now = new Date();
  const { weekStart: currentWeekStart } = getUtcWeekBounds(now);
  const prevWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekEnd = new Date(currentWeekStart.getTime() - 1);

  const activeGuilds = await db.select().from(guilds).where(eq(guilds.status, "active")).limit(500);

  let distributed = 0;
  let voided = 0;
  let skipped = 0;

  for (const guild of activeGuilds) {
    const [existingCycle] = await db
      .select()
      .from(guildWeeklyCycles)
      .where(and(eq(guildWeeklyCycles.guildId, guild.id), eq(guildWeeklyCycles.weekStart, prevWeekStart)))
      .limit(1);

    if (existingCycle?.resolved) {
      skipped++;
      continue;
    }

    // T-1 audit fix: all PKR arithmetic uses Decimal.js — no native float math.
    const poolD = new Decimal(guild.weeklyBonusPool ?? "0");
    const achieved = guild.currentWeeklyPoints;
    const target = guild.weeklyTarget;
    const wasSuccessful = achieved >= target && poolD.greaterThan(0);

    let captainShareD = new Decimal(0);
    let memberPoolD = new Decimal(0);
    let totalDistributedD = new Decimal(0);

    if (wasSuccessful) {
      // ROUND_DOWN so we never credit more than the pool
      captainShareD = poolD.mul("0.30").toDecimalPlaces(2, Decimal.ROUND_DOWN);
      memberPoolD = poolD.sub(captainShareD); // exact remainder, no rounding

      await db.update(users)
        .set({ balanceCashPkr: sql`${users.balanceCashPkr} + ${captainShareD.toFixed(2)}` })
        .where(eq(users.id, guild.captainId));
      await storage.createNotification({
        userId: guild.captainId,
        title: "Sunday Guild Bonus!",
        message: `Your captain share: Rs.${captainShareD.toFixed(2)}`,
        type: "financial",
      });
      totalDistributedD = captainShareD;

      const members = await db.select().from(guildMembers)
        .where(and(eq(guildMembers.guildId, guild.id), eq(guildMembers.status, "active")));
      const totalContrib = members.reduce((s, m) => s + m.weeklyPointsContributed, 0);

      if (totalContrib > 0) {
        for (const member of members.filter(m => m.weeklyPointsContributed > 0)) {
          const shareD = memberPoolD
            .mul(new Decimal(member.weeklyPointsContributed).div(totalContrib))
            .toDecimalPlaces(2, Decimal.ROUND_DOWN);
          if (shareD.lessThanOrEqualTo(0)) continue;
          await db.update(users)
            .set({ balanceCashPkr: sql`${users.balanceCashPkr} + ${shareD.toFixed(2)}` })
            .where(eq(users.id, member.userId));
          await storage.createNotification({
            userId: member.userId,
            title: "Sunday Guild Bonus!",
            message: `Your team bonus: Rs.${shareD.toFixed(2)}`,
            type: "financial",
          });
          totalDistributedD = totalDistributedD.add(shareD);
        }
      }

      // Rounding dust (paisa) credited to Thorx treasury — logged as platform profit.
      const dustD = poolD.sub(totalDistributedD);
      if (dustD.greaterThan(0)) {
        logger.info(
          {
            guildId: guild.id,
            poolPkr: poolD.toFixed(4),
            distributedPkr: totalDistributedD.toFixed(4),
            dustPkr: dustD.toFixed(4),
          },
          "[GuildReset] Rounding dust credited to Thorx treasury."
        );
      }

      await awardMilestoneGPS(guild.id);
      await emitFeedEvent({
        type: "guild_target",
        guildId: guild.id,
        displayMessage: `Guild '${guild.name}' hit 100%! Bonus Pool Rs.${poolD.toFixed(2)} distributed.`,
        data: { wasSuccessful, pool: poolD.toNumber(), captainShare: captainShareD.toNumber(), memberPool: memberPoolD.toNumber() },
      });
      distributed++;
    } else {
      await emitFeedEvent({
        type: "guild_target",
        guildId: guild.id,
        displayMessage: `Guild '${guild.name}' missed target. Pool of Rs.${poolD.toFixed(2)} voided.`,
        data: { wasSuccessful: false, pool: poolD.toNumber() },
      });
      voided++;
    }

    // Snapshot (idempotent — unique on guildId+weekStart; skip if it somehow already exists)
    const [existingSnapshot] = await db
      .select()
      .from(guildWeeklySnapshots)
      .where(and(eq(guildWeeklySnapshots.guildId, guild.id), eq(guildWeeklySnapshots.weekStart, toDateOnly(prevWeekStart) as any)))
      .limit(1);
    if (!existingSnapshot) {
      await db.insert(guildWeeklySnapshots).values({
        guildId: guild.id,
        weekStart: toDateOnly(prevWeekStart) as any,
        targetPoints: target,
        achievedPoints: achieved,
        wasSuccessful,
        bonusPoolPkr: poolD.toFixed(4),
        poolDisposition: wasSuccessful ? "distributed" : "voided",
        captainShare: wasSuccessful ? captainShareD.toFixed(2) : "0.00",
        membersShare: wasSuccessful ? memberPoolD.toFixed(2) : "0.00",
      });
    }

    if (existingCycle) {
      await db.update(guildWeeklyCycles).set({
        actualPoints: achieved,
        goalMet: wasSuccessful,
        resolved: true,
        resolvedAt: new Date(),
        bonusPoolPkr: poolD.toFixed(4),
        poolDisposition: wasSuccessful ? "distributed" : "voided",
        captainSharePkr: wasSuccessful ? captainShareD.toFixed(2) : "0.00",
        membersSharePkr: wasSuccessful ? memberPoolD.toFixed(2) : "0.00",
      }).where(eq(guildWeeklyCycles.id, existingCycle.id));
    } else {
      await db.insert(guildWeeklyCycles).values({
        guildId: guild.id,
        weekStart: prevWeekStart,
        weekEnd: prevWeekEnd,
        targetPoints: target,
        actualPoints: achieved,
        goalMet: wasSuccessful,
        resolved: true,
        resolvedAt: new Date(),
        bonusPoolPkr: poolD.toFixed(4),
        poolDisposition: wasSuccessful ? "distributed" : "voided",
        captainSharePkr: wasSuccessful ? captainShareD.toFixed(2) : "0.00",
        membersSharePkr: wasSuccessful ? memberPoolD.toFixed(2) : "0.00",
      });
    }

    // Reset for the new week
    await db.update(guilds)
      .set({ weeklyBonusPool: "0.0000", currentWeeklyPoints: 0 })
      .where(eq(guilds.id, guild.id));
    await db.update(guildMembers)
      .set({ weeklyPointsContributed: 0, isMvp: false, mvpSetWeek: null as any })
      .where(eq(guildMembers.guildId, guild.id));
  }

  return { guildsProcessed: activeGuilds.length, distributed, voided, skipped };
}
