// THORX v3 — Guild Performance Score (GPS) engine (Part E.3 of the v3 spec).
// GPS is the guild-level analogue of PS: sole input to guildRankTier,
// accumulated from a % of member point contributions plus milestone/MVP
// bonuses. Mirrors ps-engine.ts's structure.

import { db } from "../db";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { guilds, rankLogs } from "@shared/schema";
import { storage } from "../storage";

const GUILD_RANK_TIERS = ["E-Rank", "D-Rank", "C-Rank", "B-Rank", "A-Rank", "S-Rank"] as const;
export type GuildRankTier = (typeof GUILD_RANK_TIERS)[number];

async function cfg<T>(key: string, fallback: T): Promise<T> {
  return storage.getSystemConfigValue<T>(key, fallback);
}

// Called whenever a member earns points via Engine C (or any engine, per
// spec's "member contributes toward guild" rule) — awards a % of the raw
// points to the guild's GPS and weekly point total.
export async function awardMemberGPS(guildId: string, memberPointsEarned: number): Promise<void> {
  const pct = await cfg<number>("GPS_MEMBER_POINTS_PCT", 10);
  const gpsAward = Math.round((memberPointsEarned * pct) / 100);
  if (gpsAward <= 0) return;

  await db.update(guilds)
    .set({
      guildPerformanceScore: drizzleSql`${guilds.guildPerformanceScore} + ${gpsAward}`,
      currentWeeklyPoints: drizzleSql`${guilds.currentWeeklyPoints} + ${memberPointsEarned}`,
    })
    .where(eq(guilds.id, guildId));

  await checkAndUpdateGuildRankTier(guildId);
}

// Called by the Sunday reset job when a guild hits its weekly target.
export async function awardMilestoneGPS(guildId: string): Promise<number> {
  const bonus = await cfg<number>("GPS_MILESTONE_BONUS", 1000);
  await db.update(guilds)
    .set({ guildPerformanceScore: drizzleSql`${guilds.guildPerformanceScore} + ${bonus}` })
    .where(eq(guilds.id, guildId));
  await checkAndUpdateGuildRankTier(guildId);
  return bonus;
}

// Called when a captain sets a weekly MVP.
export async function awardMVPGPS(guildId: string): Promise<number> {
  const bonus = await cfg<number>("GPS_MVP_BONUS", 200);
  await db.update(guilds)
    .set({ guildPerformanceScore: drizzleSql`${guilds.guildPerformanceScore} + ${bonus}` })
    .where(eq(guilds.id, guildId));
  await checkAndUpdateGuildRankTier(guildId);
  return bonus;
}

function computeGuildRankTier(gps: number, thresholds: Record<string, number>): GuildRankTier {
  if (gps >= thresholds.GPS_RANK_S_MIN) return "S-Rank";
  if (gps >= thresholds.GPS_RANK_A_MIN) return "A-Rank";
  if (gps >= thresholds.GPS_RANK_B_MIN) return "B-Rank";
  if (gps >= thresholds.GPS_RANK_C_MIN) return "C-Rank";
  if (gps >= thresholds.GPS_RANK_D_MIN) return "D-Rank";
  return "E-Rank";
}

export async function checkAndUpdateGuildRankTier(guildId: string): Promise<void> {
  const [guild] = await db.select().from(guilds).where(eq(guilds.id, guildId));
  if (!guild) return;

  const thresholds: Record<string, number> = {
    GPS_RANK_D_MIN: await cfg("GPS_RANK_D_MIN", 10000),
    GPS_RANK_C_MIN: await cfg("GPS_RANK_C_MIN", 30000),
    GPS_RANK_B_MIN: await cfg("GPS_RANK_B_MIN", 70000),
    GPS_RANK_A_MIN: await cfg("GPS_RANK_A_MIN", 150000),
    GPS_RANK_S_MIN: await cfg("GPS_RANK_S_MIN", 300000),
  };

  const newRank = computeGuildRankTier(guild.guildPerformanceScore, thresholds);
  if (newRank === guild.guildRankTier) return;

  const memberCapacityByRank: Record<GuildRankTier, number> = {
    "E-Rank": 10, "D-Rank": 15, "C-Rank": 20, "B-Rank": 30, "A-Rank": 40, "S-Rank": 50,
  };
  const weeklyTargetByRank: Record<GuildRankTier, number> = {
    "E-Rank": await cfg("WEEKLY_TARGET_E_RANK", 20000),
    "D-Rank": await cfg("WEEKLY_TARGET_D_RANK", 50000),
    "C-Rank": await cfg("WEEKLY_TARGET_C_RANK", 100000),
    "B-Rank": await cfg("WEEKLY_TARGET_B_RANK", 200000),
    "A-Rank": await cfg("WEEKLY_TARGET_A_RANK", 350000),
    "S-Rank": await cfg("WEEKLY_TARGET_S_RANK", 500000),
  };

  await db.update(guilds).set({
    guildRankTier: newRank,
    memberCapacity: memberCapacityByRank[newRank],
    weeklyTarget: weeklyTargetByRank[newRank],
  }).where(eq(guilds.id, guildId));

  await db.insert(rankLogs).values({
    userId: guild.captainId,
    oldRank: guild.guildRankTier,
    newRank,
    triggerSource: "gps_engine",
    targetType: "guild",
    guildId,
  });

  const { emitFeedEvent } = await import("./live-feed");
  const isPromotion = GUILD_RANK_TIERS.indexOf(newRank) > GUILD_RANK_TIERS.indexOf(guild.guildRankTier as GuildRankTier);
  await emitFeedEvent({
    type: "guild_event",
    guildId,
    displayMessage: isPromotion
      ? `Guild '${guild.name}' reached ${newRank}!`
      : `Guild '${guild.name}' rank adjusted to ${newRank}.`,
    data: { oldRank: guild.guildRankTier, newRank, guildPerformanceScore: guild.guildPerformanceScore },
  });
}
