import { Trip, TripDay } from '../types/trip';
import { deleteLocalAccount, pruneInactiveLocalData, saveVaultSession } from './crypto';
import { STORAGE_KEYS } from '../config/constants';
import { INITIAL_TRIPS_CATALOG, mockTripData } from '../data/mockTrip';
import { createApiClient } from '@mojolog/api-client';
import { createSyncEngine, LocalStorageSyncStorage } from '@mojolog/sync';

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

export const syncEngine = createSyncEngine({
  apiClient,
  storage: new LocalStorageSyncStorage(),
  storagePrefix: 'roammate_sync',
  onRecordApplied: (record) => {
    try {
      if (record.op === 'delete') {
        localStorage.removeItem(`${STORAGE_KEYS.TRIP_PREFIX}${record.id}`);
      } else if (record.op === 'upsert' && record.data) {
        const existingRaw = localStorage.getItem(`${STORAGE_KEYS.TRIP_PREFIX}${record.id}`);
        const existing = existingRaw ? JSON.parse(existingRaw) : null;
        const resolution = syncEngine.resolveConflict(existing, record.data, record.updatedAt);
        if (resolution.winner === 'server' || !existing) {
          localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${record.id}`, JSON.stringify(resolution.record));
        }
      }
    } catch (e) {
      console.warn('Failed to apply sync record:', e);
    }
  },
});

export interface SyncResult {
  success: boolean;
  message?: string;
}

export function initAccountLifecycle(): void {
  pruneInactiveLocalData();
}

export const ENV_PASSWORD = (
  import.meta.env.PASSWORD ||
  import.meta.env.PASSCODE ||
  import.meta.env.VITE_PASSWORD ||
  ''
).trim();

/**
 * Checks whether PASSWORD is configured in the environment (.env) or on the backend.
 * If neither is configured, the application must be rendered unusable.
 */
export async function isPasswordConfigured(): Promise<boolean> {
  if (ENV_PASSWORD) {
    return true;
  }

  if (API_BASE_URL) {
    try {
      const status = await apiClient.checkAuthStatus();
      return Boolean(status?.configured);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Personal vault login using password set directly in .env
 * Strictly verifies against backend API or local environment. Rejects incorrect passwords with false.
 */
export async function loginAccountOnEdge(password: string): Promise<boolean> {
  const trimmed = password.trim();
  if (!trimmed) return false;

  if (API_BASE_URL) {
    try {
      const res = await apiClient.login({ password: trimmed, passcode: trimmed });
      if (res?.token) {
        saveVaultSession(res.token, res.expiresAt);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Backend login failed:', e);
      return false;
    }
  }

  // Pure local offline mode: compare against ENV_PASSWORD
  if (ENV_PASSWORD && trimmed === ENV_PASSWORD) {
    saveVaultSession('local_personal_vault_' + Date.now());
    return true;
  }

  return false;
}

export async function deleteAccountOnEdge(): Promise<boolean> {
  deleteLocalAccount();
  return true;
}

export async function saveItineraryToEdge(trip: Trip): Promise<SyncResult> {
  const now = Date.now();
  const tripWithAccess: Trip & { lastAccessedAt: number } = {
    ...trip,
    updatedAt: now,
    lastAccessedAt: now,
  };

  localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${trip.id}`, JSON.stringify(tripWithAccess));
  setActiveTripIdLocal(trip.id);

  await syncEngine.enqueue('trip', 'upsert', tripWithAccess, trip.id);

  if (!API_BASE_URL) {
    return { success: true, message: 'Saved to local personal vault' };
  }

  try {
    const syncRes = await syncEngine.sync();
    if (syncRes.success) {
      return { success: true, message: 'Synced to Edge DB' };
    }
    return { success: true, message: 'Offline: queued in outbox' };
  } catch {
    return { success: true, message: 'Offline: cached locally' };
  }
}

export async function deleteTripOnEdge(tripId?: string): Promise<boolean> {
  if (!tripId) return true;

  try {
    localStorage.removeItem(`${STORAGE_KEYS.TRIP_PREFIX}${tripId}`);
    if (getActiveTripIdLocal() === tripId) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP_ID);
    }

    await syncEngine.enqueue('trip', 'delete', { id: tripId }, tripId);

    if (API_BASE_URL) {
      await syncEngine.sync();
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

export function loadAllLocalTrips(): Trip[] {
  const trips: Trip[] = [];
  try {
    const isValidTrip = (t: any): t is Trip =>
      t && typeof t === 'object' && typeof t.title === 'string' && Array.isArray(t.days);

    // Purge legacy sample trips
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
              trips.push(sanitizeTrip(parsed));
            }
          } catch {}
        }
      }
    }

    if (trips.length === 0) {
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

export async function fetchItinerariesFromEdge(): Promise<Trip[]> {
  if (!API_BASE_URL) {
    return loadAllLocalTrips();
  }

  try {
    const edgeTrips = await apiClient.fetchItineraries();
    if (edgeTrips && edgeTrips.length > 0) {
      const sanitized = edgeTrips.map(sanitizeTrip);
      sanitized.forEach((t) => {
        localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${t.id}`, JSON.stringify(t));
      });
      return sanitized;
    }
  } catch (e) {
    console.warn('Edge itineraries fetch error, falling back to local vault:', e);
  }

  return loadAllLocalTrips();
}

export async function fetchSharedTrip(token: string): Promise<Trip | null> {
  if (API_BASE_URL) {
    try {
      const trip = await apiClient.fetchSharedTrip(token);
      if (trip) {
        return trip;
      }
    } catch (e) {
      console.warn('Edge shared trip fetch error, checking local vault:', e);
    }
  }

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
