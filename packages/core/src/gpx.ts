import { TripDay } from '@mojolog/shared';

/**
 * Formats decimal coordinates to readable lat/lon notation
 * e.g. 35.6953, 139.7022 → "35.6953° N, 139.7022° E"
 */
export function formatGpxCoordinate(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(4)}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`;
}

/**
 * Generates an RFC / Topografix-compliant GPX 1.1 XML document for a TripDay
 */
export function generateDayGpx(day: TripDay, tripTitle = 'roammate Trip'): string {
  const geoStops = day.stops.filter((s) => s.category !== 'note');
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const wpts = geoStops.map((s, i) => {
    const tag = i === 0 ? 'START' : i === geoStops.length - 1 && geoStops.length > 1 ? 'FINISH' : `WPT ${i + 1}`;
    return `  <wpt lat="${s.coordinates.latitude.toFixed(6)}" lon="${s.coordinates.longitude.toFixed(6)}">
    <name>${tag}: ${esc(s.title)}</name>
    <desc>${esc(`${s.subtitle || ''} | ${s.address} (${s.startTime})`)}</desc>
    <sym>${esc(s.category)}</sym><type>${esc(s.category)}</type>
  </wpt>`;
  }).join('\n');
  const trkpts = geoStops.map((s) =>
    `      <trkpt lat="${s.coordinates.latitude.toFixed(6)}" lon="${s.coordinates.longitude.toFixed(6)}"><name>${esc(s.title)}</name></trkpt>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="roammate / TerraWay Engine" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(tripTitle)} — Day ${day.dayNumber}: ${esc(day.title)}</name><desc>${esc(day.dateStr)}</desc></metadata>
${wpts}
  <trk><name>Day ${day.dayNumber} Route Track</name><trkseg>
${trkpts}
  </trkseg></trk>
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
