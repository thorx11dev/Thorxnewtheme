/**
 * THORX Risk Scoring Engine
 *
 * Computes a composite risk score (0–100) for every qualified user
 * from six independent signals. Severity tiers:
 *   0–24   → Low
 *   25–49  → Medium
 *   50–74  → High
 *   75–100 → Critical
 *
 * Call runFullRiskScan() after every leaderboard refresh.
 * Call scoreUser(userId) for on-demand single-user scoring.
 */

import { db } from "../db";
import {
  users,
  riskCases,
  deviceFingerprints,
  earnings,
  withdrawals,
  commissionLogs,
  type RiskCase,
} from "@shared/schema";
import { eq, and, sql, desc, gte, inArray } from "drizzle-orm";
import { broadcastRiskAlert } from "../realtime";
import { storage } from "../storage";

export interface RiskSignal {
  name: string;
  score: number;
  detail: string;
}

export interface RiskResult {
  userId: string;
  riskScore: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  signals: RiskSignal[];
}

// ─── Severity helpers ───────────────────────────────────────────────────────

export function toSeverity(score: number): "Low" | "Medium" | "High" | "Critical" {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}

// ─── Signal computers (each returns 0–max_weight) ───────────────────────────

/** Signal 1 — Earnings Velocity (max 30 pts)
 *  Earnings in the last 24 h relative to the configurable threshold.
 */
async function signalEarningsVelocity(userId: string): Promise<RiskSignal> {
  const threshold = await storage.getSystemConfigValue<number>("RISK_VELOCITY_THRESHOLD", 5000);
  const since = new Date(Date.now() - 86_400_000);
  const [row] = await db
    .select({ total: sql<string>`COALESCE(SUM(${earnings.amount}), '0')` })
    .from(earnings)
    .where(and(eq(earnings.userId, userId), gte(earnings.createdAt, since)));
  const earned24h = parseFloat(row?.total ?? "0");
  const score = Math.min(30, (earned24h / Math.max(1, threshold)) * 30);
  return {
    name: "Earnings Velocity",
    score: Math.round(score),
    detail: `PKR ${earned24h.toLocaleString()} earned in the last 24 h (threshold PKR ${threshold.toLocaleString()})`,
  };
}

/** Signal 2 — Bot Network Pattern (max 25 pts)
 *  High referral count paired with very low per-referral earnings suggests
 *  a purchased / bot referral network.
 */
async function signalBotNetwork(
  userId: string,
  referralCount: number,
  totalEarnings: number
): Promise<RiskSignal> {
  if (referralCount < 5) return { name: "Bot Network", score: 0, detail: "Too few referrals to evaluate." };
  const earningsPerRef = totalEarnings / referralCount;
  const threshold = await storage.getSystemConfigValue<number>("RISK_BOT_EARNINGS_PER_REF", 100);
  const score = earningsPerRef < threshold
    ? Math.min(25, ((threshold - earningsPerRef) / threshold) * 25)
    : 0;
  return {
    name: "Bot Network",
    score: Math.round(score),
    detail: `PKR ${earningsPerRef.toFixed(0)} avg earnings per referral (low = suspicious when > 5 refs)`,
  };
}

/** Signal 3 — Device Fingerprint Clustering (max 20 pts)
 *  Multiple accounts sharing the same device fingerprint indicate
 *  one person operating multiple accounts.
 */
