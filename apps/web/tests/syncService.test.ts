import { beforeEach, describe, expect, it } from 'vitest';
import {
  fetchItinerariesFromEdge,
  fetchSharedTrip,
  loadLocalTrip,
  saveItineraryToEdge,
} from '../src/auth/syncService';
import { STORAGE_KEYS } from '../src/config/constants';
import { Trip } from '../src/types/trip';

// Mock localStorage for Node test environment
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

describe('SyncService & Itinerary Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveItineraryToEdge & loadLocalTrip', () => {
    it('persists itinerary with lastAccessedAt timestamp to local storage', async () => {
      const res = await saveItineraryToEdge('user_123', sampleTrip);
      expect(res.success).toBe(true);

      const raw = localStorage.getItem(`${STORAGE_KEYS.TRIP_PREFIX}${sampleTrip.id}`);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed.id).toBe('trip_kyoto_2026');
      expect(parsed.title).toBe('Autumn in Kyoto');
      expect(parsed.lastAccessedAt).toBeGreaterThan(0);
    });

    it('loads saved trip correctly on application boot without data loss', async () => {
      await saveItineraryToEdge('user_123', sampleTrip);

      const loaded = loadLocalTrip('trip_kyoto_2026');
      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe('Autumn in Kyoto');
      expect(loaded?.expenses).toHaveLength(1);
      expect(loaded?.expenses[0].amount).toBe(1500);
    });

    it('falls back gracefully when no trip exists in localStorage', () => {
      const loaded = loadLocalTrip('non_existent_id');
      expect(loaded).toBeNull();
    });
  });

  describe('fetchSharedTrip', () => {
    it('finds and returns shared trip from local vault by shareToken', async () => {
      await saveItineraryToEdge('user_123', sampleTrip);

      const shared = await fetchSharedTrip('kyoto88');
      expect(shared).not.toBeNull();
      expect(shared?.id).toBe('trip_kyoto_2026');
      expect(shared?.title).toBe('Autumn in Kyoto');
    });

    it('returns null for an invalid shareToken', async () => {
      const shared = await fetchSharedTrip('unknown_token_99');
      expect(shared).toBeNull();
    });
  });

  describe('fetchItinerariesFromEdge (Local Mode)', () => {
    it('returns array of stored trips in local offline mode', async () => {
      await saveItineraryToEdge('user_123', sampleTrip);

      const itineraries = await fetchItinerariesFromEdge('user_123');
      expect(itineraries).toHaveLength(1);
      expect(itineraries[0].title).toBe('Autumn in Kyoto');
    });
  });
});
