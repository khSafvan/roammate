import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Calendar,
  Check,
  Trash2,
  Edit2,
  Copy,
  ChevronDown,
  X,
} from 'lucide-react';
import { Look, LookOccasion, Trip } from '@roammate/shared';
import { Button } from "../../components/ui/Button";

export interface WardrobeClosetViewProps {
  trip: Trip;
  looks: Look[];
  person1Name?: string;
  person2Name?: string;
  onOpenAddLook: () => void;
  onOpenEditLook: (look: Look) => void;
  onUpdateLook: (look: Look) => void;
  onDeleteLook: (lookId: string) => void;
}

const OCCASIONS: { label: string; value: LookOccasion; emoji: string }[] = [
  { label: 'Casual', value: 'casual', emoji: '☀️' },
  { label: 'Dining', value: 'dining', emoji: '🍷' },
  { label: 'Beach & Pool', value: 'beach', emoji: '🏖️' },
  { label: 'Cultural / Modest', value: 'cultural', emoji: '🕌' },
  { label: 'Active', value: 'active', emoji: '👟' },
  { label: 'Formal', value: 'formal', emoji: '✨' },
  { label: 'Other', value: 'other', emoji: '🏷️' },
];

export const WardrobeClosetView: React.FC<WardrobeClosetViewProps> = ({
  trip,
  looks,
  person1Name = 'John',
  person2Name = 'Jane',
  onOpenAddLook,
  onOpenEditLook,
  onUpdateLook,
  onDeleteLook,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'unassigned' | 'p1' | 'p2'>('all');
  const [occasionFilter, setOccasionFilter] = useState<LookOccasion | 'all'>('all');
  const [assigningLookId, setAssigningLookId] = useState<string | null>(null);

  // Filtered looks
  const filteredLooks = useMemo(() => {
    return looks.filter((look) => {
      // Scope filter
      if (scopeFilter === 'unassigned') {
        const isAssigned = Boolean(look.dayNumber && look.eventId && look.eventId !== 'unassigned');
        if (isAssigned) return false;
      } else if (scopeFilter === 'p1') {
        if (!look.person1Original && !look.person1Cutout && !look.person1Label) return false;
      } else if (scopeFilter === 'p2') {
        if (!look.person2Original && !look.person2Cutout && !look.person2Label) return false;
      }

      // Occasion filter
      if (occasionFilter !== 'all' && look.occasion !== occasionFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (look.title || '').toLowerCase().includes(q);
        const matchesNotes = (look.notes || '').toLowerCase().includes(q);
        const matchesP1 = (look.person1Label || '').toLowerCase().includes(q);
        const matchesP2 = (look.person2Label || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesP1 && !matchesP2) {
          return false;
        }
      }

      return true;
    });
  }, [looks, scopeFilter, occasionFilter, searchQuery]);

  const unassignedCount = useMemo(() => {
    return looks.filter((l) => !l.dayNumber || !l.eventId || l.eventId === 'unassigned').length;
  }, [looks]);

  const handleAssignLook = (look: Look, dayNumber?: number, eventId?: string) => {
    onUpdateLook({
      ...look,
      dayNumber: dayNumber || undefined,
      eventId: eventId || (dayNumber ? `day_${dayNumber}` : 'unassigned'),
      updatedAt: Date.now(),
    });
    setAssigningLookId(null);
  };

  const handleDuplicateLook = (look: Look) => {
    const duplicated: Look = {
      ...look,
      id: `look_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${look.title || 'Outfit'} (Copy)`,
      eventId: 'unassigned',
      dayNumber: undefined,
      packed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpdateLook(duplicated);
  };

  const handleTogglePacked = (look: Look) => {
    onUpdateLook({
      ...look,
      packed: !look.packed,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Filter and Control Bar */}
      <div className="flex flex-col gap-3 p-4 bg-surface rounded-xl border border-subtle shadow-sm">
        <div className="flex gap-2 items-center flex-wrap">
          {/* Search Field */}
          <div className="search-input-box" style={{ flex: 1, minWidth: '240px', minHeight: '38px' }}>
            <Search size={14} className="text-secondary" />
            <input
              type="text"
              className="search-field"
              placeholder="Search wardrobe closet by look name, items, or occasion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Scope Pills */}
          <div className="flex gap-1 p-1 bg-surface rounded-lg border border-subtle flex-wrap">
            <button
              type="button"
              className={`slot-action-btn ${scopeFilter === 'all' ? 'active-toggle' : ''}`}
              onClick={() => setScopeFilter('all')}
            >
              All Outfits ({looks.length})
            </button>
            <button
              type="button"
              className={`slot-action-btn ${scopeFilter === 'unassigned' ? 'active-toggle' : ''}`}
              onClick={() => setScopeFilter('unassigned')}
            >
              Ready to Wear ({unassignedCount})
            </button>
            <button
              type="button"
              className={`slot-action-btn ${scopeFilter === 'p1' ? 'active-toggle' : ''}`}
              onClick={() => setScopeFilter('p1')}
            >
              {person1Name}
            </button>
            <button
              type="button"
              className={`slot-action-btn ${scopeFilter === 'p2' ? 'active-toggle' : ''}`}
              onClick={() => setScopeFilter('p2')}
            >
              {person2Name}
            </button>
          </div>

          {/* Primary Add CTA */}
          <Button
            type="button"
            className="primary-action-btn flex items-center gap-2 whitespace-nowrap"
            onClick={onOpenAddLook} variant="primary"
          >
            <Plus size={15} />
            <span>New Wardrobe Look</span>
          </Button>
        </div>

        {/* Occasion Tags Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className={`category-filter-btn ${occasionFilter === 'all' ? 'active' : ''}`}
            onClick={() => setOccasionFilter('all')}
            style={{ fontSize: '12px', padding: '4px 12px', minHeight: '30px' }}
          >
            All Occasions
          </button>
          {OCCASIONS.map((occ) => (
            <button
              key={occ.value}
              type="button"
              className={`category-filter-btn ${occasionFilter === occ.value ? 'active' : ''}`}
              onClick={() => setOccasionFilter(occ.value)}
              style={{ fontSize: '12px', padding: '4px 12px', minHeight: '30px' }}
            >
              <span>{occ.emoji}</span>
              <span>{occ.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Grid of Wardrobe Looks */}
      {filteredLooks.length === 0 ? (
        <div className="not-found-state">
          <span className="not-found-icon">✨</span>
          <span className="not-found-title">Your Wardrobe Closet is Empty</span>
          <span className="not-found-hint">Create wardrobe looks here before assigning them, or plan outfits you can wear across multiple days of your trip.</span>
          <Button
            type="button"
            className="primary-action-btn flex items-center gap-2 mt-4 mx-auto"
            onClick={onOpenAddLook} variant="primary"
          >
            <Plus size={15} />
            <span>Create First Outfit Look</span>
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '18px',
          }}
        >
          {filteredLooks.map((look) => {
            const isAssigned = Boolean(look.dayNumber && look.eventId && look.eventId !== 'unassigned');
            const occ = OCCASIONS.find((o) => o.value === look.occasion);
            const isAssigningThis = assigningLookId === look.id;

            return (
              <div
                key={look.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  position: 'relative',
                }}
              >
                {/* Header: Title, Occasion & Menu */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {look.title || 'Untitled Look'}
                    </h4>
                    <div style={{ marginTop: '3px' }}>
                      {isAssigned ? (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--brand-blue)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Calendar size={11} />
                          <span>Day {look.dayNumber} Assigned</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--brand-purple)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sparkles size={11} />
                          <span>Ready in Closet (Unassigned)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {occ && (
                      <span
                        style={{
                          fontSize: '11px',
                          background: 'var(--bg-subtle)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-light)',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{occ.emoji}</span>
                        <span>{occ.label}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      className="pass-delete-btn"
                      onClick={() => onOpenEditLook(look)}
                      title="Edit outfit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="pass-delete-btn"
                      onClick={() => handleDuplicateLook(look)}
                      title="Duplicate look (wear again)"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      className="pass-delete-btn"
                      onClick={() => onDeleteLook(look.id)}
                      title="Delete look"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Duo Photos Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Person 1 Slot */}
                  <div
                    style={{
                      background: 'var(--bg-subtle)',
                      borderRadius: '10px',
                      aspectRatio: '3/4',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    {look.person1Cutout || look.person1Original ? (
                      <img
                        src={look.person1UseCutout && look.person1Cutout ? look.person1Cutout : look.person1Original}
                        alt={person1Name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-tertiary)' }}>
                        <span style={{ fontSize: '22px' }}>👔</span>
                        <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>{person1Name}</div>
                      </div>
                    )}
                    {look.person1Label && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          fontSize: '10px',
                          padding: '3px 6px',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {look.person1Label}
                      </div>
                    )}
                  </div>

                  {/* Person 2 Slot */}
                  <div
                    style={{
                      background: 'var(--bg-subtle)',
                      borderRadius: '10px',
                      aspectRatio: '3/4',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    {look.person2Cutout || look.person2Original ? (
                      <img
                        src={look.person2UseCutout && look.person2Cutout ? look.person2Cutout : look.person2Original}
                        alt={person2Name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-tertiary)' }}>
                        <span style={{ fontSize: '22px' }}>👗</span>
                        <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>{person2Name}</div>
                      </div>
                    )}
                    {look.person2Label && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          fontSize: '10px',
                          padding: '3px 6px',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {look.person2Label}
                      </div>
                    )}
                  </div>
                </div>

                {look.notes && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      background: 'var(--bg-subtle)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    {look.notes}
                  </p>
                )}

                {/* Assignment & Packed Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-light)',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  {/* Packed Toggle */}
                  <button
                    type="button"
                    onClick={() => handleTogglePacked(look)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: look.packed ? '1px solid #10b981' : '1px solid var(--border-medium)',
                      background: look.packed ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      color: look.packed ? '#10b981' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={12} strokeWidth={look.packed ? 3 : 2} />
                    <span>{look.packed ? 'Packed' : 'Mark Packed'}</span>
                  </button>

                  {/* Assign to Day Popover Trigger */}
                  <div style={{ position: 'relative' }}>
                    <Button
                      type="button"
                      className="secondary-action-btn"
                      onClick={() => setAssigningLookId(isAssigningThis ? null : look.id)}
                      style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }} variant="secondary"
                    >
                      <Calendar size={12} />
                      <span>{isAssigned ? `Day ${look.dayNumber} Assigned` : 'Assign to Day'}</span>
                      <ChevronDown size={11} />
                    </Button>

                    {isAssigningThis && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          bottom: '100%',
                          marginBottom: '6px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          width: '220px',
                          zIndex: 50,
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', color: 'var(--text-tertiary)' }}>
                          Assign this look to:
                        </div>
                        <button
                          type="button"
                          className="subview-item-btn"
                          onClick={() => handleAssignLook(look, undefined, 'unassigned')}
                          style={{
                            textAlign: 'left',
                            fontSize: '12px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            background: !isAssigned ? 'var(--bg-subtle)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          🏷️ Unassigned (Wardrobe Only)
                        </button>
                        {trip.days.map((day) => (
                          <button
                            key={day.id}
                            type="button"
                            className="subview-item-btn"
                            onClick={() => handleAssignLook(look, day.dayNumber, `day_${day.dayNumber}`)}
                            style={{
                              textAlign: 'left',
                              fontSize: '12px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              background: look.dayNumber === day.dayNumber ? 'var(--bg-subtle)' : 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>Day {day.dayNumber}: {day.title.substring(0, 14)}...</span>
                            {look.dayNumber === day.dayNumber && <Check size={12} className="text-blue" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
