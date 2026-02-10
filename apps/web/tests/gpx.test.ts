import { describe, expect, it } from 'vitest';
import { formatGpxCoordinate, generateDayGpx } from '../src/utils/gpx';
import { TripDay } from '../src/types/trip';

describe('GPX Utilities', () => {
  describe('formatGpxCoordinate', () => {
    it('formats northern and eastern coordinates correctly', () => {
      const formatted = formatGpxCoordinate(35.6953, 139.7022);
      expect(formatted).toBe('35.6953° N, 139.7022° E');
    });

    it('formats southern and western coordinates correctly', () => {
      const formatted = formatGpxCoordinate(-33.8688, -151.2093);
      expect(formatted).toBe('33.8688° S, 151.2093° W');
    });

    it('handles zero coordinates', () => {
      const formatted = formatGpxCoordinate(0, 0);
      expect(formatted).toBe('0.0000° N, 0.0000° E');
    });
  });

  describe('generateDayGpx', () => {
    const mockDay: TripDay = {
      id: 'day-1',
      dayNumber: 1,
      title: 'Tokyo Arrival & Shinjuku',
      dateStr: 'Mon, Oct 14',
      themeColor: '#2563EB',
      stops: [
        {
          id: 'stop-1',
          orderIndex: 1,
          title: 'Narita Airport & Terminal 1',
          subtitle: 'Arrival flight',
          address: 'Narita, Chiba',
          category: 'flight',
          startTime: '14:30',
          durationMinutes: 120,
          coordinates: { latitude: 35.771987, longitude: 140.392852 },
        },
        {
          id: 'stop-2',
          orderIndex: 2,
          title: 'Shinjuku Prince Hotel',
          subtitle: 'Check in',
          address: 'Shinjuku, Tokyo',
          category: 'lodging',
          startTime: '17:00',
          durationMinutes: 60,
          coordinates: { latitude: 35.6953, longitude: 139.7005 },
        },
        {
          id: 'stop-3',
          orderIndex: 3,
          title: 'Omoide Yokocho',
          subtitle: 'Yakitori dinner',
          address: 'Nishishinjuku, Tokyo',
          category: 'dining',
          startTime: '19:00',
          durationMinutes: 90,
          coordinates: { latitude: 35.6932, longitude: 139.6998 },
        },
      ],
      weather: {
        tempC: 21,
        highC: 23,
        lowC: 16,
        condition: 'partly_cloudy',
        conditionText: 'Partly Cloudy',
        humidity: 55,
        rainProbability: 10,
        uvIndex: 4,
        clothingTip: 'Light jacket',
        hourly: [],
      },
    };

    it('generates standard GPX 1.1 XML structure', () => {
      const gpx = generateDayGpx(mockDay, 'Tokyo Adventure');

      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(gpx).toContain('<gpx version="1.1" creator="roammate / TerraWay Engine"');
      expect(gpx).toContain('<metadata>');
      expect(gpx).toContain('Tokyo Adventure — Day 1: Tokyo Arrival &amp; Shinjuku');
    });

    it('creates correct waypoints with START, intermediate, and FINISH tags', () => {
      const gpx = generateDayGpx(mockDay, 'Tokyo Adventure');

      expect(gpx).toContain('<name>START: Narita Airport &amp; Terminal 1</name>');
      expect(gpx).toContain('<name>WPT 2: Shinjuku Prince Hotel</name>');
      expect(gpx).toContain('<name>FINISH: Omoide Yokocho</name>');
      expect(gpx).toContain('lat="35.771987" lon="140.392852"');
    });

    it('includes a continuous track with all stops', () => {
      const gpx = generateDayGpx(mockDay, 'Tokyo Adventure');

      expect(gpx).toContain('<trk>');
      expect(gpx).toContain('<name>Day 1 Route Track</name>');
      expect(gpx).toContain('<trkseg>');
      expect(gpx).toContain('<trkpt lat="35.771987" lon="140.392852">');
      expect(gpx).toContain('<name>Narita Airport &amp; Terminal 1</name>');
    });

    it('escapes special XML characters in text fields', () => {
      const dayWithSpecialChars: TripDay = {
        ...mockDay,
        title: 'Art & Design <Gallery> "Tokyo"',
        stops: [
          {
            ...mockDay.stops[0],
            title: 'Mori Art & Museum <Roppongi>',
          },
        ],
      };

      const gpx = generateDayGpx(dayWithSpecialChars, 'Special & Test');
      expect(gpx).toContain('Special &amp; Test — Day 1: Art &amp; Design &lt;Gallery&gt; &quot;Tokyo&quot;');
      expect(gpx).toContain('START: Mori Art &amp; Museum &lt;Roppongi&gt;');
    });
  });
});
