import { describe, expect, it } from 'vitest';
import { INITIAL_TRIPS_CATALOG, mockTripData } from '../src/data/mockTrip';
import { computeTransitLegsWasm } from '../src/wasm/engine';
import { detectTransitConflict } from '../src/utils/scheduleConflicts';

describe('Canonical tutorial demo itinerary', () => {
  it('seeds exactly one sample trip', () => {
    expect(INITIAL_TRIPS_CATALOG).toHaveLength(1);
    expect(INITIAL_TRIPS_CATALOG[0].id).toBe(mockTripData.id);
    expect(mockTripData.travelers).toEqual(['Alex Chen', 'Jordan Taylor']);
    expect(mockTripData.flights.every((flight) => flight.date === '2027-01-07')).toBe(true);
  });

  it('keeps every day ordered and free from transit lateness warnings', () => {
    for (const day of mockTripData.days) {
      expect(day.stops.length).toBeLessThanOrEqual(5);
      day.stops.forEach((stop, index) => {
        expect(stop.orderIndex).toBe(index + 1);
      });

      const legs = computeTransitLegsWasm(day.stops, {});
      const conflicts = day.stops.flatMap((stop, index) => {
        const nextStop = day.stops[index + 1];
        if (!nextStop || stop.category === 'note' || nextStop.category === 'note') return [];
        const conflict = detectTransitConflict(stop, nextStop, legs[index]?.durationMinutes || 0);
        return conflict ? [`${stop.title} -> ${nextStop.title}: ${conflict.conflictMins}m`] : [];
      });

      expect(conflicts, `${day.title}: ${conflicts.join(', ')}`).toEqual([]);
    }
  });
});