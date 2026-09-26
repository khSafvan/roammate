import React from 'react';
import { AlertCircle, AlertTriangle, Car, Footprints, TrainFront } from 'lucide-react';
import { TransitLeg, TransitMode } from '../types/trip';
import { ScheduleConflict } from '../utils/scheduleConflicts';

interface DistancePillProps {
  leg: TransitLeg;
  onToggleMode: (leg: TransitLeg) => void;
  conflict?: ScheduleConflict | null;
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
  conflict,
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

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <button
          className={`distance-pill-btn ${isOutlier || conflict ? 'outlier' : ''}`}
          onClick={() => onToggleMode(leg)}
          title="Toggle transit mode: Drive / Walk / Transit"
          style={
            conflict
              ? {
                  borderColor: 'var(--brand-rose)',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                }
              : undefined
          }
        >
          <span className="mode-icon">{getModeIcon(leg.mode)}</span>
          <span className="distance-text tabular">
            {formatDuration(leg.durationMinutes)} · {leg.distanceKm} km
          </span>

          {isOutlier && !conflict && (
            <span className="outlier-alert">
              <AlertCircle size={10} strokeWidth={1.75} />
              <span>Transit buffer</span>
            </span>
          )}

          <span className="mode-tag">{leg.mode}</span>
        </button>

        {conflict && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--brand-rose)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '20px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 600,
            }}
            title={`Transit delay: leaves ${conflict.departureTime} + ${leg.durationMinutes}m transit = arrives ${conflict.expectedArrival} (${conflict.conflictMins}m after scheduled ${conflict.scheduledStart})`}
          >
            <AlertTriangle size={11} strokeWidth={2} />
            <span>Late by {conflict.conflictMins}m</span>
          </span>
        )}
      </div>
    </div>
  );
});
