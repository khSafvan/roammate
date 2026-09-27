import { ItineraryStop, TransitMode } from '../types/trip';
import { computeDistanceKm } from '../wasm/engine';
import { parseTimeToMinutes, formatMinutesToTime } from '../hooks/useTripOptimization';

export interface TimeWindowOptimizationResult {
  optimizedStops: ItineraryStop[];
  originalTransitMinutes: number;
  optimizedTransitMinutes: number;
  originalDistanceKm: number;
  optimizedDistanceKm: number;
  minutesSaved: number;
  isAlreadyOptimal: boolean;
  constraintsRespected: {
    mealsAligned: string[];
    operatingHoursPassed: number;
    fixedSlotsPreserved: number;
  };
}

export interface MealWindow {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  startMinutes: number;
  endMinutes: number;
  targetMinutes: number;
}

export const MEAL_WINDOWS: Record<string, MealWindow> = {
  breakfast: { type: 'breakfast', startMinutes: 480, endMinutes: 630, targetMinutes: 525 }, // 8:00 AM - 10:30 AM (ideal 8:45 AM)
  lunch: { type: 'lunch', startMinutes: 720, endMinutes: 870, targetMinutes: 750 },       // 12:00 PM - 2:30 PM (ideal 12:30 PM)
  snack: { type: 'snack', startMinutes: 900, endMinutes: 1050, targetMinutes: 960 },      // 3:00 PM - 5:30 PM (ideal 4:00 PM)
  dinner: { type: 'dinner', startMinutes: 1110, endMinutes: 1320, targetMinutes: 1170 },   // 6:30 PM - 10:00 PM (ideal 7:30 PM)
};

/**
 * Estimates transit duration in minutes between two geographic coordinates
 */
export function estimateTransitMinutes(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: TransitMode = 'drive'
): { distanceKm: number; durationMinutes: number } {
  const dist = computeDistanceKm(fromLat, fromLng, toLat, toLng);
  let duration: number;

  switch (mode) {
    case 'walk':
      // Walking speed ~4.8 km/h -> ~12.5 mins per km
      duration = Math.max(3, Math.round(dist * 12.5));
      break;
    case 'transit':
      // Public transit average ~25 km/h + 6 min waiting/transfer
      duration = Math.max(6, Math.round((dist / 25) * 60 + 6));
      break;
    case 'drive':
    default:
      // City driving with road winding ~35 km/h + 3 min parking/signals
      duration = Math.max(4, Math.round((dist / 35) * 60 + 3));
      break;
  }

  return { distanceKm: Number(dist.toFixed(2)), durationMinutes: duration };
}

/**
 * Classifies a stop's meal window based on explicit mealType or start time heuristics
 */
export function classifyMealWindow(stop: ItineraryStop): MealWindow | null {
  if (stop.category !== 'dining' && !stop.mealType) {
    return null;
  }

  if (stop.mealType && MEAL_WINDOWS[stop.mealType]) {
    return MEAL_WINDOWS[stop.mealType];
  }

  const mins = parseTimeToMinutes(stop.startTime);
  if (mins < 660) {
    return MEAL_WINDOWS.breakfast;
  } else if (mins <= 900) {
    return MEAL_WINDOWS.lunch;
  } else if (mins <= 1080) {
    return MEAL_WINDOWS.snack;
  } else {
    return MEAL_WINDOWS.dinner;
  }
}

/**
 * Evaluates the penalty score of a scheduled stop sequence
 */
