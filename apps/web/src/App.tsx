import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  FileText,
  Key,
  ListFilter,
  Map as MapIcon,
  Plane,
  Plus,
  Receipt,
  RotateCcw,
  Share2,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus,
  Zap,
} from 'lucide-react';
import { AddStopModal } from './components/AddStopModal';
import { AuthModal } from './components/AuthModal';
import { DaySelector } from './components/DaySelector';
import { DistancePill } from './components/DistancePill';
import { DocumentsAndTicketsHub } from './components/documents/DocumentsAndTicketsHub';
import { ExpenseTracker } from './components/ExpenseTracker';
import { Header } from './components/Header';
import { InteractiveMap } from './components/InteractiveMap';
import { OptimizeRouteModal } from './components/OptimizeRouteModal';
import { PlacesToVisitDrawer } from './components/PlacesToVisitDrawer';
import { PrintTravelPacket } from './components/PrintTravelPacket';
import { ReadinessModal } from './components/ReadinessModal';
import { ScratchpadModal } from './components/ScratchpadModal';
import { ShareModal } from './components/ShareModal';
import { StopDetailModal } from './components/StopDetailModal';
import { TimelineCard } from './components/TimelineCard';
import { TimelineFlightCard } from './components/TimelineFlightCard';
import { TripManagerModal } from './components/TripManagerModal';
import { TripsListPage } from './components/trips/TripsListPage';
import { TripSettingsPage } from './components/trips/TripSettingsPage';
import { WeatherBanner } from './components/WeatherBanner';
import { clearVaultSession, getVaultSession } from './auth/crypto';
import { BookingDocument, Expense, Flight, ItineraryStop, PackingCategory, PackingItem, Trip, TripDay } from './types/trip';
import { detectTransitConflict } from './utils/scheduleConflicts';
import {
  useRustCore,
  useTransitLegs,
  useTripOptimization,
  useVault,
} from './hooks';

