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
  Sparkles,
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
import { WeatherBanner } from './components/WeatherBanner';
import { clearVaultSession, getVaultSession, VaultSession } from './auth/crypto';
import { initAccountLifecycle, saveItineraryToEdge } from './auth/syncService';
import { mockTripData } from './data/mockTrip';
import { Expense, Flight, ItineraryStop, TransitLeg, TransitMode, Trip, TripDay } from './types/trip';
import {
  computeDistanceKm,
  estimateDurationMins,
  initRustCore,
  isRustReady,
  optimizeRouteTspWasm,
} from './wasm/engine';

export function App() {
  const [trip, setTrip] = useState<Trip>(mockTripData);
  const [activeTab, setActiveTab] = useState<'timeline' | 'flights' | 'expenses'>('timeline');
  const [activeDayIdx, setActiveDayIdx] = useState<number>(1); // Day 2 by default
  const [selectedStop, setSelectedStop] = useState<ItineraryStop | null>(null);
  const [isReadinessOpen, setIsReadinessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [vaultSession, setVaultSession] = useState<VaultSession | null>(getVaultSession());
  const [isWasmActive, setIsWasmActive] = useState(false);
  const [transitModes, setTransitModes] = useState<Record<string, TransitMode>>({});
  const [optimizedDays, setOptimizedDays] = useState<Record<string, boolean>>({});
  const [mobileView, setMobileView] = useState<'timeline' | 'map'>('timeline');
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Initialize lifecycle & Rust WebAssembly module on mount
  useEffect(() => {
    // 1. Sanitize route: If browser opened at /error, clean URL to / so user never lands in error state
    if (window.location.pathname === '/error') {
      window.history.replaceState({}, '', '/');
    }

    // 2. Initialize 3-month account inactivity auto-pruning
    initAccountLifecycle();

    // 3. Initialize Rust WebAssembly module
    initRustCore().then((ready) => {
      setIsWasmActive(ready && isRustReady());
    });

    // 4. Check if viewing via shared read-only link (?share=...)
    const params = new URLSearchParams(window.location.search);
    if (params.get('share')) {
      setIsReadOnly(true);
    }
  }, []);

  // Auto-sync itinerary to edge/local vault whenever trip or session updates
  useEffect(() => {
    if (vaultSession && !isReadOnly) {
      saveItineraryToEdge(vaultSession.userId, trip);
    }
  }, [trip, vaultSession, isReadOnly]);

  const handleDeleteAccount = useCallback(() => {
    setVaultSession(null);
    setTrip(mockTripData);
    confetti({ particleCount: 30, spread: 40 });
  }, []);

  const activeDay: TripDay = trip.days[activeDayIdx] || trip.days[0];

  // Compute transit legs between consecutive stops using Rust WASM
  const transitLegs = useMemo(() => {
    const legs: TransitLeg[] = [];
    const stops = activeDay.stops;
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];
      const legKey = `${from.id}->${to.id}`;
      const mode = transitModes[legKey] || 'drive';

      const dist = computeDistanceKm(
        from.coordinates.latitude,
        from.coordinates.longitude,
        to.coordinates.latitude,
        to.coordinates.longitude
      );
      const duration = estimateDurationMins(dist, mode);

      legs.push({
        fromStopId: from.id,
        toStopId: to.id,
        mode,
        distanceKm: dist,
        durationMinutes: duration,
        isOutlier: duration > 45 || dist > 20,
      });
    }
    return legs;
  }, [activeDay.stops, transitModes]);

  // Toggle transport mode on click (drive -> walk -> transit -> drive)
  const handleToggleMode = useCallback((leg: TransitLeg) => {
    const modes: TransitMode[] = ['drive', 'walk', 'transit'];
    const currIdx = modes.indexOf(leg.mode);
    const nextMode = modes[(currIdx + 1) % modes.length];
    const key = `${leg.fromStopId}->${leg.toStopId}`;

    setTransitModes((prev) => ({
      ...prev,
      [key]: nextMode,
    }));
  }, []);

  // 1-Click Traveling Salesperson Day Route Optimizer powered by Rust WASM
  const handleOptimizeDay = useCallback(() => {
    const stopsForWasm = activeDay.stops.map((s) => ({
      id: s.id,
      latitude: s.coordinates.latitude,
      longitude: s.coordinates.longitude,
    }));

    const result = optimizeRouteTspWasm(stopsForWasm, 'drive');

    if (result.optimized_ids && result.optimized_ids.length > 0) {
      const idToStopMap = new Map(activeDay.stops.map((s) => [s.id, s]));
      const reorderedStops: ItineraryStop[] = result.optimized_ids
        .map((id, index) => {
          const original = idToStopMap.get(id);
          if (!original) return null;
          return {
            ...original,
            orderIndex: index + 1,
          };
        })
        .filter((s): s is ItineraryStop => s !== null);

      setTrip((prev) => {
        const updatedDays = [...prev.days];
        updatedDays[activeDayIdx] = {
          ...updatedDays[activeDayIdx],
          stops: reorderedStops,
        };
        return {
          ...prev,
          days: updatedDays,
        };
      });

      setOptimizedDays((prev) => ({
        ...prev,
        [activeDay.id]: true,
      }));

      // Fire celebration confetti
      if (result.minutes_saved > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  }, [activeDay, activeDayIdx]);

  // Flight Handlers
  const handleAddFlight = useCallback((flight: Flight) => {
    setTrip((prev) => ({
      ...prev,
      flights: [flight, ...prev.flights],
    }));
  }, []);

  const handleDeleteFlight = useCallback((id: string) => {
    setTrip((prev) => ({
      ...prev,
      flights: prev.flights.filter((f) => f.id !== id),
    }));
  }, []);

  // Expense Handlers
  const handleAddExpense = useCallback((expense: Expense) => {
    setTrip((prev) => ({
      ...prev,
      expenses: [expense, ...prev.expenses],
    }));
  }, []);

  const handleDeleteExpense = useCallback((id: string) => {
    setTrip((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  }, []);

  // Import Handler
  const handleImportSuccess = useCallback((importedTrip: Trip) => {
    setTrip(importedTrip);
    confetti({ particleCount: 100, spread: 80 });
  }, []);

  // Toggle readiness item
  const handleToggleReadinessItem = useCallback((id: string) => {
    setTrip((prev) => {
      const updatedList = prev.readinessChecklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      const completedCount = updatedList.filter((i) => i.completed).length;
      const newScore = Math.round((completedCount / updatedList.length) * 100);

      if (newScore === 100) {
        confetti({ particleCount: 120, spread: 90 });
      }

      return {
        ...prev,
        readinessScore: newScore,
        readinessChecklist: updatedList,
      };
    });
  }, []);

  const isDayOptimized = !!optimizedDays[activeDay.id];

  return (
    <div className="app-shell">
      {/* Read-Only Notice Banner */}
      {isReadOnly && (
        <div className="read-only-banner">
          <span>👀 Viewing shared itinerary in read-only mode</span>
          <button
            className="read-only-exit-btn"
            onClick={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setIsReadOnly(false);
            }}
          >
            Exit Preview
          </button>
        </div>
      )}

      {/* 1. Global Navigation Bar */}
      <Header
        title={trip.title}
        destination={trip.destination}
        dates={trip.dates}
        readinessScore={trip.readinessScore}
        isWasmActive={isWasmActive}
        activeSession={vaultSession}
        onOpenReadiness={() => setIsReadinessOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onShare={() => setIsShareModalOpen(true)}
      />

      {/* Zero-Knowledge Vault Welcome Banner for New Users */}
      {!vaultSession && !isReadOnly && (
        <div className="vault-welcome-banner">
          <div className="welcome-banner-left">
            <span className="welcome-banner-icon">🔐</span>
            <div>
              <strong className="welcome-banner-title">Zero-Knowledge Vault:</strong>
              <span className="welcome-banner-desc">
                {' '}Generate a new 12-word account or restore with your existing key. Inactive accounts auto-expire after 3 months.
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
              <span>Use Old Key</span>
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
            <span>Itinerary & Map</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'flights' ? 'active' : ''}`}
            onClick={() => setActiveTab('flights')}
          >
            <Plane size={15} />
            <span>Flights</span>
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
            title="Export JSON or generate read-only link"
          >
            <Share2 size={14} />
            <span>Export & Share</span>
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
              <span>Timeline & Weather</span>
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

              {/* Weather Prediction Card (TripMojo Contextual Intelligence) */}
              <WeatherBanner
                weather={activeDay.weather}
                themeColor={activeDay.themeColor}
              />

              {/* Itinerary Stream with Distance Connectors */}
              <div className="itinerary-stream">
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

            {/* RIGHT PANE: Interactive Route Map (Wanderlog Spatial Engine) */}
            <section
              className={`map-pane ${mobileView === 'timeline' ? 'mobile-hidden' : ''}`}
            >
              <InteractiveMap
                day={activeDay}
                onSelectStop={setSelectedStop}
                onOptimizeDay={handleOptimizeDay}
                isOptimized={isDayOptimized}
              />
            </section>
          </main>
        </>
      )}

      {/* TAB 2: FLIGHT BOARDING PASSES */}
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
        onLoginSuccess={(session) => {
          setVaultSession(session);
        }}
        onLogout={() => {
          clearVaultSession();
          setVaultSession(null);
        }}
        onDeleteAccount={handleDeleteAccount}
        onClose={() => setIsAuthOpen(false)}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        trip={trip}
        onImportSuccess={handleImportSuccess}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}

export default App;
