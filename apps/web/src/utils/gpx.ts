import { TripDay } from '../types/trip';
import { formatGpxCoordinateWasm, generateDayGpxWasm } from '../wasm/engine';

/**
 * Format decimal coordinates to readable lat/lon notation
 * e.g. 35.6953, 139.7022 -> "35.6953° N, 139.7022° E"
 * Powered by native Rust WASM (with JS fallback).
 */
export function formatGpxCoordinate(lat: number, lon: number): string {
  return formatGpxCoordinateWasm(lat, lon);
}

/**
 * Generates an RFC / Topografix compliant GPX 1.1 XML document for a TripDay
 * containing waypoints (<wpt>) for all stops and a track (<trk>/<trkseg>) for the route.
 * Powered by native Rust WASM (with JS fallback).
 */
export function generateDayGpx(day: TripDay, tripTitle = 'MojoLog Trip'): string {
  return generateDayGpxWasm(day, tripTitle);
}

/**
 * Triggers a browser download of the generated GPX XML
 */
export function downloadGpx(gpxXml: string, filename: string): void {
  const blob = new Blob([gpxXml], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.gpx') ? filename : `${filename}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
