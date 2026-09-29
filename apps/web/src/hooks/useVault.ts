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

export function useVault(): UseVaultReturn {
  const [vaultSession, setVaultSession] = useState<VaultSession | null>(getVaultSession());
  const [trips, setTrips] = useState<Trip[]>(() => loadAllLocalTrips());
  const [activeTrip, setActiveTrip] = useState<Trip>(() => {
    const userTrips = loadAllLocalTrips();
    const preferred = getActiveTripIdLocal();
    return userTrips.find((t) => t.id === preferred) || userTrips[0] || mockTripData;
  });
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (window.location.pathname === '/error') {
      window.history.replaceState({}, '', '/');
    }

    initAccountLifecycle();

    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('share');
    const guestKey = params.get('guest') || params.get('guestKey');
    const tripId = params.get('trip');

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

    const localTrips = loadAllLocalTrips();
    setTrips(localTrips);
    const preferredId = getActiveTripIdLocal();
    const target = localTrips.find((t) => t.id === preferredId) || localTrips[0];
    if (target) {
      setActiveTrip(target);
      setActiveTripIdLocal(target.id);
    }
    fetchItinerariesFromEdge().then((edgeTrips) => {
      if (edgeTrips && edgeTrips.length > 0) {
        setTrips(edgeTrips);
        const pref = getActiveTripIdLocal();
        const edgeTarget = edgeTrips.find((t) => t.id === pref) || edgeTrips[0];
        setActiveTrip(edgeTarget);
        setActiveTripIdLocal(edgeTarget.id);
      }
      isHydratedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current || isReadOnly || isGuestMode) return;

    setTrips((prevTrips) => {
      const exists = prevTrips.some((t) => t.id === activeTrip.id);
      if (exists) {
        return prevTrips.map((t) => (t.id === activeTrip.id ? activeTrip : t));
      }
      return [activeTrip, ...prevTrips];
    });

    localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${activeTrip.id}`, JSON.stringify(activeTrip));
    setActiveTripIdLocal(activeTrip.id);

    saveItineraryToEdge(activeTrip);
  }, [activeTrip, isReadOnly, isGuestMode]);

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

      saveItineraryToEdge(newTrip);
      localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}${newTrip.id}`, JSON.stringify(newTrip));

      return newTrip;
    },
    []
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      await deleteTripOnEdge(tripId);
      const remaining = trips.filter((t) => t.id !== tripId);
      setTrips(remaining);

      if (activeTrip.id === tripId) {
        const nextActive = remaining.length > 0 ? remaining[0] : mockTripData;
        setActiveTrip(nextActive);
        setActiveTripIdLocal(nextActive.id);
      }
    },
    [trips, activeTrip.id]
  );

  const saveGuestTripToVault = useCallback(async () => {
    const clonedTrip: Trip = {
      ...activeTrip,
      id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${activeTrip.title} (Saved)`,
      shareToken: Math.random().toString(36).substring(2, 10),
      guestKey: `guest_${Math.random().toString(36).substring(2, 12)}`,
    };

    setTrips((prev) => [clonedTrip, ...prev]);
    setActiveTrip(clonedTrip);
    setActiveTripIdLocal(clonedTrip.id);
    setIsGuestMode(false);
    setIsReadOnly(false);

    window.history.replaceState({}, '', window.location.pathname);
    await saveItineraryToEdge(clonedTrip);
  }, [activeTrip]);

  const handleLogout = useCallback(() => {
    clearVaultSession();
    setVaultSession(null);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    deleteLocalAccount();
    clearVaultSession();
    setVaultSession(null);
  }, []);

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
