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

### Phase 5 — Design Language Implementation
Cohesive design language applied across all styles, components, and responsive views matching `DESIGN_LAWS.md`. All 87 unit tests passing, zero build errors.

---

## ✅ Phase 5 Completed Checklist

### 5A — Token Extensions (`variables.css`)
- [x] Add typography scale tokens (`--font-xs` through `--font-2xl`, `--fw-*`, `--leading-*`)
- [x] Add spacing scale tokens (`--sp-1` through `--sp-16`)
- [x] Add touch target tokens (`--tap-min: 44px`, `--tap-md: 48px`)
- [x] Add animation tokens (`--ease-spring`, `--t-fast`, `--t-normal`)

### 5B — Utility Layer (`utilities.css` — new file)
- [x] Create `apps/web/src/styles/utilities.css`
- [x] Define layout utilities: `.flex`, `.flex-col`, `.flex-center`, `.items-center`, `.justify-between`, `.flex-1`, `.flex-shrink-0`, `.w-full`, `.block`, `.inline`
- [x] Define gap utilities: `.gap-1` through `.gap-4`
- [x] Define margin/padding utilities: `.mt-*`, `.mb-*`, `.mr-*`, `.ml-*`, `.px-*`, `.py-*`
- [x] Define typography utilities: `.text-xs`, `.text-sm`, `.text-lg`, `.text-primary`, `.text-secondary`, `.text-tertiary`, `.text-rose`, `.text-amber`, `.text-emerald`, `.text-blue`, `.text-slate`, `.text-white`, `.text-uppercase`, `.font-mono`, `.font-medium`, `.font-bold`, `.font-sans`, `.leading-tight`
- [x] Define animation utilities: `.animate-spin`, `.animate-spin-slow`
- [x] Define component utilities: `.empty-state-box`, `.empty-state-text`, `.empty-hint`, `.count-tag`, `.modal-actions-row`, `.modal-type-tabs`, `.full-span`, `.bg-blue-subtle`
- [x] Import `utilities.css` last in `index.css`

### 5C — Form Primitives (`modals.css`)
- [x] Define `.form-group`, `.form-label`, `.form-input`, `.form-row-2`
- [x] Enforce: 8px radius, 44px min-height, blue focus ring at 12% opacity
- [x] Add `font-size: 16px` override for mobile to prevent iOS auto-zoom
- [x] Collapse `.form-row-2` to single column on mobile (< 640px)

### 5D — Settings Page Classes (`subviews.css`)
- [x] Define `.settings-content-container`, `.settings-icon-node`, `.danger-node`
- [x] Define `.settings-section-title`, `.settings-section-subtitle`
- [x] Define `.settings-fields-stack`, `.settings-action-row`, `.settings-danger-row`
- [x] Define `.breadcrumb-back-btn` (min-height: 44px)
- [x] Define `.color-swatch-row`
- [x] Fix `.settings-card` hardcoded `#FFFFFF` → `var(--bg-card)`

### 5E — TripsListPage Classes (`subviews.css`)
- [x] Define `.trips-hero-content`, `.trips-toolbar-row`, `.trips-empty-state`
- [x] Define `.trip-card-cover-bar`, `.trip-card-header`, `.trip-card-header-main`, `.trip-card-heading`
- [x] Define `.trip-card-meta-row`, `.trip-destination-pill`, `.trip-card-metrics-strip`, `.trip-meta-item`
- [x] Define `.days-count-pill`, `.trip-readiness-pill`, `.trip-companions-row`
- [x] Define `.trip-card-actions-row`, `.trip-card-secondary-btns`, `.open-trip-primary-btn`, `.trip-card-delete-prompt`

### 5F — Component-Specific Missing Classes (`subviews.css`)
- [x] PlacesToVisit: `.places-to-visit-container`, `.search-and-travelers-bar`, `.search-input-box`, `.search-field`, `.clear-search-btn`, `.category-filter-strip`
- [x] Expenses / Flights: `.expenses-container`, `.flights-container`
- [x] Misc: `.companion-tags-group`, `.companion-tag`, `.companion-tag-more`, `.travelers-label`, `.travelers-chip-group`
- [x] Timeline: `.timeline-axis-node`, `.add-day-tab-btn` (min-height: 44px)
- [x] Map: `.map-toolbar-actions`, `.map-metrics`, `.metric-tag`
- [x] Auth: `.auth-success-banner`, `.guest-sub-badge`

### 5G — Circular Corner Fixes
- [x] `layout.css` — `.guest-error-icon`: `border-radius: 50%` → `var(--radius-lg)`
- [x] `timeline.css` — `.flight-node-badge`: `border-radius: 50%` → `var(--radius-md)`
- [x] `OptimizeRouteModal.tsx` — 2× inline `borderRadius: '50%'` → `'var(--radius-lg)'` / `'var(--radius-sm)'`

### 5H — Responsive Expansion (`responsive.css`)
- [x] Add 768px mid-tablet breakpoint (header padding, subview padding)
- [x] Add touch target enforcement for primary buttons and nav tabs (`min-height: var(--tap-min)`)
- [x] Mobile bottom-sheet modals (< 640px): `.modal-backdrop` aligns to bottom, `.modal-card` gets top-only rounded corners
- [x] Enforce `body { font-size: 16px }` on mobile
- [x] Add desktop line-length cap (> 1280px): `.subview-workspace` max-width 960px

### 5I — `DESIGN_LAWS.md` (repo root)
- [x] Write canonical design law document at `/DESIGN_LAWS.md`
- [x] Covers: 8 principles, token reference tables, spacing scale, radius rules, color palette, typography scale, shadow system, breakpoints, touch rules, component patterns, naming convention, icon rules, do/don't cheat sheet

### 5J — Design, UI/UX & Feature Bug Audit
- [x] Audited 607 CSS classes across all components; filled 20+ missing CSS classes into `subviews.css` and layout utilities into `utilities.css`
- [x] Added out-of-bounds `activeDayIdx` clamping `useEffect` in `App.tsx` preventing stop-add failures and TSP optimization crashes
- [x] Fixed trip switch state reset: resets `activeDayIdx` to 0 and exits Ideas bucket
- [x] Fixed Add Day tab activation: auto-switches to newly added day index and closes Ideas bucket
- [x] Fixed dynamic day search in `handleMoveStopToIdeas` (no longer hardcodes `activeDayIdx`)
- [x] Added 1-click `Back to Itinerary` navigation breadcrumb in `PlacesToVisitDrawer.tsx`
- [x] Replaced hardcoded `#F59E0B`, `#059669`, `#047857`, `#EF4444`, `#DC2626`, `#3B82F6` with semantic CSS variables across `ScratchpadModal`, `PlacesToVisitDrawer`, `OptimizeRouteModal`, `InteractiveMap`, `DistancePill`
- [x] Aligned `ExpenseTracker` view switcher with `.category-filter-strip` and `.category-filter-btn` pill design
- [x] Eliminated dead unreferenced `FlightTracker.tsx` component to reduce code bloat

---

## 🧪 Verification

```bash
npm test         # Must remain 87/87 passing
npm run build    # Must produce 0 TypeScript errors
```
