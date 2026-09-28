# ✈️ roammate / mojolog

> Privacy-first, offline-capable trip planner with TerraWay 2D GPX vector map engine, TypeScript route optimizer, and edge cloud sync.

---

## 🛠️ Architecture

Monorepo structured for independent deployments, offline-first calculation, and reusable mobile-ready API client:

```
├── apps/
│   ├── web/               # Frontend Vite static SPA -> Cloudflare Pages
│   └── api/               # Backend Worker (Hono): accounts + sync only -> Cloudflare Workers
└── packages/
    ├── core/              # Pure logic: calculations, route engine, models, validation (no I/O, no DB, no window)
    ├── api-client/        # Typed API client for web and future mobile client
    ├── sync/              # Offline outbox + push/pull sync engine (storage-agnostic)
    └── shared/            # Shared domain types and configuration constants
```

### Key Principles

1. **Clean Split & Independent Deployments**: `apps/web` builds statically to `dist/` and deploys to Cloudflare Pages. `apps/api` deploys as a standalone Cloudflare Worker. CI path filters ensure changes to one app never trigger a deployment for the other.
2. **Account & Sync Only Backend**: `apps/api` handles accounts, bearer tokens, outbox push/pull, and Turso libSQL persistence.
3. **Pure Frontend Calculations & Offline Support**:
   - **Guest / Offline Mode**: All calculations (routing, TSP optimization, schedule conflicts, currency formatting, GPX/iCal generation, expense settlements) run locally from `@mojolog/core` without an account or database. Local mutations queue in `@mojolog/sync`'s outbox.
   - **Signed-in Mode**: Bearer tokens are issued by `apps/api`. When offline, the cached token maintains session state until expiry; queued changes synchronize when back online. Credentials are never verified locally in the browser.
   - **Conflict Resolution**: Last-write-wins per record using server timestamps.

---

## 🚀 Quick Start & Local Development

### Prerequisites

- Node.js 20+
- npm (workspaces)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy example environment files:

```bash
# Frontend web environment
cp apps/web/.env.example apps/web/.env

# API worker local development secrets
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

### 3. Run Web & API Together

Run both the backend Worker (`http://localhost:8787`) and the Vite web development server (`http://localhost:5173`):

```bash
npm run dev:all
```

Or run them individually in separate terminals:

```bash
# Terminal 1: Backend API Worker
npm run dev:api

# Terminal 2: Frontend Web Client
npm run dev
```

---

## 🔐 Environment Variables & Secrets

### Frontend (`apps/web/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the `apps/api` Worker backend | `http://localhost:8787` |
| `VITE_MAP_STYLE_URL` | Vector map tile style JSON URL | `https://tiles.openfreemap.org/styles/liberty` |
| `VITE_OSRM_ROUTER_URL` | Road routing API endpoint (OSRM) | `https://router.project-osrm.org/route/v1` |

### Backend Worker (`apps/api/.dev.vars` / Wrangler Secrets)

*Note: In production, database credentials and JWT signing secrets are stored as Cloudflare Worker secrets (`wrangler secret put`), never checked into Git or exposed to the frontend.*

| Variable / Secret | Description | Where to Set |
|---|---|---|
| `TURSO_DATABASE_URL` | Turso libSQL connection URL (`libsql://...`) | `.dev.vars` / `wrangler secret put TURSO_DATABASE_URL` |
| `TURSO_AUTH_TOKEN` | Turso database authentication token | `.dev.vars` / `wrangler secret put TURSO_AUTH_TOKEN` |
| `JWT_SECRET` | Signing key for Bearer JWT tokens | `.dev.vars` / `wrangler secret put JWT_SECRET` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed web origins for CORS | `wrangler.toml` [vars] or `.dev.vars` |

---

## 🗄️ Database Migrations

Migrations are located in `apps/api/migrations/`.

Run migrations against Turso database using credentials from `.dev.vars` or environment variables:

```bash
npm run db:migrate
```

To create a new migration:
1. Add a numbered SQL file in `apps/api/migrations/` (e.g. `0002_new_feature.sql`).
2. Run `npm run db:migrate`.

---

## 🚢 Deployment

### Deploy Web (`apps/web` -> Cloudflare Pages)

```bash
npm run deploy:web
```

Builds the static SPA bundle into `apps/web/dist` and deploys it to Cloudflare Pages.

### Deploy API (`apps/api` -> Cloudflare Workers)

```bash
npm run deploy:api
```

Deploys the Hono Worker to Cloudflare Workers.

### Production Secrets Setup

Before first API deployment, set the production secrets on Cloudflare:

```bash
cd apps/api
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put JWT_SECRET
```

### Continuous Integration & Deployment (GitHub Actions)

Separate GitHub Action workflows are configured with path filtering:
- `.github/workflows/deploy-web.yml`: Triggers only on changes to `apps/web/**` or `packages/**`.
- `.github/workflows/deploy-api.yml`: Triggers only on changes to `apps/api/**` or `packages/shared/**`.

---

## 🧪 Testing

Run test suites across all workspaces:

```bash
npm test
```

Or test specific packages:

```bash
npm run test --workspace=@mojolog/core        # 48 pure calculation & routing tests
npm run test --workspace=@mojolog/sync        # 6 outbox, offline & conflict tests
npm run test --workspace=@mojolog/api-client  # 4 typed client tests
npm run test --workspace=@mojolog/web         # 122 frontend integration tests
```

---

## 📡 API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Register account; returns `{ token, userId, expiresAt }` |
| `POST` | `/auth/login` | None | Verify credentials; returns `{ token, userId, expiresAt }` |
| `POST` | `/auth/refresh` | Bearer | Refresh active token; returns fresh JWT |
| `GET` | `/me` | Bearer | Get current user metadata and update activity |
| `DELETE`| `/auth/account` | Bearer | Delete account and all associated itineraries |
| `GET` | `/sync/pull?since=...` | Bearer | Pull remote changes updated after `since` timestamp |
| `POST` | `/sync/push` | Bearer | Push outbox mutation batch with server timestamps |
| `GET` | `/share/:token` | Guest Key | Read-only shared trip access |
