# MIGRATION_AUDIT.md — mojolog / roammate

**Step 0 audit — do not change anything yet.**
Written: 2026-09-28

---

## 1. Folder Tree (abridged, no node_modules/dist)

```
mojolog/
├── apps/
│   ├── api/
│   │   ├── src/index.ts          ← Hono Worker (single file, 423 lines)
│   │   ├── schema.sql            ← Turso schema (users + itineraries)
│   │   ├── wrangler.toml         ← Worker config (no [vars] populated)
│   │   ├── .dev.vars.sample      ← TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
│   │   └── package.json          ← @libsql/client, @scure/bip39, hono
│   └── web/
│       ├── src/
│       │   ├── auth/
│       │   │   ├── crypto.ts     ← BIP-39, SHA-256, session CRUD
│       │   │   └── syncService.ts← API calls + localStorage persistence
│       │   ├── hooks/
│       │   │   └── useVault.ts   ← Auth state + trip storage hook
│       │   ├── components/auth/  ← Login/register UI components
│       │   ├── config/constants.ts← STORAGE_KEYS, RETENTION_POLICY, AUTH_CONFIG
│       │   ├── types/trip.ts     ← Trip model (duplicates packages/shared/types.ts)
│       │   └── utils/            ← routeEngine, expenseSettlement, weatherService…
│       ├── .env.sample           ← VITE_API_URL, VITE_MAP_STYLE_URL, VITE_OSRM_ROUTER_URL
│       ├── vite.config (implicit from vite dep)
│       └── package.json          ← NO DB driver; @scure/bip39 present
├── packages/
│   └── shared/
│       ├── src/types.ts          ← Shared Trip, VaultSession, SyncResult types
│       ├── src/constants.ts      ← STORAGE_KEYS, RETENTION_POLICY, AUTH_CONFIG, MAP_CONFIG
│       └── package.json          ← No deps, exports src directly (no build step)
├── package.json                  ← npm workspaces (apps/*, packages/*)
├── netlify.toml                  ← builds apps/web → dist (Netlify)
└── .env.sample                   ← Root-level env combining web + api vars (mixed concern)
```

---

## 2. Wrangler / Config Files

| File | Purpose |
|------|---------|
| `apps/api/wrangler.toml` | Single Worker config; empty `[vars]` section; TURSO_AUTH_TOKEN managed via `wrangler secret put` |
| No wrangler for web | Frontend is a Vite SPA, already static build |

**No SSR on Workers for the frontend.** The web app is already a static Vite/React SPA — no server-side rendering conversion needed.

---

## 3. Package Manager

Currently **npm workspaces** (root `package.json` has `"workspaces": ["apps/*", "packages/*"]`). Migration target is pnpm workspaces — a drop-in swap of `package-lock.json` → `pnpm-lock.yaml` + `pnpm-workspace.yaml`.

---

## 4. DB Driver Imports

| Location | Import | Notes |
|----------|--------|-------|
| `apps/api/src/index.ts:3` | `@libsql/client/web` | ✅ Correct — only in Worker |
| `apps/web/` | ❌ None | Web has NO libSQL/SQLite/WASM driver |
| `apps/web/package.json` | ❌ None | No DB dependency in frontend deps |

**Finding:** No local database in the frontend. The "local database" concern is actually localStorage + the `roammate_user_*` / `roammate_trip_*` key pattern — not a real DB driver. This simplifies migration.

---

## 5. Password / Session / Auth Checks in the Frontend

### `apps/web/src/auth/crypto.ts`
- `generateVaultPhrase()` — generates BIP-39 mnemonic **client-side** (used for legacy account creation)
- `validateVaultPhrase()` — validates BIP-39 phrase client-side
- `hashCredentials(uuid, password)` — derives password hash via `crypto.subtle.digest('SHA-256')` **before** sending to the API
- `hashPhrase(phrase)` — SHA-256 of mnemonic to derive userId
- `saveVaultSession()` / `getVaultSession()` — stores `{userId, createdAt, lastAccessedAt}` in localStorage
- `pruneInactiveLocalData()` — enforces 90-day inactivity rule **locally** in localStorage
- `deleteLocalAccount()` — wipes localStorage entries for a user

### `apps/web/src/auth/syncService.ts`
- `loginAccountOnEdge()` — when `API_BASE_URL` is blank, **checks localStorage password hash locally** (lines 76–85). This is the local credential check to remove.
- `registerAccountOnEdge()` — when `API_BASE_URL` is blank, writes user record to localStorage
- All other functions: API calls with localStorage fallback (correct offline behavior)

