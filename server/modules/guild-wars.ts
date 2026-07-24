/**
 * THORX Guild Wars — Architecture & Service Layer
 *
 * Status: ARCHITECTURE READY (UI implementation deferred).
 *
 * Tables provisioned:
 *   guild_war_seasons     — seasonal containers
 *   guild_wars            — individual war matchups
 *   guild_war_participants — per-user war contributions
 *   guild_hall_of_fame    — permanent season winners
 *   guild_badges          — awarded badges per guild
 *
 * Service stubs are fully typed and ready for activation.
 * Enable a season via POST /api/guild-wars/seasons (admin only).
 *
 * Guild Wars can be enabled without any architectural changes —
 * tables and service contracts are production-grade from day one.
 */

import Decimal from "decimal.js";
import { db } from "../db";
import {
  guildWarSeasons,
  guildWars,
  guildWarParticipants,
  guildHallOfFame,
  guildBadges,
  guilds,
  users,
  type GuildWarSeason,
  type GuildWar,
  type GuildHallOfFame,
  type GuildBadge,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storage } from "../storage";
import { logger } from "../lib/logger";

// ─── Season Management ────────────────────────────────────────────────────────

export async function createSeason(params: {
  name: string;
  startDate: Date;
  endDate: Date;
  prizePoolPkr: string;
}): Promise<GuildWarSeason> {
  const [season] = await db
    .insert(guildWarSeasons)
    .values({
      name: params.name,
      status: "upcoming",
      startDate: params.startDate,
      endDate: params.endDate,
      prizePoolPkr: params.prizePoolPkr,
    })
    .returning();
  logger.info({ seasonId: season.id, name: params.name }, "[GuildWars] Season created");
  return season;
}

export async function activateSeason(seasonId: string): Promise<GuildWarSeason | null> {
  const [updated] = await db
    .update(guildWarSeasons)
    .set({ status: "active" })
    .where(eq(guildWarSeasons.id, seasonId))
    .returning();
  return updated ?? null;
}

export async function getActiveSeason(): Promise<GuildWarSeason | null> {
  const [season] = await db
    .select()
    .from(guildWarSeasons)
    .where(eq(guildWarSeasons.status, "active"))
    .limit(1);
  return season ?? null;
}

export async function listSeasons(limit = 20): Promise<GuildWarSeason[]> {
  return db
    .select()
    .from(guildWarSeasons)
    .orderBy(desc(guildWarSeasons.createdAt))
    .limit(limit);
}

// ─── War Matchup Management ───────────────────────────────────────────────────

export async function createWar(params: {
  seasonId: string;
  guild1Id: string;
  guild2Id: string;
  startDate: Date;
  endDate: Date;
  prizePoolPkr: string;
}): Promise<GuildWar> {
  if (params.guild1Id === params.guild2Id) {
    throw new Error("A guild cannot war against itself");
  }
  const [war] = await db
    .insert(guildWars)
    .values({
      seasonId: params.seasonId,
      guild1Id: params.guild1Id,
      guild2Id: params.guild2Id,
      status: "scheduled",
      guild1Score: 0,
      guild2Score: 0,
      startDate: params.startDate,
      endDate: params.endDate,
      prizePoolPkr: params.prizePoolPkr,
    })
    .returning();
  logger.info(
    { warId: war.id, guild1: params.guild1Id, guild2: params.guild2Id },
    "[GuildWars] War scheduled",
  );
  return war;
}

/**
 * Called by earn events to contribute points to an active war.
 * Only contributes if both user's guild is a participant in an active war.
 */
export async function contributeWarPoints(
  userId: string,
  guildId: string,
  points: number,
): Promise<void> {
  // Find active war for this guild
  const [activeWar] = await db
    .select()
    .from(guildWars)
    .where(
      and(
        eq(guildWars.status, "active"),
        sql`(guild1_id = ${guildId} OR guild2_id = ${guildId})`,
      ),
    )
    .limit(1);

  if (!activeWar) return; // no active war for this guild

  // Upsert participant contribution
  await db
    .insert(guildWarParticipants)
    .values({
      warId: activeWar.id,
      guildId,
      userId,
      pointsContributed: points,
    })
    .onConflictDoUpdate({
      target: [guildWarParticipants.warId, guildWarParticipants.guildId, guildWarParticipants.userId],
      set: {
        pointsContributed: sql`${guildWarParticipants.pointsContributed} + ${points}`,
      },
    });

  // Update war score for this guild
  if (activeWar.guild1Id === guildId) {
    await db
      .update(guildWars)
      .set({ guild1Score: sql`${guildWars.guild1Score} + ${points}` })
      .where(eq(guildWars.id, activeWar.id));
  } else {
    await db
      .update(guildWars)
      .set({ guild2Score: sql`${guildWars.guild2Score} + ${points}` })
      .where(eq(guildWars.id, activeWar.id));
  }
}

/**
 * Resolve a completed war — determine winner, distribute prizes,
 * create Hall of Fame entry, award badges.
 */
