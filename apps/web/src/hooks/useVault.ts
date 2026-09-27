import { useCallback, useEffect, useRef, useState } from 'react';
import { clearVaultSession, deleteLocalAccount, getVaultSession, VaultSession } from '../auth/crypto';
import {
  createDefaultTrip,
  deleteTripOnEdge,
  fetchItinerariesFromEdge,
  fetchSharedTrip,
  getActiveTripIdLocal,
  initAccountLifecycle,
  loadAllLocalTrips,
  loadLocalTrip,
  saveItineraryToEdge,
  setActiveTripIdLocal,
} from '../auth/syncService';
import { Trip } from '../types/trip';
import { STORAGE_KEYS } from '../config/constants';
import { mockTripData } from '../data/mockTrip';

export interface CreateTripParams {
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface UseVaultReturn {
  vaultSession: VaultSession | null;
  setVaultSession: React.Dispatch<React.SetStateAction<VaultSession | null>>;
  trips: Trip[];
  activeTrip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip>>;
  isReadOnly: boolean;
  isGuestMode: boolean;
  guestError: string | null;
  switchTrip: (tripId: string) => void;
  createTrip: (params: CreateTripParams) => Trip;
  deleteTrip: (tripId: string) => Promise<void>;
  saveGuestTripToVault: () => Promise<void>;
  handleLogout: () => void;
  handleDeleteAccount: () => void;
  exitReadOnly: () => void;
}

/**
 * Custom hook managing the user's cryptographic vault session,
 * multi-trip persistence, active trip switching, edge synchronization,
 * and secret guest link privacy verification.
 */
export function useVault(): UseVaultReturn {
  const [vaultSession, setVaultSession] = useState<VaultSession | null>(getVaultSession());
  const [trips, setTrips] = useState<Trip[]>(() => {
    const s = getVaultSession();
    return s ? loadAllLocalTrips(s.userId) : [];
  });
  const [activeTrip, setActiveTrip] = useState<Trip>(() => {
    const s = getVaultSession();
    if (s) {
      const userTrips = loadAllLocalTrips(s.userId);
      const preferred = getActiveTripIdLocal();
      return userTrips.find((t) => t.id === preferred) || userTrips[0] || mockTripData;
    }
    return mockTripData;
  });
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const isHydratedRef = useRef(false);

  // Initialize lifecycle, hydration & URL routing on mount
  useEffect(() => {
    // 1. Sanitize route: If browser opened at /error, clean URL to /
    if (window.location.pathname === '/error') {
      window.history.replaceState({}, '', '/');
    }

    // 2. Initialize 3-month account inactivity auto-pruning
    initAccountLifecycle();

    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('share');
    const guestKey = params.get('guest') || params.get('guestKey');
    const tripId = params.get('trip');

    // 3. Handle Guest Invitation Link: ?trip=...&guest=... or ?guest=...
    if (guestKey) {
      const lookupToken = tripId || guestKey;
      fetchSharedTrip(lookupToken, guestKey).then((shared) => {
        if (shared) {
          setActiveTrip(shared);
          setIsGuestMode(true);
          setIsReadOnly(true);
        } else {
          setGuestError('This trip is private. Only individuals with a valid invitation link can access it.');
        }
        isHydratedRef.current = true;
      });
      return;
    }

    // 4. Handle Legacy Read-Only Link: ?share=...
    if (shareToken) {
      setIsReadOnly(true);
      fetchSharedTrip(shareToken).then((shared) => {
        if (shared) {
          setActiveTrip(shared);
        } else {
          setGuestError('Shared itinerary not found or expired.');
        }
        isHydratedRef.current = true;
      });
      return;
    }

    // 5. Normal multi-trip vault hydration
    const activeSession = getVaultSession();
    if (activeSession) {
      const userTrips = loadAllLocalTrips(activeSession.userId);
      setTrips(userTrips);
      const preferredId = getActiveTripIdLocal();
      const target = userTrips.find((t) => t.id === preferredId) || userTrips[0];
      if (target) {
        setActiveTrip(target);
        setActiveTripIdLocal(target.id);
      }
      fetchItinerariesFromEdge(activeSession.userId).then((edgeTrips) => {
        if (edgeTrips && edgeTrips.length > 0) {
          setTrips(edgeTrips);
          const pref = getActiveTripIdLocal();
          const edgeTarget = edgeTrips.find((t) => t.id === pref) || edgeTrips[0];
          setActiveTrip(edgeTarget);
          setActiveTripIdLocal(edgeTarget.id);
        }
        isHydratedRef.current = true;
      });
    } else {
      setTrips([]);
      isHydratedRef.current = true;
    }
  }, []);

  // When vault session changes (login/restore), fetch remote trips
  useEffect(() => {
    if (vaultSession && !isReadOnly && isHydratedRef.current) {
      const userTrips = loadAllLocalTrips(vaultSession.userId);
      setTrips(userTrips);
      const preferredId = getActiveTripIdLocal();
      const target = userTrips.find((t) => t.id === preferredId) || userTrips[0];
      if (target) {
        setActiveTrip(target);
        setActiveTripIdLocal(target.id);
      }
      fetchItinerariesFromEdge(vaultSession.userId).then((edgeTrips) => {
        if (edgeTrips && edgeTrips.length > 0) {
          setTrips(edgeTrips);
          const pref = getActiveTripIdLocal();
          const edgeTarget = edgeTrips.find((t) => t.id === pref) || edgeTrips[0];
          setActiveTrip(edgeTarget);
          setActiveTripIdLocal(edgeTarget.id);
        }
      });
    }
  }, [vaultSession?.userId]);

  // Auto-sync active itinerary to edge & local vault whenever it updates
  useEffect(() => {
    if (!isHydratedRef.current || isReadOnly || isGuestMode) return;

    // Update active trip inside trips collection
    setTrips((prevTrips) => {
      const exists = prevTrips.some((t) => t.id === activeTrip.id);
      if (exists) {
        return prevTrips.map((t) => (t.id === activeTrip.id ? activeTrip : t));
      }
      return [activeTrip, ...prevTrips];
    });

    // Always persist to local storage synchronously for offline reliability
    localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${activeTrip.id}`, JSON.stringify(activeTrip));
    setActiveTripIdLocal(activeTrip.id);

    if (vaultSession) {
      saveItineraryToEdge(vaultSession.userId, activeTrip);
    }
  }, [activeTrip, vaultSession, isReadOnly, isGuestMode]);

  // Switch between trips
  const switchTrip = useCallback(
    (tripId: string) => {
      const found = trips.find((t) => t.id === tripId) || loadLocalTrip(tripId);
      if (found) {
        setActiveTrip(found);
        setActiveTripIdLocal(found.id);
      }
    },
    [trips]
  );

  // Create a brand-new trip
  const createTrip = useCallback(
    (params: CreateTripParams): Trip => {
      const newTrip = createDefaultTrip(
        params.title,
        params.destination,
        params.startDate,
        params.endDate,
        params.startTime,
        params.endTime
      );
      if (vaultSession?.userId) {
        newTrip.userId = vaultSession.userId;
      }

      setTrips((prev) => [newTrip, ...prev]);
      setActiveTrip(newTrip);
      setActiveTripIdLocal(newTrip.id);

      if (vaultSession) {
        saveItineraryToEdge(vaultSession.userId, newTrip);
      }
      localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${newTrip.id}`, JSON.stringify(newTrip));

      return newTrip;
    },
    [vaultSession]
  );

