---
name: THORX v3 rebuild (PS/GPS rank system)
description: In-progress full rebuild per a 2700-line spec — rank system, engines, guild reset, Thorx Card. Read before touching rank/guild/earn/withdrawal code.
---

## Status
Phase 1 (schema + isolated backend modules) complete: new columns on users/guilds/guild_members/guild_weekly_cycles/weekly_tasks/score_history/rank_logs, 5 new tables (user_transactions, referral_commissions, captain_messages, guild_weekly_snapshots, activity_feed), and 5 new modules (`server/modules/thorx-card.ts`, `ps-engine.ts`, `gps-engine.ts`, `live-feed.ts`, `server/middleware/rankGate.ts`).

Not yet done: Phase 2 (rewrite `recordEarnEvent`/`processWithdrawal`/`createUser` in storage.ts to actually use the new engines), Phase 3 (routes), Phase 4-5 (frontend — rank tier terminology E/D/C/B/A/S-Rank replacing old Urdu names, rankAvatars.ts rename), Phase 6 (cleanup — remove rally system, old guild-vault-resolution.ts job, L2 referrals).

## Key gotchas hit during Phase 1
- `drizzle-kit push` fails with "Interactive prompts require a TTY" in this environment whenever it detects an ambiguous rename/new-table — non-interactive shell can't answer the prompt. Workaround: write the ALTER TABLE/CREATE TABLE DDL by hand (matching schema.ts exactly) and apply via `executeSql`, skip drizzle-kit push entirely for additive changes.
- Circular table references (e.g. `users.guildId` → `guilds.id`, where `guilds` is defined later in the file): use `.references((): any => guilds.id, ...)` — the arrow-function form defers evaluation past module load, so forward references between pgTable consts work.
- Manual `db.select({...})` column-list literals typed against the full `User`/`GuildMember` interface break at compile time every time a new NOT NULL column is added to that table — must add the new columns to every hand-rolled select projection, not just `db.select()` (which auto-includes everything).
- rank_logs table only had a `userId` FK; extended it with `targetType` ('user'|'guild') + `guildId` columns to also log GPS/guild rank changes through the same audit table.
