import { describe, expect, it } from 'vitest';
import {
  computeDistanceKm,
  estimateDurationMins,
  getWeatherComfortLabel,
  optimizeRouteTspWasm,
} from '../src/wasm/engine';

describe('WASM Engine & JavaScript Fallbacks', () => {
  describe('computeDistanceKm (Haversine)', () => {
    it('calculates 0 distance between identical coordinates', () => {
      const dist = computeDistanceKm(35.6895, 139.6917, 35.6895, 139.6917);
      expect(dist).toBe(0);
    });

    it('calculates approximately correct distance between Tokyo and Kyoto (~370-380 km)', () => {
      // Tokyo (35.6895, 139.6917) to Kyoto (35.0116, 135.7681)
      const dist = computeDistanceKm(35.6895, 139.6917, 35.0116, 135.7681);
      expect(dist).toBeGreaterThan(360);
      expect(dist).toBeLessThan(390);
    });
  });

  describe('estimateDurationMins', () => {
    it('estimates walking duration with min floor of 3 mins', () => {
      const shortWalk = estimateDurationMins(0.1, 'walk');
      expect(shortWalk).toBeGreaterThanOrEqual(3);

      const fiveKmWalk = estimateDurationMins(5.0, 'walk');
      // 5km * 1.25 road winding = 6.25km. At 4.5 km/h: ~83 mins
      expect(fiveKmWalk).toBeGreaterThan(70);
      expect(fiveKmWalk).toBeLessThan(95);
    });

    it('estimates transit duration with buffer and min floor of 6 mins', () => {
      const shortTransit = estimateDurationMins(0.2, 'transit');
      expect(shortTransit).toBeGreaterThanOrEqual(6);
    });

    it('estimates drive duration with min floor of 4 mins', () => {
      const shortDrive = estimateDurationMins(0.2, 'drive');
      expect(shortDrive).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getWeatherComfortLabel', () => {
    it('identifies comfortable conditions', () => {
      const label = getWeatherComfortLabel(22, 50, 10);
      expect(label).toBe('Ideal travel weather · Perfect for walking');
    });

    it('identifies rain / umbrella needed', () => {
      const label = getWeatherComfortLabel(20, 70, 70);
      expect(label).toBe('Rain gear essential · Wet conditions');
    });

    it('identifies hot and humid conditions', () => {
      const label = getWeatherComfortLabel(33, 85, 10);
      expect(label).toBe('High heat index · Stay hydrated');
    });

    it('identifies cold conditions', () => {
      const label = getWeatherComfortLabel(5, 40, 0);
      expect(label).toBe('Crisp & cool · Warm layers recommended');
    });
  });

  describe('optimizeRouteTspWasm (JS Fallback)', () => {
    it('handles trivial route with 0 or 1 stop without error', () => {
      const emptyResult = optimizeRouteTspWasm([], 'drive');
      expect(emptyResult.optimized_ids).toEqual([]);
      expect(emptyResult.minutes_saved).toBe(0);

      const singleResult = optimizeRouteTspWasm(
        [{ id: 's1', latitude: 35.68, longitude: 139.7 }],
        'drive'
      );
      expect(singleResult.optimized_ids).toEqual(['s1']);
      expect(singleResult.minutes_saved).toBe(0);
    });

    it('preserves start and end stops when optimizing 4+ stops', () => {
      const stops = [
        { id: 'start', latitude: 35.68, longitude: 139.7 },
        { id: 'far', latitude: 35.80, longitude: 139.8 },
        { id: 'near', latitude: 35.69, longitude: 139.71 },
        { id: 'end', latitude: 35.85, longitude: 139.85 },
      ];

      const result = optimizeRouteTspWasm(stops, 'drive');
      expect(result.optimized_ids[0]).toBe('start');
      expect(result.optimized_ids[result.optimized_ids.length - 1]).toBe('end');
      expect(result.optimized_ids).toHaveLength(4);
    });
  });
});
