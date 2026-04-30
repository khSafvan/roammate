import { TRANSIT_CONFIG } from '../config/constants';
import { Expense, ItineraryStop, TransitLeg, TransitMode, TripDay } from '../types/trip';

export interface OptimizationResult {
  optimized_ids: string[];
  original_duration_mins: number;
  optimized_duration_mins: number;
  minutes_saved: number;
  total_distance_km: number;
}

export interface ExpenseBreakdownResult {
  totalSpent: number;
  categoryTotals: Record<string, number>;
  highestCategory: string;
  expenseCount: number;
}

/** Great-circle Haversine distance, rounded to 0.1 km. */
export function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = TRANSIT_CONFIG.EARTH_RADIUS_KM;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lon2 - lon1);
  const latitude1 = toRadians(lat1);
  const latitude2 = toRadians(lat2);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Number((radiusKm * angularDistance).toFixed(1));
}

/** Estimate duration using the project's urban road and mode assumptions. */
export function estimateDurationMins(distanceKm: number, mode: TransitMode): number {
  const roadDistance = distanceKm * TRANSIT_CONFIG.ROAD_WINDING_FACTOR;
  const modeConfig = TRANSIT_CONFIG.MODES[mode] || TRANSIT_CONFIG.MODES.drive;
  const rawMinutes = (roadDistance / modeConfig.speedKmH) * 60 + modeConfig.bufferMins;
  return Math.max(modeConfig.minMins, Math.round(rawMinutes));
}

/** 2-opt route optimization with fixed start and end stops. */
export function optimizeRouteTsp(
  stops: Array<{ id: string; latitude: number; longitude: number }>,
  mode: TransitMode = 'drive'
): OptimizationResult {
  const route = stops.map((_, index) => index);
  const count = route.length;
  if (count < 2) {
    return {
      optimized_ids: stops.map((stop) => stop.id),
      original_duration_mins: 0,
      optimized_duration_mins: 0,
      minutes_saved: 0,
      total_distance_km: 0,
    };
  }

  const distances = Array.from({ length: count }, () => Array<number>(count).fill(0));
  const durations = Array.from({ length: count }, () => Array<number>(count).fill(0));
  for (let from = 0; from < count; from += 1) {
    for (let to = from + 1; to < count; to += 1) {
      const distance = computeDistanceKm(
        stops[from].latitude,
        stops[from].longitude,
        stops[to].latitude,
        stops[to].longitude
      );
      distances[from][to] = distance;
      distances[to][from] = distance;
      durations[from][to] = estimateDurationMins(distance, mode);
      durations[to][from] = durations[from][to];
    }
  }

  const getDuration = () => route.slice(0, -1).reduce(
    (total, stopIndex, index) => total + durations[stopIndex][route[index + 1]],
    0
  );
  const originalDuration = getDuration();
  let optimizedDuration = originalDuration;
  let improved = true;
  let passes = 0;

  while (improved && passes < 100) {
    improved = false;
    passes += 1;
    for (let start = 1; start < count - 2; start += 1) {
      for (let end = start + 1; end < count - 1; end += 1) {
        const before = route[start - 1];
        const first = route[start];
        const last = route[end];
        const after = route[end + 1];
        const oldCost = durations[before][first] + durations[last][after];
        const newCost = durations[before][last] + durations[first][after];
        if (newCost < oldCost) {
          route.splice(start, end - start + 1, ...route.slice(start, end + 1).reverse());
          optimizedDuration += newCost - oldCost;
          improved = true;
        }
      }
    }
  }

  const totalDistance = route.slice(0, -1).reduce(
    (total, stopIndex, index) => total + distances[stopIndex][route[index + 1]],
    0
  );
  return {
    optimized_ids: route.map((index) => stops[index].id),
    original_duration_mins: originalDuration,
    optimized_duration_mins: optimizedDuration,
    minutes_saved: Math.max(0, originalDuration - optimizedDuration),
    total_distance_km: Number(totalDistance.toFixed(1)),
  };
}

