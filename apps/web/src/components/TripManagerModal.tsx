import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { Trip } from '../types/trip';
import { CreateTripParams } from '../hooks/useVault';

interface TripManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  activeTrip: Trip;
  onSwitchTrip: (tripId: string) => void;
  onCreateTrip: (params: CreateTripParams) => void;
  onUpdateTrip: (updated: Partial<Trip>) => void;
  onDeleteTrip: (tripId: string) => void;
}

export const TripManagerModal: React.FC<TripManagerModalProps> = ({
  isOpen,
  onClose,
  trips,
  activeTrip,
  onSwitchTrip,
  onCreateTrip,
  onUpdateTrip,
  onDeleteTrip,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('21:00');

  // Edit active trip state
  const [editTitle, setEditTitle] = useState(activeTrip.title);
  const [editDestination, setEditDestination] = useState(activeTrip.destination);
  const [editStartDate, setEditStartDate] = useState(activeTrip.startDate || '');
  const [editEndDate, setEditEndDate] = useState(activeTrip.endDate || '');
  const [editStartTime, setEditStartTime] = useState(activeTrip.startTime || '09:00');
  const [editEndTime, setEditEndTime] = useState(activeTrip.endTime || '21:00');

  useEffect(() => {
    setEditTitle(activeTrip.title);
    setEditDestination(activeTrip.destination);
    setEditStartDate(activeTrip.startDate || '');
    setEditEndDate(activeTrip.endDate || '');
    setEditStartTime(activeTrip.startTime || '09:00');
    setEditEndTime(activeTrip.endTime || '21:00');
  }, [activeTrip]);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDestination.trim()) return;

    onCreateTrip({
      title: newTitle.trim(),
      destination: newDestination.trim(),
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
      startTime: newStartTime || undefined,
      endTime: newEndTime || undefined,
    });

    // Reset and close
    setNewTitle('');
    setNewDestination('');
    setNewStartDate('');
    setNewEndDate('');
    setViewMode('list');
    onClose();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const datesStr =
      editStartDate && editEndDate ? `${editStartDate} – ${editEndDate}` : activeTrip.dates;

    onUpdateTrip({
      title: editTitle.trim() || activeTrip.title,
      destination: editDestination.trim() || activeTrip.destination,
      startDate: editStartDate || undefined,
      endDate: editEndDate || undefined,
      startTime: editStartTime || undefined,
      endTime: editEndTime || undefined,
      dates: datesStr,
    });

    setViewMode('list');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card trip-manager-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="auth-header-icon">
              <Compass size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">
                {viewMode === 'list' && 'Your Travel Vault Trips'}
                {viewMode === 'create' && 'Plan a New Trip'}
                {viewMode === 'edit' && 'Edit Trip Details & Schedule'}
              </h3>
              <p className="modal-subtitle">
                {viewMode === 'list' && `${trips.length} itineraries in your vault`}
                {viewMode === 'create' && 'Set custom destination, dates, and times'}
                {viewMode === 'edit' && `Adjust dates and timing for ${activeTrip.title}`}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="trip-manager-nav">
          <button
            className={`trip-nav-tab ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('list');
              setDeleteConfirmId(null);
            }}
          >
            All Trips ({trips.length})
          </button>
          <button
            className={`trip-nav-tab ${viewMode === 'create' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('create');
              setDeleteConfirmId(null);
            }}
          >
            <Plus size={13} />
            <span>Create Trip</span>
          </button>
          <button
            className={`trip-nav-tab ${viewMode === 'edit' ? 'active' : ''}`}
            onClick={() => {
              setEditTitle(activeTrip.title);
              setEditDestination(activeTrip.destination);
              setEditStartDate(activeTrip.startDate || '');
              setEditEndDate(activeTrip.endDate || '');
              setEditStartTime(activeTrip.startTime || '09:00');
              setEditEndTime(activeTrip.endTime || '21:00');
              setViewMode('edit');
              setDeleteConfirmId(null);
            }}
          >
            <Settings size={13} />
            <span>Trip Settings</span>
          </button>
        </div>

        {/* VIEW 1: TRIPS LIST */}
        {viewMode === 'list' && (
          <div className="trip-list-container">
            {trips.map((t) => {
              const isActive = t.id === activeTrip.id;
              const totalStops = t.days.reduce((acc, d) => acc + (d.stops?.length || 0), 0);

              return (
                <div
                  key={t.id}
                  className={`trip-item-row ${isActive ? 'active-trip-row' : ''}`}
                >
                  <div
                    className="trip-item-clickable"
                    onClick={() => {
                      onSwitchTrip(t.id);
                      onClose();
                    }}
                  >
                    <div className="trip-item-top">
                      <div className="trip-title-wrapper">
                        <span className="trip-item-title">{t.title}</span>
                        {isActive && <span className="active-badge">Current Trip</span>}
                      </div>
                      <span className="trip-readiness tabular">
                        {t.readinessScore}% ready
                      </span>
                    </div>

                    <div className="trip-item-sub">
                      <span className="trip-sub-pill">
                        <MapPin size={11} />
                        <span>{t.destination}</span>
                      </span>
                      <span className="trip-sub-dot">•</span>
                      <span className="trip-sub-pill">
                        <Calendar size={11} />
                        <span>{t.dates || 'Flexible dates'}</span>
                      </span>
                      {t.startTime && t.endTime && (
                        <>
                          <span className="trip-sub-dot">•</span>
                          <span className="trip-sub-pill">
                            <Clock size={11} />
                            <span>
                              {t.startTime} – {t.endTime}
                            </span>
                          </span>
                        </>
                      )}
                    </div>

                    <div className="trip-item-metrics">
                      <span>{t.days.length} Days</span>
                      <span>·</span>
                      <span>{totalStops} Stops</span>
                      <span>·</span>
                      <span>{t.flights.length} Flights</span>
                    </div>
                  </div>

                  <div className="trip-item-actions">
                    {isActive ? (
                      <span className="current-indicator" title="Currently Viewing">
                        <Check size={16} className="text-emerald" />
                      </span>
                    ) : (
                      <button
                        className="trip-switch-btn"
                        onClick={() => {
                          onSwitchTrip(t.id);
                          onClose();
                        }}
                        title="Switch to this trip"
                      >
                        <span>Switch</span>
                        <ChevronRight size={13} />
                      </button>
                    )}

                    {trips.length > 1 && (
                      <button
                        className="trip-delete-btn"
                        onClick={() =>
                          setDeleteConfirmId(deleteConfirmId === t.id ? null : t.id)
                        }
                        title="Delete trip from vault"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Inline Delete Confirmation */}
                  {deleteConfirmId === t.id && (
                    <div className="trip-delete-confirm-box">
                      <span>Delete &quot;{t.title}&quot; permanently?</span>
                      <div className="confirm-btn-group">
                        <button
                          className="cancel-delete-btn"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="confirm-delete-btn"
                          onClick={() => {
                            onDeleteTrip(t.id);
                            setDeleteConfirmId(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              className="add-new-trip-cta w-full"
              onClick={() => setViewMode('create')}
            >
              <Plus size={16} />
              <span>Create Another Trip</span>
            </button>
          </div>
        )}

        {/* VIEW 2: CREATE TRIP */}
        {viewMode === 'create' && (
          <form onSubmit={handleCreateSubmit} className="trip-form-container">
            <div className="form-group">
              <label className="auth-input-label">Trip Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Summer in Amalfi, Autumn in Kyoto"
                className="auth-text-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="auth-input-label">Destination City & Country *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rome, Italy or Kyoto, Japan"
                className="auth-text-input"
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value)}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="auth-input-label">Start Date</label>
                <input
                  type="date"
                  className="auth-text-input"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="auth-input-label">End Date</label>
                <input
                  type="date"
                  className="auth-text-input"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="auth-input-label">Daily Start Time</label>
                <input
                  type="time"
                  className="auth-text-input"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="auth-input-label">Daily End Time</label>
                <input
                  type="time"
                  className="auth-text-input"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="secondary-action-btn flex-1"
                onClick={() => setViewMode('list')}
              >
                Back to List
              </button>
              <button type="submit" className="primary-modal-btn flex-1">
                <Plus size={15} />
                <span>Initialize Trip</span>
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: EDIT ACTIVE TRIP */}
        {viewMode === 'edit' && (
          <form onSubmit={handleEditSubmit} className="trip-form-container">
            <div className="form-group">
              <label className="auth-input-label">Trip Title</label>
              <input
                type="text"
                required
                className="auth-text-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="auth-input-label">Destination</label>
              <input
                type="text"
                required
                className="auth-text-input"
                value={editDestination}
                onChange={(e) => setEditDestination(e.target.value)}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="auth-input-label">Start Date</label>
                <input
                  type="date"
                  className="auth-text-input"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="auth-input-label">End Date</label>
                <input
                  type="date"
                  className="auth-text-input"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="auth-input-label">Default Start Time</label>
                <input
                  type="time"
                  className="auth-text-input"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="auth-input-label">Default End Time</label>
                <input
                  type="time"
                  className="auth-text-input"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="secondary-action-btn flex-1"
                onClick={() => setViewMode('list')}
              >
                Cancel
              </button>
              <button type="submit" className="primary-modal-btn flex-1">
                <Check size={15} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
