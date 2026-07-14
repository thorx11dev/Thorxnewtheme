# THORX v3 Rebuild — Handoff Prompt

Paste the prompt below verbatim to your next Replit Agent session to continue this task.

---

## PROMPT TO PASTE

I'm continuing a large, in-progress rebuild of this app called "THORX v3", driven by a full spec document at `attached_assets/task_1784069232139.md` (2,701 lines). A previous agent session did real work on it but ran out of quota mid-task. Before writing a single line of code, do the following, in order:

### Step 1 — Investigate before trusting any summary
1. Read `attached_assets/task_1784069232139.md` in full (Parts A–L + Appendices A–B). This is the single source of truth for what "done correctly" means. Do not rely on paraphrased summaries (including this one) for anything you're about to implement or verify — always check the actual spec text and the actual current code/DB state side by side.
2. Read `.agents/memory/MEMORY.md` and, specifically, `.agents/memory/thorx-v3-rebuild.md` — durable lessons and exact current status from the prior session.
3. Independently verify the claimed "Phase 1 complete" status by comparing the live database schema and `shared/schema.ts` against spec Part D (D.1–D.12) column-by-column, and the 5 new modules (`server/modules/thorx-card.ts`, `ps-engine.ts`, `gps-engine.ts`, `live-feed.ts`, `server/middleware/rankGate.ts`) against spec Part E.1–E.5 line-by-line. Do NOT assume the prior session's self-report is accurate — the user explicitly caught real discrepancies last time (stale config defaults, a column type mismatch, a dropped column with a dangling reference) that only surfaced through a literal spec-vs-code diff, not a summary comparison. Repeat that same rigor now.
4. Confirm the app currently runs cleanly: check the `Start application` workflow status and restart it if needed; run `npx tsc --noEmit -p .` and confirm zero errors before you change anything, so you have a clean baseline.

### Step 2 — What is believed done (verify, don't assume)
**Phase 1 — Foundation (schema + isolated backend modules), claimed complete and user-audited:**
- New columns added to `users`, `guilds`, `guild_members`, `guild_weekly_cycles`, `weekly_tasks`, `score_history`, `rank_logs` (the last one extended with `target_type`/`guild_id_ref` to also log guild/GPS rank changes, which is NOT in the original spec table but was an intentional addition — verify it still makes sense given whatever `rank_logs` usage you find).
- 5 new tables: `user_transactions` (immutable exact-PKR ledger — real_pkr_value is WRITE-ONCE, never recompute), `referral_commissions`, `captain_messages`, `guild_weekly_snapshots`, `activity_feed`.
- 5 new backend modules per spec E.1–E.5: `thorx-card.ts`, `ps-engine.ts`, `gps-engine.ts`, `live-feed.ts`, `rankGate.ts`.
- `system_config` seeded with all new v3 keys (Part J), including a user-approved correction of 3 pre-existing keys to spec values: `CONVERSION_RATE=1000`, `MIN_PAYOUT=1000`, `REFERRAL_FEE_SHARE_PCT=30`.
- `guilds.last_rally_at` dropped (rally system removed per Appendix B); `POST /api/guilds/:id/rally` now returns 410; `storage.triggerCaptainRally` throws a clear retirement error. Full rally UI/route removal is still deferred to Phase 6 cleanup — check whether any frontend code still calls this endpoint and handle gracefully if so.
- `guilds.min_rank_required` migrated from single-letter (`'E'`) to full-tier text (`'E-Rank'`) format.
- 3 indexes rebuilt as partial indexes matching spec exactly (`idx_user_transactions_user_withdrawn`, `idx_user_transactions_withdrawal`, `idx_captain_messages_unread`).
- `users.last_streak_date` and `guild_weekly_snapshots.week_start` corrected to `date` type.

**Nothing beyond Phase 1 has been implemented.** `recordEarnEvent`, `processWithdrawal`, `createUser`, `checkAndUpdateRank` in `server/storage.ts` are all still the OLD pre-v3 implementations — they do not yet use the new engines, the Thorx Card, or `user_transactions`. No routes have been added/modified for v3 (Part E.9). No frontend work has been done (Parts F, G — rank tier renames, new UI, `client/src/lib/rankAvatars.ts` still uses old Urdu rank names). Nothing in Part H (realtime/background systems beyond what Phase 1 modules already stub) or Phase 6 cleanup has been touched.

