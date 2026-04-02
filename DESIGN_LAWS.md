# DESIGN_LAWS.md — roammate Design System

> The canonical rule set for every visual and interaction decision in this codebase.
> Before writing a new CSS class or inline style, read the relevant section.

---

## 0. Philosophy

This interface is built on one idea: **ruthless restraint applied consistently**.

A design language is not a style guide — it's a set of *laws* that every screen, component, and future addition must obey. When every element follows the same spacing scale, radius scale, color vocabulary, and elevation model, the interface feels like it was designed by one mind, not assembled from parts.

The throughline is: **one 4px spacing scale → one radius scale → one flat color vocabulary → one set of layout rules → applied consistently across every screen size and input method.**

---

## 1. Minimalism

**Remove everything that doesn't help the user understand or act.**

- **Whitespace is structure**, not decoration. Empty space makes the important things visible.
- **One primary accent color** (`--brand-blue`). Secondary colors only for semantic state: success (`--brand-emerald`), danger (`--brand-rose`), warning (`--brand-amber`).
- **Two or three font weights only**: 500 (medium), 600 (semibold), 700 (bold). Never mix more.
- **Every border, shadow, and icon communicates something** — hierarchy, grouping, interactivity. Pure decoration is not allowed.
- **Category tints** (flight, lodging, dining, transit, sightseeing) use 10–12% opacity fills — enough to signal type, not enough to compete with content.

**DO:**
- Use `--bg-subtle` as a neutral background wash to group related items
- Use spacing (not borders) as the primary way to separate elements

**DON'T:**
- Add a colored accent bar just to make a card "pop"
- Use more than one brand accent color on the same screen
- Add an icon purely for visual texture

---

## 2. Flat Design

**Shapes + solid color. No fake depth.**

- Buttons are defined by **color and border-radius**, not 3D lighting
- **No gradients** as primary fills (gradient overlays are allowed on map imagery)
- **No bevels, inner shadows, or emboss effects**
- **Shadows are allowed, but only for elevation** — to indicate that an element floats above the page (modals, floating action buttons, sticky header). Shadows use very low opacity (`rgba(15, 23, 42, 0.02–0.08)`)
- Icons are **Lucide** — geometric, consistent 1.75px stroke width at 12–18px size

**Shadow scale:**

| Token | When to use |
|---|---|
| `--shadow-sm` | Subtle lift on interactive pills, icon buttons |
| `--shadow-card` | Cards at rest |
| `--shadow-card-hover` | Cards on hover (paired with `translateY(-1px)`) |
| `--shadow-elevated` | Sticky header, floating docks |
| `--shadow-modal` | Modals, drawers, command palettes |

**DO:**
- Use `--shadow-card` on `.timeline-card`, `.weather-card`, `.map-view-card`
- Use `--shadow-modal` on `.modal-card`

**DON'T:**
- Use `box-shadow: 0 10px 40px rgba(0,0,0,0.3)` — too dramatic, too dark
- Use `text-shadow` anywhere

---

## 3. Rounded Corners — The Radius Scale

**Soft, not circular. Proportional to element size.**

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | `4px` | Tiny chips, inline code, checkbox |
| `--radius-sm` | `8px` | **Form inputs, small buttons, search boxes** |
| `--radius-md` | `12px` | **Icon nodes, compact cards, metric cells** |
| `--radius-lg` | `16px` | **Icon containers, notification banners** |
| `--radius-card` | `20px` | **Timeline cards, weather card, map card** |
| `--radius-2xl` | `24px` | **Modals, large drawers** |
| `--radius-pill` | `9999px` | **Nav tabs, chips, tags, badges, day selector tabs** |

**The rule:**
- `--radius-pill` (full pill) is for **navigation controls, chips, and small text badges** — elements where the pill shape communicates "interactive label" or "filter"
- `50%` (circle) is **only for avatars and single-color status dots**
- Everything else uses a proportional token from the scale above

**DO:**
- `.form-input { border-radius: var(--radius-sm); }` — 8px, not pill, not circle
- `.settings-icon-node { border-radius: var(--radius-md); }` — 12px square icon container
- `.modal-card { border-radius: var(--radius-2xl); }` — 24px for large floating surface

**DON'T:**
- `border-radius: 50%` on an icon container, error icon, or card
- Use `--radius-pill` on a full-width button or a card
- Mix `border-radius: 10px` (off-scale) with token-based values elsewhere

---

## 4. Spacing System — The 4px Grid

**All spacing is a multiple of 4.**

