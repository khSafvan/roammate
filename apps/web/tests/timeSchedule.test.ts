import { describe, expect, it } from 'vitest';
import { formatMinutesToTime, getNextSuggestedStartTime, parseTimeToMinutes, recalculateStopTimes } from '../src/utils/timeSchedule';
import { ItineraryStop } from '../src/types/trip';

describe('timeSchedule Utility', () => {
  it('parses time strings to total minutes from midnight correctly', () => {
    expect(parseTimeToMinutes('09:00 AM')).toBe(540);
    expect(parseTimeToMinutes('10:30 AM')).toBe(630);
    expect(parseTimeToMinutes('02:15 PM')).toBe(855);
    expect(parseTimeToMinutes('14:30')).toBe(870);
  });

  it('formats total minutes to 12-hour display string correctly', () => {
    expect(formatMinutesToTime(540)).toBe('9:00 AM');
    expect(formatMinutesToTime(630)).toBe('10:30 AM');
    expect(formatMinutesToTime(855)).toBe('2:15 PM');
    expect(formatMinutesToTime(870)).toBe('2:30 PM');
  });

  it('recalculates stop start times sequentially adding duration and travel buffer', () => {
    const stops: ItineraryStop[] = [
      {
        id: 's1',
        title: 'Stop 1',
        category: 'sight',
        startTime: '09:00 AM',
        durationMinutes: 60,
        orderIndex: 1,
        coordinates: { latitude: 0, longitude: 0 },
        address: '',
      },
      {
        id: 's2',
        title: 'Stop 2',
        category: 'dining',
        startTime: '02:00 PM', // Out of order time
        durationMinutes: 90,
        orderIndex: 2,
        coordinates: { latitude: 0, longitude: 0 },
        address: '',
      },
    ];

    const recalculated = recalculateStopTimes(stops, '09:00 AM', 15);
    expect(recalculated[0].startTime).toBe('9:00 AM');
    expect(recalculated[1].startTime).toBe('10:15 AM'); // 9:00 + 60m + 15m buffer = 10:15 AM
  });

  it('suggests next start time for newly added stop', () => {
    const stops: ItineraryStop[] = [
      {
        id: 's1',
        title: 'Stop 1',
        category: 'sight',
        startTime: '10:00 AM',
        durationMinutes: 60,
        orderIndex: 1,
        coordinates: { latitude: 0, longitude: 0 },
        address: '',
      },
    ];

    const nextTime = getNextSuggestedStartTime(stops, '09:00 AM', 15);
    expect(nextTime).toBe('11:15 AM'); // 10:00 + 60m + 15m buffer = 11:15 AM
  });
});
