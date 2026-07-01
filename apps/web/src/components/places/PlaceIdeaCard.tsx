import React from 'react';
import { Calendar, Edit2, MapPin, Trash2 } from 'lucide-react';
import { ItineraryStop, StopCategory, TripDay } from '../../types/trip';

export interface PlaceIdeaCardProps {
  place: ItineraryStop;
  days: TripDay[];
  onEdit: (place: ItineraryStop) => void;
  onDelete: (placeId: string) => void;
  onAssignToDay: (placeId: string, dayIndex: number) => void;
}

const CATEGORY_COLORS: Record<StopCategory, string> = {
  sight: 'var(--cat-sight, #2563EB)',
  dining: 'var(--cat-dining, #EA580C)',
  lodging: 'var(--cat-lodging, #7C3AED)',
  transit: 'var(--cat-transit, #059669)',
  flight: 'var(--cat-flight, #0284C7)',
  note: 'var(--cat-note, #D97706)',
};

const CATEGORY_LABELS: Record<StopCategory, string> = {
  sight: 'Sight & Attraction',
  dining: 'Food & Dining',
  lodging: 'Hotel & Stay',
  transit: 'Transit',
  flight: 'Flight',
  note: 'Note & Tip',
};

export const PlaceIdeaCard: React.FC<PlaceIdeaCardProps> = ({
  place,
  days,
  onEdit,
  onDelete,
  onAssignToDay,
}) => {
  const catColor = CATEGORY_COLORS[place.category] || '#64748B';
  const catLabel = CATEGORY_LABELS[place.category] || place.category;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--border-light, rgba(15, 23, 42, 0.08))',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div>
        {/* Header: Category Badge & Edit/Delete */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-subtle, #f1f5f9)',
              color: catColor,
              border: `1px solid ${catColor}25`,
            }}
          >
            {catLabel}
          </span>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => onEdit(place)}
              title="Edit Idea"
              aria-label="Edit Idea"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--text-tertiary, #94a3b8)',
              }}
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(place.id)}
              title="Delete Idea"
              aria-label="Delete Idea"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--text-tertiary, #94a3b8)',
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Title & Subtitle */}
        <h4
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary, #0f172a)',
            margin: '0 0 4px',
          }}
        >
          {place.title}
        </h4>
        {place.subtitle && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #64748b)',
              margin: '0 0 6px',
            }}
          >
            {place.subtitle}
          </p>
        )}

        {/* Address */}
        {place.address && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--text-tertiary, #94a3b8)',
              marginBottom: '8px',
            }}
          >
            <MapPin size={11} style={{ flexShrink: 0 }} />
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {place.address}
            </span>
          </div>
        )}

        {/* Notes */}
        {place.notes && (
          <div
            style={{
              fontSize: '12px',
              backgroundColor: 'rgba(217, 119, 6, 0.05)',
              padding: '8px 10px',
              borderRadius: '8px',
              color: 'var(--text-secondary, #475569)',
              borderLeft: '3px solid var(--cat-note, #D97706)',
            }}
          >
            {place.notes}
          </div>
        )}
      </div>

      {/* Assign to Day Action */}
      <div
        style={{
          borderTop: '1px solid var(--border-light, #f1f5f9)',
          paddingTop: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--text-secondary, #64748b)',
          }}
        >
          <Calendar size={13} />
          <span>Assign:</span>
        </div>

        <select
          className="form-input"
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            width: 'auto',
            cursor: 'pointer',
          }}
          defaultValue=""
          aria-label="Assign to Day"
          onChange={(e) => {
            const idx = parseInt(e.target.value, 10);
            if (!isNaN(idx)) {
              onAssignToDay(place.id, idx);
            }
          }}
        >
          <option value="" disabled>
            Select Day...
          </option>
          {days.map((d, idx) => (
            <option key={d.id} value={idx}>
              Day {d.dayNumber} ({d.dateStr?.split(',')[1]?.trim() || d.dateStr || `Day ${idx + 1}`})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
