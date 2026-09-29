import React, { useState } from 'react';
import { Clock, QrCode, Ticket, Users, X } from 'lucide-react';
import { BookingDocument } from '../types/trip';

interface TimelineActivityTicketCardProps {
  tickets: BookingDocument[];
  onViewBookingsTab: () => void;
}

export const TimelineActivityTicketCard: React.FC<TimelineActivityTicketCardProps> = ({
  tickets,
  onViewBookingsTab,
}) => {
  const [selectedQrTicket, setSelectedQrTicket] = useState<BookingDocument | null>(null);

  if (!tickets || tickets.length === 0) return null;

  return (
    <>
      <div className="timeline-item-wrapper timeline-ticket-item" style={{ marginBottom: '14px' }}>
        <div
          className="timeline-card"
          style={{
            borderLeft: '4px solid #EC4899',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius-card, 12px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            padding: '14px 16px',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderLeftWidth: '4px',
            borderLeftColor: '#EC4899',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(236, 72, 153, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#db2777',
                flexShrink: 0,
              }}
            >
              <Ticket size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(236, 72, 153, 0.12)',
                      color: '#db2777',
                    }}
                  >
                    🎟️ Booked Activity / Passes ({tickets.length})
                  </span>
                </div>
                <button
                  type="button"
                  className="timeline-action-pill"
                  onClick={onViewBookingsTab}
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  <span>Open Bookings Hub</span>
                </button>
              </div>

              {tickets.map((t) => (
                <div
                  key={t.id}
                  style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px dashed var(--border-light, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t.title}
                    </div>
                    {t.subtitle && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {t.subtitle}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {t.time && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <Clock size={12} className="text-pink" />
                          <span>Entry: {t.time}</span>
                        </span>
                      )}
                      {t.passengerOrGuestName && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} />
                          <span>{t.passengerOrGuestName}</span>
                        </span>
                      )}
                      {t.confirmationCode && (
                        <span
                          style={{
                            fontFamily: 'monospace',
                            backgroundColor: 'var(--bg-subtle, #f1f5f9)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          #{t.confirmationCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setSelectedQrTicket(t)}
                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-light)' }}
                      title="Show Digital Voucher / QR"
                      aria-label="Show Digital Voucher or QR Code"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QR / Voucher Modal */}
      {selectedQrTicket && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setSelectedQrTicket(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              maxWidth: '360px',
              width: '100%',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Digital Pass / Voucher
              </span>
              <button
                type="button"
                onClick={() => setSelectedQrTicket(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {selectedQrTicket.title}
            </div>
            {selectedQrTicket.time && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Slot: {selectedQrTicket.time} · {selectedQrTicket.date}
              </div>
            )}

            {/* QR Mock Rendering */}
            <div
              style={{
                width: '180px',
                height: '180px',
                margin: '0 auto 16px',
                backgroundColor: '#ffffff',
                border: '2px solid var(--border-light, #e2e8f0)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
            >
              <QrCode size={120} color="#0f172a" />
              <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, marginTop: '8px', color: '#0f172a' }}>
                {selectedQrTicket.confirmationCode || selectedQrTicket.id}
              </span>
            </div>

            {selectedQrTicket.passengerOrGuestName && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0' }}>
                Guest: <strong>{selectedQrTicket.passengerOrGuestName}</strong>
              </p>
            )}

            <button
              type="button"
              className="primary-action-btn"
              onClick={() => setSelectedQrTicket(null)}
              style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
