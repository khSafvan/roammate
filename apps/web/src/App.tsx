import React, { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  Key,
  ListFilter,
  Map as MapIcon,
  Plane,
  Receipt,
  Share2,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { DaySelector } from './components/DaySelector';
import { DistancePill } from './components/DistancePill';
import { ExpenseTracker } from './components/ExpenseTracker';
import { FlightTracker } from './components/FlightTracker';
import { Header } from './components/Header';
import { InteractiveMap } from './components/InteractiveMap';
import { ReadinessModal } from './components/ReadinessModal';
import { ShareModal } from './components/ShareModal';
import { StopDetailModal } from './components/StopDetailModal';
import { TimelineCard } from './components/TimelineCard';
import { TimelineFlightCard } from './components/TimelineFlightCard';
import { TripManagerModal } from './components/TripManagerModal';
import { WeatherBanner } from './components/WeatherBanner';
import { clearVaultSession, getVaultSession } from './auth/crypto';
import { Expense, Flight, ItineraryStop, Trip, TripDay } from './types/trip';
import {
  useRustCore,
  useTransitLegs,
  useTripOptimization,
  useVault,
} from './hooks';

export function App() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'flights' | 'expenses'>('timeline');
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0); // Day 1 by default
  const [selectedStop, setSelectedStop] = useState<ItineraryStop | null>(null);
  const [isReadinessOpen, setIsReadinessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTripManagerOpen, setIsTripManagerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'timeline' | 'map'>('timeline');
  const [prefilledUuid, setPrefilledUuid] = useState<string | undefined>(undefined);

  // Multi-trip vault hook managing sessions, multiple trips, switching, and guest access
  const {
    vaultSession,
    setVaultSession,
    trips,
    activeTrip: trip,
    setTrip,
    isReadOnly,
    isGuestMode,
    guestError,
    switchTrip,
    createTrip,
    deleteTrip,
    saveGuestTripToVault,
    handleDeleteAccount,
    exitReadOnly,
  } = useVault();

  const isWasmActive = useRustCore();

  // Check for incoming QR code scan parameter (?account=... or ?vault=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scannedAccount = params.get('account') || params.get('vault');
    if (scannedAccount) {
      const active = getVaultSession();
      // If already logged in as this account, password is NOT needed!
      if (!active || active.userId.toLowerCase() !== scannedAccount.toLowerCase()) {
        // New browser or device: prompt for password with pre-filled UUID
        setPrefilledUuid(scannedAccount);
        setIsAuthOpen(true);
      }
      // Clean URL parameter so it doesn't linger
      params.delete('account');
      params.delete('vault');
      const newSearch = params.toString() ? `?${params.toString()}` : '';
      window.history.replaceState({}, '', `${window.location.pathname}${newSearch}`);
    }
  }, []);

  const activeDay: TripDay =
    trip?.days?.[activeDayIdx] || trip?.days?.[0] || {
      id: 'default_day',
      dayNumber: 1,
      dateStr: trip?.startDate || 'Day 1',
      title: 'Itinerary Day',
      themeColor: '#3B82F6',
      weather: {
        tempC: 22,
        highC: 24,
        lowC: 16,
        condition: 'sunny',
        conditionText: 'Fair',
        rainProbability: 0,
        humidity: 50,
        uvIndex: 4,
        clothingTip: 'Comfortable clothing recommended.',
        hourly: [],
      },
      stops: [],
    };

  const { transitLegs, transitModes, handleToggleMode } = useTransitLegs(activeDay?.stops || []);
  const { isDayOptimized, handleOptimizeDay } = useTripOptimization(
    activeDay,
    activeDayIdx,
    setTrip
  );

  // Filter flights scheduled on the active itinerary day
  const dayFlights = useMemo(() => {
    if (!trip?.flights || trip.flights.length === 0) return [];
    return trip.flights.filter(
      (f) =>
        f.date === activeDay.dateStr ||
        f.date === activeDay.dateStr.replace(/^[A-Za-z]+,\s*/, '') ||
        (activeDayIdx === 0 && (!f.date || f.date.includes('2026-10-14') || f.date.includes('2027-05-10')))
    );
  }, [trip?.flights, activeDay.dateStr, activeDayIdx]);

  // Flight Handlers
  const handleAddFlight = useCallback((flight: Flight) => {
    setTrip((prev) => ({
      ...prev,
      flights: [flight, ...prev.flights],
    }));
  }, [setTrip]);

  const handleDeleteFlight = useCallback((id: string) => {
    setTrip((prev) => ({
      ...prev,
      flights: prev.flights.filter((f) => f.id !== id),
    }));
  }, [setTrip]);

  // Expense Handlers
  const handleAddExpense = useCallback((expense: Expense) => {
    setTrip((prev) => ({
      ...prev,
      expenses: [expense, ...prev.expenses],
    }));
  }, [setTrip]);

  const handleDeleteExpense = useCallback((id: string) => {
    setTrip((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  }, [setTrip]);

  // Import Handler
  const handleImportSuccess = useCallback((importedTrip: Trip) => {
    setTrip(importedTrip);
    confetti({ particleCount: 100, spread: 80 });
  }, [setTrip]);

  // Toggle readiness item
  const handleToggleReadinessItem = useCallback((id: string) => {
    setTrip((prev) => {
      const updatedList = prev.readinessChecklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      const completedCount = updatedList.filter((i) => i.completed).length;
      const newScore = Math.round((completedCount / (updatedList.length || 1)) * 100);

      if (newScore === 100) {
        confetti({ particleCount: 120, spread: 90 });
      }

      return {
        ...prev,
        readinessScore: newScore,
        readinessChecklist: updatedList,
      };
    });
  }, [setTrip]);

  // If a private trip link failed guest verification
  if (guestError) {
    return (
      <div className="guest-error-screen">
        <div className="guest-error-card">
          <div className="guest-error-icon">
            <ShieldAlert size={36} className="text-amber" />
          </div>
          <h2 className="guest-error-title">Private Travel Itinerary</h2>
          <p className="guest-error-message">{guestError}</p>
          <p className="guest-error-hint">
            The organizer has set this trip to invite-only. Please contact the trip creator for an updated secret guest link.
          </p>
          <button className="primary-modal-btn w-full mt-3" onClick={exitReadOnly}>
            <span>Return to My Vault</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Guest Mode Invitation Banner */}
      {isGuestMode && (
        <div className="guest-banner">
          <div className="guest-banner-left">
            <span className="guest-badge">Invited Companion</span>
            <span>You are viewing this itinerary with private guest access.</span>
          </div>
          <div className="guest-banner-actions">
            <button
              className="guest-join-btn"
              onClick={saveGuestTripToVault}
              title="Save a synchronized copy into your own private vault"
            >
              <UserPlus size={13} />
              <span>Join Trip &amp; Save to Vault</span>
            </button>
            <button
              className="guest-create-account-btn"
              onClick={() => setIsAuthOpen(true)}
            >
              <span>Create Account</span>
            </button>
            <button className="read-only-exit-btn" onClick={exitReadOnly}>
              Exit
            </button>
          </div>
        </div>
      )}

      {/* Read-Only Notice Banner (Legacy Share) */}
      {!isGuestMode && isReadOnly && (
        <div className="read-only-banner">
          <span>👀 Viewing shared itinerary in read-only mode</span>
          <button className="read-only-exit-btn" onClick={exitReadOnly}>
            Exit Preview
          </button>
        </div>
      )}

      {/* 1. Global Navigation Bar with Multi-Trip Switcher & Timing Info */}
      <Header
        title={trip.title}
        destination={trip.destination}
        dates={trip.dates}
        startTime={trip.startTime}
        endTime={trip.endTime}
        readinessScore={trip.readinessScore}
        isWasmActive={isWasmActive}
        activeSession={vaultSession}
        tripsCount={trips.length}
        onOpenTripManager={() => setIsTripManagerOpen(true)}
        onOpenReadiness={() => setIsReadinessOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onShare={() => setIsShareModalOpen(true)}
      />

      {/* Zero-Knowledge Vault Welcome Banner for Unauthenticated Users */}
      {!vaultSession && !isReadOnly && !isGuestMode && (
        <div className="vault-welcome-banner">
          <div className="welcome-banner-left">
            <span className="welcome-banner-icon">🔐</span>
            <div>
              <strong className="welcome-banner-title">Private Travel Vault:</strong>
              <span className="welcome-banner-desc">
                {' '}Secure multiple trips with an anonymous Account UUID &amp; Password. Inactive accounts auto-expire after 3 months.
              </span>
            </div>
          </div>
          <div className="welcome-banner-actions">
            <button className="welcome-create-btn" onClick={() => setIsAuthOpen(true)}>
              <Sparkles size={13} />
              <span>Create Account</span>
            </button>
            <button className="welcome-restore-btn" onClick={() => setIsAuthOpen(true)}>
              <Key size={13} />
              <span>Log In</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Navigation Tabs */}
      <nav className="main-nav-bar">
        <div className="nav-tabs-group">
          <button
            className={`nav-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <CalendarDays size={15} />
            <span>Itinerary &amp; Map</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'flights' ? 'active' : ''}`}
            onClick={() => setActiveTab('flights')}
          >
            <Plane size={15} />
            <span>Flights &amp; Tickets</span>
            <span className="nav-counter-pill">{trip.flights.length}</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Receipt size={15} />
            <span>Expenses</span>
            <span className="nav-counter-pill">{trip.expenses.length}</span>
          </button>
        </div>

        <div className="nav-right-actions">
          <button
            className="share-export-nav-btn"
            onClick={() => setIsShareModalOpen(true)}
            title="Invite companion via private link or export JSON"
          >
            <Share2 size={14} />
            <span>Invite &amp; Share</span>
          </button>
        </div>
      </nav>

      {/* 3. TAB CONTENT */}
      {activeTab === 'timeline' && (
        <>
          {/* Horizontal Day Selector Tabs */}
          <DaySelector
            days={trip.days}
            activeDayIndex={activeDayIdx}
            onSelectDay={setActiveDayIdx}
          />

          {/* Mobile View Switcher (Visible on < 1024px screens) */}
          <div className="mobile-view-tabs">
            <button
              className={`mobile-tab-btn ${mobileView === 'timeline' ? 'active' : ''}`}
              onClick={() => setMobileView('timeline')}
            >
              <ListFilter size={16} />
              <span>Timeline &amp; Weather</span>
            </button>
            <button
              className={`mobile-tab-btn ${mobileView === 'map' ? 'active' : ''}`}
              onClick={() => setMobileView('map')}
            >
              <MapIcon size={16} />
              <span>Route Map</span>
            </button>
          </div>

          {/* Dual-Pane Responsive Workspace */}
          <main className="main-workspace">
            {/* LEFT PANE: Day Itinerary & Weather */}
            <section
              className={`timeline-pane ${mobileView === 'map' ? 'mobile-hidden' : ''}`}
            >
              {/* Day Section Header */}
              <div className="day-summary-banner">
                <div>
                  <h2 className="day-heading">{activeDay.title}</h2>
                  <p className="day-subheading">
                    {activeDay.stops.length} destinations scheduled · {activeDay.dateStr}
                    {trip.startTime && trip.endTime ? ` (${trip.startTime} – ${trip.endTime})` : ''}
                  </p>
                </div>

                <button
                  className={`optimize-pill-btn ${isDayOptimized ? 'optimized' : ''}`}
                  onClick={handleOptimizeDay}
                  title="Run 2-opt Traveling Salesperson route optimizer via Rust WebAssembly"
                >
                  {isDayOptimized ? <Zap size={14} /> : <Sparkles size={14} />}
                  <span>{isDayOptimized ? 'Optimized' : 'Optimize Route (WASM)'}</span>
                </button>
              </div>

              {/* Weather Prediction Card */}
              <WeatherBanner
                weather={activeDay.weather}
                themeColor={activeDay.themeColor}
              />

              {/* Itinerary Stream with Distance Connectors and Inbound Flights */}
              <div className="itinerary-stream">
                {/* Airplane / Flight Ticket Integration in Itinerary */}
                {dayFlights.length > 0 && (
                  <TimelineFlightCard
                    flights={dayFlights}
                    themeColor={activeDay.themeColor}
                    onViewFlightsTab={() => setActiveTab('flights')}
                  />
                )}

                {activeDay.stops.map((stop, index) => (
                  <React.Fragment key={stop.id}>
                    <TimelineCard
                      stop={stop}
                      themeColor={activeDay.themeColor}
                      onSelect={setSelectedStop}
                    />

                    {/* Distance & Transit duration connector */}
                    {index < transitLegs.length && (
                      <DistancePill
                        leg={transitLegs[index]}
                        onToggleMode={handleToggleMode}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </section>

            {/* RIGHT PANE: Interactive Route Map */}
            <section
              className={`map-pane ${mobileView === 'timeline' ? 'mobile-hidden' : ''}`}
            >
              <InteractiveMap
                day={activeDay}
                onSelectStop={setSelectedStop}
                onOptimizeDay={handleOptimizeDay}
                isOptimized={isDayOptimized}
                transitModes={transitModes}
              />
            </section>
          </main>
        </>
      )}

      {/* TAB 2: FLIGHT BOARDING PASSES & MULTI-ORIGIN COMPANION TICKETS */}
      {activeTab === 'flights' && (
        <main className="subview-workspace">
          <FlightTracker
            flights={trip.flights}
            onAddFlight={handleAddFlight}
            onDeleteFlight={handleDeleteFlight}
          />
        </main>
      )}

      {/* TAB 3: EXPENSE TRACKER */}
      {activeTab === 'expenses' && (
        <main className="subview-workspace">
          <ExpenseTracker
            expenses={trip.expenses}
            baseCurrency={trip.baseCurrency}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        </main>
      )}

      {/* 4. Modals & Drawers */}
      <TripManagerModal
        isOpen={isTripManagerOpen}
        onClose={() => setIsTripManagerOpen(false)}
        trips={trips}
        activeTrip={trip}
        onSwitchTrip={switchTrip}
        onCreateTrip={createTrip}
        onUpdateTrip={(updated) => setTrip((prev) => ({ ...prev, ...updated }))}
        onDeleteTrip={deleteTrip}
      />

      <ReadinessModal
        isOpen={isReadinessOpen}
        score={trip.readinessScore}
        items={trip.readinessChecklist}
        onToggleItem={handleToggleReadinessItem}
        onClose={() => setIsReadinessOpen(false)}
      />

      <StopDetailModal
        stop={selectedStop}
        themeColor={activeDay.themeColor}
        onClose={() => setSelectedStop(null)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        activeSession={vaultSession}
        prefilledUuid={prefilledUuid}
        onLoginSuccess={(session) => {
          setVaultSession(session);
          setPrefilledUuid(undefined);
        }}
        onLogout={() => {
          clearVaultSession();
          setVaultSession(null);
        }}
        onDeleteAccount={handleDeleteAccount}
        onClose={() => {
          setIsAuthOpen(false);
          setPrefilledUuid(undefined);
        }}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        trip={trip}
        onUpdateTrip={(updated) => setTrip((prev) => ({ ...prev, ...updated }))}
        onImportSuccess={handleImportSuccess}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}

export default App;
