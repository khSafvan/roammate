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
   Run from the repository root using the npm shortcut scripts:
   ```bash
   # 1. Database URL from Turso (Step 2)
   npm run secret:put -- TURSO_DATABASE_URL

   # 2. Database Auth Token from Turso (Step 2)
   npm run secret:put -- TURSO_AUTH_TOKEN

   # 3. JWT Signing Secret (generate via: openssl rand -hex 32)
   npm run secret:put -- JWT_SECRET
   ```
   *(Alternatively, run from `apps/api`: `cd apps/api && npx wrangler secret put TURSO_DATABASE_URL`).*

   **Verify configured secrets:**
   ```bash
   npm run secret:list
   # or from apps/api: cd apps/api && npx wrangler secret list
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

2. **Deploy to Cloudflare Pages (Production)**:
   ```bash
   npm run deploy:web
   # or: npx wrangler pages deploy apps/web/dist --project-name=mojolog-web --branch=main
   ```
   *Note: Passing `--branch=main` promotes the build directly to Production (`https://mojolog-web.pages.dev`). Omitting `--branch` creates a temporary preview deployment.*

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

## 5. GitHub Actions Automated Deployment Setup

The repository includes two independent CI/CD workflows under `.github/workflows/`:
- **`deploy-api.yml`**: Deploys the API Worker when `apps/api/**` or `packages/shared/**` change.
- **`deploy-web.yml`**: Builds and deploys the frontend Pages app when `apps/web/**` or `packages/**` change.

> **Safety Guard**: Workflows skip automatically until you configure the secrets below, preventing unwanted failing builds.

### Step-by-Step GitHub Setup

#### Step 1: Create a Cloudflare API Token
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Click your user icon (top right) ➔ **My Profile** ➔ **API Tokens**.
3. Click **Create Token**.
4. Scroll to **Custom Token** and click **Get started**.
5. Set token permissions:
   - **Account** ➔ **Cloudflare Pages** ➔ **Edit**
   - **Account** ➔ **Workers Scripts** ➔ **Edit**
6. Under **Account Resources**, select **Include** ➔ **All accounts** (or your specific account).
7. Click **Continue to summary** ➔ **Create Token**.
8. **Copy the API Token string immediately** (it is shown only once).

#### Step 2: Get Your Cloudflare Account ID
1. In Cloudflare Dashboard, click **Workers & Pages** in the left sidebar.
2. In the right sidebar, look for **Account ID**.
3. Click to copy the 32-character hexadecimal Account ID.

#### Step 3: Add Secrets to Your GitHub Repository
1. Open your GitHub repository in your browser.
2. Go to **Settings** ➔ **Secrets and variables** (left sidebar) ➔ **Actions**.
3. Under **Repository secrets**, click **New repository secret** for each of the following:

| Secret Name | Value | Purpose |
| :--- | :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | *(Token copied from Step 1)* | Authorizes Wrangler to deploy Workers and Pages |
| `CLOUDFLARE_ACCOUNT_ID`| *(Account ID copied from Step 2)* | Identifies your Cloudflare account |
| `VITE_API_URL` | `https://mojolog-api.<your-account>.workers.dev` | Injected into the frontend build to connect to your backend |

#### Step 4: Run or Verify Deployment
- **Automatic on Git Push**: Any push to `main` modifying `apps/api/**` will deploy the Worker; modifying `apps/web/**` will build and deploy the Pages frontend.
- **Manual Trigger**: In GitHub, open the **Actions** tab ➔ select either **Deploy API to Cloudflare Workers** or **Deploy Web to Cloudflare Pages** ➔ click **Run workflow**.

---

## 6. Local CLI Deployment Commands

Deployments can always be executed on demand from your local machine:
```bash
# Deploy Backend API Worker
npm run deploy:api

# Deploy Frontend Pages App
npm run deploy:web
```
