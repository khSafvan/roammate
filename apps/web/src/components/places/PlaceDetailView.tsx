import React, { useState } from 'react';
import {
  ArrowLeft,
  Bold,
  Check,
  Clock,
  Code,
  Copy,
  Edit2,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  Navigation,
  Phone,
  Plus,
  Shirt,
  Sparkles,
  Star,
  Tag,
  Trash2,
} from 'lucide-react';
import { DayWeather, ItineraryStop, Look, StopCategory } from '@roammate/shared';
import { ApiClient } from '@roammate/api-client';
import { MarkdownText } from '../MarkdownText';
import { LookCard } from '../outfits/LookCard';
import { SelectFromWardrobeModal } from '../outfits/SelectFromWardrobeModal';

export interface PlaceDetailViewProps {
  stop: ItineraryStop;
  dayNumber: number;
  themeColor: string;
  weather?: DayWeather;
  look?: Look;
  tripId: string;
  person1Name?: string;
  person2Name?: string;
  apiClient?: ApiClient | null;
  existingLooks?: Look[];
  onBack: () => void;
  onUpdateStop: (stopId: string, updated: Partial<ItineraryStop>) => void;
  onDeleteStop: (stopId: string) => void;
  onSaveLook: (look: Look) => void;
  onDeleteLook: (lookId: string) => void;
}

const CATEGORIES: { label: string; value: StopCategory; icon: string }[] = [
  { label: 'Sight', value: 'sight', icon: '🏛️' },
  { label: 'Dining', value: 'dining', icon: '🍜' },
  { label: 'Lodging', value: 'lodging', icon: '🏨' },
  { label: 'Transit', value: 'transit', icon: '🚆' },
  { label: 'Flight', value: 'flight', icon: '✈️' },
  { label: 'Note & Tip', value: 'note', icon: '📝' },
];

