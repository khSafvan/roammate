# roammate — Project Tasklist & Product Roadmap

An exhaustive, trackable record of all identified code bugs, edge cases, data desync issues, and missing Wanderlog feature parity gaps for **roammate**.

---

## 🪲 Section 1: Bug Catalog (20 Identified Issues)

### 🔴 Critical Severity

- [ ] **Bug 16: MapLibre WebGL Instance Destroyed on Every Stop Click**
  - **File**: `apps/web/src/components/InteractiveMap.tsx` (line 526)
  - **Problem**: The map initialization `useEffect` lists `[updateWaypointLayer, updateRouteLayer, fitToStops]` in its dependency array. `updateWaypointLayer` changes identity whenever `selectedStopId` changes.
  - **Impact**: Clicking any stop tears down the map (`map.remove()`), destroying the WebGL context and re-instantiating `new MapLibreMap()`. Causes canvas flicker, tile re-downloads, and lost pan/zoom position.
  - **Remediation**: Run map initialization once on mount (`[]`), and update layers/markers dynamically via GPU GeoJSON source `setData`.

- [ ] **Bug 1: Day 1 Flight Date Filter Hardcoded to Legacy Dates**
  - **File**: `apps/web/src/App.tsx` (line 135)
  - **Problem**: `dayFlights` memo filter has hardcoded date checks:
    ```typescript
    (activeDayIdx === 0 && (!f.date || f.date.includes('2026-10-14') || f.date.includes('2027-05-10')))
    ```
  - **Impact**: Day 1 companion flights fail to display for Dubai (`2027-01-07`), Malaysia (`2026-11-08`), or any user-created trip.
  - **Remediation**: Dynamically match `f.date` against `activeDay.dateStr`, `trip.startDate`, or normalized ISO dates (`YYYY-MM-DD`).

- [ ] **Bug 9: Offline State Desync in Vault**
  - **File**: `apps/web/src/hooks/useVault.ts` (lines 156–164)
  - **Problem**: When `vaultSession` is active, `setActiveTripIdLocal` and `localStorage.setItem` are bypassed.
  - **Impact**: If edge sync is delayed, fails, or user is offline, local storage has stale trip data and fails to restore the active trip on page reload.
  - **Remediation**: Always write to `localStorage` and call `setActiveTripIdLocal` synchronously before triggering background edge sync.

- [ ] **Bug 5: No "+ Add Place / Stop" Action in Timeline**
  - **File**: `apps/web/src/App.tsx` (lines 477–504)
  - **Problem**: The itinerary timeline stream has no button or dialog to add a new stop or activity.
  - **Impact**: Users cannot build or customize itineraries beyond pre-seeded mock data.
  - **Remediation**: Add an "+ Add Place to Day" action bar and place creation modal in the timeline.

---

### 🟠 High Severity

- [ ] **Bug 4: Read-Only Stop Modal (No Edit or Delete)**
  - **File**: `apps/web/src/components/StopDetailModal.tsx`
  - **Problem**: `StopDetailModal` is completely static read-only text.
  - **Impact**: Users cannot edit stop title, time, duration, address, confirmation code, or notes, nor can they delete a stop or move it to another day.
  - **Remediation**: Add Edit Mode toggle, Delete with confirmation, and "Move to Day..." selector.

- [ ] **Bug 6: No Day Creation or Deletion in Workspace**
  - **Files**: `apps/web/src/components/DaySelector.tsx`, `apps/web/src/App.tsx`
  - **Problem**: No "+ Add Day" button in `DaySelector` and no day deletion action.
  - **Impact**: Trip duration is locked to initial seed length; users cannot add Day 8, Day 9, or remove empty days.
  - **Remediation**: Add `+ Add Day` tab pill at the end of `DaySelector` and day management actions in the header/banner.

- [ ] **Bug 10: White Screen Crash on Undefined Weather**
  - **Files**: `apps/web/src/components/WeatherBanner.tsx` (line 41), `apps/web/src/components/DaySelector.tsx` (line 52)
  - **Problem**: Directly accesses `weather.tempC`, `weather.condition`, and calls `getWeatherComfortLabel(weather.tempC, ...)` without null-checking `weather`.
  - **Impact**: Newly created days or imported itineraries lacking weather data crash the entire app.
  - **Remediation**: Provide safe fallback weather defaults: `const w = weather || DEFAULT_DAY_WEATHER;`.

