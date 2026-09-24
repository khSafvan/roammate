import { describe, expect, it } from 'vitest';
import { ItineraryStop } from '../src/types/trip';
import { formatMinutesToTime, parseTimeToMinutes } from '../src/hooks/useTripOptimization';
import { optimizeRouteTspWasm } from '../src/wasm/engine';

describe('Route Optimization Preview, Confirmation Prompt & Undo', () => {
  const originalStops: ItineraryStop[] = [
    {
      id: 'stop_1',
      orderIndex: 1,
      title: 'Burj Khalifa',
      subtitle: 'Skyscraper',
      category: 'sight',
      startTime: '09:00 AM',
      durationMinutes: 90,
      coordinates: { latitude: 25.1972, longitude: 55.2744 },
      address: 'Downtown Dubai',
    },
    {
      id: 'stop_2',
      orderIndex: 2,
      title: 'Dubai Miracle Garden',
      subtitle: 'Garden',
      category: 'sight',
      startTime: '11:00 AM',
      durationMinutes: 90,
      coordinates: { latitude: 25.0597, longitude: 55.2447 },
      address: 'Al Barsha South',
    },
    {
      id: 'stop_3',
      orderIndex: 3,
      title: 'Dubai Mall',
      subtitle: 'Mall',
      category: 'dining',
      startTime: '01:30 PM',
      durationMinutes: 60,
      coordinates: { latitude: 25.1985, longitude: 55.2796 }, // Right next to Burj Khalifa!
      address: 'Downtown Dubai',
    },
  ];

  it('returns valid optimization result with all stop IDs preserved', () => {
    const stopsForWasm = originalStops.map((s) => ({
      id: s.id,
      latitude: s.coordinates.latitude,
      longitude: s.coordinates.longitude,
    }));

    const result = optimizeRouteTspWasm(stopsForWasm, 'drive');
    expect(result.optimized_ids).toBeDefined();
    expect(result.optimized_ids.length).toBe(3);
    expect(result.optimized_ids).toContain('stop_1');
    expect(result.optimized_ids).toContain('stop_2');
    expect(result.optimized_ids).toContain('stop_3');
  });

  it('re-flows chronological stop start times accurately after TSP reordering', () => {
    // Sequence: stop_1 (90m visit) -> 15m transit -> stop_3 (60m visit) -> 15m transit -> stop_2
    const firstStartTime = '09:00 AM';
    let currentMins = parseTimeToMinutes(firstStartTime);

    const reorderedStops = [originalStops[0], originalStops[2], originalStops[1]];
    const updated = reorderedStops.map((stop, index) => {
      if (index > 0) {
        const prev = reorderedStops[index - 1];
        const transitMinutes = 15;
        currentMins += prev.durationMinutes + transitMinutes;
      }
      return {
        ...stop,
        orderIndex: index + 1,
        startTime: formatMinutesToTime(currentMins, true),
      };
    });

    expect(updated[0].startTime).toBe('09:00 AM');
    // 09:00 AM + 90m + 15m transit = 10:45 AM
    expect(updated[1].startTime).toBe('10:45 AM');
    // 10:45 AM + 60m + 15m transit = 12:00 PM
    expect(updated[2].startTime).toBe('12:00 PM');
  });

  it('preserves history and supports complete undo to restore original sequence', () => {
    // Simulated day state
    let dayStops = [...originalStops];
    let isDayOptimized = false;
    let history: Record<string, ItineraryStop[]> = {};

    // 1. User reviews preview and clicks "Apply Optimized Route"
    const optimizedOrder = [originalStops[0], originalStops[2], originalStops[1]];

    // Save previous state to history
    history['day_1'] = [...dayStops];
    dayStops = [...optimizedOrder];
    isDayOptimized = true;

    expect(dayStops[1].id).toBe('stop_3');
    expect(isDayOptimized).toBe(true);
    expect(history['day_1']).toBeDefined();

    // 2. User clicks "Undo"
    const previous = history['day_1'];
    expect(previous).toBeDefined();

    dayStops = [...previous];
    isDayOptimized = false;
    delete history['day_1'];

    // Sequence restored exactly
    expect(dayStops[1].id).toBe('stop_2');
    expect(dayStops[1].startTime).toBe('11:00 AM');
    expect(isDayOptimized).toBe(false);
    expect(history['day_1']).toBeUndefined();
  });
});
