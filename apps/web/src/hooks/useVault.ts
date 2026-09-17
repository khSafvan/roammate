import { useCallback, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { getVaultSession, VaultSession } from '../auth/crypto';
import { initAccountLifecycle, saveItineraryToEdge } from '../auth/syncService';
import { Trip } from '../types/trip';
import { mockTripData } from '../data/mockTrip';

export interface UseVaultReturn {
  vaultSession: VaultSession | null;
  setVaultSession: React.Dispatch<React.SetStateAction<VaultSession | null>>;
  isReadOnly: boolean;
  setIsReadOnly: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteAccount: () => void;
  exitReadOnly: () => void;
}

/**
 * Custom hook managing the user's cryptographic vault session,
 * auto-pruning lifecycle, edge synchronization, and read-only preview mode.
 */
export function useVault(
  trip: Trip,
  setTrip: React.Dispatch<React.SetStateAction<Trip>>
): UseVaultReturn {
  const [vaultSession, setVaultSession] = useState<VaultSession | null>(getVaultSession());
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Initialize lifecycle & URL routing on mount
  useEffect(() => {
    // 1. Sanitize route: If browser opened at /error, clean URL to / so user never lands in error state
    if (window.location.pathname === '/error') {
      window.history.replaceState({}, '', '/');
    }

    // 2. Initialize 3-month account inactivity auto-pruning
    initAccountLifecycle();

    // 3. Check if viewing via shared read-only link (?share=...)
    const params = new URLSearchParams(window.location.search);
    if (params.get('share')) {
      setIsReadOnly(true);
    }
  }, []);

  // Auto-sync itinerary to edge/local vault whenever trip or session updates
  useEffect(() => {
    if (vaultSession && !isReadOnly) {
      saveItineraryToEdge(vaultSession.userId, trip);
    }
  }, [trip, vaultSession, isReadOnly]);

  // Account deletion reset handler
  const handleDeleteAccount = useCallback(() => {
    setVaultSession(null);
    setTrip(mockTripData);
    confetti({ particleCount: 30, spread: 40 });
  }, [setTrip]);

  // Read-only preview exit handler
  const exitReadOnly = useCallback(() => {
    window.history.replaceState({}, '', window.location.pathname);
    setIsReadOnly(false);
  }, []);

  return {
    vaultSession,
    setVaultSession,
    isReadOnly,
    setIsReadOnly,
    handleDeleteAccount,
    exitReadOnly,
  };
}
