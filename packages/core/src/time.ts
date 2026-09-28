/**
 * Pure time-string helpers. No I/O, no DOM.
 */

/** Parses "09:30 AM" / "14:00" → minutes from midnight */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 9 * 60;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const parts = clean.replace(/[A-Z\s]/g, '').split(':');
  let hours = parseInt(parts[0] || '9', 10);
  const minutes = parseInt(parts[1] || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** Formats minutes from midnight → "09:30 AM" or "09:30" */
export function formatMinutesToTime(totalMinutes: number, use12Hour: boolean): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const minsStr = minutes.toString().padStart(2, '0');

  if (use12Hour) {
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12.toString().padStart(2, '0')}:${minsStr} ${period}`;
  } else {
    const periodHours = hours24.toString().padStart(2, '0');
    return `${periodHours}:${minsStr}`;
  }
}