export const PlaceDetailView: React.FC<PlaceDetailViewProps> = ({
  stop,
  dayNumber,
  themeColor,
  weather,
  look,
  tripId,
  person1Name = 'John (Husband)',
  person2Name = 'Jane (Wife)',
  apiClient,
  existingLooks = [],
  onBack,
  onUpdateStop,
  onDeleteStop,
  onSaveLook,
  onDeleteLook,
}) => {
  // General Place Details Edit Mode
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState(stop.title);
  const [editSubtitle, setEditSubtitle] = useState(stop.subtitle);
  const [editCategory, setEditCategory] = useState<StopCategory>(stop.category);
  const [editStartTime, setEditStartTime] = useState(stop.startTime);
  const [editDuration, setEditDuration] = useState(stop.durationMinutes);
  const [editAddress, setEditAddress] = useState(stop.address);
  const [editBookingRef, setEditBookingRef] = useState(stop.bookingRef || '');
  const [editIsFixedTime, setEditIsFixedTime] = useState(Boolean(stop.isFixedTime));

  // Single Note Editing State
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState(stop.notes || '');

  // Wardrobe Selection Modal State
  const [isWardrobeModalOpen, setIsWardrobeModalOpen] = useState(false);

  // Delete Confirmation State
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleOpenGoogleMaps = () => {
    const q = encodeURIComponent(`${stop.title}, ${stop.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  const handleCopyAddress = () => {
    if (!stop.address) return;
    navigator.clipboard.writeText(stop.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    onUpdateStop(stop.id, {
      title: editTitle.trim(),
      subtitle: editSubtitle.trim(),
      category: editCategory,
      startTime: editStartTime.trim() || stop.startTime,
      durationMinutes: Math.max(5, editDuration || 60),
      address: editAddress.trim() || stop.address,
      bookingRef: editBookingRef.trim() || undefined,
      isFixedTime: editIsFixedTime,
    });
    setIsEditingDetails(false);
  };

  const handleSaveNote = () => {
    onUpdateStop(stop.id, {
      notes: draftNote.trim() || undefined,
    });
    setIsEditingNote(false);
  };

  const handleDeleteNote = () => {
    onUpdateStop(stop.id, {
      notes: undefined,
    });
    setDraftNote('');
    setIsEditingNote(false);
  };

  const insertMarkdown = (syntax: 'bold' | 'italic' | 'bullet' | 'ordered' | 'code' | 'link') => {
    switch (syntax) {
      case 'bold':
        setDraftNote((prev) => (prev ? `${prev} **bold text**` : '**bold text**'));
        break;
      case 'italic':
        setDraftNote((prev) => (prev ? `${prev} *italic text*` : '*italic text*'));
        break;
      case 'bullet':
        setDraftNote((prev) => (prev ? `${prev}\n- List item` : '- List item'));
        break;
      case 'ordered':
        setDraftNote((prev) => (prev ? `${prev}\n1. Step one` : '1. Step one'));
        break;
      case 'code':
        setDraftNote((prev) => (prev ? `${prev} \`code\`` : '`code`'));
        break;
      case 'link':
        setDraftNote((prev) => (prev ? `${prev} [Link title](https://example.com)` : '[Link title](https://example.com)'));
        break;
    }
  };

  return (
    <div className="place-detail-pane">
      {/* Top Navigation & Back Action */}
      <div className="place-detail-topbar">
        <button
          type="button"
          className="place-detail-back-btn"
          onClick={onBack}
          title={`Return to Day ${dayNumber} Itinerary`}
        >
          <ArrowLeft size={16} />
          <span>Back to Day {dayNumber} Itinerary</span>
        </button>

        <div className="place-detail-topbar-actions">
          {!isEditingDetails && (
            <button
              type="button"
              className="place-detail-btn-secondary"
              onClick={() => {
                setEditTitle(stop.title);
                setEditSubtitle(stop.subtitle);
                setEditCategory(stop.category);
                setEditStartTime(stop.startTime);
                setEditDuration(stop.durationMinutes);
                setEditAddress(stop.address);
                setEditBookingRef(stop.bookingRef || '');
                setEditIsFixedTime(Boolean(stop.isFixedTime));
                setIsEditingDetails(true);
              }}
              title="Edit place properties"
            >
              <Edit3 size={14} />
              <span>Edit Details</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="place-detail-content">
        {/* Optional Image or Hero Header */}
        {(stop.imageUrl || (stop.photos && stop.photos.length > 0)) && (
          <div className="place-detail-hero">
            <img
              src={stop.imageUrl || (stop.photos ? stop.photos[0] : '')}
              alt={stop.title}
              className="place-detail-hero-img"
            />
          </div>
        )}

        {/* Place Header / Title Block */}
        {!isEditingDetails ? (
          <div className="place-detail-header-block">
            <div className="place-detail-category-row">
              <span className={`place-category-badge cat-${stop.category}`}>
                {stop.category.toUpperCase()}
              </span>
              <span className="place-order-badge">Stop #{String(stop.orderIndex).padStart(2, '0')}</span>
              {stop.isFixedTime && (
                <span className="place-tag-fixed">
                  <Lock size={12} /> Fixed Time
                </span>
              )}
            </div>

            <h1 className="place-detail-title">{stop.title}</h1>
            {stop.subtitle && <p className="place-detail-subtitle">{stop.subtitle}</p>}

            {/* Google Places Key Indicators */}
            <div className="place-detail-rating-tier-row">
              {typeof stop.rating === 'number' && (
                <div className="place-rating-badge" title="Google Places Rating">
                  <Star size={14} className="fill-amber text-amber" />
                  <span className="rating-value">{stop.rating.toFixed(1)}</span>
                  {stop.userRatingsTotal && (
                    <span className="rating-count">({stop.userRatingsTotal.toLocaleString()} reviews)</span>
                  )}
                </div>
              )}

              {typeof stop.priceLevel === 'number' && (
                <div className="place-price-badge" title="Price Level">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span
                      key={i}
                      className={i < (stop.priceLevel || 1) ? 'tier-active' : 'tier-dim'}
                    >
                      $
                    </span>
                  ))}
                </div>
              )}

              {stop.openTime && stop.closeTime && (
                <div className="place-hours-badge">
                  <span className="place-status-dot-open" />
                  <span>Open {stop.openTime} – {stop.closeTime}</span>
                </div>
              )}
            </div>

            {/* Tags & Categories Row */}
            {stop.tags && stop.tags.length > 0 && (
              <div className="place-tags-row">
                {stop.tags.map((tag, i) => (
                  <span key={i} className="place-tag-pill">
                    <Tag size={10} />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Actions Row */}
            <div className="place-detail-quick-actions">
              <button
                type="button"
                className="place-action-pill"
                onClick={handleOpenGoogleMaps}
                title="Search on Google Maps"
              >
                <Navigation size={13} />
                <span>Open in Maps</span>
              </button>

              {stop.website && (
                <a
                  href={stop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="place-action-pill"
                  title="Visit official website"
                >
                  <Globe size={13} />
                  <span>Website</span>
                  <ExternalLink size={11} />
                </a>
              )}

              {stop.phoneNumber && (
                <a
                  href={`tel:${stop.phoneNumber}`}
                  className="place-action-pill"
                  title="Call phone number"
                >
                  <Phone size={13} />
                  <span>{stop.phoneNumber}</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          /* Inline Edit Form for Place Properties */
          <form onSubmit={handleSaveDetails} className="place-edit-form">
            <h3 className="form-section-title">Edit Place Properties</h3>

            <div className="form-field">
              <label className="form-label">Category</label>
              <div className="category-chips-select">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`cat-chip-btn ${editCategory === cat.value ? 'selected' : ''}`}
                    onClick={() => setEditCategory(cat.value)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Title *</label>
              <input
                type="text"
                required
                className="form-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Subtitle / Subcategory</label>
              <input
                type="text"
                className="form-input"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label className="form-label">Start Time</label>
                <input
                  type="text"
                  placeholder="09:30 AM"
                  className="form-input"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  className="form-input"
                  value={editDuration}
                  onChange={(e) => setEditDuration(parseInt(e.target.value, 10) || 60)}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-input"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label className="form-label">Confirmation / Booking Ref</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. RES-94821"
                  value={editBookingRef}
                  onChange={(e) => setEditBookingRef(e.target.value)}
                />
              </div>
              <div className="form-field flex-center-start">
                <label className="form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editIsFixedTime}
                    onChange={(e) => setEditIsFixedTime(e.target.checked)}
                  />
                  <span>Fixed reservation time</span>
                </label>
              </div>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditingDetails(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ backgroundColor: themeColor }}>
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Location & Schedule Info Card */}
        <div className="place-detail-section-card">
          <div className="section-card-header">
            <Clock size={16} className="text-secondary" />
            <span className="section-card-title">Schedule &amp; Logistics</span>
          </div>
          <div className="logistics-grid">
            <div className="logistics-item">
              <span className="logistics-label">Scheduled Time</span>
              <span className="logistics-value">{stop.startTime}</span>
            </div>
            <div className="logistics-item">
              <span className="logistics-label">Duration</span>
              <span className="logistics-value">{stop.durationMinutes} minutes</span>
            </div>
            {stop.bookingRef && (
              <div className="logistics-item">
                <span className="logistics-label">Booking / Confirmation Ref</span>
                <span className="logistics-value font-mono">{stop.bookingRef}</span>
              </div>
            )}
            {stop.address && (
              <div className="logistics-item full-width">
                <span className="logistics-label">Address</span>
                <div className="address-display-row">
                  <span className="logistics-value address-text">{stop.address}</span>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={handleCopyAddress}
                    title="Copy address"
                  >
                    {copiedAddress ? <Check size={13} className="text-green" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PLACE NOTE SECTION: STRICT SINGLE NOTE INVARIANT */}
        <div className="place-detail-section-card">
          <div className="section-card-header justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-amber" />
              <span className="section-card-title">Place Note</span>
            </div>

            {/* Note Actions: Edit existing note or Add note */}
            {!isEditingNote && (
              <div>
                {stop.notes ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="note-action-link"
                      onClick={() => {
                        setDraftNote(stop.notes || '');
                        setIsEditingNote(true);
                      }}
                      title="Edit note"
                    >
                      <Edit2 size={13} />
                      <span>Edit Note</span>
                    </button>
                    <button
                      type="button"
                      className="note-delete-link"
                      onClick={handleDeleteNote}
                      title="Delete note"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="note-add-btn"
                    onClick={() => {
                      setDraftNote('');
                      setIsEditingNote(true);
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Note</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Note Body or Editor */}
          {isEditingNote ? (
            <div className="note-editor-wrapper">
              <div className="markdown-toolbar">
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('bold')} title="Bold">
                  <Bold size={13} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('italic')} title="Italic">
                  <Italic size={13} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('bullet')} title="Bullet list">
                  <List size={13} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('ordered')} title="Numbered list">
                  <ListOrdered size={13} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('code')} title="Code snippet">
                  <Code size={13} />
                </button>
                <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('link')} title="Insert link">
                  <Link2 size={13} />
                </button>
              </div>

              <textarea
                className="note-textarea"
                rows={4}
                placeholder="Write tips, booking notes, or details for this place..."
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                autoFocus
              />

              <div className="note-editor-actions">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setIsEditingNote(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={handleSaveNote}
                  style={{ backgroundColor: themeColor }}
                >
                  Save Note
                </button>
              </div>
            </div>
          ) : stop.notes ? (
            <div className="place-note-body">
              <MarkdownText text={stop.notes} />
            </div>
          ) : (
            <div className="place-note-empty">
              <span>No note added for this place. Click <strong>+ Add Note</strong> above to add helpful tips or reminders.</span>
            </div>
          )}
        </div>

        {/* JOHN & JANE COORDINATED OUTFITS SECTION */}
        <div className="place-detail-section-card">
          <div className="section-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shirt size={16} className="text-secondary" />
              <div>
                <span className="section-card-title">Outfits · {person1Name} &amp; {person2Name}</span>
                <p className="section-card-subtitle">
                  Plan and preview coordinated clothing and looks for this location
                </p>
              </div>
            </div>

            {existingLooks.length > 0 && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setIsWardrobeModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '4px 10px' }}
                title="Select an outfit from your wardrobe capsule"
              >
                <Sparkles size={12} className="text-primary" />
                <span>Pick from Wardrobe</span>
              </button>
            )}
          </div>

          <div className="place-outfit-container">
            <LookCard
              look={look}
              tripId={tripId}
              eventId={stop.id}
              person1Name={person1Name}
              person2Name={person2Name}
              weather={weather}
              apiClient={apiClient}
              existingLooks={existingLooks}
              onSaveLook={onSaveLook}
              onDeleteLook={onDeleteLook}
            />
          </div>
        </div>

        {/* Select From Wardrobe Picker Modal */}
        {isWardrobeModalOpen && (
          <SelectFromWardrobeModal
            isOpen={isWardrobeModalOpen}
            targetDayNumber={dayNumber}
            targetEventId={stop.id}
            targetEventTitle={stop.title}
            availableLooks={existingLooks}
            person1Name={person1Name}
            person2Name={person2Name}
            onSelectLook={(selectedLook, mode) => {
              if (mode === 'assign') {
                onSaveLook({
                  ...selectedLook,
                  dayNumber,
                  eventId: stop.id,
                  updatedAt: Date.now(),
                });
              } else {
                onSaveLook({
                  ...selectedLook,
                  id: `look_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  dayNumber,
                  eventId: stop.id,
                  packed: false,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              }
              setIsWardrobeModalOpen(false);
            }}
            onClose={() => setIsWardrobeModalOpen(false)}
          />
        )}

        {/* DANGER ZONE: DELETE STOP */}
        <div className="place-detail-danger-card">
          {!isDeleteConfirming ? (
            <button
              type="button"
              className="delete-place-btn"
              onClick={() => setIsDeleteConfirming(true)}
            >
              <Trash2 size={14} />
              <span>Delete this place from itinerary</span>
            </button>
          ) : (
            <div className="delete-confirm-box">
              <p className="delete-confirm-text">
                Are you sure you want to remove <strong>{stop.title}</strong> from Day {dayNumber}?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setIsDeleteConfirming(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  onClick={() => onDeleteStop(stop.id)}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
