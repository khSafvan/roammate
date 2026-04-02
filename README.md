# ✈️ roammate — Responsive React + Rust/WASM Trip Planner

> A fully offline-capable, privacy-first trip planning web app with a **TerraWay 2D GPX vector map engine**, a native **Rust WebAssembly TSP route optimizer**, and a cryptographic **BIP-39 seed vault**.

---

## ⚡ Rust WebAssembly Engine (`rust-core`)

All core math, geospatial, and combinatorial optimization routines are written in **Rust** and compiled to **WebAssembly** via `wasm-pack`:

| Function | Description |
|---|---|
| `wasm_haversine_distance_km` | High-precision spherical distance between two coordinates |
| `wasm_estimate_duration_minutes` | Multi-modal transit modeling (Drive, Walk, Transit with station buffers) |
| `wasm_optimize_route_tsp` | 2-opt TSP algorithm resequencing stops to minimize total travel distance |
| `wasm_weather_comfort_label` | Comfort scoring combining temperature, humidity, UV, and precipitation |

---

## 🌟 Features

- **Dual-Pane Split Screen (Desktop)** — Day selector, weather forecast, 1-click TSP optimizer, and timeline cards on the left; TerraWay vector map with GPX polyline on the right.
- **Stop & Day CRUD** — Add, edit, delete, and move stops between days. Add or remove trip days with auto-dating.
- **Route Optimizer with Undo** — 2-opt TSP preview modal showing before/after savings; replace or revert.
- **Places to Visit Drawer** — Unscheduled ideas bucket with OSM/Nominatim geocoding search and day assignment.
- **Expense Tracker & Debt Settlement** — Multi-traveler balances, category totals, and greedy Settle Up debt minimization.
- **Schedule Conflict Detection** — Transit conflict warnings (`⚠️ Late by Xm`) between consecutive stops.
- **Categorized Packing Lists** — 5-category checklist with progress bar in the Readiness hub.
- **iCalendar Export** — RFC 5545 compliant `.ics` download for Google/Apple/Outlook calendar sync.
- **Scratchpad & Notes** — Trip-level emergency contacts, general notes, and per-day notes.
- **Printable Travel Packet** — Clean `@media print` layout for offline paper backup.
- **TerraWay GPX Export** — RFC/Topografix GPX 1.1 XML for Garmin, Strava, and offline GPS.
- **Flight Boarding Passes** — IATA route cards with live FlightRadar24 deep-links.
- **BIP-39 Seed Vault** — 12-word mnemonic cryptographic auth, zero SMS costs, zero lock-in.
- **Offline-First PWA** — Service Worker caches app shell, styles, and WASM binary for 100% offline access.

---

## 🛠️ Monorepo Architecture

```
roammate/
├── apps/
│   ├── web/                    # React 18 + Vite + WASM Frontend SPA
│   │   ├── src/
│   │   │   ├── auth/           # BIP-39 mnemonic generation & Web Crypto SHA-256
│   │   │   ├── components/     # React UI components & modal system
│   │   │   ├── hooks/          # useVault, useTransitLegs, useTripOptimization
│   │   │   ├── pkg/            # Compiled WASM binary & JS bindings
│   │   │   ├── styles/         # 9-layer modular CSS design system
│   │   │   │   ├── variables.css   # Design tokens (color, spacing, radius, type)
│   │   │   │   ├── base.css        # Reset & global primitives
│   │   │   │   ├── layout.css      # Header, nav, workspace, map pane
│   │   │   │   ├── timeline.css    # Day selector, timeline cards, distance pills
│   │   │   │   ├── map.css         # MapLibre container & floating UI
│   │   │   │   ├── subviews.css    # Settings, trips list, subview pages
│   │   │   │   ├── modals.css      # Modal system & form primitives
│   │   │   │   ├── responsive.css  # Breakpoints & touch target enforcement
│   │   │   │   ├── utilities.css   # Utility class layer (spacing, color, layout)
│   │   │   │   └── print.css       # @media print travel packet styles
│   │   │   ├── utils/          # GPX exporter, iCal generator, expense settlement
│   │   │   └── wasm/           # WASM loader & JS fallbacks
│   │   └── tests/              # Vitest unit tests (87 passing)
│   │
│   └── api/                    # Cloudflare Worker + Hono Edge API
│       ├── src/index.ts        # Edge auth, sync, share, 90-day auto-pruning
│       ├── schema.sql          # Turso (libSQL) database schema
│       └── wrangler.toml       # Edge deployment config
│
├── packages/
│   ├── shared/                 # Shared types & constants (@mojolog/shared)
│   │   └── src/
│   │       ├── types.ts        # Trip, TripDay, ItineraryStop, Flight, Expense, PackingItem
│   │       └── constants.ts    # Storage keys, 90-day retention, transit speeds
│   │
│   └── rust-core/              # Computational core → WebAssembly
│       └── src/lib.rs          # TSP 2-opt, Haversine, comfort index
│
├── README.md
├── DEPLOYMENT.md
├── TODO.md
└── DESIGN_LAWS.md              # Design system rules & token reference
```

