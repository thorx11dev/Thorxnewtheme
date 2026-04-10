# Leaderboard Matrix (CRM-Lite)

## Goal
Pivot the Leaderboard Insights from a graphical dashboard to a high-performance, sortable tabular matrix focused on "Top Earners", "Network Leaders", and "Suspicious Watchlist" for efficient administrative triage.

## Tasks
- [x] **Tab Structure**: Implement Radix `Tabs` for (WHALES | NODES | WATCHLIST) in `LeaderboardInsights.tsx` → Verify: Click tabs, content switches.
- [x] **Whales Table**: Build sortable data table for Top 50 Earners with `rounded-[2rem]` and 1.5px borders → Verify: Data renders in a clean grid.
- [x] **Nodes Table**: Build sortable data table for Top 50 Referrers (Network Leaders) → Verify: Referral counts match database state.
- [x] **Watchlist Engine**: Finalize "Risk Rationale" column logic in `storage.ts` to include high-velocity earnings → Verify: `GET /api/admin/leaderboard/insights` returns flagged users.
- [x] **Industrial Triage UI**: Create the Watchlist table with red-accented "Terminate" and "Investigate" action buttons → Verify: Correct colors and icons (ShieldAlert, UserX).
- [x] **Performance Pass**: Ensure the component uses `useMemo` for sorting/filtering to handle "long race" data loads → Verify: No lag during sorting.
- [x] **Verifications**: Run `tsc --noEmit` and perform a visual audit against the "Settings" page style → Verify: Aesthetic symmetry confirmed.

## Done When
- [ ] Top navigation "LEADERBOARD" opens a 3-tabbed tabular view.
- [ ] All data is sortable and correctly categorized.
- [ ] Suspected "Bot/Gaming" users are surfaced in the Watchlist tab with actionable controls.
