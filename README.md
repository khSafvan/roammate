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
├── src/
│   ├── pkg/                # Generated WebAssembly binary & TypeScript glue
│   │   ├── rust_core_bg.wasm
│   │   ├── rust_core.js
│   │   └── rust_core.d.ts
│   ├── wasm/
│   │   └── engine.ts       # Bridge loading WASM with automatic JS fallback
│   ├── types/
│   │   └── trip.ts         # Trip, TripDay, DayWeather, ItineraryStop, TransitLeg
│   ├── data/
│   │   └── mockTrip.ts     # Tokyo 4-day trip with realistic coordinates & forecasts
│   ├── components/
│   │   ├── Header.tsx           # App bar with Readiness Ring & Rust WASM badge
│   │   ├── DaySelector.tsx      # Day tabs with weather icons and temperature
│   │   ├── WeatherBanner.tsx    # Detailed daily weather prediction & hourly stream
│   │   ├── TimelineCard.tsx     # Tactile stop card with category & ticket tags
│   │   ├── DistancePill.tsx     # Inter-stop transit & distance connector
│   │   ├── InteractiveMap.tsx   # SVG vector route map with numbered pins
│   │   ├── ReadinessModal.tsx   # Trip readiness checklist drawer
│   │   └── StopDetailModal.tsx  # Stop details with 1-tap navigation
│   ├── App.tsx             # Master application component with dual-pane layout
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
