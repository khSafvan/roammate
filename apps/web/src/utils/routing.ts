/**
 * Real Multi-Modal Routing Engine (Roads, Walkways, Rail Tracks, Maritime Fairways & Flight Passages)
 * Integrates OpenStreetMap/OSRM routing with Great-Circle Geodesic flight passage generation
 * and nautical passage curve generation.
 */
import { Coordinates, ItineraryStop, TransitMode } from '../types/trip';
import { computeDistanceKm, estimateDurationMins } from '../wasm/engine';

export type RouteMode = TransitMode | 'flight' | 'boat';

// In-memory cache for instant sub-millisecond retrieval of fetched leg geometries
const routeCache = new Map<string, [number, number][]>();

export interface LegRouteResult {
  fromStopId: string;
  toStopId: string;
  mode: RouteMode;
  coordinates: [number, number][]; // [longitude, latitude]
  distanceKm: number;
  durationMinutes: number;
}

export interface DayRouteData {
  fullCoordinates: [number, number][];
  legs: LegRouteResult[];
  geojson: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  totalDistanceKm: number;
}

/**
 * Detects the realistic transport mode for a leg between two stops based on
 * stop categories, keywords (flight, airport, ferry, boat), or selected transit mode.
 */
export function detectLegMode(
  from: ItineraryStop,
  to: ItineraryStop,
  selectedMode?: TransitMode
): RouteMode {
  // 1. Flight: Aerial corridor when connecting airport to airport
  const isFromFlight = from.category === 'flight' || /\b(airport|airfield|hnd|nrt|jfk|lax)\b/i.test(from.title);
  const isToFlight = to.category === 'flight' || /\b(airport|airfield|hnd|nrt|jfk|lax)\b/i.test(to.title);
  if (isFromFlight && isToFlight) {
    return 'flight';
  }

  // 2. Boat: Water cruise/ferry passage across water between docks/piers
  const isFromBoat = /\b(boat|ferry|cruise|ship|waterbus|water taxi)\b/i.test(from.title + ' ' + (from.subtitle || ''));
  const isToBoat = /\b(boat|ferry|cruise|ship|waterbus|water taxi)\b/i.test(to.title + ' ' + (to.subtitle || ''));
  if (isFromBoat && isToBoat) {
    return 'boat';
  }

  // 3. User-selected mode ('drive', 'walk', or 'transit')
  return selectedMode || 'drive';
}

/**
 * Computes a Great-Circle Geodesic curved passage arc between two points for aviation flights
 */
export function generateGeodesicArc(
  from: Coordinates,
  to: Coordinates,
  numPoints = 35
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const lat1 = from.latitude;
  const lon1 = from.longitude;
  const lat2 = to.latitude;
  const lon2 = to.longitude;

  const phi1 = toRad(lat1);
  const lam1 = toRad(lon1);
  const phi2 = toRad(lat2);
  const lam2 = toRad(lon2);

  const delta = 2 * Math.asin(
    Math.sqrt(
      Math.sin((phi2 - phi1) / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin((lam2 - lam1) / 2) ** 2
    )
  );

  if (delta < 0.0001) {
    return [[lon1, lat1], [lon2, lat2]];
  }

  const coords: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * delta) / Math.sin(delta);
    const B = Math.sin(f * delta) / Math.sin(delta);

    const x = A * Math.cos(phi1) * Math.cos(lam1) + B * Math.cos(phi2) * Math.cos(lam2);
    const y = A * Math.cos(phi1) * Math.sin(lam1) + B * Math.cos(phi2) * Math.sin(lam2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);

    const phi = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lam = Math.atan2(y, x);

    // Subtle parabolic arc offset for aerial flight route elevation
    const arcHeight = Math.sin(f * Math.PI) * Math.min(delta, 0.4) * 0.12;

    coords.push([
      Number(toDeg(lam).toFixed(6)),
      Number((toDeg(phi) + arcHeight).toFixed(6)),
    ]);
  }

  return coords;
}

/**
 * Generates a smooth nautical fairway curve for boat / ferry water passages
 */
export function generateNauticalPassage(
  from: Coordinates,
  to: Coordinates,
  numPoints = 30
): [number, number][] {
  const coords: [number, number][] = [];
  const midLon = (from.longitude + to.longitude) / 2;
  const midLat = (from.latitude + to.latitude) / 2;
  const dLon = to.longitude - from.longitude;
  const dLat = to.latitude - from.latitude;

  // Gentle lateral bow perpendicular to the direct vector, simulating nautical marked channels
  const perpLon = -dLat * 0.16;
  const perpLat = dLon * 0.16;
  const ctrlLon = midLon + perpLon;
  const ctrlLat = midLat + perpLat;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;
    const lon = invT * invT * from.longitude + 2 * invT * t * ctrlLon + t * t * to.longitude;
    const lat = invT * invT * from.latitude + 2 * invT * t * ctrlLat + t * t * to.latitude;
    coords.push([Number(lon.toFixed(6)), Number(lat.toFixed(6))]);
  }
  return coords;
}

/**
 * Intelligent grid corridor interpolation fallback when offline or OSRM unavailable
 */