| Token | Value | Common use |
|---|---|---|
| `--sp-1` | `4px` | Icon gaps, tight label spacing |
| `--sp-2` | `8px` | Button padding (vertical), item gaps |
| `--sp-3` | `12px` | Card inner gap, form field gap |
| `--sp-4` | `16px` | Section spacing, form group gap |
| `--sp-5` | `20px` | Header padding |
| `--sp-6` | `24px` | Page-level padding (desktop) |
| `--sp-8` | `32px` | Large section gaps |
| `--sp-10` | `40px` | Component-level top/bottom spacing |
| `--sp-12` | `48px` | Page section top/bottom |
| `--sp-16` | `64px` | Bottom padding on pages |

**The rule:** Every `padding`, `margin`, `gap`, and `top/right/bottom/left` value in the codebase must be one of the values above (or a valid CSS shorthand combining two of them, e.g. `12px 24px`).

**Off-scale values that are allowed:**
- `2px` — for `margin-top: 2px` subtitle nudges (half of --sp-1, accepted)
- `3px` — for focus rings only (`box-shadow: 0 0 0 3px ...`)
- `6px` — for `gap: 6px` (`--sp-1` and a half, used in `.gap-1\.5`)

**DO:**
- `padding: var(--sp-2) var(--sp-3);` (8px 12px) for button/input padding
- `gap: var(--sp-4);` (16px) between form groups

**DON'T:**
- `padding: 9px 13px;` — 9 and 13 are off the 4px grid
- `margin-top: 5px;` — use 4px or 8px
- `gap: 7px;` — use 8px

---

## 5. Color System

### Primary & Neutrals

| Token | Hex | Use |
|---|---|---|
| `--bg-canvas` | `#F8F9FA` | App background (cool off-white) |
| `--bg-card` | `#FFFFFF` | Card and modal surfaces |
| `--bg-subtle` | `#F1F3F5` | Muted backgrounds, input fills |
| `--bg-subtle-hover` | `#E9ECEF` | Hover state for subtle backgrounds |
| `--bg-muted` | `#E2E8F0` | Dividers, placeholder regions |
| `--text-primary` | `#0F172A` | All primary text |
| `--text-secondary` | `#64748B` | Meta, subtitles, placeholder labels |
| `--text-tertiary` | `#94A3B8` | Hints, empty states, disabled |

### Brand & Semantic Accents

| Token | Hex | Use |
|---|---|---|
| `--brand-blue` | `#2563EB` | **Primary CTA, active states, focus rings** — the only primary action color |
| `--brand-blue-hover` | `#1D4ED8` | Hover state for brand-blue elements |
| `--brand-blue-subtle` | `rgba(37,99,235,0.08)` | Active tab background, selected state wash |
| `--brand-emerald` | `#10B981` | Success, completion, checked items |
| `--brand-rose` | `#EF4444` | Danger, delete, error states |
| `--brand-amber` | `#F59E0B` | Warning, conflict, attention |
| `--brand-coral` | `#F97316` | Accent for specific UI elements |

### Categorical Tints (10–12% opacity fills)

| Category | Background token | Foreground token |
|---|---|---|
| Flight | `--cat-flight-bg` | `--cat-flight-fg` (`#0284C7`) |
| Lodging | `--cat-lodging-bg` | `--cat-lodging-fg` (`#4F46E5`) |
| Sightseeing | `--cat-sight-bg` | `--cat-sight-fg` (`#E11D48`) |
| Dining | `--cat-dining-bg` | `--cat-dining-fg` (`#D97706`) |
| Transit | `--cat-transit-bg` | `--cat-transit-fg` (`#059669`) |

**The rules:**
- `--brand-blue` is the **one** high-saturation interactive anchor. Do not use it for decoration.
- Semantic colors (emerald, rose, amber) are **state-only** — they communicate meaning, not style.
- Use category tints at exactly 10–12% opacity, never full saturation.
- Use `--brand-blue-subtle` for active/selected state backgrounds, not a solid blue fill.

---

## 6. Typography System

### Font Stack

```
Primary: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
Monospace: 'JetBrains Mono', monospace  (booking refs, vault codes, UUID displays)
```

### Scale

| Token | Value | Role |
|---|---|---|
| `--font-xs` | `11px` | Labels, chips, badges, uppercase metadata |
| `--font-sm` | `12px` | Secondary info, sub-labels, small buttons |
| `--font-base` | `13.5px` | Card body copy, form inputs |
| `--font-md` | `15px` | Card titles, section headings |
| `--font-lg` | `18px` | Page-level headings, brand name |
| `--font-xl` | `22px` | Modal titles, key stats |
| `--font-2xl` | `28px` | Hero numbers (weather temp, large metrics) |

### Weight Rules

