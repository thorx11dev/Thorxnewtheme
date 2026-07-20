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
 */
export const QUERY_KEYS = {
  // Auth / session
  user:               ["/api/user"]                         as const,

  // Earnings / financial
  earnings:           ["/api/earnings"]                     as const,
  withdrawals:        ["/api/withdrawals"]                  as const,
  withdrawalPreview:  ["/api/withdrawals/preview"]          as const,
  adViews:            ["/api/ad-views"]                     as const,

  // Tasks
  tasks:              ["/api/tasks"]                        as const,
  tasksCompletedToday:["/api/tasks/completed/today"]        as const,

  // Guild (static)
  guilds:             ["/api/guilds"]                       as const,

  // Guild (dynamic — require a guildId)
  guildDetail:        (guildId: string) => ["/api/guilds", guildId]                    as const,
  guildMessages:      (guildId: string) => ["/api/guilds", guildId, "messages"]        as const,
  guildChat:          (guildId: string) => ["/api/guilds", guildId, "chat"]            as const,
  guildMembers:       (guildId: string) => ["/api/guilds", guildId, "members"]         as const,
  guildApplications:  (guildId: string) => ["/api/guilds", guildId, "applications"]   as const,
  guildWeeklyTasks:   (guildId: string) => ["/api/guilds", guildId, "weekly-tasks"]   as const,

  // Admin
  adminConfig:        ["/api/admin/config"]                 as const,
  adminUsers:         ["/api/admin/users"]                  as const,
  adminWithdrawals:   ["/api/admin/withdrawals"]            as const,
  adminLeaderboard:   ["/api/admin/leaderboard/insights"]  as const,
  adminAuditLogs:     ["/api/admin/audit-logs"]            as const,
  adminReconciliation:["/api/admin/reconciliation"]         as const,
  adminSystemHealth:  ["/api/admin/system-health"]          as const,

  // Leaderboard
  leaderboard:        ["/api/leaderboard"]                  as const,

  // Referrals
  referrals:          ["/api/referrals"]                    as const,

  // Notifications
  notifications:      ["/api/notifications"]                as const,
} as const;
