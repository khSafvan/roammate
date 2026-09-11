# 🧥 06. Outfit Planner, Digital Wardrobe & Luggage Matrix
---

This section covers the visual design, interactive workflows, and component specifications for the **Couple Outfit Planner, Digital Wardrobe Capsule & Luggage Hub**.

---

## 1. Daily Itinerary Looks (`outfit-itinerary-looks-view.png`)

Aligns couple outfits day-by-day directly against destination weather forecasts, temperature tags, and local dress code tips (such as modest clothing requirements for mosque or religious site visits).



### Key Features:
- **Lookbook Canvas**: Duo card pairing side-by-side outfit slots for traveler 1 (**John**) and traveler 2 (**Jane**).
- **Occasion Vibe Chips**: Color-coded pill badges indicating styling context (`☀️ Casual`, `🍷 Dining`, `🏖️ Beach & Pool`, `🕌 Cultural / Modest`, `👟 Active`, `✨ Formal`).
- **1-Click Wardrobe Action**: "Pick from Wardrobe" allows selecting existing capsule outfits without re-entering data.
- **Wear Again (Duplicate)**: Clones a look for another day with a fresh identifier.
- **Luggage Sync**: Checkbox directly updates the luggage packing checklist in real-time.

---

## 2. Digital Wardrobe Capsule Collection (`outfit-wardrobe-closet-view.png`)

A dedicated closet capsule for browsing, curating, and organizing outfits before or during a trip.



### Key Features:
- **Unassigned Look Creation**: Create outfits without committing them to an itinerary day in advance.
- **Multi-Filter Scope**: Filter by `All Outfits`, `Ready to Wear (Unassigned)`, `John`, or `Jane`.
- **Occasion Filter Pills**: Filter across 7 occasion categories.
- **Day Assignment Popover**: Quickly assign unassigned wardrobe looks to any Day with 1 click.
- **Search Filtering**: Live substring matching across outfit titles, clothing labels, and styling notes.

---

## 3. Select from Wardrobe Modal (`modal-select-from-wardrobe.png`)

Accessible from any itinerary day header, empty day dropzone, or stop detail panel.



### Key Features:
- **Context Header**: Clear indicator of target day/place destination.
- **Status Indicator**: Highlights whether each outfit is currently unassigned (`🏷️ In Wardrobe`) or scheduled (`Currently on: Day X`).
- **Dual Assignment Actions**:
  - `Assign Here`: Re-assigns the look to this target destination.
  - `Wear Again`: Duplicates the outfit as a new record for this target day while keeping the original.

---

## 4. Outfit Creator with Occasion Vibes (`modal-add-outfit-with-occasions.png`)

Comprehensive creation and editing modal for single or coordinated couple looks.



### Key Features:
- **Occasion Vibe Selector**: One-click occasion pills with matching emojis.
- **Assignment Mode Switch**: Toggle between `📅 Assign to Day / Place` and `🧥 Save to Wardrobe (Unassigned)`.
- **Dynamic Weather Feedback**: When assigned to a day, automatically displays the day's temperature forecast and apparel recommendations.
- **Side-by-Side Couple Slots**: Independent image upload, photo cutout toggle, and text labels for John and Jane.

---

## 5. Luggage Packing Checklist (`luggage-packing-view.png`)

Luggage checklist organized into independent columns for each traveler.



### Key Features:
- Real-time progress bar and percentage counter.
- Quick filter tabs: `All`, `To Pack`, and `Packed`.
- Click-to-navigate links connecting packing items directly back to their scheduled itinerary day.
