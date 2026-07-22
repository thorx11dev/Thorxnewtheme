// THORX v3 — Thorx Card randomized reward engine (Part E.1 of the v3 spec).
//
// Design: the user's exact PKR share of an earn event (userPkrShare) is
// IMMUTABLE and is what withdrawal math is based on (see user_transactions.
// real_pkr_value). The "points" shown on the card are a randomized display
// value layered on top purely for engagement — they never change what the
// user can withdraw.

import Decimal from "decimal.js";

export interface CardDrawParams {
  userPkrShare: number | string;   // exact PKR already split from gross for this user (string keeps Decimal precision)
  conversionRate: number; // system_config CONVERSION_RATE (TX-Points per Rs.10)
  userRankTier: string;   // affects variance bounds (A-Rank / S-Rank bonus)
  varianceMin: number;    // system_config CARD_VARIANCE_MIN (default 0.80)
  varianceMax: number;    // system_config CARD_VARIANCE_MAX (default 1.20)
  aRankBonusPct?: number; // system_config A_RANK_CARD_BONUS_PCT (default 5)
  sRankBonusPct?: number; // system_config S_RANK_CARD_BONUS_PCT (default 10)
}

export interface CardResult {
  pointsCredited: number; // random, shown to the user on the Thorx Card
  realPkrValue: string;   // exact string representation — never converted to float
  cardVariance: number;   // the random multiplier actually applied (audit trail)
  targetPoints: number;   // pre-variance baseline (internal reference only)
}

export function drawThorxCard(params: CardDrawParams): CardResult {
  const {
    userPkrShare,
    conversionRate,
    userRankTier,
    varianceMin,
    varianceMax,
    aRankBonusPct = 5,
    sRankBonusPct = 10,
  } = params;

  // Rank bonus adjustments to variance range — higher ranks get a wider
  // (and better-skewed) band, purely on the display/points side.
  let min = varianceMin;
  let max = varianceMax;
  if (userRankTier === "A-Rank") {
    min -= aRankBonusPct / 100;
    max += aRankBonusPct / 100;
  }
  if (userRankTier === "S-Rank") {
    min -= sRankBonusPct / 100;
    max += sRankBonusPct / 100;
  }
  // Never let bounds invert or go non-positive.
  min = Math.max(0.01, min);
  if (max < min) max = min;

  const pkrDecimal = new Decimal(userPkrShare);
  // Keep Decimal through the full chain — only convert to number at the
  // final integer step to avoid float-multiply precision drift.
  const targetPointsD = pkrDecimal.div(10).times(conversionRate);
  const cardVariance = min + Math.random() * (max - min); // Math.random() variance is intentionally float (display-only)
  const pointsCredited = Math.max(
    0,
    targetPointsD.times(cardVariance).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber(),
  );
  const targetPoints = targetPointsD.toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber();

  return { pointsCredited, realPkrValue: pkrDecimal.toFixed(4), cardVariance, targetPoints };
}

export interface CardConfig {
  conversionRate: number;
  varianceMin: number;
  varianceMax: number;
  aRankBonusPct?: number;
  sRankBonusPct?: number;
}

export interface SimulationResult {
  iteration: number;
  pointsCredited: number;
  realPkrValue: string;
  cardVariance: number;
}

// Admin simulation tool (Thorx Card Sandbox) — runs N draws for a given
// gross PKR / engine / rank combination without touching real user data.
export function simulateThorxCards(params: {
  grossPkr: number;
  engineType: "A" | "B" | "C";
  userRankTier: string;
  iterations: number;
  config: CardConfig;
  engineSplits: { thorxCutPct: number; guildPoolPct?: number; userCutPct: number };
}): SimulationResult[] {
  const { grossPkr, userRankTier, iterations, config, engineSplits } = params;
  // Use Decimal for the split so floating-point errors don't accumulate across iterations
  // F-08: Keep full Decimal precision — drawThorxCard accepts number|string; pass string to avoid float drift.
  const userPkrShare = new Decimal(grossPkr).times(engineSplits.userCutPct).div(100).toFixed(8);

  const results: SimulationResult[] = [];
  for (let i = 0; i < iterations; i++) {
    const draw = drawThorxCard({
      userPkrShare,
      conversionRate: config.conversionRate,
      userRankTier,
      varianceMin: config.varianceMin,
      varianceMax: config.varianceMax,
      aRankBonusPct: config.aRankBonusPct,
      sRankBonusPct: config.sRankBonusPct,
    });
    results.push({
      iteration: i + 1,
      pointsCredited: draw.pointsCredited,
      realPkrValue: draw.realPkrValue,
      cardVariance: draw.cardVariance,
    });
  }
  return results;
}
