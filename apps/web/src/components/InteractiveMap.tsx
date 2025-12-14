import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSONSource, LngLatBounds, Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Download,
  ExternalLink,
  Eye,
  Maximize2,
  Navigation,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ItineraryStop, TripDay } from '../types/trip';
import { computeDistanceKm } from '../wasm/engine';
import { downloadGpx, formatGpxCoordinate, generateDayGpx } from '../utils/gpx';
import { MAP_CONFIG, TRANSIT_CONFIG, UI_CONFIG } from '../config/constants';

interface InteractiveMapProps {
  day: TripDay;
  onSelectStop: (stop: ItineraryStop) => void;
  onOptimizeDay: () => void;
  isOptimized: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  day,
  onSelectStop,
  onOptimizeDay,
  isOptimized,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    day.stops[0]?.id || null
  );

  // Sync selected stop when active day changes
  useEffect(() => {
    setSelectedStopId(day.stops[0]?.id || null);
  }, [day.id]);

  // Compute total sequence route distance via Rust WASM engine
  const totalDistanceKm = useMemo(() => {
    let dist = 0;
    for (let i = 0; i < day.stops.length - 1; i++) {
      dist += computeDistanceKm(
        day.stops[i].coordinates.latitude,
        day.stops[i].coordinates.longitude,
        day.stops[i + 1].coordinates.latitude,
        day.stops[i + 1].coordinates.longitude
      );
    }
    return Number((dist * TRANSIT_CONFIG.ROAD_WINDING_FACTOR).toFixed(1));
  }, [day.stops]);

  const activeIndex = day.stops.findIndex((s) => s.id === selectedStopId);
  const activeStop = (activeIndex >= 0 ? day.stops[activeIndex] : null) || day.stops[0];
  const activeStopIndex = activeIndex >= 0 ? activeIndex : 0;

  // Fit 2D map camera smoothly to all day stops
  const fitToStops = useCallback((immediate = false) => {
    const map = mapRef.current;
    if (!map || day.stops.length === 0) return;

    if (day.stops.length === 1) {
      map.flyTo({
        center: [day.stops[0].coordinates.longitude, day.stops[0].coordinates.latitude],
        zoom: 14,
        pitch: 0,
        bearing: 0,
        duration: immediate ? 0 : UI_CONFIG.MAP_FLY_DURATION_MS,
        essential: true,
      });
      return;
    }

    const bounds = new LngLatBounds();
    day.stops.forEach((s) => {
      bounds.extend([s.coordinates.longitude, s.coordinates.latitude]);
    });

    map.fitBounds(bounds, {
      padding: MAP_CONFIG.PADDING,
      maxZoom: 15,
      pitch: 0,
      bearing: 0,
      duration: immediate ? 0 : UI_CONFIG.MAP_FIT_DURATION_MS,
    });
  }, [day.stops]);

  // Render or update continuous GPX Track Polyline (Terraink approach)
  const updateRouteLayer = useCallback((map: MapLibreMap) => {
    if (day.stops.length < 2) return;

    const coordinates = day.stops.map((s) => [
      s.coordinates.longitude,
      s.coordinates.latitude,
    ]);

    const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: `Day ${day.dayNumber} GPX Track`,
          },
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      ],
    };

    const source = map.getSource('gpx-route-source') as GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    } else {
      map.addSource('gpx-route-source', {
        type: 'geojson',
        data: geojson,
      });

      // Outer Casing line (Terraink signature high-contrast white halo)
      map.addLayer({
        id: 'gpx-route-casing',
        type: 'line',
        source: 'gpx-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 6.5,
          'line-opacity': 0.9,
        },
      });

      // Inner Themed Route Line
      map.addLayer({
        id: 'gpx-route-line',
        type: 'line',
        source: 'gpx-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': day.themeColor || '#2563EB',
          'line-width': 3.5,
          'line-opacity': 0.95,
        },
      });
    }

    if (map.getLayer('gpx-route-line')) {
      map.setPaintProperty('gpx-route-line', 'line-color', day.themeColor || '#2563EB');
    }
  }, [day.stops, day.themeColor, day.dayNumber]);

  // Render GPX Waypoint HTML Markers (Terraink Approach)
  const renderMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const totalStops = day.stops.length;

    // Create GPX waypoint markers: S (Start), F (Finish), 02, 03... (Intermediate)
    day.stops.forEach((stop, index) => {
      const isStart = index === 0;
      const isFinish = index === totalStops - 1 && totalStops > 1;
      const isCurrentSelected = stop.id === selectedStopId;

      const el = document.createElement('div');
      el.className = `terraink-gpx-pin ${isCurrentSelected ? 'active' : ''} ${
        isStart ? 'pin-start' : isFinish ? 'pin-finish' : 'pin-waypoint'
      }`;

      // Dynamic theme-matching background
      el.style.backgroundColor = isStart
        ? '#059669'
        : isFinish
        ? '#DC2626'
        : day.themeColor || '#2563EB';

      const labelText = isStart ? 'S' : isFinish ? 'F' : String(index + 1).padStart(2, '0');
      el.title = `${stop.title} [${formatGpxCoordinate(stop.coordinates.latitude, stop.coordinates.longitude)}]`;

      el.innerHTML = `
        <span class="gpx-pin-label">${labelText}</span>
        ${isCurrentSelected ? '<div class="terraink-pin-pulse" style="border-color: ' + (day.themeColor || '#2563EB') + '"></div>' : ''}
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedStopId(stop.id);
        onSelectStop(stop);
        map.flyTo({
          center: [stop.coordinates.longitude, stop.coordinates.latitude],
          zoom: Math.max(map.getZoom(), 14.5),
          pitch: 0,
          bearing: 0,
          duration: UI_CONFIG.MAP_FLY_DURATION_MS,
        });
      });

      const marker = new Marker({ element: el })
        .setLngLat([stop.coordinates.longitude, stop.coordinates.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [day.stops, day.themeColor, selectedStopId, onSelectStop]);

  // 1. Initialize MapLibre 2D Planar Map Instance (Zero 3D overhead)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const initialCenter: [number, number] =
        day.stops.length > 0
          ? [day.stops[0].coordinates.longitude, day.stops[0].coordinates.latitude]
          : [MAP_CONFIG.DEFAULT_CENTER.longitude, MAP_CONFIG.DEFAULT_CENTER.latitude];

      const map = new MapLibreMap({
        container: mapContainerRef.current,
        style: MAP_CONFIG.TILE_STYLE_URL,
        center: initialCenter,
        zoom: MAP_CONFIG.DEFAULT_ZOOM,
        // Pure 2D Planar Configuration - All 3D tilt & rotation disabled
        pitch: 0,
        maxPitch: 0,
        minPitch: 0,
        bearing: 0,
        dragRotate: false,
        touchPitch: false,
        pitchWithRotate: false,
        attributionControl: false,
      });

      // Add minimal zoom controls (Compass/pitch rotation control disabled)
      map.addControl(
        new NavigationControl({
          showCompass: false,
          showZoom: true,
        }),
        'top-right'
      );

      map.on('load', () => {
        mapRef.current = map;
        map.resize();
        renderMarkers();
        updateRouteLayer(map);
        fitToStops(true);
      });

      map.on('error', (e: any) => {
        console.warn('Terraink MapLibre notice:', e);
      });

      mapRef.current = map;

      // Observe container resize for responsive canvas resizing
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        resizeObserver.disconnect();
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.warn('MapLibre WebGL unavailable:', err);
    }
  }, []);

  // Update markers, polyline and bounds when day stops or color changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    renderMarkers();

    if (map.isStyleLoaded()) {
      updateRouteLayer(map);
      fitToStops(false);
    }
  }, [day.stops, day.themeColor, renderMarkers, updateRouteLayer, fitToStops]);

  // Export RFC / Topografix Compliant GPX 1.1 file
  const handleExportGpx = () => {
    const gpxXml = generateDayGpx(day, 'MojoLog Tokyo & Hakone Discovery');
    downloadGpx(gpxXml, `mojolog_day_${day.dayNumber}_track.gpx`);
  };

  const handleOpenGoogleMaps = (stop: ItineraryStop) => {
    const q = encodeURIComponent(`${stop.title}, ${stop.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  const handleFocusStop = (stop: ItineraryStop) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [stop.coordinates.longitude, stop.coordinates.latitude],
      zoom: 15,
      pitch: 0,
      bearing: 0,
      duration: UI_CONFIG.MAP_FLY_DURATION_MS,
    });
  };

  const isStartStop = activeStopIndex === 0;
  const isFinishStop = activeStopIndex === day.stops.length - 1 && day.stops.length > 1;

  return (
    <div className="map-view-card">
      {/* Top Map Action Bar with GPX Denotation */}
      <div className="map-toolbar">
        <div className="map-metrics">
          <div className="map-title-row">
            <span className="map-day-indicator" style={{ backgroundColor: day.themeColor }} />
            <h3 className="map-title">Day {day.dayNumber} GPX Track</h3>
            <span
              className="terraink-engine-badge"
              title="Terraink Cartographic Engine with GPX 1.1 Track & Waypoint Denotation"
            >
              GPX 1.1 Track
            </span>
          </div>
          <p className="map-subtitle">
            {day.stops.length} Waypoints · {totalDistanceKm} km sequence path
          </p>
        </div>

        {/* Action Controls: Export GPX, Fit Track, 1-Click Optimize */}
        <div className="map-toolbar-actions">
          <button
            className="gpx-action-btn"
            onClick={handleExportGpx}
            title="Download standard GPX 1.1 file for Garmin, Strava, Apple Watch, and GPS devices"
          >
            <Download size={13} />
            <span>Export GPX</span>
          </button>

          <button
            className="gpx-action-btn"
            onClick={() => fitToStops(false)}
            title="Recenter and fit all GPX waypoints into view"
          >
            <Maximize2 size={13} />
            <span>Fit Track</span>
          </button>

          <button
            className={`optimize-route-btn ${isOptimized ? 'optimized' : ''}`}
            onClick={onOptimizeDay}
            title="Optimize intermediate stop sequence using Rust WebAssembly 2-opt TSP engine"
          >
            {isOptimized ? <Zap size={15} /> : <Sparkles size={15} />}
            <span>{isOptimized ? 'Optimized (WASM)' : '1-Click Optimize'}</span>
          </button>
        </div>
      </div>

      {/* MapLibre 2D Planar Container with Terraink Viewport */}
      <div className="map-canvas-container terraink-viewport-wrapper">
        <div
          ref={mapContainerRef}
          className="terraink-maplibre-viewport"
        />

        {/* Tactile Terraink Engine & OpenFreeMap Watermark */}
        <div className="terraink-watermark">
          <a
            href="https://github.com/yousifamanuel/terraink"
            target="_blank"
            rel="noopener noreferrer"
            className="terraink-watermark-link"
          >
            Terraink · OpenFreeMap
          </a>
        </div>
      </div>

      {/* Selected GPX Waypoint Floating Dock */}
      {activeStop && (
        <div className="map-selected-dock">
          <div
            className="dock-badge"
            style={{
              backgroundColor: isStartStop
                ? '#059669'
                : isFinishStop
                ? '#DC2626'
                : day.themeColor || '#2563EB',
            }}
          >
            {isStartStop ? 'S' : isFinishStop ? 'F' : String(activeStopIndex + 1).padStart(2, '0')}
          </div>
          <div className="dock-details">
            <div className="dock-meta-row">
              <span className="dock-time">{activeStop.startTime}</span>
              <span className="dock-coord-pill" title="GPX Waypoint Coordinates">
                {formatGpxCoordinate(activeStop.coordinates.latitude, activeStop.coordinates.longitude)}
              </span>
            </div>
            <div className="dock-title">{activeStop.title}</div>
            <div className="dock-address">{activeStop.address}</div>
          </div>
          <div className="dock-actions">
            <button
              className="dock-focus-btn"
              onClick={() => handleFocusStop(activeStop)}
              title="Focus map camera on this GPX waypoint"
            >
              <Eye size={13} />
              <span>Center</span>
            </button>
            <button
              className="dock-nav-btn"
              onClick={() => handleOpenGoogleMaps(activeStop)}
              title="Open directions in Google Maps"
            >
              <Navigation size={13} />
              <span>Navigate</span>
              <ExternalLink size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