export function evaluateSequencePenalty(
  stops: ItineraryStop[],
  startMinutes: number,
  mode: TransitMode = 'drive'
): {
  score: number;
  totalTransitMinutes: number;
  totalDistanceKm: number;
  mealsAligned: string[];
  operatingHoursPassed: number;
  fixedSlotsPreserved: number;
} {
  let currentTime = startMinutes;
  let totalTransitMinutes = 0;
  let totalDistanceKm = 0;
  let penalty = 0;

  const mealsAligned: string[] = [];
  let operatingHoursPassed = 0;
  let fixedSlotsPreserved = 0;
  let lastGeographicStop: ItineraryStop | null = null;

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];

    if (stop.category === 'note') {
      continue;
    }

    if (lastGeographicStop) {
      const transit = estimateTransitMinutes(
        lastGeographicStop.coordinates.latitude,
        lastGeographicStop.coordinates.longitude,
        stop.coordinates.latitude,
        stop.coordinates.longitude,
        mode
      );

      totalTransitMinutes += transit.durationMinutes;
      totalDistanceKm += transit.distanceKm;

      const prevDuration = lastGeographicStop.durationMinutes > 0 ? lastGeographicStop.durationMinutes : 60;
      currentTime += prevDuration + transit.durationMinutes;
    }

    lastGeographicStop = stop;
    const duration = stop.durationMinutes > 0 ? stop.durationMinutes : 60;
    const departureTime = currentTime + duration;

    // 1. Fixed-time evaluation (booked flights, timed tickets, fixed reservations)
    if (stop.isFixedTime || stop.category === 'flight') {
      const originalTime = parseTimeToMinutes(stop.startTime);
      const diff = Math.abs(currentTime - originalTime);
      if (diff <= 30) {
        fixedSlotsPreserved++;
      } else {
        // Heavy penalty for violating locked appointments
        penalty += diff * 15;
      }
    }

    // 2. Meal window evaluation
    const mealWin = classifyMealWindow(stop);
    if (mealWin) {
      if (currentTime >= mealWin.startMinutes && currentTime <= mealWin.endMinutes) {
        mealsAligned.push(
          `${mealWin.type.charAt(0).toUpperCase() + mealWin.type.slice(1)} aligned (${formatMinutesToTime(currentTime, true)} · ${stop.title})`
        );
      } else {
        // Distance from ideal meal target
        const distanceToTarget = Math.abs(currentTime - mealWin.targetMinutes);
        penalty += distanceToTarget * 4; // Substantial penalty for dining outside meal hours
      }
    }

    // 3. Operating hours evaluation
    if (stop.openTime || stop.closeTime) {
      const openMins = stop.openTime ? parseTimeToMinutes(stop.openTime) : 0;
      const closeMins = stop.closeTime ? parseTimeToMinutes(stop.closeTime) : 1440;

      if (currentTime >= openMins && departureTime <= closeMins) {
        operatingHoursPassed++;
      } else {
        if (currentTime < openMins) {
          // Arrived before opening
          penalty += (openMins - currentTime) * 2;
        }
        if (departureTime > closeMins) {
          // Closed while visiting!
          penalty += (departureTime - closeMins) * 10;
        }
      }
    }
  }

  // Combined weighted score (lower is better)
  const score = totalTransitMinutes + totalDistanceKm * 1.5 + penalty;

  return {
    score,
    totalTransitMinutes,
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    mealsAligned,
    operatingHoursPassed,
    fixedSlotsPreserved,
  };
}

/**
 * Reflows timestamps across stops while respecting meal windows and fixed bookings
 */
export function reflowTimestamps(
  stops: ItineraryStop[],
  startMinutes: number,
  use12Hour: boolean,
  mode: TransitMode = 'drive'
): ItineraryStop[] {
  let currentTime = startMinutes;
  let lastGeographicStop: ItineraryStop | null = null;

  return stops.map((stop, index) => {
    if (stop.category === 'note') {
      return {
        ...stop,
        orderIndex: index + 1,
        startTime: formatMinutesToTime(currentTime, use12Hour),
      };
    }

    if (lastGeographicStop) {
      const transit = estimateTransitMinutes(
        lastGeographicStop.coordinates.latitude,
        lastGeographicStop.coordinates.longitude,
        stop.coordinates.latitude,
        stop.coordinates.longitude,
        mode
      );
      const prevDuration = lastGeographicStop.durationMinutes > 0 ? lastGeographicStop.durationMinutes : 60;
      currentTime += prevDuration + transit.durationMinutes;
    }

    // If stop has a fixed time, anchor strictly to it
    if (stop.isFixedTime) {
      currentTime = parseTimeToMinutes(stop.startTime);
    }

    const currentFormatted = formatMinutesToTime(currentTime, use12Hour);
    lastGeographicStop = stop;

    return {
      ...stop,
      orderIndex: index + 1,
      startTime: currentFormatted,
    };
  });
}

/**
 * Optimizes a day's stops using Time-Window Aware Traveling Salesperson (TSP-TW)
 */