  // Delete an individual trip from account
  const deleteTrip = useCallback(
    async (tripId: string) => {
      await deleteTripOnEdge(vaultSession?.userId, tripId);
      const remaining = trips.filter((t) => t.id !== tripId);
      setTrips(remaining);

      if (activeTrip.id === tripId) {
        const nextActive = remaining.length > 0 ? remaining[0] : mockTripData;
        setActiveTrip(nextActive);
        setActiveTripIdLocal(nextActive.id);
      }
    },
    [vaultSession, trips, activeTrip.id]
  );

  // Save guest-viewed trip to user's private vault (or local storage)
  const saveGuestTripToVault = useCallback(async () => {
    const clonedTrip: Trip = {
      ...activeTrip,
      id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${activeTrip.title} (Joined)`,
      userId: vaultSession?.userId,
      shareToken: Math.random().toString(36).substring(2, 10),
      guestKey: `guest_${Math.random().toString(36).substring(2, 12)}`,
    };

    setTrips((prev) => [clonedTrip, ...prev]);
    setActiveTrip(clonedTrip);
    setActiveTripIdLocal(clonedTrip.id);
    setIsGuestMode(false);
    setIsReadOnly(false);

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);

    if (vaultSession) {
      await saveItineraryToEdge(vaultSession.userId, clonedTrip);
    } else {
      localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${clonedTrip.id}`, JSON.stringify(clonedTrip));
    }
  }, [activeTrip, vaultSession]);

  // Account logout handler
  const handleLogout = useCallback(() => {
    clearVaultSession();
    setVaultSession(null);
    setTrips([]);
    setActiveTrip(mockTripData);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP_ID);
  }, []);

  // Account deletion reset handler
  const handleDeleteAccount = useCallback(() => {
    if (vaultSession) {
      deleteLocalAccount(vaultSession.userId);
    }
    clearVaultSession();
    setVaultSession(null);
    setTrips([]);
    setActiveTrip(mockTripData);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP_ID);
  }, [vaultSession]);

  // Read-only / Guest preview exit handler
  const exitReadOnly = useCallback(() => {
    window.history.replaceState({}, '', window.location.pathname);
    setIsReadOnly(false);
    setIsGuestMode(false);
    setGuestError(null);
    const local = loadLocalTrip();
    if (local) {
      setActiveTrip(local);
    }
  }, []);

  return {
    vaultSession,
    setVaultSession,
    trips,
    activeTrip,
    setTrip: setActiveTrip,
    isReadOnly,
    isGuestMode,
    guestError,
    switchTrip,
    createTrip,
    deleteTrip,
    saveGuestTripToVault,
    handleLogout,
    handleDeleteAccount,
    exitReadOnly,
  };
}

