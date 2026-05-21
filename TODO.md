# 📋 Roammate — Project Tasklist & Product Roadmap

---

## ✅ Completed Milestones

### Architecture & Monorepo Split
- [x] Extract all calculation and optimization logic into `@mojolog/core` (pure, zero I/O).
- [x] Create standalone typed `@mojolog/api-client` for web client and external clients.
- [x] Implement storage-agnostic `@mojolog/sync` engine with offline outbox and last-write-wins conflict resolution.
- [x] Convert `apps/web` into a static SPA with zero database drivers and zero local credential verification.
- [x] Implement Bearer JWT authentication, `/sync/pull`, `/sync/push`, and origin-restricted CORS on `apps/api`.
- [x] Configure independent deployment scripts for Cloudflare Pages (`npm run deploy:web`) and Cloudflare Workers (`npm run deploy:api`).

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
- [x] Visual consistency: unified voucher and flight card geometry, stable text truncation, category icons.

---

## 🚀 Active Roadmap: Incomplete Tasks

### Phase 7 — Authentication & Device Persistence
- [x] Gate private planner access behind login with bearer JWT token and guest mode fallback.
- [x] Keep device session active across browser restarts until token expiry or manual logout.
- [ ] Restore last active page and active trip state automatically after browser reopening or hard reset.

### Phase 8 — Trip Identity & Collaboration
- [ ] Add unique trip IDs and unique usernames.
- [ ] Define one trip-code invitation flow for both inviter and invitee.
- [ ] Let invitees request to join with a username; show request to inviter with accept/decline actions.
- [ ] Grant shared-trip access only after the inviter approves the request.

### Phase 9 — First-Run Onboarding
- [ ] Add an interactive step-by-step tutorial for new users and persist its completion state.

### Phase 10 — Stay-Aware Itinerary
- [ ] Treat hotels/stays as itinerary locations.
- [ ] Use a stay as the trip's start and end location by default until the user changes either point.

### Phase 11 — Map Workspace & Focus
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