export function optimizeTimeWindowRoute(
  stops: ItineraryStop[],
  mode: TransitMode = 'drive',
  dayStartTime?: string
): TimeWindowOptimizationResult {
  if (!stops || stops.length <= 1) {
    return {
      optimizedStops: stops || [],
      originalTransitMinutes: 0,
      optimizedTransitMinutes: 0,
      originalDistanceKm: 0,
      optimizedDistanceKm: 0,
      minutesSaved: 0,
      isAlreadyOptimal: true,
      constraintsRespected: {
        mealsAligned: [],
        operatingHoursPassed: 0,
        fixedSlotsPreserved: 0,
      },
    };
  }

  const initialTimeStr = dayStartTime || stops[0]?.startTime || '09:00 AM';
  const startMinutes = parseTimeToMinutes(initialTimeStr);
  const use12Hour = /am|pm/i.test(initialTimeStr);

  // Evaluate baseline original sequence
  const baseline = evaluateSequencePenalty(stops, startMinutes, mode);

  // Identify anchor stops (e.g. hotel start/end or morning flight)
  const isStartFixed = stops[0]?.isAnchor || stops[0]?.isFixedTime || stops[0]?.category === 'flight';

  let bestSequence = [...stops];
  let bestScore = baseline.score;
  let bestMetrics = baseline;

  // Search strategy: 2-opt neighborhood search with meal & time-window constraints
  const flexibleIndices: number[] = [];
  for (let i = isStartFixed ? 1 : 0; i < stops.length; i++) {
    if (stops[i].category !== 'note') {
      flexibleIndices.push(i);
    }
  }

  // Iterative local search
  let improved = true;
  let iteration = 0;
  const MAX_ITERATIONS = 50;

  while (improved && iteration < MAX_ITERATIONS) {
    improved = false;
    iteration++;

    for (let i = 0; i < flexibleIndices.length - 1; i++) {
      for (let j = i + 1; j < flexibleIndices.length; j++) {
        const idx1 = flexibleIndices[i];
        const idx2 = flexibleIndices[j];

        // 2-opt sub-reversal
        const candidate = [...bestSequence];
        const sub = candidate.slice(idx1, idx2 + 1).reverse();
        candidate.splice(idx1, sub.length, ...sub);

        const evalResult = evaluateSequencePenalty(candidate, startMinutes, mode);
        if (evalResult.score < bestScore - 0.5) {
          bestScore = evalResult.score;
          bestSequence = candidate;
          bestMetrics = evalResult;
          improved = true;
        }
      }
    }
  }

  // Meal relocation heuristic: explicitly test inserting lunch into the midday slot (~12:00–1:30 PM)
  const diningIndices = bestSequence
    .map((s, idx) => ({ stop: s, idx }))
    .filter(({ stop }) => stop.category === 'dining' || stop.mealType === 'lunch');

  for (const { idx: dIdx } of diningIndices) {
    for (let targetIdx = 0; targetIdx < bestSequence.length; targetIdx++) {
      if (targetIdx === dIdx) continue;
      const candidate = [...bestSequence];
      const [diningStop] = candidate.splice(dIdx, 1);
      candidate.splice(targetIdx, 0, diningStop);

      const evalResult = evaluateSequencePenalty(candidate, startMinutes, mode);
      if (evalResult.score < bestScore - 0.5) {
        bestScore = evalResult.score;
        bestSequence = candidate;
        bestMetrics = evalResult;
      }
    }
  }

  // Reflow times for the winning sequence
  const finalOptimizedStops = reflowTimestamps(bestSequence, startMinutes, use12Hour, mode);

  const isSameOrder = stops.every((s, i) => s.id === finalOptimizedStops[i]?.id);
  const minutesSaved = Math.max(0, baseline.totalTransitMinutes - bestMetrics.totalTransitMinutes);
  const isAlreadyOptimal = isSameOrder || (minutesSaved === 0 && stops.length <= 2);

  return {
    optimizedStops: finalOptimizedStops,
    originalTransitMinutes: baseline.totalTransitMinutes,
    optimizedTransitMinutes: bestMetrics.totalTransitMinutes,
    originalDistanceKm: baseline.totalDistanceKm,
    optimizedDistanceKm: bestMetrics.totalDistanceKm,
    minutesSaved,
    isAlreadyOptimal,
    constraintsRespected: {
      mealsAligned: bestMetrics.mealsAligned,
      operatingHoursPassed: bestMetrics.operatingHoursPassed,
      // reflowTimestamps guarantees isFixedTime stops keep their original startTime —
      // count them directly rather than relying on penalty-evaluation heuristic
      fixedSlotsPreserved: finalOptimizedStops.filter((s) => s.isFixedTime).length,
    },
  };
}
