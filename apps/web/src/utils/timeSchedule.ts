import { ItineraryStop } from '../types/trip';

/**
 * Parses time string like "09:00 AM", "9:00", "14:30", "2:15 PM" into total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 540; // Default 09:00 AM (540 mins)

  const clean = timeStr.trim().toLowerCase();
  const isPm = clean.includes('pm');
  const isAm = clean.includes('am');

  const numbersOnly = clean.replace(/[^0-9:]/g, '');
  const parts = numbersOnly.split(':');

  let hours = parseInt(parts[0], 10);
  let minutes = parts[1] ? parseInt(parts[1], 10) : 0;

  if (isNaN(hours)) hours = 9;
  if (isNaN(minutes)) minutes = 0;

  if (isPm && hours < 12) hours += 12;
  if (isAm && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Formats total minutes from midnight into 12-hour display string (e.g., "10:30 AM")
 */
export function formatMinutesToTime(totalMinutes: number): string {
  let mins = Math.max(0, totalMinutes % (24 * 60));
  let hours = Math.floor(mins / 60);
  const m = mins % 60;

  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const formattedMins = m.toString().padStart(2, '0');
  return `${hours}:${formattedMins} ${period}`;
}

/**
 * Recalculates start times for an array of itinerary stops in sequence.
 * Preserves initial start time (or uses defaultStart), adding duration + buffer (default 15m) to subsequent stops.
 */
export function recalculateStopTimes(
  stops: ItineraryStop[],
  defaultStart = '09:00 AM',
  bufferMinutes = 15
): ItineraryStop[] {
  if (!stops || stops.length === 0) return [];

  let currentMinutes = parseTimeToMinutes(stops[0].startTime || defaultStart);

  return stops.map((stop, idx) => {
    const isNote = stop.category === 'note' || stop.durationMinutes === 0;

    const updatedStartTime = formatMinutesToTime(currentMinutes);

    // If it's not a note, advance currentMinutes by duration + buffer
    if (!isNote) {
      const duration = Math.max(5, stop.durationMinutes || 60);
      currentMinutes += duration + bufferMinutes;
    }

    return {
      ...stop,
      orderIndex: idx + 1,
      startTime: updatedStartTime,
    };
  });
}

/**
 * Suggests default start time for a newly added stop based on existing stops on that day.
 */
export function getNextSuggestedStartTime(stops: ItineraryStop[], defaultStart = '09:00 AM', bufferMinutes = 15): string {
  if (!stops || stops.length === 0) return defaultStart;

  const lastStop = stops[stops.length - 1];
  const lastStartMins = parseTimeToMinutes(lastStop.startTime || defaultStart);
  const lastDuration = lastStop.category === 'note' ? 0 : Math.max(5, lastStop.durationMinutes || 60);

  const nextMins = lastStartMins + lastDuration + bufferMinutes;
  return formatMinutesToTime(nextMins);
}
