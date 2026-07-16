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
import { db } from "../db";
import { guilds, guildMembers, guildWeeklyCycles, guildWeeklySnapshots, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { awardMilestoneGPS } from "./gps-engine";
import { emitFeedEvent } from "./live-feed";
import { storage } from "../storage";

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

  const activeGuilds = await db.select().from(guilds).where(eq(guilds.status, "active"));

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

    const pool = parseFloat(guild.weeklyBonusPool);
    const achieved = guild.currentWeeklyPoints;
    const target = guild.weeklyTarget;
    const wasSuccessful = achieved >= target && pool > 0;

    let captainShare = 0;
    let memberPool = 0;

    if (wasSuccessful) {
      captainShare = Math.round(pool * 0.30 * 100) / 100;
      memberPool = Math.round((pool - captainShare) * 100) / 100; // remainder-safe 70%

      await db.update(users)
        .set({ balanceCashPkr: sql`${users.balanceCashPkr} + ${captainShare.toFixed(2)}` })
        .where(eq(users.id, guild.captainId));
      await storage.createNotification({
        userId: guild.captainId,
        title: "Sunday Guild Bonus!",
        message: `Your captain share: Rs.${captainShare.toFixed(2)}`,
        type: "financial",
      });

      const members = await db.select().from(guildMembers)
        .where(and(eq(guildMembers.guildId, guild.id), eq(guildMembers.status, "active")));
      const totalContrib = members.reduce((s, m) => s + m.weeklyPointsContributed, 0);

      if (totalContrib > 0) {
        for (const member of members.filter(m => m.weeklyPointsContributed > 0)) {
          const share = Math.round(memberPool * (member.weeklyPointsContributed / totalContrib) * 100) / 100;
          if (share <= 0) continue;
          await db.update(users)
            .set({ balanceCashPkr: sql`${users.balanceCashPkr} + ${share.toFixed(2)}` })
            .where(eq(users.id, member.userId));
          await storage.createNotification({
            userId: member.userId,
            title: "Sunday Guild Bonus!",
            message: `Your team bonus: Rs.${share.toFixed(2)}`,
            type: "financial",
          });
        }
      }

      await awardMilestoneGPS(guild.id);
      await emitFeedEvent({
        type: "guild_target",
        guildId: guild.id,
        displayMessage: `Guild '${guild.name}' hit 100%! Bonus Pool Rs.${pool.toFixed(2)} distributed.`,
        data: { wasSuccessful, pool, captainShare, memberPool },
      });
      distributed++;
    } else {
      await emitFeedEvent({
        type: "guild_target",
        guildId: guild.id,
        displayMessage: `Guild '${guild.name}' missed target. Pool of Rs.${pool.toFixed(2)} voided.`,
        data: { wasSuccessful: false, pool },
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
        bonusPoolPkr: pool.toFixed(4),
        poolDisposition: wasSuccessful ? "distributed" : "voided",
        captainShare: wasSuccessful ? captainShare.toFixed(2) : "0.00",
        membersShare: wasSuccessful ? memberPool.toFixed(2) : "0.00",
      });
    }

    if (existingCycle) {
      await db.update(guildWeeklyCycles).set({
        actualPoints: achieved,
        goalMet: wasSuccessful,
        resolved: true,
        resolvedAt: new Date(),
        bonusPoolPkr: pool.toFixed(4),
        poolDisposition: wasSuccessful ? "distributed" : "voided",
        captainSharePkr: wasSuccessful ? captainShare.toFixed(2) : "0.00",
        membersSharePkr: wasSuccessful ? memberPool.toFixed(2) : "0.00",
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
        bonusPoolPkr: pool.toFixed(4),
        poolDisposition: wasSuccessful ? "distributed" : "voided",
        captainSharePkr: wasSuccessful ? captainShare.toFixed(2) : "0.00",
        membersSharePkr: wasSuccessful ? memberPool.toFixed(2) : "0.00",
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
