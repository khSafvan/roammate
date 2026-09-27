import { useCallback, useMemo, useState } from 'react';
import { ItineraryStop, TransitLeg, TransitMode } from '../types/trip';
import { computeTransitLegs } from '../utils/routeEngine';

export interface UseTransitLegsReturn {
  transitLegs: TransitLeg[];
  transitModes: Record<string, TransitMode>;
  handleToggleMode: (leg: TransitLeg) => void;
}

/**
 * Custom hook calculating distances, durations, and multi-modal transit legs
 * between consecutive itinerary stops using the TypeScript route engine.
 */
export function useTransitLegs(stops: ItineraryStop[]): UseTransitLegsReturn {
  const [transitModes, setTransitModes] = useState<Record<string, TransitMode>>({});

  // Compute transit legs between consecutive stops in one pass.
  const transitLegs = useMemo(() => {
    return computeTransitLegs(stops, transitModes);
  }, [stops, transitModes]);

  // Toggle transport mode on click (drive -> walk -> transit -> drive)
  const handleToggleMode = useCallback((leg: TransitLeg) => {
    const modes: TransitMode[] = ['drive', 'walk', 'transit'];
    const currIdx = modes.indexOf(leg.mode);
    const nextMode = modes[(currIdx + 1) % modes.length];
    const key = `${leg.fromStopId}->${leg.toStopId}`;

    setTransitModes((prev) => ({
      ...prev,
      [key]: nextMode,
    }));
  }, []);

  return {
    transitLegs,
    transitModes,
    handleToggleMode,
  };
}
