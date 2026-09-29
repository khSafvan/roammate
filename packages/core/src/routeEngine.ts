import { BookingDocument, Coordinates, Expense, ItineraryStop, TransitLeg, TransitMode, TRANSIT_CONFIG } from '@mojolog/shared';

export interface OptimizationResult {
  optimized_ids: string[];
  original_duration_mins: number;
  optimized_duration_mins: number;
  minutes_saved: number;
  total_distance_km: number;
}

export interface ExpenseBreakdownResult {
  totalSpent: number;
  categoryTotals: Record<string, number>;
  highestCategory: string;
  expenseCount: number;
}

/** Great-circle Haversine distance, rounded to 0.1 km. */
export function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = TRANSIT_CONFIG.EARTH_RADIUS_KM;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lon2 - lon1);
  const latitude1 = toRadians(lat1);
  const latitude2 = toRadians(lat2);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Number((radiusKm * angularDistance).toFixed(1));
}

/** Estimate duration using the project's urban road and mode assumptions. */
export function estimateDurationMins(distanceKm: number, mode: TransitMode): number {
  const roadDistance = distanceKm * TRANSIT_CONFIG.ROAD_WINDING_FACTOR;
  const modeConfig = TRANSIT_CONFIG.MODES[mode] || TRANSIT_CONFIG.MODES.drive;
  const rawMinutes = (roadDistance / modeConfig.speedKmH) * 60 + modeConfig.bufferMins;
  return Math.max(modeConfig.minMins, Math.round(rawMinutes));
}

export interface DayHotelAnchor {
  id: string;
  title: string;
  address?: string;
  coordinates?: Coordinates;
  confirmationCode?: string;
  roomType?: string;
  time?: string;
  action: 'check_in' | 'depart' | 'return' | 'check_out';
  label: string;
  documentId?: string;
}

export interface DayAnchorsResult {
  startAnchor: DayHotelAnchor | null;
  endAnchor: DayHotelAnchor | null;
  activeHotel: DayHotelAnchor | null;
  isTransitionDay: boolean;
}

/**
 * Resolves starting and ending hotel anchors for an itinerary day following Wanderlog's lifecycle:
 * - Transition days: Start = Check out of Hotel A, End = Check in to Hotel B
 * - Intermediate days: Start = Depart Hotel (Base), End = Return to Hotel (Base)
 * - Check-in day: End = Check in to Hotel
 * - Check-out day: Start = Check out of Hotel
 */
