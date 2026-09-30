import React from 'react';
import { Hotel, Lock, Pin } from 'lucide-react';
import { DayHotelAnchor } from '@mojolog/core';

export interface AnchorLocationCardProps {
  anchor: DayHotelAnchor;
  type: 'start' | 'end';
  onNavigateToStay?: () => void;
}

export const AnchorLocationCard: React.FC<AnchorLocationCardProps> = ({
  anchor,
  type,
  onNavigateToStay,
}) => {
  const isStart = type === 'start';
  const isCheckOut = anchor.action === 'check_out';
  const isCheckIn = anchor.action === 'check_in';

  // Semantic theme colors matching the modernized palette
  const accentColor = isCheckOut
    ? '#EA580C' // Terracotta for check-out
    : isCheckIn
    ? '#059669' // Alpine Emerald for check-in
    : '#2563EB'; // Cobalt Blue for standard start/end base

  const bgTint = isCheckOut
    ? 'rgba(234, 88, 12, 0.05)'
    : isCheckIn
    ? 'rgba(5, 150, 105, 0.05)'
    : 'rgba(37, 99, 235, 0.05)';

  const borderStroke = isCheckOut
    ? 'rgba(234, 88, 12, 0.20)'
    : isCheckIn
    ? 'rgba(5, 150, 105, 0.20)'
    : 'rgba(37, 99, 235, 0.20)';

  const labelText = isStart
    ? isCheckOut
      ? 'Check-out · Starting Base'
      : 'Fixed Starting Base'
    : isCheckIn
    ? 'Check-in · Return Base'
    : 'Fixed Return Base';

  return (
    <div
      className={`stay-base-banner day-anchor-banner ${isStart ? 'start-anchor' : 'end-anchor'}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: bgTint,
        border: `1px solid ${borderStroke}`,
        borderRadius: 'var(--radius-xl, 16px)',
        padding: '14px 18px',
        marginTop: isStart ? '12px' : '16px',
        marginBottom: '16px',
        gap: '12px',
        userSelect: 'none',
      }}
    >
      <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
        {/* Anchor Icon Badge */}
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Hotel size={18} />
        </div>

        {/* Anchor Info */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {anchor.title}
            </span>

            {/* Fixed Anchor Badge */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                color: accentColor,
                border: `1px solid ${borderStroke}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {isStart ? <Pin size={10} /> : <Lock size={10} />}
              <span>{labelText}</span>
            </span>

            {/* Non-draggable Pill */}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-subtle, #f1f5f9)',
                color: 'var(--text-tertiary, #64748b)',
              }}
            >
              Fixed Pin
            </span>
          </div>

          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              margin: '3px 0 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {anchor.time && <strong>{anchor.time} · </strong>}
            {anchor.address || (isStart ? 'Starting Accommodation Base' : 'Evening Hotel Return Base')}
          </p>
        </div>
      </div>

      {onNavigateToStay && (
        <button
          type="button"
          className="timeline-action-pill"
          onClick={onNavigateToStay}
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            borderRadius: '9999px',
            flexShrink: 0,
            cursor: 'pointer',
          }}
          title="View Hotel Booking & Details"
        >
          <span>Hotel Stay</span>
        </button>
      )}
    </div>
  );
};
