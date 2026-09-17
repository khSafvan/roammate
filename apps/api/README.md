# ☁️ MojoLog Edge Backend (Cloudflare Workers + Turso libSQL)

This directory contains the edge API server powering zero-knowledge authentication via **12-word cryptographic seed phrases (BIP-39)** and serverless database persistence via **Turso (libSQL)**.

---

## 🔑 Why This Stack?

1. **Zero Phone / SMS Costs**: Eliminates Twilio / Auth0 / Firebase SMS authentication fees.
2. **Zero-Knowledge**: Raw 12-word phrases are never stored in the database; only one-way SHA-256 hashes are used as public user identifiers.
3. **Global Edge Execution**: Cloudflare Workers + Turso execute queries in < 15ms globally at zero maintenance cost.

---

## 🛠️ Setup & Deployment Guide

### 1. Create a Free Turso Database
Install the Turso CLI and create your database:
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create mojolog-db

# Apply the schema
turso db shell mojolog-db < schema.sql

# Get your Database URL
turso db show mojolog-db --url

# Generate an Auth Token
turso db tokens create mojolog-db
```

### 2. Configure Wrangler Secrets
Update `wrangler.toml` with your `TURSO_DATABASE_URL`:
```toml
[vars]
TURSO_DATABASE_URL = "libsql://mojolog-db-[YOUR_NAME].turso.io"
```

Set your secret token via Wrangler:
```bash
npx wrangler secret put TURSO_AUTH_TOKEN
# Paste your Turso token when prompted
```

### 3. Deploy to Cloudflare Workers
```bash
npm run deploy
```

---

## 📡 API Endpoints

* `POST /api/auth/register`: Takes or generates a 12-word phrase, hashes with SHA-256, and provisions a user row.
* `POST /api/auth/login`: Validates BIP-39 checksum, computes SHA-256 hash, and verifies account in Turso.
* `POST /api/itinerary`: Upserts an itinerary JSON blob linked to the authenticated user ID.
* `GET /api/itineraries/:userId`: Fetches all trips associated with that cryptographic user ID.
