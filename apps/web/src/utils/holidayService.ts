/**
 * Nager.Date public holiday service — https://date.nager.at (free, no key)
 */

const NAGER = 'https://date.nager.at/api/v3/PublicHolidays';

export interface PublicHoliday {
  date: string;   // YYYY-MM-DD
  name: string;   // English name
  localName: string;
}

// Cache: key = `countryCode_year`
const _cache = new Map<string, { data: PublicHoliday[]; expiresAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch public holidays for a country + year.
 * Returns [] on failure (offline/unsupported country).
 */
export async function fetchHolidays(countryCode: string, year: number): Promise<PublicHoliday[]> {
  const key = `${countryCode.toUpperCase()}_${year}`;
  const cached = _cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  try {
    const res = await fetch(`${NAGER}/${year}/${countryCode.toUpperCase()}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: PublicHoliday[] = await res.json();
    _cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
    return data;
  } catch {
    return [];
  }
}

/**
 * Fetch holidays covering a date range (may span two years).
 * Returns Record<YYYY-MM-DD, holiday name>.
 */
export async function fetchHolidaysForRange(
  countryCode: string,
  startDate: string,
  endDate: string
): Promise<Record<string, string>> {
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();

  const years = startYear === endYear ? [startYear] : [startYear, endYear];
  const all = (await Promise.all(years.map((y) => fetchHolidays(countryCode, y)))).flat();

  const byDate: Record<string, string> = {};
  for (const h of all) {
    if (h.date >= startDate && h.date <= endDate) {
      byDate[h.date] = h.localName || h.name;
    }
  }
  return byDate;
}

export function clearHolidayCache(): void {
  _cache.clear();
}