- [ ] **Bug 17: Timeline Stop Click Does Not Highlight Marker on Map**
  - **Files**: `apps/web/src/App.tsx`, `apps/web/src/components/InteractiveMap.tsx`
  - **Problem**: `InteractiveMap` does not receive `selectedStopId` as a prop; it only maintains internal state.
  - **Impact**: Clicking a stop card in the timeline opens the detail modal but fails to highlight or pan the map marker.
  - **Remediation**: Pass `selectedStopId` and an `onFocusStop` handler to `InteractiveMap`.

- [ ] **Bug 19: Crash on Undefined Address in TimelineCard**
  - **File**: `apps/web/src/components/TimelineCard.tsx` (line 83)
  - **Problem**: `stop.address.split(',')[0]` throws `TypeError` if `stop.address` is undefined or null.
  - **Impact**: Adding a stop without an address or importing POIs without address metadata crashes the timeline list.
  - **Remediation**: Use `(stop.address || '').split(',')[0] || 'Location pending'`.

- [ ] **Bug 20: Documents Search Filter Crash on Missing Flight Attributes**
  - **File**: `apps/web/src/components/documents/DocumentsAndTicketsHub.tsx` (lines 133–135)
  - **Problem**: `f.carrier.toLowerCase()` and `f.departure.airport.toLowerCase()` lack optional chaining.
  - **Impact**: Any flight object with missing carrier or departure metadata crashes the entire search filter loop.
  - **Remediation**: Add optional chaining: `f.carrier?.toLowerCase()?.includes(q)`.

- [ ] **Bug 2: DaySelector Date String Parsing Fragility**
  - **File**: `apps/web/src/components/DaySelector.tsx` (line 48)
  - **Problem**: `<span className="day-date">{day.dateStr.split(', ')[1]}</span>` assumes comma-space formatting.
  - **Impact**: If `dateStr` is `'2027-01-07'` or `'Day 1'`, `.split(', ')[1]` returns `undefined`, leaving the date pill blank.
  - **Remediation**: Safe formatter: `day.dateStr.includes(', ') ? day.dateStr.split(', ')[1] : day.dateStr`.

- [ ] **Bug 11: Missing Currencies in TripSettingsPage**
  - **File**: `apps/web/src/components/trips/TripSettingsPage.tsx` (line 38)
  - **Problem**: `CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'CAD', 'AUD', 'CHF', 'SGD']` omits `AED` and `MYR`.
  - **Impact**: Dubai (`AED`) and Malaysia (`MYR`) sample trips have their native currencies excluded from settings.
  - **Remediation**: Add `'AED'`, `'MYR'`, `'INR'`, `'THB'`, `'IDR'` to `CURRENCIES`.

- [ ] **Bug 12: Unsaved Theme Color in TripSettingsPage**
  - **File**: `apps/web/src/components/trips/TripSettingsPage.tsx` (lines 77–96)
  - **Problem**: Theme color swatch state (`themeColor`) is selected in the UI but never passed to `onUpdateTrip` or saved to `trip.days`.
  - **Impact**: Theme color changes are discarded upon clicking Save.
  - **Remediation**: Include `themeColor` in `onUpdateTrip` payload and apply to `days`.

---

### 🟡 Medium Severity

- [ ] **Bug 3: Hardcoded Dollar Sign in Expense Tracker**
  - **File**: `apps/web/src/components/ExpenseTracker.tsx` (lines 95, 121, 143, 183)
  - **Problem**: Hardcoded `$` displays `$ 12,450.00 AED` or `$ 1,200.00 EUR`.
  - **Remediation**: Implement a currency symbol mapping helper (`EUR` → `€`, `GBP` → `£`, `JPY` → `¥`, `AED` → `AED `, `MYR` → `RM `) or `Intl.NumberFormat`.

