# THORX Repository Standards

## Source of Truth
- Runtime source code lives in `client/`, `server/`, and `shared/`.
- Operational scripts live in `scripts/`.
- Architecture and runbooks live in `docs/`.

## File Hygiene
- Keep secrets only in local environment files (`.env`, `.env.local`) and secret managers.
- `.env.example` must contain placeholders only.
- Remove one-off local debug artifacts from repository root.
- Keep generated outputs (`dist/`) out of source edits unless explicitly needed for deployment.

## Structure and Naming
- Group backend code by bounded context (auth, user, payouts, admin, tasks, ads, infra).
- Keep validation and transport concerns separated from business logic.
- Keep frontend code feature-sliced: auth, user portal, team/admin, ads, shared.

## Quality Gates
- `npm run check` required for every merge.
- `npm run build` required for release branches.
- New scripts must be idempotent and documented in `docs/`.

## Change Discipline
- Prefer code moves and wrappers before deep rewrites.
- Introduce compatibility layers when changing interfaces.
- Keep each pull request focused on one concern.
