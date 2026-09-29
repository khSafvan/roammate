import React, { useEffect, useState } from 'react';
import { Bold, Clock, Code, Eye, EyeOff, Italic, Link2, List, ListOrdered, MapPin, Plus, Sparkles, X } from 'lucide-react';
import { Coordinates, ItineraryStop, StopCategory } from '../types/trip';
import { PlaceSearchInput, PlaceSearchResult } from './PlaceSearchInput';
import { MarkdownText } from './MarkdownText';

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
}

const CATEGORIES: { label: string; value: StopCategory; icon: string }[] = [
  { label: 'Sight & Attraction', value: 'sight', icon: '🏛️' },
  { label: 'Food & Dining', value: 'dining', icon: '🍜' },
  { label: 'Hotel & Stay', value: 'lodging', icon: '🏨' },
  { label: 'Transit & Transfer', value: 'transit', icon: '🚆' },
  { label: 'Flight', value: 'flight', icon: '✈️' },
  { label: 'Note & Tip', value: 'note', icon: '📝' },
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
  const [category, setCategory] = useState<StopCategory>(defaultCategory);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [address, setAddress] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState(fallbackCoordinates.latitude.toString());
  const [longitude, setLongitude] = useState(fallbackCoordinates.longitude.toString());
  const [isPreviewingNotes, setIsPreviewingNotes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setStartTime(defaultStartTime);
      setTitle('');
      setSubtitle('');
      setAddress('');
      setBookingRef('');
      setNotes('');
      setDurationMinutes(defaultCategory === 'note' ? 0 : 60);
      setIsPreviewingNotes(false);
    }
  }, [isOpen, defaultCategory, defaultStartTime]);

  if (!isOpen) return null;

  const handlePlaceSelect = (place: PlaceSearchResult) => {
    setTitle(place.title);
    if (place.subtitle) setSubtitle(place.subtitle);
    if (place.address) setAddress(place.address);
    if (place.coordinates) {
      setLatitude(place.coordinates.latitude.toFixed(6));
      setLongitude(place.coordinates.longitude.toFixed(6));
    }
    if (place.category && category !== 'lodging' && category !== 'flight') {
      setCategory(place.category);
    }
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
    });

    onClose();
  };

  const isNote = category === 'note';
  const isHotel = category === 'lodging';
  const isFlight = category === 'flight';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '100%' }}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <div
              className="stop-badge-lg"
              style={{
                backgroundColor: isNote ? 'var(--brand-amber)' : themeColor,
              }}
            >
              {isNote ? '📝' : isHotel ? '🏨' : isFlight ? '✈️' : '+'}
            </div>
            <div>
              <h2 className="modal-title">
                {isNote
                  ? `Add Note to Day ${dayNumber}`
                  : isHotel
                  ? `Add Hotel / Stay to Day ${dayNumber}`
                  : isFlight
                  ? `Add Flight to Day ${dayNumber}`
                  : `Add Place to Day ${dayNumber}`}
              </h2>
              <p className="modal-subtitle">
                {isNote
                  ? 'Add formatted tips, reminders, instructions, or packing notes'
                  : isHotel
                  ? 'Search and schedule your hotel, accommodation, or check-in'
                  : isFlight
                  ? 'Add your flight schedule, terminal, and boarding reference'
                  : 'Search places with Google Places/OSM and schedule your itinerary'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
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
                }}
                onClick={() => setCategory(cat.value)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Search & Autocomplete (for places, hotels, and sights) */}
          {!isNote && (
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} style={{ color: themeColor }} />
                <span>
                  {isHotel
                    ? 'Search Hotel / Accommodation (Google Places & OSM)'
                    : isFlight
                    ? 'Search Airport / Transit Hub (Google Places & OSM)'
                    : 'Search Place / Autocomplete (Google Places & OSM)'}
                </span>
              </label>
              <PlaceSearchInput
                onSelectPlace={handlePlaceSelect}
                searchContext={destination}
                placeholder={
                  isHotel
                    ? 'Search hotel e.g. Hilton Tokyo, Park Hyatt, Hotel Gracery...'
                    : isFlight
                    ? 'Search airport e.g. Haneda Airport, JFK Terminal 4, Heathrow...'
                    : 'Search e.g. Louvre, Shibuya Sky, Senso-ji, Starbucks...'
                }
              />
            </div>
          )}

          {/* Title & Subtitle */}
          <div>
            <label className="form-label">
              {isNote
                ? 'Note Topic / Heading (Optional)'
                : isHotel
                ? 'Hotel / Accommodation Name *'
                : isFlight
                ? 'Flight / Carrier (e.g. Flight JL005) *'
                : 'Place / Activity Title *'}
            </label>
            <input
              type="text"
              required={!isNote}
              placeholder={
                isNote
                  ? 'e.g. Metro Transfer Tips, Souvenir Shopping Checklist'
                  : isHotel
                  ? 'e.g. Hotel Gracery Shinjuku'
                  : isFlight
                  ? 'e.g. Japan Airlines JL005'
                  : 'e.g. Senso-ji Temple, Ichiran Ramen'
              }
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
                placeholder={
                  isHotel
                    ? 'e.g. 4-star stay in Shinjuku near East Exit'
                    : 'e.g. Historic Buddhist temple with lively market street'
                }
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
                {isHotel ? 'Check-in Time' : isFlight ? 'Departure Time' : 'Scheduled Start Time'}
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
                <label className="form-label">
                  {isHotel ? 'Duration / Stay (Mins)' : 'Duration (Minutes)'}
                </label>
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

          {/* Location / Address (Omitted for standalone notes) */}
          {!isNote && (
            <div>
              <label className="form-label">
                <MapPin size={12} className="inline mr-1" />
                {isHotel ? 'Hotel Address & City' : 'Address or Area'}
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

          {/* Optional Coordinates (Hidden for notes) */}
          {!isNote && (
            <div className="form-row-2">
              <div>
                <label className="form-label text-xs">Latitude (GPS)</label>
                <input
                  type="text"
                  placeholder="35.6762"
                  className="form-input text-xs font-mono"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label text-xs">Longitude (GPS)</label>
                <input
                  type="text"
                  placeholder="139.6503"
                  className="form-input text-xs font-mono"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Booking Ref */}
          <div>
            <label className="form-label">
              {isHotel ? 'Hotel Confirmation Code / Booking Ref' : isFlight ? 'PNR / Booking Reference' : 'Booking Confirmation (Optional)'}
            </label>
            <input
              type="text"
              placeholder={isHotel ? 'e.g. HTR-88192' : isFlight ? 'e.g. JL-992K' : 'e.g. RES-9982'}
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
              {/* Markdown Toolbar & Preview Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '24px', height: '24px', padding: 0 }}
                  onClick={() => insertMarkdown('bold')}
                  title="Bold (**text**)"
                >
                  <Bold size={12} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '24px', height: '24px', padding: 0 }}
                  onClick={() => insertMarkdown('italic')}
                  title="Italic (*text*)"
                >
                  <Italic size={12} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '24px', height: '24px', padding: 0 }}
                  onClick={() => insertMarkdown('bullet')}
                  title="Bullet list (- item)"
                >
                  <List size={12} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '24px', height: '24px', padding: 0 }}
                  onClick={() => insertMarkdown('ordered')}
                  title="Numbered list (1. item)"
                >
                  <ListOrdered size={12} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '24px', height: '24px', padding: 0 }}
                  onClick={() => insertMarkdown('code')}
                  title="Inline code (`code`)"
                >
                  <Code size={12} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '24px', height: '24px', padding: 0 }}
                  onClick={() => insertMarkdown('link')}
                  title="Link ([title](url))"
                >
                  <Link2 size={12} />
                </button>
                <button
                  type="button"
                  className={`all-trips-nav-btn ${isPreviewingNotes ? 'active' : ''}`}
                  style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                  onClick={() => setIsPreviewingNotes(!isPreviewingNotes)}
                >
                  {isPreviewingNotes ? <EyeOff size={11} /> : <Eye size={11} />}
                  <span>{isPreviewingNotes ? 'Edit' : 'Preview'}</span>
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
                {isNote ? `Add Note to Day ${dayNumber}` : isHotel ? `Add Hotel to Day ${dayNumber}` : `Add to Day ${dayNumber}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
