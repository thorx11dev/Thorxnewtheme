/**
 * THORX — Canonical query key registry
 *
 * All TanStack Query keys must come from here. This eliminates the string-vs-array
 * mismatch that caused silent cache misses and stale UI after mutations (Finding 1-Q).
 *
 * Rules:
 *  - Static keys: plain `as const` arrays
 *  - Dynamic keys: factory functions returning `as const` arrays
 *  - Invalidating a parent key (e.g. KEYS.user) also invalidates all children
 *
 * Key format convention:
 *  - User-portal queries supply their own queryFn, so the key is a short
 *    semantic identifier (e.g. ["earnings"]).
 *  - Admin / team-portal queries rely on the default getQueryFn (which joins
 *    the key with "/" to derive the fetch URL), so those keys are "/api/..." paths.
 */
export const QUERY_KEYS = {
  // ── Auth / session ────────────────────────────────────────────────────────
  user:                  ["/api/user"]                         as const,
  sessionAuth:           ["session-auth"]                      as const,

  // ── User-portal: Earnings / financial ─────────────────────────────────────
  // NOTE: UserPortal uses short-form keys with explicit queryFn.
  earnings:              ["earnings"]                          as const,
  earningsHistory:       ["earnings", "history", "week"]       as const,
  withdrawals:           ["/api/withdrawals"]                  as const,
  withdrawalPreview:     ["/api/withdrawals/preview"]          as const,
  withdrawalTimeframe:   ["/api/withdrawals/timeframe-breakdown"] as const,
  adViews:               ["ad-views"]                         as const,
  adViewsToday:          ["ad-views", "today"]                as const,
  commissions:           ["commissions"]                       as const,
  transactionHistory:    ["transactions", "history"]           as const,

  // ── User-portal: Tasks ────────────────────────────────────────────────────
  tasks:                 ["/api/tasks"]                        as const,
  tasksCompletedToday:   ["/api/tasks/completed/today"]        as const,

  // ── User-portal: Dashboard stats ──────────────────────────────────────────
  dashboardStats:        ["dashboard", "stats"]                as const,

  // ── User-portal: Referrals ────────────────────────────────────────────────
  referrals:             ["referrals"]                         as const,
  referralsLeaderboard:  ["referrals", "leaderboard"]          as const,

  // ── User-portal: Notifications ────────────────────────────────────────────
  notifications:         ["notifications"]                     as const,

  // ── User-portal: Chat ─────────────────────────────────────────────────────
  chatHistory:           ["chat-history"]                      as const,

  // ── Guild (static) ────────────────────────────────────────────────────────
  guilds:                ["/api/guilds"]                       as const,

  // ── Guild (dynamic — require a guildId) ──────────────────────────────────
  guildDetail:           (id: string) => ["/api/guilds", id]                    as const,
  guildMessages:         (id: string) => ["/api/guilds", id, "messages"]        as const,
  guildChat:             (id: string) => ["/api/guilds", id, "chat"]            as const,
  guildMembers:          (id: string) => ["/api/guilds", id, "members"]         as const,
  guildApplications:     (id: string) => ["/api/guilds", id, "applications"]   as const,
  guildWeeklyTasks:      (id: string) => ["/api/guilds", id, "weekly-tasks"]   as const,
  guildWeeklySnapshot:   (id: string) => ["/api/guilds", id, "weekly-snapshot"] as const,
  guildApplicationStatus:(id: string) => ["/api/guilds", id, "application-status"] as const,
  guildMine:             ["/api/guilds/mine"]                  as const,

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminConfig:           ["/api/admin/config"]                 as const,
  adminUsers:            ["/api/admin/users"]                  as const,
  adminWithdrawals:      ["/api/admin/withdrawals"]            as const,
  adminLeaderboard:      ["/api/admin/leaderboard/insights"]   as const,
  adminAuditLogs:        ["/api/admin/audit-logs"]             as const,
  adminReconciliation:   ["/api/admin/reconciliation"]         as const,
  adminSystemHealth:     ["/api/admin/system-health"]          as const,
  adminTasks:            ["/api/admin/tasks"]                  as const,
  adminRiskCases:        ["/api/admin/risk-cases"]             as const,
  adminFounderWithdrawals:["/api/admin/founder/withdrawals"]   as const,
  adminFounderProfit:    ["/api/admin/founder/profit-summary"] as const,
  adminGuilds:           ["/api/admin/guilds"]                 as const,
  adminReferralStats:    ["/api/admin/referrals/stats"]        as const,
  adminReferralLeaderboard:["/api/admin/referrals/leaderboard"] as const,
  adminLiveFeed:         ["/api/admin/live-feed"]              as const,
  adminProfitLedger:     ["/api/admin/profit-ledger"]          as const,
  adminSystemHealthHistory:["/api/admin/system-health/history"] as const,

  // ── Leaderboard ───────────────────────────────────────────────────────────
  leaderboard:           ["/api/leaderboard"]                  as const,
} as const;