### `apps/web/src/components/auth/`
- `AuthModal.tsx`, `AuthLandingPage.tsx` — call `hashCredentials()` then `registerAccountOnEdge()` / `loginAccountOnEdge()`
- No token handling; session = `{userId}` stored in localStorage, not a JWT

### `apps/web/src/hooks/useVault.ts`
- Reads `getVaultSession()` on mount
- Orchestrates trips load, edge sync, account lifecycle

**Summary of what must move/change in the frontend:**
1. **Remove** `crypto.ts` BIP-39 generation/validation (move to API or drop legacy path)
2. **Remove** local password check in `syncService.ts:76–85`
3. **Replace** `{userId}` session with `{token: string, userId: string, expiresAt: number}` from API
4. **Keep** `crypto.subtle` hash for pre-hashing before sending to API (zero-knowledge design) — or move to server-side bcrypt/argon2 if preferred

---

## 6. Local User Table / localStorage Schema

No SQL table in the frontend. The "local user table" is:

```
localStorage keys:
  roammate_vault_session      ← {userId, accountTag, createdAt, lastAccessedAt}
  roammate_user_<userId>      ← {userId, passwordHash, createdAt, lastAccessedAt}
  roammate_trip_<tripId>      ← Trip JSON blob
  roammate_active_trip_id     ← string
```

`roammate_user_*` keys are written by `registerAccountOnEdge()` and `loginAccountOnEdge()` in offline mode, and by `deleteLocalAccount()`. These are the "local credential store" to remove.

---

## 7. Frontend Framework & SSR

- **Framework:** React 18 + Vite (SPA)
- **SSR:** ❌ None. Already a static SPA. No conversion needed.
- **Deployment:** Currently Netlify (netlify.toml) or self-hosted. Target: Cloudflare Pages.
- **PWA:** Service worker at `apps/web/public/sw.js` — must be preserved.

---

## 8. Current API Routes (`apps/api/src/index.ts`)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | None | UUID or mnemonic→hash; upserts user row |
| POST | `/api/auth/login` | SHA-256 hash | Verifies stored hash, touches `last_accessed_at` |
| DELETE | `/api/auth/account` | hash or phrase | Deletes user + itineraries |
| POST | `/api/itinerary` | userId in body | Upserts itinerary JSON |
| DELETE | `/api/itinerary/:id` | userId in body | Deletes single itinerary |
| GET | `/api/itineraries/:userId` | userId in path | Fetches all user trips |
| GET | `/api/share/:token` | guestKey in query | Read-only shared trip access |
| POST | `/api/maintenance/prune` | None | Manual retention cleanup |

**Missing for target architecture:**
- No bearer token issuance (login returns `{userId}`, not a JWT/token)
- No `GET /me` route
- No `GET /sync/pull?since=` or `POST /sync/push` routes
- CORS is `cors()` with no origin restrictions

---

## 9. Secret / Env Var Inventory

| Var | Where | How set |
|-----|-------|---------|
| `TURSO_DATABASE_URL` | `apps/api/.dev.vars` | `wrangler dev` local |
| `TURSO_AUTH_TOKEN` | Worker secret | `wrangler secret put` |
| `VITE_API_URL` | `apps/web/.env` | Build-time env var (already correct) |
| `VITE_MAP_STYLE_URL` | `apps/web/.env` | Build-time |
| `VITE_OSRM_ROUTER_URL` | `apps/web/.env` | Build-time |

**Root `.env.sample` mixes frontend and API vars** — should be split into `apps/web/.env.example` and `apps/api/.dev.vars.example`.

**Missing secrets for target:**
- `JWT_SECRET` (or similar) for signing bearer tokens in the Worker

---

## 10. Pure Calculation Code (candidates for `packages/core`)

These files in `apps/web/src/utils/` have **zero I/O, no fetch, no DOM** — pure functions, directly extractable:

| File | Content |
|------|---------|
| `routeEngine.ts` | Route optimization (Haversine, TSP heuristic) |
| `expenseSettlement.ts` | Debt settlement calculation |
| `scheduleConflicts.ts` | Time-window conflict detection |
| `timeWindowOptimizer.ts` | Opening-hours optimizer |
| `gpx.ts` | GPX export serialization |
| `icalExport.ts` | iCal export serialization |
| `routing.ts` | Transit leg calculation |
| `countryIntelligence.ts` | Country/timezone helpers |
| `airportDatabase.ts` | Static airport data |

These have existing tests in `apps/web/tests/` — tests move with the code.

