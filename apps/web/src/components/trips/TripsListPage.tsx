import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Key,
  Lock,
  MapPin,
  Plane,
  Plus,
  Settings,
  Share2,
  Sparkles,
  Ticket,
  Trash2,
  Users,
} from 'lucide-react';
import { Trip } from '../../types/trip';
import { formatAccountId, VaultSession } from '../../auth/crypto';
import { CreateTripParams } from '../../hooks/useVault';

interface TripsListPageProps {
  trips: Trip[];
  activeTripId: string;
  vaultSession: VaultSession | null;
  isWasmActive: boolean;
  onSelectTrip: (tripId: string) => void;
  onOpenSettings: (tripId: string) => void;
  onShareTrip: (trip: Trip) => void;
  onCreateTrip: (params: CreateTripParams) => void;
  onDeleteTrip: (tripId: string) => void;
  onOpenAuth: () => void;
}

export const TripsListPage: React.FC<TripsListPageProps> = ({
  trips,
  activeTripId,
  vaultSession,
  isWasmActive,
  onSelectTrip,
  onOpenSettings,
  onShareTrip,
  onCreateTrip,
  onDeleteTrip,
  onOpenAuth,
}) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    setIsCreateModalOpen(false);
  };

  return (
    <div className="trips-dashboard-root">
      {/* Top Header */}
      <header className="header-root">
        <div className="header-container">
          <div className="header-left">
            <div className="header-brand">
              <span className="brand-logo">✈️</span>
              <span className="brand-name">roammate</span>
              {isWasmActive && (
                <span className="wasm-badge" title="Core math & route optimization running on WebAssembly compiled from Rust">
                  <Cpu size={12} strokeWidth={1.75} />
                  <span>Rust WASM</span>
                </span>
              )}
            </div>
            <div className="trips-hub-tag">
              <Compass size={13} className="text-blue" />
              <span>Travel Vault</span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className={`vault-auth-btn ${vaultSession ? 'authenticated' : ''}`}
              onClick={onOpenAuth}
              title={vaultSession ? 'Vault Authenticated' : 'Connect Vault'}
            >
              {vaultSession ? (
                <>
                  <Lock size={13} strokeWidth={1.75} className="text-emerald" />
                  <span className="vault-btn-text">{formatAccountId(vaultSession.userId)}</span>
                </>
              ) : (
                <>
                  <Key size={13} strokeWidth={1.75} className="text-amber" />
                  <span className="vault-btn-text">Connect Vault</span>
                </>
              )}
            </button>

            <button
              className="primary-action-btn"
              onClick={() => setIsCreateModalOpen(true)}
              title="Plan a new journey"
            >
              <Plus size={15} />
              <span>Plan New Trip</span>
            </button>
          </div>
        </div>
      </header>

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
              Organize multi-modal itineraries, companion flight passes, hotel check-ins, and shared expenses in one secure, zero-knowledge vault.
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
            filteredTrips.map((t) => {
              const totalStops = t.days.reduce((acc, d) => acc + (d.stops?.length || 0), 0);
              const totalReservations = (t.flights?.length || 0) + (t.documents?.length || 0);
              const isActive = t.id === activeTripId;

              // Extract companion names from flights
              const companionNames = Array.from(
                new Set(t.flights.map((f) => f.passengerName).filter(Boolean))
              );

              return (
                <div
                  key={t.id}
                  className={`trip-card-root ${isActive ? 'is-active-trip' : ''}`}
                >
                  {/* Card Cover Strip */}
                  <div
                    className="trip-card-cover-bar"
                    style={{ backgroundColor: t.days?.[0]?.themeColor || '#3B82F6' }}
                  />

                  <div className="trip-card-body">
                    {/* Header */}
                    <div className="trip-card-header">
                      <div className="trip-card-header-main">
                        <span className="trip-destination-pill">
                          <MapPin size={11} />
                          <span>{t.destination}</span>
                        </span>
                        <h2 className="trip-card-heading">{t.title}</h2>
                      </div>

                      <div className="trip-readiness-pill">
                        <CheckCircle2 size={13} className="text-emerald" />
                        <span className="tabular">{t.readinessScore}%</span>
                      </div>
                    </div>

                    {/* Dates & Times */}
                    <div className="trip-card-meta-row">
                      <div className="trip-meta-item">
                        <Calendar size={13} className="text-slate" />
                        <span>{t.dates || 'Dates not set'}</span>
                        {t.days?.length > 0 && (
                          <span className="days-count-pill">{t.days.length}d</span>
                        )}
                      </div>

                      {t.startTime && t.endTime && (
                        <div className="trip-meta-item">
                          <Clock size={12} className="text-slate" />
                          <span>
                            {t.startTime} – {t.endTime}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Companions row if present */}
                    {companionNames.length > 0 && (
                      <div className="trip-companions-row">
                        <Users size={12} className="text-slate" />
                        <span className="companions-label">Travelers:</span>
                        <div className="companion-tags-group">
                          {companionNames.slice(0, 3).map((name) => (
                            <span key={name} className="companion-tag">
                              {name}
                            </span>
                          ))}
                          {companionNames.length > 3 && (
                            <span className="companion-tag-more">
                              +{companionNames.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metrics Pills */}
                    <div className="trip-card-metrics-strip">
                      <span className="metric-tag">
                        <strong>{totalStops}</strong> stops
                      </span>
                      <span className="metric-tag">
                        <Plane size={11} />
                        <strong>{t.flights.length}</strong> flights
                      </span>
                      {totalReservations > t.flights.length && (
                        <span className="metric-tag">
                          <Ticket size={11} />
                          <strong>{totalReservations}</strong> vouchers
                        </span>
                      )}
                      <span className="metric-tag currency font-mono">
                        {t.baseCurrency || 'USD'}
                      </span>
                    </div>

                    {/* Delete confirmation if active */}
                    {deleteConfirmId === t.id && (
                      <div className="trip-card-delete-prompt">
                        <span>Delete this trip permanently?</span>
                        <div className="flex items-center gap-2">
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

                    {/* Actions Row */}
                    <div className="trip-card-actions-row">
                      <button
                        className="open-trip-primary-btn"
                        onClick={() => onSelectTrip(t.id)}
                        title="Open trip itinerary and spatial route map"
                      >
                        <span>Open Journey</span>
                        <span className="arrow-glyph">→</span>
                      </button>

                      <div className="trip-card-secondary-btns">
                        <button
                          className="card-icon-action-btn"
                          onClick={() => onOpenSettings(t.id)}
                          title="Edit Trip Settings & Schedule"
                        >
                          <Settings size={15} />
                        </button>

                        <button
                          className="card-icon-action-btn"
                          onClick={() => onShareTrip(t)}
                          title="Invite Companions with Secret Guest Link"
                        >
                          <Share2 size={15} />
                        </button>

                        {trips.length > 1 && (
                          <button
                            className="card-icon-action-btn text-rose-hover"
                            onClick={() =>
                              setDeleteConfirmId(deleteConfirmId === t.id ? null : t.id)
                            }
                            title="Delete Trip"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
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
          >
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="auth-header-icon">
                  <Compass size={18} className="text-blue" />
                </div>
                <div>
                  <h3 className="modal-title">Plan a New Journey</h3>
                  <p className="modal-subtitle">
                    Create a customized multi-modal itinerary vault
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
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
