---
name: Rank Avatar System
description: Architecture for THORX's 5-rank character avatar system — rank-locked getups, auto-assign on rank-up, single source of truth.
---

## Rule
All avatar resolution must go through `client/src/lib/rankAvatars.ts`. Never define a local AVATARS array in components.

**Why:** Previously each component (UserPortal, referral-tree, AdminHeader, profile-modal) maintained its own AVATARS array, causing drift. Centralising in `rankAvatars.ts` ensures all avatar changes are made in one place.

**How to apply:** Import `resolveAvatarUrl(avatarId, rankKey)` for display. Import `getRankDef(rankKey).avatars` for the profile modal selector. Import `getDefaultAvatarUrl(rankKey)` for new-user defaults.

## Characters (rank → default avatar id)
- Nawa Aya → `nawa-aya-1` → `/avatars/nawa-aya/1-default.png` (AI generated, stored in `client/public/avatars/nawa-aya/`)
- Munna → `munna-1` → `/avatars/munna/1-default.png` (AI generated, 2 variants in `client/public/avatars/munna/`)
- Bawa Ji → `bawa-ji-1` → DiceBear adventurer URL
- Haji Saab → `haji-saab-1` → DiceBear adventurer URL
- Chacha Supreme → `chacha-1` → DiceBear adventurer URL

## Server auto-assignment
`server/storage.ts` `checkAndUpdateRank()` — on rank change, auto-assigns the new rank's default avatar ID **unless** the user has a custom photo/URL. Checks: avatar starts with rank prefix OR is a known default → replace. Custom base64/URL → keep.

## Avatar ID naming convention
- Local images: `nawa-aya-N`, `munna-N` (N = 1-8)
- DiceBear: `bawa-ji-N`, `haji-saab-N`, `chacha-N`
- Custom upload: `"custom"` with `profilePicture` field
- Legacy DiceBear (old): `avatar1`–`avatar10` — these are now mapped via `ALL_AVATARS` fallback in `resolveAvatarUrl`
