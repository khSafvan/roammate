import { parseTimeToMinutes } from '../hooks/useTripOptimization';
import { Trip } from '../types/trip';

/**
 * Formats a Date object into iCalendar UTC timestamp string: YYYYMMDDTHHMMSSZ
 */
function formatIcsDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const mins = pad(date.getUTCMinutes());
  const secs = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${mins}${secs}Z`;
}

/**
 * Formats a Date into local date-only string: YYYYMMDD
 */
function formatIcsDateOnly(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}${month}${day}`;
}

/**
 * Escapes characters for iCalendar text fields according to RFC 5545
 */
function escapeIcsText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generates an RFC 5545 compliant .ics calendar file content from a Trip document
 */
export function generateIcalendarFeed(trip: Trip): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//roammate//Travel Itinerary//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(trip.title)}`,
    `X-WR-CALDESC:${escapeIcsText(trip.destination)} Itinerary`,
  ];

  const nowIcs = formatIcsDateTime(new Date());

  // 1. FLIGHTS
  if (trip.flights && trip.flights.length > 0) {
    trip.flights.forEach((f) => {
      const flightDate = f.date ? new Date(f.date) : new Date();
      if (isNaN(flightDate.getTime())) return;

      const depParts = (f.departure.time || '10:00').split(':');
      const arrParts = (f.arrival.time || '14:00').split(':');

      const start = new Date(flightDate);
      start.setHours(parseInt(depParts[0] || '10', 10), parseInt(depParts[1] || '0', 10), 0, 0);

      const end = new Date(flightDate);
      end.setHours(parseInt(arrParts[0] || '14', 10), parseInt(arrParts[1] || '0', 10), 0, 0);
      if (f.arrival.nextDay || end < start) {
        end.setDate(end.getDate() + 1);
      }

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:flight_${f.id || f.flightNumber}_${trip.id}@roammate.app`);
      lines.push(`DTSTAMP:${nowIcs}`);
      lines.push(`DTSTART:${formatIcsDateTime(start)}`);
      lines.push(`DTEND:${formatIcsDateTime(end)}`);
      lines.push(`SUMMARY:✈️ Flight ${f.carrier} ${f.flightNumber}: ${f.departure.airport} ➔ ${f.arrival.airport}`);
      lines.push(`LOCATION:${escapeIcsText(`${f.departure.airport}, ${f.departure.city}`)}`);

      const desc = [
        `Flight: ${f.carrier} ${f.flightNumber}`,
        f.passengerName ? `Passenger: ${f.passengerName}` : '',
        f.bookingRef ? `Booking Ref: ${f.bookingRef}` : '',
        f.seat ? `Seat: ${f.seat}` : '',
        f.departure.terminal ? `Terminal: ${f.departure.terminal}` : '',
        f.departure.gate ? `Gate: ${f.departure.gate}` : '',
        f.notes ? `Notes: ${f.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    });
  }

  // 2. HOTEL & LODGING BOOKING DOCUMENTS
  if (trip.documents && trip.documents.length > 0) {
    trip.documents
      .filter((d) => d.category === 'hotel')
      .forEach((h) => {
        const checkIn = h.date ? new Date(h.date) : null;
        const checkOut = h.endDate ? new Date(h.endDate) : checkIn ? new Date(checkIn.getTime() + 86400000) : null;
        if (!checkIn) return;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:hotel_${h.id}_${trip.id}@roammate.app`);
        lines.push(`DTSTAMP:${nowIcs}`);
        lines.push(`DTSTART;VALUE=DATE:${formatIcsDateOnly(checkIn)}`);
        lines.push(`DTEND;VALUE=DATE:${formatIcsDateOnly(checkOut || checkIn)}`);
        lines.push(`SUMMARY:🏨 Hotel Stay: ${escapeIcsText(h.title)}`);
        if (h.location) {
          lines.push(`LOCATION:${escapeIcsText(h.location)}`);
        }

        const desc = [
          h.subtitle ? h.subtitle : '',
          h.confirmationCode ? `Confirmation Code: ${h.confirmationCode}` : '',
          h.cabinOrRoomType ? `Room: ${h.cabinOrRoomType}` : '',
          h.passengerOrGuestName ? `Guests: ${h.passengerOrGuestName}` : '',
          h.notes ? `Notes: ${h.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
        lines.push('STATUS:CONFIRMED');
        lines.push('END:VEVENT');
      });
  }

  // 3. DAILY ITINERARY STOPS
  if (trip.days && trip.days.length > 0) {
    trip.days.forEach((day, dayIdx) => {
      // Determine day base date
      let baseDate = trip.startDate ? new Date(trip.startDate) : new Date();
      if (!isNaN(baseDate.getTime())) {
        baseDate.setDate(baseDate.getDate() + dayIdx);
      } else {
        baseDate = new Date();
      }

      (day.stops || []).forEach((stop) => {
        const startMins = parseTimeToMinutes(stop.startTime || '09:00 AM');
        const duration = stop.durationMinutes > 0 ? stop.durationMinutes : 60;
        const endMins = startMins + duration;

        const start = new Date(baseDate);
        start.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);

        const end = new Date(baseDate);
        end.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:stop_${stop.id}_${day.id}_${trip.id}@roammate.app`);
        lines.push(`DTSTAMP:${nowIcs}`);
        lines.push(`DTSTART:${formatIcsDateTime(start)}`);
        lines.push(`DTEND:${formatIcsDateTime(end)}`);
        lines.push(`SUMMARY:${escapeIcsText(stop.title)}`);
        if (stop.address) {
          lines.push(`LOCATION:${escapeIcsText(stop.address)}`);
        }

        const desc = [
          stop.subtitle || '',
          `Category: ${stop.category}`,
          stop.bookingRef ? `Confirmation: ${stop.bookingRef}` : '',
          stop.notes ? `Notes: ${stop.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
        lines.push('END:VEVENT');
      });
    });
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a download of the .ics calendar file in the user's browser
 */
export function downloadIcsCalendar(trip: Trip): void {
  const icsData = generateIcalendarFeed(trip);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const filename = `${(trip.title || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_itinerary.ics`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
