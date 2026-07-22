# THORX — Deployment Checklist
**Version:** 1.0 — 2026-07-22  
**Applies to:** Every fresh DB provisioning (`drizzle-kit push`) and production deploy.

---

## Pre-Deploy: Environment Variables

Confirm all required secrets are set before starting the server. Missing vars trigger a fatal startup error.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ Fatal | Auto-injected by Replit managed PostgreSQL. |
| `SESSION_SECRET` | ✅ Fatal | Generate: `openssl rand -hex 32` |
| `CREDENTIAL_ENCRYPTION_KEY` | ✅ Fatal in prod | Generate: `openssl rand -hex 32`. Falls back to insecure default in dev only. |
| `BOOTSTRAP_SECRET` | ⚠️ Warn in prod | Protects `/api/bootstrap-founder`. Set before first deploy. |
| `SENTRY_DSN` | ⚠️ Warn in prod | Sentry disabled (silently) if absent. |
| `OPENAI_API_KEY` | Optional | Required for AI chatbot feature. |

---

## Step 1: Install Dependencies

```bash
npm install
```

---

## Step 2: Apply Schema Migrations

```bash
npx drizzle-kit push --force
```

> If this fails with a TTY-prompt error (fresh DB only): a leftover `session` table can confuse drizzle-kit. Drop it and retry:
> ```sql
> DROP TABLE IF EXISTS session;
> ```
> Then rerun `npx drizzle-kit push --force`.

---

## Step 3: Apply Critical Raw-SQL Indexes (POST EVERY DB REBUILD)

**⚠️ CRITICAL:** These two partial unique indexes are NOT in the Drizzle schema DSL and will NOT be created by `drizzle-kit push`. They must be applied manually after every fresh database provisioning.

```sql
-- Prevents double-earn: blocks two earn events with the same source_id+source_type
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_transactions_source
  ON user_transactions (source_id, source_type)
  WHERE source_id IS NOT NULL;

-- Prevents double-withdrawal: one pending withdrawal per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS uniq_withdrawals_one_pending_per_user
  ON withdrawals (user_id)
  WHERE status = 'pending';
```

The migration file `migrations/0006_critical_partial_indexes.sql` contains these statements.  
Run via psql or your DB admin tool. Verify with:

```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('user_transactions', 'withdrawals')
  AND indexname IN ('uniq_user_transactions_source', 'uniq_withdrawals_one_pending_per_user');
```

Expected: 2 rows. If 0 rows — **do not go live**. Double-earn and double-withdrawal guards are absent.

---

## Step 4: Provision Founder Account (First Deploy Only)

```bash
FOUNDER_EMAIL=thorx11dev@gmail.com FOUNDER_PASSWORD=<password> node scripts/provision-founder.mjs
```

Or via the API (requires a CSRF cookie):

```bash
# 1. Get CSRF cookie
curl -c /tmp/cookies.txt https://<domain>/api/health

# 2. Bootstrap (replace <csrf> with the thorx.csrf.v2 cookie value)
curl -b /tmp/cookies.txt -X POST https://<domain>/api/bootstrap-founder \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <csrf>" \
  -d '{"firstName":"Thorx","lastName":"X","email":"thorx11dev@gmail.com","password":"<password>"}'
```

This endpoint is blocked after the first call (returns 409 if any team member exists).

---

## Step 5: Start the Server

```bash
# Development
npm run dev

# Production
npm run build && npm run start
```

Verify health:
```bash
curl https://<domain>/api/health
# Expected: {"status":"healthy","db":"connected",...}
```

---

## Step 6: Post-Deploy Verification

| Check | Command / Action | Expected |
|---|---|---|
| DB connected | `/api/health` | `"db":"connected"` |
| Session auth | `POST /api/login` | 200 with role |
| Founder access | `GET /api/admin/config` (as founder) | 200 with config array |
| Partial indexes | SQL query in Step 3 | 2 rows |
| Sentry | Check Sentry dashboard | Events flowing (if DSN set) |

---

## Rollback Notes

- All schema migrations are forward-only. No rollback scripts exist.
- To roll back data changes, restore from the Replit database checkpoint.
- If a deployment is breaking: revert code, run `npm run build`, restart.

---

*M-09: This checklist is the authoritative post-deploy runbook. Update it when new raw-SQL steps or env vars are added.*
