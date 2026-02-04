import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { getVaultSession, VaultSession } from '../auth/crypto';
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
  const [trips, setTrips] = useState<Trip[]>(() => loadAllLocalTrips());
  const [activeTrip, setActiveTrip] = useState<Trip>(() => loadLocalTrip() || mockTripData);
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
    const initialTrips = loadAllLocalTrips();
    setTrips(initialTrips);

    const activeSession = getVaultSession();
    if (activeSession) {
      fetchItinerariesFromEdge(activeSession.userId).then((edgeTrips) => {
        if (edgeTrips && edgeTrips.length > 0) {
          setTrips(edgeTrips);
          const preferredId = getActiveTripIdLocal();
          const target = edgeTrips.find((t) => t.id === preferredId) || edgeTrips[0];
          setActiveTrip(target);
          setActiveTripIdLocal(target.id);
        }
        isHydratedRef.current = true;
      });
    } else {
      const preferredId = getActiveTripIdLocal();
      const target = initialTrips.find((t) => t.id === preferredId) || initialTrips[0] || mockTripData;
      setActiveTrip(target);
      setActiveTripIdLocal(target.id);
      isHydratedRef.current = true;
    }
  }, []);

  // When vault session changes (login/restore), fetch remote trips
  useEffect(() => {
    if (vaultSession && !isReadOnly && isHydratedRef.current) {
      fetchItinerariesFromEdge(vaultSession.userId).then((edgeTrips) => {
        if (edgeTrips && edgeTrips.length > 0) {
          setTrips(edgeTrips);
          const preferredId = getActiveTripIdLocal();
          const target = edgeTrips.find((t) => t.id === preferredId) || edgeTrips[0];
          setActiveTrip(target);
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

    if (vaultSession) {
      saveItineraryToEdge(vaultSession.userId, activeTrip);
    } else {
      // Local encrypted vault persistence
      localStorage.setItem(`mojolog_trip_${activeTrip.id}`, JSON.stringify(activeTrip));
      setActiveTripIdLocal(activeTrip.id);
    }
  }, [activeTrip, vaultSession, isReadOnly, isGuestMode]);

  // Switch between trips
  const switchTrip = useCallback(
    (tripId: string) => {
      const found = trips.find((t) => t.id === tripId) || loadLocalTrip(tripId);
      if (found) {
        setActiveTrip(found);
        setActiveTripIdLocal(found.id);
        confetti({ particleCount: 20, spread: 35 });
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

      setTrips((prev) => [newTrip, ...prev]);
      setActiveTrip(newTrip);
      setActiveTripIdLocal(newTrip.id);

      if (vaultSession) {
        saveItineraryToEdge(vaultSession.userId, newTrip);
      } else {
        localStorage.setItem(`mojolog_trip_${newTrip.id}`, JSON.stringify(newTrip));
      }

      confetti({ particleCount: 60, spread: 60 });
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
      localStorage.setItem(`mojolog_trip_${clonedTrip.id}`, JSON.stringify(clonedTrip));
    }

    confetti({ particleCount: 90, spread: 75 });
  }, [activeTrip, vaultSession]);

  // Account deletion reset handler
  const handleDeleteAccount = useCallback(() => {
    setVaultSession(null);
    setTrips([mockTripData]);
    setActiveTrip(mockTripData);
    setActiveTripIdLocal(mockTripData.id);
    confetti({ particleCount: 30, spread: 40 });
  }, []);

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
    handleDeleteAccount,
    exitReadOnly,
  };
}

