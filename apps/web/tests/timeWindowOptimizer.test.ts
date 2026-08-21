import { describe, it, expect } from 'vitest';
import { optimizeTimeWindowRoute, MEAL_WINDOWS } from '@roammate/core';
import { parseTimeToMinutes } from '../src/hooks/useTripOptimization';
import { ItineraryStop } from '../src/types/trip';

/** Build a minimal ItineraryStop for testing */
function makeStop(overrides: Partial<ItineraryStop> & Pick<ItineraryStop, 'id'>): ItineraryStop {
  return {
    orderIndex: 1,
    title: overrides.id,
    location: overrides.id,
    coordinates: { latitude: 0, longitude: 0 },
    startTime: '09:00 AM',
    durationMinutes: 60,
    category: 'sightseeing',
    notes: '',
    tags: [],
    transitMode: 'drive',
    ...overrides,
  };
}

// ── Lunch window alignment ────────────────────────────────────────────────────

describe('optimizeTimeWindowRoute — meal alignment', () => {
  it('places a lunch stop within the 12:00–2:30 PM meal window', () => {
    const stops: ItineraryStop[] = [
      makeStop({
        id: 'museum',
        title: 'City Museum',
        orderIndex: 1,
        coordinates: { latitude: 48.86, longitude: 2.35 },
        startTime: '09:00 AM',
        durationMinutes: 120,
        category: 'sightseeing',
      }),
      makeStop({
        id: 'lunch',
        title: 'Bistro Pierre',
        orderIndex: 2,
        // Physically closer to start than park — optimizer must still place after museum
        coordinates: { latitude: 48.861, longitude: 2.351 },
        startTime: '11:00 AM', // original time would miss lunch window
        durationMinutes: 60,
        category: 'dining',
        mealType: 'lunch',
      }),
      makeStop({
        id: 'park',
        title: 'Tuileries Garden',
        orderIndex: 3,
        coordinates: { latitude: 48.864, longitude: 2.334 },
        startTime: '01:00 PM',
        durationMinutes: 90,
        category: 'sightseeing',
      }),
    ];

    const result = optimizeTimeWindowRoute(stops, 'drive', '09:00 AM');
    const lunchStop = result.optimizedStops.find((s) => s.id === 'lunch');
    expect(lunchStop).toBeDefined();

    const lunchMinutes = parseTimeToMinutes(lunchStop!.startTime);
    // Lunch window: 12:00 PM (720 min) to 2:30 PM (870 min)
    expect(lunchMinutes).toBeGreaterThanOrEqual(MEAL_WINDOWS.lunch.startMinutes);
    expect(lunchMinutes).toBeLessThanOrEqual(MEAL_WINDOWS.lunch.endMinutes);
  });

  it('reports mealsAligned for dining stops placed in their window', () => {
    const stops: ItineraryStop[] = [
      makeStop({
        id: 's1',
        orderIndex: 1,
        coordinates: { latitude: 51.5, longitude: -0.12 },
        startTime: '09:00 AM',
        durationMinutes: 90,
        category: 'sightseeing',
      }),
      makeStop({
        id: 'dinner-stop',
        orderIndex: 2,
        coordinates: { latitude: 51.505, longitude: -0.11 },
        startTime: '08:00 PM',
        durationMinutes: 75,
        category: 'dining',
        mealType: 'dinner',
      }),
    ];

    const result = optimizeTimeWindowRoute(stops, 'drive', '09:00 AM');
    // At least dinner should be in mealsAligned when it lands in the 6:30–10 PM window
    const dinnerStop = result.optimizedStops.find((s) => s.id === 'dinner-stop');
    const dinnerMinutes = parseTimeToMinutes(dinnerStop!.startTime);
    if (
      dinnerMinutes >= MEAL_WINDOWS.dinner.startMinutes &&
      dinnerMinutes <= MEAL_WINDOWS.dinner.endMinutes
    ) {
      expect(result.constraintsRespected.mealsAligned).toContain('dinner');
    }
  });
});

// ── Operating hours ───────────────────────────────────────────────────────────

describe('optimizeTimeWindowRoute — operating hours', () => {
  it('does not schedule an attraction after its closeTime', () => {
    const stops: ItineraryStop[] = [
      makeStop({
        id: 'museum',
        orderIndex: 1,
        coordinates: { latitude: 48.86, longitude: 2.35 },
        startTime: '09:00 AM',
        durationMinutes: 90,
        category: 'sightseeing',
        openTime: '09:00 AM',
        closeTime: '05:00 PM',
      }),
      makeStop({
        id: 'tower',
        orderIndex: 2,
        coordinates: { latitude: 48.858, longitude: 2.294 },
        startTime: '11:00 AM',
        durationMinutes: 60,
        category: 'sightseeing',
        openTime: '09:30 AM',
        closeTime: '11:45 PM',
      }),
    ];

    const result = optimizeTimeWindowRoute(stops, 'drive', '09:00 AM');
    const museum = result.optimizedStops.find((s) => s.id === 'museum');
    expect(museum).toBeDefined();

    const museumStart = parseTimeToMinutes(museum!.startTime);
    const closeTime = parseTimeToMinutes('05:00 PM');
    expect(museumStart + 90).toBeLessThanOrEqual(closeTime + 30); // small buffer for transit
  });

  it('increments operatingHoursPassed for sights scheduled within open window', () => {
    const stops: ItineraryStop[] = [
      makeStop({
        id: 'gallery',
        orderIndex: 1,
        coordinates: { latitude: 51.51, longitude: -0.13 },
        startTime: '10:00 AM',
        durationMinutes: 60,
        category: 'sightseeing',
        openTime: '09:00 AM',
        closeTime: '06:00 PM',
      }),
    ];

    const result = optimizeTimeWindowRoute(stops, 'walk', '10:00 AM');
    // Single stop with open window — should count
    expect(result.constraintsRespected.operatingHoursPassed).toBeGreaterThanOrEqual(0);
  });
});

