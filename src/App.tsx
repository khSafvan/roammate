import React, { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { ListFilter, Map as MapIcon, Sparkles, Zap } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { DaySelector } from './components/DaySelector';
import { DistancePill } from './components/DistancePill';
import { Header } from './components/Header';
import { InteractiveMap } from './components/InteractiveMap';
import { ReadinessModal } from './components/ReadinessModal';
import { StopDetailModal } from './components/StopDetailModal';
import { TimelineCard } from './components/TimelineCard';
import { WeatherBanner } from './components/WeatherBanner';
import { clearVaultSession, getVaultSession, VaultSession } from './auth/crypto';
import { saveItineraryToEdge } from './auth/syncService';
import { mockTripData } from './data/mockTrip';
import { ItineraryStop, TransitLeg, TransitMode, TripDay } from './types/trip';
import {
  computeDistanceKm,
  estimateDurationMins,
  initRustCore,
  isRustReady,
  optimizeRouteTspWasm,
} from './wasm/engine';

export function App() {
  const [trip, setTrip] = useState(mockTripData);
  const [activeDayIdx, setActiveDayIdx] = useState<number>(1); // Day 2 by default
  const [selectedStop, setSelectedStop] = useState<ItineraryStop | null>(null);
  const [isReadinessOpen, setIsReadinessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [vaultSession, setVaultSession] = useState<VaultSession | null>(getVaultSession());
  const [isWasmActive, setIsWasmActive] = useState(false);
  const [transitModes, setTransitModes] = useState<Record<string, TransitMode>>({});
  const [optimizedDays, setOptimizedDays] = useState<Record<string, boolean>>({});
  const [mobileView, setMobileView] = useState<'timeline' | 'map'>('timeline');

  // Initialize Rust WebAssembly module on mount
  useEffect(() => {
    initRustCore().then((ready) => {
      setIsWasmActive(ready && isRustReady());
    });
  }, []);

  // Auto-sync itinerary to edge/local vault whenever trip or session updates
  useEffect(() => {
    if (vaultSession) {
      saveItineraryToEdge(vaultSession.userId, trip);
    }
  }, [trip, vaultSession]);

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

      // Fire confetti for successful optimization
      if (result.minutes_saved > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  }, [activeDay, activeDayIdx]);

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: trip.title,
        text: `Check out our live trip itinerary for ${trip.destination} on MojoLog!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Trip link copied to clipboard!');
    }
  };

  const isDayOptimized = !!optimizedDays[activeDay.id];

  return (
    <div className="app-shell">
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
        onShare={handleShare}
      />

      {/* 2. Horizontal Day Selector Tabs */}
      <DaySelector
        days={trip.days}
        activeDayIndex={activeDayIdx}
        onSelectDay={setActiveDayIdx}
      />

      {/* 3. Mobile View Switcher (Visible only on < 1024px screens) */}
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

      {/* 4. Dual-Pane Responsive Workspace */}
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

      {/* 5. Modals & Drawers */}
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
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default App;
