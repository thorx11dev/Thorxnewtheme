/**
 * THORX Dynamic Economy Engine
 *
 * Computes an economy-wide reward multiplier based on platform revenue
 * relative to a rolling baseline. When revenue is high, rewards increase;
 * when low, they decrease — keeping THORX financially sustainable.
 *
 * Formula:
 *   autoMult = clamp(actualRevenue / baselineRevenue, MIN, MAX)
 *
 * Admin override: setting ECONOMY_MULTIPLIER_OVERRIDE in system_config
 * bypasses the auto calculation and uses the override value directly.
 *
 * Effective multiplier is cached per-day in economy_state table.
 */

import Decimal from "decimal.js";
import { db } from "../db";
import { economyState, userTransactions } from "@shared/schema";
import { sql, gte, eq, and } from "drizzle-orm";
import { storage } from "../storage";
import { logger } from "../lib/logger";

export interface EconomySnapshot {
  effectiveMultiplier: string; // Decimal string
  autoMultiplier: string;
  adminOverride: string | null;
  revenueBaseline: string;
  revenueActual: string;
  date: string;
  source: "admin_override" | "auto_computed" | "default";
}

// In-memory cache: one effective multiplier per calendar day
let _dayCache: { date: string; snapshot: EconomySnapshot } | null = null;

export function invalidateEconomyCache(): void {
  _dayCache = null;
}

// ─── Primary API ──────────────────────────────────────────────────────────────

/**
 * Returns the effective economy multiplier for today.
 * Used by recordEarnEvent() to scale grossPkr before splits.
 */
export async function getEffectiveMultiplier(): Promise<Decimal> {
  const snapshot = await getTodaySnapshot();
  return new Decimal(snapshot.effectiveMultiplier);
}

export async function getTodaySnapshot(): Promise<EconomySnapshot> {
  const today = new Date().toISOString().slice(0, 10);

  if (_dayCache?.date === today) {
    return _dayCache.snapshot;
  }

  // Check DB cache first
  const [existing] = await db
    .select()
    .from(economyState)
    .where(eq(economyState.date, today as any))
    .limit(1);

  if (existing) {
    const snap: EconomySnapshot = {
      effectiveMultiplier: existing.effectiveMultiplier,
      autoMultiplier:      existing.autoMultiplier,
      adminOverride:       existing.adminOverride,
      revenueBaseline:     existing.revenueBaseline ?? "0",
      revenueActual:       existing.revenueActual ?? "0",
      date:                today,
      source:              existing.adminOverride ? "admin_override" : "auto_computed",
    };
    _dayCache = { date: today, snapshot: snap };
    return snap;
  }

  // Compute fresh
  const snap = await computeAndPersistSnapshot(today);
  _dayCache = { date: today, snapshot: snap };
  return snap;
}

// ─── Compute ──────────────────────────────────────────────────────────────────

