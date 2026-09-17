# ✈️ MojoLog — Responsive React.js + Rust WebAssembly Trip Planner

> A responsive, high-performance trip planning web application synthesizing **TripMojo’s clean, tactile card UI** with **Wanderlog’s spatial distance computation**, an **open-source Terraink 2D planar GPX vector map engine**, and a native **Rust WebAssembly (WASM) TSP optimizer**.

---

## ⚡ Rust WebAssembly Engine (`rust-core`)

All core mathematical, geospatial, and combinatorial optimization routines are written in **Rust** and compiled directly to **WebAssembly (WASM)** via `wasm-pack`:

1. **`wasm_haversine_distance_km`**: High-precision spherical distance computation.
2. **`wasm_estimate_duration_minutes`**: Multi-modal urban transit modeling (Driving with traffic buffer, Walking, and Transit with station buffers).
3. **`wasm_optimize_route_tsp`**: 2-opt Traveling Salesperson Problem (TSP) algorithm executed at near-native speed to resequence intermediate stops, eliminate backtracking, and save travel time.
4. **`wasm_weather_comfort_label`**: Comfort scoring index analyzing temperature, humidity, UV, and precipitation.

---

## 🌟 Key Features

* **Dual-Pane Split Screen (Desktop)**:
  * Left: Day selector, comprehensive daily weather forecast, 1-click TSP route optimizer, and chronological tactile timeline cards.
  * Right: Terraink 2D planar vector map with continuous GPX track polyline and custom themed waypoint markers (`S`, `02`, `03`, `F`).
* **Terraink GPX Vector Cartography & Export**:
  * Powered by MapLibre GL with OpenFreeMap Positron vector tiles (zero API keys, zero 3D tilt overhead).
  * 1-click RFC/Topografix compliant **GPX 1.1 XML export** for Garmin, Strava, and offline GPS devices.
* **Mobile-First Responsive Layout**:
  * Seamlessly adapts to phones and tablets with an instant view switcher ("Timeline & Weather" vs "Route Map") and minimum 44px touch targets.
* **Comprehensive Weather Predictions**:
  * Temperature (Current, High, Low) & Condition.
  * Precipitation percentage, Humidity, and UV Index.
  * Contextual attire recommendation (e.g. *"Mild afternoon, light jacket needed after sunset"*).
  * Hourly forecast stream (Temperature, condition icon, and rain chance).
* **Inter-Stop Distance & Transit Pills**:
  * Embedded between consecutive stops: `🚗 14 min · 4.8 km`.
  * Click to cycle modes: **Drive ➔ Walk ➔ Transit** with instant recalculation via Rust WASM.
  * Backtracking / long-leg alerts (`⚠️ Long Leg`).
* **Flight Boarding Passes & Live Radar**:
  * Airline boarding pass cards with departure/arrival IATA badges (`JFK ➔ HND`), flight numbers, times, terminals, and seats.
  * Direct 1-tap live flight tracking via free **FlightRadar24** (`https://www.flightradar24.com/data/flights/{flightNumber}`).
* **Dynamic Expense Tracker & Budgeting**:
  * Client-side JavaScript reduction computing category-wise totals across 7 categories (Flights, Lodging, Food & Drinks, Transport, Activities, Shopping, Misc).
  * Multi-colored visual distribution progress bar and transaction ledger.
* **Portable Import / Export & Zero-Login Sharing**:
  * **Method A (Universal Portable JSON)**: 1-click export to `${title}_itinerary.json` and drag-and-drop import with collision-free ID regeneration.
  * **Method B (Read-Only Share Link)**: Cloudflare Worker edge route `GET /api/share/:token` providing instant, zero-login read-only web view.
* **Cryptographic 12-Word Seed Vault (BIP-39)**:
  * Zero SMS costs, zero third-party lock-in, zero tracking.
  * Uses Web Crypto SHA-256 for public User ID derivation and Turso (libSQL) database persistence.
  * **Automated 3-Month Retention Policy**: Inactive local data and edge records older than 90 days are automatically pruned.
* **Trip Readiness Hub**:
  * Circular progress gauge tracking passports, visas, bookings, and eSIM prerequisites.
* **Offline-First PWA Support**:
  * Complete Progressive Web App (PWA) manifest and Service Worker caching app shell, styles, and Rust WASM binary for 100% offline flight & itinerary access.

---

## 🛠️ Monorepo Workspace Architecture

```
mojolog/
├── apps/
│   ├── web/                    # React 18 + Vite + WASM Frontend SPA (@mojolog/web)
│   │   ├── public/             # Web App Manifest (manifest.webmanifest) & Service Worker (sw.js)
│   │   ├── src/
│   │   │   ├── auth/           # BIP-39 mnemonic generation & Web Crypto SHA-256
│   │   │   ├── components/     # Memoized React UI components & Auth subviews
│   │   │   ├── hooks/          # Custom hooks (useVault, useTransitLegs, useTripOptimization)
│   │   │   ├── pkg/            # Compiled WebAssembly binary & JS bindings
│   │   │   ├── styles/         # 8-layer modular CSS architecture
│   │   │   ├── utils/          # GPX 1.1 Topografix exporter & JSON import/export
│   │   │   └── wasm/           # Rust WASM loader & JS fallbacks
│   │   ├── tests/              # 25 automated Vitest unit tests
│   │   ├── index.html          # PWA meta tags & root container
│   │   ├── vite.config.ts      # Vite bundler & @mojolog/shared path alias
│   │   └── package.json        # Frontend workspace dependencies
│   │
│   └── api/                    # Cloudflare Worker + Hono Edge API (@mojolog/api)
│       ├── src/index.ts        # Edge auth, sync, and 3-month auto-pruning
│       ├── schema.sql          # Turso (libSQL) database migration
│       ├── wrangler.toml       # Edge deployment configuration
│       └── package.json        # Worker workspace dependencies
│
├── packages/
│   ├── shared/                 # Single Source of Truth (@mojolog/shared)
│   │   ├── src/
│   │   │   ├── types.ts        # Unified Trip, Stop, Flight, Expense, VaultSession models
│   │   │   ├── constants.ts    # Storage keys, 90-day retention policy, transit speeds
│   │   │   └── index.ts        # Shared module exports
│   │   └── package.json
│   │
│   └── rust-core/              # Computational Core (compiled to WebAssembly)
│       ├── src/lib.rs          # TSP 2-opt optimizer, Haversine formula, comfort index
│       └── Cargo.toml          # Rust crate configuration
│
├── package.json                # Root npm workspaces coordinator
└── .gitignore
```

---

## 🚀 Workspace Commands

All commands can be run directly from the repository root:

### 1. Start Frontend Development Server
```bash
npm run dev
```
Starts Vite dev server at `http://localhost:3000`.

### 2. Run Automated Unit Test Suite
```bash
npm test
```
Executes 25 comprehensive Vitest tests across GPX Topografix serialization, BIP-39 crypto retention, and WASM JS fallbacks.

### 3. Build Production Bundle
```bash
npm run build
```
Typechecks and compiles the production frontend bundle into `apps/web/dist/`.

### 4. Start Edge API Worker (Optional)
```bash
npm run dev:api
```
Starts Wrangler local edge development server for `@mojolog/api`.

### 5. Recompile Rust WebAssembly (Optional)
```bash
npm run build:wasm
```
Compiles `packages/rust-core` with `wasm-pack` directly into `apps/web/src/pkg/`.
