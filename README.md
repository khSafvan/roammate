# ✈️ Roammate — Privacy-First Smart Trip Planner

Roammate is a responsive, offline-capable travel planner featuring the **TerraWay 2D vector map engine**, automated route optimization, group expense settlement, and instant offline access.

---

## ✨ Features

- **Dual-Pane Travel Workspace** — Interactive MapLibre vector map side-by-side with an interactive daily timeline.
- **Offline-First & Guest Mode** — Plan, edit, calculate routes, and manage budgets without creating an account. All core algorithms run directly in your browser.
- **TerraWay Vector Route Engine** — Multi-modal transit lines (flights, ferries, drives, walks) with Great-Circle arcs and Topografix GPX 1.1 exports for GPS devices.
- **Smart Itinerary Optimizer** — Automated traveling-salesperson route optimization with meal window awareness (lunch/dinner) and attraction opening hour constraints.
- **Group Expense Settlement** — Multi-currency tracking with greedy debt settlement to minimize who owes whom.
- **Schedule Conflict Warnings** — Real-time alerts when travel time exceeds available time between consecutive stops.
- **Flight & Document Hub** — Boarding pass cards with FlightRadar24 links, hotel vouchers, and printable paper travel packets.
- **Export Anywhere** — RFC 5545 iCalendar (`.ics`) download for Google Calendar, Apple Calendar, and Outlook.
- **Zero-Knowledge Cloud Backup** — Optional end-to-end sync using bearer authentication. Passwords and credentials never touch the server unhashed.

---

## 📱 Using Roammate

1. **Open the App** — Visit the hosted site or install it as a PWA on your phone or desktop.
2. **Guest Mode** — Click **Continue as Guest** to start planning immediately with zero setup.
3. **Cloud Sync** — Create an account to sync your trips across multiple devices.
4. **Offline Use** — When traveling without data or WiFi, open the app normally. All changes queue locally and automatically sync when connectivity returns.

---

## 📄 Documentation

- [Deployment Guide (DEPLOYMENT.md)](./DEPLOYMENT.md) — Fresh deployment instructions for Cloudflare Pages, Workers, and Turso.
- [Developer Documentation (DOCUMENTATION.md)](./DOCUMENTATION.md) — Architecture, monorepo packages, sync engine, and local development.
- [Roadmap & Tasks (TODO.md)](./TODO.md) — Planned features and product roadmap.