export function App() {
  const [currentView, setCurrentView] = useState<'trips_list' | 'trip_detail' | 'trip_settings'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('trip') || params.get('guest') || params.get('share') || params.get('view') === 'detail') {
      return 'trip_detail';
    }
    return 'trips_list';
  });
  const [activeTab, setActiveTab] = useState<'timeline' | 'flights' | 'expenses'>('timeline');
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0); // Day 1 by default
  const [isPlacesToVisitActive, setIsPlacesToVisitActive] = useState<boolean>(false);
  const [selectedStop, setSelectedStop] = useState<ItineraryStop | null>(null);
  const [isReadinessOpen, setIsReadinessOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTripManagerOpen, setIsTripManagerOpen] = useState(false);
  const [isAddStopModalOpen, setIsAddStopModalOpen] = useState(false);
  const [isDeleteDayConfirming, setIsDeleteDayConfirming] = useState(false);
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
  const {
    isDayOptimized,
    canUndo,
    previewData,
    handleOptimizeDay,
    handleApplyOptimization,
    handleCancelOptimization,
    handleUndoOptimization,
  } = useTripOptimization(activeDay, activeDayIdx, setTrip);

  // Filter flights scheduled on the active itinerary day
  const dayFlights = useMemo(() => {
    if (!trip?.flights || trip.flights.length === 0) return [];
    return trip.flights.filter((f) => {
      if (!f.date) return activeDayIdx === 0;
      const normalizedFlightDate = f.date.trim();
      const normalizedDayDate = activeDay.dateStr.replace(/^[A-Za-z]+,\s*/, '').trim();
      const normalizedStartDate = (trip.startDate || '').trim();
      return (
        normalizedFlightDate === activeDay.dateStr ||
        normalizedFlightDate === normalizedDayDate ||
        (activeDayIdx === 0 && (normalizedFlightDate === normalizedStartDate || !f.date))
      );
    });
  }, [trip?.flights, trip?.startDate, activeDay.dateStr, activeDayIdx]);

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

  // Document & Hotel/Activity Voucher Handlers
  const handleAddDocument = useCallback((doc: BookingDocument) => {
    setTrip((prev) => ({
      ...prev,
      documents: [doc, ...(prev.documents || [])],
    }));
  }, [setTrip]);

  const handleDeleteDocument = useCallback((id: string) => {
    setTrip((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((d) => d.id !== id),
    }));
  }, [setTrip]);

  // General Trip Settings Update Handler
  const handleUpdateTrip = useCallback((updated: Partial<Trip>) => {
    setTrip((prev) => ({
      ...prev,
      ...updated,
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

  // Stop CRUD Handlers (Feature F4, Bug 4 & 5)
  const handleAddStop = useCallback(
    (stopData: Omit<ItineraryStop, 'id' | 'orderIndex'>) => {
      setTrip((prev) => {
        const updatedDays = [...prev.days];
        const currentDay = updatedDays[activeDayIdx];
        if (!currentDay) return prev;
        const newStop: ItineraryStop = {
          ...stopData,
          id: `stop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          orderIndex: (currentDay.stops?.length || 0) + 1,
        };
        updatedDays[activeDayIdx] = {
          ...currentDay,
          stops: [...(currentDay.stops || []), newStop],
        };
        return { ...prev, days: updatedDays };
      });
    },
    [activeDayIdx, setTrip]
  );

  const handleUpdateStop = useCallback(
    (stopId: string, updated: Partial<ItineraryStop>) => {
      setTrip((prev) => {
        const updatedDays = [...prev.days];
        const currentDay = updatedDays[activeDayIdx];
        if (!currentDay) return prev;
        updatedDays[activeDayIdx] = {
          ...currentDay,
          stops: currentDay.stops.map((s) => (s.id === stopId ? { ...s, ...updated } : s)),
        };
        return { ...prev, days: updatedDays };
      });
      setSelectedStop((prev) => (prev && prev.id === stopId ? { ...prev, ...updated } : prev));
    },
    [activeDayIdx, setTrip]
  );

  const handleDeleteStop = useCallback(
    (stopId: string) => {
      setTrip((prev) => {
        const updatedDays = [...prev.days];
        const currentDay = updatedDays[activeDayIdx];
        if (!currentDay) return prev;
        const remainingStops = currentDay.stops
          .filter((s) => s.id !== stopId)
          .map((s, idx) => ({ ...s, orderIndex: idx + 1 }));
        updatedDays[activeDayIdx] = {
          ...currentDay,
          stops: remainingStops,
        };
        return { ...prev, days: updatedDays };
      });
      setSelectedStop((prev) => (prev?.id === stopId ? null : prev));
    },
    [activeDayIdx, setTrip]
  );

  const handleMoveStopToDay = useCallback(
    (stopId: string, targetDayId: string) => {
      setTrip((prev) => {
        const updatedDays = [...prev.days];
        const sourceDayIdx = updatedDays.findIndex((d) => d.id === activeDay.id);
        const targetDayIdx = updatedDays.findIndex((d) => d.id === targetDayId);
        if (sourceDayIdx === -1 || targetDayIdx === -1) return prev;

        const stopToMove = updatedDays[sourceDayIdx].stops.find((s) => s.id === stopId);
        if (!stopToMove) return prev;

        // Remove from source day and re-index
        updatedDays[sourceDayIdx] = {
          ...updatedDays[sourceDayIdx],
          stops: updatedDays[sourceDayIdx].stops
            .filter((s) => s.id !== stopId)
            .map((s, idx) => ({ ...s, orderIndex: idx + 1 })),
        };

        // Append to target day
        const targetStops = updatedDays[targetDayIdx].stops || [];
        updatedDays[targetDayIdx] = {
          ...updatedDays[targetDayIdx],
          stops: [
            ...targetStops,
            { ...stopToMove, orderIndex: targetStops.length + 1 },
          ],
        };

        return { ...prev, days: updatedDays };
      });
      setSelectedStop(null);
    },
    [activeDay.id, setTrip]
  );

  // Places to Visit / Ideas Bucket Handlers (Feature F1)
  const handleAddPlaceToVisit = useCallback(
    (placeData: Omit<ItineraryStop, 'id' | 'orderIndex'>) => {
      setTrip((prev) => {
        const currentPlaces = prev.placesToVisit || [];
        const newPlace: ItineraryStop = {
          ...placeData,
          id: `idea_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          orderIndex: currentPlaces.length + 1,
        };
        return {
          ...prev,
          placesToVisit: [...currentPlaces, newPlace],
        };
      });
    },
    [setTrip]
  );

  const handleDeletePlaceToVisit = useCallback(
    (placeId: string) => {
      setTrip((prev) => ({
        ...prev,
        placesToVisit: (prev.placesToVisit || []).filter((p) => p.id !== placeId),
      }));
    },
    [setTrip]
  );

  const handleUpdatePlaceToVisit = useCallback(
    (updatedPlace: ItineraryStop) => {
      setTrip((prev) => ({
        ...prev,
        placesToVisit: (prev.placesToVisit || []).map((p) =>
          p.id === updatedPlace.id ? updatedPlace : p
        ),
      }));
    },
    [setTrip]
  );

  const handleAssignPlaceToDay = useCallback(
    (placeId: string, dayIndex: number) => {
      setTrip((prev) => {
        const place = (prev.placesToVisit || []).find((p) => p.id === placeId);
        if (!place) return prev;

        const updatedPlaces = (prev.placesToVisit || []).filter((p) => p.id !== placeId);
        const updatedDays = [...prev.days];
        const targetDay = updatedDays[dayIndex];
        if (!targetDay) return prev;

        const targetStops = targetDay.stops || [];
        const newStop: ItineraryStop = {
          ...place,
          id: `stop_${Date.now()}`,
          orderIndex: targetStops.length + 1,
        };

        updatedDays[dayIndex] = {
          ...targetDay,
          stops: [...targetStops, newStop],
        };

        return {
          ...prev,
          placesToVisit: updatedPlaces,
          days: updatedDays,
        };
      });
      setActiveDayIdx(dayIndex);
      setIsPlacesToVisitActive(false);
    },
    [setTrip]
  );

  const handleMoveStopToIdeas = useCallback(
    (stop: ItineraryStop) => {
      setTrip((prev) => {
        const updatedDays = [...prev.days];
        const currentDay = updatedDays[activeDayIdx];
        if (!currentDay) return prev;

        // Remove from day stops and re-index
        const remainingStops = currentDay.stops
          .filter((s) => s.id !== stop.id)
          .map((s, idx) => ({ ...s, orderIndex: idx + 1 }));

        updatedDays[activeDayIdx] = {
          ...currentDay,
          stops: remainingStops,
        };

        const currentPlaces = prev.placesToVisit || [];
        const unassignedIdea: ItineraryStop = {
          ...stop,
          orderIndex: currentPlaces.length + 1,
        };

        return {
          ...prev,
          days: updatedDays,
          placesToVisit: [...currentPlaces, unassignedIdea],
        };
      });
      setSelectedStop(null);
    },
    [activeDayIdx, setTrip]
  );

  // Day CRUD Handlers (Feature F5, Bug 6)
  const handleAddDay = useCallback(() => {
    setTrip((prev) => {
      const nextDayNum = prev.days.length + 1;
      const lastDay = prev.days[prev.days.length - 1];
      let nextDateStr = `Day ${nextDayNum}`;

      if (lastDay?.dateStr) {
        const parsedMs = Date.parse(lastDay.dateStr);
        if (!isNaN(parsedMs)) {
          const nextDate = new Date(parsedMs);
          nextDate.setDate(nextDate.getDate() + 1);
          nextDateStr = nextDate.toISOString().split('T')[0];
        }
      }

      const dayColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
      const themeColor = dayColors[(nextDayNum - 1) % dayColors.length];

      const newDay: TripDay = {
        id: `day_${Date.now()}_${nextDayNum}`,
        dayNumber: nextDayNum,
        dateStr: nextDateStr,
        title: `Day ${nextDayNum} Exploration`,
        themeColor,
        weather: {
          tempC: 22,
          highC: 24,
          lowC: 16,
          condition: 'sunny',
          conditionText: 'Fair',
          rainProbability: 0,
          humidity: 50,
          uvIndex: 4,
          clothingTip: 'Casual daywear and comfortable shoes for exploring.',
          hourly: [],
        },
        stops: [],
      };

      return {
        ...prev,
        days: [...prev.days, newDay],
      };
    });

    setActiveDayIdx(trip.days.length);
  }, [trip.days.length, setTrip, setActiveDayIdx]);

  const handleDeleteDay = useCallback(
    (dayIdxToDelete: number) => {
      if (trip.days.length <= 1) return;
      setTrip((prev) => {
        const filteredDays = prev.days.filter((_, idx) => idx !== dayIdxToDelete);
        const renumberedDays = filteredDays.map((d, idx) => ({
          ...d,
          dayNumber: idx + 1,
        }));
        return {
          ...prev,
          days: renumberedDays,
        };
      });
      setActiveDayIdx((prevIdx) => Math.max(0, Math.min(prevIdx, trip.days.length - 2)));
      setIsDeleteDayConfirming(false);
    },
    [trip.days.length, setTrip, setActiveDayIdx]
  );

  // Import Handler
  const handleImportSuccess = useCallback((importedTrip: Trip) => {
    setTrip(importedTrip);
  }, [setTrip]);

  // Toggle readiness item
  const handleToggleReadinessItem = useCallback((id: string) => {
    setTrip((prev) => {
      const updatedList = prev.readinessChecklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      const completedCount = updatedList.filter((i) => i.completed).length;
      const newScore = Math.round((completedCount / (updatedList.length || 1)) * 100);

      return {
        ...prev,
        readinessScore: newScore,
        readinessChecklist: updatedList,
      };
    });
  }, [setTrip]);

  // Packing List Handlers (Feature F7)
  const handleTogglePackingItem = useCallback(
    (id: string) => {
      setTrip((prev) => {
        const currentList = prev.packingList || [];
        const updatedList = currentList.map((item) =>
          item.id === id ? { ...item, packed: !item.packed } : item
        );
        return {
          ...prev,
          packingList: updatedList,
        };
      });
    },
    [setTrip]
  );

  const handleAddPackingItem = useCallback(
    (category: PackingCategory, name: string) => {
      setTrip((prev) => {
        const currentList = prev.packingList || [];
        const newItem: PackingItem = {
          id: `pack_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name,
          category,
          packed: false,
        };
        return {
          ...prev,
          packingList: [...currentList, newItem],
        };
      });
    },
    [setTrip]
  );

  const handleDeletePackingItem = useCallback(
    (id: string) => {
      setTrip((prev) => {
        const currentList = prev.packingList || [];
        return {
          ...prev,
          packingList: currentList.filter((item) => item.id !== id),
        };
      });
    },
    [setTrip]
  );

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
      {/* 1. TRIPS LIST LANDING VIEW */}
      {currentView === 'trips_list' && (
        <TripsListPage
          trips={trips}
          activeTripId={trip.id}
          vaultSession={vaultSession}
          isWasmActive={isWasmActive}
          onSelectTrip={(id) => {
            switchTrip(id);
            setCurrentView('trip_detail');
          }}
          onOpenSettings={(id) => {
            switchTrip(id);
            setCurrentView('trip_settings');
          }}
          onShareTrip={(t) => {
            switchTrip(t.id);
            setIsShareModalOpen(true);
          }}
          onCreateTrip={(params) => {
            createTrip(params);
            setCurrentView('trip_detail');
          }}
          onDeleteTrip={(id) => {
            deleteTrip(id);
          }}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      )}

      {/* 2. DEDICATED TRIP SETTINGS VIEW */}
      {currentView === 'trip_settings' && (
        <TripSettingsPage
          trip={trip}
          onUpdateTrip={handleUpdateTrip}
          onDeleteTrip={(id) => {
            deleteTrip(id);
            setCurrentView('trips_list');
          }}
          onBackToWorkspace={() => setCurrentView('trip_detail')}
        />
      )}

      {/* 3. TRIP WORKSPACE DETAIL VIEW */}
      {currentView === 'trip_detail' && (
        <>
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
            currentView={currentView}
            onNavigateView={setCurrentView}
            onOpenTripManager={() => setIsTripManagerOpen(true)}
            onOpenReadiness={() => setIsReadinessOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onShare={() => setIsShareModalOpen(true)}
            onOpenSettings={() => setCurrentView('trip_settings')}
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
                <span>Bookings &amp; Passes</span>
                <span className="nav-counter-pill">
                  {trip.flights.length + (trip.documents?.length || 0)}
                </span>
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
                onClick={() => setIsScratchpadOpen(true)}
                title="Trip scratchpad, emergency contacts & day notes"
              >
                <FileText size={14} />
                <span>Notes &amp; Emergency</span>
              </button>

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
              {/* Horizontal Day Selector Tabs with Ideas Bucket */}
              <DaySelector
                days={trip.days}
                activeDayIndex={activeDayIdx}
                placesCount={trip.placesToVisit?.length || 0}
                isPlacesActive={isPlacesToVisitActive}
                onSelectPlaces={() => setIsPlacesToVisitActive(true)}
                onSelectDay={(idx) => {
                  setIsPlacesToVisitActive(false);
                  setActiveDayIdx(idx);
                }}
                onAddDay={handleAddDay}
              />

              {isPlacesToVisitActive ? (
                <main className="subview-workspace" style={{ maxWidth: '100%', padding: '0 20px' }}>
                  <PlacesToVisitDrawer
                    places={trip.placesToVisit || []}
                    days={trip.days}
                    onAddPlace={handleAddPlaceToVisit}
                    onDeletePlace={handleDeletePlaceToVisit}
                    onAssignToDay={handleAssignPlaceToDay}
                    onUpdatePlace={handleUpdatePlaceToVisit}
                  />
                </main>
              ) : (
                <>
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

                    <div className="flex items-center gap-2">
                      {trip.days.length > 1 && (
                        isDeleteDayConfirming ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              className="cancel-delete-btn text-xs py-1 px-2.5"
                              onClick={() => setIsDeleteDayConfirming(false)}
                            >
                              Cancel
                            </button>
                            <button
                              className="confirm-delete-btn text-xs py-1 px-2.5"
                              onClick={() => handleDeleteDay(activeDayIdx)}
                            >
                              Delete Day {activeDay.dayNumber}
                            </button>
                          </div>
                        ) : (
                          <button
                            className="day-delete-trigger-btn"
                            onClick={() => setIsDeleteDayConfirming(true)}
                            title={`Delete Day ${activeDay.dayNumber}`}
                            style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-light)',
                              borderRadius: 'var(--radius-pill)',
                              padding: '5px 10px',
                              color: 'var(--text-tertiary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete Day</span>
                          </button>
                        )
                      )}

                      <button
                        className="day-delete-trigger-btn"
                        onClick={() => setIsScratchpadOpen(true)}
                        title={activeDay.notes ? `Day ${activeDay.dayNumber} Notes: ${activeDay.notes}` : `Add notes for Day ${activeDay.dayNumber}`}
                        style={{
                          background: activeDay.notes ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-card)',
                          border: activeDay.notes ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-pill)',
                          padding: '5px 10px',
                          color: activeDay.notes ? '#D97706' : 'var(--text-tertiary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                        }}
                      >
                        <FileText size={13} />
                        <span>{activeDay.notes ? 'Day Note' : 'Add Note'}</span>
                      </button>

                      <button
                        className={`optimize-pill-btn ${isDayOptimized ? 'optimized' : ''}`}
                        onClick={handleOptimizeDay}
                        title="Analyze and preview 2-opt Traveling Salesperson route optimization via Rust WebAssembly"
                      >
                        {isDayOptimized ? <Zap size={14} /> : <Sparkles size={14} />}
                        <span>{isDayOptimized ? 'Optimized' : 'Optimize Route (WASM)'}</span>
                      </button>

                      {canUndo && (
                        <button
                          className="optimize-pill-btn"
                          onClick={handleUndoOptimization}
                          title="Undo route optimization and restore previous itinerary sequence"
                          style={{
                            borderColor: '#F59E0B',
                            color: '#D97706',
                            backgroundColor: 'rgba(245, 158, 11, 0.08)',
                          }}
                        >
                          <RotateCcw size={14} />
                          <span>Undo</span>
                        </button>
                      )}
                    </div>
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
                            conflict={
                              index < activeDay.stops.length - 1
                                ? detectTransitConflict(
                                    stop,
                                    activeDay.stops[index + 1],
                                    transitLegs[index]?.durationMinutes || 0
                                  )
                                : null
                            }
                          />
                        )}
                      </React.Fragment>
                    ))}

                    {/* + Add Place to Day Action Button */}
                    <div className="add-place-action-container mt-3 mb-2">
                      <button
                        className="secondary-action-btn w-full flex items-center justify-center gap-2 py-2.5"
                        onClick={() => setIsAddStopModalOpen(true)}
                        style={{
                          borderStyle: 'dashed',
                          borderWidth: '1.5px',
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: 'var(--radius-lg)',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={15} />
                        <span>Add Place to Day {activeDay.dayNumber}</span>
                      </button>
                    </div>
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
                    canUndo={canUndo}
                    onUndoOptimization={handleUndoOptimization}
                    transitModes={transitModes}
                    selectedStopId={selectedStop?.id}
                    tripTitle={trip.title}
                  />
                </section>
              </main>
            </>
          )}
        </>
      )}

          {/* TAB 2: BOOKINGS, TICKETS, HOTEL VOUCHERS & TRAVEL DOCUMENTS */}
          {activeTab === 'flights' && (
            <main className="subview-workspace">
              <DocumentsAndTicketsHub
                flights={trip.flights}
                documents={trip.documents || []}
                onAddFlight={handleAddFlight}
                onDeleteFlight={handleDeleteFlight}
                onAddDocument={handleAddDocument}
                onDeleteDocument={handleDeleteDocument}
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
        </>
      )}

      {/* 4. Modals & Drawers */}
      <TripManagerModal
        isOpen={isTripManagerOpen}
        onClose={() => setIsTripManagerOpen(false)}
        trips={trips}
        activeTrip={trip}
        onSwitchTrip={(id) => {
          switchTrip(id);
          setCurrentView('trip_detail');
        }}
        onCreateTrip={(params) => {
          createTrip(params);
          setCurrentView('trip_detail');
        }}
        onUpdateTrip={handleUpdateTrip}
        onDeleteTrip={deleteTrip}
      />

      <ReadinessModal
        isOpen={isReadinessOpen}
        score={trip.readinessScore}
        items={trip.readinessChecklist}
        packingList={trip.packingList || []}
        onToggleItem={handleToggleReadinessItem}
        onTogglePackingItem={handleTogglePackingItem}
        onAddPackingItem={handleAddPackingItem}
        onDeletePackingItem={handleDeletePackingItem}
        onClose={() => setIsReadinessOpen(false)}
      />

      <ScratchpadModal
        isOpen={isScratchpadOpen}
        trip={trip}
        activeDay={activeDay}
        onUpdateTrip={handleUpdateTrip}
        onClose={() => setIsScratchpadOpen(false)}
      />

      <PrintTravelPacket trip={trip} />

      <StopDetailModal
        stop={selectedStop}
        themeColor={activeDay.themeColor}
        days={trip.days}
        currentDayId={activeDay.id}
        onClose={() => setSelectedStop(null)}
        onUpdateStop={handleUpdateStop}
        onDeleteStop={handleDeleteStop}
        onMoveStopToDay={handleMoveStopToDay}
        onMoveStopToIdeas={handleMoveStopToIdeas}
      />

      <OptimizeRouteModal
        preview={previewData}
        themeColor={activeDay.themeColor}
        onApply={handleApplyOptimization}
        onClose={handleCancelOptimization}
      />

      <AddStopModal
        isOpen={isAddStopModalOpen}
        dayNumber={activeDay.dayNumber}
        themeColor={activeDay.themeColor}
        defaultStartTime={
          activeDay.stops && activeDay.stops.length > 0
            ? activeDay.stops[activeDay.stops.length - 1].startTime
            : trip.startTime || '09:30 AM'
        }
        fallbackCoordinates={
          activeDay.stops && activeDay.stops.length > 0
            ? activeDay.stops[activeDay.stops.length - 1].coordinates
            : undefined
        }
        onClose={() => setIsAddStopModalOpen(false)}
        onAddStop={handleAddStop}
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
