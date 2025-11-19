# ✈️ MojoLog — Responsive React.js + Rust WebAssembly Trip Planner

> A responsive, high-performance trip planning web application synthesizing **TripMojo’s clean, tactile card UI** with **Wanderlog’s spatial distance computation and interactive route mapping**, powered by a **native Rust WebAssembly (WASM) engine**.

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
  * Right: Sticky interactive route map with day-colored polylines and numbered pins (`[1]`, `[2]`, `[3]`).
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
* **Cryptographic 12-Word Seed Auth (BIP-39)**:
  * Zero SMS costs, zero third-party lock-in.
  * Uses Web Crypto SHA-256 for public User ID derivation and Turso (libSQL) database persistence.
* **Trip Readiness Hub**:
  * Circular progress gauge tracking passports, visas, bookings, and eSIM prerequisites.
* **Zero Spreadsheet Clutter**:
  * Clean, human-centric design language inspired by TripMojo with verified ticket tags and quick Google Maps navigation.

---

## 🛠️ Project Structure

```
mojolog/
├── rust-core/              # Native Rust engine compiled to WASM
│   ├── Cargo.toml
│   └── src/lib.rs          # TSP 2-opt optimizer, Haversine formula, comfort index
├── worker/                 # Cloudflare Worker + Turso (libSQL) edge backend
│   ├── src/index.ts        # Hono edge API (BIP-39 auth, itinerary upsert, read-only share)
│   ├── schema.sql          # Turso database migration
│   └── wrangler.toml       # Edge deployment configuration
├── src/
│   ├── pkg/                # Generated WebAssembly binary & TypeScript glue
│   ├── wasm/
│   │   └── engine.ts       # Bridge loading WASM with automatic JS fallback
│   ├── auth/
│   │   ├── crypto.ts       # BIP-39 mnemonic generation & Web Crypto SHA-256
│   │   └── syncService.ts  # Edge sync service with local vault fallback
│   ├── types/
│   │   └── trip.ts         # Unified Trip, Flight, Expense, DayWeather, Stop models
│   ├── data/
│   │   └── mockTrip.ts     # Tokyo 4-day trip with flights, expenses, & forecasts
│   ├── utils/
│   │   └── exportImport.ts # Method A (JSON export/import) & Method B (share token)
│   ├── components/
│   │   ├── Header.tsx           # App bar with Vault status & Readiness Ring
│   │   ├── DaySelector.tsx      # Day tabs with weather icons and temperature
│   │   ├── WeatherBanner.tsx    # Daily weather prediction & hourly forecast stream
│   │   ├── TimelineCard.tsx     # Tactile stop card with category & ticket tags
│   │   ├── DistancePill.tsx     # Inter-stop transit & distance connector
│   │   ├── InteractiveMap.tsx   # SVG vector route map with numbered pins
│   │   ├── FlightTracker.tsx    # Boarding pass cards & FlightRadar24 live links
│   │   ├── ExpenseTracker.tsx   # Category-wise budget breakdown & spending log
│   │   ├── ShareModal.tsx       # JSON file export/import & read-only link share
│   │   ├── AuthModal.tsx        # 12-word cryptographic seed vault modal
│   │   ├── ReadinessModal.tsx   # Trip readiness checklist drawer
│   │   └── StopDetailModal.tsx  # Stop details with 1-tap navigation
│   ├── App.tsx             # Master application component with tabbed navigation
│   ├── main.tsx
│   └── index.css           # Modern design system & responsive media queries
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

### 2. Recompile Rust WebAssembly (Optional)
```bash
npm run build:wasm
```

### 3. Production Build
```bash
npm run build
npm run preview
```