---

## 🚀 Commands

```bash
npm run dev          # Start Vite dev server at http://localhost:3000
npm test             # Run Vitest unit tests (87 tests)
npm run build        # TypeScript check + production bundle → apps/web/dist/
npm run dev:api      # Start local Cloudflare Worker (Wrangler)
npm run build:wasm   # Recompile Rust → WebAssembly (wasm-pack)
```

---

## 🎨 Design System

roammate uses a hand-authored modular CSS design system — no Tailwind, no CSS-in-JS, no UI kit dependencies. All rules are documented in **[DESIGN_LAWS.md](DESIGN_LAWS.md)**.

**Core principles:**
- **Minimalist** — every element earns its place; whitespace is structure, not filler
- **Flat design** — shapes and solid color, no gradients, no fake 3D; subtle shadows for elevation only
- **Rounded, not circular** — 4/8/12/16/20/24px radius scale; `9999px` pill only for chips and tags; `50%` only for avatars/status dots
- **4px spacing grid** — all padding and margin values are multiples of 4 (`4, 8, 12, 16, 20, 24, 32, 48, 64`)
- **Responsive & touch-first** — 44px minimum touch targets, 768px + 1024px breakpoints, 16px minimum body font

**Token quick-reference:**

| Token | Value | Use |
|---|---|---|
| `--brand-blue` | `#2563EB` | Primary CTAs, active states, focus rings |
| `--brand-emerald` | `#10B981` | Success, completion, checked |
| `--brand-rose` | `#EF4444` | Danger, delete, errors |
| `--brand-amber` | `#F59E0B` | Warning, conflict alerts |
| `--bg-canvas` | `#F8F9FA` | App background |
| `--bg-card` | `#FFFFFF` | Card & modal surfaces |
| `--bg-subtle` | `#F1F3F5` | Muted backgrounds, inputs |
| `--text-primary` | `#0F172A` | All primary labels |
| `--text-secondary` | `#64748B` | Meta-info, subtitles |
| `--text-tertiary` | `#94A3B8` | Placeholders, hints, labels |
| `--radius-sm` | `8px` | Inputs, small interactive elements |
| `--radius-md` | `12px` | Icon nodes, small cards |
| `--radius-card` | `20px` | Timeline cards, modals |
| `--radius-pill` | `9999px` | Chips, tags, nav tabs |
| `--shadow-card` | very subtle multi-layer | Cards at rest |
| `--shadow-modal` | deeper | Floating modals & drawers |

See [DESIGN_LAWS.md](DESIGN_LAWS.md) for the complete rule set, utility class reference, component patterns, and do/don't cheat sheet.

---

## 📖 Deployment

Full setup guide for Turso database, Cloudflare Workers, and production deployment:

👉 **[DEPLOYMENT.md](DEPLOYMENT.md)**
