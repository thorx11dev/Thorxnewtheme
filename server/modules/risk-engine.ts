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
  taskRecords,
  scoreHistory,
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

/** Signal 1 — Earnings Velocity (max 25 pts)
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
  const score = Math.min(25, (earned24h / Math.max(1, threshold)) * 25);
  return {
    name: "Earnings Velocity",
    score: Math.round(score),
    detail: `PKR ${earned24h.toLocaleString()} earned in the last 24 h (threshold PKR ${threshold.toLocaleString()})`,
  };
}

/** Signal 2 — Bot Network Pattern (max 20 pts)
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
    ? Math.min(20, ((threshold - earningsPerRef) / threshold) * 20)
    : 0;
  return {
    name: "Bot Network",
    score: Math.round(score),
    detail: `PKR ${earningsPerRef.toFixed(0)} avg earnings per referral (low = suspicious when > 5 refs)`,
  };
}

/** Signal 3 — Device Fingerprint Clustering (max 15 pts)
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
  const score = Math.min(15, sharedCount * 4);
  return {
    name: "Device Clustering",
    score: Math.round(score),
    detail:
      sharedCount === 0
        ? "Device fingerprints unique."
        : `${sharedCount} other account(s) share this device fingerprint.`,
  };
}

/** Signal 4 — Referral Chain Linearity (max 12 pts)
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
  const score = ratio > 0.7 ? Math.min(12, ratio * 12) : 0;
  return {
    name: "Chain Linearity",
    score: Math.round(score),
    detail: `${Math.round(ratio * 100)}% of L1 referrals have exactly one sub-referral (linear chain pattern).`,
  };
}

/** Signal 6 — Circular / Self-Referral Pattern (max 8 pts)
 *  Two independent checks: (a) a genuine cycle in the referredBy parent
 *  chain (data-integrity fraud — a user effectively refers their own
 *  upline), and (b) a direct referral who shares a device fingerprint
 *  with the referrer (self-funded alt account farming a signup bonus).
 */
async function signalCircularReferral(userId: string): Promise<RiskSignal> {
  // (a) Walk the referredBy chain looking for a cycle back to the user.
  let cycleFound = false;
  let cursor: string | null | undefined = userId;
  for (let hop = 0; hop < 25 && cursor; hop++) {
    const [parent] = await db
      .select({ referredBy: users.referredBy })
      .from(users)
      .where(eq(users.id, cursor));
    cursor = parent?.referredBy;
    if (cursor === userId) {
      cycleFound = true;
      break;
    }
  }

  // (b) Direct referrals sharing a device fingerprint with this user.
  const userFPs = await db
    .select({ hash: deviceFingerprints.fingerprintHash })
    .from(deviceFingerprints)
    .where(eq(deviceFingerprints.userId, userId));

  let selfFundedRefs = 0;
  if (userFPs.length) {
    const hashes = userFPs.map((f) => f.hash);
    const [row] = await db
      .select({ cnt: sql<number>`COUNT(DISTINCT ${users.id})` })
      .from(users)
      .innerJoin(deviceFingerprints, eq(deviceFingerprints.userId, users.id))
      .where(and(eq(users.referredBy, userId), inArray(deviceFingerprints.fingerprintHash, hashes)));
    selfFundedRefs = Number(row?.cnt ?? 0);
  }

  const score = (cycleFound ? 4 : 0) + Math.min(4, selfFundedRefs * 4);
  const parts: string[] = [];
  if (cycleFound) parts.push("referredBy chain cycles back to this account");
  if (selfFundedRefs > 0) parts.push(`${selfFundedRefs} direct referral(s) share this account's device`);
  return {
    name: "Circular Referral",
    score: Math.round(score),
    detail: parts.length ? parts.join("; ") : "No circular or self-funded referral pattern detected.",
  };
}

/** Signal 7 — Task Completion Speed (max 10 pts)
 *  Daily tasks require visiting an external URL and following
 *  instructions before completion. Repeated completions within
 *  a couple of seconds of being clicked are not physically plausible.
 */
async function signalTaskCompletionSpeed(userId: string): Promise<RiskSignal> {
  const recent = await db
    .select({ clickedAt: taskRecords.clickedAt, completedAt: taskRecords.completedAt })
    .from(taskRecords)
    .where(and(eq(taskRecords.userId, userId), gte(taskRecords.completedAt, new Date(Date.now() - 14 * 86_400_000))))
    .orderBy(desc(taskRecords.completedAt))
    .limit(30);

  const timed = recent.filter((r) => r.clickedAt && r.completedAt);
  if (!timed.length) return { name: "Task Completion Speed", score: 0, detail: "No timed task completions to evaluate." };

  const threshold = await storage.getSystemConfigValue<number>("RISK_TASK_SPEED_SECONDS", 3);
  const tooFast = timed.filter((r) => {
    const seconds = (new Date(r.completedAt!).getTime() - new Date(r.clickedAt!).getTime()) / 1000;
    return seconds < threshold;
  });

  const ratio = tooFast.length / timed.length;
  const score = ratio > 0.3 ? Math.min(10, ratio * 10) : 0;
  return {
    name: "Task Completion Speed",
    score: Math.round(score),
    detail:
      tooFast.length > 0
        ? `${tooFast.length}/${timed.length} recent tasks completed in under ${threshold}s (physically implausible).`
        : "Task completion timing appears normal.",
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
    signalCircularReferral(userId),
    signalTaskCompletionSpeed(userId),
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
    await backfillLatestRiskScore(result.userId, result.riskScore);
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
    await backfillLatestRiskScore(result.userId, result.riskScore);
    return created;
  }
}

/** Stamps the freshly computed risk score onto the user's most recent
 *  score_history snapshot, so the Performance Score Trend chart reflects
 *  real risk data instead of the "0" placeholder written at snapshot time.
 */
async function backfillLatestRiskScore(userId: string, riskScore: number): Promise<void> {
  try {
    const [latest] = await db
      .select({ id: scoreHistory.id })
      .from(scoreHistory)
      .where(eq(scoreHistory.userId, userId))
      .orderBy(desc(scoreHistory.snapshotAt))
      .limit(1);
    if (latest) {
      await db.update(scoreHistory).set({ riskScore: riskScore.toFixed(2) }).where(eq(scoreHistory.id, latest.id));
    }
  } catch (err) {
    console.error(`[RiskEngine] Failed to backfill score_history for ${userId}:`, err);
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
