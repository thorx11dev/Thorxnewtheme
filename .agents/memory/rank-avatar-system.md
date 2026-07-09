---
name: Rank Avatar System
description: Architecture for THORX's 5-rank character avatar system — one real photo per rank, auto-assign on rank-up, single source of truth.
---

## Rule
All avatar resolution must go through `client/src/lib/rankAvatars.ts`. Never define a local AVATARS array in components.

**Why:** Previously each component (UserPortal, referral-tree, AdminHeader, profile-modal) maintained its own AVATARS array, causing drift. Centralising in `rankAvatars.ts` ensures all avatar changes are made in one place.

**How to apply:** Import `resolveAvatarUrl(avatarId, rankKey)` for display. Import `getRankDef(rankKey).avatars` for the profile modal selector. Import `getDefaultAvatarUrl(rankKey)` for new-user defaults.

## Current ranks & avatars (one real PNG per rank)
- Nawa Aya      → `nawa-aya`       → `/avatars/nawa-aya.png`
- Chota Don     → `chota-don`      → `/avatars/chota-don.png`
- Baja Ji       → `baja-ji`        → `/avatars/baja-ji.png`
- Haji Sab      → `haji-sab`       → `/avatars/haji-sab.png`
- Supreme Chacha→ `supreme-chacha` → `/avatars/supreme-chacha.png`

All five PNGs live in `client/public/avatars/`. Source images are in `attached_assets/image_178363XXXXXX.png`.

## Previous rank names (legacy — kept for fallback matching only)
Old names that may appear in existing DB rows: "Munna", "Bawa Ji", "Haji Saab", "Chacha Supreme".
`resolveAvatarUrl` and `referral-tree.tsx` both map legacy avatar ID prefixes to the new images.

## Server auto-assignment
`server/storage.ts` `checkAndUpdateRank()` — on rank change, auto-assigns the new rank's default avatar ID **unless** the user has a custom photo/URL. Checks: avatar === "default", is a known default ID, or starts with a known rank prefix → replace. Custom base64/URL → keep.

## Files that encode rank names (must all be updated together on any future rename)
- `client/src/lib/rankAvatars.ts` — master definitions
- `server/storage.ts` — RANKS thresholds + RANK_DEFAULT_AVATARS map
- `client/src/components/ui/rank-badge.tsx` — RANK_CONFIG + RANK_THRESHOLDS
- `client/src/components/ui/referral-tree.tsx` — inline rank→avatar map
- `client/src/components/admin/TaskManager.tsx` — RANKS array + Select options
- `client/src/pages/TermsAndConditions.tsx` — rank table
- `client/src/components/sections/faq-section.tsx` — FAQ copy
- `client/src/pages/UserPortal.tsx` — FAQ copy
