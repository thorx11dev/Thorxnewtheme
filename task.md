# Task: Enterprise Leaderboard Matrix (CRM-Pro)

- [x] **Phase 1: Backend SQL & Caching Architecture**
    - [x] Optimize `getLeaderboardInsights` with SQL-native aggregation → Verify: No memory filtering in Node.js.
    - [x] Implement **Hourly Caching** for global stats → Verify: Stats persist and refresh only every 60 mins.
    - [x] Add logic for **Health Ratio** and **Active Ratio** → Verify: Calculations match user behavior data.
- [x] **Phase 2: API & Pagination**
    - [x] Support server-side pagination in `/api/admin/leaderboard/insights` → Verify: Limits/Offsets work.
    - [x] Add `admin_config` support for result size → Verify: Dynamic page sizing.
- [x] **Phase 3: Frontend Multi-Tab Matrix**
    - [x] Implement **GLOBAL RANK** tab as default → Verify: Ranking from #1 to #N visible.
    - [x] Add **Low Health Badge** for unverified users in Top 10 → Verify: Visual warning appears.
    - [x] Implement **Skeleton Loaders** (UI-UX-PRO-MAX) → Verify: Smooth entry states.
- [x] **Phase 4: Operational Triage**
    - [x] Add **Multi-row selection** checkboxes → Verify: Multiple users can be selected.
    - [x] Create **User Inspector Sidepanel** → Verify: Drill-down shows user stats without leaving page.
- [x] **Phase 5: Verification & Polish**
    - [x] Run `tsc --noEmit` and performance audit → Verify: Zero errors.
    - [x] Final UI walkthrough → Verify: Matches Enterprise standards.
