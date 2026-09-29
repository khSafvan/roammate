import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  Luggage,
  Sparkles,
  Square,
  User,
} from 'lucide-react';
import { Look, Trip } from '@mojolog/shared';

interface PackingViewProps {
  trip: Trip;
  looks: Look[];
  onUpdateLook: (look: Look) => void;
  onNavigateToDay?: (dayNumber: number) => void;
}

export const PackingView: React.FC<PackingViewProps> = ({
  trip,
  looks,
  onUpdateLook,
  onNavigateToDay,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unpacked' | 'packed'>('all');

  const person1Name = trip.travelers?.[0] || 'Person 1';
  const person2Name = trip.travelers?.[1] || 'Person 2';

  // Map of eventId -> { dayNumber, eventTitle }
  const eventLookup = useMemo(() => {
    const map = new Map<string, { dayNumber: number; title: string }>();
    trip.days.forEach((day) => {
      (day.stops || []).forEach((stop) => {
        map.set(stop.id, { dayNumber: day.dayNumber, title: stop.title });
      });
    });
    return map;
  }, [trip.days]);

  // Filtered looks
  const filteredLooks = useMemo(() => {
    if (filterMode === 'packed') return looks.filter((l) => l.packed);
    if (filterMode === 'unpacked') return looks.filter((l) => !l.packed);
    return looks;
  }, [looks, filterMode]);

  // Person 1 looks (where person 1 has an outfit configured)
  const p1Looks = useMemo(() => {
    return filteredLooks.filter((l) => l.person1Original || l.person1Cutout || l.person1Label);
  }, [filteredLooks]);

  // Person 2 looks (where person 2 has an outfit configured)
  const p2Looks = useMemo(() => {
    return filteredLooks.filter((l) => l.person2Original || l.person2Cutout || l.person2Label);
  }, [filteredLooks]);

  // Packing statistics
  const totalLooks = looks.length;
  const packedLooks = looks.filter((l) => l.packed).length;
  const packedPercent = totalLooks > 0 ? Math.round((packedLooks / totalLooks) * 100) : 0;

  const handleTogglePacked = (look: Look) => {
    onUpdateLook({
      ...look,
      packed: !look.packed,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="packing-view-root">
      {/* Packing Hub Hero Card */}
      <div className="packing-hero-card">
        <div className="packing-hero-header">
          <div className="packing-hero-title">
            <Luggage size={22} className="text-primary" />
            <span>Luggage &amp; Outfit Packing Hub</span>
          </div>

          <div className="packing-stats-strip">
            <span>
              <strong>{packedLooks}</strong> of <strong>{totalLooks}</strong> Looks Packed
            </span>
            <span>&bull;</span>
            <span>{packedPercent}% Prepared</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`slot-action-btn ${filterMode === 'all' ? 'active-toggle' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All ({totalLooks})
            </button>
            <button
              type="button"
              className={`slot-action-btn ${filterMode === 'unpacked' ? 'active-toggle' : ''}`}
              onClick={() => setFilterMode('unpacked')}
            >
              To Pack ({totalLooks - packedLooks})
            </button>
            <button
              type="button"
              className={`slot-action-btn ${filterMode === 'packed' ? 'active-toggle' : ''}`}
              onClick={() => setFilterMode('packed')}
            >
              Packed ({packedLooks})
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="packing-progress-bar-container">
          <div
            className="packing-progress-bar-fill"
            style={{ width: `${packedPercent}%` }}
          />
        </div>
      </div>

      {totalLooks === 0 ? (
        <div
          className="empty-state-box"
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            background: 'var(--color-bg-surface, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--color-border-subtle, #e2e8f0)',
          }}
        >
          <Sparkles size={32} style={{ color: '#6366f1', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
            No outfits planned yet
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
            Open your Itinerary timeline and tap the hanger icon on any stop or event to attach coordinated outfits!
          </p>
        </div>
      ) : (
        /* Two-Column Wardrobe Grid */
        <div className="packing-columns-grid">
          {/* Person 1 Column */}
          <div className="packing-column">
            <div className="packing-column-header">
              <div className="packing-column-title">
                <User size={16} className="text-primary" />
                <span>{person1Name}&apos;s Wardrobe</span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {p1Looks.length} item{p1Looks.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="packing-items-list">
              {p1Looks.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
                  No looks for {person1Name} under current filter.
                </p>
              ) : (
                p1Looks.map((l) => {
                  const ev = eventLookup.get(l.eventId);
                  const thumb = l.person1UseCutout
                    ? l.person1Cutout || l.person1Original
                    : l.person1Original;

                  return (
                    <div
                      key={`p1_${l.id}`}
                      className={`packing-item-card ${l.packed ? 'is-packed' : ''}`}
                    >
                      <button
                        type="button"
                        className="packed-checkbox-btn"
                        onClick={() => handleTogglePacked(l)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: l.packed ? '#10b981' : '#94a3b8',
                        }}
                        title={l.packed ? 'Mark unpacked' : 'Mark packed'}
                      >
                        {l.packed ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      {thumb && (
                        <img
                          src={thumb}
                          alt={l.person1Label || 'Outfit'}
                          className="packing-item-thumb"
                          loading="lazy"
                        />
                      )}

                      <div className="packing-item-info">
                        <div className="packing-item-label">
                          {l.person1Label || 'Coordinated Outfit'}
                        </div>
                        {ev && (
                          <div
                            className="packing-item-event"
                            style={{ cursor: onNavigateToDay ? 'pointer' : 'default' }}
                            onClick={() => onNavigateToDay?.(ev.dayNumber)}
                          >
                            <CalendarDays size={11} />
                            <span>
                              Day {ev.dayNumber} &bull; {ev.title}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Person 2 Column */}
          <div className="packing-column">
            <div className="packing-column-header">
              <div className="packing-column-title">
                <User size={16} className="text-primary" />
                <span>{person2Name}&apos;s Wardrobe</span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {p2Looks.length} item{p2Looks.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="packing-items-list">
              {p2Looks.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
                  No looks for {person2Name} under current filter.
                </p>
              ) : (
                p2Looks.map((l) => {
                  const ev = eventLookup.get(l.eventId);
                  const thumb = l.person2UseCutout
                    ? l.person2Cutout || l.person2Original
                    : l.person2Original;

                  return (
                    <div
                      key={`p2_${l.id}`}
                      className={`packing-item-card ${l.packed ? 'is-packed' : ''}`}
                    >
                      <button
                        type="button"
                        className="packed-checkbox-btn"
                        onClick={() => handleTogglePacked(l)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: l.packed ? '#10b981' : '#94a3b8',
                        }}
                        title={l.packed ? 'Mark unpacked' : 'Mark packed'}
                      >
                        {l.packed ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      {thumb && (
                        <img
                          src={thumb}
                          alt={l.person2Label || 'Outfit'}
                          className="packing-item-thumb"
                          loading="lazy"
                        />
                      )}

                      <div className="packing-item-info">
                        <div className="packing-item-label">
                          {l.person2Label || 'Coordinated Outfit'}
                        </div>
                        {ev && (
                          <div
                            className="packing-item-event"
                            style={{ cursor: onNavigateToDay ? 'pointer' : 'default' }}
                            onClick={() => onNavigateToDay?.(ev.dayNumber)}
                          >
                            <CalendarDays size={11} />
                            <span>
                              Day {ev.dayNumber} &bull; {ev.title}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
