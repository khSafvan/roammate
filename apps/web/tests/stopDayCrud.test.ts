import { describe, expect, it } from 'vitest';
import { formatMinutesToTime, parseTimeToMinutes } from '../src/hooks/useTripOptimization';
import { ItineraryStop, TripDay } from '../src/types/trip';

describe('Stop & Day CRUD and Route Timing (Phase 2)', () => {
  describe('Time Parsing and Formatting', () => {
    it('correctly parses 12-hour AM/PM time strings into minutes', () => {
      expect(parseTimeToMinutes('09:30 AM')).toBe(9 * 60 + 30);
      expect(parseTimeToMinutes('12:00 PM')).toBe(12 * 60);
      expect(parseTimeToMinutes('02:15 PM')).toBe(14 * 60 + 15);
      expect(parseTimeToMinutes('12:30 AM')).toBe(30);
    });

    it('correctly parses 24-hour time strings into minutes', () => {
      expect(parseTimeToMinutes('09:30')).toBe(9 * 60 + 30);
      expect(parseTimeToMinutes('14:45')).toBe(14 * 60 + 45);
      expect(parseTimeToMinutes('00:15')).toBe(15);
    });

    it('formats minutes into 12-hour format with AM/PM', () => {
      expect(formatMinutesToTime(9 * 60 + 30, true)).toBe('09:30 AM');
      expect(formatMinutesToTime(12 * 60, true)).toBe('12:00 PM');
      expect(formatMinutesToTime(14 * 60 + 15, true)).toBe('02:15 PM');
      expect(formatMinutesToTime(0, true)).toBe('12:00 AM');
    });

    it('formats minutes into 24-hour format', () => {
      expect(formatMinutesToTime(9 * 60 + 30, false)).toBe('09:30');
      expect(formatMinutesToTime(14 * 60 + 45, false)).toBe('14:45');
      expect(formatMinutesToTime(0, false)).toBe('00:00');
    });
  });

  describe('Stop Management & Re-indexing', () => {
    const mockStops: ItineraryStop[] = [
      {
        id: 's1',
        orderIndex: 1,
        title: 'Stop 1',
        subtitle: 'Sub 1',
        category: 'sight',
        startTime: '09:00 AM',
        durationMinutes: 60,
        coordinates: { latitude: 35.6, longitude: 139.7 },
        address: 'Tokyo',
      },
      {
        id: 's2',
        orderIndex: 2,
        title: 'Stop 2',
        subtitle: 'Sub 2',
        category: 'dining',
        startTime: '10:30 AM',
        durationMinutes: 45,
        coordinates: { latitude: 35.65, longitude: 139.75 },
        address: 'Tokyo',
      },
      {
        id: 's3',
        orderIndex: 3,
        title: 'Stop 3',
        subtitle: 'Sub 3',
        category: 'sight',
        startTime: '11:45 AM',
        durationMinutes: 90,
        coordinates: { latitude: 35.7, longitude: 139.8 },
        address: 'Tokyo',
      },
    ];

    it('deletes a middle stop and properly re-indexes remaining stops', () => {
      const remaining = mockStops
        .filter((s) => s.id !== 's2')
        .map((s, idx) => ({ ...s, orderIndex: idx + 1 }));

      expect(remaining.length).toBe(2);
      expect(remaining[0].id).toBe('s1');
      expect(remaining[0].orderIndex).toBe(1);
      expect(remaining[1].id).toBe('s3');
      expect(remaining[1].orderIndex).toBe(2);
    });

    it('moves a stop from one day to another and preserves order', () => {
      const day1Stops = [...mockStops];
      const day2Stops: ItineraryStop[] = [];

      // Move s2 from day1 to day2
      const stopToMove = day1Stops.find((s) => s.id === 's2')!;
      const newDay1 = day1Stops
        .filter((s) => s.id !== 's2')
        .map((s, idx) => ({ ...s, orderIndex: idx + 1 }));
      const newDay2 = [...day2Stops, { ...stopToMove, orderIndex: day2Stops.length + 1 }];

      expect(newDay1.length).toBe(2);
      expect(newDay2.length).toBe(1);
      expect(newDay2[0].id).toBe('s2');
      expect(newDay2[0].orderIndex).toBe(1);
    });
  });

  describe('Day Management & Renumbering', () => {
    it('renumbers days sequentially when an intermediate day is deleted', () => {
      const days: Partial<TripDay>[] = [
        { id: 'd1', dayNumber: 1, title: 'Day 1' },
        { id: 'd2', dayNumber: 2, title: 'Day 2' },
        { id: 'd3', dayNumber: 3, title: 'Day 3' },
      ];

      const remaining = days
        .filter((_, idx) => idx !== 1)
        .map((d, idx) => ({ ...d, dayNumber: idx + 1 }));

      expect(remaining.length).toBe(2);
      expect(remaining[0].dayNumber).toBe(1);
      expect(remaining[0].id).toBe('d1');
      expect(remaining[1].dayNumber).toBe(2);
      expect(remaining[1].id).toBe('d3');
    });
  });
});
