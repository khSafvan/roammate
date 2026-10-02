import React, { useMemo, useState } from 'react';
import {
  Compass,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Trip } from '../types/trip';
import { VaultSession } from '../auth/crypto';
import { CreateTripParams } from '../hooks/useVault';
import { useModalA11y } from '../hooks';
import { Header } from '../components/ui/Header';
import { TripCard } from '../features/trip-management/TripCard';

interface TripsListPageProps {
  trips: Trip[];
  activeTripId: string;
  vaultSession: VaultSession | null;
  onSelectTrip: (tripId: string) => void;
  onOpenSettings: (tripId: string) => void;
  onShareTrip: (trip: Trip) => void;
  onCreateTrip: (params: CreateTripParams) => void;
  onDeleteTrip: (tripId: string) => void;
  
  onLogout?: () => void;
}

export const TripsListPage: React.FC<TripsListPageProps> = ({
  trips,
  activeTripId,
  vaultSession,
  onSelectTrip,
  onOpenSettings,
  onShareTrip,
  onCreateTrip,
  onDeleteTrip,

  onLogout,
}) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useModalA11y(isCreateModalOpen, () => setIsCreateModalOpen(false));

  // Form states for creating a new trip
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');

  // Filter trips
  const filteredTrips = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTs = Date.parse(todayStr);

    if (filter === 'upcoming') {
      return trips.filter((t) => {
        if (!t.endDate) return true;
        const endTs = Date.parse(t.endDate);
        return isNaN(endTs) ? t.endDate >= todayStr : endTs >= todayTs;
      });
    }
    if (filter === 'completed') {
      return trips.filter((t) => {
        if (!t.endDate) return false;
        const endTs = Date.parse(t.endDate);
        return isNaN(endTs) ? t.endDate < todayStr : endTs < todayTs;
      });
    }
    return trips;
  }, [trips, filter]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim()) return;

    onCreateTrip({
      title: title.trim(),
      destination: destination.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    });

    setTitle('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setStartTime('09:00 AM');
    setEndTime('09:00 PM');
    setIsCreateModalOpen(false);
  };

  return (
    <div className="trips-dashboard-root">
      {/* Top Header */}
      <Header
        
        tripsCount={trips.length}
        activeSession={vaultSession}
        
        onLogout={onLogout}
        onOpenCreateTrip={() => setIsCreateModalOpen(true)}
      />

      {/* Main Content Workspace */}
      <main className="trips-dashboard-container">
        {/* Hero Banner */}
        <section className="trips-hero-card">
          <div className="trips-hero-content">
            <div className="hero-eyebrow">
              <Sparkles size={14} className="text-blue" />
              <span>Your Personal Travel Vault</span>
            </div>
            <h1 className="trips-hero-title">Where to next?</h1>
            <p className="trips-hero-desc">
              Organize multi-modal itineraries, flight passes, hotel check-ins, and expenses in one secure, zero-knowledge vault.
            </p>

            <div className="trips-stats-strip">
              <div className="trips-stat-item">
                <span className="stat-number tabular">{trips.length}</span>
                <span className="stat-label">Total Journeys</span>
              </div>
              <div className="trips-stat-divider" />
              <div className="trips-stat-item">
                <span className="stat-number tabular">
                  {trips.reduce((acc, t) => acc + (t.days?.length || 0), 0)}
                </span>
                <span className="stat-label">Itinerary Days</span>
              </div>
              <div className="trips-stat-divider" />
              <div className="trips-stat-item">
                <span className="stat-number tabular">
                  {trips.reduce((acc, t) => acc + (t.flights?.length || 0), 0)}
                </span>
                <span className="stat-label">Flight Tickets</span>
              </div>
            </div>
          </div>
        </section>

        {/* Toolbar & Filter Tabs */}
        <div className="trips-toolbar-row">
          <div className="trips-filter-tabs">
            <button
              className={`trip-filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Journeys ({trips.length})
            </button>
            <button
              className={`trip-filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`trip-filter-tab ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
          </div>

          <button
            className="secondary-action-btn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={14} />
            <span>Add Journey</span>
          </button>
        </div>

        {/* Trips Grid */}
        <div className="trips-grid">
          {filteredTrips.length === 0 ? (
            <div className="trips-empty-state">
              <Compass size={40} className="text-slate" />
              <h3>No journeys found</h3>
              <p>Start by planning your first destination or import an itinerary file.</p>
              <button
                className="primary-action-btn mt-3"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={15} />
                <span>Create Your First Trip</span>
              </button>
            </div>
          ) : (
            filteredTrips.map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                isActive={t.id === activeTripId}
                canDelete={trips.length > 1}
                isDeleteConfirming={deleteConfirmId === t.id}
                onSelectTrip={onSelectTrip}
                onOpenSettings={onOpenSettings}
                onShareTrip={onShareTrip}
                onDeleteTrip={onDeleteTrip}
                onToggleDeleteConfirm={(id) => setDeleteConfirmId(id)}
              />
            ))
          )}
        </div>
      </main>

      {/* Create New Trip Modal */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '540px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-trip-modal-title"
          >
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="auth-header-icon">
                  <Compass size={18} className="text-blue" />
                </div>
                <div>
                  <h3 id="create-trip-modal-title" className="modal-title">Plan a New Journey</h3>
                  <p className="modal-subtitle">
                    Create a customized multi-modal itinerary vault
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="auth-content-col">
              <div>
                <label className="form-label">Trip Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer in Amalfi Coast, Autumn in Kyoto"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Destination City &amp; Country *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kyoto, Japan or Amalfi, Italy"
                  className="form-input"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Daily Itinerary Start Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Daily Itinerary End Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions-row mt-3">
                <button
                  type="button"
                  className="secondary-action-btn flex-1"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-modal-btn flex-1">
                  <Plus size={15} />
                  <span>Create Journey</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
