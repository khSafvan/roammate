import { useCallback, useState } from 'react';
import confetti from 'canvas-confetti';
import { ItineraryStop, Trip, TripDay } from '../types/trip';
import { optimizeRouteTspWasm } from '../wasm/engine';

export interface UseTripOptimizationReturn {
  isDayOptimized: boolean;
  optimizedDays: Record<string, boolean>;
  handleOptimizeDay: () => void;
}

/**
 * Custom hook providing 1-click Traveling Salesperson (TSP) route optimization
 * powered by the compiled Rust WebAssembly module.
 */
export function useTripOptimization(
  activeDay: TripDay,
  activeDayIdx: number,
  setTrip: React.Dispatch<React.SetStateAction<Trip>>
): UseTripOptimizationReturn {
  const [optimizedDays, setOptimizedDays] = useState<Record<string, boolean>>({});

  // 1-Click Traveling Salesperson Day Route Optimizer powered by Rust WASM
  const handleOptimizeDay = useCallback(() => {
    const stopsForWasm = activeDay.stops.map((s) => ({
      id: s.id,
      latitude: s.coordinates.latitude,
      longitude: s.coordinates.longitude,
    }));

    const result = optimizeRouteTspWasm(stopsForWasm, 'drive');

    if (result.optimized_ids && result.optimized_ids.length > 0) {
      const idToStopMap = new Map(activeDay.stops.map((s) => [s.id, s]));
      const reorderedStops: ItineraryStop[] = result.optimized_ids
        .map((id, index) => {
          const original = idToStopMap.get(id);
          if (!original) return null;
          return {
            ...original,
            orderIndex: index + 1,
          };
        })
        .filter((s): s is ItineraryStop => s !== null);

      setTrip((prev) => {
        const updatedDays = [...prev.days];
        updatedDays[activeDayIdx] = {
          ...updatedDays[activeDayIdx],
          stops: reorderedStops,
        };
        return {
          ...prev,
          days: updatedDays,
        };
      });

      setOptimizedDays((prev) => ({
        ...prev,
        [activeDay.id]: true,
      }));

      // Fire celebration confetti if TSP saved travel time
      if (result.minutes_saved > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  }, [activeDay, activeDayIdx, setTrip]);

  const isDayOptimized = !!optimizedDays[activeDay.id];

  return {
    isDayOptimized,
    optimizedDays,
    handleOptimizeDay,
  };
}
