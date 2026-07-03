import React from 'react';
import { BedDouble, ExternalLink, Lock, MapPin, Pin } from 'lucide-react';
import { DayHotelAnchor } from '@mojolog/core';

export interface DayBaseAnchorsProps {
  startAnchor?: DayHotelAnchor | null;
  endAnchor?: DayHotelAnchor | null;
  effectiveStay?: {
    stay: {
      id: string;
      title: string;
      address?: string;
      location?: string;
      coordinates?: { latitude: number; longitude: number };
      confirmationCode?: string;
      roomType?: string;
    };
    isInherited: boolean;
    status?: 'check_in' | 'staying' | 'check_out';
  } | null;
  onNavigateToStay?: () => void;
  onOpenAddLodging?: () => void;
}

export const DayBaseAnchors: React.FC<DayBaseAnchorsProps> = ({
  startAnchor,
  endAnchor,
  effectiveStay,
  onNavigateToStay,
  onOpenAddLodging,
}) => {
  // If neither anchor nor stay exists, nothing to show
  if (!startAnchor && !endAnchor && !effectiveStay) {
    return null;
  }

  const effectiveStart: DayHotelAnchor | null = startAnchor
    ? startAnchor
    : effectiveStay
    ? {
        id: effectiveStay.stay.id,
        title: effectiveStay.stay.title,
        address: effectiveStay.stay.location || effectiveStay.stay.address || '',
        time: undefined,
        action: effectiveStay.isInherited ? 'depart' : 'check_in',
        label: effectiveStay.stay.title,
      }
    : null;

  return (
    <div className="day-base-anchors-container" aria-label="Daily Fixed Base Locations">
      {/* Starting Base Pin */}
      {effectiveStart && (
        <div className="day-base-anchor-card">
          <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                color: 'var(--brand-blue, #2563EB)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BedDouble size={16} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {effectiveStart.title}
                </span>

                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--brand-blue, #2563EB)',
                    border: '1px solid rgba(37, 99, 235, 0.22)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Pin size={10} />
                  <span>
                    {effectiveStart.action === 'check_out'
                      ? 'Check-out · Starting Base'
                      : 'Fixed Starting Base'}
                  </span>
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <MapPin size={11} className="text-tertiary" />
                <span>
                  {effectiveStart.time ? `${effectiveStart.time} · ` : ''}
                  {effectiveStart.address || 'Starting Accommodation Base'}
                </span>
              </div>
            </div>
          </div>

          {(onNavigateToStay || onOpenAddLodging) && (
            <button
              type="button"
              className="icon-btn"
              style={{ width: '28px', height: '28px', flexShrink: 0 }}
              onClick={onNavigateToStay || onOpenAddLodging}
              title="View Stay Booking"
              aria-label="View Stay Booking"
            >
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      )}

      {/* Return/Ending Base Pin */}
      {endAnchor && (
        <div className="day-base-anchor-card">
          <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                color: 'var(--brand-emerald, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BedDouble size={16} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {endAnchor.title}
                </span>

                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    color: 'var(--brand-emerald, #059669)',
                    border: '1px solid rgba(16, 185, 129, 0.22)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Lock size={10} />
                  <span>
                    {endAnchor.action === 'check_in'
                      ? 'Check-in · Return Base'
                      : 'Fixed Return Base'}
                  </span>
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <MapPin size={11} className="text-tertiary" />
                <span>
                  {endAnchor.time ? `${endAnchor.time} · ` : ''}
                  {endAnchor.address || 'Evening Hotel Return Base'}
                </span>
              </div>
            </div>
          </div>

          {onNavigateToStay && (
            <button
              type="button"
              className="icon-btn"
              style={{ width: '28px', height: '28px', flexShrink: 0 }}
              onClick={onNavigateToStay}
              title="View Stay Booking"
              aria-label="View Stay Booking"
            >
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
