import React from 'react';
import { AlertCircle, Car, Footprints, TrainFront } from 'lucide-react';
import { TransitLeg, TransitMode } from '../types/trip';

interface DistancePillProps {
  leg: TransitLeg;
  onToggleMode: (leg: TransitLeg) => void;
}

const getModeIcon = (mode: TransitMode) => {
  switch (mode) {
    case 'walk':
      return <Footprints size={13} />;
    case 'transit':
      return <TrainFront size={13} />;
    case 'drive':
    default:
      return <Car size={13} />;
  }
};

export const DistancePill = React.memo<DistancePillProps>(function DistancePill({
  leg,
  onToggleMode,
}) {
  const isOutlier = leg.isOutlier;

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="distance-connector-track">
      <div className="track-line" />

      <button
        className={`distance-pill-btn ${isOutlier ? 'outlier' : ''}`}
        onClick={() => onToggleMode(leg)}
        title="Click to switch transport mode (Drive / Walk / Transit)"
      >
        <span className="mode-icon">{getModeIcon(leg.mode)}</span>
        <span className="distance-text">
          {formatDuration(leg.durationMinutes)} · {leg.distanceKm} km
        </span>

        {isOutlier && (
          <span className="outlier-alert">
            <AlertCircle size={12} />
            <span>Long Leg</span>
          </span>
        )}

        <span className="mode-tag">{leg.mode}</span>
      </button>

      <div className="track-line" />
    </div>
  );
});
