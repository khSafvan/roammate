# roammate — Project Tasklist & Product Roadmap

---

## ✅ Completed Work

### Phase 1 — Critical Bug Fixes (16 bugs)
All MapLibre, weather, vault, timeline, and branding bugs resolved.

### Phase 2 — Stop & Day CRUD + Route Timing
Add/edit/delete stops and days; chronological TSP start-time re-flow.

### Phase 3 — Wanderlog Core (F1–F3) + Optimize/Undo
Places to Visit drawer (OSM search), group expense settlement, optimize route modal with undo stack.

### Phase 4 — Travel Utilities (F6–F10)
Schedule conflict detection, categorized packing lists, iCalendar export, scratchpad & notes, printable travel packet. All 87 unit tests passing.

---

## 🚧 Phase 5 — Design Language Implementation

Apply the cohesive design language defined in `DESIGN_LAWS.md` across the entire codebase.

### 5A — Token Extensions (`variables.css`)
- [ ] Add typography scale tokens (`--font-xs` through `--font-2xl`, `--fw-*`, `--leading-*`)
- [ ] Add spacing scale tokens (`--sp-1` through `--sp-16`)
- [ ] Add touch target tokens (`--tap-min: 44px`, `--tap-md: 48px`)
- [ ] Add animation tokens (`--ease-spring`, `--t-fast`, `--t-normal`)

### 5B — Utility Layer (`utilities.css` — new file)
- [ ] Create `apps/web/src/styles/utilities.css`
- [ ] Define layout utilities: `.flex`, `.flex-col`, `.flex-center`, `.items-center`, `.justify-between`, `.flex-1`, `.flex-shrink-0`, `.w-full`, `.block`, `.inline`
- [ ] Define gap utilities: `.gap-1` through `.gap-4`
- [ ] Define margin/padding utilities: `.mt-*`, `.mb-*`, `.mr-*`, `.ml-*`, `.px-*`, `.py-*`
- [ ] Define typography utilities: `.text-xs`, `.text-sm`, `.text-lg`, `.text-primary`, `.text-secondary`, `.text-tertiary`, `.text-rose`, `.text-amber`, `.text-emerald`, `.text-blue`, `.text-slate`, `.text-white`, `.text-uppercase`, `.font-mono`, `.font-medium`, `.font-bold`, `.font-sans`, `.leading-tight`
- [ ] Define animation utilities: `.animate-spin`, `.animate-spin-slow`
- [ ] Define component utilities: `.empty-state-box`, `.empty-state-text`, `.empty-hint`, `.count-tag`, `.modal-actions-row`, `.modal-type-tabs`, `.full-span`, `.bg-blue-subtle`
- [ ] Import `utilities.css` last in `index.css`

### 5C — Form Primitives (`modals.css`)
- [ ] Define `.form-group`, `.form-label`, `.form-input`, `.form-row-2`
- [ ] Enforce: 8px radius, 44px min-height, blue focus ring at 12% opacity
- [ ] Add `font-size: 16px` override for mobile to prevent iOS auto-zoom
- [ ] Collapse `.form-row-2` to single column on mobile (< 640px)

### 5D — Settings Page Classes (`subviews.css`)
- [ ] Define `.settings-content-container`, `.settings-icon-node`, `.danger-node`
- [ ] Define `.settings-section-title`, `.settings-section-subtitle`
- [ ] Define `.settings-fields-stack`, `.settings-action-row`, `.settings-danger-row`
- [ ] Define `.breadcrumb-back-btn` (min-height: 44px)
- [ ] Define `.color-swatch-row`
- [ ] Fix `.settings-card` hardcoded `#FFFFFF` → `var(--bg-card)`

### 5E — TripsListPage Classes (`subviews.css`)
- [ ] Define `.trips-hero-content`, `.trips-toolbar-row`, `.trips-empty-state`
- [ ] Define `.trip-card-cover-bar`, `.trip-card-header`, `.trip-card-header-main`, `.trip-card-heading`
- [ ] Define `.trip-card-meta-row`, `.trip-destination-pill`, `.trip-card-metrics-strip`, `.trip-meta-item`
- [ ] Define `.days-count-pill`, `.trip-readiness-pill`, `.trip-companions-row`
- [ ] Define `.trip-card-actions-row`, `.trip-card-secondary-btns`, `.open-trip-primary-btn`, `.trip-card-delete-prompt`

### 5F — Component-Specific Missing Classes (`subviews.css`)
- [ ] PlacesToVisit: `.places-to-visit-container`, `.search-and-travelers-bar`, `.search-input-box`, `.search-field`, `.clear-search-btn`, `.category-filter-strip`
- [ ] Expenses / Flights: `.expenses-container`, `.flights-container`
- [ ] Misc: `.companion-tags-group`, `.companion-tag`, `.companion-tag-more`, `.travelers-label`, `.travelers-chip-group`
- [ ] Timeline: `.timeline-axis-node`, `.add-day-tab-btn` (min-height: 44px)
- [ ] Map: `.map-toolbar-actions`, `.map-metrics`, `.metric-tag`
- [ ] Auth: `.auth-success-banner`, `.guest-sub-badge`

### 5G — Circular Corner Fixes
- [ ] `layout.css` — `.guest-error-icon`: `border-radius: 50%` → `var(--radius-lg)`
- [ ] `timeline.css` — `.flight-node-badge`: `border-radius: 50%` → `var(--radius-md)`
- [ ] `OptimizeRouteModal.tsx` — 2× inline `borderRadius: '50%'` → `'var(--radius-lg)'`

### 5H — Responsive Expansion (`responsive.css`)
- [ ] Add 768px mid-tablet breakpoint (header padding, subview padding)
- [ ] Add touch target enforcement for primary buttons and nav tabs (`min-height: var(--tap-min)`)
- [ ] Mobile bottom-sheet modals (< 640px): `.modal-backdrop` aligns to bottom, `.modal-card` gets top-only rounded corners
- [ ] Enforce `body { font-size: 16px }` on mobile
- [ ] Add desktop line-length cap (> 1280px): `.subview-workspace` max-width 960px

### 5I — `DESIGN_LAWS.md` (repo root)
- [ ] Write canonical design law document at `/DESIGN_LAWS.md`
- [ ] Covers: 8 principles, token reference tables, spacing scale, radius rules, color palette, typography scale, shadow system, breakpoints, touch rules, component patterns, naming convention, icon rules, do/don't cheat sheet

---

## 🧪 Verification

```bash
npm test         # Must remain 87/87 passing
npm run build    # Must produce 0 TypeScript errors
```
