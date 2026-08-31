import React, { useEffect, useState } from 'react';
import { Bold, Clock, Code, Eye, EyeOff, Italic, Link2, List, ListOrdered, MapPin, Plus, Sparkles, X } from 'lucide-react';
import { Coordinates, ItineraryStop, StopCategory, BookingDocument } from '../types/trip';
import { PlaceSearchInput, PlaceSearchResult } from './PlaceSearchInput';
import { MarkdownText } from './MarkdownText';
import { useModalA11y } from '../hooks';

interface AddStopModalProps {
  isOpen: boolean;
  dayNumber: number;
  themeColor: string;
  destination?: string;
  defaultStartTime?: string;
  defaultCategory?: StopCategory;
  fallbackCoordinates?: Coordinates;
  onClose: () => void;
  onAddStop: (stopData: Omit<ItineraryStop, 'id' | 'orderIndex'>) => void;
  onAddDocument?: (doc: BookingDocument) => void;
}

const CATEGORIES: { label: string; value: StopCategory; icon: string }[] = [
  { label: 'Sight & Attraction', value: 'sight', icon: '🏛️' },
  { label: 'Food & Dining', value: 'dining', icon: '🍜' },
  { label: 'Transit & Transfer', value: 'transit', icon: '🚆' },
  { label: 'Note', value: 'note', icon: '📝' },
];

