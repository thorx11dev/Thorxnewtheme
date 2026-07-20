---
name: Query Key Registry
description: Canonical TanStack Query key source; all keys must come from QUERY_KEYS in queryKeys.ts — mixing string vs array formats causes silent cache misses after mutations.
---

# Query Key Registry

## The rule
All TanStack Query keys in THORX must come from `client/src/lib/queryKeys.ts → QUERY_KEYS`.

**Why:** Finding 1-Q in Audit V2 — mixing `["earnings"]` (array) with `["/api/earnings"]` (path-string array) caused invalidateQueries to miss its target, leaving stale UI after mutations.

**How to apply:** Any new query or mutation must import `QUERY_KEYS` and use the appropriate key. Dynamic keys (guild-scoped) are factory functions: `QUERY_KEYS.guildMessages(guildId)`.

## Structure
- Static keys: `as const` arrays, e.g. `user: ["/api/user"] as const`
- Dynamic keys: factory fns, e.g. `guildMessages: (id) => ["/api/guilds", id, "messages"] as const`
- Invalidating a parent (e.g. `QUERY_KEYS.guilds`) also invalidates all children via prefix matching
