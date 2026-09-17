import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSONSource, LngLatBounds, Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Compass,
  ExternalLink,
  Eye,
  Layers,
  Maximize2,
  Navigation,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ItineraryStop, TripDay } from '../types/trip';
import { computeDistanceKm } from '../wasm/engine';

interface InteractiveMapProps {
  day: TripDay;
  onSelectStop: (stop: ItineraryStop) => void;
  onOptimizeDay: () => void;
  isOptimized: boolean;
}

// Terraink-inspired OpenFreeMap Vector Cartographic Styles (No API Key Required)
const TERRAINK_STYLES = [
  {
    id: 'positron',
    name: 'Minimal Light',
    url: 'https://tiles.openfreemap.org/styles/positron',
  },
  {
    id: 'bright',
    name: 'Vivid OpenMap',
    url: 'https://tiles.openfreemap.org/styles/bright',
  },
  {
    id: 'liberty',
    name: 'Classic Liberty',
    url: 'https://tiles.openfreemap.org/styles/liberty',
  },
] as const;

type TerrainkStyleId = (typeof TERRAINK_STYLES)[number]['id'];

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  day,
  onSelectStop,
  onOptimizeDay,
  isOptimized,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const [currentStyle, setCurrentStyle] = useState<TerrainkStyleId>('positron');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    day.stops[0]?.id || null
  );
  const [is3D, setIs3D] = useState(false);

  // Sync selected stop when day changes
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
    return Number((dist * 1.25).toFixed(1));
  }, [day.stops]);

  const activeStop = day.stops.find((s) => s.id === selectedStopId) || day.stops[0];

  // Helper to fit map camera to all day stops
  const fitToStops = useCallback((immediate = false) => {
    const map = mapRef.current;
    if (!map || day.stops.length === 0) return;

    if (day.stops.length === 1) {
      map.flyTo({
        center: [day.stops[0].coordinates.longitude, day.stops[0].coordinates.latitude],
        zoom: 14,
        pitch: is3D ? 45 : 0,
        duration: immediate ? 0 : 600,
        essential: true,
      });
      return;
    }

    const bounds = new LngLatBounds();
    day.stops.forEach((s) => {
      bounds.extend([s.coordinates.longitude, s.coordinates.latitude]);
    });

    map.fitBounds(bounds, {
      padding: { top: 55, bottom: 85, left: 55, right: 55 },
      maxZoom: 15,
      pitch: is3D ? 45 : 0,
      duration: immediate ? 0 : 800,
    });
  }, [day.stops, is3D]);

  // Update or render GeoJSON route polyline
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
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      ],
    };

    const source = map.getSource('day-route-source') as GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    } else {
      map.addSource('day-route-source', {
        type: 'geojson',
        data: geojson,
      });

      // Outer Casing line
      map.addLayer({
        id: 'day-route-casing',
        type: 'line',
        source: 'day-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 7,
          'line-opacity': 0.85,
        },
      });

      // Inner Themed Route Line
      map.addLayer({
        id: 'day-route-line',
        type: 'line',
        source: 'day-route-source',
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
    }

    if (map.getLayer('day-route-line')) {
      map.setPaintProperty('day-route-line', 'line-color', day.themeColor || '#2563EB');
    }
  }, [day.stops, day.themeColor]);

  // Render HTML markers for stops
  const renderMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Create custom styled Terraink numbered markers
    day.stops.forEach((stop, index) => {
      const isCurrentSelected = stop.id === selectedStopId;
      const el = document.createElement('div');
      el.className = `terraink-pin ${isCurrentSelected ? 'active' : ''}`;
      el.style.backgroundColor = day.themeColor || '#2563EB';
      el.innerHTML = `
        <span class="terraink-pin-num">${index + 1}</span>
        ${isCurrentSelected ? '<div class="terraink-pin-pulse"></div>' : ''}
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedStopId(stop.id);
        onSelectStop(stop);
        map.flyTo({
          center: [stop.coordinates.longitude, stop.coordinates.latitude],
          zoom: Math.max(map.getZoom(), 14.5),
          pitch: is3D ? 45 : 0,
          duration: 700,
        });
      });

      const marker = new Marker({ element: el })
        .setLngLat([stop.coordinates.longitude, stop.coordinates.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [day.stops, day.themeColor, selectedStopId, onSelectStop, is3D]);

  // 1. Initialize MapLibre GL instance (Terraink Cartographic Engine)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const selectedStyleObj =
        TERRAINK_STYLES.find((s) => s.id === currentStyle) || TERRAINK_STYLES[0];

      const initialCenter: [number, number] =
        day.stops.length > 0
          ? [day.stops[0].coordinates.longitude, day.stops[0].coordinates.latitude]
          : [139.7005, 35.6895]; // Tokyo center

      const map = new MapLibreMap({
        container: mapContainerRef.current,
        style: selectedStyleObj.url,
        center: initialCenter,
        zoom: 12.5,
        pitch: is3D ? 45 : 0,
        attributionControl: false,
      });

      map.addControl(
        new NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true,
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
        console.warn('Terraink MapLibre event notice:', e);
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
  }, [currentStyle]);

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

  // Toggle 3D Perspective Pitch
  const handleToggle3D = () => {
    const map = mapRef.current;
    const next3D = !is3D;
    setIs3D(next3D);
    if (map) {
      map.easeTo({
        pitch: next3D ? 45 : 0,
        duration: 600,
      });
    }
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
      pitch: is3D ? 45 : 0,
      duration: 700,
    });
  };

  return (
    <div className="map-view-card">
      {/* Top Map Action Bar */}
      <div className="map-toolbar">
        <div className="map-metrics">
          <div className="map-title-row">
            <span className="map-day-indicator" style={{ backgroundColor: day.themeColor }} />
            <h3 className="map-title">Day {day.dayNumber} Route Map</h3>
            <span className="terraink-engine-badge" title="Powered by Terraink + MapLibre GL OpenFreeMap Vector Tiles">
              Terraink Map
            </span>
          </div>
          <p className="map-subtitle">
            {day.stops.length} stops · {totalDistanceKm} km total sequence
          </p>
        </div>

        {/* 1-Click Route Optimizer Button */}
        <div className="map-toolbar-actions">
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

      {/* Terraink Cartographic Style & Perspective Controls Strip */}
      <div className="terraink-controls-strip">
        <div className="style-selector-group">
          <Layers size={13} className="text-slate" />
          {TERRAINK_STYLES.map((style) => (
            <button
              key={style.id}
              className={`style-pill-btn ${currentStyle === style.id ? 'active' : ''}`}
              onClick={() => setCurrentStyle(style.id)}
            >
              {style.name}
            </button>
          ))}
        </div>

        <div className="view-mode-group">
          <button
            className={`view-mode-btn ${is3D ? 'active' : ''}`}
            onClick={handleToggle3D}
            title="Toggle 3D Perspective Pitch"
          >
            <Compass size={13} />
            <span>{is3D ? '3D Tilt' : '2D Plan'}</span>
          </button>
          <button
            className="view-mode-btn"
            onClick={() => fitToStops(false)}
            title="Recenter and fit all day stops"
          >
            <Maximize2 size={13} />
            <span>Fit Stops</span>
          </button>
        </div>
      </div>

      {/* MapLibre GL Container with Terraink Viewport */}
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

      {/* Selected Stop Floating Dock */}
      {activeStop && (
        <div className="map-selected-dock">
          <div className="dock-badge" style={{ backgroundColor: day.themeColor }}>
            {day.stops.findIndex((s) => s.id === activeStop.id) + 1}
          </div>
          <div className="dock-details">
            <div className="dock-time">{activeStop.startTime}</div>
            <div className="dock-title">{activeStop.title}</div>
            <div className="dock-address">{activeStop.address}</div>
          </div>
          <div className="dock-actions">
            <button
              className="dock-focus-btn"
              onClick={() => handleFocusStop(activeStop)}
              title="Focus map camera on this stop"
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