export const AddStopModal: React.FC<AddStopModalProps> = ({
  isOpen,
  dayNumber,
  themeColor,
  destination,
  defaultStartTime = '10:00 AM',
  defaultCategory = 'sight',
  fallbackCoordinates = { latitude: 35.6762, longitude: 139.6503 },
  onClose,
  onAddStop,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<StopCategory>(defaultCategory === 'lodging' || defaultCategory === 'flight' ? 'sight' : defaultCategory);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [address, setAddress] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState(fallbackCoordinates.latitude.toString());
  const [longitude, setLongitude] = useState(fallbackCoordinates.longitude.toString());
  const [isPreviewingNotes, setIsPreviewingNotes] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useModalA11y(isOpen, onClose);

  const [selectedPlaceMeta, setSelectedPlaceMeta] = useState<Partial<PlaceSearchResult> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory === 'lodging' || defaultCategory === 'flight' ? 'sight' : defaultCategory);
      setStartTime(defaultStartTime);
      setTitle('');
      setSubtitle('');
      setAddress('');
      setBookingRef('');
      setNotes('');
      setSelectedPlaceMeta(null);
      setDurationMinutes(defaultCategory === 'note' ? 0 : 60);
      setIsPreviewingNotes(false);
      setShowAdvanced(false);
      setLatitude(fallbackCoordinates.latitude.toString());
      setLongitude(fallbackCoordinates.longitude.toString());
    }
  }, [isOpen, defaultCategory, defaultStartTime, fallbackCoordinates.latitude, fallbackCoordinates.longitude]);

  if (!isOpen) return null;

  const handlePlaceSelect = (place: PlaceSearchResult) => {
    setTitle(place.title);
    setSelectedPlaceMeta(place);
    if (place.subtitle) setSubtitle(place.subtitle);
    if (place.address) setAddress(place.address);
    if (place.coordinates) {
      setLatitude(place.coordinates.latitude.toFixed(6));
      setLongitude(place.coordinates.longitude.toFixed(6));
    }
    if (place.category && place.category !== 'lodging' && place.category !== 'flight') {
      setCategory(place.category);
    }
    setShowAdvanced(false);
  };

  const insertMarkdown = (syntax: 'bold' | 'italic' | 'bullet' | 'ordered' | 'code' | 'link') => {
    switch (syntax) {
      case 'bold':
        setNotes((prev) => (prev ? `${prev} **bold text**` : '**bold text**'));
        break;
      case 'italic':
        setNotes((prev) => (prev ? `${prev} *italic text*` : '*italic text*'));
        break;
      case 'bullet':
        setNotes((prev) => (prev ? `${prev}\n- List item` : '- List item'));
        break;
      case 'ordered':
        setNotes((prev) => (prev ? `${prev}\n1. Step one` : '1. Step one'));
        break;
      case 'code':
        setNotes((prev) => (prev ? `${prev} \`code\`` : '`code`'));
        break;
      case 'link':
        setNotes((prev) => (prev ? `${prev} [Link title](https://example.com)` : '[Link title](https://example.com)'));
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || (category === 'note' ? (notes.trim().slice(0, 30) || 'Travel Note') : '');
    if (!finalTitle && category !== 'note') return;

    const lat = parseFloat(latitude) || fallbackCoordinates.latitude;
    const lng = parseFloat(longitude) || fallbackCoordinates.longitude;

    onAddStop({
      title: finalTitle || 'Travel Note',
      subtitle: subtitle.trim() || (category === 'note' ? 'Traveler Note' : `${category.charAt(0).toUpperCase() + category.slice(1)} stop`),
      category,
      startTime: startTime.trim() || defaultStartTime,
      durationMinutes: category === 'note' ? 0 : Math.max(5, durationMinutes || 60),
      coordinates: { latitude: lat, longitude: lng },
      address: address.trim() || (category === 'note' ? 'Itinerary Note' : 'Address to be confirmed'),
      bookingRef: bookingRef.trim() || undefined,
      notes: notes.trim() || undefined,
      rating: selectedPlaceMeta?.rating,
      userRatingsTotal: selectedPlaceMeta?.userRatingsTotal,
      priceLevel: selectedPlaceMeta?.priceLevel,
      website: selectedPlaceMeta?.website,
      phoneNumber: selectedPlaceMeta?.phoneNumber,
      photos: selectedPlaceMeta?.photos,
      imageUrl: selectedPlaceMeta?.imageUrl,
      openTime: selectedPlaceMeta?.openTime,
      closeTime: selectedPlaceMeta?.closeTime,
      tags: selectedPlaceMeta?.tags,
    });

    onClose();
  };

  const isNote = category === 'note';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '100%' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-stop-modal-title"
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <div
              className="stop-badge-lg"
              style={{
                backgroundColor: isNote ? 'var(--brand-amber)' : themeColor,
              }}
            >
              {isNote ? '📝' : '+'}
            </div>
            <div>
              <h2 id="add-stop-modal-title" className="modal-title">
                {isNote
                  ? `Add Note to Day ${dayNumber}`
                  : `Add Place to Day ${dayNumber}`}
              </h2>
              <p className="modal-subtitle">
                {isNote
                  ? 'Add formatted tips, reminders, instructions, or packing notes'
                  : 'Search places with Google Places/OSM and schedule your itinerary'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close" style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-content-col">
          {/* Category Chips */}
          <div className="category-chips-select">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`cat-chip-btn ${category === cat.value ? 'selected' : ''}`}
                style={{
                  borderColor: category === cat.value ? (cat.value === 'note' ? 'var(--brand-amber)' : themeColor) : undefined,
                  backgroundColor: category === cat.value ? (cat.value === 'note' ? 'rgba(245, 158, 11, 0.12)' : `${themeColor}15`) : undefined,
                  color: category === cat.value ? (cat.value === 'note' ? '#B45309' : themeColor) : undefined,
                  padding: '12px 16px', // Expand hit area for mobile
                }}
                onClick={() => setCategory(cat.value)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Search & Autocomplete */}
          {!isNote && (
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} style={{ color: themeColor }} />
                <span>Search Place / Autocomplete (Google Places & OSM)</span>
              </label>
              <PlaceSearchInput
                onSelectPlace={handlePlaceSelect}
                searchContext={destination}
                placeholder="Search e.g. Louvre, Shibuya Sky, Senso-ji, Starbucks..."
              />
            </div>
          )}

          {/* Title & Subtitle */}
          {!isNote && selectedPlaceMeta && !showAdvanced ? (
            <div 
              style={{ 
                padding: '16px', 
                backgroundColor: 'var(--bg-subtle)', 
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                marginTop: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>
                    {CATEGORIES.find(c => c.value === category)?.icon || '📍'}
                  </span>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{title}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      {address || subtitle}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowAdvanced(true)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: themeColor, 
                    fontSize: '13px', 
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '8px',
                    minHeight: '44px' // Better touch target
                  }}
                >
                  Edit Details
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="form-label">
                  {isNote ? 'Note Topic / Heading (Optional)' : 'Place / Activity Title *'}
                </label>
                <input
                  type="text"
                  required={!isNote}
                  placeholder={isNote ? 'e.g. Metro Transfer Tips' : 'e.g. Senso-ji Temple'}
                  className="form-input font-medium"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {!isNote && (
                <div>
                  <label className="form-label">Subtitle / Brief Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Historic Buddhist temple with lively market street"
                    className="form-input"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                  />
                </div>
              )}

              {/* Time & Duration */}
              <div className="form-row-2">
                <div>
                  <label className="form-label">
                    <Clock size={12} className="inline mr-1" />
                    Scheduled Start Time
                  </label>
                  <input
                    type="text"
                    placeholder="10:00 AM or 10:00"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                {!isNote && (
                  <div>
                    <label className="form-label">Duration (Minutes)</label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      className="form-input"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
                    />
                  </div>
                )}
              </div>

              {!isNote && (
                <div>
                  <label className="form-label">
                    <MapPin size={12} className="inline mr-1" />
                    Address or Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1-19-1 Kabukicho, Shinjuku City, Tokyo"
                    className="form-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              )}

              {/* Booking Ref */}
              <div>
                <label className="form-label">Booking Confirmation (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. RES-9982"
                  className="form-input font-mono"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                />
              </div>

              {/* Traveler Notes / Rich Markdown Editor */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    {isNote ? 'Note & Details *' : 'Traveler Notes & Tips'}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button type="button" className="icon-btn" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => insertMarkdown('bold')} title="Bold">
                      <Bold size={14} />
                    </button>
                    <button type="button" className="icon-btn" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => insertMarkdown('italic')} title="Italic">
                      <Italic size={14} />
                    </button>
                    <button type="button" className="icon-btn" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => insertMarkdown('bullet')} title="Bullet list">
                      <List size={14} />
                    </button>
                    <button type="button" className="icon-btn" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => insertMarkdown('ordered')} title="Numbered list">
                      <ListOrdered size={14} />
                    </button>
                    <button type="button" className="icon-btn" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => insertMarkdown('code')} title="Code">
                      <Code size={14} />
                    </button>
                    <button type="button" className="icon-btn" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => insertMarkdown('link')} title="Link">
                      <Link2 size={14} />
                    </button>
                    <button
                      type="button"
                      className={`all-trips-nav-btn ${isPreviewingNotes ? 'active' : ''}`}
                      style={{ padding: '4px 12px', fontSize: '12px', height: '32px', marginLeft: '4px' }}
                      onClick={() => setIsPreviewingNotes(!isPreviewingNotes)}
                    >
                      {isPreviewingNotes ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span style={{ marginLeft: '4px' }}>{isPreviewingNotes ? 'Edit' : 'Preview'}</span>
                    </button>
                  </div>
                </div>

                {isPreviewingNotes ? (
                  <div
                    className="form-input"
                    style={{
                      minHeight: isNote ? '130px' : '90px',
                      backgroundColor: 'var(--bg-subtle)',
                      padding: '10px 14px',
                      lineHeight: '1.6',
                    }}
                  >
                    {notes.trim() ? (
                      <MarkdownText text={notes} />
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '12px' }}>
                        Type your notes above to see live formatted preview...
                      </span>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={isNote ? 5 : 3}
                    placeholder={
                      isNote
                        ? 'Write your notes with **bold**, *italic*, - bullet lists, or links...\ne.g. - Buy Metro 24h pass at station\n- Pre-booked Shibuya Sky voucher on phone\n- Recommended dinner: Uobei Sushi'
                        : 'e.g. **Dress code**: Smart casual. - Try the matcha latte - Pre-booked tickets required'
                    }
                    className="form-input text-xs"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                )}
              </div>
            </>
          )}

          <div className="modal-actions-row mt-3">
            <button
              type="button"
              className="secondary-action-btn flex-1"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="primary-modal-btn flex-1">
              <Plus size={15} />
              <span>
                {isNote ? `Add Note to Day ${dayNumber}` : `Add to Day ${dayNumber}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
