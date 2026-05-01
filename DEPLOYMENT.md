# 🚀 roammate — Deployment & Environment Setup Guide

This guide covers everything required to configure, obtain keys for, and deploy **roammate** to production.

**Public Netlify URL:** `https://<your-site-name>.netlify.app`

Replace the placeholder with the production domain assigned to the Netlify site.

---

## 📋 Architecture Overview

roammate consists of three decoupled components orchestrated within a single monorepo:

1. **Frontend (`apps/web`)**: React 18 SPA + Vite + TypeScript geospatial/route engine + PWA Service Worker + TerraWay GPX vector map engine. Full stop/day CRUD, TSP route optimizer with undo, expense settlement, packing lists, iCal export, scratchpad, printable travel packet, and schedule conflict detection.
2. **Backend API (`apps/api`)**: Cloudflare Worker + Hono edge router providing zero-knowledge BIP-39 authentication, itinerary sync, read-only share links, and 90-day auto-pruning.
3. **Database (Turso libSQL)**: Globally distributed serverless SQLite database.

---

## 🔑 Environment Variables & Secrets Reference

| Variable | Workspace | Required? | Default / Example | Purpose & Description |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | `apps/web` | Optional | `https://roammate-api.<your-account>.workers.dev` | Points the frontend to the Cloudflare Worker API. If left empty, roammate runs in browser-local vault mode. |
| `VITE_MAP_STYLE_URL` | `apps/web` | Optional | `https://tiles.openfreemap.org/styles/positron` | Vector tile stylesheet URL for the TerraWay cartography engine. OpenFreeMap Positron requires **zero API keys and zero billing**. |
| `VITE_OSRM_ROUTER_URL` | `apps/web` | Optional | `https://router.project-osrm.org` | Multi-modal real-world road and pedestrian routing engine endpoint. |
| `TURSO_DATABASE_URL` | `apps/api` | Required (Cloud Sync) | `libsql://roammate-db-[user].turso.io` | Connection URL for your distributed Turso edge database. |
| `TURSO_AUTH_TOKEN` | Cloudflare Worker secret | Required (Cloud Sync) | Set with Wrangler; never commit it | Private credential that lets the API Worker access Turso. Do not add it to Netlify frontend variables. |

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

```

---

### Step 2: Set Up Turso Database (`TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN`)

[Turso](https://turso.tech/) provides serverless SQLite at the edge with a generous free tier (up to 500 databases and 9GB storage).

#### 1. Install and verify the Turso CLI
```bash
# Linux or macOS
curl -sSfL https://get.tur.so/install.sh | bash
```

Open a new terminal after installation, then verify the command is available:
```bash
turso --version
```

If the shell still reports `turso: command not found`, restart the terminal/session so the installer can update PATH, then try again. The CLI is only needed to provision the database; it is not needed to build or host the frontend.

#### 2. Authenticate or Sign Up
```bash
turso auth login
```
Complete the browser sign-in flow. If you do not have a Turso account yet, use `turso auth signup` instead.

#### 3. Create a Production Database
```bash
turso db create roammate-db
```
If that database name is already taken in your account, choose another name and use it in the commands below.

#### 4. Apply Database Schema
Run this from the repository root so the schema path resolves:
```bash
turso db shell roammate-db < apps/api/schema.sql
```

#### 5. Retrieve the Database URL
```bash
turso db show roammate-db --url
```
> Example Output: `libsql://roammate-db-yourusername.turso.io`  
Save the full output as `TURSO_DATABASE_URL`.

#### 6. Generate an Auth Token
```bash
turso db tokens create roammate-db
```
> Example Output: `eyJhbGciOi...` (long token string)  
Keep this token private. You will enter it directly into Wrangler in Step 3; do not put it in the frontend `.env` or Netlify environment variables.

You can verify the database is reachable with:
```bash
turso db show roammate-db
```

---

### Step 3: Deploy Backend Edge Worker (`apps/api`)