- [ ] **Bug 7: TSP Route Optimizer Inverts Chronological Stop Times**
  - **File**: `apps/web/src/hooks/useTripOptimization.ts` (lines 35–55)
  - **Problem**: 2-opt TSP reorders stops for shortest distance but leaves original `startTime` values unchanged.
  - **Impact**: Stops end up chronologically scrambled (e.g. 18:00 before 09:30).
  - **Remediation**: Re-flow stop start times chronologically starting from the day's departure time plus visit duration and transit leg durations.

- [ ] **Bug 13: Date Filter Raw String Comparison in TripsListPage**
  - **File**: `apps/web/src/components/trips/TripsListPage.tsx` (line 65)
  - **Problem**: `filter === 'upcoming'` relies on `t.endDate >= today` via raw string comparison without validating ISO format.
  - **Remediation**: Parse safely with `Date.parse()` or normalize to ISO `YYYY-MM-DD`.

- [ ] **Bug 14: Stale Modal State in TripManagerModal**
  - **File**: `apps/web/src/components/TripManagerModal.tsx` (lines 50–56)
  - **Problem**: Edit form fields are initialized via `useState(activeTrip...)` only once on mount.
  - **Impact**: Switching active trips leaves stale data in the edit form.
  - **Remediation**: Add a `useEffect` synchronizing form state whenever `activeTrip` changes.

- [ ] **Bug 18: `createDefaultTrip` Ignores Date Range**
  - **File**: `apps/web/src/auth/syncService.ts` (lines 368–433)
  - **Problem**: `createDefaultTrip(..., startDate, endDate)` always creates exactly 1 day (`days: [Day 1]`), even if dates specify 7 or 14 days.
  - **Remediation**: Calculate difference in days between `startDate` and `endDate` (up to 30 days) and generate sequential `TripDay` entries.

---

### ⚪ Low Severity

- [ ] **Bug 8: GPX Export Default Filename & Metadata Decoupled from Trip**
  - **File**: `apps/web/src/components/InteractiveMap.tsx` (line 542)
  - **Problem**: Passes static `'roammate Itinerary'` string instead of `activeTrip.title`.
  - **Remediation**: Pass `${trip.title} — Day ${day.dayNumber}` dynamically.

- [ ] **Bug 15: Leftover Legacy Branding in ReadinessModal**
  - **File**: `apps/web/src/components/ReadinessModal.tsx` (line 30)
  - **Problem**: Subtitle reads `"TripMojo checklist: essential prerequisites before you fly"`.
  - **Remediation**: Update to `"roammate travel readiness checklist"`.

---

## 🗺️ Section 2: Wanderlog Missing Feature Parity Matrix (10 Capabilities)

| # | Feature | Wanderlog Capability | roammate Status | Priority |
|---|---|---|---|---|
| **F1** | **Unassigned "Places to Visit" Bucket (Ideas Drawer)** | Unscheduled pool of places/attractions/restaurants that travelers want to visit but haven't yet assigned to a specific day or time. Users can drag or assign them to days later. | **Completely Missing** (Every stop must currently belong to a specific day) | **P0 (Core)** |
| **F2** | **Interactive Place Search & Autocomplete (Geocoding)** | Search bar where typing a place ("Louvre", "Petronas Towers", "Starbucks") queries a geocoder/POI database (OpenStreetMap / Nominatim) to automatically fetch coordinates, address, and place category. | **Completely Missing** (Stops require manual coordinate/address entry) | **P0 (Core)** |
| **F3** | **Expense Splitting & Debt Settlement ("Who Owes Whom")** | Splitwise-like group balances: multi-traveler split allocation (split equally or specific amounts), net balances summary ("Alex is owed $45, Taylor owes $45"), and "Settle Up" debt simplification. | **Completely Missing** (Only flat `paidBy: string` with no split logic or settlement) | **P0 (Core)** |
| **F4** | **Stop CRUD (Add, Edit, Delete, Reorder)** | Complete modal/form to edit stop title, address, time, duration, notes, category, and delete or reorder stops up/down. | **Completely Missing** (Stops are read-only) | **P0 (Core)** |
| **F5** | **Day CRUD (Add Day, Delete Day, Reorder Days)** | Button to append new days, extend trip date range, or delete days with their scheduled stops. | **Completely Missing** (Fixed days array) | **P0 (Core)** |
| **F6** | **Schedule Overlap & Transit Conflict Detection** | Warning pill between stops if `Stop A endTime + transitDuration > Stop B startTime`, alerting travelers that they will arrive late. | **Completely Missing** (No validation) | **P1** |
| **F7** | **Categorized Packing Lists** | Full packing checklist categorized into Clothes, Toiletries, Electronics, Documents, Essentials with progress bars and item management. | **Completely Missing** (Only 4 static readiness items) | **P1** |
| **F8** | **iCalendar (`.ics`) Export / Calendar Sync** | Downloadable `.ics` calendar feed containing all flights, hotel stays, and timed itinerary stops to sync with Google Calendar, Apple Calendar, and Outlook. | **Completely Missing** (Only GPX and raw JSON) | **P1** |
| **F9** | **Trip Scratchpad & General Notes** | Trip-level and day-level free-form notes section for emergency contacts, embassy addresses, packing reminders, and wifi passwords. | **Completely Missing** (Only brief stop notes) | **P1** |
| **F10**| **Printable Travel Packet View (`@media print`)** | Clean, formatted printer-friendly layout for printing physical emergency travel packets with flight confirmations, vouchers, and daily schedules. | **Completely Missing** (Standard web layout only) | **P2** |

