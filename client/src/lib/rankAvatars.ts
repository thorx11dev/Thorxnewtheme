/**
 * THORX Rank Avatar System
 * ─────────────────────────────────────────────────────────────────────────
 * Each rank has 3 selectable avatar outfits.
 * The default (first) avatar is auto-assigned on rank-up.
 *
 * Rank progression: Nawa Aya → Chota Don → Baja Ji → Haji Sab → Supreme Chacha
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface RankAvatar {
  id: string;
  url: string;
  label: string;
}

export interface RankDefinition {
  key: string;          // matches DB value (users.rank)
  label: string;        // display name
  color: string;        // Tailwind color class for badge
  bgColor: string;      // Tailwind bg class for badge
  defaultAvatarId: string; // id of the avatar auto-assigned on rank-up
  avatars: RankAvatar[];   // selectable avatar outfits for this rank
}

// ── NAWA AYA ──────────────────────────────────────────────────────────────
const NAWA_AYA: RankDefinition = {
  key: "Nawa Aya",
  label: "NAWA AYA",
  color: "text-zinc-400",
  bgColor: "bg-zinc-600",
  defaultAvatarId: "nawa-aya",
  avatars: [
    { id: "nawa-aya",   url: "/avatars/nawa-aya.png",   label: "Classic"      },
    { id: "nawa-aya-2", url: "/avatars/nawa-aya-2.png", label: "Green Waistcoat" },
    { id: "nawa-aya-3", url: "/avatars/nawa-aya-3.png", label: "Street Hoodie"   },
  ],
};

// ── CHOTA DON ─────────────────────────────────────────────────────────────
const CHOTA_DON: RankDefinition = {
  key: "Chota Don",
  label: "CHOTA DON",
  color: "text-blue-400",
  bgColor: "bg-blue-700",
  defaultAvatarId: "chota-don",
  avatars: [
    { id: "chota-don",   url: "/avatars/chota-don.png",   label: "Classic"       },
    { id: "chota-don-2", url: "/avatars/chota-don-2.png", label: "Gamer Mode"    },
    { id: "chota-don-3", url: "/avatars/chota-don-3.png", label: "Black Suit"    },
  ],
};

// ── BAJA JI ───────────────────────────────────────────────────────────────
const BAJA_JI: RankDefinition = {
  key: "Baja Ji",
  label: "BAJA JI",
  color: "text-amber-400",
  bgColor: "bg-amber-700",
  defaultAvatarId: "baja-ji",
  avatars: [
    { id: "baja-ji",   url: "/avatars/baja-ji.png",   label: "Classic"        },
    { id: "baja-ji-2", url: "/avatars/baja-ji-2.png", label: "Cap & Tasbih"   },
    { id: "baja-ji-3", url: "/avatars/baja-ji-3.png", label: "Leather Jacket" },
  ],
};

// ── HAJI SAB ──────────────────────────────────────────────────────────────
const HAJI_SAB: RankDefinition = {
  key: "Haji Sab",
  label: "HAJI SAB",
  color: "text-emerald-400",
  bgColor: "bg-emerald-700",
  defaultAvatarId: "haji-sab",
  avatars: [
    { id: "haji-sab",   url: "/avatars/haji-sab.png",   label: "Classic"      },
    { id: "haji-sab-2", url: "/avatars/haji-sab-2.png", label: "Royal Bisht"  },
    { id: "haji-sab-3", url: "/avatars/haji-sab-3.png", label: "Dark Thobe"   },
  ],
};

// ── SUPREME CHACHA ────────────────────────────────────────────────────────
const SUPREME_CHACHA: RankDefinition = {
  key: "Supreme Chacha",
  label: "SUPREME CHACHA",
  color: "text-orange-400",
  bgColor: "bg-orange-700",
  defaultAvatarId: "supreme-chacha",
  avatars: [
    { id: "supreme-chacha",   url: "/avatars/supreme-chacha.png",   label: "Classic"     },
    { id: "supreme-chacha-2", url: "/avatars/supreme-chacha-2.png", label: "The Elder"   },
    { id: "supreme-chacha-3", url: "/avatars/supreme-chacha-3.png", label: "Golden Cane" },
  ],
};

// ── Master registry ───────────────────────────────────────────────────────
export const RANK_DEFINITIONS: RankDefinition[] = [
  NAWA_AYA,
  CHOTA_DON,
  BAJA_JI,
  HAJI_SAB,
  SUPREME_CHACHA,
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
 * Resolves a saved avatar id or legacy id to a URL.
 * Checks current rank avatars first, then all ranks (for legacy compatibility).
 */
export function resolveAvatarUrl(
  savedAvatar: string | null | undefined,
  rankKey?: string | null
): string {
  if (!savedAvatar || savedAvatar === "default") {
    return getDefaultAvatarUrl(rankKey);
  }

  // Check current rank's avatars first
  const rankDef = getRankDef(rankKey);
  const inRank = rankDef.avatars.find((a) => a.id === savedAvatar);
  if (inRank) return inRank.url;

  // Fallback: search ALL rank avatars (handles rank-up gracefully)
  for (const rank of RANK_DEFINITIONS) {
    const found = rank.avatars.find((a) => a.id === savedAvatar);
    if (found) return found.url;
  }

  // If it looks like a custom URL or base64, return as-is
  if (savedAvatar.startsWith("http") || savedAvatar.startsWith("data:")) {
    return savedAvatar;
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
