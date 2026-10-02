import React, { useMemo, useState } from 'react';
import {
  Compass,
  Plus,
  
} from 'lucide-react';
import { Trip } from '../types/trip';
import { VaultSession } from '../auth/crypto';
import { CreateTripParams } from '../hooks/useVault';
import { useModalA11y } from '../hooks';
import { Header } from '../components/ui/Header';
import { TripCard } from '../features/trip-management/TripCard';
import { Button } from '../components/ui/Button';
import { Input } from "../components/ui/Input";

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
        {/* Hero Section */}
        <section style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Where to next?
          </h1>
        </section>

        {/* Toolbar & Filter Tabs */}
        <div className="trips-toolbar-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="trips-segmented-control">
            <button
              className={`segment-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Journeys ({trips.length})
            </button>
            <button
              className={`segment-btn ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`segment-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ alignSelf: 'flex-start' }}
          >
            <Plus size={14} style={{ marginRight: '8px' }} />
            <span>Add Journey</span>
          </Button>
        </div>

        {/* Trips Grid */}
        <div className="trips-grid">
          {filteredTrips.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>No journeys found</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Plan your next adventure...</p>
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <span>Create Your First Trip</span>
              </Button>
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
                <Input
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
                <Input
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
                  <Input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <Input
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
                  <Input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Daily Itinerary End Time</label>
                  <Input
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions-row mt-3">
                <Button
                  type="button"
                  className="secondary-action-btn flex-1"
                  onClick={() => setIsCreateModalOpen(false)} variant="secondary"
                >
                  Cancel
                </Button>
                <Button type="submit" className="primary-modal-btn flex-1" variant="primary">
                  <Plus size={15} />
                  <span>Create Journey</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
