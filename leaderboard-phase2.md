# Leaderboard Administrative Hooks (Phase 2)

## Goal
Wire the administrative control buttons (Suspend Node, Adjust Balance, Force Cache Sync) to live backend endpoints by creating the necessary APIs and connecting the frontend mutations.

## Tasks
- [x] **Task 1: Build Backend Force-Sync API**
  - Add `POST /api/admin/leaderboard/force-sync` to `server/routes.ts`. This endpoint will trigger `storage.refreshLeaderboardCache()` explicitly to override the hourly cache.
  - **Verify:** A POST request to this endpoint triggers the cache generation and returns success.

- [x] **Task 2: Build Backend User Action API**
  - Add `POST /api/admin/users/:id/action` to `server/routes.ts`. Handlers should accept `{ action: "suspend" | "adjust_balance", payload: any }`.
  - Connect actions to DB (e.g., updating user `isActive` status or `availableBalance`).
  - **Verify:** Calling the endpoint updates the target user's database status.

- [x] **Task 3: Connect Frontend Force-Sync Button**
  - Replace `window.location.reload()` in `LeaderboardInsights`'s "Refresh Status" button with a `useMutation` that hits the new `force-sync` endpoint and invalidates the `"api/admin/leaderboard/insights"` query.
  - **Verify:** Clicking "Force Re-Sync" loads the latest cache safely without a hard page reload.

- [x] **Task 4: Connect UserInspectorPanel Buttons**
  - Add a `useMutation` inside `UserInspectorPanel` to hit the `/action` endpoint when "SUSPEND NODE (TERMINATE)" is clicked.
  - Wrap it in a confirmation dialog (or simply trigger toast and update).
  - **Verify:** Clicking "SUSPEND NODE" visibly runs the mutation and shows a success toast.

## Done When
- [x] Administrators can force a matrix cache sync without waiting an hour.
- [x] Administrators can suspend specific nodes directly from the Inspector Panel.
