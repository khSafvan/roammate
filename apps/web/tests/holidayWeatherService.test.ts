import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHolidays, fetchHolidaysForRange, clearHolidayCache } from '../src/utils/holidayService';
import { tripDayToIso, fetchWeeklyForecast, formatTimePart, calculateGoldenHourTime } from '../src/utils/weatherService';

describe('weatherService — tripDayToIso & daylight helpers', () => {
  it('correctly calculates ISO date for day offsets', () => {
    expect(tripDayToIso('2027-01-07', 0)).toBe('2027-01-07');
    expect(tripDayToIso('2027-01-07', 1)).toBe('2027-01-08');
    expect(tripDayToIso('2027-01-07', 6)).toBe('2027-01-13');
  });

  it('handles month rollovers accurately', () => {
    expect(tripDayToIso('2027-01-31', 1)).toBe('2027-02-01');
  });

  it('formats ISO time string to 12h AM/PM', () => {
    expect(formatTimePart('2027-01-07T17:45')).toBe('05:45 PM');
    expect(formatTimePart('2027-01-07T07:05')).toBe('07:05 AM');
    expect(formatTimePart(undefined)).toBeUndefined();
  });

  it('calculates golden hour 45 minutes prior to sunset', () => {
    expect(calculateGoldenHourTime('2027-01-07T17:45')).toBe('05:00 PM');
    expect(calculateGoldenHourTime('2027-01-07T18:15')).toBe('05:30 PM');
  });
});

describe('holidayService — fetchHolidays and fetchHolidaysForRange', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearHolidayCache();
  });

  it('fetches and filters holidays within the specified range', async () => {
    const mockHolidays = [
      { date: '2027-01-01', name: "New Year's Day", localName: "New Year's Day" },
      { date: '2027-01-08', name: 'Al-Isra Wal Miraj', localName: 'Al-Isra Wal Miraj' },
      { date: '2027-12-02', name: 'National Day', localName: 'National Day' },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockHolidays,
    } as Response);

    const result = await fetchHolidaysForRange('AE', '2027-01-07', '2027-01-13');
    expect(result['2027-01-08']).toBe('Al-Isra Wal Miraj');
    expect(result['2027-01-01']).toBeUndefined();
    expect(result['2027-12-02']).toBeUndefined();
  });

  it('returns empty record on network/fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));
    const result = await fetchHolidaysForRange('AE', '2027-01-07', '2027-01-13');
    expect(result).toEqual({});
  });
});

describe('weatherService — fetchWeeklyForecast fallback', () => {
  it('returns empty byDate and isOffline: true when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Timeout'));
    const result = await fetchWeeklyForecast(25.2, 55.3, '2027-01-07', '2027-01-13');
    expect(result.isOffline).toBe(true);
    expect(result.byDate).toEqual({});
  });
});
