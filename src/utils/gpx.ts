import { TripDay } from '../types/trip';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format decimal coordinates to readable lat/lon notation
 * e.g. 35.6953, 139.7022 -> "35.6953° N, 139.7022° E"
 */
export function formatGpxCoordinate(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

/**
 * Generates an RFC / Topografix compliant GPX 1.1 XML document for a TripDay
 * containing waypoints (<wpt>) for all stops and a track (<trk>/<trkseg>) for the route.
 */
export function generateDayGpx(day: TripDay, tripTitle = 'MojoLog Trip'): string {
  const dateIso = new Date().toISOString();

  const waypointsXml = day.stops
    .map((stop, index) => {
      const isStart = index === 0;
      const isFinish = index === day.stops.length - 1;
      const tag = isStart ? 'START' : isFinish ? 'FINISH' : `WPT ${index + 1}`;
      const name = `${tag}: ${escapeXml(stop.title)}`;
      const desc = escapeXml(`${stop.subtitle || ''} | ${stop.address} (${stop.startTime})`);

      return `  <wpt lat="${stop.coordinates.latitude.toFixed(6)}" lon="${stop.coordinates.longitude.toFixed(6)}">
    <name>${name}</name>
    <desc>${desc}</desc>
    <sym>${escapeXml(stop.category)}</sym>
    <type>${escapeXml(stop.category)}</type>
  </wpt>`;
    })
    .join('\n');

  const trackPointsXml = day.stops
    .map((stop) => {
      return `      <trkpt lat="${stop.coordinates.latitude.toFixed(6)}" lon="${stop.coordinates.longitude.toFixed(6)}">
        <name>${escapeXml(stop.title)}</name>
      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MojoLog / Terraink Engine" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(tripTitle)} — Day ${day.dayNumber}: ${escapeXml(day.title)}</name>
    <desc>${escapeXml(day.dateStr)} route track and waypoints</desc>
    <time>${dateIso}</time>
  </metadata>
${waypointsXml}
  <trk>
    <name>Day ${day.dayNumber} Route Track</name>
    <trkseg>
${trackPointsXml}
    </trkseg>
  </trk>
</gpx>`;
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
