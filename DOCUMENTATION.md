# 🛠️ Roammate — Developer Documentation

Developer reference for architecture, packages, API endpoints, synchronization, and local development.

---

## 1. Monorepo Structure

```
├── apps/
│   ├── web/               # React 18 + Vite + TypeScript static SPA (Cloudflare Pages)
│   └── api/               # Cloudflare Worker (Hono): auth + outbox sync only (Turso libSQL)
└── packages/
    ├── core/              # Pure business logic: route engine, TSP, GPX, iCal, time, expenses
    ├── api-client/        # Reusable typed HTTP client for web and external clients (e.g. mobile app)
    ├── sync/              # Storage-agnostic offline outbox & push/pull sync engine
    └── shared/            # Shared TypeScript models and configuration constants
```

### Dependency Boundaries

- `packages/core`: Pure TypeScript. Zero I/O, zero network, zero DOM/window, zero database drivers.
- `packages/api-client`: Pure fetch wrapper using `@roammate/shared` types.
- `packages/sync`: Storage-agnostic outbox and push/pull sync engine. Depends only on `@roammate/api-client` and `@roammate/shared`.
- `apps/api`: Only module that communicates directly with Turso libSQL or signs/verifies JWT tokens.
- `apps/web`: Pure static frontend. Contains zero database drivers and zero credential checks. Calls API exclusively through `@roammate/api-client` and `@roammate/sync`.

---

## 2. Local Development

### 1. Install Workspace Dependencies

```bash
npm install
```

### 2. Configure Environment Files

```bash
# Frontend environment
cp apps/web/.env.example apps/web/.env

# API Worker local development secrets
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

### 3. Run Web & API Together

```bash
npm run dev:all
```
- Frontend: `http://localhost:5173` (or configured Vite port)
- API Worker: `http://localhost:8787`

Or run separately:
```bash
npm run dev         # Frontend only
npm run dev:api     # Backend Worker only
```

---

## 3. Backend API Reference (`apps/api`)

Base URL: `http://localhost:8787` (dev) or `https://mojolog-api.<account>.workers.dev` (prod).

All requests and responses use JSON. Authenticated endpoints require `Authorization: Bearer <token>`.

### Authentication
- `POST /auth/register` — Register a new account UUID + client-side password hash. Issues 7-day Bearer JWT.
- `POST /auth/login` — Authenticate credentials. Issues fresh Bearer JWT.
- `POST /auth/refresh` — Refresh an active JWT.
- `GET /me` — Returns current authenticated user metadata and touches activity timestamp.
- `DELETE /auth/account` — Permanently purges user account and all itineraries from Turso.

### Sync & Itineraries
- `GET /sync/pull?since=<timestamp>` — Pulls all itineraries modified after `since`. Returns `{ serverTimestamp, records: [...] }`.
- `POST /sync/push` — Pushes an array of outbox mutations `{ mutations: [{ id, entity, op, payload, clientTimestamp }] }`. Applies with server timestamp.
- `POST /api/itinerary` — Direct itinerary save (touches activity).
- `DELETE /api/itinerary/:id` — Delete a single itinerary.
- `GET /api/itineraries/:userId` — Fetch all itineraries owned by user.
- `GET /share/:token` — Read-only shared trip access via secret guest key or share token.

---

## 4. Offline Outbox & Sync Engine (`packages/sync`)

### How Sync Works

1. **Local Changes**: Whenever an itinerary is created, edited, or deleted in the frontend, it is written immediately to local storage cache (`STORAGE_KEYS.TRIP_PREFIX`) and enqueued to the outbox via `syncEngine.enqueue('trip', 'upsert' | 'delete', data)`.
2. **Coalescing**: If multiple mutations for the same trip occur before syncing, the outbox replaces earlier pending mutations for that ID.
3. **Push Phase**: When online, `syncEngine.sync()` sends pending mutations to `POST /sync/push`. On success, pushed items are removed from the outbox.
4. **Pull Phase**: Fetches updates from `GET /sync/pull?since=<lastSyncTimestamp>`.
5. **Conflict Resolution**: Last-write-wins per record using server timestamps:
   - Server timestamp $\ge$ client timestamp $\rightarrow$ server record wins.
   - Client timestamp $>$ server timestamp $\rightarrow$ client record wins.

---

## 5. Pure Logic Modules (`packages/core`)

All geospatial, planning, and mathematical routines reside in `packages/core/src`:

| Module | Description |
|---|---|
| `routeEngine.ts` | Great-Circle distance, duration estimation, 2-opt TSP route optimization |
| `timeWindowOptimizer.ts` | Route optimization adhering to meal windows (lunch/dinner) & opening hours |
| `time.ts` | Time conversion utilities (`parseTimeToMinutes`, `formatMinutesToTime`) |
| `scheduleConflicts.ts` | Detects overlaps and travel time violations between sequential stops |
| `expenseSettlement.ts` | Traveler balance calculations and greedy Settle Up debt minimization |
| `gpx.ts` | RFC/Topografix GPX 1.1 XML generation for GPS tracklogs |
| `icalExport.ts` | RFC 5545 iCalendar (`.ics`) serialization for flights, stops, and activities |
| `routing.ts` | Multi-modal GeoJSON route assembly (roads, ferry fairways, geodesic flight arcs) |
| `countryIntelligence.ts` | Country emergency numbers (112, 911), electrical plugs, driving sides |
| `airportDatabase.ts` | Static IATA airport registry for instant flight route resolution |

---

## 6. Testing & Quality Checks

Run test suites across all packages:

```bash
npm test
```

Individual test suites:
```bash
npm run test --workspace=@roammate/core        # 48 pure calculation & route tests
npm run test --workspace=@roammate/sync        # 6 outbox, offline & conflict tests
npm run test --workspace=@roammate/api-client  # 4 typed client tests
npm run test --workspace=@roammate/web         # 122 frontend tests
```
