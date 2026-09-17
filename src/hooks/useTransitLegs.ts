import { useCallback, useMemo, useState } from 'react';
import { ItineraryStop, TransitLeg, TransitMode } from '../types/trip';
import { computeDistanceKm, estimateDurationMins } from '../wasm/engine';

export interface UseTransitLegsReturn {
  transitLegs: TransitLeg[];
  transitModes: Record<string, TransitMode>;
  handleToggleMode: (leg: TransitLeg) => void;
}

/**
 * Custom hook calculating distances, durations, and multi-modal transit legs
 * between consecutive itinerary stops using the Rust WASM engine.
 */
export function useTransitLegs(stops: ItineraryStop[]): UseTransitLegsReturn {
  const [transitModes, setTransitModes] = useState<Record<string, TransitMode>>({});

  // Compute transit legs between consecutive stops using Rust WASM (with JS fallback)
  const transitLegs = useMemo(() => {
    const legs: TransitLeg[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];
      const legKey = `${from.id}->${to.id}`;
      const mode = transitModes[legKey] || 'drive';

      const dist = computeDistanceKm(
        from.coordinates.latitude,
        from.coordinates.longitude,
        to.coordinates.latitude,
        to.coordinates.longitude
      );
      const duration = estimateDurationMins(dist, mode);

      legs.push({
        fromStopId: from.id,
        toStopId: to.id,
        mode,
        distanceKm: dist,
        durationMinutes: duration,
        isOutlier: duration > 45 || dist > 20,
      });
    }
    return legs;
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
