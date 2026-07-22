---
name: THORX Remediation Plan Final Status
description: Complete implementation status of all 27 findings from the 2026-07-22 forensic audit (R-01 through R-27).
---

# THORX Remediation Plan — Final Status

All 27 remediation items from the 2026-07-22 audit are now COMPLETE.

## Sprint 1 (R-01 to R-07, R-22, R-27) — ALL DONE
All previously implemented by prior agents.

## Sprint 2 (R-08 to R-16, R-21, R-23, R-24) — ALL DONE
All previously implemented by prior agents.

## Sprint 3 (R-17 to R-20, R-25, R-26) — ALL DONE
- **R-17**: AD_INVENTORY moved to systemConfig (AD_INVENTORY_JSON). Module-level cache with 60s TTL in routes.ts (`getAdInventory()`). Admin CRUD routes at GET/PATCH `/api/admin/ad-inventory` guarded by `requirePermission("MANAGE_ENGINE_CONFIG")`.
- **R-18**: bootstrapConfig batch upsert — already done prior sprint.
- **R-19**: Device fingerprint hardening — accepted as best-effort per audit disposition.
- **R-20**: Bulk exports (withdrawals/export, users/export) now stream in 500-row batches. No 10K row memory spike.
- **R-25**: getAllUsers default capped to 100, hard cap at 200 with warn log. Prefer getUsersPaginated().
- **R-26**: Guild isPublic in CaptainPortal — done in prior sprint.

## Frontend Decimal fixes (R-09, R-12)
- **PayoutControl.tsx**: All financial display uses `new Decimal()` — ledger breakdown, list amounts, detail panel.
- **UserManager.tsx**: Available balance and lifetime earnings display use `new Decimal()`.

**Why:** These prevent IEEE 754 float drift between the displayed amounts and the stored ledger values.

## Key patterns established
- Ad inventory cache: bust `_adInventoryCache = null` after any admin PATCH to inventory.
- Streaming exports: batch size 500, break on `batch.length < BATCH` OR when `ids` filter is used (selective export).
- getAllUsers: all new callers must use getUsersPaginated() instead.