| Token | Value | Use |
|---|---|---|
| `--fw-normal` | `400` | Body copy, descriptions |
| `--fw-medium` | `500` | Navigation, secondary labels, ghost buttons |
| `--fw-semibold` | `600` | **Most UI text** — card titles, button labels, form labels |
| `--fw-bold` | `700` | Page headings, modal titles, brand name, key numbers |

### Line Height

| Token | Value | Use |
|---|---|---|
| `--leading-tight` | `1.25` | Headings, single-line labels |
| `--leading-normal` | `1.5` | Body text, form inputs |
| `--leading-relaxed` | `1.6` | Long-form notes, textarea content |

### Formatting Rules

- **Uppercase labels** use `text-transform: uppercase; letter-spacing: 0.4–0.5px;` and `--font-xs` — for section labels, metadata pills, category badges only
- **Tabular numbers** (`font-variant-numeric: tabular-nums`) on all time, distance, currency, and count values — use `.tabular` utility class
- **Line length cap** — body text containers max-width ~900–960px; never stretch edge-to-edge on wide screens
- **Minimum 16px on mobile** — `form-input`, `select`, `textarea` must have `font-size: 16px` at < 640px to prevent iOS auto-zoom

---

## 7. Borders

| Token | Value | Use |
|---|---|---|
| `--border-hairline` | `1px solid rgba(15,23,42,0.06)` | Barely visible dividers |
| `--border-subtle` | `rgba(15,23,42,0.04)` | Card inner sections, metric cells |
| `--border-light` | `rgba(15,23,42,0.08)` | **Default border** for cards, inputs, buttons |
| `--border-strong` | `rgba(15,23,42,0.14)` | Hover state border, active cards |
| `--border-dashed` | `1.5px dashed rgba(15,23,42,0.16)` | Distance connector, add-day pill |

**The rule:** Never use a hard `#CCC` or `#DDD` border. Always use the token. The slightly transparent approach allows borders to respond naturally to background color changes.

---

## 8. Responsive Breakpoints

| Breakpoint | Width | What changes |
|---|---|---|
| **Mobile** | `≤ 640px` | Single column, bottom-sheet modals, 16px inputs, nav label hide |
| **Tablet** | `≤ 768px` | Header padding tightens, subview padding reduces |
| **Tablet-L** | `≤ 1024px` | Dual-pane collapses to single column, mobile view switcher appears |
| **Desktop** | `> 1024px` | Dual-pane, persistent nav, hover states active |
| **Wide** | `≥ 1280px` | Content max-width cap: 900–960px for readability |

**Breakpoints are structural — they change layout, not just size.** A component should not simply shrink; it should reflow into a more appropriate layout for the available space.

---

## 9. Touch & Mobile Rules

- **Minimum tap target: 44×44px** (iOS HIG) — use `min-height: var(--tap-min)` on all interactive elements
- **Minimum gap between adjacent tap targets: 8px** — prevents mis-taps
- **No hover-only interactions** — anything revealed on desktop hover must have a tap-based equivalent on mobile
- **Bottom-anchored primary actions** on mobile where possible
- **Single-column layouts** by default; use `form-row-2` for 2-column inputs and ensure it collapses on mobile
- **Modal as bottom sheet** on mobile (< 640px) — `border-radius: var(--radius-2xl) var(--radius-2xl) 0 0`

---

## 10. Utility Class Reference

All utilities are defined in `apps/web/src/styles/utilities.css`.

### Layout
`.flex` · `.flex-col` · `.flex-center` · `.inline` · `.block` · `.items-center` · `.items-start` · `.justify-between` · `.justify-center` · `.flex-1` · `.flex-shrink-0` · `.w-full` · `.text-center` · `.text-right` · `.full-span`

### Gap (4px grid)
`.gap-1` (4px) · `.gap-1\.5` (6px) · `.gap-2` (8px) · `.gap-3` (12px) · `.gap-4` (16px)

### Margin
`.mt-0\.5` (2px) · `.mt-1` (4px) · `.mt-2` (8px) · `.mt-3` (12px) · `.mb-1` · `.mb-2` · `.mr-1` · `.ml-1`

### Padding
`.px-2` · `.px-2\.5` · `.py-1` · `.py-2\.5`

### Typography
`.text-xs` · `.text-sm` · `.text-base` · `.text-lg` · `.leading-tight`
`.text-primary` · `.text-secondary` · `.text-tertiary` · `.text-white` · `.text-rose` · `.text-amber` · `.text-emerald` · `.text-blue` · `.text-slate` · `.text-red-500`
`.font-normal` · `.font-medium` · `.font-semibold` · `.font-bold` · `.font-mono` · `.font-sans` · `.text-uppercase`

### Animation
`.animate-spin` · `.animate-spin-slow`