export function getDayAnchors(
  dayDateStr: string | undefined,
  documents: BookingDocument[] = [],
  dayIdx: number = 0,
  _totalDays: number = 1,
  fallbackDays?: Array<{ id: string; stops?: Array<{ id: string; category?: string; title: string; address?: string; coordinates?: Coordinates }> }>
): DayAnchorsResult {
  const hotels = documents.filter((d) => d.category === 'hotel');

  if (hotels.length > 0 && dayDateStr) {
    const cleanDate = dayDateStr.includes('T') ? dayDateStr.split('T')[0] : dayDateStr.trim();
    
    // Check-out hotel on this day
    const checkOutHotel = hotels.find((h) => (h.endDate || h.date) === cleanDate);
    // Check-in hotel on this day
    const checkInHotel = hotels.find((h) => h.date === cleanDate);
    // Active staying hotel covering this day
    const stayingHotel = hotels.find((h) => {
      const start = h.date;
      const end = h.endDate || h.date;
      return start && end && start <= cleanDate && cleanDate <= end;
    });

    // 1. Hotel Transition Day (Checking out of Hotel A & Checking into Hotel B)
    if (checkOutHotel && checkInHotel && checkOutHotel.id !== checkInHotel.id) {
      const startAnchor: DayHotelAnchor = {
        id: `start_${checkOutHotel.id}`,
        title: checkOutHotel.title,
        address: checkOutHotel.location,
        coordinates: checkOutHotel.coordinates,
        confirmationCode: checkOutHotel.confirmationCode,
        roomType: checkOutHotel.cabinOrRoomType,
        time: checkOutHotel.endTime || '11:00 AM',
        action: 'check_out',
        label: `Check out of ${checkOutHotel.title}`,
        documentId: checkOutHotel.id,
      };
      const endAnchor: DayHotelAnchor = {
        id: `end_${checkInHotel.id}`,
        title: checkInHotel.title,
        address: checkInHotel.location,
        coordinates: checkInHotel.coordinates,
        confirmationCode: checkInHotel.confirmationCode,
        roomType: checkInHotel.cabinOrRoomType,
        time: checkInHotel.time || '03:00 PM',
        action: 'check_in',
        label: `Check in to ${checkInHotel.title}`,
        documentId: checkInHotel.id,
      };
      return { startAnchor, endAnchor, activeHotel: endAnchor, isTransitionDay: true };
    }

    // 2. Normal Stay Day (Within stay date range, not transitioning)
    if (stayingHotel) {
      const isFirstDay = stayingHotel.date === cleanDate;
      const isLastDay = (stayingHotel.endDate || stayingHotel.date) === cleanDate;

      const baseAnchor = (action: 'depart' | 'return' | 'check_in' | 'check_out', label: string, time?: string): DayHotelAnchor => ({
        id: `${action}_${stayingHotel.id}`,
        title: stayingHotel.title,
        address: stayingHotel.location,
        coordinates: stayingHotel.coordinates,
        confirmationCode: stayingHotel.confirmationCode,
        roomType: stayingHotel.cabinOrRoomType,
        time: time || (action === 'check_in' ? stayingHotel.time || '03:00 PM' : action === 'check_out' ? stayingHotel.endTime || '11:00 AM' : action === 'depart' ? '09:00 AM' : '09:00 PM'),
        action,
        label,
        documentId: stayingHotel.id,
      });

      if (isFirstDay && !isLastDay) {
        // Initial Check-in day
        const endAnchor = baseAnchor('check_in', `Check in to ${stayingHotel.title}`, stayingHotel.time || '03:00 PM');
        return { startAnchor: null, endAnchor, activeHotel: endAnchor, isTransitionDay: false };
      }

      if (isLastDay && !isFirstDay) {
        // Final Check-out day
        const startAnchor = baseAnchor('check_out', `Check out of ${stayingHotel.title}`, stayingHotel.endTime || '11:00 AM');
        return { startAnchor, endAnchor: null, activeHotel: startAnchor, isTransitionDay: false };
      }

      // Intermediate day: both start and return to hotel base
      const startAnchor = baseAnchor('depart', `Depart from ${stayingHotel.title} (Base)`, '09:00 AM');
      const endAnchor = baseAnchor('return', `Return to ${stayingHotel.title} (Base)`, '09:00 PM');
      return { startAnchor, endAnchor, activeHotel: startAnchor, isTransitionDay: false };
    }
  }

  // Fallback to legacy manual day lodging stops
  if (fallbackDays && dayIdx >= 0 && dayIdx < fallbackDays.length) {
    const currentDayStops = fallbackDays[dayIdx]?.stops || [];
    const explicitStay = currentDayStops.find((s) => s.category === 'lodging');
    if (explicitStay) {
      const anchor: DayHotelAnchor = {
        id: explicitStay.id,
        title: explicitStay.title,
        address: explicitStay.address,
        coordinates: explicitStay.coordinates,
        action: 'depart',
        label: explicitStay.title,
      };
      return { startAnchor: anchor, endAnchor: anchor, activeHotel: anchor, isTransitionDay: false };
    }

    for (let i = dayIdx - 1; i >= 0; i--) {
      const prevStay = (fallbackDays[i]?.stops || []).find((s) => s.category === 'lodging');
      if (prevStay) {
        const anchor: DayHotelAnchor = {
          id: prevStay.id,
          title: prevStay.title,
          address: prevStay.address,
          coordinates: prevStay.coordinates,
          action: 'depart',
          label: `${prevStay.title} (Base)`,
        };
        return { startAnchor: anchor, endAnchor: anchor, activeHotel: anchor, isTransitionDay: false };
      }
    }
  }

  return { startAnchor: null, endAnchor: null, activeHotel: null, isTransitionDay: false };
}

/**
 * Detects hotel / accommodation stay on a day or inherits active stay from previous days.
 */
export function getEffectiveStayForDay(
  days: Array<{ id: string; dayNumber: number; dateStr?: string; stops?: Array<{ id: string; category?: string; title: string; address?: string; coordinates?: { latitude: number; longitude: number } }> }>,
  dayIdx: number,
  documents?: BookingDocument[],
  tripStartDate?: string
): { stay: { id: string; title: string; address?: string; coordinates?: { latitude: number; longitude: number }; confirmationCode?: string; roomType?: string }; isInherited: boolean; status?: 'check_in' | 'staying' | 'check_out' } | null {
  if (!days || dayIdx < 0 || dayIdx >= days.length) return null;

  // 1. Explicit lodging stop on current day
  const currentDayStops = days[dayIdx]?.stops || [];
  const explicitStay = currentDayStops.find((s) => s.category === 'lodging');
  if (explicitStay) {
    return { stay: explicitStay, isInherited: false, status: 'check_in' };
  }

  // 2. Hotel documents check if documents exist
  let dayDateStr = days[dayIdx]?.dateStr;
  if (tripStartDate) {
    try {
      const dateObj = new Date(tripStartDate);
      dateObj.setDate(dateObj.getDate() + dayIdx);
      dayDateStr = dateObj.toISOString().split('T')[0];
    } catch {
      // ignore
    }
  }

  if (documents && documents.length > 0) {
    const anchors = getDayAnchors(dayDateStr, documents, dayIdx, days.length, days);
    if (anchors.activeHotel) {
      const isInherited = anchors.startAnchor?.action === 'depart';
      const status = anchors.endAnchor?.action === 'check_in' ? 'check_in' : anchors.startAnchor?.action === 'check_out' ? 'check_out' : 'staying';
      return {
        stay: {
          id: anchors.activeHotel.id,
          title: anchors.activeHotel.title,
          address: anchors.activeHotel.address,
          coordinates: anchors.activeHotel.coordinates,
          confirmationCode: anchors.activeHotel.confirmationCode,
          roomType: anchors.activeHotel.roomType,
        },
        isInherited,
        status,
      };
    }
  }

  // 3. Fallback: inherit previous day's lodging stop
  for (let i = dayIdx - 1; i >= 0; i--) {
    const prevStops = days[i]?.stops || [];
    const prevStay = prevStops.find((s) => s.category === 'lodging');
    if (prevStay) {
      return { stay: prevStay, isInherited: true, status: 'staying' };
    }
  }

  return null;
}

