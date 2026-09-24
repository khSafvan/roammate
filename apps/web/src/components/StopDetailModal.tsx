import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  MapPin,
  MoveRight,
  Navigation,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import { ItineraryStop, StopCategory, TripDay } from '../types/trip';

interface StopDetailModalProps {
  stop: ItineraryStop | null;
  themeColor: string;
  days?: TripDay[];
  currentDayId?: string;
  onClose: () => void;
  onUpdateStop?: (stopId: string, updated: Partial<ItineraryStop>) => void;
  onDeleteStop?: (stopId: string) => void;
  onMoveStopToDay?: (stopId: string, targetDayId: string) => void;
  onMoveStopToIdeas?: (stop: ItineraryStop) => void;
}

const CATEGORIES: { label: string; value: StopCategory; icon: string }[] = [
  { label: 'Sight', value: 'sight', icon: '🏛️' },
  { label: 'Dining', value: 'dining', icon: '🍜' },
  { label: 'Lodging', value: 'lodging', icon: '🏨' },
  { label: 'Transit', value: 'transit', icon: '🚆' },
  { label: 'Flight', value: 'flight', icon: '✈️' },
];

export const StopDetailModal: React.FC<StopDetailModalProps> = ({
  stop,
  themeColor,
  days = [],
  currentDayId,
  onClose,
  onUpdateStop,
  onDeleteStop,
  onMoveStopToDay,
  onMoveStopToIdeas,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<StopCategory>('sight');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [address, setAddress] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [notes, setNotes] = useState('');

  // Sync state whenever stop changes
  useEffect(() => {
    if (stop) {
      setTitle(stop.title || '');
      setSubtitle(stop.subtitle || '');
      setCategory(stop.category || 'sight');
      setStartTime(stop.startTime || '');
      setDurationMinutes(stop.durationMinutes || 60);
      setAddress(stop.address || '');
      setBookingRef(stop.bookingRef || '');
      setNotes(stop.notes || '');
      setIsEditing(false);
      setIsDeleteConfirming(false);
    }
  }, [stop]);

  if (!stop) return null;

  const handleOpenGoogleMaps = () => {
    const q = encodeURIComponent(`${stop.title}, ${stop.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !onUpdateStop) return;

    onUpdateStop(stop.id, {
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      startTime: startTime.trim() || stop.startTime,
      durationMinutes: Math.max(5, durationMinutes || 60),
      address: address.trim() || stop.address,
      bookingRef: bookingRef.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDeleteStop) {
      onDeleteStop(stop.id);
      onClose();
    }
  };

  const handleMove = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetDayId = e.target.value;
    if (targetDayId === '__ideas__' && onMoveStopToIdeas) {
      onMoveStopToIdeas(stop);
      onClose();
    } else if (targetDayId && onMoveStopToDay) {
      onMoveStopToDay(stop.id, targetDayId);
      onClose();
    }
  };

  const otherDays = days.filter((d) => d.id !== currentDayId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div
              className="stop-badge-lg"
              style={{ backgroundColor: themeColor }}
            >
              {stop.orderIndex}
            </div>
            <div>
              <h2 className="modal-title">{isEditing ? 'Edit Stop' : stop.title}</h2>
              <p className="modal-subtitle">{isEditing ? 'Update stop information' : stop.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!isEditing && onUpdateStop && (
              <button
                className="modal-close-btn"
                onClick={() => setIsEditing(true)}
                title="Edit Stop Details"
              >
                <Edit3 size={15} />
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* EDIT MODE */}
        {isEditing ? (
          <form onSubmit={handleSave} className="auth-content-col">
            {/* Category Select */}
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

            <div>
              <label className="form-label">Title *</label>
              <input
                type="text"
                required
                className="form-input font-medium"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Subtitle</label>
              <input
                type="text"
                className="form-input"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div>
                <label className="form-label">Start Time</label>
                <input
                  type="text"
                  placeholder="09:30 AM or 09:30"
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

            <div>
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div>
                <label className="form-label">Confirmation Ref</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Note / Tip</label>
                <input
                  type="text"
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
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-modal-btn flex-1">
                <Check size={15} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          /* VIEW MODE */
          <>
            {/* Time & Duration row */}
            <div className="detail-meta-pills">
              <div className="detail-pill">
                <Clock size={14} className="text-blue" />
                <span>{stop.startTime}</span>
              </div>
              <div className="detail-pill">
                <Calendar size={14} />
                <span>{stop.durationMinutes} mins scheduled</span>
              </div>
            </div>

            {/* Location & Navigation */}
            <div className="detail-section">
              <div className="section-title-line">
                <MapPin size={14} />
                <span>Location</span>
              </div>
              <p className="detail-address-text">{stop.address}</p>
              <button className="maps-nav-btn" onClick={handleOpenGoogleMaps}>
                <Navigation size={14} />
                <span>Open in Google Maps</span>
                <ExternalLink size={12} />
              </button>
            </div>

            {/* Booking & Ticket Vault */}
            {stop.bookingRef && (
              <div className="detail-section">
                <div className="section-title-line">
                  <QrCode size={14} className="text-emerald" />
                  <span>Verified Reservation</span>
                </div>
                <div className="booking-ref-box">
                  <span className="booking-ref-label">Confirmation Code:</span>
                  <span className="booking-ref-code">{stop.bookingRef}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            {stop.notes && (
              <div className="detail-section">
                <div className="section-title-line">
                  <FileText size={14} className="text-amber" />
                  <span>Traveler Note</span>
                </div>
                <p className="detail-note-text">{stop.notes}</p>
              </div>
            )}

            {/* Move to another day or Ideas bucket selector */}
            {(otherDays.length > 0 || onMoveStopToIdeas) && (
              <div className="detail-section">
                <div className="section-title-line">
                  <MoveRight size={14} className="text-blue" />
                  <span>Move or Unassign Stop</span>
                </div>
                <select
                  className="form-input text-xs"
                  defaultValue=""
                  onChange={handleMove}
                >
                  <option value="" disabled>
                    Move to Day or Ideas...
                  </option>
                  {onMoveStopToIdeas && (
                    <option value="__ideas__">
                      💡 Places to Visit (Ideas Bucket - Unassign)
                    </option>
                  )}
                  {otherDays.map((d) => (
                    <option key={d.id} value={d.id}>
                      Day {d.dayNumber} · {d.title} ({d.dateStr})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Delete confirmation prompt */}
            {isDeleteConfirming ? (
              <div className="trip-delete-confirm-box">
                <span>Delete &quot;{stop.title}&quot; from this day?</span>
                <div className="confirm-btn-group">
                  <button
                    className="cancel-delete-btn"
                    onClick={() => setIsDeleteConfirming(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="confirm-delete-btn"
                    onClick={handleDelete}
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            ) : (
              /* Footer action row */
              <div className="modal-actions-row">
                {onDeleteStop && (
                  <button
                    className="delete-trigger-btn flex-1"
                    onClick={() => setIsDeleteConfirming(true)}
                    title="Delete Stop"
                  >
                    <Trash2 size={14} />
                    <span>Delete Stop</span>
                  </button>
                )}
                <button className="primary-modal-btn flex-1" onClick={onClose}>
                  Done
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
