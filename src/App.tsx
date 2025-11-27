import React, { useCallback, useState } from 'react';
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
import { clearVaultSession } from './auth/crypto';
import { mockTripData } from './data/mockTrip';
import { Expense, Flight, ItineraryStop, Trip, TripDay } from './types/trip';
import {
  useRustCore,
  useTransitLegs,
  useTripOptimization,
  useVault,
} from './hooks';

export function App() {
  const [trip, setTrip] = useState<Trip>(mockTripData);
  const [activeTab, setActiveTab] = useState<'timeline' | 'flights' | 'expenses'>('timeline');
  const [activeDayIdx, setActiveDayIdx] = useState<number>(1); // Day 2 by default
  const [selectedStop, setSelectedStop] = useState<ItineraryStop | null>(null);
  const [isReadinessOpen, setIsReadinessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'timeline' | 'map'>('timeline');

  // Modular custom hooks for vault lifecycle, WASM readiness, transit calculation, and route optimization
  const { vaultSession, setVaultSession, isReadOnly, handleDeleteAccount, exitReadOnly } =
    useVault(trip, setTrip);
  const isWasmActive = useRustCore();

  const activeDay: TripDay = trip.days[activeDayIdx] || trip.days[0];
  const { transitLegs, handleToggleMode } = useTransitLegs(activeDay.stops);
  const { isDayOptimized, handleOptimizeDay } = useTripOptimization(
    activeDay,
    activeDayIdx,
    setTrip
  );

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

  return (
    <div className="app-shell">
      {/* Read-Only Notice Banner */}
      {isReadOnly && (
        <div className="read-only-banner">
          <span>👀 Viewing shared itinerary in read-only mode</span>
          <button className="read-only-exit-btn" onClick={exitReadOnly}>
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
