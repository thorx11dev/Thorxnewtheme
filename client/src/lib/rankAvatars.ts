/**
 * THORX Rank Avatar System
 * ─────────────────────────────────────────────────────────────────────────
 * Each rank has 5 real .webp avatar looks the user can choose from.
 * The profile modal only shows variants for the user's CURRENT rank.
 *
 * Rank progression: Nawa Aya → Munna → Bawa Ji → Haji Saab → Chacha Supreme
 *
 * Avatar files live at: /avatars/{rank_folder}/{1-5}.webp
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface RankAvatar {
  id: string;
  url: string;
  label: string;
}

export interface RankDefinition {
  key: string;             // matches DB value (users.rank)
  label: string;           // display name
  color: string;           // Tailwind color class for badge
  bgColor: string;         // Tailwind bg class for badge
  defaultAvatarId: string; // id of the avatar auto-assigned on rank-up
  avatars: RankAvatar[];   // 5 selectable look variants
}

// ── NAWA AYA ──────────────────────────────────────────────────────────────
const NAWA_AYA: RankDefinition = {
  key: "Nawa Aya",
  label: "NAWA AYA",
  color: "text-zinc-400",
  bgColor: "bg-zinc-600",
  defaultAvatarId: "nawa_aya-1",
  avatars: [
    { id: "nawa_aya-1", url: "/avatars/nawa_aya/1.webp", label: "Look 1" },
    { id: "nawa_aya-2", url: "/avatars/nawa_aya/2.webp", label: "Look 2" },
    { id: "nawa_aya-3", url: "/avatars/nawa_aya/3.webp", label: "Look 3" },
    { id: "nawa_aya-4", url: "/avatars/nawa_aya/4.webp", label: "Look 4" },
    { id: "nawa_aya-5", url: "/avatars/nawa_aya/5.webp", label: "Look 5" },
  ],
};

// ── MUNNA ─────────────────────────────────────────────────────────────────
const MUNNA: RankDefinition = {
  key: "Munna",
  label: "MUNNA",
  color: "text-blue-400",
  bgColor: "bg-blue-700",
  defaultAvatarId: "munna-1",
  avatars: [
    { id: "munna-1", url: "/avatars/munna/1.webp", label: "Look 1" },
    { id: "munna-2", url: "/avatars/munna/2.webp", label: "Look 2" },
    { id: "munna-3", url: "/avatars/munna/3.webp", label: "Look 3" },
    { id: "munna-4", url: "/avatars/munna/4.webp", label: "Look 4" },
    { id: "munna-5", url: "/avatars/munna/5.webp", label: "Look 5" },
  ],
};

// ── BAWA JI ───────────────────────────────────────────────────────────────
const BAWA_JI: RankDefinition = {
  key: "Bawa Ji",
  label: "BAWA JI",
  color: "text-amber-400",
  bgColor: "bg-amber-700",
  defaultAvatarId: "bawa_ji-1",
  avatars: [
    { id: "bawa_ji-1", url: "/avatars/bawa_ji/1.webp", label: "Look 1" },
    { id: "bawa_ji-2", url: "/avatars/bawa_ji/2.webp", label: "Look 2" },
    { id: "bawa_ji-3", url: "/avatars/bawa_ji/3.webp", label: "Look 3" },
    { id: "bawa_ji-4", url: "/avatars/bawa_ji/4.webp", label: "Look 4" },
    { id: "bawa_ji-5", url: "/avatars/bawa_ji/5.webp", label: "Look 5" },
  ],
};

// ── HAJI SAAB ─────────────────────────────────────────────────────────────
const HAJI_SAAB: RankDefinition = {
  key: "Haji Saab",
  label: "HAJI SAAB",
  color: "text-emerald-400",
  bgColor: "bg-emerald-700",
  defaultAvatarId: "haji_saab-1",
  avatars: [
    { id: "haji_saab-1", url: "/avatars/haji_saab/1.webp", label: "Look 1" },
    { id: "haji_saab-2", url: "/avatars/haji_saab/2.webp", label: "Look 2" },
    { id: "haji_saab-3", url: "/avatars/haji_saab/3.webp", label: "Look 3" },
    { id: "haji_saab-4", url: "/avatars/haji_saab/4.webp", label: "Look 4" },
    { id: "haji_saab-5", url: "/avatars/haji_saab/5.webp", label: "Look 5" },
  ],
};

// ── CHACHA SUPREME ────────────────────────────────────────────────────────
const CHACHA_SUPREME: RankDefinition = {
  key: "Chacha Supreme",
  label: "CHACHA SUPREME",
  color: "text-orange-400",
  bgColor: "bg-orange-700",
  defaultAvatarId: "chacha_supreme-1",
  avatars: [
    { id: "chacha_supreme-1", url: "/avatars/chacha_supreme/1.webp", label: "Look 1" },
    { id: "chacha_supreme-2", url: "/avatars/chacha_supreme/2.webp", label: "Look 2" },
    { id: "chacha_supreme-3", url: "/avatars/chacha_supreme/3.webp", label: "Look 3" },
    { id: "chacha_supreme-4", url: "/avatars/chacha_supreme/4.webp", label: "Look 4" },
    { id: "chacha_supreme-5", url: "/avatars/chacha_supreme/5.webp", label: "Look 5" },
  ],
};

// ── Master registry ───────────────────────────────────────────────────────
export const RANK_DEFINITIONS: RankDefinition[] = [
  NAWA_AYA,
  MUNNA,
  BAWA_JI,
  HAJI_SAAB,
  CHACHA_SUPREME,
];

/**
 * Returns the RankDefinition for the given rank key (DB value).
 * Falls back to Nawa Aya if rank is unknown.
 */
