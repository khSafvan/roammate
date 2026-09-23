import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSONSource, LngLatBounds, Map as MapLibreMap, NavigationControl } from 'maplibre-gl';
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
import { ItineraryStop, TransitMode, TripDay } from '../types/trip';
import { computeDistanceKm } from '../wasm/engine';
import { downloadGpx, formatGpxCoordinate, generateDayGpx } from '../utils/gpx';
import { MAP_CONFIG, TRANSIT_CONFIG, UI_CONFIG } from '../config/constants';
import { computeDayRouteData } from '../utils/routing';

interface InteractiveMapProps {
  day: TripDay;
  onSelectStop: (stop: ItineraryStop) => void;
  onOptimizeDay: () => void;
  isOptimized: boolean;
  transitModes?: Record<string, TransitMode>;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  day,
  onSelectStop,
  onOptimizeDay,
  isOptimized,
  transitModes = {},
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const stopsRef = useRef(day.stops);
  stopsRef.current = day.stops;
  const onSelectStopRef = useRef(onSelectStop);
  onSelectStopRef.current = onSelectStop;
  const routeCoordinatesRef = useRef<[number, number][]>([]);
  const routeRequestIdRef = useRef(0);

  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    day.stops[0]?.id || null
  );
  const [actualRouteKm, setActualRouteKm] = useState<number | null>(null);
  const selectedStopIdRef = useRef(selectedStopId);
  selectedStopIdRef.current = selectedStopId;

  // Sync selected stop when active day changes
  useEffect(() => {
    setSelectedStopId(day.stops[0]?.id || null);
  }, [day.id]);

  // Direct sequence distance fallback
  const directDistanceKm = useMemo(() => {
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

  const displayDistanceKm = actualRouteKm ?? directDistanceKm;

  const activeIndex = day.stops.findIndex((s) => s.id === selectedStopId);
  const activeStop = (activeIndex >= 0 ? day.stops[activeIndex] : null) || day.stops[0];
  const activeStopIndex = activeIndex >= 0 ? activeIndex : 0;

  // Fit 2D map camera smoothly to all day stops or route coordinates
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
    const coords = routeCoordinatesRef.current.length > 0
      ? routeCoordinatesRef.current
      : day.stops.map((s) => [s.coordinates.longitude, s.coordinates.latitude] as [number, number]);

    coords.forEach(([lng, lat]) => {
      bounds.extend([lng, lat]);
    });

    map.fitBounds(bounds, {
      padding: MAP_CONFIG.PADDING,
      maxZoom: 15,
      pitch: 0,
      bearing: 0,
      duration: immediate ? 0 : UI_CONFIG.MAP_FIT_DURATION_MS,
    });
  }, [day.stops]);

  // Setup multi-modal GeoJSON source and styled line layers if not yet added
  const ensureRouteLayers = useCallback((map: MapLibreMap) => {
    if (map.getSource('gpx-route-source')) return;

    map.addSource('gpx-route-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    // 1. High-contrast casing halo (crisp background separation)
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
        'line-width': 7,
        'line-opacity': 0.9,
      },
    });

    // 2. Drive / Road layer (Solid themed line following real street network)
    map.addLayer({
      id: 'gpx-route-drive',
      type: 'line',
      source: 'gpx-route-source',
      filter: ['==', ['coalesce', ['get', 'mode'], 'drive'], 'drive'] as any,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': day.themeColor || '#2563EB',
        'line-width': 4,
        'line-opacity': 0.95,
      },
    });

    // 3. Walk / Pedestrian layer (Dotted/dashed emerald path following sidewalks/walkways)
    map.addLayer({
      id: 'gpx-route-walk',
      type: 'line',
      source: 'gpx-route-source',
      filter: ['==', ['get', 'mode'], 'walk'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#059669',
        'line-width': 3.5,
        'line-dasharray': [1.5, 2],
        'line-opacity': 0.95,
      },
    });

    // 4. Rail Transit base track (dark track bed)
    map.addLayer({
      id: 'gpx-route-transit-base',
      type: 'line',
      source: 'gpx-route-source',
      filter: ['==', ['get', 'mode'], 'transit'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#1E293B',
        'line-width': 4.5,
        'line-opacity': 0.95,
      },
    });

    // 5. Rail Transit track ties (alternating railroad ties ladder)
    map.addLayer({
      id: 'gpx-route-transit-ties',
      type: 'line',
      source: 'gpx-route-source',
      filter: ['==', ['get', 'mode'], 'transit'],
      layout: {
        'line-join': 'round',
        'line-cap': 'butt',
      },
      paint: {
        'line-color': '#F8FAFC',
        'line-width': 2.5,
        'line-dasharray': [1.5, 2],
        'line-opacity': 0.95,
      },
    });

    // 6. Flight sky passage arc (curved geodesic aerial corridor)
    map.addLayer({
      id: 'gpx-route-flight',
      type: 'line',
      source: 'gpx-route-source',
      filter: ['==', ['get', 'mode'], 'flight'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#0284C7',
        'line-width': 3,
        'line-dasharray': [3, 2],
        'line-opacity': 0.9,
      },
    });

    // 7. Boat maritime fairway passage (curved nautical fairway channel)
    map.addLayer({
      id: 'gpx-route-boat',
      type: 'line',
      source: 'gpx-route-source',
      filter: ['==', ['get', 'mode'], 'boat'],
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#06B6D4',
        'line-width': 3.5,
        'line-dasharray': [4, 2],
        'line-opacity': 0.95,
      },
    });
  }, [day.themeColor]);

  // Asynchronously compute and render multi-modal road & passage geometry
  const updateRouteLayer = useCallback((map: MapLibreMap) => {
    ensureRouteLayers(map);

    if (map.getLayer('gpx-route-drive')) {
      map.setPaintProperty('gpx-route-drive', 'line-color', day.themeColor || '#2563EB');
    }

    if (day.stops.length < 2) {
      const source = map.getSource('gpx-route-source') as GeoJSONSource | undefined;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
      routeCoordinatesRef.current = [];
      setActualRouteKm(0);
      return;
    }

    const currentReqId = ++routeRequestIdRef.current;

    computeDayRouteData(day.stops, transitModes).then((routeData) => {
      if (currentReqId !== routeRequestIdRef.current) return;
      routeCoordinatesRef.current = routeData.fullCoordinates;
      setActualRouteKm(routeData.totalDistanceKm);

      const source = map.getSource('gpx-route-source') as GeoJSONSource | undefined;
      if (source) {
        source.setData(routeData.geojson);
      }
      fitToStops(false);
    });
  }, [day.stops, day.themeColor, transitModes, ensureRouteLayers, fitToStops]);

  // Setup native WebGL TerraWay Waypoint Layers (Zero DOM lag, locked to map projection matrix)
  const ensureWaypointLayers = useCallback((map: MapLibreMap) => {
    if (map.getSource('terraway-waypoints-source')) return;

    map.addSource('terraway-waypoints-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    // 1. Radar pulse / selection ring (WebGL circle)
    map.addLayer({
      id: 'terraway-waypoints-pulse',
      type: 'circle',
      source: 'terraway-waypoints-source',
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['get', 'selected'], false],
          22,
          0,
        ],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.22,
        'circle-stroke-width': [
          'case',
          ['boolean', ['get', 'selected'], false],
          2,
          0,
        ],
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': 0.7,
      },
    });

    // 2. High-contrast white halo casing (WebGL circle)
    map.addLayer({
      id: 'terraway-waypoints-halo',
      type: 'circle',
      source: 'terraway-waypoints-source',
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['get', 'selected'], false],
          16,
          13,
        ],
        'circle-color': '#FFFFFF',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(15, 23, 42, 0.18)',
      },
    });

    // 3. Colored waypoint body (WebGL circle)
    map.addLayer({
      id: 'terraway-waypoints-circle',
      type: 'circle',
      source: 'terraway-waypoints-source',
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['get', 'selected'], false],
          13,
          10.5,
        ],
        'circle-color': ['get', 'color'],
      },
    });

    // 4. Centered Waypoint index label (WebGL symbol)
    map.addLayer({
      id: 'terraway-waypoints-label',
      type: 'symbol',
      source: 'terraway-waypoints-source',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 10,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#FFFFFF',
      },
    });

    // 5. Waypoint title callout beneath marker (WebGL symbol)
    map.addLayer({
      id: 'terraway-waypoints-title',
      type: 'symbol',
      source: 'terraway-waypoints-source',
      layout: {
        'text-field': ['get', 'title'],
        'text-size': 11,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-optional': true,
        'text-max-width': 9,
      },
      paint: {
        'text-color': '#0F172A',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2,
      },
    });

    // Bind WebGL interaction listeners (pointer cursor + click selection)
    const interactiveLayerIds = [
      'terraway-waypoints-circle',
      'terraway-waypoints-halo',
      'terraway-waypoints-label',
      'terraway-waypoints-title',
    ];

    interactiveLayerIds.forEach((layerId) => {
      map.on('click', layerId, (e: any) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const stopId = feature.properties?.id;
        const stop = stopsRef.current.find((s) => s.id === stopId);
        if (stop) {
          setSelectedStopId(stop.id);
          onSelectStopRef.current(stop);
          map.flyTo({
            center: [stop.coordinates.longitude, stop.coordinates.latitude],
            zoom: Math.max(map.getZoom(), 14.5),
            pitch: 0,
            bearing: 0,
            duration: UI_CONFIG.MAP_FLY_DURATION_MS,
          });
        }
      });

      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });
  }, []);

  // Update GeoJSON source for waypoints (zero DOM lag, rendered directly by GPU)
  const updateWaypointLayer = useCallback((map: MapLibreMap) => {
    ensureWaypointLayers(map);
    const source = map.getSource('terraway-waypoints-source') as GeoJSONSource | undefined;
    if (!source) return;

    const totalStops = day.stops.length;
    const features = day.stops.map((stop, index) => {
      const isStart = index === 0;
      const isFinish = index === totalStops - 1 && totalStops > 1;
      const isSelected = stop.id === selectedStopId;
      const label = isStart ? 'S' : isFinish ? 'F' : String(index + 1).padStart(2, '0');
      const color = isStart
        ? '#059669'
        : isFinish
        ? '#DC2626'
        : day.themeColor || '#2563EB';

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [stop.coordinates.longitude, stop.coordinates.latitude],
        },
        properties: {
          id: stop.id,
          label,
          title: stop.title,
          color,
          selected: isSelected,
          index,
        },
      };
    });

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [day.stops, day.themeColor, selectedStopId, ensureWaypointLayers]);

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
        style: import.meta.env.VITE_MAP_STYLE_URL || MAP_CONFIG.TILE_STYLE_URL,
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

      // Minimal zoom controls (Compass/pitch rotation control disabled)
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
        updateWaypointLayer(map);
        updateRouteLayer(map);
        fitToStops(true);
      });

      map.on('error', (e: any) => {
        console.warn('TerraWay MapLibre notice:', e);
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
  }, [updateWaypointLayer, updateRouteLayer, fitToStops]);

  // Update WebGL waypoints, polyline and bounds when day stops, color, or transit modes change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      updateWaypointLayer(map);
      updateRouteLayer(map);
      fitToStops(false);
    }
  }, [day.stops, day.themeColor, transitModes, updateWaypointLayer, updateRouteLayer, fitToStops]);

  // Export RFC / Topografix Compliant GPX 1.1 file
  const handleExportGpx = () => {
    const gpxXml = generateDayGpx(day, 'roammate Itinerary');
    downloadGpx(gpxXml, `roammate_day_${day.dayNumber}_track.gpx`);
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
      {/* Top Map Action Bar with TerraWay Denotation */}
      <div className="map-toolbar">
        <div className="map-metrics">
          <div className="map-title-row">
            <span className="map-day-indicator" style={{ backgroundColor: day.themeColor }} />
            <h3 className="map-title">Day {day.dayNumber} Route</h3>
            <span
              className="terraway-engine-badge"
              title="TerraWay Cartographic Engine with Multi-Modal Road, Track & Passage Routing"
            >
              TerraWay GPS
            </span>
          </div>
          <p className="map-subtitle">
            {day.stops.length} Waypoints · {displayDistanceKm} km multi-modal path
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
            title="Recenter and fit all waypoints and route turns into view"
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

      {/* MapLibre 2D Planar Container with TerraWay Viewport */}
      <div className="map-canvas-container terraink-viewport-wrapper">
        <div
          ref={mapContainerRef}
          className="terraink-maplibre-viewport"
        />

        {/* Tactile TerraWay Engine & OpenFreeMap Watermark */}
        <div className="terraway-watermark">
          <a
            href="https://github.com/yousifamanuel/terraink"
            target="_blank"
            rel="noopener noreferrer"
            className="terraway-watermark-link"
          >
            TerraWay · OpenFreeMap
          </a>
        </div>
      </div>

      {/* Selected TerraWay Waypoint Floating Dock */}
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
              <span className="dock-coord-pill" title="TerraWay Waypoint Coordinates">
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
              title="Focus map camera on this TerraWay waypoint"
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
