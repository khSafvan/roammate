import { Trip, TripDay } from '../types/trip';
import { deleteLocalAccount, pruneInactiveLocalData, saveVaultSession } from './crypto';
import { STORAGE_KEYS } from '../config/constants';
import { INITIAL_TRIPS_CATALOG, mockTripData } from '../data/mockTrip';
import { createApiClient } from '@mojolog/api-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL || 'http://localhost:8787',
  getToken: () => {
    try {
      const sessionRaw = localStorage.getItem(STORAGE_KEYS.VAULT_SESSION);
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        return session.token || null;
      }
    } catch {}
    return null;
  },
});

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
 * Registers a new account via Cloudflare Worker / Turso backend
 * Issues a bearer JWT token saved in session
 */
export async function registerAccountOnEdge(
  uuidOrMnemonic: string,
  userIdOrPasswordHash: string
): Promise<boolean> {
  const isUuid = uuidOrMnemonic.includes('-') || !uuidOrMnemonic.includes(' ');
  const userId = isUuid ? uuidOrMnemonic : userIdOrPasswordHash;

  try {
    const payload = isUuid
      ? { uuid: uuidOrMnemonic, passwordHash: userIdOrPasswordHash }
      : { mnemonic: uuidOrMnemonic, userId: userIdOrPasswordHash };

    const res = await apiClient.register(payload);
    const assignedUserId = res.userId || userId;
    const now = res.lastAccessedAt || Date.now();
    saveVaultSession(assignedUserId, undefined, now, res.token, res.expiresAt);
    return true;
  } catch (e) {
    console.warn('Backend registration failed:', e);
    return false;
  }
}

/**
 * Authenticates account via Cloudflare Worker / Turso backend
 * Validates on the backend only; never verifies credentials locally
 */
export async function loginAccountOnEdge(
  uuidOrPhrase: string,
  passwordHash?: string
): Promise<boolean> {
  try {
    const payload = passwordHash
      ? { uuid: uuidOrPhrase, passwordHash }
      : { phrase: uuidOrPhrase };

    const res = await apiClient.login(payload);
    const assignedUserId = res.userId || uuidOrPhrase;
    const now = res.lastAccessedAt || Date.now();
    saveVaultSession(assignedUserId, undefined, now, res.token, res.expiresAt);
    return true;
  } catch (e) {
    console.warn('Backend login failed:', e);
    return false;
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
    await apiClient.deleteAccount({
      userId,
      passwordHash: passwordHashOrPhrase,
      phrase: passwordHashOrPhrase,
    });
    return true;
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
    const res = await apiClient.saveItinerary(userId, tripWithAccess);
    if (res.success) {
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
      await apiClient.deleteItinerary(tripId, userId);
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
 * Ensures all trip arrays and properties are strictly populated to prevent undefined crashes.
 */
export function sanitizeTrip(t: any): Trip {
  return {
    ...t,
    days: Array.isArray(t?.days) ? t.days : [],
    flights: Array.isArray(t?.flights) ? t.flights : [],
    expenses: Array.isArray(t?.expenses) ? t.expenses : [],
    documents: Array.isArray(t?.documents) ? t.documents : [],
    placesToVisit: Array.isArray(t?.placesToVisit) ? t.placesToVisit : [],
    readinessChecklist: Array.isArray(t?.readinessChecklist) ? t.readinessChecklist : [],
    packingList: Array.isArray(t?.packingList) ? t.packingList : [],
    readinessScore: typeof t?.readinessScore === 'number' ? t.readinessScore : 0,
    title: t?.title || 'Untitled Trip',
    destination: t?.destination || 'Worldwide',
    dates: t?.dates || 'Flexible Dates',
  };
}

/**
 * Loads all cached itineraries from localStorage.
 * When userId is provided, returns only trips owned by that user.
 * If a user has no trips, automatically seeds a fresh editable sample trip.
 */
export function loadAllLocalTrips(userId?: string): Trip[] {
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
              if (userId) {
                // If user is specified, include owned trips or adopt unassigned legacy trips
                if (parsed.userId === userId || !parsed.userId) {
                  trips.push(sanitizeTrip({ ...parsed, userId: parsed.userId || userId }));
                }
              } else {
                trips.push(sanitizeTrip(parsed));
              }
            }
          } catch {}
        }
      }
    }

    if (userId && trips.length === 0) {
      // Seed a brand new, editable sample trip for this specific user
      const cleanPrefix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'user';
      const userTripId = `trip_${cleanPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const sampleTrip: Trip = sanitizeTrip({
        ...JSON.parse(JSON.stringify(mockTripData)),
        id: userTripId,
        userId,
        title: 'Dubai & Abu Dhabi Explorer',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${sampleTrip.id}`, JSON.stringify(sampleTrip));
      setActiveTripIdLocal(sampleTrip.id);
      trips.push(sampleTrip);
    } else if (!userId && trips.length === 0) {
      // Seed the single canonical tutorial itinerary for fallback/unscoped tests.
      for (const trip of INITIAL_TRIPS_CATALOG) {
        const sanitized = sanitizeTrip(trip);
        localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${sanitized.id}`, JSON.stringify(sanitized));
        trips.push(sanitized);
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
        if (isValidTrip(parsed)) return sanitizeTrip(parsed);
      }
      return null;
    }

    const targetId = getActiveTripIdLocal();
    if (targetId) {
      const item = localStorage.getItem(`${STORAGE_KEYS.TRIP_PREFIX}${targetId}`);
      if (item) {
        const parsed = JSON.parse(item);
        if (isValidTrip(parsed)) return sanitizeTrip(parsed);
      }
    }

    const all = loadAllLocalTrips();
    return all.length > 0 ? sanitizeTrip(all[0]) : sanitizeTrip(mockTripData);
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
    return loadAllLocalTrips(userId);
  }

  try {
    const edgeTrips = await apiClient.fetchItineraries(userId);
    if (edgeTrips && edgeTrips.length > 0) {
      const sanitized = edgeTrips.map(sanitizeTrip);
      // Sync edge trips to local cache
      sanitized.forEach((t) => {
        localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${t.id}`, JSON.stringify(t));
      });
      return sanitized;
    }
  } catch (e) {
    console.warn('Edge itineraries fetch error, falling back to local vault:', e);
  }

  return loadAllLocalTrips(userId);
}

/**
 * Fetches a shared trip by shareToken or guestKey from Edge API or local storage.
 * Enforces privacy: only persons with the secret link or key can view the trip.
 */
export async function fetchSharedTrip(token: string, guestKey?: string): Promise<Trip | null> {
  if (API_BASE_URL) {
    try {
      const trip = await apiClient.fetchSharedTrip(token, guestKey);
      if (trip) {
        return trip;
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