async function signalDeviceClustering(userId: string): Promise<RiskSignal> {
  const userFPs = await db
    .select({ hash: deviceFingerprints.fingerprintHash })
    .from(deviceFingerprints)
    .where(eq(deviceFingerprints.userId, userId));

  if (!userFPs.length) return { name: "Device Clustering", score: 0, detail: "No device fingerprints recorded." };

  const hashes = userFPs.map((f) => f.hash);
  const [row] = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${deviceFingerprints.userId})` })
    .from(deviceFingerprints)
    .where(
      and(
        inArray(deviceFingerprints.fingerprintHash, hashes),
        sql`${deviceFingerprints.userId} != ${userId}`
      )
    );

  const sharedCount = Number(row?.cnt ?? 0);
  const score = Math.min(20, sharedCount * 5);
  return {
    name: "Device Clustering",
    score: Math.round(score),
    detail:
      sharedCount === 0
        ? "Device fingerprints unique."
        : `${sharedCount} other account(s) share this device fingerprint.`,
  };
}

/** Signal 4 — Referral Chain Linearity (max 15 pts)
 *  When every L1 referral has exactly one more referral themselves,
 *  it looks like a fabricated chain, not organic growth.
 */
async function signalChainLinearity(userId: string, referralCount: number): Promise<RiskSignal> {
  if (referralCount < 5) return { name: "Chain Linearity", score: 0, detail: "Insufficient referrals." };

  const l1 = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.referredBy, userId));

  if (!l1.length) return { name: "Chain Linearity", score: 0, detail: "No L1 referrals found." };

  const l1Ids = l1.map((u) => u.id);
  const narrowRefs = await db
    .select({
      uid: users.referredBy,
      cnt: sql<number>`COUNT(*)`,
    })
    .from(users)
    .where(inArray(users.referredBy, l1Ids))
    .groupBy(users.referredBy);

  const narrowCount = narrowRefs.filter((r) => Number(r.cnt) === 1).length;
  const ratio = narrowCount / l1.length;
  const score = ratio > 0.7 ? Math.min(15, ratio * 15) : 0;
  return {
    name: "Chain Linearity",
    score: Math.round(score),
    detail: `${Math.round(ratio * 100)}% of L1 referrals have exactly one sub-referral (linear chain pattern).`,
  };
}

/** Signal 5 — Cash-out Velocity (max 10 pts)
 *  Withdrawals initiated within hours of earning suggest automated scripts.
 */
async function signalCashoutVelocity(userId: string): Promise<RiskSignal> {
  const recentWithdrawals = await db
    .select({ createdAt: withdrawals.createdAt, amount: withdrawals.amount })
    .from(withdrawals)
    .where(and(eq(withdrawals.userId, userId), gte(withdrawals.createdAt, new Date(Date.now() - 7 * 86_400_000))))
    .orderBy(desc(withdrawals.createdAt))
    .limit(5);

  if (!recentWithdrawals.length) return { name: "Cash-out Velocity", score: 0, detail: "No recent withdrawal activity." };

  const fastWithdrawals = recentWithdrawals.filter((w) => {
    const age = Date.now() - new Date(w.createdAt!).getTime();
    return age < 3_600_000; // within 1 hour
  });

  const score = Math.min(10, fastWithdrawals.length * 3);
  return {
    name: "Cash-out Velocity",
    score: Math.round(score),
    detail:
      fastWithdrawals.length > 0
        ? `${fastWithdrawals.length} withdrawal(s) initiated within 1 h of earning.`
        : "Withdrawal timing appears normal.",
  };
}

// ─── Core scoring function ───────────────────────────────────────────────────

export async function scoreUser(userId: string): Promise<RiskResult> {
  const [user] = await db
    .select({
      totalEarnings: users.totalEarnings,
      referralCount: sql<number>`CAST(COALESCE((SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = users.id), 0) AS INTEGER)`,
    })
    .from(users)
    .where(eq(users.id, userId));

  const totalEarnings = parseFloat(user?.totalEarnings ?? "0");
  const referralCount = user?.referralCount ?? 0;

  const signals = await Promise.all([
    signalEarningsVelocity(userId),
    signalBotNetwork(userId, referralCount, totalEarnings),
    signalDeviceClustering(userId),
    signalChainLinearity(userId, referralCount),
    signalCashoutVelocity(userId),
  ]);

  const riskScore = Math.min(100, signals.reduce((sum, s) => sum + s.score, 0));
  const severity = toSeverity(riskScore);

  return { userId, riskScore, severity, signals };
}

// ─── Case upsert ─────────────────────────────────────────────────────────────

export async function upsertRiskCase(result: RiskResult): Promise<RiskCase> {
  const now = new Date();
  const existing = await db
    .select()
    .from(riskCases)
    .where(eq(riskCases.userId, result.userId))
    .limit(1);

  const signalsJson = result.signals as any;

  if (existing.length > 0) {
    const prev = existing[0];
    const keepStatus =
      prev.status === "Cleared" || prev.status === "Actioned" ? prev.status : result.severity === "Low" ? "Open" : prev.status;

    const [updated] = await db
      .update(riskCases)
      .set({
        riskScore: result.riskScore.toFixed(2),
        severity: result.severity,
        signals: signalsJson,
        status: keepStatus,
        updatedAt: now,
      })
      .where(eq(riskCases.userId, result.userId))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(riskCases)
      .values({
        userId: result.userId,
        riskScore: result.riskScore.toFixed(2),
        severity: result.severity,
        signals: signalsJson,
        status: "Open",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }
}

// ─── Full scan ───────────────────────────────────────────────────────────────

export async function runFullRiskScan(options?: { broadcastAlerts?: boolean }): Promise<{
  scanned: number;
  flagged: number;
  critical: number;
}> {
  const broadcast = options?.broadcastAlerts ?? true;
  const allUsers = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(and(eq(users.isActive, true), eq(users.role, "user")));

  let flagged = 0;
  let critical = 0;

  for (const u of allUsers) {
    try {
      const result = await scoreUser(u.id);
      const riskCase = await upsertRiskCase(result);

      if (result.severity !== "Low") flagged++;
      if (result.severity === "Critical") {
        critical++;
        if (broadcast) {
          broadcastRiskAlert({
            caseId: riskCase.id,
            userId: u.id,
            userName: `${u.firstName} ${u.lastName}`.trim(),
            riskScore: result.riskScore,
            severity: result.severity,
            signals: result.signals,
          });
        }
      }
    } catch (err) {
      console.error(`[RiskEngine] Failed to score user ${u.id}:`, err);
    }
  }

  console.log(`[RiskEngine] Scan complete — ${allUsers.length} users, ${flagged} flagged, ${critical} critical.`);
  return { scanned: allUsers.length, flagged, critical };
}
