const fs = require('fs');
const content = fs.readFileSync('DEPLOYMENT.md', 'utf-8');

const envSection = `
## 🔑 Environment Variables Reference

A quick reference chart of all environment variables used across the frontend (React/Vite), backend (Cloudflare Worker API), and CI/CD (GitHub Actions).

| Variable | Scope | Location | What It Means | Where to Get It |
| :--- | :--- | :--- | :--- | :--- |
| \`PASSWORD\` | **ALL** | Web (Build Env) / API (Secret) | Master password to unlock your personal Roammate vault. Must match on both frontend and backend. | Choose your own strong, secure password. |
| \`VITE_API_URL\` | **Frontend** | Web (Build Env) | The public URL of your deployed Cloudflare Worker API. | Wrangler CLI after deploying \`apps/api\` (e.g., \`https://mojolog-api.<account>.workers.dev\`). |
| \`VITE_MAP_STYLE_URL\` | **Frontend** | Web (Build Env) | *(Optional)* Custom MapLibre GL map style URL. | Third-party map tile providers (MapTiler, Protomaps, Stadia Maps, etc.). |
| \`TURSO_DATABASE_URL\` | **Backend** | API (Secret) | Connection URL for your serverless LibSQL database. | Run \`turso db show roammate-db --url\`. |
| \`TURSO_AUTH_TOKEN\` | **Backend** | API (Secret) | Authentication token to read/write to your Turso database. | Run \`turso db tokens create roammate-db\`. |
| \`JWT_SECRET\` | **Backend** | API (Secret) | Cryptographic secret used to sign secure session tokens. | Generate securely via \`openssl rand -hex 32\` in your terminal. |
| \`ALLOWED_ORIGINS\` | **Backend** | API (Secret) | *(Optional)* Comma-separated list of domains permitted to access your API (CORS). | Enter the URL of your frontend (e.g., \`https://mojolog-web.pages.dev\`). |
| \`GOOGLE_MAPS_API_KEY\` | **Backend** | API (Secret) | *(Optional)* API key to fetch high-quality place details via Google Places API. | Google Cloud Console (APIs & Services ➔ Credentials). |
| \`TRIPADVISOR_API_KEY\` | **Backend** | API (Secret) | *(Optional)* API key for TripAdvisor location fallback. | TripAdvisor Developer Portal. |
| \`CLOUDFLARE_API_TOKEN\`| **CI/CD** | GitHub Actions | Authorizes GitHub Actions to deploy to your Cloudflare account automatically. | Cloudflare Dashboard ➔ My Profile ➔ API Tokens. |
| \`CLOUDFLARE_ACCOUNT_ID\`| **CI/CD** | GitHub Actions | Identifies your Cloudflare account for automated deployments. | Cloudflare Dashboard ➔ Workers & Pages ➔ Account ID (Right Sidebar). |

> **Note on "Scope":** 
> - **Frontend (Build Env):** Must be provided when running \`npm run build\` or defined in Cloudflare Pages settings.
> - **Backend (Secret):** Must be injected securely using \`wrangler secret put\` or via the Cloudflare Dashboard for the API worker.

`;

const parts = content.split('## 1. Prerequisites');
const newContent = parts[0] + envSection + '\n## 1. Prerequisites' + parts[1];

fs.writeFileSync('DEPLOYMENT.md', newContent);