### Components
`.empty-state-box` · `.empty-state-text` · `.empty-hint` · `.count-tag` · `.modal-actions-row` · `.modal-type-tabs` · `.bg-blue-subtle`

---

## 11. Class Naming Convention

Follow **BEM-inspired component-first naming** with kebab-case:

```
[component]-[element]
[component]-[element]--[modifier]   (for state/variants, use a plain class instead of -- in this codebase)
```

**Examples:**
- `.timeline-card` — the card
- `.timeline-card:hover` — hover state via pseudo-class (not a modifier class)
- `.card-title`, `.card-subtitle`, `.card-footer-line` — card sub-elements
- `.day-tab-pill`, `.day-tab-pill.active` — pill + active modifier
- `.checklist-row`, `.checklist-row.completed` — row + state class

**Rules:**
- Component classes are **scoped to their CSS file** (e.g. `.modal-*` in `modals.css`, `.settings-*` in `subviews.css`)
- **Utility classes** (single-purpose: `.flex`, `.text-xs`) go in `utilities.css` only
- **Never put layout utilities in component files** — keep them in `utilities.css`
- **No `!important`** except in utility classes where cascade override is intentional

---

## 12. Form Component Pattern

All form fields follow this pattern:

```html
<div class="form-group">
  <label class="form-label">Field Name</label>
  <input type="text" class="form-input" placeholder="…" />
</div>
```

Rules enforced by `.form-input` CSS:
- `border-radius: var(--radius-sm)` — 8px, NOT pill, NOT circle
- `padding: var(--sp-2) var(--sp-3)` — 8px 12px
- `min-height: var(--tap-min)` — 44px touch target floor
- `border: 1px solid var(--border-light)` — flat single hairline, no shadows at rest
- Focus: `border-color: var(--brand-blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.12)` — flat design 2.0 focus ring

---

## 13. Button Hierarchy

| Class | Fill | When |
|---|---|---|
| `.primary-action-btn` | Brand blue solid | **One per view** — the primary action |
| `.primary-modal-btn` | Brand blue solid, full width | Primary action inside a modal |
| `.secondary-action-btn` | White card + border | Secondary / alternative actions |
| `.ghost-action-btn` | Transparent | Tertiary, destructive cancel, dismissal |
| `.icon-btn` | White + border, 36×36px | Toolbar icon controls |
| `.optimize-pill-btn` | Brand blue pill | Special CTA in timeline header |

---

## 14. Icon Rules

- **Library**: Lucide React only (`lucide-react`)
- **Default stroke width**: `strokeWidth={1.75}` — consistent thinness
- **Sizes by context**:
  - `size={12}` — inline text icons
  - `size={14}–size={15}` — label/button icons (most common)
  - `size={16}–size={18}` — section header icons
  - `size={22}–size={24}` — modal header icons, empty state illustrations
  - `size={36}` — large empty state (rare)
- **Color**: Inherit from parent (`color: currentColor`) unless the icon carries semantic meaning (use a `.text-*` utility)
- **No filled icons** unless Lucide provides both variants — always use the outlined version for consistency

---

## 15. Do / Don't Cheat Sheet

| ✅ DO | ❌ DON'T |
|---|---|
| Use `var(--radius-sm)` on inputs | Use `border-radius: 50%` on anything that isn't an avatar or status dot |
| Use `var(--sp-*)` spacing tokens | Use `padding: 9px 13px` or other off-grid values |
| Use `var(--brand-blue)` for the one primary CTA | Use brand blue as a decorative accent color |
| Use `--shadow-card` on cards, `--shadow-modal` on modals | Use heavy `rgba(0,0,0,0.3)` shadows |
| Keep tap targets `min-height: var(--tap-min)` (44px) | Make nav pills `height: 28px` with no padding compensation |
| Use `.form-input` for all text inputs | Write inline `style={{ border: '1px solid #ccc', borderRadius: '4px' }}` on inputs |
| Define new components in their owning CSS file | Add component-specific classes to `utilities.css` |
| Add utility classes to `utilities.css` | Write one-off layout utilities inside component CSS files |
| Use `strokeWidth={1.75}` on Lucide icons | Mix `strokeWidth={1}` and `strokeWidth={2}` randomly |
| Use `--border-light` for default card borders | Use `border: 1px solid #e2e8f0` hardcoded |
| Use `--text-primary` / `--text-secondary` for text | Use `color: #333` or `color: #666` directly |
| Use `font-size: 16px` on inputs at mobile breakpoint | Let iOS zoom in because input font is 13px |
| Write `box-shadow: 0 0 0 3px rgba(37,99,235,0.12)` for focus | Use `outline: 2px solid blue` for focus |
