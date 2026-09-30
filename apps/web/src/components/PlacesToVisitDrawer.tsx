import React, { useState } from 'react';
import {
  ArrowLeft,
  Compass,
  Lightbulb,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { ItineraryStop, StopCategory, TripDay } from '../types/trip';
import { PlaceSearchInput, PlaceSearchResult } from './PlaceSearchInput';
import { useModalA11y } from '../hooks';
import { DiscoveryResultCard } from './places/DiscoveryResultCard';
import { PlaceIdeaCard } from './places/PlaceIdeaCard';

interface PlacesToVisitDrawerProps {
  places: ItineraryStop[];
  days: TripDay[];
  destination?: string;
  onAddPlace: (place: Omit<ItineraryStop, 'id' | 'orderIndex'>) => void;
  onDeletePlace: (id: string) => void;
  onAssignToDay: (placeId: string, dayIndex: number) => void;
  onUpdatePlace?: (updated: ItineraryStop) => void;
  onBackToTimeline?: () => void;
}

const DISCOVERY_PRESETS = [
  { label: '🏛️ Top Sights', query: 'attractions and sights', category: 'sight' as StopCategory },
  { label: '🍜 Local Dining', query: 'restaurants and local food', category: 'dining' as StopCategory },
  { label: '☕ Specialty Cafes', query: 'coffee shops and cafes', category: 'dining' as StopCategory },
  { label: '🌳 Scenic Parks', query: 'parks and viewpoints', category: 'sight' as StopCategory },
  { label: '🛍️ Shopping', query: 'markets and shopping', category: 'sight' as StopCategory },
];

const CATEGORY_LABELS: Record<StopCategory, string> = {
  sight: 'Sight & Attraction',
  dining: 'Food & Dining',
  lodging: 'Hotel & Stay',
  transit: 'Transit',
  flight: 'Flight',
  note: 'Note & Tip',
};

export const PlacesToVisitDrawer: React.FC<PlacesToVisitDrawerProps> = ({
  places = [],
  days,
  destination,
  onAddPlace,
  onDeletePlace,
  onAssignToDay,
  onUpdatePlace,
  onBackToTimeline,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<StopCategory | 'all'>('all');
  const [editingPlace, setEditingPlace] = useState<ItineraryStop | null>(null);

  useModalA11y(Boolean(editingPlace), () => setEditingPlace(null));

  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<PlaceSearchResult[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePresetClick = async (preset: typeof DISCOVERY_PRESETS[0]) => {
    setActivePreset(preset.label);
    setIsDiscovering(true);
    try {
      const dest = destination ? destination.split(',')[0].trim() : '';
      const q = dest ? `${preset.query} in ${dest}` : preset.query;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'roammate/1.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        const results: PlaceSearchResult[] = data.map((item: any) => ({
          title: item.display_name.split(',')[0],
          subtitle: item.display_name.split(',').slice(1, 3).join(',').trim(),
          address: item.display_name,
          coordinates: {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          },
          category: preset.category,
        }));
        setDiscoveryResults(results);
      }
    } catch {
      setDiscoveryResults([]);
    } finally {
      setIsDiscovering(false);
    }
  };

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
          searchContext={destination}
          placeholder="Type any landmark, museum, or eatery (e.g. Miracle Garden, Time Out Market, Tokyo Skytree)..."
        />

        {/* Instant POI Discovery Presets */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            Instant POI Discovery {destination ? `· ${destination.split(',')[0]}` : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {DISCOVERY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset)}
                disabled={isDiscovering}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  backgroundColor: activePreset === preset.label ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-subtle)',
                  border: `1px solid ${activePreset === preset.label ? 'var(--brand-blue, #3B82F6)' : 'var(--border-light)'}`,
                  color: activePreset === preset.label ? 'var(--brand-blue, #3B82F6)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isDiscovering ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Discovery Loading State */}
          {isDiscovering && (
            <div style={{ padding: '16px 0', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Finding top spots via OpenStreetMap...
            </div>
          )}

          {/* Discovery Results Grid */}
          {!isDiscovering && discoveryResults.length > 0 && (
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
              {discoveryResults.map((item, idx) => (
                <DiscoveryResultCard
                  key={idx}
                  result={item}
                  onAdd={(res) => {
                    handleQuickAddFromSearch(res);
                    setDiscoveryResults((prev) => prev.filter((_, i) => i !== idx));
                  }}
                />
              ))}
            </div>
          )}
        </div>
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
            <PlaceIdeaCard
              key={place.id}
              place={place}
              days={days}
              onEdit={(p) => setEditingPlace(p)}
              onDelete={onDeletePlace}
              onAssignToDay={onAssignToDay}
            />
          ))}
        </div>
      )}

      {/* Edit Idea Modal */}
      {editingPlace && (
        <div className="modal-backdrop" onClick={() => setEditingPlace(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-idea-title"
          >
            <div className="modal-header">
              <h3 id="edit-idea-title" className="modal-title">Edit Idea</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingPlace(null)}
                aria-label="Close"
              >
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
