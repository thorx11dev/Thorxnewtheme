---
name: Guild schema unique constraints
description: Raw SQL unique constraints in pgTable extras are NOT applied by drizzle-kit push when tables already exist — must use Drizzle's native unique() and apply manually on existing DBs.
---

## Rule
Never define multi-column unique constraints as `sql\`CONSTRAINT ... UNIQUE (...)\`` in a pgTable extras array. Drizzle's push skips raw SQL extras on already-existing tables, so the constraint never lands in Postgres, and any `onConflictDoNothing({ target: [...] })` or `onConflictDoUpdate({ target: [...] })` call will fail at runtime with:
> `error: there is no unique or exclusion constraint matching the ON CONFLICT specification (42P10)`

**Why:** drizzle-kit compares the live schema against the TS definition and applies ALTER TABLE diffs, but raw `sql\`...\`` extras in the table config are not parsed into the schema introspection — they're treated as opaque strings. If the table already exists, they're never re-executed.

**How to apply:**
1. Use Drizzle's native `unique("constraint_name").on(table.col1, table.col2)` in the extras array instead of raw SQL.
2. For tables that already existed without the constraint, apply it manually via `executeSql`:
   ```sql
   ALTER TABLE guild_weekly_cycles
     ADD CONSTRAINT guild_weekly_cycles_guild_week_unique UNIQUE (guild_id, week_start);
   ALTER TABLE guild_vault_ledger
     ADD CONSTRAINT guild_vault_ledger_bucket_unique UNIQUE (guild_id, user_id, week_start);
   ```

## Affected tables (fixed)
- `guild_weekly_cycles` — UNIQUE (guild_id, week_start)
- `guild_vault_ledger` — UNIQUE (guild_id, user_id, week_start)
