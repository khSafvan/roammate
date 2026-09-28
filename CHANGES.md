# CHANGES.md — Monorepo Architecture Refactor

Summary of changes, extractions, deletions, and operational assumptions for the `mojolog / roammate` migration.

---

## 1. What Moved

- **Pure Calculation & Model Logic -> `packages/core`**:
  - `routeEngine.ts`: Great-Circle geodesic distance, TSP heuristic, duration estimation, expense breakdown.
  - `expenseSettlement.ts`: Traveler balance calculations, greedy debt minimization.
  - `scheduleConflicts.ts`: Time-window transit conflict detection.
  - `timeWindowOptimizer.ts`: Meal window and operating hours optimization.
  - `time.ts`: Pure time string parsing (`parseTimeToMinutes`, `formatMinutesToTime`).
  - `gpx.ts`: RFC/Topografix GPX 1.1 XML generation.
  - `icalExport.ts`: RFC 5545 iCalendar serialization.
  - `routing.ts`: Multi-modal route assembly, corridor fallbacks, nautical fairway routes.
  - `countryIntelligence.ts`: Country emergency numbers, timezone, driving sides.
  - `airportDatabase.ts`: Static IATA airport lookup database.
  - Unit tests for all pure modules moved to `packages/core/tests/` (48 tests).

- **API Access Layer -> `packages/api-client`**:
  - Created standalone, typed `ApiClient` supporting Bearer token authorization, automatic headers, and typed wrappers for `/auth/*`, `/me`, `/sync/*`, and `/api/itinerary/*`.
  - Replaced all raw `fetch()` calls in `apps/web/src/auth/syncService.ts` with `apiClient`.

- **Offline Outbox & Synchronization -> `packages/sync`**:
  - Created storage-agnostic `SyncEngine`, `MemorySyncStorage`, and `LocalStorageSyncStorage`.
  - Enqueues mutation batches `{ id, entity, op, payload, clientTimestamp }` with mutation coalescing.
  - Performs two-phase push/pull sync.
  - Implements last-write-wins conflict resolution rule based on server timestamps.
  - Wired into `apps/web/src/auth/syncService.ts` on itinerary save and delete.

- **Authentication & Database Operations -> `apps/api`**:
  - Added Bearer JWT token issuance, refresh, and verification using `hono/jwt`.
  - Added routes: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /me`, `GET /sync/pull`, `POST /sync/push`.
  - Maintained `/api/*` endpoint aliases for backward compatibility.
  - Added `apps/api/migrations/0001_init.sql` and `apps/api/scripts/migrate.js` (`npm run db:migrate`).
  - Added configurable CORS origin restriction via `ALLOWED_ORIGINS` environment variable.

---

## 2. What Was Deleted

- **Deleted frontend local database**:
  - Removed local user credential store (`roammate_user_<userId>` keys in `localStorage`).
- **Deleted frontend local login & credential verification**:
  - Removed client-side password hash comparison fallback in `syncService.ts` (lines 76–85).
  - All credential checks now execute exclusively on the backend Worker; the frontend never verifies credentials locally.
- **Removed `@scure/bip39` dependency from `apps/web`**:
  - Removed `@scure/bip39` from `apps/web/package.json`.
  - Kept native Web Crypto SHA-256 pre-hashing in frontend (`crypto.subtle`) for zero-knowledge privacy.
- **Eliminated duplicate GPX generation functions**:
  - Removed duplicated copies of `generateDayGpx` and `formatGpxCoordinate` in `routeEngine.ts` in favor of dedicated `gpx.ts`.

---

## 3. Assumptions Made

1. **Token Format**: Standardized on HMAC-SHA256 (HS256) JWT bearer tokens with a 7-day expiration (`exp`), verified by `apps/api` using `JWT_SECRET`.
2. **Zero-Knowledge Password Pre-Hashing**: Kept client-side SHA-256 pre-hashing before sending credentials to `/auth/login` and `/auth/register`. The backend Worker never sees plaintext passwords and existing Turso user hashes remain 100% compatible.
3. **Workspace Tooling**: Maintained npm workspaces (which was configured in the repository) while adding full workspace-filtered test and deployment scripts.
4. **Offline & Guest Mode Policy**:
   - In Guest mode, all calculation features run directly from `@mojolog/core` without an account.
   - When signed in, the bearer token cached in `roammate_vault_session` preserves the session offline until expiration (`expiresAt`).
   - Mutations made offline are queued into `@mojolog/sync`'s outbox and flushed upon reconnection.
