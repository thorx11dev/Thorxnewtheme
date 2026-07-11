---
name: Rank color/frame standardization
description: All rank tiers must render with the same silver/zinc frame — do not reintroduce per-rank colors.
---

The app has (had) three separate per-rank color systems that drifted out of sync: `rank-badge.tsx`'s `RANK_CONFIG`, `rankAvatars.ts`'s `RANK_DEFINITIONS.color/bgColor`, and ad-hoc hardcoded styles in modals/portals. Per product decision, every rank (Nawa Aya, Chota Don, Baja Ji, Haji Sab, Supreme Chacha) must use the same silver/zinc frame and badge color — rank is not color-coded.

**Why:** user reported inconsistent frame colors per rank tier and asked to standardize all ranks to the silver style already used for Nawa Aya.

**How to apply:** `rankAvatars.ts` now defines `SILVER_COLOR`/`SILVER_BG` constants reused by every `RankDefinition`. When adding new rank-aware UI, reuse `getRankDef(...).bgColor`/`.color` (or the exported avatar/badge helpers) rather than inventing per-rank colors, and don't touch `rank-badge.tsx` (dead/unused — not imported anywhere) as a source of truth.