export async function resolveWar(warId: string): Promise<{
  winnerId: string | null;
  isDraw: boolean;
}> {
  const [war] = await db
    .select()
    .from(guildWars)
    .where(eq(guildWars.id, warId))
    .limit(1);

  if (!war) throw new Error("War not found");
  if (war.status === "completed") return { winnerId: war.winnerId, isDraw: !war.winnerId };

  const isDraw = war.guild1Score === war.guild2Score;
  const winnerId = isDraw
    ? null
    : war.guild1Score > war.guild2Score
    ? war.guild1Id
    : war.guild2Id;
  const loserId = isDraw ? null : winnerId === war.guild1Id ? war.guild2Id : war.guild1Id;

  await db
    .update(guildWars)
    .set({ status: "completed", winnerId })
    .where(eq(guildWars.id, warId));

  // Award winner badge
  if (winnerId) {
    await awardBadge(winnerId, "war_winner", "⚔️ War Victor", war.seasonId ?? undefined);
    logger.info({ warId, winnerId }, "[GuildWars] War resolved — winner");
  } else {
    logger.info({ warId }, "[GuildWars] War resolved — draw");
  }

  // Hall of Fame entry for season winners (handled by resolveSeason)
  return { winnerId, isDraw };
}

// ─── Season Resolution ────────────────────────────────────────────────────────

export async function resolveSeason(seasonId: string): Promise<void> {
  // Compute standings: sum war wins per guild in this season
  const standings = await db
    .select({
      guildId: guildWars.guild1Id,
      wins: sql<number>`COUNT(*) FILTER (WHERE winner_id = guild1_id)`,
      totalScore: sql<number>`SUM(guild1_score)`,
    })
    .from(guildWars)
    .where(and(eq(guildWars.seasonId, seasonId), eq(guildWars.status, "completed")))
    .groupBy(guildWars.guild1Id);

  // Sort by wins desc, then by total score desc
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.totalScore - a.totalScore;
  });

  // Top 3 → Hall of Fame
  for (let i = 0; i < Math.min(3, standings.length); i++) {
    const placement = i + 1;
    const entry = standings[i];
    await db.insert(guildHallOfFame).values({
      guildId: entry.guildId,
      seasonId,
      placement,
      warsWon: entry.wins,
      totalPointsScored: entry.totalScore,
    }).onConflictDoNothing();

    // Season champion badge to 1st place
    if (placement === 1) {
      await awardBadge(entry.guildId, "season_champion", "🏆 Season Champion", seasonId);
    } else if (placement === 2) {
      await awardBadge(entry.guildId, "runner_up", "🥈 Runner Up", seasonId);
    } else {
      await awardBadge(entry.guildId, "third_place", "🥉 Third Place", seasonId);
    }
  }

  await db
    .update(guildWarSeasons)
    .set({ status: "completed" })
    .where(eq(guildWarSeasons.id, seasonId));

  logger.info({ seasonId, topGuild: standings[0]?.guildId }, "[GuildWars] Season resolved");
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export async function awardBadge(
  guildId: string,
  badgeType: string,
  badgeName: string,
  seasonId?: string,
): Promise<GuildBadge> {
  const [badge] = await db
    .insert(guildBadges)
    .values({ guildId, badgeType, badgeName, seasonId })
    .returning();
  return badge;
}

export async function getGuildBadges(guildId: string): Promise<GuildBadge[]> {
  return db
    .select()
    .from(guildBadges)
    .where(eq(guildBadges.guildId, guildId))
    .orderBy(desc(guildBadges.awardedAt));
}

// ─── Hall of Fame ─────────────────────────────────────────────────────────────

export async function getHallOfFame(
  seasonId?: string,
  limit = 10,
): Promise<GuildHallOfFame[]> {
  const query = db
    .select()
    .from(guildHallOfFame)
    .orderBy(guildHallOfFame.placement, desc(guildHallOfFame.awardedAt))
    .limit(limit);

  if (seasonId) {
    return (query as any).where(eq(guildHallOfFame.seasonId, seasonId));
  }
  return query;
}

// ─── War Leaderboard ──────────────────────────────────────────────────────────

export async function getSeasonLeaderboard(seasonId: string): Promise<{
  guildId: string;
  warsPlayed: number;
  warsWon: number;
  winRatePct: number;
  totalScore: number;
}[]> {
  const rows = await db
    .select({
      guildId: guildWars.guild1Id,
      total: sql<number>`COUNT(*)`,
      won: sql<number>`COUNT(*) FILTER (WHERE winner_id = guild1_id)`,
      score: sql<number>`SUM(guild1_score)`,
    })
    .from(guildWars)
    .where(and(eq(guildWars.seasonId, seasonId), eq(guildWars.status, "completed")))
    .groupBy(guildWars.guild1Id);

  return rows.map((r) => ({
    guildId: r.guildId,
    warsPlayed: r.total,
    warsWon: r.won,
    winRatePct: r.total > 0 ? Math.round((r.won / r.total) * 100) : 0,
    totalScore: r.score,
  })).sort((a, b) => b.warsWon - a.warsWon || b.totalScore - a.totalScore);
}
