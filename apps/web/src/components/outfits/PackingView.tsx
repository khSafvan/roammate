import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  CloudSun,
  Copy,
  Edit2,
  Luggage,
  Plus,
  Shirt,
  Sparkles,
  Square,
  Trash2,
  User,
} from 'lucide-react';
import { Look, LookOccasion, Trip } from '@roammate/shared';
import { ApiClient } from '@roammate/api-client';
import { OutfitModal } from './OutfitModal';
import { WardrobeClosetView } from './WardrobeClosetView';
import { SelectFromWardrobeModal } from './SelectFromWardrobeModal';

interface PackingViewProps {
  trip: Trip;
  looks: Look[];
  apiClient?: ApiClient | null;
  onUpdateLook: (look: Look) => void;
  onDeleteLook?: (lookId: string) => void;
  onNavigateToDay?: (dayNumber: number) => void;
}

const OCCASION_BADGES: Record<LookOccasion, { label: string; emoji: string; bg: string; color: string }> = {
  casual: { label: 'Casual', emoji: '☀️', bg: '#fef3c7', color: '#92400e' },
  dining: { label: 'Dining', emoji: '🍷', bg: '#fce7f3', color: '#9d174d' },
  beach: { label: 'Beach & Pool', emoji: '🏖️', bg: '#e0f2fe', color: '#075985' },
  cultural: { label: 'Cultural', emoji: '🕌', bg: '#ecfdf5', color: '#065f46' },
  active: { label: 'Active', emoji: '👟', bg: '#f3e8ff', color: '#6b21a8' },
  formal: { label: 'Formal', emoji: '✨', bg: '#fef9c3', color: '#854d0e' },
  other: { label: 'Other', emoji: '🏷️', bg: '#f1f5f9', color: '#475569' },
};

