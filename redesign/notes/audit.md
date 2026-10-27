# Site Audit

## Pages Audited
- `http://localhost:3000` (Main Dashboard / Trips View)
- Vault Auth Modal (Initial Load)

## Component & Style Inventory (Computed Values)

### Typography
- **Primary Font:** "Plus Jakarta Sans", Inter, -apple-system
- **Body Text:** 16px / 24px line-height, 400 weight. Color: `#0f172a` (slate-900)
- **H1:** 28px / 42px line-height, 800 weight. Color: `#0f172a` (slate-900)
- **H2 (Vault):** 22px / 33px line-height, 700 weight.
- **P (Secondary Text):** 14.5px / 21.75px line-height, 400 weight. Color: `#64748b` (slate-500)

### Colors & Backgrounds
- **Body Background:** `#f8fafc` (slate-50)
- **Primary Text:** `#0f172a`
- **Secondary Text:** `#64748b`
- **Button (Primary Pill):** `#065f46` (emerald-900) on `#10b981` with 8% opacity.

### Buttons & UI
- **Pill Buttons:** 12px font size, 500 weight, 6px 14px padding, 9999px border-radius.
- **Buttons found:** "Personal Vault", "Lock", "Plan New Trip", "All Journeys (0)", "Upcoming", "Completed", "Add Journey", "Create Your First Trip".

## Layout & Hierarchy
- **Header:** Contains "Personal Vault" lock indicator and "Plan New Trip" action.
- **Main Hero:** H1 "Where to next?", followed by tab filters (All Journeys, Upcoming, Completed).
- **Empty State:** Shows H3 "No journeys found" with a primary call to action "Create Your First Trip".

## Identified Issues
1. **Accessibility (Heading Order):** The vault modal uses an H2 without an H1. The main dashboard uses H1, but jumps to H3 in the empty state.
2. **Typography Consistency:** Buttons use "Arial" (fallback or inherited default) instead of the primary "Plus Jakarta Sans" font.
3. **Color Contrast:** The green button text (`#065f46`) on the very light green background (`rgba(16, 185, 129, 0.08)`) might pass, but needs strict checking.
4. **Interactive States:** Missing computed styles for focus/hover states on buttons.
5. **No distinct Nav element** used (semantic HTML issue).
