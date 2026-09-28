# 🚀 Roammate — Fresh Hosting & Deployment Guide

This guide covers setting up and hosting Roammate completely from scratch:
- **Frontend (`apps/web`)**: Cloudflare Pages (Static SPA)
- **Backend API (`apps/api`)**: Cloudflare Workers
- **Database**: Turso (libSQL serverless SQLite)

---

## 1. Prerequisites

- [Node.js 20+](https://nodejs.org/) and `npm`
- [Turso CLI](https://turso.tech/): `curl -sSfL https://get.tur.so/install.sh | bash`
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/): installed via devDependencies in this repository (`npx wrangler`)

---

## 2. Fresh Turso Database Setup

1. **Log in to Turso**:
   ```bash
   turso auth login
   ```

2. **Create a fresh database**:
   ```bash
   turso db create roammate-db
   ```

3. **Apply the clean database schema**:
   ```bash
   turso db shell roammate-db < apps/api/schema.sql
   ```

4. **Retrieve Database URL**:
   ```bash
   turso db show roammate-db --url
   # Example: libsql://roammate-db-username.turso.io
   ```

5. **Generate Database Auth Token**:
   ```bash
   turso db tokens create roammate-db
   ```
   *Keep this token private.*

---

## 3. Deploy Backend API (`apps/api` -> Cloudflare Workers)

1. **Log in to Cloudflare**:
   ```bash
   npx wrangler login
   ```

2. **Set Worker Secrets**:
   Run from `apps/api`:
   ```bash
   cd apps/api

   # Set database credentials
   npx wrangler secret put TURSO_DATABASE_URL
   # Enter the libsql://... URL from Step 2

   npx wrangler secret put TURSO_AUTH_TOKEN
   # Enter the Turso auth token from Step 2

   # Set JWT token signing key
   npx wrangler secret put JWT_SECRET
   # Enter a secure random string (e.g. openssl rand -hex 32)
   ```

3. **Deploy the Worker**:
   ```bash
   npm run deploy:api
   ```
   Wrangler outputs the deployed Worker URL:
   `https://mojolog-api.<your-account>.workers.dev`
   *Save this URL — it will be used as `VITE_API_URL` for the frontend.*

---

## 4. Deploy Frontend Web App (`apps/web` -> Cloudflare Pages)

### Option A: Via Command Line (Wrangler)

1. **Build the static SPA**:
   ```bash
   VITE_API_URL="https://mojolog-api.<your-account>.workers.dev" npm run build --workspace=@mojolog/web
   ```

2. **Deploy to Cloudflare Pages**:
   ```bash
   npx wrangler pages deploy apps/web/dist --project-name=mojolog-web
   ```

### Option B: Via Cloudflare Dashboard (Continuous Deployment)

1. In Cloudflare Dashboard, navigate to **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
2. Select your repository.
3. Configure build settings:
   - **Framework preset**: `None` / `Vite`
   - **Build command**: `npm run build --workspace=@mojolog/web`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `/` (repository root)
4. Add environment variables under **Production**:
   - `VITE_API_URL`: `https://mojolog-api.<your-account>.workers.dev`
5. Click **Save and Deploy**.

---

## 5. Deployment Commands
 
Deployments are performed on demand directly via CLI scripts:
- **Deploy Backend (API Worker)**: `npm run deploy:api`
- **Deploy Frontend (Pages)**: `npm run deploy:web`

*(Automated GitHub Actions workflows are disabled by default to avoid unexpected cloud deployments on git push. Deployments run only when you explicitly invoke the deploy commands above).*
