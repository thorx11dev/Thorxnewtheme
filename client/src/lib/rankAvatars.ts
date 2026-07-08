/**
 * THORX Rank Avatar System
 * ─────────────────────────────────────────────────────────────────────────
 * Each rank has a default avatar (shown automatically when rank is assigned)
 * and 8 getup variants the user can choose from.
 * The profile modal only shows variants for the user's CURRENT rank.
 *
 * Rank progression: Nawa Aya → Munna → Bawa Ji → Haji Saab → Chacha Supreme
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
  avatars: RankAvatar[];   // 8 selectable getup variants
}

// ── NAWA AYA ──────────────────────────────────────────────────────────────
// Young boy in dirty shalwar kameez — the newcomer
const NAWA_AYA: RankDefinition = {
  key: "Nawa Aya",
  label: "NAWA AYA",
  color: "text-zinc-400",
  bgColor: "bg-zinc-600",
  defaultAvatarId: "nawa-aya-1",
  avatars: [
    { id: "nawa-aya-1", url: "/avatars/nawa-aya/1-default.png",  label: "Classic"   },
    { id: "nawa-aya-2", url: "/avatars/nawa-aya/2-cricket.png",  label: "Cricketer" },
    { id: "nawa-aya-3", url: "/avatars/nawa-aya/3-school.png",   label: "Scholar"   },
    { id: "nawa-aya-4", url: "/avatars/nawa-aya/4-eid.png",      label: "Eid Vibes" },
    { id: "nawa-aya-5", url: "/avatars/nawa-aya/5-winter.png",   label: "Winter"    },
    { id: "nawa-aya-6", url: "/avatars/nawa-aya/6-street.png",   label: "Street Kid"},
    { id: "nawa-aya-7", url: "/avatars/nawa-aya/7-chef.png",     label: "Chef"      },
    { id: "nawa-aya-8", url: "/avatars/nawa-aya/8-hero.png",     label: "Superhero" },
  ],
};

// ── MUNNA ─────────────────────────────────────────────────────────────────
// Small boy in black suit + sunglasses — the kid boss
const MUNNA: RankDefinition = {
  key: "Munna",
  label: "MUNNA",
  color: "text-blue-400",
  bgColor: "bg-blue-700",
  defaultAvatarId: "munna-1",
  avatars: [
    { id: "munna-1", url: "/avatars/munna/1-default.png",   label: "Classic"    },
    { id: "munna-2", url: "/avatars/munna/2-casanova.png",  label: "Casanova"   },
    { id: "munna-3", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=MunnaGangster&backgroundColor=1e3a5f&hair=short01&skinColor=brown01",    label: "Gangster"   },
    { id: "munna-4", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=MunnaWedding&backgroundColor=b8860b&hair=short02&skinColor=brown01",     label: "Wedding"    },
    { id: "munna-5", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=MunnaRacer&backgroundColor=8b0000&hair=short03&skinColor=brown01",       label: "Racer"      },
    { id: "munna-6", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=MunnaSpy&backgroundColor=1a3d1a&hair=short04&skinColor=brown01",         label: "Spy"        },
    { id: "munna-7", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=MunnaGym&backgroundColor=4a0080&hair=short05&skinColor=brown01",         label: "Gym Beast"  },
    { id: "munna-8", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=MunnaTech&backgroundColor=004d4d&hair=short06&skinColor=brown01",        label: "Tech Bro"   },
  ],
};

// ── BAWA JI ───────────────────────────────────────────────────────────────
// Young stylish man smoking, dark shalwar + brown vest
const BAWA_JI: RankDefinition = {
  key: "Bawa Ji",
  label: "BAWA JI",
  color: "text-amber-400",
  bgColor: "bg-amber-700",
  defaultAvatarId: "bawa-ji-1",
  avatars: [
    { id: "bawa-ji-1", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=BawaJiDefault&backgroundColor=1c2b3a&skinColor=brown02&hair=long01",    label: "Classic"    },
    { id: "bawa-ji-2", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=BawaJiWedding&backgroundColor=3d0000&skinColor=brown02&hair=long02",    label: "Wedding"    },
    { id: "bawa-ji-3", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=BawaJiChai&backgroundColor=7a3b1e&skinColor=brown02&hair=long03",       label: "Chai Time"  },
    { id: "bawa-ji-4", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=BawaJiBusiness&backgroundColor=2a2a2a&skinColor=brown02&hair=long04",   label: "Business"   },
    { id: "bawa-ji-5", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=BawaJiFestive&backgroundColor=1a4d1a&skinColor=brown02&hair=long05",    label: "Festive"    },
    { id: "bawa-ji-6", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=BawaJiBiker&backgroundColor=1a1a1a&skinColor=brown02&hair=long06",      label: "Biker"      },
    { id: "bawa-ji-7", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=BawaJiMusician&backgroundColor=0d1b4a&skinColor=brown02&hair=short01",  label: "Musician"   },
    { id: "bawa-ji-8", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=BawaJiArtist&backgroundColor=3d1a5e&skinColor=brown02&hair=short02",    label: "Artist"     },
  ],
};

// ── HAJI SAAB ─────────────────────────────────────────────────────────────
// Middle-aged man in white thobe + keffiyeh + sunglasses
const HAJI_SAAB: RankDefinition = {
  key: "Haji Saab",
  label: "HAJI SAAB",
  color: "text-emerald-400",
  bgColor: "bg-emerald-700",
  defaultAvatarId: "haji-saab-1",
  avatars: [
    { id: "haji-saab-1", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=HajiSaabDefault&backgroundColor=1a3d2b&skinColor=brown03&hair=short07",     label: "Classic"     },
    { id: "haji-saab-2", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=HajiSaabFormal&backgroundColor=1a1a3d&skinColor=brown03&hair=short08",       label: "Formal"      },
    { id: "haji-saab-3", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=HajiSaabImam&backgroundColor=2b1a00&skinColor=brown03&hair=short09",         label: "Imam"        },
    { id: "haji-saab-4", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=HajiSaabTraveler&backgroundColor=003d4d&skinColor=brown03&hair=short10",     label: "Traveler"    },
    { id: "haji-saab-5", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=HajiSaabInvestor&backgroundColor=2d2d00&skinColor=brown03&hair=short11",     label: "Investor"    },
    { id: "haji-saab-6", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=HajiSaabKhan&backgroundColor=3d1a00&skinColor=brown03&hair=short12",         label: "Khan Saab"   },
    { id: "haji-saab-7", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=HajiSaabMerchant&backgroundColor=001a3d&skinColor=brown03&hair=short01",     label: "Merchant"    },
    { id: "haji-saab-8", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=HajiSaabDiplomat&backgroundColor=1a001a&skinColor=brown03&hair=short02",     label: "Diplomat"    },
  ],
};

// ── CHACHA SUPREME ────────────────────────────────────────────────────────
// Elderly man with white beard + pakol hat — the supreme elder
const CHACHA_SUPREME: RankDefinition = {
  key: "Chacha Supreme",
  label: "CHACHA SUPREME",
  color: "text-orange-400",
  bgColor: "bg-orange-700",
  defaultAvatarId: "chacha-1",
  avatars: [
    { id: "chacha-1", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ChachaDefault&backgroundColor=2d1a00&skinColor=brown04&hair=short13",       label: "Classic"     },
    { id: "chacha-2", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ChachaChief&backgroundColor=1a0000&skinColor=brown04&hair=short14",          label: "Chief"       },
    { id: "chacha-3", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ChachaMaulana&backgroundColor=003300&skinColor=brown04&hair=short15",        label: "Maulana"     },
    { id: "chacha-4", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ChachaGrandpa&backgroundColor=1a1a2e&skinColor=brown04&hair=short16",        label: "Grandpa"     },
    { id: "chacha-5", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ChachaPolitician&backgroundColor=0d0d0d&skinColor=brown04&hair=short17",     label: "Politician"  },
    { id: "chacha-6", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ChachaLandowner&backgroundColor=2b2000&skinColor=brown04&hair=short18",      label: "Landowner"   },
    { id: "chacha-7", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ChachaMilitary&backgroundColor=001a00&skinColor=brown04&hair=short19",       label: "Commander"   },
    { id: "chacha-8", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ChachaSage&backgroundColor=1a0033&skinColor=brown04&hair=short20",           label: "Sage"        },
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