**Partially pure (have fetch calls — keep in web or split):**
| File | Concern |
|------|---------|
| `weatherService.ts` | Fetches Open-Meteo API |
| `currencyService.ts` | Fetches exchange rates |
| `holidayService.ts` | Fetches holiday API |

---

## 11. What Does NOT Exist Yet (must be created)

- `packages/core` — pure logic package
- `packages/api-client` — typed fetch wrapper for the API
- `packages/sync` — outbox + push/pull engine
- Bearer token auth in `apps/api` (currently issues `{userId}` only)
- `POST /auth/refresh`, `GET /me`, `GET /sync/pull`, `POST /sync/push` routes
- `apps/api/migrations/` folder (schema currently in `schema.sql` + inline `ensureTables()`)
- `pnpm-workspace.yaml` (currently npm workspaces)
- `.github/workflows/` CI with path filters
- `apps/web/wrangler.toml` for Cloudflare Pages deploy (currently Netlify)

---

## 12. Migration Blockers / Decisions Needed

> None of these require user input per the task spec — defaults are listed.

| Item | Decision | Default assumed |
|------|----------|----------------|
| Auth token format | JWT vs opaque token | **JWT** (stateless, mobile-friendly, no DB lookup on every request) |
| Password hashing | Keep client-side SHA-256 (zero-knowledge) vs server-side bcrypt | **Keep client-side SHA-256 pre-hash**, server stores the hash — preserves zero-knowledge design and existing Turso data compatibility |
| Legacy mnemonic support | Keep or drop BIP-39 12-word phrases | **Keep as login path** in API (existing users have mnemonic-derived IDs); remove mnemonic *generation* from frontend |
| Existing Turso data | Schema compatible? | **Yes** — adding `token_hash` + `expires_at` to users table is additive; no breaking migration |
| Package manager | npm → pnpm | **pnpm** (monorepo-friendlier) |
| CI | GitHub Actions | **Yes**, path filters per app |

---

## 13. Migration Plan (ordered steps)

### Step 1 — Extract `packages/core`
Move all pure-logic utils from `apps/web/src/utils/` to `packages/core/src/`. Move their tests. `apps/web` imports from `@mojolog/core`.

**Files moving:** `routeEngine.ts`, `expenseSettlement.ts`, `scheduleConflicts.ts`, `timeWindowOptimizer.ts`, `gpx.ts`, `icalExport.ts`, `routing.ts`, `countryIntelligence.ts`, `airportDatabase.ts` + their tests.

**Stay in web:** `weatherService.ts`, `currencyService.ts`, `holidayService.ts` (have fetch); `exportImport.ts` (browser File API).

### Step 2 — Create `packages/api-client`
Typed fetch wrapper around all API routes. `apps/web` replaces direct `fetch()` calls in `syncService.ts` with `api-client` calls. No logic change yet.

### Step 3 — Add bearer tokens to `apps/api`; remove local auth from `apps/web`
- API: add `JWT_SECRET` Worker secret, issue JWT on login/register, add `/auth/refresh` + `/me`
- Web: remove `roammate_user_*` localStorage writes, remove local password check, replace `{userId}` session with `{token, userId, expiresAt}`
- Remove `@scure/bip39` from web deps (mnemonic generation moved to API or dropped from UI)
- Keep SHA-256 pre-hash in web (small, no dep, zero-knowledge)

### Step 4 — Create `packages/sync`; wire offline outbox into web
Outbox in IndexedDB (or localStorage fallback). Push/pull endpoints added to API. Frontend queues mutations when offline, drains on reconnect.

### Step 5 — Deploy config + env split
- `apps/web/wrangler.toml` for Cloudflare Pages
- `apps/api/.dev.vars.example` / `apps/web/.env.example`
- Split root `.env.sample` into per-app files
- `deploy:web` + `deploy:api` scripts
- GitHub Actions with path filters

### Step 6 — README.md
Local dev, env vars, secrets, migrations, deploy.

---

## 14. Risk Register

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Existing users have `roammate_user_*` localStorage entries | Low | App reads session, ignores user record on login if API returns valid token |
| Mnemonic-derived userIds in Turso | Low | API accepts both UUID and mnemonic hash; no schema change |
| `ensureTables()` inline migration vs proper `migrations/` | Medium | Extract to `migrations/001_initial.sql`, deprecate inline migration |
| CORS `cors()` wildcard | Medium | Add `ALLOWED_ORIGINS` env var, restrict in Step 5 |
| `packages/shared/src/types.ts` duplicated in `apps/web/src/types/trip.ts` | Low | Merge: web imports from `@mojolog/shared`; delete `apps/web/src/types/trip.ts` |

---

*Audit complete. No files changed. Proceed with Step 1.*