### Step 3 — Continue the work: Phase 2 onward
Follow the spec's own Part K.3 six-phase order, picking up at **Phase 2 (Core backend rewrites)**:
- **Phase 2:** Full rewrite of `recordEarnEvent()` (spec E.6) and `processWithdrawal()`/`calculateWithdrawalBreakdown()` (spec E.7) in `server/storage.ts`, plus `createUser()` and `checkAndUpdateRank()` changes needed to support the new PS-based rank system. Read the CURRENT exact implementations of these functions yourself first (they are large; do not paraphrase-summarize them from a subagent report without independently confirming against the real file — a subagent hallucinated a stale/incorrect version of the `RANKS` array during the last session's Phase 2 prep, which was caught only by reading the file directly).
- **Phase 3:** New/modified routes (spec E.9), cron jobs (spec E.10), health engine fix (spec E.11).
- **Phase 4:** New frontend components (spec Part F/G).
- **Phase 5:** Frontend modifications — rank tier terminology (E/D/C/B/A/S-Rank replacing Nawa Aya/Chota Don/Bawa Ji/Haji Sab/Chacha Supreme everywhere user-facing), `rankAvatars.ts` rename, guild UI updates, admin Live Activity Feed UI, etc.
- **Phase 6:** Cleanup — remove the rally system fully (routes, UI, any remaining references), remove old multi-level (L2) referral commission code (`commission_logs` becomes frozen/read-only, new commissions go through `referral_commissions` only), remove daily-task withdrawal gate, apply the SHIMS from Appendix B (`GuildVaultPanel.tsx` → re-export `GuildMemberPanel`, `ScratchCardModal.tsx` → re-export `ThorxCard`).

### Step 4 — Standards to maintain throughout (non-negotiable)
1. **Read Appendix A (10 immutable invariants) before touching money math.** Most critical: `real_pkr_value` in `user_transactions` is write-once and is the sole basis for withdrawal math — NEVER derive withdrawal amounts from points × conversion rate. Referral commissions are strictly 1-tier. `balance_cash_pkr` must never go negative and must never be mixed with `txPointsBalance`. E-Rank is a hard floor — inactivity penalties can zero out PS but never demote below E-Rank. `rankLocked=true` freezes ALL automatic rank changes. Every admin balance/PS/GPS adjustment needs an `audit_logs` entry with a reason. "Vault"/"Locked Points" language is banned from user-facing text (internal variable/column names can keep "vault"-ish names if already established, but nothing shown to users).
2. **Verify against spec text, not memory.** Any time you're about to implement a function that has an exact reference implementation in the spec (E.6 recordEarnEvent, E.7 processWithdrawal, E.8 Sunday Guild Reset), read that section of the spec file directly before writing code — do not implement from a paraphrase, including this handoff document's paraphrase of it.
3. **`drizzle-kit push` fails in this environment** ("Interactive prompts require a TTY") whenever there's an ambiguous rename/new-table decision it wants to prompt for. Do not retry it repeatedly. Instead, hand-write the exact `ALTER TABLE`/`CREATE TABLE` DDL matching your `shared/schema.ts` change and apply it via the `executeSql` callback (database skill). Always update `shared/schema.ts` AND the live DB together, in the same step, so they never drift.
4. **Circular table references**: when a table needs a forward reference to a table defined later in `shared/schema.ts` (e.g. `users.guildId → guilds.id`), use `.references((): any => guilds.id, ...)` — the arrow-function form defers evaluation past module load.
5. **Hand-rolled `db.select({...})` column-list literals break at compile time** every time a new NOT NULL column is added to that table, if the return type is annotated against the full row interface. When you add columns to an existing table, grep for other `.select({` call sites projecting that table's columns and update them too — `npx tsc --noEmit -p .` will surface these; don't ignore any error.
6. **Test/verify at natural phase boundaries, not after every tiny edit.** Type-check after a batch of related schema/code changes, restart the `Start application` workflow, confirm clean logs, and only then move to the next phase. Don't restart/typecheck after every single file write — that wastes the user's time and money.
7. **Ask before consequential, hard-to-reverse decisions** — e.g. changing a `system_config` value that already has real data depending on it, dropping a column something still reads, or any change to real-money math defaults. The user caught exactly this kind of issue last session (stale config values silently kept because the bootstrap script only inserts missing keys) — always diff *values*, not just presence, when a spec redefines a default for something that already exists.
8. **Keep the user briefed at each phase boundary** with a concise, accurate status (what's actually verified vs. what's assumed), and update `.agents/memory/thorx-v3-rebuild.md` with anything durable you learn (new gotchas, decisions, deviations from spec and why) before ending your session — don't let this context evaporate for the next handoff.

### Step 5 — Immediate next action
Start Step 1 now: read the full spec, read the memory files, and do a real (not assumed) side-by-side audit of Phase 1 against spec Part D and E.1–E.5 to confirm the baseline before writing any Phase 2 code.

---

*(This file was generated by a prior agent session that hit its quota limit mid-task. Delete it once the next session has absorbed its contents into memory, or keep it as a static reference — your choice.)*
