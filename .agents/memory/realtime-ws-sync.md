---
name: Realtime WebSocket sync
description: How the app's WS real-time layer authenticates and scopes cross-user broadcasts; read before touching server/realtime.ts or adding new admin mutations that should propagate live.
---

## Auth
The WS server (`server/realtime.ts`) attaches to the existing `httpServer`'s `upgrade` event, filtered to `req.url === "/ws"` so it doesn't collide with Vite's own HMR websocket on the same port. It authenticates by re-running the app's existing `express-session` middleware (passed in from `server/routes.ts`) against the upgrade request to read `session.userId`/`session.user.role` from the `thorx.sid` cookie — no separate token scheme.

## Broadcast scoping
Two broadcast helpers exist: `broadcastUserUpdated(userId, reason)` (targets that user's own sockets + team/admin sockets) and `broadcastTeamRefresh(reason)` (team/admin sockets only).

**Why:** an earlier version scoped "team/admin sockets" by role alone (`role === 'team' || 'admin' || 'founder'`), which let a `team`-role member with zero permission grants (no `users`/`dashboard` section access) receive every other user's balance/rank/status mutation events — a data-visibility leak, since regular UI routes already gate this via `requirePermission("VIEW_USERS")`.

**How to apply:** cross-user fanout must mirror the same permission check the REST routes use (`requirePermission`'s section-map: `users`/`dashboard` sections or explicit `VIEW_USERS`/`MANAGE_USERS`), not just role. This is computed once per socket at connect time via `storage.getTeamKeysByUser`, cached in `SocketMeta.canSeeUserActivity` — if a team member's permissions are revoked while connected, they keep receiving events until they reconnect (existing accepted gap, not yet a real issue since permission edits also fire `broadcastTeamRefresh` which nudges most active admin UIs to refetch anyway).

## Client side
`client/src/hooks/useRealtimeSync.ts` opens one socket per authenticated session, reconnects with 3s backoff, and invalidates a fixed list of TanStack Query keys — "own data" keys on `user:updated` matching own id, "team" prefixes on either event type. Mounted once in `App.tsx`'s `Router()`.

## Route audit checklist
Any new admin endpoint that mutates a user's balance/rank/status/role/permissions should call `broadcastUserUpdated`/`broadcastTeamRefresh` after the mutation — it's easy to add a new mutation route and forget this, since nothing fails loudly, the UI just stays stale until manual refresh.
