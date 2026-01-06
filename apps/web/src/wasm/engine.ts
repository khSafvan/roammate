// WebAssembly Rust Core Engine Bridge
import initWasm, {
  wasm_haversine_distance_km,
  wasm_estimate_duration_minutes,
  wasm_optimize_route_tsp,
  wasm_weather_comfort_label,
  wasm_compute_transit_legs,
  wasm_generate_day_gpx,
  wasm_format_gpx_coordinate,
  wasm_compute_expense_breakdown,
} from '../pkg/rust_core.js';
import wasmUrl from '../pkg/rust_core_bg.wasm?url';
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

let isWasmLoaded = false;
let wasmInitPromise: Promise<boolean> | null = null;

/**
 * Initializes the Rust WebAssembly module in the browser
 */
export async function initRustCore(): Promise<boolean> {
  if (isWasmLoaded) return true;
  if (wasmInitPromise) return wasmInitPromise;

  wasmInitPromise = (async () => {
    try {
      await initWasm({ module_or_path: wasmUrl });
      isWasmLoaded = true;
      console.log('⚡ Rust WebAssembly Core loaded successfully!');
      return true;
    } catch (err) {
      console.warn('WASM initialization fallback to JS math:', err);
      return false;
    }
  })();

  return wasmInitPromise;
}

export function isRustReady(): boolean {
  return isWasmLoaded;
}

/**
 * Compute Haversine distance via native Rust WASM (or fallback)
 */
export function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (isWasmLoaded) {
    return wasm_haversine_distance_km(lat1, lon1, lat2, lon2);
  }
  // JS fallback
  const R = TRANSIT_CONFIG.EARTH_RADIUS_KM;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Estimate transit duration via native Rust WASM (or fallback)
 */
export function estimateDurationMins(distanceKm: number, mode: 'drive' | 'walk' | 'transit'): number {
  if (isWasmLoaded) {
    return wasm_estimate_duration_minutes(distanceKm, mode);
  }
  const roadDist = distanceKm * TRANSIT_CONFIG.ROAD_WINDING_FACTOR;
  const cfg = TRANSIT_CONFIG.MODES[mode] || TRANSIT_CONFIG.MODES.drive;
  const rawMins = (roadDist / cfg.speedKmH) * 60 + cfg.bufferMins;
  return Math.max(cfg.minMins, Math.round(rawMins));
}

/**
 * 2-opt Traveling Salesperson day route optimizer running in Rust WASM
 */
export function optimizeRouteTspWasm(
  stops: Array<{ id: string; latitude: number; longitude: number }>,
  mode: 'drive' | 'walk' | 'transit' = 'drive'
): OptimizationResult {
  if (isWasmLoaded) {
    try {
      const json = JSON.stringify(stops);
      const resStr = wasm_optimize_route_tsp(json, mode);
      return JSON.parse(resStr);
    } catch (e) {
      console.error('Rust TSP execution error:', e);
    }
  }

  // Pure JS fallback
  return {
    optimized_ids: stops.map((s) => s.id),
    original_duration_mins: 0,
    optimized_duration_mins: 0,
    minutes_saved: 0,
    total_distance_km: 0,
  };
}

/**
 * Weather Comfort Label computed in Rust
 */
export function getWeatherComfortLabel(tempC: number, humidity: number, rainChance: number): string {
  if (isWasmLoaded) {
    return wasm_weather_comfort_label(tempC, humidity, rainChance);
  }
  if (rainChance >= 60) return 'Rain gear essential · Wet conditions';
  if (tempC >= 28) return 'High heat index · Stay hydrated';
  if (tempC <= 12) return 'Crisp & cool · Warm layers recommended';
  return 'Ideal travel weather · Perfect for walking';
}

/**
 * Batch computes multi-modal transit legs via native Rust WASM in a single pass
 */
