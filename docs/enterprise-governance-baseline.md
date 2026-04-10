# THORX Enterprise Governance Baseline

## Purpose
This document defines the baseline, release safety controls, and rollback contract for enterprise refactoring and production hardening.

## Baseline Snapshot
- Type safety gate: `npm run check` must pass.
- Build gate: `npm run build` must pass.
- Deployment state: latest frontend deployment must be `READY`.
- Data integrity baseline: parity checks for core business tables must match expected source counts.

## Branch and Release Strategy
- Use phase-scoped branches for each execution phase.
- Keep changes small and auditable.
- Require quality gate pass before merging to protected branch.
- Maintain deployment notes per phase.

## Non-negotiable Gates
- No secrets committed to tracked files.
- No silent changes in API behavior.
- Preserve auth/session, payout, admin, and user portal critical paths.
- Every phase must end in a rollback-ready state.

## Rollback Contract
- Preserve previous deployment URL and environment set before each rollout.
- Rollback order:
  1. Revert deployment target.
  2. Revert runtime environment values.
  3. Re-run smoke checks.
- Rollback success criteria:
  - Critical routes respond as expected.
  - Authentication/session flow works.
  - Financial and admin paths recover to baseline behavior.

## Critical Smoke Suite
- Auth: register, login, logout, session persistence.
- User: dashboard load, referral stats, withdrawal request.
- Admin: team portal access, payout queue fetch, action endpoints.
- API: `/api/user`, `/api/stats`, and provider-specific health checks.
