---
name: Profile Modal Save Fix
description: Root causes of profile changes not persisting — query key mismatch, wrong response shape, missing fields from GET/PATCH responses.
---

## The bugs (all in one cluster)

1. **Wrong React Query key** — `profile-modal.tsx` used `["auth"]` but `useAuth.ts` caches data under `["session-auth"]`. Optimistic update and `setQueryData` on success were writing to a dead key.

2. **`onSuccess` wrote wrong shape** — server PATCH `/api/profile` returns `{ message, user }`. The modal was doing `setQueryData(["auth"], updatedUser)` (the full envelope), not `updatedUser.user`.

3. **GET `/api/profile` missing fields** — response did not include `rank`, `avatar`, `profilePicture`, or computed `name`. Every cache refetch after save stripped those fields from the UI.

4. **Optimistic `profilePicture` used `??`** — `??` treats `null` as fallback, so clearing a custom photo optimistically kept the old photo visible. Fixed with `hasOwnProperty` check.

## Fixes applied
- `profile-modal.tsx`: use `["session-auth"]` everywhere; extract `response.user` in `onSuccess`; split name → firstName/lastName in optimistic update; `hasOwnProperty` for profilePicture null.
- `server/routes.ts` GET `/api/profile`: added `name`, `rank`, `avatar`, `profilePicture` to response.
- `server/routes.ts` PATCH `/api/profile`: added `name`, `rank` to the `user` object in response.

**Why:** `useAuth` and the modal were independently managing the same cache entry but under different keys, so saves never reflected until a hard page refetch. GET omitting `rank`/`avatar` meant every background refetch undid visible state.

**How to apply:** Any future endpoint that feeds `["session-auth"]` must return: `id, firstName, lastName, name, email, identity, phone, referralCode, totalEarnings, availableBalance, isActive, createdAt, role, rank, avatar, profilePicture`.
