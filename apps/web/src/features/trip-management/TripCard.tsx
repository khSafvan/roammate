import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Plane,
  Settings,
  Share2,
  Ticket,
  Trash2,
} from 'lucide-react';
import { Trip } from '../../types/trip';
import { Button } from '../../components/ui/Button';

export interface TripCardProps {
  trip: Trip;
  isActive: boolean;
  canDelete: boolean;
  isDeleteConfirming: boolean;
  onSelectTrip: (tripId: string) => void;
  onOpenSettings: (tripId: string) => void;
  onShareTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onToggleDeleteConfirm: (tripId: string | null) => void;
}

export const TripCard: React.FC<TripCardProps> = ({
  trip,
  isActive,
  canDelete,
  isDeleteConfirming,
  onSelectTrip,
  onOpenSettings,
  onShareTrip,
  onDeleteTrip,
  onToggleDeleteConfirm,
}) => {
  const totalStops = (trip.days || []).reduce((acc, d) => acc + (d.stops?.length || 0), 0);
  const totalReservations = (trip.flights?.length || 0) + (trip.documents?.length || 0);

  return (
    <div className={`trip-card-root ${isActive ? 'is-active-trip' : ''}`}>
      <div className="trip-card-body">
        {/* Header */}
        <div className="trip-card-header">
          <div className="trip-card-header-main">
            <div className="flex items-center gap-2">
              <span className="trip-destination-pill">
                <MapPin size={11} />
                <span>{trip.destination}</span>
              </span>
              {isActive && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--brand-blue, #10B981)',
                    border: '1px solid rgba(37, 99, 235, 0.22)',
                  }}
                >
                  Active
                </span>
              )}
            </div>
            <h2 className="trip-card-heading">{trip.title}</h2>
          </div>

          <div className="trip-readiness-pill">
            <CheckCircle2 size={13} className="text-emerald" />
            <span className="tabular">{trip.readinessScore}%</span>
          </div>
        </div>

        {/* Dates & Times */}
        <div className="trip-card-meta-row">
          <div className="trip-meta-item">
            <Calendar size={13} className="text-slate" />
            <span>{trip.dates || 'Dates not set'}</span>
            {(trip.days?.length || 0) > 0 && (
              <span className="days-count-pill">{trip.days.length}d</span>
            )}
          </div>

          {trip.startTime && trip.endTime && (
            <div className="trip-meta-item">
              <Clock size={12} className="text-slate" />
              <span>
                {trip.startTime} – {trip.endTime}
              </span>
            </div>
          )}
        </div>

        {/* Metrics Pills */}
        <div className="trip-card-metrics-strip">
          <span className="metric-tag">
            <strong>{totalStops}</strong> stops
          </span>
          <span className="metric-tag">
            <Plane size={11} />
            <strong>{trip.flights?.length || 0}</strong> flights
          </span>
          {totalReservations > (trip.flights?.length || 0) && (
            <span className="metric-tag">
              <Ticket size={11} />
              <strong>{totalReservations}</strong> vouchers
            </span>
          )}
          <span className="metric-tag currency font-mono">
            {trip.baseCurrency || 'USD'}
          </span>
        </div>

        {/* Delete confirmation if active */}
        {isDeleteConfirming && (
          <div className="trip-card-delete-prompt">
            <span>Delete this trip permanently?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cancel-delete-btn"
                onClick={() => onToggleDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-delete-btn"
                onClick={() => {
                  onDeleteTrip(trip.id);
                  onToggleDeleteConfirm(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="trip-card-actions-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
          <Button
            type="button"
            variant="primary"
            onClick={() => onSelectTrip(trip.id)}
            title="Open trip itinerary and spatial route map"
          >
            <span>Open Journey</span>
            <span className="arrow-glyph" style={{ marginLeft: '8px' }}>→</span>
          </Button>

          <div className="trip-card-secondary-btns" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              style={{ padding: '8px' }}
              onClick={() => onOpenSettings(trip.id)}
              title="Edit Trip Settings & Schedule"
              aria-label="Edit Trip Settings"
            >
              <Settings size={15} />
            </Button>

            <Button
              type="button"
              variant="secondary"
              style={{ padding: '8px' }}
              onClick={() => onShareTrip(trip)}
              title="Export or Backup Trip"
              aria-label="Export or Backup Trip"
            >
              <Share2 size={15} />
            </Button>

            {canDelete && (
              <Button
                type="button"
                variant="secondary"
                style={{ padding: '8px', color: '#ef4444' }}
                onClick={() =>
                  onToggleDeleteConfirm(isDeleteConfirming ? null : trip.id)
                }
                title="Delete Trip"
                aria-label="Delete Trip"
              >
                <Trash2 size={15} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
