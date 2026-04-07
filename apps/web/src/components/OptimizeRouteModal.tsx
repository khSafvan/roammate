import React from 'react';
import {
  CheckCircle2,
  Clock,
  TrendingDown,
  X,
  Zap,
} from 'lucide-react';
import { RouteOptimizationPreview } from '../hooks/useTripOptimization';

interface OptimizeRouteModalProps {
  preview: RouteOptimizationPreview | null;
  themeColor: string;
  onApply: () => void;
  onClose: () => void;
}

export const OptimizeRouteModal: React.FC<OptimizeRouteModalProps> = ({
  preview,
  themeColor,
  onApply,
  onClose,
}) => {
  if (!preview) return null;

  const pctSaved =
    preview.originalTransitMinutes > 0
      ? Math.round((preview.minutesSaved / preview.originalTransitMinutes) * 100)
      : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div
              className="stop-badge-lg"
              style={{ backgroundColor: themeColor || '#3B82F6' }}
            >
              <Zap size={18} />
            </div>
            <div>
              <h2 className="modal-title">Route Optimization (Day {preview.dayNumber})</h2>
              <p className="modal-subtitle">
                2-opt Traveling Salesperson comparison powered by Rust WASM
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ALREADY OPTIMAL CASE */}
        {preview.isAlreadyOptimal ? (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-lg, 16px)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: '0 0 6px' }}>
              Your route is already optimal!
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', margin: '0 0 20px' }}>
              The current stop sequence for Day {preview.dayNumber} already minimizes travel time and road transit distance. No changes needed.
            </p>
            <button className="primary-modal-btn" onClick={onClose} style={{ width: '100%' }}>
              Keep Current Route
            </button>
          </div>
        ) : (
          /* OPTIMIZATION PROMPT & METRICS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Savings Hero Banner */}
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#059669',
                    letterSpacing: '0.05em',
                  }}
                >
                  Estimated Savings
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingDown size={22} />
                  <span>{preview.minutesSaved} mins faster</span>
                </div>
                <div style={{ fontSize: '12px', color: '#065F46', marginTop: '2px' }}>
                  {pctSaved > 0 && <span>{pctSaved}% less transit time · </span>}
                  <span>{(preview.originalDistanceKm - preview.optimizedDistanceKm).toFixed(1)} km shorter</span>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                <div>
                  Transit:{' '}
                  <span style={{ textDecoration: 'line-through' }}>
                    {preview.originalTransitMinutes}m
                  </span>{' '}
                  ➔ <strong style={{ color: '#047857' }}>{preview.optimizedTransitMinutes}m</strong>
                </div>
                <div>
                  Distance:{' '}
                  <span style={{ textDecoration: 'line-through' }}>
                    {preview.originalDistanceKm.toFixed(1)}km
                  </span>{' '}
                  ➔ <strong style={{ color: '#047857' }}>{preview.optimizedDistanceKm.toFixed(1)}km</strong>
                </div>
              </div>
            </div>

            {/* Sequence Comparison */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary, #64748b)',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Proposed New Itinerary Sequence:</span>
                <span>Recalculated Times</span>
              </div>

              <div
                style={{
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {preview.optimizedStops.map((stop, idx) => {
                  const originalIdx = preview.originalStops.findIndex((s) => s.id === stop.id);
                  const orderChanged = originalIdx !== idx;

                  return (
                    <div
                      key={stop.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderBottom:
                          idx < preview.optimizedStops.length - 1
                            ? '1px solid var(--border-light, #f1f5f9)'
                            : 'none',
                        backgroundColor: orderChanged
                          ? 'rgba(59, 130, 246, 0.04)'
                          : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: 'var(--radius-sm, 8px)',
                            backgroundColor: orderChanged ? '#3B82F6' : '#64748B',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                            {stop.title}
                          </div>
                          {orderChanged && (
                            <div style={{ fontSize: '10px', color: '#2563EB' }}>
                              Moved from stop #{originalIdx + 1}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary, #64748b)' }}>
                        <Clock size={12} />
                        <span>{stop.startTime}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Replacement Confirmation Prompt */}
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary, #475569)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Replace your current Day {preview.dayNumber} route with this optimized sequence? You can undo this anytime.
            </p>

            {/* Action Buttons */}
            <div className="modal-actions-row">
              <button
                type="button"
                className="secondary-action-btn flex-1"
                onClick={onClose}
              >
                Keep Current Route
              </button>
              <button
                type="button"
                className="primary-modal-btn flex-1"
                onClick={onApply}
              >
                <Zap size={15} />
                <span>Apply Optimized Route</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