export function computeTransitLegsWasm(
  stops: ItineraryStop[],
  modes: Record<string, TransitMode>
): TransitLeg[] {
  if (isWasmLoaded && stops.length >= 2) {
    try {
      const stopsCoord = stops.map((s) => ({
        id: s.id,
        latitude: s.coordinates.latitude,
        longitude: s.coordinates.longitude,
      }));
      const resStr = wasm_compute_transit_legs(JSON.stringify(stopsCoord), JSON.stringify(modes));
      const parsed = JSON.parse(resStr);
      return parsed.map((item: any) => ({
        fromStopId: item.from_stop_id,
        toStopId: item.to_stop_id,
        mode: item.mode as TransitMode,
        distanceKm: item.distance_km,
        durationMinutes: item.duration_minutes,
        isOutlier: item.is_outlier,
      }));
    } catch (e) {
      console.warn('WASM batch transit error, using JS fallback:', e);
    }
  }

  // JS Fallback
  const legs: TransitLeg[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const legKey = `${from.id}->${to.id}`;
    const mode = modes[legKey] || 'drive';
    const dist = computeDistanceKm(
      from.coordinates.latitude,
      from.coordinates.longitude,
      to.coordinates.latitude,
      to.coordinates.longitude
    );
    const duration = estimateDurationMins(dist, mode);
    legs.push({
      fromStopId: from.id,
      toStopId: to.id,
      mode,
      distanceKm: dist,
      durationMinutes: duration,
      isOutlier: duration > 45 || dist > 20,
    });
  }
  return legs;
}

/**
 * High-speed RFC/Topografix GPX 1.1 XML generation compiled in Rust WASM
 */
export function generateDayGpxWasm(day: TripDay, tripTitle = 'MojoLog Trip'): string {
  if (isWasmLoaded) {
    try {
      const gpxDay = {
        day_number: day.dayNumber,
        title: day.title,
        date_str: day.dateStr,
        stops: day.stops.map((s) => ({
          title: s.title,
          subtitle: s.subtitle,
          category: s.category,
          start_time: s.startTime,
          address: s.address,
          latitude: s.coordinates.latitude,
          longitude: s.coordinates.longitude,
        })),
      };
      return wasm_generate_day_gpx(JSON.stringify(gpxDay), tripTitle);
    } catch (e) {
      console.warn('WASM GPX generation notice, using JS fallback:', e);
    }
  }

  // JS Fallback
  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const waypointsXml = day.stops
    .map((stop, index) => {
      const isStart = index === 0;
      const isFinish = index === day.stops.length - 1 && day.stops.length > 1;
      const tag = isStart ? 'START' : isFinish ? 'FINISH' : `WPT ${index + 1}`;
      const name = `${tag}: ${escapeXml(stop.title)}`;
      const desc = escapeXml(`${stop.subtitle || ''} | ${stop.address} (${stop.startTime})`);
      return `  <wpt lat="${stop.coordinates.latitude.toFixed(6)}" lon="${stop.coordinates.longitude.toFixed(6)}">
    <name>${name}</name>
    <desc>${desc}</desc>
    <sym>${escapeXml(stop.category)}</sym>
    <type>${escapeXml(stop.category)}</type>
  </wpt>`;
    })
    .join('\n');

  const trackPointsXml = day.stops
    .map((stop) => `      <trkpt lat="${stop.coordinates.latitude.toFixed(6)}" lon="${stop.coordinates.longitude.toFixed(6)}">
        <name>${escapeXml(stop.title)}</name>
      </trkpt>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MojoLog / Terraink Engine" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
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

/**
 * Format decimal coordinates to readable lat/lon notation using Rust WASM
 */
export function formatGpxCoordinateWasm(lat: number, lon: number): string {
  if (isWasmLoaded) {
    try {
      return wasm_format_gpx_coordinate(lat, lon);
    } catch {
      // ignore
    }
  }
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

/**
 * Financial calculation & category breakdown in native Rust WebAssembly
 */
export function computeExpenseBreakdownWasm(expenses: Expense[]): ExpenseBreakdownResult {
  if (isWasmLoaded && expenses.length > 0) {
    try {
      const json = JSON.stringify(expenses.map((e) => ({ category: e.category, amount: e.amount })));
      const res = JSON.parse(wasm_compute_expense_breakdown(json));
      const totalsMap: Record<string, number> = {};
      if (res.category_totals) {
        for (const item of res.category_totals) {
          totalsMap[item.category] = item.amount;
        }
      }
      return {
        totalSpent: res.total_spent || 0,
        categoryTotals: totalsMap,
        highestCategory: res.highest_category || '',
        expenseCount: res.expense_count || expenses.length,
      };
    } catch (e) {
      console.warn('WASM expense breakdown error, using JS fallback:', e);
    }
  }

  // JS Fallback
  let sum = 0;
  const totals: Record<string, number> = {};
  for (const exp of expenses) {
    sum += exp.amount;
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
  }
  return {
    totalSpent: Math.round(sum * 100) / 100,
    categoryTotals: totals,
    highestCategory: Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
    expenseCount: expenses.length,
  };
}
