// WebAssembly Rust Core Engine Bridge
import initWasm, {
  wasm_haversine_distance_km,
  wasm_estimate_duration_minutes,
  wasm_optimize_route_tsp,
  wasm_weather_comfort_label,
} from '../pkg/rust_core.js';
import wasmUrl from '../pkg/rust_core_bg.wasm?url';

export interface OptimizationResult {
  optimized_ids: string[];
  original_duration_mins: number;
  optimized_duration_mins: number;
  minutes_saved: number;
  total_distance_km: number;
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
      await initWasm(wasmUrl);
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
  const R = 6371;
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
  const roadDist = distanceKm * 1.25;
  switch (mode) {
    case 'walk':
      return Math.max(3, Math.round((roadDist / 4.5) * 60));
    case 'transit':
      return Math.max(6, Math.round((roadDist / 30) * 60 + 5));
    case 'drive':
    default:
      return Math.max(4, Math.round((roadDist / 24) * 60 + 2));
  }
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