The backend is built with [Hono](https://hono.dev/) and deployed directly to [Cloudflare Workers](https://workers.cloudflare.com/).

#### 1. Log in to Cloudflare via Wrangler
```bash
npx wrangler login
```
*A browser window will open asking you to authorize Wrangler with your Cloudflare account.*

#### 2. Configure `apps/api/wrangler.toml`
Replace the placeholder `TURSO_DATABASE_URL` with the URL returned by `turso db show`. Keep the Worker name `mojolog-api` unless you intentionally want a different public Worker URL:
```toml
name = "mojolog-api"
main = "src/index.ts"
compatibility_date = "2024-09-01"
compatibility_flags = ["nodejs_compat"]

[vars]
TURSO_DATABASE_URL = "libsql://your-database-name-youraccount.turso.io"
```

#### 3. Store the Secret Auth Token on Cloudflare
Do **not** place your secret token in `wrangler.toml`. Use Cloudflare Secrets:
```bash
cd apps/api
npx wrangler secret put TURSO_AUTH_TOKEN
# Paste the Turso token into this terminal prompt (do not paste it into chat or source files).
```

#### 4. Deploy the Worker
Still in `apps/api`, deploy the API:
```bash
npm run deploy
```
Wrangler prints the deployed URL, usually `https://mojolog-api.<your-account>.workers.dev`. That base URL is the frontend's `VITE_API_URL`; do not append `/api/auth/login` or another route.

#### 5. Verify the Live Backend
There is no health route at `/`. To confirm the deployed Worker is serving its API without writing to the database, send an empty login request and expect HTTP `400`:
```bash
curl -i -X POST "https://mojolog-api.<your-account>.workers.dev/api/auth/login" \
   -H "Content-Type: application/json" \
   --data '{}'
```
This checks Worker routing only, not database connectivity. To check Turso end to end, run `npx wrangler tail` from `apps/api`, then create an account through the deployed app and confirm the Worker logs show no Turso errors. The login endpoint auto-provisions unknown UUIDs, so do not use an invented UUID as a supposedly read-only test.

---

### Step 4: Deploy Frontend Web Application (`apps/web`)

The frontend produces static HTML, CSS, and JavaScript in `apps/web/dist/`. Route calculations and GPX generation are implemented in TypeScript, with no extra compilation toolchain required.

#### Build Command
```bash
# From the repository root:

# Compile the React SPA bundle
npm run build
```
Build output directory: `apps/web/dist/`

---

### Platform-Specific Frontend Deployment Options

#### Option A: Netlify (Current Configuration)
The repository's root `netlify.toml` is configured for the monorepo layout and the TypeScript-only build:

| Setting | Value |
|---|---|
| Base directory | `.` (repository root) |
| Build command | `npm run build` |
| Publish directory | `apps/web/dist` |

Connect the repository to Netlify and allow it to read these settings from `netlify.toml`. In **Site configuration → Build & deploy → Build settings**, remove any dashboard overrides that set the base directory to `apps/api` or publish `apps/api/dist`.

Set these site environment variables as needed:
- `VITE_API_URL`: the deployed Cloudflare Worker base URL from Step 3; optional for local-only vault mode.
- `VITE_MAP_STYLE_URL`: optional; defaults to the OpenFreeMap Positron style.
- `VITE_OSRM_ROUTER_URL`: optional; defaults to the public OSRM router.

After setting `VITE_API_URL`, trigger a new Netlify deploy because Vite embeds `VITE_*` values at build time. After the first successful frontend deploy, copy the public URL from **Site overview** or **Domain management** and replace the public URL placeholder above. Netlify may use a generated site name unless a custom domain is configured.

#### Option B: Cloudflare Pages
Because your worker is already on Cloudflare, Pages gives you same-network speed and $0 global hosting.
1. In Cloudflare Dashboard, go to **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
2. Build settings:
   * **Framework preset**: `Vite`
   * **Root directory**: `apps/web`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
3. Environment variables:
   * `VITE_API_URL`: the exact `https://mojolog-api.<your-account>.workers.dev` URL printed by Wrangler
   * `VITE_MAP_STYLE_URL`: `https://tiles.openfreemap.org/styles/positron`
4. Click **Save and Deploy**.

#### Option C: Vercel
1. Run `npx vercel` from `apps/web` or import the GitHub repository in the Vercel dashboard.
2. Root directory: `apps/web`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable `VITE_API_URL`.

#### Option D: Self-Hosted Docker / Nginx
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
---

### Step 5: Local Development Setup

For local frontend testing without cloud sync, leave `VITE_API_URL` blank. To run the API locally against Turso, configure the API-specific secrets file instead of the frontend `.env`:

```bash
# From the repository root. Edit apps/api/.dev.vars with real Turso values.
cp apps/api/.dev.vars.sample apps/api/.dev.vars

# Configure the local API variables in apps/api/.dev.vars:
# TURSO_DATABASE_URL=libsql://your-database-youraccount.turso.io
# TURSO_AUTH_TOKEN=<private token>

# Start the frontend in one terminal
npm run dev
# Running on http://localhost:3000

# Start the Worker in another terminal
npm run dev:api
# Running on http://localhost:8787
```

For local cloud-sync testing, set `VITE_API_URL=http://localhost:8787` in `apps/web/.env` and restart Vite. Never put `TURSO_AUTH_TOKEN` in `apps/web/.env`, the root frontend `.env`, or Netlify frontend variables.

---

### Step 6: Verifying PWA & Offline Support

roammate is a Progressive Web App (PWA) with full offline caching:
1. Production deployments **must be served over HTTPS** (Cloudflare Pages, Vercel, and Netlify provide this automatically).
2. Open your deployed URL in Chrome/Brave/Edge.
3. Open DevTools ➔ **Application** ➔ **Service Workers**; verify `sw.js` is active and running.
4. Toggle **Offline** mode in the Network tab; refresh the page.
5. All itineraries, boarding passes, expense logs, and TypeScript route optimization will function seamlessly with zero network connectivity.

---

### Step 7: Automated 3-Month Retention Policy

roammate enforces strict zero-knowledge privacy:
* Inactive accounts not accessed for **90 days (3 months)** are automatically expunged from the database during edge access cycles.
* To schedule proactive daily pruning, enable a cron trigger in `apps/api/wrangler.toml`:
  ```toml
  [triggers]
  crons = ["0 3 * * *"] # Executes daily at 03:00 UTC
  ```
  The worker executes `pruneExpiredAccounts(turso)` automatically.
