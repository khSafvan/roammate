import { describe, expect, it } from 'vitest';
import {
  computeDayRouteData,
  detectLegMode,
  generateCorridorFallback,
  generateGeodesicArc,
  generateNauticalPassage,
} from '../src/utils/routing';
import { ItineraryStop } from '../src/types/trip';

describe('Multi-Modal Routing Engine', () => {
  const airportHND: ItineraryStop = {
    id: 's-hnd',
    orderIndex: 1,
    title: 'Haneda Airport (HND)',
    subtitle: 'Terminal 3 Gate 112',
    category: 'flight',
    startTime: '02:30 PM',
    durationMinutes: 90,
    coordinates: { latitude: 35.5494, longitude: 139.7798 },
    address: 'Haneda Airport, Tokyo',
  };

  const airportJFK: ItineraryStop = {
    id: 's-jfk',
    orderIndex: 2,
    title: 'New York JFK Airport',
    subtitle: 'Terminal 8',
    category: 'flight',
    startTime: '08:00 AM',
    durationMinutes: 120,
    coordinates: { latitude: 40.6413, longitude: -73.7781 },
    address: 'Queens, NY 11430',
  };

  const hotelStop: ItineraryStop = {
    id: 's-hotel',
    orderIndex: 2,
    title: 'Hotel Gracery Shinjuku',
    subtitle: 'Check-in Room 2408',
    category: 'lodging',
    startTime: '04:45 PM',
    durationMinutes: 60,
    coordinates: { latitude: 35.6953, longitude: 139.7022 },
    address: 'Kabukicho, Shinjuku City',
  };

  const boatPier1: ItineraryStop = {
    id: 's-boat1',
    orderIndex: 3,
    title: 'Hakone-machi Boat Pier',
    subtitle: 'Lake Ashi Sightseeing Cruise Ferry',
    category: 'transit',
    startTime: '10:00 AM',
    durationMinutes: 45,
    coordinates: { latitude: 35.2045, longitude: 139.0255 },
    address: 'Hakone-machi, Ashigarashimo',
  };

  const boatPier2: ItineraryStop = {
    id: 's-boat2',
    orderIndex: 4,
    title: 'Togendai Boat Pier',
    subtitle: 'Hakone Pirate Ship Cruise Terminal',
    category: 'transit',
    startTime: '11:00 AM',
    durationMinutes: 45,
    coordinates: { latitude: 35.2392, longitude: 138.9951 },
    address: 'Hakone-machi, Ashigarashimo',
  };

  const walkStop: ItineraryStop = {
    id: 's-shrine',
    orderIndex: 5,
    title: 'Hakone Shrine Torii of Peace',
    subtitle: 'Lakeside walk',
    category: 'sight',
    startTime: '12:15 PM',
    durationMinutes: 60,
    coordinates: { latitude: 35.2052, longitude: 139.0268 },
    address: 'Motohakone, Hakone',
  };

  it('detects correct transit modes based on stop types and user selection', () => {
    // Flight detection between airports
    expect(detectLegMode(airportJFK, airportHND, 'drive')).toBe('flight');

    // Airport ground transfer to hotel follows road/transit
    expect(detectLegMode(airportHND, hotelStop, 'drive')).toBe('drive');
    expect(detectLegMode(airportHND, hotelStop, 'transit')).toBe('transit');

    // Boat detection between water cruise terminals
    expect(detectLegMode(boatPier1, boatPier2, 'drive')).toBe('boat');

    // Selected user mode for normal stops
    expect(detectLegMode(boatPier2, walkStop, 'walk')).toBe('walk');
    expect(detectLegMode(hotelStop, walkStop, 'transit')).toBe('transit');
    expect(detectLegMode(hotelStop, walkStop, 'drive')).toBe('drive');
  });

  it('generates smooth Great-Circle Geodesic arcs for flights', () => {
    const arc = generateGeodesicArc(airportJFK.coordinates, airportHND.coordinates, 20);
    expect(arc.length).toBe(21); // 0..20
    expect(arc[0][0]).toBeCloseTo(airportJFK.coordinates.longitude, 2);
    expect(arc[0][1]).toBeCloseTo(airportJFK.coordinates.latitude, 2);
    expect(arc[arc.length - 1][0]).toBeCloseTo(airportHND.coordinates.longitude, 2);
    expect(arc[arc.length - 1][1]).toBeCloseTo(airportHND.coordinates.latitude, 2);
  });

  it('generates smooth nautical passage fairways for boat/ferry routes', () => {
    const passage = generateNauticalPassage(boatPier1.coordinates, boatPier2.coordinates, 15);
    expect(passage.length).toBe(16);
    expect(passage[0][0]).toBeCloseTo(boatPier1.coordinates.longitude, 3);
    expect(passage[passage.length - 1][0]).toBeCloseTo(boatPier2.coordinates.longitude, 3);
  });

  it('generates corridor fallback waypoints when offline', () => {
    const corridor = generateCorridorFallback(hotelStop.coordinates, walkStop.coordinates);
    expect(corridor.length).toBe(7);
    expect(corridor[0][0]).toBeCloseTo(hotelStop.coordinates.longitude, 4);
    expect(corridor[corridor.length - 1][0]).toBeCloseTo(walkStop.coordinates.longitude, 4);
  });

  it('assembles complete multi-modal GeoJSON dataset with road, passage, and track features', async () => {
    const stops = [airportHND, hotelStop, boatPier1, boatPier2, walkStop];
    const transitModes = {
      [`${airportHND.id}->${hotelStop.id}`]: 'drive' as const,
      [`${hotelStop.id}->${boatPier1.id}`]: 'transit' as const,
      [`${boatPier1.id}->${boatPier2.id}`]: 'drive' as const, // auto-detected as boat
      [`${boatPier2.id}->${walkStop.id}`]: 'walk' as const,
    };

    const routeData = await computeDayRouteData(stops, transitModes);

    expect(routeData.legs.length).toBe(4);
    expect(routeData.legs[0].mode).toBe('drive');
    expect(routeData.legs[1].mode).toBe('transit');
    expect(routeData.legs[2].mode).toBe('boat');
    expect(routeData.legs[3].mode).toBe('walk');

    expect(routeData.fullCoordinates.length).toBeGreaterThan(15);
    expect(routeData.geojson.features.length).toBe(4);
    expect(routeData.totalDistanceKm).toBeGreaterThan(0);

    // Verify GeoJSON structure for MapLibre styling
    routeData.geojson.features.forEach((feature) => {
      expect(feature.type).toBe('Feature');
      expect(feature.geometry.type).toBe('LineString');
      expect(feature.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
      expect(['drive', 'walk', 'transit', 'flight', 'boat']).toContain(feature.properties.mode);
    });
  }, 15000);
});
