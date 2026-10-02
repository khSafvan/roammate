# ✈️ Roammate — Zero-Knowledge Travel Vault & Itinerary Engine

**Roammate** is an offline-first, high-performance travel workspace and itinerary engine built for modern explorers and couples. Designed with a **calm utility** philosophy, it combines local zero-knowledge encrypted vaults with physical analog metaphors — rendering air tickets as authentic **16:9 boarding passes**, accommodations as **4:3 smart key cards**, and route transit over the **TerraWay 2D vector map engine**.

---

> 🎨 **Comprehensive Component & Design Reference:**  
> For the complete visual tour of all 35+ screens, modals, and drawers (including the **Digital Wardrobe Capsule**, **Multi-Currency Expense Tracker**, **Places to Visit Drawer**, **Route Optimizer**, and **Emergency Scratchpad**), explore:  
> - **[Design Reference Archive (`docs/design-reference/`)](./docs/design-reference/README.md)**  
> - **[Full Product Design Specification (`PROJECT_DESIGN_SPEC.md`)](./docs/design-reference/PROJECT_DESIGN_SPEC.md)**  
> - **[Couple Outfits & Wardrobe Showcase (`06-outfit-packing/`)](./docs/design-reference/06-outfit-packing/README.md)**  

---

## 🔒 Security & Local-First Philosophy

- **Zero-Knowledge Encryption:** Data is encrypted locally before being stored in your browser's persistent storage.
- **Passcode Vault Gate:** One-click session lock (`Lock Vault & Log Out`) ensures your itineraries remain private when stepping away from your device.
- **100% Offline Capability:** Core routing, TSP optimization, distance calculations, and budget conversions execute entirely on the client side using pure TypeScript.

---

## 🗺️ Tech Stack & Free-Tier Integrations

Roammate relies on powerful, freemium, and open-source APIs to power its search and routing without expensive overhead:
- **Places & POI:** Powered by **Foursquare API v3** (Primary) with a robust fallback to **Yelp Fusion API** (for rich reviews/restaurants) and **Nominatim (OpenStreetMap)**.
- **Routing Engine:** Powered natively by **OSRM** (`router.project-osrm.org`) for road/walk geometry, with a high-availability fallback to the **Mapbox Directions API**.
- **Distance Calculation:** 100% offline mathematical Haversine formulas.

---

## 📦 Universal Export Options

- **Topografix GPX 1.1:** Export turn-by-turn waypoint tracks for Garmin, Apple Watch, or handheld GPS units.
- **RFC 5545 iCalendar (`.ics`):** One-click sync to Google Calendar, Apple Calendar, and Outlook.
- **Printable Travel Packet:** Automatically formats a high-density, printable emergency packet with consular contacts, hotel vouchers, and flight times for zero-battery scenarios.
- **Universal JSON Backup:** Complete portable backup of all trip assets.

---

## 🛠️ Development & Architecture

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production artifacts (TypeScript + Vite)
npm run build

# Run unit and integration test suite
npm run test
```

### ⚙️ Environment Configuration

There is exactly **one** centralized `.env` file in the root directory for all API keys. To configure:
```bash
cp .env.sample .env
```
Then add your free `FOURSQUARE_API_KEY`, `YELP_API_KEY`, and `VITE_MAPBOX_ACCESS_TOKEN` keys.
