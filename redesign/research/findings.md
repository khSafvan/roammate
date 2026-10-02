# Competitor Research & UI/UX Findings

## Competitor Analysis

### Wanderlog
- **Focus:** Comprehensive, visual trip planning.
- **Key UX:** Interactive maps alongside a flexible day-by-day itinerary builder. Highly visual interface using location imagery.
- **Differentiator:** Excels at collaborative planning with drag-and-drop mechanics and map integration on the same screen.

### TripIt
- **Focus:** Logistics and automation.
- **Key UX:** "Hands-off" organization by parsing emails. Density of information is high, presenting clean text-heavy lists.
- **Differentiator:** Speed and efficiency for the business/logistics-minded traveler. No "inspiration" bloat.

### Airbnb
- **Focus:** Discovery and booking.
- **Key UX:** Immersive, whitespace-heavy design with very high-quality photography. "I'm flexible" search lowers the friction of initial planning.
- **Differentiator:** Masterful use of large, rounded components, clear visual hierarchy, and a highly polished booking flow.

## UI/UX Best Practices for Travel Planners

1. **Minimize Friction:**
   Travel apps are often used on-the-go with one hand. Reduce the number of taps required to complete tasks (e.g., adding an activity, checking a flight time).
2. **Calm & Editorial Visuals:**
   Use clean, whitespace-heavy interfaces to offset the dense data required for itineraries. Rely on typography and subtle background colors to separate information layers instead of heavy borders.
3. **Information Density vs. Readability:**
   Consolidate bookings, maps, and notes, but use progressive disclosure (e.g., accordions or modals for details) so the main view remains readable at a glance.
4. **Context-Aware Information:**
   Provide offline access and highlight information based on time and location (e.g., bringing today's flight to the top of the dashboard).

## WCAG 2.2 Considerations for this Redesign

- **Target Size (Success Criterion 2.5.8):** All interactive elements (buttons, links) must have a minimum target size of 24x24 CSS pixels.
- **Focus Not Obscured (Success Criterion 2.4.11):** Ensure floating action buttons or sticky headers do not obscure the keyboard focus indicator.
- **Contrast (Minimum) (Success Criterion 1.4.3):** The current app uses `#065f46` on `rgba(16, 185, 129, 0.08)`. We must ensure all text-to-background contrast ratios are at least 4.5:1 for normal text and 3:1 for large text.
- **Heading Order:** Fix the current issue where pages jump from H1 to H3, or use H2 without an H1 (e.g., Vault screen).
