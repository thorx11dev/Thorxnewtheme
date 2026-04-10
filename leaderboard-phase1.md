# Leaderboard Functional Fixes (Phase 1)

## Goal
Wire up the existing Search, Sort, and Pagination states in the `LeaderboardInsights` component so they actively control and filter the displayed data matrix.

## Tasks
- [x] **Task 1: Implement Client-Side Searching**
  - Modify `LeaderboardInsights.tsx`. Create a `useMemo` block that filters `insights.globalRanking` (or the active tab's array) against `searchTerm`, checking `firstName`, `lastName`, `email`, and `id`.
  - **Verify:** Typing in the search bar immediately filters the visible rows.

- [x] **Task 2: Implement Client-Side Sorting**
  - Inside the same `useMemo` block, apply a JavaScript `.sort()` based on `sortConfig.key` and `sortConfig.direction` after filtering. Handle both numeric and string values gracefully.
  - **Verify:** Clicking the `# Rank` or `Perf Index` columns correctly sorts the table ascending/descending.

- [x] **Task 3: Build Pagination Controls**
  - Add "Previous" and "Next" buttons below the `DataTable` in `LeaderboardInsights.tsx`.
  - Disable "Previous" on page 0. Block "Next" if the current data length is less than `pageSize`.
  - Bind these buttons to `setPage(page - 1)` and `setPage(page + 1)`.
  - **Verify:** Clicking "Next" loads the next database offset cleanly without breaking the UI.

## Done When
- [x] Search input accurately filters records.
- [x] Column headers trigger actual data sorting.
- [x] Users can paginate forward and backward cleanly through the dataset.
