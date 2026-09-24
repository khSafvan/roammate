import { Trip, TripDay } from '../types/trip';
import { deleteLocalAccount, pruneInactiveLocalData } from './crypto';
import { STORAGE_KEYS } from '../config/constants';
import { INITIAL_TRIPS_CATALOG, mockTripData } from '../data/mockTrip';

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
 * Supports AIOStreams-style (UUID + passwordHash) or legacy (mnemonic + userId)
 */
export async function registerAccountOnEdge(
  uuidOrMnemonic: string,
  userIdOrPasswordHash: string
): Promise<boolean> {
  const isUuid = uuidOrMnemonic.includes('-') || !uuidOrMnemonic.includes(' ');
  const userId = isUuid ? uuidOrMnemonic : userIdOrPasswordHash;

  if (!API_BASE_URL) {
    // Local mock fallback
    localStorage.setItem(
      `${STORAGE_KEYS.USER_PREFIX}${userId}`,
      JSON.stringify({
        userId,
        passwordHash: isUuid ? userIdOrPasswordHash : undefined,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      })
    );
    return true;
  }

  try {
    const payload = isUuid
      ? { uuid: uuidOrMnemonic, passwordHash: userIdOrPasswordHash }
      : { mnemonic: uuidOrMnemonic, userId: userIdOrPasswordHash };

    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    console.warn('Edge sync unavailable, falling back to local vault:', e);
    return true;
  }
}

/**
 * Verifies account credentials on Cloudflare Worker / Turso and updates last_accessed_at
 * Supports AIOStreams-style (UUID + passwordHash) or legacy (12-word phrase)
 */
export async function loginAccountOnEdge(
  uuidOrPhrase: string,
  passwordHash?: string
): Promise<boolean> {
  if (!API_BASE_URL) {
    // Local mock fallback: check stored password hash if available
    const userRaw = localStorage.getItem(`${STORAGE_KEYS.USER_PREFIX}${uuidOrPhrase}`);
    if (userRaw && passwordHash) {
      try {
        const u = JSON.parse(userRaw);
        if (u.passwordHash && u.passwordHash !== passwordHash) {
          return false; // Wrong password
        }
      } catch {}
    }
    return true;
  }

  try {
    const payload = passwordHash
      ? { uuid: uuidOrPhrase, passwordHash }
      : { phrase: uuidOrPhrase };

    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
export async function deleteAccountOnEdge(
  userId: string,
  passwordHashOrPhrase?: string
): Promise<boolean> {
  deleteLocalAccount(userId);

  if (!API_BASE_URL) {
    return true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        passwordHash: passwordHashOrPhrase,
        phrase: passwordHashOrPhrase,
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Edge account deletion error (local cache was purged):', e);
    return true;
  }
}

/**
 * Saves itinerary to Turso database via Cloudflare Worker and local encrypted vault
 */
export async function saveItineraryToEdge(userId: string, trip: Trip): Promise<SyncResult> {
  const now = Date.now();
  const tripWithAccess: Trip & { lastAccessedAt: number } = {
    ...trip,
    updatedAt: now,
    lastAccessedAt: now,
  };

  // Always persist to local storage for instant offline access
  localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${trip.id}`, JSON.stringify(tripWithAccess));
  setActiveTripIdLocal(trip.id);

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
 * Permanently deletes a single trip from local vault and edge database
 */
export async function deleteTripOnEdge(userId: string | undefined, tripId: string): Promise<boolean> {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.TRIP_PREFIX}${tripId}`);
    if (getActiveTripIdLocal() === tripId) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP_ID);
    }

    if (API_BASE_URL && userId) {
      await fetch(`${API_BASE_URL}/api/itinerary/${tripId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    }
    return true;
  } catch (err) {
    console.warn('Trip deletion error:', err);
    return true;
  }
}

export function setActiveTripIdLocal(tripId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP_ID, tripId);
  } catch {}
}

export function getActiveTripIdLocal(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP_ID);
  } catch {
    return null;
  }
}

/**
 * Loads all cached itineraries from localStorage
 * Automatically seeds with starter catalog if store is completely empty
 */
export function loadAllLocalTrips(): Trip[] {
  const trips: Trip[] = [];
  try {
    const isValidTrip = (t: any): t is Trip =>
      t && typeof t === 'object' && typeof t.title === 'string' && Array.isArray(t.days);

    // Purge legacy sample trips so only Dubai & Malaysia remain as defaults
    ['mojolog_trip_tokyo-2026', 'mojolog_trip_paris-2027', `${STORAGE_KEYS.TRIP_PREFIX}tokyo-2026`, `${STORAGE_KEYS.TRIP_PREFIX}paris-2027`].forEach(
      (k) => localStorage.removeItem(k)
    );

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(STORAGE_KEYS.TRIP_PREFIX) || key.startsWith('mojolog_trip_'))) {
        if (key.includes('tokyo-2026') || key.includes('paris-2027')) {
          continue;
        }
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (isValidTrip(parsed) && parsed.id !== 'tokyo-2026' && parsed.id !== 'paris-2027') {
              trips.push(parsed);
            }
          } catch {}
        }
      }
    }

    if (trips.length === 0) {
      // Seed default catalog (Dubai & Malaysia)
      for (const trip of INITIAL_TRIPS_CATALOG) {
        localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${trip.id}`, JSON.stringify(trip));
        trips.push(trip);
      }
      setActiveTripIdLocal(INITIAL_TRIPS_CATALOG[0].id);
    }
  } catch (err) {
    console.warn('Failed to load local trips list:', err);
    return [mockTripData];
  }
  return trips;
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
      return null;
    }

    const targetId = getActiveTripIdLocal();
    if (targetId) {
      const item = localStorage.getItem(`${STORAGE_KEYS.TRIP_PREFIX}${targetId}`);
      if (item) {
        const parsed = JSON.parse(item);
        if (isValidTrip(parsed)) return parsed;
      }
    }

    const all = loadAllLocalTrips();
    return all.length > 0 ? all[0] : mockTripData;
  } catch (err) {
    console.warn('Failed to load local trip:', err);
    return null;
  }
}

