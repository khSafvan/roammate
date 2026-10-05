import React, { useState, useMemo } from 'react';
import { X, Sparkles, Copy, Check, Search } from 'lucide-react';
import { Look, LookOccasion } from '@roammate/shared';
import { useModalA11y } from '../../hooks';

export interface SelectFromWardrobeModalProps {
  isOpen: boolean;
  targetDayNumber?: number;
  targetEventId?: string;
  targetEventTitle?: string;
  availableLooks: Look[];
  person1Name?: string;
  person2Name?: string;
  onSelectLook: (look: Look, mode: 'assign' | 'duplicate') => void;
  onClose: () => void;
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

export const SelectFromWardrobeModal: React.FC<SelectFromWardrobeModalProps> = ({
  isOpen,
  targetDayNumber,
  targetEventId,
  targetEventTitle,
  availableLooks,
  person1Name = 'John',
  person2Name = 'Jane',
  onSelectLook,
  onClose,
}) => {
  useModalA11y(isOpen, onClose);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState<LookOccasion | 'all'>('all');
  const [selectedPerson, setSelectedPerson] = useState<'all' | 'p1' | 'p2'>('all');

  const filteredLooks = useMemo(() => {
    return availableLooks.filter((look) => {
      // Occasion filter
      if (selectedOccasion !== 'all' && look.occasion !== selectedOccasion) {
        return false;
      }

      // Person filter
      if (selectedPerson === 'p1' && !look.person1Original && !look.person1Cutout && !look.person1Label) {
        return false;
      }
      if (selectedPerson === 'p2' && !look.person2Original && !look.person2Cutout && !look.person2Label) {
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
  }, [availableLooks, selectedOccasion, selectedPerson, searchQuery]);

  if (!isOpen) return null;

  const targetLabel = targetEventTitle
    ? targetEventTitle
    : targetDayNumber
    ? `Day ${targetDayNumber}`
    : 'Selected Day';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-wardrobe-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="stop-badge-lg" style={{ backgroundColor: 'var(--brand-purple, #8B5CF6)' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="select-wardrobe-title" className="modal-title">
                Wardrobe Closet
              </h2>
              <p className="modal-subtitle">
                Select an outfit from your wardrobe to wear for <strong>{targetLabel}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 p-4 border-b border-subtle">
          <div className="flex gap-2 items-center">
            <div className="search-input-box" style={{ flex: 1, minHeight: '36px' }}>
              <Search size={14} className="text-secondary" />
              <input
                type="text"
                className="search-field text-sm"
                placeholder="Search outfits by title, label, or notes..."
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
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Person Filter */}
            <div className="flex gap-1 p-1 bg-surface rounded-lg border border-subtle">
              <button
                type="button"
                className={`slot-action-btn ${selectedPerson === 'all' ? 'active-toggle' : ''}`}
                onClick={() => setSelectedPerson('all')}
              >
                Both
              </button>
              <button
                type="button"
                className={`slot-action-btn ${selectedPerson === 'p1' ? 'active-toggle' : ''}`}
                onClick={() => setSelectedPerson('p1')}
              >
                {person1Name}
              </button>
              <button
                type="button"
                className={`slot-action-btn ${selectedPerson === 'p2' ? 'active-toggle' : ''}`}
                onClick={() => setSelectedPerson('p2')}
              >
                {person2Name}
              </button>
            </div>
          </div>

          {/* Occasion Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              className={`category-filter-btn ${selectedOccasion === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedOccasion('all')}
              style={{ fontSize: '12px', padding: '3px 10px', minHeight: '28px' }}
            >
              All Occasions
            </button>
            {OCCASIONS.map((occ) => (
              <button
                key={occ.value}
                type="button"
                className={`category-filter-btn ${selectedOccasion === occ.value ? 'active' : ''}`}
                onClick={() => setSelectedOccasion(occ.value)}
                style={{ fontSize: '12px', padding: '3px 10px', minHeight: '28px' }}
              >
                <span>{occ.emoji}</span>
                <span>{occ.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Body: Grid of Looks */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLooks.length === 0 ? (
            <div className="not-found-state">
              <span className="not-found-icon">🧥</span>
              <span className="not-found-title">No matching outfits found</span>
              <span className="not-found-hint">
                {availableLooks.length === 0
                  ? 'Your wardrobe closet is empty. Create your first look to start styling!'
                  : 'Try adjusting your search query or filters to find saved looks.'}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '14px',
              }}
            >
              {filteredLooks.map((look) => {
                const isAssigned = Boolean(look.dayNumber && look.eventId && look.eventId !== 'unassigned');
                const isCurrentEvent = look.eventId === targetEventId;
                const occ = OCCASIONS.find((o) => o.value === look.occasion);

                return (
                  <div
                    key={look.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: isCurrentEvent ? '2px solid var(--brand-blue)' : '1px solid var(--border-light)',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                  >
                    {/* Top Row: Title & Occasion */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {look.title || 'Untitled Outfit Look'}
                        </h4>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {isAssigned ? (
                            <span style={{ color: 'var(--text-secondary)' }}>
                              Currently on: <strong>Day {look.dayNumber}</strong>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--brand-purple)', fontWeight: 500 }}>
                              🏷️ In Wardrobe (Unassigned)
                            </span>
                          )}
                        </div>
                      </div>

                      {occ && (
                        <span
                          style={{
                            fontSize: '11px',
                            background: 'var(--bg-subtle)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: '1px solid var(--border-light)',
                          }}
                        >
                          <span>{occ.emoji}</span>
                          <span>{occ.label}</span>
                        </span>
                      )}
                    </div>

                    {/* Dual Photos Thumbnails */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {/* Person 1 Slot */}
                      <div
                        style={{
                          background: 'var(--bg-subtle)',
                          borderRadius: '8px',
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
                          <div style={{ textAlign: 'center', padding: '6px', color: 'var(--text-tertiary)' }}>
                            <span style={{ fontSize: '18px' }}>👔</span>
                            <div style={{ fontSize: '10px', marginTop: '2px' }}>{person1Name}</div>
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
                              fontSize: '9px',
                              padding: '2px 4px',
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
                          borderRadius: '8px',
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
                          <div style={{ textAlign: 'center', padding: '6px', color: 'var(--text-tertiary)' }}>
                            <span style={{ fontSize: '18px' }}>👗</span>
                            <div style={{ fontSize: '10px', marginTop: '2px' }}>{person2Name}</div>
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
                              fontSize: '9px',
                              padding: '2px 4px',
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
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        &ldquo;{look.notes}&rdquo;
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: 'auto', paddingTop: '4px' }}>
                      <button
                        type="button"
                        className="primary-action-btn"
                        style={{ fontSize: '12px', padding: '6px 8px', justifyContent: 'center' }}
                        onClick={() => {
                          onSelectLook(look, 'assign');
                          onClose();
                        }}
                      >
                        <Check size={13} />
                        <span>Assign Here</span>
                      </button>

                      <button
                        type="button"
                        className="secondary-action-btn"
                        style={{ fontSize: '12px', padding: '6px 8px', justifyContent: 'center' }}
                        onClick={() => {
                          onSelectLook(look, 'duplicate');
                          onClose();
                        }}
                        title="Duplicate look to wear again on this day"
                      >
                        <Copy size={13} />
                        <span>Wear Again</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