export function generateCorridorFallback(
  from: Coordinates,
  to: Coordinates
): [number, number][] {
  const points: [number, number][] = [];
  const steps = 6;
  const dLon = (to.longitude - from.longitude) / steps;
  const dLat = (to.latitude - from.latitude) / steps;

  points.push([from.longitude, from.latitude]);
  for (let i = 1; i < steps; i++) {
    // Street grid corridor lateral offset
    const lateralJitter = ((i % 2 === 1 ? 1 : -1) * Math.abs(dLat + dLon) * 0.12);
    points.push([
      Number((from.longitude + dLon * i + lateralJitter).toFixed(6)),
      Number((from.latitude + dLat * i - lateralJitter).toFixed(6)),
    ]);
  }
  points.push([to.longitude, to.latitude]);
  return points;
}

/**
 * Fetches real road / walking path coordinates from OSRM router or generates flight/boat passage
 */
export async function fetchLegRouteGeometry(
  from: ItineraryStop,
  to: ItineraryStop,
  mode: RouteMode
): Promise<{ coordinates: [number, number][]; distanceKm?: number; durationMinutes?: number }> {
  // 1. Flight / Aviation corridor passage
  if (mode === 'flight') {
    const coords = generateGeodesicArc(from.coordinates, to.coordinates, 35);
    return { coordinates: coords };
  }

  // 2. Boat / Maritime fairway passage
  if (mode === 'boat') {
    const coords = generateNauticalPassage(from.coordinates, to.coordinates, 30);
    return { coordinates: coords };
  }

  const cacheKey = `${mode}:${from.coordinates.longitude.toFixed(5)},${from.coordinates.latitude.toFixed(5)}->${to.coordinates.longitude.toFixed(5)},${to.coordinates.latitude.toFixed(5)}`;
  if (routeCache.has(cacheKey)) {
    return { coordinates: routeCache.get(cacheKey)! };
  }

  // 3. Real Road / Walking / Transit corridor via OSRM
  const profile = mode === 'walk' ? 'walking' : 'driving';
  const osrmBase = (import.meta.env?.VITE_OSRM_ROUTER_URL as string) || 'https://router.project-osrm.org';
  const url = `${osrmBase}/route/v1/${profile}/${from.coordinates.longitude},${from.coordinates.latitude};${to.coordinates.longitude},${to.coordinates.latitude}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.routes?.[0]?.geometry?.coordinates && data.routes[0].geometry.coordinates.length >= 2) {
        const coords = data.routes[0].geometry.coordinates as [number, number][];
        routeCache.set(cacheKey, coords);
        const distKm = Number((data.routes[0].distance / 1000).toFixed(1));
        const durMins = Math.round(data.routes[0].duration / 60);
        return { coordinates: coords, distanceKm: distKm, durationMinutes: durMins };
      }
    }
  } catch (err) {
    // Offline or timeout -> fall back to corridor simulation
  }

  const fallback = generateCorridorFallback(from.coordinates, to.coordinates);
  routeCache.set(cacheKey, fallback);
  return { coordinates: fallback };
}

/**
 * Builds complete multi-modal GeoJSON dataset with road, walking, rail transit, boat fairway, and flight passage layers
 */
export async function computeDayRouteData(
  stops: ItineraryStop[],
  transitModes: Record<string, TransitMode> = {}
): Promise<DayRouteData> {
  if (stops.length < 2) {
    return {
      fullCoordinates: stops.map((s) => [s.coordinates.longitude, s.coordinates.latitude]),
      legs: [],
      geojson: { type: 'FeatureCollection', features: [] },
      totalDistanceKm: 0,
    };
  }

  const legs: LegRouteResult[] = [];
  const fullCoordinates: [number, number][] = [];
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  let calculatedTotalDist = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const key = `${from.id}->${to.id}`;
    const selectedMode = transitModes[key] || 'drive';
    const effectiveMode = detectLegMode(from, to, selectedMode);

    const legRes = await fetchLegRouteGeometry(from, to, effectiveMode);
    const coords = legRes.coordinates;

    const defaultDist = computeDistanceKm(
      from.coordinates.latitude,
      from.coordinates.longitude,
      to.coordinates.latitude,
      to.coordinates.longitude
    );
    const dist = legRes.distanceKm ?? Number((defaultDist * (effectiveMode === 'walk' ? 1.15 : 1.25)).toFixed(1));
    const dur = legRes.durationMinutes ?? estimateDurationMins(dist, effectiveMode === 'walk' ? 'walk' : 'drive');

    calculatedTotalDist += dist;

    legs.push({
      fromStopId: from.id,
      toStopId: to.id,
      mode: effectiveMode,
      coordinates: coords,
      distanceKm: dist,
      durationMinutes: dur,
    });

    // Append to combined coordinates, avoiding duplicate junction vertices
    if (fullCoordinates.length === 0) {
      fullCoordinates.push(...coords);
    } else {
      fullCoordinates.push(...coords.slice(1));
    }

    // GeoJSON Feature for this specific leg with mode tagging for dedicated styling
    features.push({
      type: 'Feature',
      properties: {
        legIndex: i,
        fromStopId: from.id,
        toStopId: to.id,
        mode: effectiveMode,
        distanceKm: dist,
        durationMinutes: dur,
      },
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    });
  }

  return {
    fullCoordinates,
    legs,
    geojson: {
      type: 'FeatureCollection',
      features,
    },
    totalDistanceKm: Number(calculatedTotalDist.toFixed(1)),
  };
}
