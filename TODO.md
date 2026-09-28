# 📋 Roammate — Project Tasklist & Product Roadmap

---

## ✅ Completed Milestones

### Architecture & Refactor
- [x] Extract all calculation and optimization logic into `@mojolog/core` (pure, zero I/O).
- [x] Create standalone typed `@mojolog/api-client` for web and future mobile clients.
- [x] Implement storage-agnostic `@mojolog/sync` engine with offline outbox and last-write-wins conflict resolution.
- [x] Convert `apps/web` into a static SPA with zero database drivers and zero local credential verification.
- [x] Implement Bearer JWT authentication, `/sync/pull`, `/sync/push`, and origin-restricted CORS on `apps/api`.
- [x] Configure independent CI/CD deployment pipelines for Cloudflare Pages (`deploy-web.yml`) and Cloudflare Workers (`deploy-api.yml`).

### Core Features
- [x] TerraWay 2D vector map engine with MapLibre GL & OpenFreeMap styles.
- [x] Multi-modal routing (flights, nautical ferry fairways, road routes, walking corridors).
- [x] Traveling Salesperson (2-opt TSP) route optimizer with meal windows and opening hours.
- [x] Multi-traveler group expense tracker with greedy Settle Up debt minimization.
- [x] Schedule conflict detection between consecutive stops.
- [x] RFC/Topografix GPX 1.1 XML and RFC 5545 iCalendar (`.ics`) export.
- [x] Flight boarding pass cards with live FlightRadar24 links.
- [x] 90-day inactivity retention pruning.

---

## 🚀 Active & Upcoming Roadmap

### Phase 1 — Enhanced Mobile Client
- [ ] Initialize React Native / Expo mobile app package in monorepo using `@mojolog/api-client` and `@mojolog/core`.
- [ ] Connect SQLite / AsyncStorage to `@mojolog/sync` storage interface on mobile.
- [ ] Share types and calculation tests across web and mobile apps.

### Phase 2 — Real-Time Collaboration & Trip Sharing
- [ ] Implement trip collaboration invites with granular permissions (Editor vs. Viewer).
- [ ] WebSocket / Cloudflare Durable Objects live cursor and update presence.
- [ ] In-app conflict notifications for concurrent multi-user edits.

### Phase 3 — Onboarding & Trip Templates
- [ ] Interactive walkthrough for first-time guest users.
- [ ] Curated trip templates (e.g. 7-Day Japan Golden Route, Amalfi Coast Roadtrip).
- [ ] 1-click template cloning into active user vault.

### Phase 4 — Stays & Lodging Intelligence
- [ ] Support lodging stays spanning multiple days as itinerary anchor points.
- [ ] Auto-calculate morning departure from hotel and evening return route.
- [ ] Booking confirmation PDF / email parser for automatic flight and hotel stop creation.
