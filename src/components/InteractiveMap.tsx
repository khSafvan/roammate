import React, { useMemo, useState } from 'react';
import { ExternalLink, Navigation, Sparkles, Zap } from 'lucide-react';
import { ItineraryStop, TripDay } from '../types/trip';
import { computeDistanceKm } from '../wasm/engine';

interface InteractiveMapProps {
  day: TripDay;
  onSelectStop: (stop: ItineraryStop) => void;
  onOptimizeDay: () => void;
  isOptimized: boolean;
}

const CANVAS_WIDTH = 680;
const CANVAS_HEIGHT = 580;
const PADDING = 60;

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  day,
  onSelectStop,
  onOptimizeDay,
  isOptimized,
}) => {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    day.stops[0]?.id || null
  );

  // Compute projection and total route distance
  const { projectedStops, pathString, totalDistanceKm } = useMemo(() => {
    if (day.stops.length === 0) {
      return { projectedStops: [], pathString: '', totalDistanceKm: 0 };
    }

    const lats = day.stops.map((s) => s.coordinates.latitude);
    const lngs = day.stops.map((s) => s.coordinates.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = maxLat - minLat || 0.01;
    const lngSpan = maxLng - minLng || 0.01;

    let totalDist = 0;
    for (let i = 0; i < day.stops.length - 1; i++) {
      totalDist += computeDistanceKm(
        day.stops[i].coordinates.latitude,
        day.stops[i].coordinates.longitude,
        day.stops[i + 1].coordinates.latitude,
        day.stops[i + 1].coordinates.longitude
      );
    }

    const projected = day.stops.map((stop) => {
      const xNorm = (stop.coordinates.longitude - minLng) / lngSpan;
      const yNorm = 1 - (stop.coordinates.latitude - minLat) / latSpan;

      const x = PADDING + xNorm * (CANVAS_WIDTH - PADDING * 2);
      const y = PADDING + yNorm * (CANVAS_HEIGHT - PADDING * 2);

      return {
        ...stop,
        x: Math.round(x),
        y: Math.round(y),
      };
    });

    let path = '';
    projected.forEach((pt, index) => {
      if (index === 0) {
        path += `M ${pt.x} ${pt.y}`;
      } else {
        path += ` L ${pt.x} ${pt.y}`;
      }
    });

    return {
      projectedStops: projected,
      pathString: path,
      totalDistanceKm: Number((totalDist * 1.25).toFixed(1)),
    };
  }, [day.stops]);

  const activeStop = day.stops.find((s) => s.id === selectedStopId) || day.stops[0];

  const handleOpenGoogleMaps = (stop: ItineraryStop) => {
    const q = encodeURIComponent(`${stop.title}, ${stop.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  return (
    <div className="map-view-card">
      {/* Top Map Action Bar */}
      <div className="map-toolbar">
        <div className="map-metrics">
          <div className="map-title-row">
            <span className="map-day-indicator" style={{ backgroundColor: day.themeColor }} />
            <h3 className="map-title">Day {day.dayNumber} Route Map</h3>
          </div>
          <p className="map-subtitle">
            {day.stops.length} stops · {totalDistanceKm} km total sequence
          </p>
        </div>

        {/* 1-Click Route Optimizer Button */}
        <button
          className={`optimize-route-btn ${isOptimized ? 'optimized' : ''}`}
          onClick={onOptimizeDay}
          title="Optimize intermediate stop sequence using Rust WebAssembly 2-opt TSP engine"
        >
          {isOptimized ? <Zap size={15} /> : <Sparkles size={15} />}
          <span>{isOptimized ? 'Route Optimized' : '1-Click Optimize (WASM)'}</span>
        </button>
      </div>

      {/* SVG Vector Map Canvas */}
      <div className="map-canvas-container">
        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="map-svg-viewport"
        >
          {/* Map Base Background */}
          <rect
            x="0"
            y="0"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill="#F8FAFC"
            rx="16"
          />

          {/* Grid lines simulating map topography */}
          {[1, 2, 3, 4, 5].map((i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={(CANVAS_HEIGHT / 6) * i}
              x2={CANVAS_WIDTH}
              y2={(CANVAS_HEIGHT / 6) * i}
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
          {[1, 2, 3, 4, 5].map((i) => (
            <line
              key={`v-${i}`}
              x1={(CANVAS_WIDTH / 6) * i}
              y1="0"
              x2={(CANVAS_WIDTH / 6) * i}
              y2={CANVAS_HEIGHT}
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Route Polylines */}
          {pathString && (
            <>
              {/* Outer soft glow halo */}
              <path
                d={pathString}
                stroke={day.themeColor}
                strokeWidth="7"
                strokeOpacity="0.25"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Main solid route line */}
              <path
                d={pathString}
                stroke={day.themeColor}
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Map Pins */}
          {projectedStops.map((stop) => {
            const isSelected = stop.id === selectedStopId;
            return (
              <g
                key={stop.id}
                className="map-pin-group"
                onClick={() => {
                  setSelectedStopId(stop.id);
                  onSelectStop(stop);
                }}
              >
                {/* Active selection outer ripple */}
                {isSelected && (
                  <circle
                    cx={stop.x}
                    cy={stop.y}
                    r="24"
                    fill={day.themeColor}
                    fillOpacity="0.2"
                    className="pin-pulse"
                  />
                )}

                {/* Base Pin Circle */}
                <circle
                  cx={stop.x}
                  cy={stop.y}
                  r="15"
                  fill={day.themeColor}
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  className="pin-core"
                />

                {/* Stop Order Number */}
                <text
                  x={stop.x}
                  y={stop.y + 5}
                  fill="#FFFFFF"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pin-label-text"
                >
                  {stop.orderIndex}
                </text>

                {/* Stop Title Tooltip Pill on Map */}
                <g transform={`translate(${stop.x + 20}, ${stop.y - 12})`}>
                  <rect
                    x="0"
                    y="0"
                    width={stop.title.length * 7 + 16}
                    height="24"
                    rx="12"
                    fill="#0F172A"
                    fillOpacity="0.88"
                  />
                  <text
                    x="8"
                    y="16"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {stop.title}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Stop Quick Bar */}
      {activeStop && (
        <div className="map-selected-dock">
          <div
            className="dock-badge"
            style={{ backgroundColor: day.themeColor }}
          >
            {activeStop.orderIndex}
          </div>
          <div className="dock-details">
            <div className="dock-time">{activeStop.startTime}</div>
            <div className="dock-title">{activeStop.title}</div>
            <div className="dock-address">{activeStop.address}</div>
          </div>
          <div className="dock-actions">
            <button
              className="dock-nav-btn"
              onClick={() => handleOpenGoogleMaps(activeStop)}
              title="Open in Google Maps"
            >
              <Navigation size={14} />
              <span>Navigate</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
