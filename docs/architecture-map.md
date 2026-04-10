# THORX Architecture Map

## Runtime Layers
- `client/`: React SPA, feature-facing UI, route composition, query client.
- `server/`: Express API, auth/session middleware, domain routes, storage abstraction.
- `shared/`: schema and types shared between client/server contracts.
- `scripts/`: migration, parity, and operational automation.

## Backend Boundaries
- `server/config/`: runtime configuration and environment parsing.
- `server/modules/`: bounded operational modules (proxy and future domain modules).
- `server/insforge/`: Insforge-specific adapters for API/storage integration.
- `server/routes.ts`: route registry (remaining monolith to be split incrementally).
- `server/storage.ts`: data access and domain persistence methods.

## Frontend Feature Slices
- `client/src/features/auth/`: auth entry surface.
- `client/src/features/user-portal/`: user portal entry surface.
- `client/src/features/team-portal/`: team/admin entry surface.
- `client/src/features/legal/`: legal and policy page entry surface.
- `client/src/lib/`: API/query/auth provider utilities.

## Operational Flow
1. Browser requests frontend from `thorx.pro`.
2. Frontend calls API base (`VITE_API_URL`) for `/api/*`.
3. API enforces session and role permissions.
4. Storage layer persists data to Insforge-hosted Postgres.
5. Deployment and migration scripts validate release integrity.