async function computeAndPersistSnapshot(today: string): Promise<EconomySnapshot> {
  const [
    overrideRaw,
    enabled,
    minMult,
    maxMult,
  ] = await Promise.all([
    storage.getSystemConfigValue<number | null>("ECONOMY_MULTIPLIER_OVERRIDE", null),
    storage.getSystemConfigValue<boolean>("ECONOMY_MULTIPLIER_ENABLED", true),
    storage.getSystemConfigValue<number>("ECONOMY_MULTIPLIER_MIN", 0.7),
    storage.getSystemConfigValue<number>("ECONOMY_MULTIPLIER_MAX", 1.5),
  ]);

  let effectiveMult = new Decimal(1);
  let autoMult = new Decimal(1);
  let baseline = new Decimal(0);
  let actual = new Decimal(0);
  let source: EconomySnapshot["source"] = "default";

  if (overrideRaw !== null && overrideRaw !== undefined) {
    // Admin override wins
    effectiveMult = new Decimal(overrideRaw).clamp(minMult, maxMult);
    source = "admin_override";
  } else if (enabled) {
    // Auto-compute from last 30 days vs previous 30 days platform revenue
    const { recent, prior } = await fetchRevenuePeriods();
    actual = recent;
    baseline = prior.isZero() ? recent : prior;

    if (!baseline.isZero()) {
      const ratio = actual.div(baseline);
      autoMult = ratio.clamp(minMult, maxMult);
    } else {
      autoMult = new Decimal(1); // No history — stay at 1.0x
    }
    effectiveMult = autoMult;
    source = "auto_computed";
  }

  const snap: EconomySnapshot = {
    effectiveMultiplier: effectiveMult.toFixed(4),
    autoMultiplier:      autoMult.toFixed(4),
    adminOverride:       overrideRaw !== null ? new Decimal(overrideRaw).toFixed(4) : null,
    revenueBaseline:     baseline.toFixed(4),
    revenueActual:       actual.toFixed(4),
    date:                today,
    source,
  };

  // Persist to DB
  try {
    await db
      .insert(economyState)
      .values({
        date:                today as any,
        autoMultiplier:      snap.autoMultiplier,
        adminOverride:       snap.adminOverride,
        effectiveMultiplier: snap.effectiveMultiplier,
        revenueBaseline:     snap.revenueBaseline,
        revenueActual:       snap.revenueActual,
      })
      .onConflictDoUpdate({
        target: [economyState.date],
        set: {
          autoMultiplier:      snap.autoMultiplier,
          adminOverride:       snap.adminOverride,
          effectiveMultiplier: snap.effectiveMultiplier,
          revenueBaseline:     snap.revenueBaseline,
          revenueActual:       snap.revenueActual,
          updatedAt:           new Date(),
        },
      });
  } catch (err) {
    logger.warn({ err }, "[Economy] Failed to persist snapshot to DB; using in-memory");
  }

  logger.info(
    { effectiveMult: snap.effectiveMultiplier, source, today },
    "[Economy] Multiplier computed",
  );

  return snap;
}

/** Sum thorx_profit_pkr from user_transactions for a date window. */
async function fetchRevenuePeriods(): Promise<{ recent: Decimal; prior: Decimal }> {
  const now = Date.now();
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const d60 = new Date(now - 60 * 24 * 60 * 60 * 1000);

  const [recentRow, priorRow] = await Promise.all([
    db
      .select({ total: sql<string>`COALESCE(SUM(thorx_profit_pkr), '0')` })
      .from(userTransactions)
      .where(gte(userTransactions.createdAt, d30)),
    db
      .select({ total: sql<string>`COALESCE(SUM(thorx_profit_pkr), '0')` })
      .from(userTransactions)
      .where(
        and(
          gte(userTransactions.createdAt, d60),
          sql`${userTransactions.createdAt} < ${d30.toISOString()}`,
        ),
      ),
  ]);

  return {
    recent: new Decimal(recentRow[0]?.total ?? "0"),
    prior:  new Decimal(priorRow[0]?.total ?? "0"),
  };
}

// ─── Admin APIs ───────────────────────────────────────────────────────────────

/**
 * Admin sets a manual multiplier override.
 * Pass null to revert to auto-calculation.
 */
export async function setAdminMultiplierOverride(
  overrideValue: number | null,
): Promise<EconomySnapshot> {
  // Update system_config
  if (overrideValue === null) {
    await storage.setSystemConfigValue("ECONOMY_MULTIPLIER_OVERRIDE", null);
  } else {
    const [min, max] = await Promise.all([
      storage.getSystemConfigValue<number>("ECONOMY_MULTIPLIER_MIN", 0.7),
      storage.getSystemConfigValue<number>("ECONOMY_MULTIPLIER_MAX", 1.5),
    ]);
    const clamped = new Decimal(overrideValue).clamp(min, max).toNumber();
    await storage.setSystemConfigValue("ECONOMY_MULTIPLIER_OVERRIDE", clamped);
  }
  invalidateEconomyCache();
  return getTodaySnapshot();
}
