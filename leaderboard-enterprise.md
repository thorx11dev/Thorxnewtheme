# Leaderboard Enterprise Overhaul

## Goal
Transform the THORX Leaderboard into a mission-critical, enterprise-grade analytical matrix that ranks every user globally based on a composite Performance Score (Earnings, Team, Activity, and Health).

## Tasks
- [ ] **Data Model (Composite Score)**: Update `getLeaderboardInsights` in `storage.ts` to calculate a "Global Rank" and "Health Ratio" for EVERY user, not just top 50 → Verify: `GET` returns a full sorted list with calculated performance metrics.
- [ ] **Main Tab Integration**: Add a primary "GLOBAL RANKING" tab as the default view in `LeaderboardInsights.tsx` → Verify: Global tab shows #1 ranked user at the top.
- [ ] **Enterprise Metrics UI**: Implement columns for (Earnings | Team Size | Active % | Health Ratio) using `tabular-nums` formatting → Verify: Columns are perfectly aligned and readable.
- [ ] **Verified Health Logic**: Define and implement "Health Ratio" in backend (KYC status + email verification + task consistency) → Verify: Verified users show a higher health % score.
- [ ] **Enterprise Search Architecture**: Implement server-side search and pagination to handle the "Long Race" (1M+ users) → Verify: Searching for "User #999" returns data in <200ms.
- [ ] **UI Polish (UX-PRO-MAX)**: Add row hover highlighting, skeleton loaders for data synchronization, and Lucid-based status icons → Verify: Aesthetic matches "Premium Fintech" standards.
- [ ] **Verification Strategy**: Run `tsc --noEmit` and perform a performance audit on the new SQL aggregation logic → Verify: No memory leaks or query bottlenecks.

## Done When
- [ ] A unified global leaderboard ranking users from #1 to the last user is operational.
- [ ] All four key enterprise metrics (Earnings, Team, Activity, Health) are displayed and sortable.
- [ ] The system handles pagination gracefully without crashing at high user counts.
