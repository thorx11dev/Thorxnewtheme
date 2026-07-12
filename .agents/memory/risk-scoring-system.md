---
name: Risk & Performance Scoring System
description: How THORX's fraud risk engine and performance scoring are wired together — signal set, admin tuning, and gotchas when extending them.
---

## Architecture
- Performance Score (merit) and Risk Score (fraud) are separate systems. Risk Score comes from a multi-signal engine (`server/modules/risk-engine.ts`) that persists results as `risk_cases` rows (one open case per user, unique) plus a `score_history` snapshot trend.
- The watchlist shown to admins (`getLeaderboardInsights().anomalies`) must be sourced from real `risk_cases` (Open/Investigating), never from ad-hoc hardcoded thresholds recomputed at read time — a stateless filter can't be "cleared" or reasoned about by an admin, which defeats the point of case management.
- Trust Status (`Special/Trusted/Normal/Dangerous`) is deliberately **not** auto-set by the risk engine. Resolving a case (Cleared/Actioned) offers the admin an optional trust-status outcome field — this preserves human judgment as the last step while still closing the loop between "why is this account flagged" and the account's trust label.

## Signal set (7 signals, weights sum to 100)
Earnings Velocity 25, Bot Network 20, Device Clustering 15, Chain Linearity 12, Cash-out Velocity 10, Circular Referral 8, Task Completion Speed 10.
**Why:** rebalanced from an original 5-signal/100pt set when 2 more signals (circular/self-referral via device fingerprint match, and implausibly-fast external task completion via `taskRecords.clickedAt`/`completedAt`) were added — always keep the max-per-signal map in `RiskWatchlistPanel.tsx` (`maxBySignal`) in sync with the engine's weights, or displayed percentages silently go wrong.

## Import direction constraint
`risk-engine.ts` statically imports `storage`. Any code in `storage.ts` that needs to call into the risk engine (e.g. auto-triggering a scan after a cache refresh) **must** use a dynamic `import("./modules/risk-engine")`, never a static import, or it creates a circular module dependency.
**How to apply:** same pattern used for `backfillLatestRiskScore()` fixing `score_history.riskScore` (previously hardcoded to `"0"` at snapshot time) — after `upsertRiskCase`, look up the user's latest `scoreHistory` row and patch its `riskScore` in place rather than restructuring the write path.

## Express routing gotcha
A static sub-route (e.g. `GET /api/admin/risk-cases/signal-stats`) registered **after** a dynamic single-segment route (`GET /api/admin/risk-cases/:id`) gets silently shadowed — Express matches `:id` first and the static route never fires (looked like a 404/"not found" from the wrong handler). Always register more-specific static routes before less-specific `:param` routes on the same prefix.

## Feedback loop
Signal predictive accuracy ("precision") is computed on demand from resolved cases only (`Cleared` vs `Actioned` outcomes per signal name) rather than stored incrementally — simpler and always consistent with actual case history, at the cost of an aggregation query. Acceptable given case volume is admin-moderation scale, not high-frequency.