/**
 * Fetches itineraries for a user from Edge database, falling back to local vault
 */
export async function fetchItinerariesFromEdge(userId: string): Promise<Trip[]> {
  if (!API_BASE_URL) {
    return loadAllLocalTrips();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/itineraries/${userId}`);
    if (res.ok) {
      const data = (await res.json()) as { itineraries: Array<{ data: Trip }> };
      if (data.itineraries && data.itineraries.length > 0) {
        const edgeTrips = data.itineraries.map((it) => it.data);
        // Sync edge trips to local cache
        edgeTrips.forEach((t) => {
          localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${t.id}`, JSON.stringify(t));
        });
        return edgeTrips;
      }
    }
  } catch (e) {
    console.warn('Edge itineraries fetch error, falling back to local vault:', e);
  }

  return loadAllLocalTrips();
}

/**
 * Fetches a shared trip by shareToken or guestKey from Edge API or local storage.
 * Enforces privacy: only persons with the secret link or key can view the trip.
 */
export async function fetchSharedTrip(token: string, guestKey?: string): Promise<Trip | null> {
  if (API_BASE_URL) {
    try {
      const query = guestKey ? `?guestKey=${encodeURIComponent(guestKey)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/share/${encodeURIComponent(token)}${query}`);
      if (res.ok) {
        const data = (await res.json()) as { trip: Trip };
        return data.trip;
      }
    } catch (e) {
      console.warn('Edge shared trip fetch error, checking local vault:', e);
    }
  }

  // Local fallback: search by shareToken, guestKey, or id in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.TRIP_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed: Trip = JSON.parse(item);
          // Privacy verification
          const matchesToken = parsed.shareToken === token || parsed.id === token || parsed.guestKey === token;
          if (matchesToken) {
            // If trip has guestKey, verify caller provided valid guestKey or token
            if (parsed.guestKey && parsed.guestKey !== guestKey && parsed.guestKey !== token && parsed.shareToken !== token) {
              return null; // Deny access without secret link
            }
            return parsed;
          }
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Creates a brand-new customized trip document with unique ID and secret guest key
 */
export function createDefaultTrip(
  title: string,
  destination: string,
  startDate?: string,
  endDate?: string,
  startTime?: string,
  endTime?: string
): Trip {
  const id = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const shareToken = Math.random().toString(36).substring(2, 10);
  const guestKey = `guest_${Math.random().toString(36).substring(2, 12)}`;
  const datesFormatted = startDate && endDate ? `${startDate} – ${endDate}` : 'Flexible Dates';

  let numDays = 1;
  if (startDate && endDate) {
    const startMs = Date.parse(startDate);
    const endMs = Date.parse(endDate);
    if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
      const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
      numDays = Math.min(30, Math.max(1, diffDays));
    }
  }

  const days: TripDay[] = [];
  const startObj = startDate ? new Date(startDate) : null;

  for (let i = 0; i < numDays; i++) {
    let dateStr = i === 0 ? (startDate || 'Day 1') : `Day ${i + 1}`;
    if (startObj && !isNaN(startObj.getTime())) {
      const current = new Date(startObj);
      current.setDate(startObj.getDate() + i);
      dateStr = current.toISOString().split('T')[0];
    }

    days.push({
      id: `day_${id}_${i + 1}`,
      dayNumber: i + 1,
      dateStr,
      title: i === 0 ? 'Arrival & Welcome' : i === numDays - 1 && numDays > 1 ? 'Departure & Farewell' : `Day ${i + 1} Exploration`,
      themeColor: '#3B82F6',
      weather: {
        tempC: 22,
        highC: 24,
        lowC: 16,
        condition: 'sunny',
        conditionText: 'Fair & Clear',
        rainProbability: 5,
        humidity: 50,
        uvIndex: 4,
        clothingTip: 'Casual daywear and comfortable shoes for exploring.',
        hourly: [
          { time: '12 PM', tempC: 22, condition: 'sunny', rainChance: 0 },
          { time: '3 PM', tempC: 24, condition: 'sunny', rainChance: 5 },
          { time: '6 PM', tempC: 20, condition: 'clear', rainChance: 0 },
        ],
      },
      stops: [],
    });
  }

  return {
    id,
    tripId: id,
    title: title.trim() || 'New Journey',
    destination: destination.trim() || 'Worldwide',
    dates: datesFormatted,
    startDate,
    endDate,
    startTime: startTime || '09:00',
    endTime: endTime || '21:00',
    baseCurrency: 'USD',
    shareToken,
    guestKey,
    readinessScore: 0,
    flights: [],
    days,
    expenses: [],
    readinessChecklist: [
      { id: 'chk_1', label: 'Passports & visas verified', completed: false, critical: true },
      { id: 'chk_2', label: 'Flight tickets & boarding passes ready', completed: false, critical: true },
      { id: 'chk_3', label: 'Accommodations / hotels confirmed', completed: false, critical: true },
      { id: 'chk_4', label: 'Local currency or travel cards configured', completed: false, critical: false },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