export const PackingView: React.FC<PackingViewProps> = ({
  trip,
  looks,
  apiClient,
  onUpdateLook,
  onDeleteLook,
  onNavigateToDay,
}) => {
  // Top view mode: 'itinerary' (Day-by-Day), 'wardrobe' (Closet Capsule), 'packing' (Luggage Checklist)
  const [viewMode, setViewMode] = useState<'itinerary' | 'wardrobe' | 'packing'>('itinerary');
  const [filterMode, setFilterMode] = useState<'all' | 'unpacked' | 'packed'>('all');

  // Modal state for create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLook, setEditingLook] = useState<Look | null>(null);
  const [modalInitialDay, setModalInitialDay] = useState<number | undefined>(1);
  const [modalInitialEventId, setModalInitialEventId] = useState<string | undefined>(undefined);

  // State for "Select from Wardrobe" target
  const [wardrobeSelectTarget, setWardrobeSelectTarget] = useState<{
    dayNumber: number;
    eventId?: string;
    eventTitle?: string;
  } | null>(null);

  const person1Name = trip.travelers?.[0] || 'John';
  const person2Name = trip.travelers?.[1] || 'Jane';

  // Map of eventId -> stop title & day number
  const stopLookup = useMemo(() => {
    const map = new Map<string, { dayNumber: number; title: string; time?: string }>();
    trip.days.forEach((day) => {
      (day.stops || []).forEach((stop) => {
        map.set(stop.id, { dayNumber: day.dayNumber, title: stop.title, time: stop.startTime });
      });
    });
    return map;
  }, [trip.days]);

  // Group looks by day number (1-indexed). Only includes looks assigned to a valid day.
  const looksByDay = useMemo(() => {
    const map = new Map<number, Look[]>();
    trip.days.forEach((d) => map.set(d.dayNumber, []));

    looks.forEach((look) => {
      // Determine day number from look.dayNumber or by looking up eventId
      let dayNum = look.dayNumber;
      if (!dayNum) {
        if (look.eventId && look.eventId.startsWith('day_')) {
          const parsed = parseInt(look.eventId.replace('day_', ''), 10);
          if (!isNaN(parsed)) dayNum = parsed;
        } else if (look.eventId && look.eventId !== 'unassigned') {
          const stop = stopLookup.get(look.eventId);
          if (stop) dayNum = stop.dayNumber;
        }
      }

      if (dayNum && map.has(dayNum)) {
        const current = map.get(dayNum) || [];
        current.push(look);
        map.set(dayNum, current);
      }
    });

    return map;
  }, [looks, trip.days, stopLookup]);

  // Packing statistics
  const totalLooks = looks.length;
  const packedLooks = looks.filter((l) => l.packed).length;
  const packedPercent = totalLooks > 0 ? Math.round((packedLooks / totalLooks) * 100) : 0;

  // Filtered looks for packing view
  const filteredLooksForPacking = useMemo(() => {
    if (filterMode === 'packed') return looks.filter((l) => l.packed);
    if (filterMode === 'unpacked') return looks.filter((l) => !l.packed);
    return looks;
  }, [looks, filterMode]);

  const p1Looks = useMemo(() => {
    return filteredLooksForPacking.filter((l) => l.person1Original || l.person1Cutout || l.person1Label);
  }, [filteredLooksForPacking]);

  const p2Looks = useMemo(() => {
    return filteredLooksForPacking.filter((l) => l.person2Original || l.person2Cutout || l.person2Label);
  }, [filteredLooksForPacking]);

  const handleTogglePacked = (look: Look) => {
    onUpdateLook({
      ...look,
      packed: !look.packed,
      updatedAt: Date.now(),
    });
  };

  const handleOpenAddLookForDay = (dayNum?: number, eventId?: string) => {
    setEditingLook(null);
    setModalInitialDay(dayNum);
    setModalInitialEventId(eventId || (dayNum ? `day_${dayNum}` : 'unassigned'));
    setIsModalOpen(true);
  };

  const handleOpenEditLook = (look: Look) => {
    setEditingLook(look);
    setModalInitialDay(look.dayNumber);
    setModalInitialEventId(look.eventId);
    setIsModalOpen(true);
  };

  const handleSelectFromWardrobe = (
    selectedLook: Look,
    mode: 'assign' | 'duplicate',
    target: { dayNumber: number; eventId?: string; eventTitle?: string }
  ) => {
    if (mode === 'assign') {
      onUpdateLook({
        ...selectedLook,
        dayNumber: target.dayNumber,
        eventId: target.eventId || `day_${target.dayNumber}`,
        updatedAt: Date.now(),
      });
    } else {
      const duplicated: Look = {
        ...selectedLook,
        id: `look_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        dayNumber: target.dayNumber,
        eventId: target.eventId || `day_${target.dayNumber}`,
        packed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onUpdateLook(duplicated);
    }
  };

  const handleMoveToWardrobe = (look: Look) => {
    onUpdateLook({
      ...look,
      dayNumber: undefined,
      eventId: 'unassigned',
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="packing-view-root">
      {/* 1. Hero Hub Header */}
      <div className="packing-hero-card">
        <div className="packing-hero-header">
          <div className="packing-hero-title">
            <Shirt size={22} className="text-primary" />
            <span>Couple Outfits &amp; Luggage Hub</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* 3-Tab View Mode Toggle: Itinerary Looks vs. Wardrobe Closet vs. Luggage Packing */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--color-bg-elevated, #f1f5f9)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--color-border-subtle, #e2e8f0)',
                gap: '2px',
              }}
            >
              <button
                type="button"
                className={`slot-action-btn ${viewMode === 'itinerary' ? 'active-toggle' : ''}`}
                onClick={() => setViewMode('itinerary')}
                style={{
                  border: 'none',
                  background: viewMode === 'itinerary' ? '#ffffff' : 'transparent',
                  fontWeight: viewMode === 'itinerary' ? 700 : 500,
                  boxShadow: viewMode === 'itinerary' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <CalendarDays size={13} />
                <span>📅 Itinerary Looks</span>
              </button>
              <button
                type="button"
                className={`slot-action-btn ${viewMode === 'wardrobe' ? 'active-toggle' : ''}`}
                onClick={() => setViewMode('wardrobe')}
                style={{
                  border: 'none',
                  background: viewMode === 'wardrobe' ? '#ffffff' : 'transparent',
                  fontWeight: viewMode === 'wardrobe' ? 700 : 500,
                  boxShadow: viewMode === 'wardrobe' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <Shirt size={13} />
                <span>🧥 Wardrobe Closet ({looks.length})</span>
              </button>
              <button
                type="button"
                className={`slot-action-btn ${viewMode === 'packing' ? 'active-toggle' : ''}`}
                onClick={() => setViewMode('packing')}
                style={{
                  border: 'none',
                  background: viewMode === 'packing' ? '#ffffff' : 'transparent',
                  fontWeight: viewMode === 'packing' ? 700 : 500,
                  boxShadow: viewMode === 'packing' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <Luggage size={13} />
                <span>🧳 Luggage Packing</span>
              </button>
            </div>

            {/* Prominent Primary + Add Outfit Button */}
            <button
              type="button"
              className="primary-action-btn"
              onClick={() => {
                if (viewMode === 'wardrobe') {
                  handleOpenAddLookForDay(undefined, 'unassigned');
                } else {
                  handleOpenAddLookForDay(1);
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}
            >
              <Plus size={15} />
              <span>{viewMode === 'wardrobe' ? 'Add to Wardrobe' : 'Add Outfit Look'}</span>
            </button>
          </div>
        </div>

        {/* Progress Strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div className="packing-stats-strip">
            <span>
              <strong>{totalLooks}</strong> Total Look{totalLooks !== 1 ? 's' : ''} Planned
            </span>
            <span>&bull;</span>
            <span>
              <strong>{packedLooks}</strong> of <strong>{totalLooks}</strong> Packed ({packedPercent}%)
            </span>
          </div>

          {viewMode === 'packing' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`slot-action-btn ${filterMode === 'all' ? 'active-toggle' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                All
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
          )}
        </div>

        <div className="packing-progress-bar-container">
          <div className="packing-progress-bar-fill" style={{ width: `${packedPercent}%` }} />
        </div>
      </div>

      {/* 2. VIEW MODE A: Itinerary-Organized Looks */}
      {viewMode === 'itinerary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {trip.days.map((day) => {
            const dayLooks = looksByDay.get(day.dayNumber) || [];
            const weather = day.weather;

            return (
              <div
                key={day.id}
                style={{
                  background: 'var(--color-bg-surface, #ffffff)',
                  border: '1px solid var(--color-border-subtle, #e2e8f0)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                {/* Day Header Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--color-border-subtle, #e2e8f0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#4f46e5',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      Day {day.dayNumber}
                    </span>

                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary, #0f172a)', margin: 0 }}>
                        {day.title || 'Day Schedule'}
                      </h3>
                      {day.dateStr && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #64748b)' }}>
                          {day.dateStr}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {weather && (
                      <div className="lookbook-weather-chip" title={weather.clothingTip}>
                        <CloudSun size={12} />
                        <span>{weather.tempC}°C</span>
                        {weather.clothingTip && (
                          <span className="weather-tip-text">&bull; {weather.clothingTip}</span>
                        )}
                      </div>
                    )}

                    {looks.length > 0 && (
                      <button
                        type="button"
                        className="slot-action-btn"
                        onClick={() =>
                          setWardrobeSelectTarget({
                            dayNumber: day.dayNumber,
                            eventId: `day_${day.dayNumber}`,
                            eventTitle: `Day ${day.dayNumber}: ${day.title || 'Schedule'}`,
                          })
                        }
                        title={`Select an existing outfit from wardrobe for Day ${day.dayNumber}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Sparkles size={12} className="text-primary" />
                        <span>Pick from Wardrobe</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="slot-action-btn"
                      onClick={() => handleOpenAddLookForDay(day.dayNumber)}
                      title={`Add an outfit for Day ${day.dayNumber}`}
                    >
                      <Plus size={13} />
                      <span>Add Look</span>
                    </button>
                  </div>
                </div>

                {/* Looks on this Day */}
                {dayLooks.length === 0 ? (
                  <div
                    className="slot-empty-dropzone"
                    style={{ height: 'auto', minHeight: '120px', padding: '20px 16px', cursor: 'default' }}
                  >
                    <div className="dropzone-icon" style={{ width: '32px', height: '32px', marginBottom: '4px' }}>
                      <Shirt size={16} />
                    </div>
                    <span className="dropzone-text" style={{ fontSize: '13px', fontWeight: 600 }}>
                      No outfits assigned to Day {day.dayNumber} yet
                    </span>
                    <span className="dropzone-subtext" style={{ marginBottom: '12px' }}>
                      Design a brand new look or wear a saved outfit from your digital wardrobe
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="primary-action-btn"
                        onClick={() => handleOpenAddLookForDay(day.dayNumber)}
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                      >
                        <Plus size={13} />
                        <span>Create New Look</span>
                      </button>
                      {looks.length > 0 && (
                        <button
                          type="button"
                          className="slot-action-btn"
                          onClick={() =>
                            setWardrobeSelectTarget({
                              dayNumber: day.dayNumber,
                              eventId: `day_${day.dayNumber}`,
                              eventTitle: `Day ${day.dayNumber}: ${day.title || 'Schedule'}`,
                            })
                          }
                          style={{ fontSize: '12px', padding: '6px 14px', background: '#ffffff' }}
                        >
                          <Sparkles size={13} className="text-primary" />
                          <span>Select from Wardrobe ({looks.length})</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {dayLooks.map((l) => {
                      const stop = stopLookup.get(l.eventId);
                      const p1Thumb = l.person1UseCutout ? l.person1Cutout || l.person1Original : l.person1Original;
                      const p2Thumb = l.person2UseCutout ? l.person2Cutout || l.person2Original : l.person2Original;
                      const occasionMeta = l.occasion ? OCCASION_BADGES[l.occasion] : null;

                      return (
                        <div
                          key={l.id}
                          className="lookbook-canvas"
                          style={{ padding: '14px', margin: 0 }}
                        >
                          <div className="lookbook-header" style={{ marginBottom: '10px', paddingBottom: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span className="lookbook-title" style={{ fontSize: '13px' }}>
                                  {l.title || 'Coordinated Look'}
                                </span>
                                {occasionMeta && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      padding: '1px 7px',
                                      borderRadius: '9999px',
                                      background: occasionMeta.bg,
                                      color: occasionMeta.color,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <span>{occasionMeta.emoji}</span>
                                    <span>{occasionMeta.label}</span>
                                  </span>
                                )}
                              </div>
                              {stop && (
                                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary, #64748b)', margin: '2px 0 0' }}>
                                  📍 {stop.title} {stop.time ? `(${stop.time})` : ''}
                                </p>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="slot-action-btn"
                                onClick={() => {
                                  const duplicated: Look = {
                                    ...l,
                                    id: `look_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                    title: `${l.title || 'Look'} (Wear Again)`,
                                    packed: false,
                                    createdAt: Date.now(),
                                    updatedAt: Date.now(),
                                  };
                                  onUpdateLook(duplicated);
                                }}
                                title="Duplicate look to wear again"
                              >
                                <Copy size={11} />
                                <span>Duplicate</span>
                              </button>

                              <button
                                type="button"
                                className="slot-action-btn"
                                onClick={() => handleMoveToWardrobe(l)}
                                title="Unassign from this day and keep in wardrobe closet"
                              >
                                <Shirt size={11} />
                                <span>To Closet</span>
                              </button>

                              <button
                                type="button"
                                className="slot-action-btn"
                                onClick={() => handleOpenEditLook(l)}
                                title="Edit outfit look"
                              >
                                <Edit2 size={11} />
                                <span>Edit</span>
                              </button>

                              {onDeleteLook && (
                                <button
                                  type="button"
                                  className="slot-action-btn btn-danger"
                                  onClick={() => onDeleteLook(l.id)}
                                  title="Delete look"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Side-by-Side Cutout Display */}
                          <div className="lookbook-stage" style={{ minHeight: '180px', gap: '10px', padding: '4px 0' }}>
                            {/* Person 1 */}
                            <div className="lookbook-slot" style={{ padding: '8px' }}>
                              <span className="slot-person-tag" style={{ fontSize: '10px', marginBottom: '4px' }}>
                                <User size={10} />
                                <span>{person1Name}</span>
                              </span>
                              <div className="slot-image-display" style={{ height: '140px' }}>
                                {p1Thumb ? (
                                  <img
                                    src={p1Thumb}
                                    alt={l.person1Label || `${person1Name}'s outfit`}
                                    className={`slot-cutout-img ${!l.person1UseCutout ? 'original-mode' : ''}`}
                                    loading="lazy"
                                  />
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>No photo</span>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary, #0f172a)', marginTop: '4px', textAlign: 'center' }}>
                                {l.person1Label || 'Outfit'}
                              </span>
                            </div>

                            {/* Person 2 */}
                            <div className="lookbook-slot" style={{ padding: '8px', marginLeft: '-10px', zIndex: 2 }}>
                              <span className="slot-person-tag" style={{ fontSize: '10px', marginBottom: '4px' }}>
                                <User size={10} />
                                <span>{person2Name}</span>
                              </span>
                              <div className="slot-image-display" style={{ height: '140px' }}>
                                {p2Thumb ? (
                                  <img
                                    src={p2Thumb}
                                    alt={l.person2Label || `${person2Name}'s outfit`}
                                    className={`slot-cutout-img ${!l.person2UseCutout ? 'original-mode' : ''}`}
                                    loading="lazy"
                                  />
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>No photo</span>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary, #0f172a)', marginTop: '4px', textAlign: 'center' }}>
                                {l.person2Label || 'Outfit'}
                              </span>
                            </div>
                          </div>

                          {/* Footer with Packed Status */}
                          <div className="lookbook-footer" style={{ marginTop: '8px', paddingTop: '8px' }}>
                            <label className="packed-toggle-label" style={{ fontSize: '11px' }}>
                              <input
                                type="checkbox"
                                className="packed-checkbox"
                                checked={Boolean(l.packed)}
                                onChange={() => handleTogglePacked(l)}
                              />
                              <span>Packed in Luggage</span>
                            </label>

                            {l.packed && (
                              <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <CheckSquare size={12} />
                                <span>Ready</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. VIEW MODE B: Digital Wardrobe Closet Capsule */}
      {viewMode === 'wardrobe' && (
        <WardrobeClosetView
          trip={trip}
          looks={looks}
          person1Name={person1Name}
          person2Name={person2Name}
          onOpenAddLook={() => handleOpenAddLookForDay(undefined, 'unassigned')}
          onOpenEditLook={handleOpenEditLook}
          onUpdateLook={onUpdateLook}
          onDeleteLook={(lookId) => onDeleteLook?.(lookId)}
        />
      )}

      {/* 3. VIEW MODE B: Luggage Packing Checklists */}
      {viewMode === 'packing' && (
        <div>
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
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto 16px' }}>
                Create coordinated outfits to generate your couple packing checklist!
              </p>
              <button
                type="button"
                className="primary-action-btn"
                onClick={() => handleOpenAddLookForDay(1)}
              >
                <Plus size={14} />
                <span>Add Your First Look</span>
              </button>
            </div>
          ) : (
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
                      const stop = stopLookup.get(l.eventId);
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
                              {l.person1Label || l.title || 'Coordinated Outfit'}
                            </div>
                            <div
                              className="packing-item-event"
                              style={{ cursor: onNavigateToDay ? 'pointer' : 'default' }}
                              onClick={() => l.dayNumber && onNavigateToDay?.(l.dayNumber)}
                            >
                              <CalendarDays size={11} />
                              <span>
                                Day {l.dayNumber || 1} {stop ? `• ${stop.title}` : ''}
                              </span>
                            </div>
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
                      const stop = stopLookup.get(l.eventId);
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
                              {l.person2Label || l.title || 'Coordinated Outfit'}
                            </div>
                            <div
                              className="packing-item-event"
                              style={{ cursor: onNavigateToDay ? 'pointer' : 'default' }}
                              onClick={() => l.dayNumber && onNavigateToDay?.(l.dayNumber)}
                            >
                              <CalendarDays size={11} />
                              <span>
                                Day {l.dayNumber || 1} {stop ? `• ${stop.title}` : ''}
                              </span>
                            </div>
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
      )}

      {/* Outfit Creator & Editor Modal */}
      {isModalOpen && (
        <OutfitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          trip={trip}
          initialLook={editingLook}
          initialDayNumber={modalInitialDay}
          initialEventId={modalInitialEventId}
          apiClient={apiClient}
          onSaveLook={(savedLook) => {
            onUpdateLook(savedLook);
            setIsModalOpen(false);
          }}
          onDeleteLook={(lookId) => {
            onDeleteLook?.(lookId);
            setIsModalOpen(false);
          }}
        />
      )}

      {/* Select From Wardrobe Picker Modal */}
      {wardrobeSelectTarget && (
        <SelectFromWardrobeModal
          isOpen={Boolean(wardrobeSelectTarget)}
          onClose={() => setWardrobeSelectTarget(null)}
          targetDayNumber={wardrobeSelectTarget.dayNumber}
          targetEventId={wardrobeSelectTarget.eventId}
          targetEventTitle={wardrobeSelectTarget.eventTitle}
          availableLooks={looks}
          person1Name={person1Name}
          person2Name={person2Name}
          onSelectLook={(selectedLook, mode) => {
            handleSelectFromWardrobe(selectedLook, mode, wardrobeSelectTarget);
            setWardrobeSelectTarget(null);
          }}
        />
      )}
    </div>
  );
};
