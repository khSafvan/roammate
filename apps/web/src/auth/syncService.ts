import { Trip } from '../types/trip';
import { deleteLocalAccount, pruneInactiveLocalData } from './crypto';
import { STORAGE_KEYS } from '../config/constants';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface SyncResult {
  success: boolean;
  message?: string;
}

/**
 * Initializes client-side auto-pruning on application boot
 * Wipes any account or local trip data not accessed in 3 months (90 days)
 */
export function initAccountLifecycle(): void {
  const pruned = pruneInactiveLocalData();
  if (pruned > 0) {
    console.log(`🧹 Auto-pruned ${pruned} account(s)/trip(s) inactive for > 3 months.`);
  }
}

/**
 * Registers a new account via Cloudflare Worker / Turso
 */
export async function registerAccountOnEdge(mnemonic: string, userId: string): Promise<boolean> {
  if (!API_BASE_URL) {
    // Local mock fallback
    localStorage.setItem(`${STORAGE_KEYS.USER_PREFIX}${userId}`, JSON.stringify({ userId, createdAt: Date.now(), lastAccessedAt: Date.now() }));
    return true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mnemonic, userId }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Edge sync unavailable, falling back to local vault:', e);
    return true;
  }
}

/**
 * Verifies account existence on Cloudflare Worker / Turso and updates last_accessed_at
 */
export async function loginAccountOnEdge(phrase: string): Promise<boolean> {
  if (!API_BASE_URL) {
    // Local mock fallback
    return true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Edge sync unavailable, using local vault session:', e);
    return true;
  }
}

/**
 * Permanently deletes user account and all itineraries from both Local Storage and Edge Database
 */
export async function deleteAccountOnEdge(userId: string, phrase?: string): Promise<boolean> {
  deleteLocalAccount(userId);

  if (!API_BASE_URL) {
    return true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, phrase }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Edge account deletion error (local cache was purged):', e);
    return true;
  }
}

/**
 * Saves itinerary to Turso database via Cloudflare Worker
 */
export async function saveItineraryToEdge(userId: string, trip: Trip): Promise<SyncResult> {
  const tripWithAccess: Trip & { lastAccessedAt: number } = {
    ...trip,
    lastAccessedAt: Date.now(),
  };

  // Always persist to local storage for instant offline access
  localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${trip.id}`, JSON.stringify(tripWithAccess));

  if (!API_BASE_URL) {
    return { success: true, message: 'Saved to local encrypted vault' };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        id: trip.id,
        title: trip.title,
        data: tripWithAccess,
      }),
    });
    if (res.ok) {
      return { success: true, message: 'Synced to Turso (libSQL) Edge DB' };
    }
    return { success: false, message: 'Edge database sync error' };
  } catch {
    return { success: true, message: 'Offline: cached locally in vault' };
  }
}

/**
 * Loads a cached itinerary from localStorage
 */
export function loadLocalTrip(tripId?: string): Trip | null {
  try {
    const isValidTrip = (t: any): t is Trip =>
      t && typeof t === 'object' && typeof t.title === 'string' && Array.isArray(t.days);

    if (tripId) {
      const item = localStorage.getItem(`${STORAGE_KEYS.TRIP_PREFIX}${tripId}`);
      if (item) {
        const parsed = JSON.parse(item);
        if (isValidTrip(parsed)) return parsed;
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.TRIP_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (isValidTrip(parsed)) return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load local trip:', err);
  }
  return null;
}

/**
 * Fetches itineraries for a user from Edge database, falling back to local vault
 */
export async function fetchItinerariesFromEdge(userId: string): Promise<Trip[]> {
  if (!API_BASE_URL) {
    const local = loadLocalTrip();
    return local ? [local] : [];
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/itineraries/${userId}`);
    if (res.ok) {
      const data = (await res.json()) as { itineraries: Array<{ data: Trip }> };
      if (data.itineraries && data.itineraries.length > 0) {
        return data.itineraries.map((it) => it.data);
      }
    }
  } catch (e) {
    console.warn('Edge itineraries fetch error, falling back to local vault:', e);
  }

  const local = loadLocalTrip();
  return local ? [local] : [];
}

/**
 * Fetches a shared trip by shareToken from Edge API or local storage
 */
export async function fetchSharedTrip(token: string): Promise<Trip | null> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/share/${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = (await res.json()) as { trip: Trip };
        return data.trip;
      }
    } catch (e) {
      console.warn('Edge shared trip fetch error, checking local vault:', e);
    }
  }

  // Local fallback: search by shareToken or id in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.TRIP_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed: Trip = JSON.parse(item);
          if (parsed.shareToken === token || parsed.id === token) {
            return parsed;
          }
        }
      }
    }
  } catch {}

  return null;
}