export function getRankDef(rankKey?: string | null): RankDefinition {
  if (!rankKey) return NAWA_AYA;
  const match = RANK_DEFINITIONS.find(
    (r) => r.key.toLowerCase() === rankKey.toLowerCase()
  );
  return match ?? NAWA_AYA;
}

/**
 * Returns the default avatar URL for a given rank.
 * Used when a user's rank changes and we auto-assign their avatar.
 */
export function getDefaultAvatarUrl(rankKey?: string | null): string {
  const def = getRankDef(rankKey);
  return def.avatars.find((a) => a.id === def.defaultAvatarId)?.url ?? def.avatars[0].url;
}

/**
 * Normalises legacy hyphen-style avatar IDs to the current underscore scheme.
 *
 * Old IDs          → New IDs
 * nawa-aya-N       → nawa_aya-N
 * bawa-ji-N        → bawa_ji-N
 * haji-saab-N      → haji_saab-N
 * chacha-N         → chacha_supreme-N  (capped at 5; N>5 → 1)
 * munna-N          → munna-N           (unchanged)
 */
function normalizeLegacyAvatarId(id: string): string {
  // nawa-aya-N
  const nawaMatch = id.match(/^nawa-aya-(\d+)$/);
  if (nawaMatch) return `nawa_aya-${nawaMatch[1]}`;

  // bawa-ji-N
  const bawaMatch = id.match(/^bawa-ji-(\d+)$/);
  if (bawaMatch) return `bawa_ji-${bawaMatch[1]}`;

  // haji-saab-N
  const hajiMatch = id.match(/^haji-saab-(\d+)$/);
  if (hajiMatch) return `haji_saab-${hajiMatch[1]}`;

  // chacha-N (old had 8 variants; cap at 5)
  const chachaMatch = id.match(/^chacha-(\d+)$/);
  if (chachaMatch) {
    const n = Math.min(parseInt(chachaMatch[1], 10), 5);
    return `chacha_supreme-${n}`;
  }

  return id; // munna-N and already-normalised ids pass through unchanged
}

/**
 * Resolves a saved avatar id or legacy id to a URL.
 * Normalises old hyphen IDs first, then checks current rank → all ranks → fallback.
 */
export function resolveAvatarUrl(
  savedAvatar: string | null | undefined,
  rankKey?: string | null
): string {
  if (!savedAvatar || savedAvatar === "default") {
    return getDefaultAvatarUrl(rankKey);
  }

  // If it looks like a custom URL or base64, return as-is immediately
  if (savedAvatar.startsWith("http") || savedAvatar.startsWith("data:")) {
    return savedAvatar;
  }

  // Normalise legacy hyphen IDs before any lookup
  const id = normalizeLegacyAvatarId(savedAvatar);

  // Check current rank's avatars first
  const rankDef = getRankDef(rankKey);
  const inRank = rankDef.avatars.find((a) => a.id === id);
  if (inRank) return inRank.url;

  // Fallback: search ALL rank avatars (handles rank-up gracefully)
  for (const rank of RANK_DEFINITIONS) {
    const found = rank.avatars.find((a) => a.id === id);
    if (found) return found.url;
  }

  return getDefaultAvatarUrl(rankKey);
}

// ── Legacy compatibility ──────────────────────────────────────────────────
// Flat AVATARS array for components that haven't been migrated yet.
// Returns ALL avatars across all ranks (admin use, referral tree fallback).
export const ALL_AVATARS = RANK_DEFINITIONS.flatMap((r) => r.avatars).map((a) => ({
  id: a.id,
  url: a.url,
}));
