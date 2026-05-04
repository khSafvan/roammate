import { useCallback, useState } from 'react';
import { ItineraryStop, Trip, TripDay } from '../types/trip';
import { computeTransitLegs } from '@mojolog/core';
import { optimizeTimeWindowRoute } from '@mojolog/core';
// Re-export pure helpers so existing imports from this hook keep working
export { parseTimeToMinutes, formatMinutesToTime } from '@mojolog/core';

export interface ConstraintsRespected {
  mealsAligned: string[];
  operatingHoursPassed: number;
  fixedSlotsPreserved: number;
}

export interface RouteOptimizationPreview {
  dayId: string;
  dayNumber: number;
  originalStops: ItineraryStop[];
  optimizedStops: ItineraryStop[];
  minutesSaved: number;
  originalTransitMinutes: number;
  optimizedTransitMinutes: number;
  originalDistanceKm: number;
  optimizedDistanceKm: number;
  isAlreadyOptimal: boolean;
  constraintsRespected?: ConstraintsRespected;
}

export interface UseTripOptimizationReturn {
  isDayOptimized: boolean;
  optimizedDays: Record<string, boolean>;
  canUndo: boolean;
  previewData: RouteOptimizationPreview | null;
  handleOptimizeDay: () => void; // alias for handleRequestOptimize
  handleRequestOptimize: () => void;
  handleApplyOptimization: () => void;
  handleCancelOptimization: () => void;
  handleUndoOptimization: () => void;
}



/**
 * Custom hook providing Traveling Salesperson (TSP) route optimization
 * with interactive Preview, Confirmation Prompt, and Undo support.
 */
export function useTripOptimization(
  activeDay: TripDay,
  activeDayIdx: number,
  setTrip: React.Dispatch<React.SetStateAction<Trip>>
): UseTripOptimizationReturn {
  const [optimizedDays, setOptimizedDays] = useState<Record<string, boolean>>({});
  const [dayHistory, setDayHistory] = useState<Record<string, ItineraryStop[]>>({});
  const [previewData, setPreviewData] = useState<RouteOptimizationPreview | null>(null);

  // Request Route Optimization: Computes TSP-TW, metrics diff, and opens the preview dialog
  const handleRequestOptimize = useCallback(() => {
    if (!activeDay.stops || activeDay.stops.length <= 1) {
      setPreviewData({
        dayId: activeDay.id,
        dayNumber: activeDay.dayNumber,
        originalStops: activeDay.stops,
        optimizedStops: activeDay.stops,
        minutesSaved: 0,
        originalTransitMinutes: 0,
        optimizedTransitMinutes: 0,
        originalDistanceKm: 0,
        optimizedDistanceKm: 0,
        isAlreadyOptimal: true,
      });
      return;
    }

    // Time-window aware TSP optimizer (respects meal windows, opening hours, fixed slots)
    const firstStartTime = activeDay.stops[0]?.startTime || '09:00 AM';
    const twResult = optimizeTimeWindowRoute(activeDay.stops, 'drive', firstStartTime);

    const reorderedStops = twResult.optimizedStops;

    // Compute transit legs for both sequences to get distance/time metrics
    const originalLegs = computeTransitLegs(activeDay.stops, {});
    const originalTransitMinutes = originalLegs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
    const originalDistanceKm = originalLegs.reduce((sum, l) => sum + (l.distanceKm || 0), 0);

    const optimizedLegs = computeTransitLegs(reorderedStops, {});
    const optimizedTransitMinutes = optimizedLegs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
    const optimizedDistanceKm = optimizedLegs.reduce((sum, l) => sum + (l.distanceKm || 0), 0);

    const isSameOrder = activeDay.stops.every((s, i) => s.id === reorderedStops[i]?.id);
    const minutesSaved = Math.max(0, originalTransitMinutes - optimizedTransitMinutes);
    const isAlreadyOptimal = isSameOrder || (minutesSaved === 0 && activeDay.stops.length <= 2);

    setPreviewData({
      dayId: activeDay.id,
      dayNumber: activeDay.dayNumber,
      originalStops: [...activeDay.stops],
      optimizedStops: reorderedStops,
      minutesSaved,
      originalTransitMinutes,
      optimizedTransitMinutes,
      originalDistanceKm,
      optimizedDistanceKm,
      isAlreadyOptimal,
      constraintsRespected: twResult.constraintsRespected,
    });
  }, [activeDay]);


  // Apply Optimization: Saves previous stops to history, applies new stops to trip state, fires confetti
  const handleApplyOptimization = useCallback(() => {
    if (!previewData || previewData.isAlreadyOptimal) {
      setPreviewData(null);
      return;
    }

    // Save previous state to history for undo
    setDayHistory((prev) => ({
      ...prev,
      [activeDay.id]: [...activeDay.stops],
    }));

    setTrip((prev) => {
      const updatedDays = [...prev.days];
      updatedDays[activeDayIdx] = {
        ...updatedDays[activeDayIdx],
        stops: previewData.optimizedStops,
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

    setPreviewData(null);
  }, [activeDay, activeDayIdx, previewData, setTrip]);

  // Cancel / Discard Optimization preview
  const handleCancelOptimization = useCallback(() => {
    setPreviewData(null);
  }, []);

  // Undo Optimization: Reverts to original stop order and times
  const handleUndoOptimization = useCallback(() => {
    const previousStops = dayHistory[activeDay.id];
    if (!previousStops) return;

    setTrip((prev) => {
      const updatedDays = [...prev.days];
      updatedDays[activeDayIdx] = {
        ...updatedDays[activeDayIdx],
        stops: previousStops,
      };
      return {
        ...prev,
        days: updatedDays,
      };
    });

    setOptimizedDays((prev) => {
      const next = { ...prev };
      delete next[activeDay.id];
      return next;
    });

    setDayHistory((prev) => {
      const next = { ...prev };
      delete next[activeDay.id];
      return next;
    });
  }, [activeDay.id, activeDayIdx, dayHistory, setTrip]);

  const isDayOptimized = !!optimizedDays[activeDay.id];
  const canUndo = !!dayHistory[activeDay.id];

  return {
    isDayOptimized,
    optimizedDays,
    canUndo,
    previewData,
    handleOptimizeDay: handleRequestOptimize,
    handleRequestOptimize,
    handleApplyOptimization,
    handleCancelOptimization,
    handleUndoOptimization,
  };
}
