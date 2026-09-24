import { ItineraryStop } from '../types/trip';
import { formatMinutesToTime, parseTimeToMinutes } from '../hooks/useTripOptimization';

export interface ScheduleConflict {
  hasConflict: boolean;
  conflictMins: number;
  departureTime: string;
  expectedArrival: string;
  scheduledStart: string;
}

/**
 * Checks for schedule overlaps and transit conflicts between consecutive stops.
 * A conflict occurs if Stop A's departure time + transit duration arrives after Stop B's scheduled start time.
 */
export function detectTransitConflict(
  prevStop: ItineraryStop,
  nextStop: ItineraryStop,
  transitMinutes: number
): ScheduleConflict | null {
  if (!prevStop?.startTime || !nextStop?.startTime) return null;

  const prevStartMins = parseTimeToMinutes(prevStop.startTime);
  const nextStartMins = parseTimeToMinutes(nextStop.startTime);

  // If next stop is on the next morning or wrapped around, skip simple day conflict
  if (nextStartMins < prevStartMins - 600) return null;

  const duration = prevStop.durationMinutes > 0 ? prevStop.durationMinutes : 60;
  const departureMins = prevStartMins + duration;
  const transitMins = Math.max(0, transitMinutes || 0);
  const expectedArrivalMins = departureMins + transitMins;

  if (expectedArrivalMins > nextStartMins) {
    const conflictMins = expectedArrivalMins - nextStartMins;
    const use12Hour = /am|pm/i.test(prevStop.startTime);

    return {
      hasConflict: true,
      conflictMins,
      departureTime: formatMinutesToTime(departureMins, use12Hour),
      expectedArrival: formatMinutesToTime(expectedArrivalMins, use12Hour),
      scheduledStart: nextStop.startTime,
    };
  }

  return null;
}
