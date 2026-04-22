/**
 * Open-Meteo weather service — https://open-meteo.com (free, no key)
 * Nominatim geocoder for destination → coords (free, no key)
 */

import { DayWeather, WeatherCondition } from '../types/trip';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** WMO weather code → WeatherCondition */
function wmoToCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'sunny';
  if (code <= 3) return 'partly_cloudy';
  if (code <= 48) return 'cloudy';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rainy';
  return 'cloudy';
}

/** WMO code → short description */
function wmoToText(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 2) return 'Mostly Clear';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

/** Generate attire tip from temp + rain probability */
function clothingTip(tempC: number, rain: number): string {
  const layers = tempC < 10 ? 'heavy layers' : tempC < 18 ? 'light jacket' : tempC < 26 ? 'light clothing' : 'breathable summer wear';
  const umbrella = rain >= 40 ? ' Pack an umbrella.' : '';
  return `${layers.charAt(0).toUpperCase() + layers.slice(1)} recommended.${umbrella}`;
}

export interface WeatherFetchResult {
  /** Keyed by YYYY-MM-DD */
  byDate: Record<string, DayWeather>;
  isOffline: boolean;
}

// chisle: in-memory cache, keyed by `lat,lng,startDate`
const _cache = new Map<string, { result: WeatherFetchResult; expiresAt: number }>();
const TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Fetch multi-day forecast from Open-Meteo for given lat/lng and date range.
 * Returns empty byDate on failure — caller should keep existing weather.
 */
export async function fetchWeeklyForecast(
  lat: number,
  lng: number,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<WeatherFetchResult> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${startDate}`;
  const cached = _cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,uv_index_max,relative_humidity_2m_mean,sunrise,sunset',
      hourly: 'temperature_2m,weathercode,precipitation_probability',
      start_date: startDate,
      end_date: endDate,
      timezone: 'auto',
    });

    const res = await fetch(`${OPEN_METEO}?${params}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const byDate: Record<string, DayWeather> = {};
    const days: string[] = data.daily?.time ?? [];

    days.forEach((date: string, i: number) => {
      const highC = Math.round(data.daily.temperature_2m_max[i] ?? 25);
      const lowC = Math.round(data.daily.temperature_2m_min[i] ?? 15);
      const tempC = Math.round((highC + lowC) / 2);
      const code = data.daily.weathercode[i] ?? 0;
      const rain = Math.round(data.daily.precipitation_probability_max[i] ?? 0);
      const humidity = Math.round(data.daily.relative_humidity_2m_mean?.[i] ?? 60);
      const uvIndex = Math.round(data.daily.uv_index_max?.[i] ?? 3);

      const rawSunrise = data.daily?.sunrise?.[i];
      const rawSunset = data.daily?.sunset?.[i];
      const sunrise = formatTimePart(rawSunrise);
      const sunset = formatTimePart(rawSunset);
      const goldenHour = calculateGoldenHourTime(rawSunset);

      // Build hourly chips for this day (every 3h, 8 entries)
      const dayOffset = i * 24;
      const hourly = Array.from({ length: 8 }, (_, h) => {
        const idx = dayOffset + h * 3;
        const hCode = data.hourly?.weathercode?.[idx] ?? code;
        return {
          time: `${String(h * 3).padStart(2, '0')}:00`,
          tempC: Math.round(data.hourly?.temperature_2m?.[idx] ?? tempC),
          condition: wmoToCondition(hCode),
          rainChance: Math.round(data.hourly?.precipitation_probability?.[idx] ?? 0),
        };
      });

      byDate[date] = {
        tempC, highC, lowC,
        condition: wmoToCondition(code),
        conditionText: wmoToText(code),
        rainProbability: rain,
        humidity,
        uvIndex,
        clothingTip: clothingTip(tempC, rain),
        hourly,
        sunrise,
        sunset,
        goldenHour,
      };
    });

    const result: WeatherFetchResult = { byDate, isOffline: false };
    _cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
    return result;
  } catch {
    return { byDate: {}, isOffline: true };
  }
}

/**
 * Geocode a destination string to lat/lng via Nominatim.
 * Returns null on failure.
 */
export async function geocodeDestination(
  destination: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${NOMINATIM}?q=${encodeURIComponent(destination)}&format=json&limit=1`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept-Language': 'en', 'User-Agent': 'MojoLog/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/** ISO date YYYY-MM-DD from trip startDate + day offset (0-indexed) */
export function tripDayToIso(startDate: string, dayOffset: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

/** Formats "2027-01-07T17:45" to "05:45 PM" */
export function formatTimePart(isoStr?: string): string | undefined {
  if (!isoStr || !isoStr.includes('T')) return undefined;
  const timePart = isoStr.split('T')[1];
  if (!timePart) return undefined;
  const [h, m] = timePart.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Calculates golden hour (~45 mins before sunset) */
export function calculateGoldenHourTime(sunsetIso?: string): string | undefined {
  if (!sunsetIso || !sunsetIso.includes('T')) return undefined;
  const timePart = sunsetIso.split('T')[1];
  if (!timePart) return undefined;
  const [h, m] = timePart.split(':').map(Number);
  let totalM = h * 60 + m - 45;
  if (totalM < 0) totalM += 1440;
  const ghH = Math.floor(totalM / 60);
  const ghM = totalM % 60;
  const ampm = ghH >= 12 ? 'PM' : 'AM';
  const h12 = ghH % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(ghM).padStart(2, '0')} ${ampm}`;
}
