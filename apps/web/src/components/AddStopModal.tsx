import React, { useState } from 'react';
import { Clock, MapPin, Plus, Sparkles, X } from 'lucide-react';
import { Coordinates, ItineraryStop, StopCategory } from '../types/trip';
import { PlaceSearchInput, PlaceSearchResult } from './PlaceSearchInput';

interface AddStopModalProps {
  isOpen: boolean;
  dayNumber: number;
  themeColor: string;
  defaultStartTime?: string;
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
];

export const AddStopModal: React.FC<AddStopModalProps> = ({
  isOpen,
  dayNumber,
  themeColor,
  defaultStartTime = '10:00 AM',
  fallbackCoordinates = { latitude: 35.6762, longitude: 139.6503 },
  onClose,
  onAddStop,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<StopCategory>('sight');
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [address, setAddress] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState(fallbackCoordinates.latitude.toString());
  const [longitude, setLongitude] = useState(fallbackCoordinates.longitude.toString());

  if (!isOpen) return null;

  const handlePlaceSelect = (place: PlaceSearchResult) => {
    setTitle(place.title);
    if (place.subtitle) setSubtitle(place.subtitle);
    if (place.address) setAddress(place.address);
    if (place.coordinates) {
      setLatitude(place.coordinates.latitude.toFixed(6));
      setLongitude(place.coordinates.longitude.toFixed(6));
    }
    if (place.category) setCategory(place.category);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const lat = parseFloat(latitude) || fallbackCoordinates.latitude;
    const lng = parseFloat(longitude) || fallbackCoordinates.longitude;

    onAddStop({
      title: title.trim(),
      subtitle: subtitle.trim() || `${category.charAt(0).toUpperCase() + category.slice(1)} stop`,
      category,
      startTime: startTime.trim() || defaultStartTime,
      durationMinutes: Math.max(5, durationMinutes || 60),
      coordinates: { latitude: lat, longitude: lng },
      address: address.trim() || 'Address to be confirmed',
      bookingRef: bookingRef.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    // Reset and close
    setTitle('');
    setSubtitle('');
    setCategory('sight');
    setStartTime(defaultStartTime);
    setDurationMinutes(60);
    setAddress('');
    setBookingRef('');
    setNotes('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <div
              className="stop-badge-lg"
              style={{ backgroundColor: themeColor }}
            >
              +
            </div>
            <div>
              <h2 className="modal-title">Add Place to Day {dayNumber}</h2>
              <p className="modal-subtitle">
                Schedule a sight, restaurant, activity, or transit stop
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-content-col">
          {/* Quick Search & Autocomplete */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} style={{ color: themeColor }} />
              <span>Search Place / Autocomplete (OSM Geocoding)</span>
            </label>
            <PlaceSearchInput
              onSelectPlace={handlePlaceSelect}
              placeholder="Search e.g. Louvre, Burj Khalifa, Starbucks..."
            />
          </div>

          {/* Category Chips */}
          <div className="category-chips-select">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`cat-chip-btn ${category === cat.value ? 'selected' : ''}`}
                style={{
                  borderColor: category === cat.value ? themeColor : undefined,
                  backgroundColor: category === cat.value ? `${themeColor}15` : undefined,
                  color: category === cat.value ? themeColor : undefined,
                }}
                onClick={() => setCategory(cat.value)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Title & Subtitle */}
          <div>
            <label className="form-label">Place / Activity Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Senso-ji Temple, Ichiran Ramen"
              className="form-input font-medium"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Subtitle / Brief Description</label>
            <input
              type="text"
              placeholder="e.g. Historic Buddhist temple with vibrant market stalls"
              className="form-input"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>

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
          </div>

          {/* Location / Address */}
          <div>
            <label className="form-label">
              <MapPin size={12} className="inline mr-1" />
              Address or Area
            </label>
            <input
              type="text"
              placeholder="e.g. 2-3-1 Asakusa, Taito City, Tokyo"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Optional Coordinates */}
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

          {/* Booking Ref & Notes */}
          <div className="form-row-2">
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
            <div>
              <label className="form-label">Traveler Note / Tip</label>
              <input
                type="text"
                placeholder="e.g. Entry ticket required, buy online"
                className="form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
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
              <span>Add to Day {dayNumber}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
