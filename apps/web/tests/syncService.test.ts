import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultTrip,
  deleteTripOnEdge,
  fetchItinerariesFromEdge,
  fetchSharedTrip,
  getActiveTripIdLocal,
  loadAllLocalTrips,
  loadLocalTrip,
  saveItineraryToEdge,
  setActiveTripIdLocal,
} from '../src/auth/syncService';
import { STORAGE_KEYS } from '../src/config/constants';
import { Trip } from '../src/types/trip';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

const sampleTrip: Trip = {
  id: 'trip_kyoto_2026',
  tripId: 'trip_kyoto_2026',
  title: 'Autumn in Kyoto',
  dates: 'Nov 12 – 16, 2026',
  destination: 'Kyoto, Japan',
  baseCurrency: 'JPY',
  shareToken: 'kyoto88',
  readinessScore: 90,
  flights: [],
  days: [],
  expenses: [{ id: 'exp_1', amount: 1500, category: 'Food & Drinks', currency: 'JPY', date: '2026-11-12', paidBy: 'Me' }],
  readinessChecklist: [],
};

describe('Single-User Personal Vault SyncService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveItineraryToEdge & loadLocalTrip', () => {
    it('persists itinerary with lastAccessedAt timestamp to local storage', async () => {
      const res = await saveItineraryToEdge(sampleTrip);
      expect(res.success).toBe(true);

      const raw = localStorage.getItem(`${STORAGE_KEYS.TRIP_PREFIX}${sampleTrip.id}`);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed.id).toBe('trip_kyoto_2026');
      expect(parsed.title).toBe('Autumn in Kyoto');
    });

    it('loads saved trip correctly without data loss', async () => {
      await saveItineraryToEdge(sampleTrip);

      const loaded = loadLocalTrip('trip_kyoto_2026');
      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe('Autumn in Kyoto');
      expect(loaded?.expenses).toHaveLength(1);
    });

    it('falls back gracefully when no trip exists', () => {
      const loaded = loadLocalTrip('non_existent_id');
      expect(loaded).toBeNull();
    });
  });

  describe('fetchSharedTrip', () => {
    it('finds and returns shared trip from local vault by shareToken', async () => {
      await saveItineraryToEdge(sampleTrip);

      const shared = await fetchSharedTrip('kyoto88');
      expect(shared).not.toBeNull();
      expect(shared?.id).toBe('trip_kyoto_2026');
    });
  });

  describe('Passcode Auth via ApiClient', () => {
    it('logs in via backend passcode auth and caches token session', async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async (url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) || '{}');
        if (url.includes('/auth/login') || url.includes('/api/auth/login')) {
          if (body.passcode === 'secret123') {
            return {
              ok: true,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({
                success: true,
                token: 'jwt-token-passcode',
                authenticated: true,
              }),
            };
          }
          return {
            ok: false,
            status: 401,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ error: 'Incorrect passcode' }),
          };
        }
        return { ok: false, status: 404 };
      }) as any;

      try {
        const { loginAccountOnEdge } = await import('../src/auth/syncService');
        const loginOk = await loginAccountOnEdge('secret123');
        expect(loginOk).toBe(true);

        const wrongLogin = await loginAccountOnEdge('wrong');
        expect(wrongLogin).toBe(false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Multi-Trip Support', () => {
    it('creates and manages multiple trips independently in personal vault', async () => {
      const trip1 = createDefaultTrip('Iceland Northern Lights', 'Reykjavik, Iceland');
      const trip2 = createDefaultTrip('Swiss Alps Hiking', 'Interlaken, Switzerland');

      await saveItineraryToEdge(trip1);
      await saveItineraryToEdge(trip2);

      setActiveTripIdLocal(trip2.id);
      expect(getActiveTripIdLocal()).toBe(trip2.id);

      const allTrips = loadAllLocalTrips();
      expect(allTrips.some((t: any) => t.id === trip1.id)).toBe(true);

      await deleteTripOnEdge(trip1.id);
      const remaining = loadAllLocalTrips();
      expect(remaining.some((t: any) => t.id === trip1.id)).toBe(false);
    });
  });
});
