import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Compass,
  Edit2,
  Lightbulb,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { ItineraryStop, StopCategory, TripDay } from '../types/trip';
import { PlaceSearchInput, PlaceSearchResult } from './PlaceSearchInput';

interface PlacesToVisitDrawerProps {
  places: ItineraryStop[];
  days: TripDay[];
  onAddPlace: (place: Omit<ItineraryStop, 'id' | 'orderIndex'>) => void;
  onDeletePlace: (id: string) => void;
  onAssignToDay: (placeId: string, dayIndex: number) => void;
  onUpdatePlace?: (updated: ItineraryStop) => void;
  onBackToTimeline?: () => void;
}

const CATEGORY_COLORS: Record<StopCategory, string> = {
  sight: '#3B82F6',
  dining: '#F97316',
  lodging: '#8B5CF6',
  transit: '#10B981',
  flight: '#0EA5E9',
};

const CATEGORY_LABELS: Record<StopCategory, string> = {
  sight: 'Sight & Attraction',
  dining: 'Food & Dining',
  lodging: 'Hotel & Stay',
  transit: 'Transit',
  flight: 'Flight',
};

export const PlacesToVisitDrawer: React.FC<PlacesToVisitDrawerProps> = ({
  places = [],
  days,
  onAddPlace,
  onDeletePlace,
  onAssignToDay,
  onUpdatePlace,
  onBackToTimeline,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<StopCategory | 'all'>('all');
  const [editingPlace, setEditingPlace] = useState<ItineraryStop | null>(null);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);

  // Manual Add Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<StopCategory>('sight');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState('25.1972');
  const [longitude, setLongitude] = useState('55.2744');

  const filteredPlaces = places.filter((p) =>
    selectedCategory === 'all' ? true : p.category === selectedCategory
  );

  const handleQuickAddFromSearch = (result: PlaceSearchResult) => {
    onAddPlace({
      title: result.title,
      subtitle: result.subtitle || 'Unscheduled idea',
      category: result.category,
      startTime: '10:00 AM',
      durationMinutes: 60,
      coordinates: result.coordinates,
      address: result.address || 'Address to be confirmed',
      notes: undefined,
    });
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddPlace({
      title: title.trim(),
      subtitle: subtitle.trim() || `${category.charAt(0).toUpperCase() + category.slice(1)} idea`,
      category,
      startTime: '10:00 AM',
      durationMinutes: 60,
      coordinates: {
        latitude: parseFloat(latitude) || 25.1972,
        longitude: parseFloat(longitude) || 55.2744,
      },
      address: address.trim() || 'Address to be confirmed',
      notes: notes.trim() || undefined,
    });

    // Reset
    setTitle('');
    setSubtitle('');
    setCategory('sight');
    setAddress('');
    setNotes('');
    setIsManualAddOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlace || !onUpdatePlace) return;
    onUpdatePlace(editingPlace);
    setEditingPlace(null);
  };

  return (
    <div className="places-to-visit-container" style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="section-toolbar" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-amber)',
              }}
            >
              <Lightbulb size={18} />
            </div>
            <h2 className="section-heading" style={{ margin: 0, fontSize: '20px' }}>
              Places to Visit & Ideas Bucket
            </h2>
          </div>
          <p className="section-subheading" style={{ marginTop: '4px' }}>
            Collect restaurants, sights, and spots here without locking into a date — assign them to any day when you're ready.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBackToTimeline && (
            <button
              className="breadcrumb-back-btn"
              onClick={onBackToTimeline}
              title="Return to Itinerary Timeline"
            >
              <ArrowLeft size={14} />
              <span>Back to Itinerary</span>
            </button>
          )}
          <button
            className="secondary-action-btn"
            onClick={() => setIsManualAddOpen(!isManualAddOpen)}
          >
            <Plus size={15} />
            <span>{isManualAddOpen ? 'Close Form' : 'Custom Place'}</span>
          </button>
        </div>
      </div>

      {/* Instant Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg, 16px)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Sparkles size={15} className="text-amber" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Quick Search & Add to Ideas (OpenStreetMap)
          </span>
        </div>
        <PlaceSearchInput
          onSelectPlace={handleQuickAddFromSearch}
          placeholder="Type any landmark, museum, or eatery (e.g. Miracle Garden, Time Out Market, Tokyo Skytree)..."
        />
      </div>

      {/* Manual Place Creation Form */}
      {isManualAddOpen && (
        <form
          onSubmit={handleManualAddSubmit}
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            padding: '20px',
            borderRadius: 'var(--radius-xl, 16px)',
            border: '1px solid var(--border-light, #e2e8f0)',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Add Place Manually</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label className="form-label">Place Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Al Khayma Heritage Restaurant"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as StopCategory)}
              >
                <option value="sight">Sight & Attraction</option>
                <option value="dining">Food & Dining</option>
                <option value="lodging">Hotel & Stay</option>
                <option value="transit">Transit & Transfer</option>
                <option value="flight">Flight</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Address or Area</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Al Fahidi Historical Neighbourhood, Bur Dubai"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Travel Notes / Recommendations</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Try the lamb machboos, make reservations 2 days prior"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label text-xs">Latitude (GPS)</label>
              <input
                type="text"
                className="form-input text-xs font-mono"
                placeholder="25.1972"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label text-xs">Longitude (GPS)</label>
              <input
                type="text"
                className="form-input text-xs font-mono"
                placeholder="55.2744"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="secondary-action-btn" onClick={() => setIsManualAddOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="primary-modal-btn">
              <Plus size={15} />
              <span>Save to Ideas</span>
            </button>
          </div>
        </form>
      )}

      {/* Category Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
        {(['all', 'sight', 'dining', 'lodging', 'transit', 'flight'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            className={`cat-chip-btn ${selectedCategory === cat ? 'selected' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? `All Ideas (${places.length})` : `${CATEGORY_LABELS[cat] || cat}`}
          </button>
        ))}
      </div>

      {/* Places Cards Grid */}
      {filteredPlaces.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius-xl, 16px)',
            border: '1px dashed var(--border-light, #e2e8f0)',
          }}
        >
          <Compass size={36} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', margin: '0 0 6px' }}>
            No ideas in this category yet
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
            Use the search bar above to look up sights, museums, or cafes and save them to this bucket.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
          {filteredPlaces.map((place) => (
            <div
              key={place.id}
              style={{
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1px solid var(--border-light, #e2e8f0)',
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
                {/* Header: Category Badge & Delete */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: `${CATEGORY_COLORS[place.category] || '#64748B'}18`,
                      color: CATEGORY_COLORS[place.category] || '#64748B',
                    }}
                  >
                    {CATEGORY_LABELS[place.category] || place.category}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setEditingPlace(place)}
                      title="Edit Idea"
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
                      onClick={() => onDeletePlace(place.id)}
                      title="Delete Idea"
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
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', margin: '0 0 6px' }}>
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
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {place.address}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {place.notes && (
                  <div
                    style={{
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-subtle, #f8fafc)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      color: 'var(--text-secondary, #475569)',
                      borderLeft: '3px solid var(--brand-amber)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                  <Calendar size={13} />
                  <span>Assign:</span>
                </div>

                <select
                  className="form-input"
                  style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', cursor: 'pointer' }}
                  defaultValue=""
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
          ))}
        </div>
      )}

      {/* Edit Idea Modal */}
      {editingPlace && (
        <div className="modal-backdrop" onClick={() => setEditingPlace(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Idea</h3>
              <button className="modal-close-btn" onClick={() => setEditingPlace(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="auth-content-col">
              <div>
                <label className="form-label">Title</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editingPlace.title}
                  onChange={(e) => setEditingPlace({ ...editingPlace, title: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Subtitle</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingPlace.subtitle || ''}
                  onChange={(e) => setEditingPlace({ ...editingPlace, subtitle: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingPlace.address || ''}
                  onChange={(e) => setEditingPlace({ ...editingPlace, address: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editingPlace.notes || ''}
                  onChange={(e) => setEditingPlace({ ...editingPlace, notes: e.target.value })}
                />
              </div>
              <div className="modal-actions-row">
                <button type="button" className="secondary-action-btn" onClick={() => setEditingPlace(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-modal-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
