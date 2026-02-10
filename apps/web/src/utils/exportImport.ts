import { Trip } from '../types/trip';

/**
 * Method A: Universal Portable JSON File (.json) Export
 * Generates and downloads a clean, portable itinerary document
 */
export function exportItinerary(tripData: Trip): void {
  const jsonString = JSON.stringify(tripData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const sanitizedTitle = tripData.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  anchor.href = url;
  anchor.download = `${sanitizedTitle}_itinerary.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Method A: Import Portable JSON File
 * Reads file, regenerates unique tripId to avoid collision with the original creator's data
 */
export async function importItineraryFile(file: File): Promise<Trip> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed.title || !Array.isArray(parsed.days)) {
    throw new Error('Invalid roammate itinerary file structure.');
  }

  // Regenerate tripId to prevent collision
  const newId = 'trip_' + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
  parsed.id = newId;
  parsed.tripId = newId;
  parsed.shareToken = (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));

  return parsed as Trip;
}

/**
 * Method B: Generates an 8-character read-only share token
 */
export function generateShareToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Computes public read-only link URL
 */
export function getShareUrl(shareToken: string): string {
  const origin = window.location.origin;
  const path = window.location.pathname;
  return `${origin}${path}?share=${shareToken}`;
}
