import { describe, expect, it } from 'vitest';
import { ItineraryStop } from '../src/types/trip';
import { detectTransitConflict } from '../src/utils/scheduleConflicts';

const makeStop = (id: string, startTime: string, durationMinutes: number): ItineraryStop => ({
  id,
  title: `Stop ${id}`,
  category: 'Sightseeing',
  startTime,
  durationMinutes,
  orderIndex: 1,
  coordinates: [55.27, 25.2],
  address: 'Dubai, UAE',
});

describe('Schedule Overlap & Transit Conflict Detection (Feature F6)', () => {
  it('returns null when there is ample time between consecutive stops', () => {
    // Stop A: 10:00 AM, 60 mins -> leaves 11:00 AM
    // Transit: 20 mins -> arrives 11:20 AM
    // Stop B starts: 12:00 PM -> Plenty of time (+40m buffer)
    const stopA = makeStop('a', '10:00 AM', 60);
    const stopB = makeStop('b', '12:00 PM', 60);
    const conflict = detectTransitConflict(stopA, stopB, 20);

    expect(conflict).toBeNull();
  });

  it('detects transit conflict when arrival exceeds next scheduled start time', () => {
    // Stop A: 10:00 AM, 90 mins -> leaves 11:30 AM
    // Transit: 45 mins -> arrives 12:15 PM
    // Stop B starts: 12:00 PM -> Late by 15 mins
    const stopA = makeStop('a', '10:00 AM', 90);
    const stopB = makeStop('b', '12:00 PM', 60);
    const conflict = detectTransitConflict(stopA, stopB, 45);

    expect(conflict).not.toBeNull();
    expect(conflict?.hasConflict).toBe(true);
    expect(conflict?.conflictMins).toBe(15);
    expect(conflict?.departureTime).toBe('11:30 AM');
    expect(conflict?.expectedArrival).toBe('12:15 PM');
    expect(conflict?.scheduledStart).toBe('12:00 PM');
  });

  it('works with 24-hour time formatting', () => {
    // Stop A: 14:00, 60 mins -> leaves 15:00
    // Transit: 30 mins -> arrives 15:30
    // Stop B starts: 15:15 -> Late by 15 mins
    const stopA = makeStop('a', '14:00', 60);
    const stopB = makeStop('b', '15:15', 60);
    const conflict = detectTransitConflict(stopA, stopB, 30);

    expect(conflict).not.toBeNull();
    expect(conflict?.hasConflict).toBe(true);
    expect(conflict?.conflictMins).toBe(15);
    expect(conflict?.departureTime).toBe('15:00');
    expect(conflict?.expectedArrival).toBe('15:30');
    expect(conflict?.scheduledStart).toBe('15:15');
  });

  it('uses default 60 minute duration if durationMinutes is 0 or negative', () => {
    // Stop A: 09:00 AM, duration 0 -> default 60 mins -> leaves 10:00 AM
    // Transit: 15 mins -> arrives 10:15 AM
    // Stop B starts: 10:00 AM -> Late by 15 mins
    const stopA = makeStop('a', '09:00 AM', 0);
    const stopB = makeStop('b', '10:00 AM', 60);
    const conflict = detectTransitConflict(stopA, stopB, 15);

    expect(conflict).not.toBeNull();
    expect(conflict?.conflictMins).toBe(15);
    expect(conflict?.departureTime).toBe('10:00 AM');
  });

  it('returns null if either stop is missing a startTime', () => {
    const stopA = makeStop('a', '', 60);
    const stopB = makeStop('b', '11:00 AM', 60);
    expect(detectTransitConflict(stopA, stopB, 10)).toBeNull();

    const stopA2 = makeStop('a2', '10:00 AM', 60);
    const stopB2 = makeStop('b2', '', 60);
    expect(detectTransitConflict(stopA2, stopB2, 10)).toBeNull();
  });

  it('handles edge case where stop starts early morning of next day (>10h wrap)', () => {
    // Stop A: 21:00 PM (1260m)
    // Stop B: 02:00 AM (120m) -> difference is -1140m (< -600m)
    const stopA = makeStop('a', '21:00', 60);
    const stopB = makeStop('b', '02:00', 60);
    const conflict = detectTransitConflict(stopA, stopB, 30);
    expect(conflict).toBeNull();
  });
});
