# 🚀 MojoLog Deployment & Environment Setup Guide

This guide covers everything required to configure, obtain keys for, and deploy **MojoLog** to production.

---

## 📋 Architecture Overview

MojoLog consists of three decoupled components orchestrated within a single monorepo:

1. **Frontend (`apps/web`)**: React 18 SPA + Vite + Rust WebAssembly + PWA Offline Service Worker + Terraink GPX Vector Map engine.
2. **Backend API (`apps/api`)**: Cloudflare Worker + Hono edge router providing zero-knowledge BIP-39 authentication, itinerary synchronization, read-only link sharing, and 3-month account auto-pruning.
3. **Database (Turso libSQL)**: Globally distributed serverless SQLite database.

---

## 🔑 Environment Variables & Secrets Reference

| Variable | Workspace | Required? | Default / Example | Purpose & Description |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | `apps/web` | Optional | `https://mojolog-api.workers.dev` | Points the frontend to the Cloudflare Worker API. If left empty, MojoLog runs 100% offline in client-only vault mode. |
| `VITE_MAP_STYLE_URL` | `apps/web` | Optional | `https://tiles.openfreemap.org/styles/positron` | Vector tile stylesheet URL for the Terraink cartography engine. OpenFreeMap Positron requires **zero API keys and zero billing**. |
| `VITE_OSRM_ROUTER_URL` | `apps/web` | Optional | `https://router.project-osrm.org` | Multi-modal real-world road and pedestrian routing engine endpoint. |
| `TURSO_DATABASE_URL` | `apps/api` | Required (Cloud Sync) | `libsql://mojolog-db-[user].turso.io` | Connection URL for your distributed Turso edge database. |
| `TURSO_AUTH_TOKEN` | `apps/api` | Required (Cloud Sync) | `eyJhbGciOi...` | Encrypted JWT authentication token for database read/write queries. |

> [!NOTE]
> All `.env` and `.dev.vars` files containing real keys are **strictly ignored by Git**. Only `.env.sample` and `.dev.vars.sample` templates are tracked in source control.

---

## 🛠️ Step-by-Step Setup & Key Acquisition

### Step 1: Prerequisites

Make sure your machine or CI/CD environment has the following tools installed:

```bash
# Verify Node.js (v18 or v20+ recommended)
node --version
npm --version

# Verify Rust & Cargo (Required only if recompiling WebAssembly)
cargo --version
rustc --version

# Verify wasm32 compilation target
rustup target add wasm32-unknown-unknown
```

---

### Step 2: Set Up Turso Database (`TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN`)

