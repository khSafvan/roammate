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

---

## 🛠️ Modular Project Structure

```
mojolog/
├── rust-core/              # Native Rust engine compiled to WASM
│   ├── Cargo.toml
│   └── src/lib.rs          # TSP 2-opt optimizer, Haversine formula, comfort index
├── worker/                 # Cloudflare Worker + Turso (libSQL) edge backend
│   ├── src/index.ts        # Hono edge API (BIP-39 auth, itinerary upsert, read-only share)
│   ├── schema.sql          # Turso database migration
│   └── wrangler.toml       # Edge deployment configuration
├── tests/                  # Automated unit test suite (Vitest)
│   ├── crypto.test.ts      # BIP-39 mnemonic, SHA-256 hashing, 90-day pruning
│   ├── gpx.test.ts         # Topografix GPX 1.1 XML generation & coordinates
│   └── wasm_fallback.test.ts # Haversine formula, multi-modal transit, TSP fallbacks
├── src/
│   ├── pkg/                # Generated WebAssembly binary & TypeScript glue
│   ├── wasm/
│   │   └── engine.ts       # Bridge loading WASM with automatic JS fallback
│   ├── auth/
│   │   ├── crypto.ts       # BIP-39 mnemonic generation & Web Crypto SHA-256
│   │   └── syncService.ts  # Edge sync service with local vault fallback
│   ├── config/
│   │   └── constants.ts    # Centralized storage keys, retention policy, & map/transit config
│   ├── hooks/
│   │   ├── index.ts        # Barrel export for custom hooks
│   │   ├── useVault.ts     # Session state, 90-day pruning lifecycle, & read-only preview
│   │   ├── useTransitLegs.ts # Inter-stop distances, durations, & mode toggling
│   │   ├── useTripOptimization.ts # 1-click TSP WASM route optimization
│   │   └── useRustCore.ts  # Rust WebAssembly initialization & status
│   ├── types/
│   │   └── trip.ts         # Unified Trip, Flight, Expense, DayWeather, Stop models
│   ├── data/
│   │   └── mockTrip.ts     # Tokyo 4-day trip with flights, expenses, & forecasts
│   ├── utils/
│   │   ├── gpx.ts          # GPX 1.1 XML serializer & browser download trigger
│   │   └── exportImport.ts # Method A (JSON export/import) & Method B (share token)
│   ├── components/
│   │   ├── auth/           # Decomposed vault authentication subcomponents
│   │   │   ├── ActiveSessionView.tsx   # Active account card, ID, & danger zone
│   │   │   ├── CreateAccountView.tsx   # 12-word mnemonic chips & backup confirmation
│   │   │   ├── RestoreAccountView.tsx  # 12-word recovery textarea & checksum validation
│   │   │   └── DeleteAccountDialog.tsx # Permanent deletion confirmation with safety keyword
│   │   ├── Header.tsx           # App bar with Vault status & Readiness Ring
│   │   ├── DaySelector.tsx      # Memoized day tabs with weather icons and temperature
│   │   ├── WeatherBanner.tsx    # Memoized daily weather prediction & hourly forecast
│   │   ├── TimelineCard.tsx     # Memoized tactile stop card with category & ticket tags
│   │   ├── DistancePill.tsx     # Memoized inter-stop transit & distance connector
│   │   ├── InteractiveMap.tsx   # Terraink 2D planar vector route map with GPX track
│   │   ├── FlightTracker.tsx    # Boarding pass cards & FlightRadar24 live links
│   │   ├── ExpenseTracker.tsx   # Category-wise budget breakdown & spending log
│   │   ├── ShareModal.tsx       # JSON file export/import & read-only link share
│   │   ├── AuthModal.tsx        # Cryptographic seed vault modal orchestrator
│   │   ├── ReadinessModal.tsx   # Trip readiness checklist drawer
│   │   └── StopDetailModal.tsx  # Stop details with 1-tap navigation
│   ├── styles/             # Domain-specific modular CSS architecture
│   │   ├── variables.css    # Design tokens, color palettes, spacing, shadows
│   │   ├── base.css         # Typography resets, keyframes, universal primitives
│   │   ├── layout.css       # Header, nav bars, banners, dual-pane layout
│   │   ├── timeline.css     # Day selector, weather card, stop cards, distance pills
│   │   ├── map.css          # Terraink MapLibre container, GPX pins, floating dock
│   │   ├── subviews.css     # Flight boarding passes & expense tracker ledger
│   │   ├── modals.css       # Auth modal, share modal, readiness drawer
│   │   └── responsive.css   # Consolidated media queries (desktop, tablet, mobile)
│   ├── App.tsx             # Master application orchestrator
│   ├── main.tsx            # React root mount & error boundary
│   └── index.css           # 10-line CSS module aggregator
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Running the Web App

### 1. Start Development Server
```bash
cd ~/Workshop/mojolog
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. Run Automated Unit Tests
```bash
npm test
```
Executes 25 comprehensive unit tests across GPX serialization, BIP-39 crypto retention, and Rust WASM JS fallbacks using Vitest.

### 3. Recompile Rust WebAssembly (Optional)
```bash
npm run build:wasm
```

### 4. Production Build & Preview
```bash
npm run build
npm run preview
```
