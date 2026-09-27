/**
 * Frankfurter currency service — https://www.frankfurter.app (free, no key)
 * Falls back to static hardcoded rates when offline.
 */

const FRANKFURTER = 'https://api.frankfurter.app/latest';

// Static fallback rates vs USD (updated 2025-Q3 — good enough for offline UX)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.93, GBP: 0.79, JPY: 149.5, AED: 3.67,
  INR: 83.9, MYR: 4.71, SGD: 1.35, AUD: 1.54, CAD: 1.36,
  CHF: 0.89, CNY: 7.24, HKD: 7.82, KRW: 1320, THB: 35.1,
  NZD: 1.63, MXN: 17.2, BRL: 4.97, ZAR: 18.7, SEK: 10.5,
};

export interface RateResult {
  from: string;
  to: string;
  rate: number;
  date: string;
  isOffline: boolean;
}

// Simple in-memory cache: key = `FROM_TO`, ttl = 4 hours
const _cache = new Map<string, { result: RateResult; expiresAt: number }>();
const TTL_MS = 4 * 60 * 60 * 1000;

function fallback(from: string, to: string): RateResult {
  const fromUsd = FALLBACK_RATES[from.toUpperCase()] ?? 1;
  const toUsd = FALLBACK_RATES[to.toUpperCase()] ?? 1;
  return { from, to, rate: toUsd / fromUsd, date: 'offline', isOffline: true };
}

/**
 * Fetch live rate from Frankfurter. Caches 4 h. Falls back to static table if offline.
 */
export async function fetchRate(from: string, to: string): Promise<RateResult> {
  if (from.toUpperCase() === to.toUpperCase()) {
    return { from, to, rate: 1, date: new Date().toISOString().slice(0, 10), isOffline: false };
  }

  const key = `${from}_${to}`;
  const cached = _cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  try {
    const res = await fetch(`${FRANKFURTER}?from=${from}&to=${to}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: { date: string; rates: Record<string, number> } = await res.json();
    const rate = data.rates[to.toUpperCase()];
    if (!rate) throw new Error('missing rate');

    const result: RateResult = { from, to, rate, date: data.date, isOffline: false };
    _cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
    return result;
  } catch {
    return fallback(from, to);
  }
}

/** Convert amount from one currency to another */
export async function convert(amount: number, from: string, to: string): Promise<{ converted: number } & RateResult> {
  const r = await fetchRate(from, to);
  return { ...r, converted: amount * r.rate };
}

/** Synchronous offline-only convert (no fetch) */
export function convertOffline(amount: number, from: string, to: string): number {
  const fromUsd = FALLBACK_RATES[from.toUpperCase()] ?? 1;
  const toUsd = FALLBACK_RATES[to.toUpperCase()] ?? 1;
  return amount * (toUsd / fromUsd);
}

export const SUPPORTED_CURRENCIES = Object.keys(FALLBACK_RATES);
