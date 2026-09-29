# 📋 Roammate — Project Tasklist & Product Roadmap

---

## ✅ Completed Milestones

### Architecture & Monorepo Split
- [x] Extract all calculation and optimization logic into `@mojolog/core` (pure, zero I/O).
- [x] Create standalone typed `@mojolog/api-client` for web client and external clients.
- [x] Implement storage-agnostic `@mojolog/sync` engine with offline outbox and last-write-wins conflict resolution.
- [x] Convert `apps/web` into a static SPA with zero database drivers and zero local credential verification.
- [x] Implement Single-User PASSCODE authentication (`PASSCODE` / `AUTH_PASSCODE` Worker secret), `/sync/pull`, `/sync/push`, and origin-restricted CORS on `apps/api`.
- [x] Configure independent CI/CD pipelines (`deploy-web.yml`, `deploy-api.yml`) and deploy scripts (`npm run deploy:web`, `npm run deploy:api`).

### Core Features (Phases 1–6)
- [x] TerraWay 2D vector map engine with MapLibre GL & OpenFreeMap styles.
- [x] Multi-modal routing (flights, nautical ferry fairways, road routes, walking corridors).
- [x] Traveling Salesperson (2-opt TSP) route optimizer with meal windows (lunch/dinner) and attraction opening hours.
- [x] Multi-traveler group expense tracker with greedy Settle Up debt minimization.
- [x] Schedule conflict detection between consecutive stops.
- [x] RFC/Topografix GPX 1.1 XML and RFC 5545 iCalendar (`.ics`) export.
- [x] Flight boarding pass cards with live FlightRadar24 links.
- [x] Live ECB currency conversion via Frankfurter API.
- [x] Daylight, sunset & golden hour photography timing via Open-Meteo.
- [x] Bank and public holiday destination alerts via Nager.Date.
- [x] Country intelligence database (emergency contacts, electrical plug types, driving sides).
- [x] Instant POI discovery chips in Places to Visit drawer.
- [x] Context-aware & Fuzzy Place Search (destination-biased Nominatim querying + Levenshtein fuzzy ranking).
- [x] Automatic Schedule & Time Recalculation (sequential start/end time updates on drag-and-drop, stop additions, and idea bucket assignments).
- [x] Visual consistency: unified voucher and flight card geometry, stable text truncation, category icons.

---

## 🚀 Active Roadmap: Incomplete Tasks

### Phase 7 — Authentication & Personal Vault Storage
- [x] Gate private planner access behind PASSCODE verification with guest mode fallback.
- [x] Keep personal vault session active across browser restarts until manual lock.
- [x] Single-user personal storage model: all trips sync directly to the user's edge database.

### Phase 8 — First-Run Onboarding
- [ ] Add an interactive step-by-step tutorial for new users and persist its completion state.

### Phase 9 — Stay-Aware Itinerary
- [x] Treat hotels/stays as itinerary locations with continuity across days.
- [x] Render Stay Hub Banner showing active hotel base and check-in anchors.
- [x] Use stay anchors for daily routing context and hotel switching.

### Phase 10 — Map Workspace & Focus
- [ ] Keep itinerary focus and map focus synchronized for stops and places to visit.
- [ ] Show focused-place details and notes in a lower map information panel, including user-added places.
- [ ] Use a half-screen map beside the itinerary on desktop.
- [ ] Use separate full-screen itinerary and map views on mobile, with a clear back path from place details.
- [ ] Keep map markers above other map overlays with the highest marker z-index.

---

## 🧪 Verification

```bash
npm test         # Must maintain 100% pass rate
npm run build    # Must produce 0 TypeScript errors
```
