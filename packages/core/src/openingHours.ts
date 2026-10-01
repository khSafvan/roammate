export interface ParsedHours {
  openTime?: string;
  closeTime?: string;
  is24h?: boolean;
  isClosed?: boolean;
  rawText?: string;
}

export function to12Hour(time24: string): string {
  const [h, m] = time24.split(':');
  let hours = parseInt(h, 10);
  const minutes = m || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export function parseOpeningHours(raw: string, dayOfWeek?: number): ParsedHours {
  if (!raw) return {};
  if (raw.toLowerCase() === '24/7' || raw === '00:00-24:00') {
    return { is24h: true, rawText: raw };
  }
  
  // A simple regex to grab the first matching time range like 09:00-18:00
  const timeMatch = raw.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  if (timeMatch) {
    return {
      openTime: timeMatch[1], // We'll return 24h internally or use to12Hour if desired
      closeTime: timeMatch[2],
      rawText: raw
    };
  }
  return { rawText: raw };
}