export function getWeatherComfortLabel(tempC: number, humidity: number, rainChance: number): string {
  if (rainChance >= 60) return 'Rain gear essential · Wet conditions';
  if (tempC >= 28 && humidity >= 65) return 'High heat index · Stay hydrated';
  if (tempC <= 12) return 'Crisp & cool · Warm layers recommended';
  if (tempC >= 18 && tempC <= 24 && rainChance <= 20) return 'Ideal travel weather · Perfect for walking';
  return 'Mild conditions · Comfortable for exploration';
}

export function computeTransitLegs(
  stops: ItineraryStop[],
  modes: Record<string, TransitMode>
): TransitLeg[] {
  const legs: TransitLeg[] = [];
  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index];
    const to = stops[index + 1];
    const mode = modes[`${from.id}->${to.id}`] || 'drive';
    const isNoteLeg = from.category === 'note' || to.category === 'note';
    const distanceKm = isNoteLeg
      ? 0
      : computeDistanceKm(
          from.coordinates.latitude,
          from.coordinates.longitude,
          to.coordinates.latitude,
          to.coordinates.longitude
        );
    const durationMinutes = isNoteLeg ? 0 : estimateDurationMins(distanceKm, mode);
    legs.push({
      fromStopId: from.id,
      toStopId: to.id,
      mode,
      distanceKm,
      durationMinutes,
      isOutlier: !isNoteLeg && (durationMinutes > 45 || distanceKm > 20),
    });
  }
  return legs;
}

export function generateDayGpx(day: TripDay, tripTitle = 'roammate Trip'): string {
  const geoStops = day.stops.filter((stop) => stop.category !== 'note');
  const escapeXml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  const waypointsXml = geoStops.map((stop, index) => {
    const tag = index === 0 ? 'START' : index === geoStops.length - 1 && geoStops.length > 1
      ? 'FINISH'
      : `WPT ${index + 1}`;
    const name = `${tag}: ${escapeXml(stop.title)}`;
    const description = escapeXml(`${stop.subtitle || ''} | ${stop.address} (${stop.startTime})`);
    return `  <wpt lat="${stop.coordinates.latitude.toFixed(6)}" lon="${stop.coordinates.longitude.toFixed(6)}">
    <name>${name}</name>
    <desc>${description}</desc>
    <sym>${escapeXml(stop.category)}</sym>
    <type>${escapeXml(stop.category)}</type>
  </wpt>`;
  }).join('\n');
  const trackPointsXml = geoStops.map((stop) => `      <trkpt lat="${stop.coordinates.latitude.toFixed(6)}" lon="${stop.coordinates.longitude.toFixed(6)}">
        <name>${escapeXml(stop.title)}</name>
      </trkpt>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="roammate / TerraWay Engine" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(tripTitle)} — Day ${day.dayNumber}: ${escapeXml(day.title)}</name>
    <desc>${escapeXml(day.dateStr)} route track and waypoints</desc>
  </metadata>
${waypointsXml}
  <trk>
    <name>Day ${day.dayNumber} Route Track</name>
    <trkseg>
${trackPointsXml}
    </trkseg>
  </trk>
</gpx>`;
}

export function formatGpxCoordinate(latitude: number, longitude: number): string {
  const latitudeDirection = latitude >= 0 ? 'N' : 'S';
  const longitudeDirection = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(4)}° ${latitudeDirection}, ${Math.abs(longitude).toFixed(4)}° ${longitudeDirection}`;
}

export function computeExpenseBreakdown(expenses: Expense[]): ExpenseBreakdownResult {
  let totalSpent = 0;
  const categoryTotals: Record<string, number> = {};
  for (const expense of expenses) {
    totalSpent += expense.amount;
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
  }
  const highestCategory = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    categoryTotals,
    highestCategory,
    expenseCount: expenses.length,
  };
}