---

## 🚀 Section 3: Phased Execution Roadmap

### Phase 1: Critical & High Severity Bug Fixes (Bugs 1–3, 8–20)
- [ ] Fix MapLibre WebGL context recreation on stop click (Bug 16)
- [ ] Dynamic flight date matching for Day 1 companion flights (Bug 1)
- [ ] Synchronous local storage update on vault save (Bug 9)
- [ ] Safe weather fallback in WeatherBanner and DaySelector (Bug 10)
- [ ] Connect timeline stop click to map marker highlight & flyTo (Bug 17)
- [ ] Safe address split in TimelineCard (Bug 19)
- [ ] Optional chaining in DocumentsAndTicketsHub search filter (Bug 20)
- [ ] Safe date string splitting in DaySelector (Bug 2)
- [ ] Dynamic currency formatting in ExpenseTracker (Bug 3)
- [ ] Add missing currencies (AED, MYR, etc.) in TripSettingsPage (Bug 11)
- [ ] Persist theme color swatch updates to trip days (Bug 12)
- [ ] Safe date comparison in TripsListPage (Bug 13)
- [ ] Sync activeTrip in TripManagerModal (Bug 14)
- [ ] Multi-day date span calculation in `createDefaultTrip` (Bug 18)
- [ ] Dynamic GPX metadata naming (Bug 8)
- [ ] Remove legacy "TripMojo" branding in ReadinessModal (Bug 15)

### Phase 2: Stop & Day CRUD + Route Timing (Bugs 4–7, Features F4–F5)
- [ ] Add "+ Add Place" action in timeline stream (Bug 5, Feature F4)
- [ ] Interactive Stop Modal with edit, delete, and "Move to Day" (Bug 4, Feature F4)
- [ ] "+ Add Day" and "Delete Day" actions in workspace (Bug 6, Feature F5)
- [ ] Chronological start time re-flow after 2-opt TSP optimization (Bug 7)

### Phase 3: Wanderlog Core Capabilities (Features F1–F3)
- [ ] Unassigned "Places to Visit" Bucket / Ideas Drawer (Feature F1)
- [ ] OpenStreetMap / Nominatim place search & geocoding autocomplete (Feature F2)
- [ ] Group expense splitting, "Who Owes Whom" balance sheet & "Settle Up" action (Feature F3)

### Phase 4: Travel Utilities Parity (Features F6–F10)
- [ ] iCalendar (`.ics`) RFC 5545 export for Google/Apple Calendar (Feature F8)
- [ ] Categorized packing list with progress metrics (Feature F7)
- [ ] Schedule transit conflict warning alerts (Feature F6)
- [ ] Trip scratchpad & general notes section (Feature F9)
- [ ] Printable travel packet `@media print` styling (Feature F10)

---

## 🧪 Verification & Testing Commands
- Unit Tests: `npm test`
- Production Build: `npm run build`
