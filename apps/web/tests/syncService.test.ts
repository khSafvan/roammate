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

  describe('AIOStreams-Style Auth in Local Vault Mode', () => {
    it('registers and logs in with UUID and password hash', async () => {
      const { registerAccountOnEdge, loginAccountOnEdge } = await import('../src/auth/syncService');
      const testUuid = '9f8b417e-3294-4cd0-9aa8-ec16d4ea71b2';
      const testHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

      const regOk = await registerAccountOnEdge(testUuid, testHash);
      expect(regOk).toBe(true);

      const loginOk = await loginAccountOnEdge(testUuid, testHash);
      expect(loginOk).toBe(true);

      const wrongLogin = await loginAccountOnEdge(testUuid, 'wrong_hash');
      expect(wrongLogin).toBe(false);
    });
  });

  describe('Multi-Trip Support & Date-Time Scheduling', () => {
    it('creates a new trip with custom start/end dates and times', () => {
      const newTrip = createDefaultTrip(
        'Amalfi Coast Adventure',
        'Amalfi, Italy',
        '2027-06-01',
        '2027-06-08',
        '08:30',
        '22:00'
      );

      expect(newTrip.title).toBe('Amalfi Coast Adventure');
      expect(newTrip.destination).toBe('Amalfi, Italy');
      expect(newTrip.startDate).toBe('2027-06-01');
      expect(newTrip.endDate).toBe('2027-06-08');
      expect(newTrip.startTime).toBe('08:30');
      expect(newTrip.endTime).toBe('22:00');
      expect(newTrip.guestKey).toMatch(/^guest_/);
      expect(newTrip.id).toMatch(/^trip_/);
    });

    it('loads and manages multiple trips independently in local vault', async () => {
      const trip1 = createDefaultTrip('Iceland Northern Lights', 'Reykjavik, Iceland');
      const trip2 = createDefaultTrip('Swiss Alps Hiking', 'Interlaken, Switzerland');

      await saveItineraryToEdge('user_multi', trip1);
      await saveItineraryToEdge('user_multi', trip2);

      setActiveTripIdLocal(trip2.id);
      expect(getActiveTripIdLocal()).toBe(trip2.id);

      const allTrips = loadAllLocalTrips();
      expect(allTrips.some((t: any) => t.id === trip1.id)).toBe(true);
      expect(allTrips.some((t: any) => t.id === trip2.id)).toBe(true);

      // Delete trip1 only
      await deleteTripOnEdge('user_multi', trip1.id);
      const remainingTrips = loadAllLocalTrips();
      expect(remainingTrips.some((t: any) => t.id === trip1.id)).toBe(false);
      expect(remainingTrips.some((t: any) => t.id === trip2.id)).toBe(true);
    });
  });

  describe('Multi-Origin Flight Tickets & Passenger Details', () => {
    it('persists passenger name, origin country/city, cabin class, and eTicketNumber', async () => {
      const companionFlightTrip: Trip = {
        ...sampleTrip,
        id: 'trip_companion_flights',
        flights: [
          {
            id: 'fl_comp_1',
            flightNumber: 'JL005',
            carrier: 'Japan Airlines',
            date: '2026-10-14',
            passengerName: 'Alex',
            originCountry: 'United States',
            originCity: 'New York',
            cabinClass: 'Premium Economy',
            eTicketNumber: 'ETKT-99120',
            departure: { airport: 'JFK', city: 'New York', time: '13:15' },
            arrival: { airport: 'HND', city: 'Tokyo', time: '16:30' },
          },
          {
            id: 'fl_comp_2',
            flightNumber: 'BA007',
            carrier: 'British Airways',
            date: '2026-10-14',
            passengerName: 'Elena',
            originCountry: 'United Kingdom',
            originCity: 'London',
            cabinClass: 'Economy',
            eTicketNumber: 'ETKT-88412',
            departure: { airport: 'LHR', city: 'London', time: '09:40' },
            arrival: { airport: 'HND', city: 'Tokyo', time: '17:15' },
          },
        ],
      };

      await saveItineraryToEdge('user_123', companionFlightTrip);
      const loaded = loadLocalTrip('trip_companion_flights');

      expect(loaded?.flights).toHaveLength(2);
      expect(loaded?.flights[0].passengerName).toBe('Alex');
      expect(loaded?.flights[0].originCountry).toBe('United States');
      expect(loaded?.flights[1].passengerName).toBe('Elena');
      expect(loaded?.flights[1].originCity).toBe('London');
    });
  });

  describe('Secret Guest Invite Links & Privacy Enforcement', () => {
    it('allows guest access only when valid secret guestKey is provided', async () => {
      const privateTrip: Trip = {
        ...sampleTrip,
        id: 'trip_private_vault',
        guestKey: 'secret_guest_key_7788',
        shareToken: 'tok_share_88',
      };

      await saveItineraryToEdge('user_123', privateTrip);

      // Access with valid guest key -> SUCCESS
      const guestAccess = await fetchSharedTrip('tok_share_88', 'secret_guest_key_7788');
      expect(guestAccess).not.toBeNull();
      expect(guestAccess?.id).toBe('trip_private_vault');

      // Access with token match -> SUCCESS
      const tokenAccess = await fetchSharedTrip('secret_guest_key_7788');
      expect(tokenAccess).not.toBeNull();

      // Access attempt by unauthorized party without valid key -> DENIED (null)
      const unauthorized = await fetchSharedTrip('trip_private_vault', 'wrong_guest_key');
      expect(unauthorized).toBeNull();
    });
  });
});