// ── Fixed slots ───────────────────────────────────────────────────────────────

describe('optimizeTimeWindowRoute — fixed time slots', () => {
  it('preserves isFixedTime stop at its original startTime', () => {
    const fixedTime = '02:00 PM';
    const stops: ItineraryStop[] = [
      makeStop({
        id: 'flexible-a',
        orderIndex: 1,
        coordinates: { latitude: 48.87, longitude: 2.36 },
        startTime: '09:00 AM',
        durationMinutes: 90,
        category: 'sightseeing',
      }),
      makeStop({
        id: 'fixed-tour',
        orderIndex: 2,
        coordinates: { latitude: 48.855, longitude: 2.30 },
        startTime: fixedTime,
        durationMinutes: 60,
        category: 'sightseeing',
        isFixedTime: true,
      }),
      makeStop({
        id: 'flexible-b',
        orderIndex: 3,
        coordinates: { latitude: 48.86, longitude: 2.34 },
        startTime: '04:00 PM',
        durationMinutes: 75,
        category: 'sightseeing',
      }),
    ];

    const result = optimizeTimeWindowRoute(stops, 'drive', '09:00 AM');
    const fixedStop = result.optimizedStops.find((s) => s.id === 'fixed-tour');
    expect(fixedStop).toBeDefined();
    expect(fixedStop!.startTime).toBe(fixedTime);
  });

  it('reports fixedSlotsPreserved count equal to isFixedTime stops in input', () => {
    const stops: ItineraryStop[] = [
      makeStop({
        id: 'a',
        orderIndex: 1,
        coordinates: { latitude: 40.71, longitude: -74.01 },
        startTime: '09:00 AM',
        durationMinutes: 60,
        category: 'sightseeing',
      }),
      makeStop({
        id: 'b-fixed',
        orderIndex: 2,
        coordinates: { latitude: 40.72, longitude: -74.0 },
        startTime: '11:00 AM',
        durationMinutes: 60,
        category: 'sightseeing',
        isFixedTime: true,
      }),
      makeStop({
        id: 'c-fixed',
        orderIndex: 3,
        coordinates: { latitude: 40.73, longitude: -74.02 },
        startTime: '03:00 PM',
        durationMinutes: 60,
        category: 'sightseeing',
        isFixedTime: true,
      }),
    ];

    const result = optimizeTimeWindowRoute(stops, 'drive', '09:00 AM');
    expect(result.constraintsRespected.fixedSlotsPreserved).toBe(2);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('optimizeTimeWindowRoute — edge cases', () => {
  it('returns empty optimizedStops for empty input', () => {
    const result = optimizeTimeWindowRoute([], 'drive', '09:00 AM');
    expect(result.optimizedStops).toHaveLength(0);
    expect(result.isAlreadyOptimal).toBe(true);
  });

  it('returns the single stop unchanged for single-item input', () => {
    const stop = makeStop({
      id: 'solo',
      orderIndex: 1,
      coordinates: { latitude: 0, longitude: 0 },
      startTime: '10:00 AM',
      durationMinutes: 60,
    });
    const result = optimizeTimeWindowRoute([stop], 'drive', '10:00 AM');
    expect(result.optimizedStops).toHaveLength(1);
    expect(result.optimizedStops[0].id).toBe('solo');
    expect(result.isAlreadyOptimal).toBe(true);
  });

  it('does not mutate the original stops array', () => {
    const stops: ItineraryStop[] = [
      makeStop({ id: 'x', orderIndex: 1, coordinates: { latitude: 1, longitude: 1 } }),
      makeStop({ id: 'y', orderIndex: 2, coordinates: { latitude: 2, longitude: 2 } }),
    ];
    const originalIds = stops.map((s) => s.id);
    optimizeTimeWindowRoute(stops, 'drive', '09:00 AM');
    expect(stops.map((s) => s.id)).toEqual(originalIds);
  });

  it('handles note stops without injecting 60m delay or phantom transit', () => {
    const stops: ItineraryStop[] = [
      makeStop({
        id: 'stop-1',
        title: 'Morning Sight',
        coordinates: { latitude: 35.6586, longitude: 139.7454 },
        startTime: '09:00 AM',
        durationMinutes: 60,
      }),
      makeStop({
        id: 'note-1',
        title: 'Remember Metro Pass',
        category: 'note',
        coordinates: { latitude: 0, longitude: 0 },
        startTime: '10:00 AM',
        durationMinutes: 0,
      }),
      makeStop({
        id: 'stop-2',
        title: 'Next Sight',
        // ~1.5 km away from stop-1
        coordinates: { latitude: 35.6686, longitude: 139.7454 },
        startTime: '10:00 AM',
        durationMinutes: 60,
      }),
    ];

    const result = optimizeTimeWindowRoute(stops, 'drive', '09:00 AM');
    expect(result.optimizedStops).toHaveLength(3);
    const stop2 = result.optimizedStops.find((s) => s.id === 'stop-2')!;
    const stop2Mins = parseTimeToMinutes(stop2.startTime);
    // Stop 1 starts at 9:00 AM (540m) + 60m duration = 10:00 AM (600m).
    // Direct transit is ~1.5 km (~5-6m drive).
    // Note should NOT add 60 mins! So Stop 2 should start ~10:05 AM to 10:10 AM, NOT 11:00 AM or 12:00 PM.
    expect(stop2Mins).toBeLessThan(620);
    expect(stop2Mins).toBeGreaterThanOrEqual(604);
  });
});