/** 2-opt route optimization with fixed start and end stops. */
export function optimizeRouteTsp(
  stops: Array<{ id: string; latitude: number; longitude: number }>,
  mode: TransitMode = 'drive'
): OptimizationResult {
  const route = stops.map((_, index) => index);
  const count = route.length;
  if (count < 2) {
    return {
      optimized_ids: stops.map((stop) => stop.id),
      original_duration_mins: 0,
      optimized_duration_mins: 0,
      minutes_saved: 0,
      total_distance_km: 0,
    };
  }

  const distances = Array.from({ length: count }, () => Array<number>(count).fill(0));
  const durations = Array.from({ length: count }, () => Array<number>(count).fill(0));
  for (let from = 0; from < count; from += 1) {
    for (let to = from + 1; to < count; to += 1) {
      const distance = computeDistanceKm(
        stops[from].latitude,
        stops[from].longitude,
        stops[to].latitude,
        stops[to].longitude
      );
      distances[from][to] = distance;
      distances[to][from] = distance;
      durations[from][to] = estimateDurationMins(distance, mode);
      durations[to][from] = durations[from][to];
    }
  }

  const getDuration = () => route.slice(0, -1).reduce(
    (total, stopIndex, index) => total + durations[stopIndex][route[index + 1]],
    0
  );
  const originalDuration = getDuration();
  let optimizedDuration = originalDuration;
  let improved = true;
  let passes = 0;

  while (improved && passes < 100) {
    improved = false;
    passes += 1;
    for (let start = 1; start < count - 2; start += 1) {
      for (let end = start + 1; end < count - 1; end += 1) {
        const before = route[start - 1];
        const first = route[start];
        const last = route[end];
        const after = route[end + 1];
        const oldCost = durations[before][first] + durations[last][after];
        const newCost = durations[before][last] + durations[first][after];
        if (newCost < oldCost) {
          route.splice(start, end - start + 1, ...route.slice(start, end + 1).reverse());
          optimizedDuration += newCost - oldCost;
          improved = true;
        }
      }
    }
  }

  const totalDistance = route.slice(0, -1).reduce(
    (total, stopIndex, index) => total + distances[stopIndex][route[index + 1]],
    0
  );
  return {
    optimized_ids: route.map((index) => stops[index].id),
    original_duration_mins: originalDuration,
    optimized_duration_mins: optimizedDuration,
    minutes_saved: Math.max(0, originalDuration - optimizedDuration),
    total_distance_km: Number(totalDistance.toFixed(1)),
  };
}

export function getWeatherComfortLabel(tempC: number, humidity: number, rainChance: number): string {
  if (rainChance >= 60) return 'Rain gear essential · Wet conditions';
  if (tempC >= 28 && humidity >= 65) return 'High heat index · Stay hydrated';
  if (tempC <= 12) return 'Crisp & cool · Warm layers recommended';
  if (tempC >= 18 && tempC <= 24 && rainChance <= 20) return 'Ideal travel weather · Perfect for walking';
  return 'Mild conditions · Comfortable for exploration';
}

export function computeTransitLegs(
  stops: ItineraryStop[],
  modes: Record<string, TransitMode>
): TransitLeg[] {
  const legs: TransitLeg[] = [];
  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index];
    const to = stops[index + 1];
    const mode = modes[`${from.id}->${to.id}`] || 'drive';
    const isNoteLeg = from.category === 'note' || to.category === 'note';
    const distanceKm = isNoteLeg
      ? 0
      : computeDistanceKm(
          from.coordinates.latitude,
          from.coordinates.longitude,
          to.coordinates.latitude,
          to.coordinates.longitude
        );
    const durationMinutes = isNoteLeg ? 0 : estimateDurationMins(distanceKm, mode);
    legs.push({
      fromStopId: from.id,
      toStopId: to.id,
      mode,
      distanceKm,
      durationMinutes,
      isOutlier: !isNoteLeg && (durationMinutes > 45 || distanceKm > 20),
    });
  }
  return legs;
}

export function computeExpenseBreakdown(expenses: Expense[]): ExpenseBreakdownResult {
  let totalSpent = 0;
  const categoryTotals: Record<string, number> = {};
  for (const expense of expenses) {
    totalSpent += expense.amount;
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
  }
  const highestCategory = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    categoryTotals,
    highestCategory,
    expenseCount: expenses.length,
  };
}
