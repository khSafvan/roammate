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
      return <Footprints size={12} strokeWidth={1.75} />;
    case 'transit':
      return <TrainFront size={12} strokeWidth={1.75} />;
    case 'drive':
    default:
      return <Car size={12} strokeWidth={1.75} />;
  }
};

export const DistancePill = React.memo<DistancePillProps>(function DistancePill({
  leg,
  onToggleMode,
}) {
  const isOutlier = leg.isOutlier;

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="distance-connector-track">
      <div className="track-spine-node">
        <div className="track-spine-dash" />
      </div>

      <button
        className={`distance-pill-btn ${isOutlier ? 'outlier' : ''}`}
        onClick={() => onToggleMode(leg)}
        title="Toggle transit mode: Drive / Walk / Transit"
      >
        <span className="mode-icon">{getModeIcon(leg.mode)}</span>
        <span className="distance-text tabular">
          {formatDuration(leg.durationMinutes)} · {leg.distanceKm} km
        </span>

        {isOutlier && (
          <span className="outlier-alert">
            <AlertCircle size={10} strokeWidth={1.75} />
            <span>Transit buffer</span>
          </span>
        )}

        <span className="mode-tag">{leg.mode}</span>
      </button>
    </div>
  );
});