[Turso](https://turso.tech/) provides serverless SQLite at the edge with a generous free tier (up to 500 databases and 9GB storage).

#### 1. Install the Turso CLI
```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash
```

#### 2. Authenticate or Sign Up
```bash
turso auth signup
# or if you already have an account:
turso auth login
```

#### 3. Create a Production Database
```bash
turso db create mojolog-db
```

#### 4. Apply Database Schema
Execute the pre-built schema containing the 3-month retention indexes and tables:
```bash
cd ~/Workshop/mojolog
turso db shell mojolog-db < apps/api/schema.sql
```

#### 5. Retrieve Your Database URL
```bash
turso db show mojolog-db --url
```
> Example Output: `libsql://mojolog-db-yourusername.turso.io`  
> 👉 Save this as `TURSO_DATABASE_URL`.

#### 6. Generate an Auth Token
```bash
turso db tokens create mojolog-db
```
> Example Output: `eyJhbGciOi...` (long token string)  
> 👉 Save this as `TURSO_AUTH_TOKEN`.

---

### Step 3: Deploy Backend Edge Worker (`apps/api`)

The backend is built with [Hono](https://hono.dev/) and deployed directly to [Cloudflare Workers](https://workers.cloudflare.com/).

#### 1. Log in to Cloudflare via Wrangler
```bash
npx wrangler login
```
*A browser window will open asking you to authorize Wrangler with your Cloudflare account.*

#### 2. Configure `apps/api/wrangler.toml`
Open [`apps/api/wrangler.toml`](file:///home/zack/Workshop/mojolog/apps/api/wrangler.toml) and set your database URL:
```toml
name = "mojolog-api"
main = "src/index.ts"
compatibility_date = "2024-09-01"
compatibility_flags = ["nodejs_compat"]

[vars]
TURSO_DATABASE_URL = "libsql://mojolog-db-yourusername.turso.io"
```

#### 3. Store the Secret Auth Token on Cloudflare
Do **not** place your secret token in `wrangler.toml`. Use Cloudflare Secrets:
```bash
cd apps/api
npx wrangler secret put TURSO_AUTH_TOKEN
# When prompted, paste your Turso auth token and press Enter
```

#### 4. Deploy the Worker
```bash
npm run deploy
```
> Example Output: `Published mojolog-api (1.2s) at https://mojolog-api.yoursubdomain.workers.dev`  
> 👉 This URL is your `VITE_API_URL` for the frontend!

#### 5. Verify the Live Backend
```bash
curl https://mojolog-api.yoursubdomain.workers.dev/api/auth/register
```

---

### Step 4: Deploy Frontend Web Application (`apps/web`)

The frontend produces static HTML, CSS, JavaScript, and compiled `.wasm` files in `apps/web/dist/`.

#### Build Command
```bash
cd ~/Workshop/mojolog

# 1. Compile Rust to WebAssembly (if changed)
npm run build:wasm

# 2. Compile React SPA bundle
npm run build
```
Build output directory: `apps/web/dist/`

---

### Platform-Specific Frontend Deployment Options

#### Option A: Cloudflare Pages (Recommended)
Because your worker is already on Cloudflare, Pages gives you same-network speed and $0 global hosting.
1. In Cloudflare Dashboard, go to **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
2. Build settings:
   * **Framework preset**: `Vite`
   * **Root directory**: `apps/web`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
3. Environment variables:
   * `VITE_API_URL`: `https://mojolog-api.yoursubdomain.workers.dev`
   * `VITE_MAP_STYLE_URL`: `https://tiles.openfreemap.org/styles/positron`
4. Click **Save and Deploy**.

#### Option B: Vercel
1. Run `npx vercel` from `apps/web` or import the GitHub repository in the Vercel dashboard.
2. Root directory: `apps/web`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable `VITE_API_URL`.

#### Option C: Self-Hosted Docker / Nginx
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build:wasm
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
> [!IMPORTANT]
> Ensure your Nginx configuration includes MIME type `application/wasm wasm;` so browsers can instantiate the WebAssembly binary.

---

### Step 5: Local Development Setup

For local testing without deploying to Cloudflare:

```bash
# 1. Copy sample environment files
cp .env.sample .env
cp apps/web/.env.sample apps/web/.env
cp apps/api/.dev.vars.sample apps/api/.dev.vars

# 2. Start frontend dev server
npm run dev
# Running on http://localhost:3000

# 3. (Optional) Start local Cloudflare Worker
npm run dev:api
# Running on http://localhost:8787
```

---

### Step 6: Verifying PWA & Offline Support

MojoLog is a Progressive Web App (PWA) with full offline caching:
1. Production deployments **must be served over HTTPS** (Cloudflare Pages, Vercel, and Netlify provide this automatically).
2. Open your deployed URL in Chrome/Brave/Edge.
3. Open DevTools ➔ **Application** ➔ **Service Workers**; verify `sw.js` is active and running.
4. Toggle **Offline** mode in the Network tab; refresh the page.
5. All itineraries, boarding passes, expense logs, and Rust WASM TSP route optimization will function seamlessly with zero network connectivity.

---

### Step 7: Automated 3-Month Retention Policy

MojoLog enforces strict zero-knowledge privacy:
* Inactive accounts not accessed for **90 days (3 months)** are automatically expunged from the database during edge access cycles.
* To schedule proactive daily pruning, enable a cron trigger in `apps/api/wrangler.toml`:
  ```toml
  [triggers]
  crons = ["0 3 * * *"] # Executes daily at 03:00 UTC
  ```
  The worker executes `pruneExpiredAccounts(turso)` automatically.
