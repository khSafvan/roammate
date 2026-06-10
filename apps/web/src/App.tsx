import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Hotel,
  ListFilter,
  Map as MapIcon,
  Plane,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { AddStopModal } from './components/AddStopModal';
import { PasscodeAuthModal } from './components/auth';
import { AuthModal } from './components/AuthModal';
import { DaySelector } from './components/DaySelector';
import { DistancePill } from './components/DistancePill';
import { DocumentsAndTicketsHub } from './components/documents/DocumentsAndTicketsHub';
import { ExpenseTracker } from './components/ExpenseTracker';
import { Header } from './components/Header';
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
import { BookingDocument, Expense, Flight, ItineraryStop, PackingCategory, PackingItem, StopCategory, Trip, TripDay } from './types/trip';
import { detectTransitConflict, getEffectiveStayForDay } from '@mojolog/core';
import { getNextSuggestedStartTime, recalculateStopTimes } from './utils/timeSchedule';
import { fetchHolidaysForRange } from './utils/holidayService';
import { fetchWeeklyForecast, geocodeDestination, tripDayToIso } from './utils/weatherService';
import {
  useTransitLegs,
  useTripOptimization,
  useVault,
} from './hooks';

const InteractiveMap = lazy(() =>
  import('./components/InteractiveMap').then((module) => ({ default: module.InteractiveMap }))
);

function getTripTravelerNames(trip: Trip): string[] {
  if (trip.travelers) return trip.travelers;

  const splitNames = (value?: string) =>
    (value || '').split(/\s*(?:,|&|\band\b)\s*/i).map((name) => name.trim()).filter(Boolean);
  const names = [
    ...(trip.flights || []).flatMap((flight) => splitNames(flight.passengerName)),
    ...(trip.documents || []).flatMap((document) => splitNames(document.passengerOrGuestName)),
    ...(trip.expenses || []).flatMap((expense) => [
      ...splitNames(expense.paidBy),
      ...(expense.splitWith || []).flatMap(splitNames),
    ]),
  ];

  return Array.from(new Set(names.length > 0 ? names : ['Me']));
}

export function App() {
  const [currentView, setCurrentView] = useState<'trips_list' | 'trip_detail' | 'trip_settings'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('trip') || params.get('share') || params.get('view') === 'detail') {
      return 'trip_detail';
    }
    return 'trips_list';
  });
  const [activeTab, setActiveTab] = useState<'timeline' | 'flights' | 'expenses'>('timeline');
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0); // Day 1 by default
  const [isPlacesToVisitActive, setIsPlacesToVisitActive] = useState<boolean>(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [editingStop, setEditingStop] = useState<ItineraryStop | null>(null);
  const [isReadinessOpen, setIsReadinessOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTripManagerOpen, setIsTripManagerOpen] = useState(false);
  const [isAddStopModalOpen, setIsAddStopModalOpen] = useState(false);
  const [addStopCategory, setAddStopCategory] = useState<StopCategory>('sight');

  const handleOpenAddStop = useCallback((cat: StopCategory = 'sight') => {
    setAddStopCategory(cat);
    setIsAddStopModalOpen(true);
  }, []);
  const [isDeleteDayConfirming, setIsDeleteDayConfirming] = useState(false);
  const [mobileView, setMobileView] = useState<'timeline' | 'map'>('timeline');
  const [holidaysByDate, setHolidaysByDate] = useState<Record<string, string>>({});
  const [draggedStopIdx, setDraggedStopIdx] = useState<number | null>(null);
  const [dragOverStopIdx, setDragOverStopIdx] = useState<number | null>(null);

  // Multi-trip vault hook managing sessions, multiple trips, switching, and guest access
  const {
    vaultSession,
    setVaultSession,
    trips,
    activeTrip: trip,
    setTrip,
    isReadOnly,
    switchTrip,
    createTrip,
    deleteTrip,
    handleLogout,
    exitReadOnly,
  } = useVault();

  const tripTravelerNames = useMemo(
    () => getTripTravelerNames(trip),
    [trip.travelers, trip.flights, trip.documents, trip.expenses]
  );

  // Check for incoming QR code scan or vault parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scannedAccount = params.get('account') || params.get('vault');
    if (scannedAccount) {
      setIsAuthOpen(true);
      params.delete('account');
      params.delete('vault');
      const newSearch = params.toString() ? `?${params.toString()}` : '';
      window.history.replaceState({}, '', `${window.location.pathname}${newSearch}`);
    }
  }, []);

  // Safely clamp activeDayIdx whenever the trip or its days length changes
  useEffect(() => {
    if (trip?.days && trip.days.length > 0) {
      if (activeDayIdx >= trip.days.length) {
        setActiveDayIdx(Math.max(0, trip.days.length - 1));
      }
    }
  }, [trip?.id, trip?.days?.length, activeDayIdx]);

  // Fetch live weather from Open-Meteo for all trip days
  useEffect(() => {
    if (!trip?.startDate || !trip?.destination || !trip?.days?.length) return;
    let cancelled = false;

    (async () => {
      // Use first stop coords if available, else geocode destination string
      const firstStopCoords = trip.days[0]?.stops?.[0]?.coordinates;
      let lat = firstStopCoords?.latitude ?? 0;
      let lng = firstStopCoords?.longitude ?? 0;

      if (!lat && !lng) {
        const geo = await geocodeDestination(trip.destination);
        if (cancelled || !geo) return;
        lat = geo.lat; lng = geo.lng;
      }

      const endDate = tripDayToIso(trip.startDate!, trip.days.length - 1);
      const result = await fetchWeeklyForecast(lat, lng, trip.startDate!, endDate);
      if (cancelled || Object.keys(result.byDate).length === 0) return;

      setTrip((prev) => ({
        ...prev,
        days: prev.days.map((day, i) => {
          const iso = tripDayToIso(trip.startDate!, i);
          const fetched = result.byDate[iso];
          return fetched ? { ...day, weather: fetched } : day;
        }),
      }));
    })();

    return () => { cancelled = true; };
  }, [trip?.id, trip?.startDate, trip?.destination]);

  // Fetch public holidays from Nager.Date when countryCode + date range is known
  useEffect(() => {
    if (!trip?.countryCode || !trip?.startDate || !trip?.endDate) return;
    fetchHolidaysForRange(trip.countryCode, trip.startDate, trip.endDate)
      .then(setHolidaysByDate);
  }, [trip?.id, trip?.countryCode, trip?.startDate, trip?.endDate]);

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

  const activeDayScheduleConflicts = useMemo(
    () => activeDay.stops.map((stop, index) => {
      const nextStop = activeDay.stops[index + 1];
      if (!nextStop || stop.category === 'note' || nextStop.category === 'note') return null;

      return detectTransitConflict(
        stop,
        nextStop,
        transitLegs[index]?.durationMinutes || 0
      );
    }),
    [activeDay.stops, transitLegs]
  );

  const effectiveStay = useMemo(
    () => getEffectiveStayForDay(trip?.days || [], activeDayIdx),
    [trip?.days, activeDayIdx]
  );

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

  const activeDayHoliday = useMemo(() => {
    if (!trip?.startDate) return undefined;
    const iso = tripDayToIso(trip.startDate, activeDayIdx);
    return holidaysByDate[iso];
  }, [trip?.startDate, activeDayIdx, holidaysByDate]);

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

  const handleAddTraveler = useCallback((value: string) => {
    const name = value.trim();
    if (!name) return;

    setTrip((prev) => {
      const travelers = getTripTravelerNames(prev);
      if (travelers.some((traveler) => traveler.toLowerCase() === name.toLowerCase())) return prev;

      return {
        ...prev,
        travelers: [...travelers, name],
        expenses: prev.expenses.map((expense) =>
          expense.splitWith?.length ? expense : { ...expense, splitWith: travelers }
        ),
      };
    });
  }, [setTrip]);

  const handleRenameTraveler = useCallback((oldName: string, value: string) => {
    const newName = value.trim();
    if (!newName) return;

    setTrip((prev) => {
      const travelers = getTripTravelerNames(prev);
      if (
        !travelers.includes(oldName) ||
        travelers.some((traveler) => traveler !== oldName && traveler.toLowerCase() === newName.toLowerCase())
      ) return prev;

      return {
        ...prev,
        travelers: travelers.map((traveler) => traveler === oldName ? newName : traveler),
        expenses: prev.expenses.map((expense) => {
          const splitWith = expense.splitWith?.length ? expense.splitWith : travelers;
          return {
            ...expense,
            paidBy: expense.paidBy === oldName ? newName : expense.paidBy,
            splitWith: splitWith.map((traveler) => traveler === oldName ? newName : traveler),
          };
        }),
        flights: prev.flights.map((flight) =>
          flight.passengerName === oldName ? { ...flight, passengerName: newName } : flight
        ),
        documents: (prev.documents || []).map((document) =>
          ({
            ...document,
            passengerOrGuestName: document.passengerOrGuestName === oldName
              ? newName
              : document.passengerOrGuestName,
            flightData: document.flightData?.passengerName === oldName
              ? { ...document.flightData, passengerName: newName }
              : document.flightData,
          })
        ),
      };
    });
  }, [setTrip]);

  const handleRemoveTraveler = useCallback((name: string) => {
    setTrip((prev) => {
      const travelers = getTripTravelerNames(prev);
      if (!travelers.includes(name)) return prev;

      return {
        ...prev,
        travelers: travelers.filter((traveler) => traveler !== name),
        expenses: prev.expenses.map((expense) =>
          expense.splitWith?.length ? expense : { ...expense, splitWith: travelers }
        ),
      };
    });
  }, [setTrip]);

  // Stop CRUD Handlers (Feature F4, Bug 4 & 5)
  const handleAddStop = useCallback(
    (stopData: Omit<ItineraryStop, 'id' | 'orderIndex'>) => {
      setTrip((prev) => {
        const updatedDays = [...prev.days];
        const currentDay = updatedDays[activeDayIdx];
        if (!currentDay) return prev;
        const currentStops = currentDay.stops || [];
        const newStop: ItineraryStop = {
          ...stopData,
          id: `stop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          orderIndex: (currentStops.length) + 1,
        };
        updatedDays[activeDayIdx] = {
          ...currentDay,
          stops: recalculateStopTimes([...currentStops, newStop]),
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
      setEditingStop((prev) => (prev && prev.id === stopId ? { ...prev, ...updated } : prev));
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
      setEditingStop((prev) => (prev?.id === stopId ? null : prev));
      setSelectedStopId((prev) => (prev === stopId ? null : prev));
    },
    [activeDayIdx, setTrip]
  );

  const handleReorderStops = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      if (sourceIndex === destinationIndex) return;
      setTrip((prev) => {
        const updatedDays = [...prev.days];
        const currentDay = updatedDays[activeDayIdx];
        if (!currentDay || !currentDay.stops) return prev;
        if (sourceIndex < 0 || sourceIndex >= currentDay.stops.length) return prev;
        if (destinationIndex < 0 || destinationIndex >= currentDay.stops.length) return prev;

        const newStops = [...currentDay.stops];
        const [movedStop] = newStops.splice(sourceIndex, 1);
        newStops.splice(destinationIndex, 0, movedStop);

        const reindexedStops = recalculateStopTimes(newStops, currentDay.stops[0]?.startTime || '09:00 AM');

        updatedDays[activeDayIdx] = {
          ...currentDay,
          stops: reindexedStops,
        };
        return { ...prev, days: updatedDays };
      });
    },
    [activeDayIdx, setTrip]
  );

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStopIdx(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStopIdx !== index) {
      setDragOverStopIdx(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverStopIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedStopIdx(null);
    setDragOverStopIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      handleReorderStops(sourceIndex, targetIndex);
    }
    setDraggedStopIdx(null);
    setDragOverStopIdx(null);
  };

  const handleMoveStopToDay = useCallback(
    (stopId: string, targetDayId: string) => {
      setTrip((prev) => {
        const updatedDays = [...prev.days];
        const sourceDayIdx = updatedDays.findIndex((d) => d.id === activeDay.id);
        const targetDayIdx = updatedDays.findIndex((d) => d.id === targetDayId);
        if (sourceDayIdx === -1 || targetDayIdx === -1) return prev;

        const stopToMove = updatedDays[sourceDayIdx].stops.find((s) => s.id === stopId);
        if (!stopToMove) return prev;

        // Remove from source day and recalculate schedule
        const remainingSourceStops = updatedDays[sourceDayIdx].stops.filter((s) => s.id !== stopId);
        updatedDays[sourceDayIdx] = {
          ...updatedDays[sourceDayIdx],
          stops: recalculateStopTimes(remainingSourceStops),
        };

        // Append to target day and recalculate schedule
        const targetStops = updatedDays[targetDayIdx].stops || [];
        updatedDays[targetDayIdx] = {
          ...updatedDays[targetDayIdx],
          stops: recalculateStopTimes([...targetStops, stopToMove]),
        };

        return { ...prev, days: updatedDays };
      });
      setEditingStop(null);
      setSelectedStopId(null);
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
          id: `stop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          orderIndex: targetStops.length + 1,
        };

        updatedDays[dayIndex] = {
          ...targetDay,
          stops: recalculateStopTimes([...targetStops, newStop]),
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
        const dayIdx = updatedDays.findIndex((d) => d.stops?.some((s) => s.id === stop.id));
        if (dayIdx === -1) return prev;

        const currentDay = updatedDays[dayIdx];
        const remainingStops = currentDay.stops
          .filter((s) => s.id !== stop.id)
          .map((s, idx) => ({ ...s, orderIndex: idx + 1 }));

        updatedDays[dayIdx] = {
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
      setEditingStop(null);
      setSelectedStopId(null);
    },
    [setTrip]
  );

  // Day CRUD Handlers (Feature F5, Bug 6)
  const handleAddDay = useCallback(() => {
    const nextIdx = trip.days.length;
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

    setIsPlacesToVisitActive(false);
    setActiveDayIdx(nextIdx);
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

  // Passcode Auth Gate
  if (!vaultSession && !isReadOnly) {
    return (
      <PasscodeAuthModal
        isOpen={true}
        onSuccess={(session) => {
          setVaultSession(session);
        }}
      />
    );
  }

  const isViewportLocked =
    currentView === 'trip_detail' &&
    activeTab === 'timeline' &&
    !isPlacesToVisitActive;

  return (
    <div className={`app-shell ${isViewportLocked ? 'viewport-locked' : ''}`}>
      {/* 1. TRIPS LIST LANDING VIEW */}
      {currentView === 'trips_list' && (
        <TripsListPage
          trips={trips}
          activeTripId={trip.id}
          vaultSession={vaultSession}
          onSelectTrip={(id) => {
            switchTrip(id);
            setActiveDayIdx(0);
            setIsPlacesToVisitActive(false);
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
            setActiveDayIdx(0);
            setIsPlacesToVisitActive(false);
            setCurrentView('trip_detail');
          }}
          onDeleteTrip={(id) => {
            deleteTrip(id);
          }}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
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
          onLogout={handleLogout}
        />
      )}

      {/* 3. TRIP WORKSPACE DETAIL VIEW */}
      {currentView === 'trip_detail' && (
        <>
          {/* Read-Only Notice Banner */}
          {isReadOnly && (
            <div className="read-only-banner">
              <span>👀 Viewing shared itinerary in read-only mode</span>
              <button className="read-only-exit-btn" onClick={exitReadOnly}>
                Exit Preview
              </button>
            </div>
          )}

          {/* 1. Global Navigation Bar with Multi-Trip Switcher & Timing Info */}
          <Header
            title={trip?.title || 'Trip'}
            destination={trip?.destination || ''}
            dates={trip?.dates || ''}
            startTime={trip?.startTime}
            endTime={trip?.endTime}
            readinessScore={trip?.readinessScore || 0}
            activeSession={vaultSession}
            tripsCount={trips.length}
            currentView={currentView}
            activeTab={activeTab}
            flightsCount={(trip?.flights?.length || 0) + (trip?.documents?.length || 0)}
            expensesCount={trip?.expenses?.length || 0}
            onSelectTab={setActiveTab}
            onNavigateView={setCurrentView}
            onOpenTripManager={() => setIsTripManagerOpen(true)}
            onOpenReadiness={() => setIsReadinessOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onShare={() => setIsShareModalOpen(true)}
            onOpenScratchpad={() => setIsScratchpadOpen(true)}
            onOpenSettings={() => setCurrentView('trip_settings')}
            onLogout={handleLogout}
          />


          {/* 2. TAB CONTENT */}
          {activeTab === 'timeline' && (
            <>
              {/* Horizontal Day Selector Tabs with Ideas Bucket */}
              <DaySelector
                days={trip?.days || []}
                activeDayIndex={activeDayIdx}
                placesCount={trip?.placesToVisit?.length || 0}
                isPlacesActive={isPlacesToVisitActive}
                onSelectPlaces={() => setIsPlacesToVisitActive(true)}
                onSelectDay={(idx) => {
                  setIsPlacesToVisitActive(false);
                  setActiveDayIdx(idx);
                }}
                onAddDay={handleAddDay}
                holidaysByDate={holidaysByDate}
                tripStartDate={trip.startDate}
              />

              {isPlacesToVisitActive ? (
                <main className="subview-workspace" style={{ maxWidth: '100%', padding: '0 20px' }}>
                  <PlacesToVisitDrawer
                    places={trip.placesToVisit || []}
                    days={trip.days}
                    destination={trip.destination}
                    onAddPlace={handleAddPlaceToVisit}
                    onDeletePlace={handleDeletePlaceToVisit}
                    onAssignToDay={handleAssignPlaceToDay}
                    onUpdatePlace={handleUpdatePlaceToVisit}
                    onBackToTimeline={() => setIsPlacesToVisitActive(false)}
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
                        title="Analyze and preview 2-opt route optimization"
                      >
                        {isDayOptimized ? <Zap size={14} /> : <Sparkles size={14} />}
                        <span>{isDayOptimized ? 'Optimized' : 'Optimize Route'}</span>
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

                  {/* Public Holiday Banner for Active Day */}
                  {activeDayHoliday && (
                    <div className="active-day-holiday-banner">
                      <Sparkles size={14} className="text-amber" />
                      <span>
                        Public Holiday: <strong>{activeDayHoliday}</strong> — sights, shops, or transit may run on holiday hours
                      </span>
                    </div>
                  )}

                  {/* Weather Prediction Card */}
                  <WeatherBanner
                    weather={activeDay.weather}
                    themeColor={activeDay.themeColor}
                  />

                  {/* Phase 9 Stay-Aware Itinerary Lodging Banner */}
                  {effectiveStay && (
                    <div
                      className="stay-base-banner"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: effectiveStay.isInherited ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: `1px solid ${effectiveStay.isInherited ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                        borderRadius: 'var(--radius-card)',
                        padding: '12px 16px',
                        marginTop: '12px',
                        marginBottom: '16px',
                        gap: '12px',
                      }}
                    >
                      <div className="flex items-center gap-3" style={{ flex: 1 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: effectiveStay.isInherited ? '#3B82F6' : '#10B981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          <Hotel size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {effectiveStay.stay.title}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: effectiveStay.isInherited ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: effectiveStay.isInherited ? '#2563EB' : '#059669',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {effectiveStay.isInherited ? 'Active Stay (Base)' : 'Check-in Anchor'}
                            </span>
                          </div>
                          {effectiveStay.stay.address && (
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                              {effectiveStay.stay.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        className="timeline-action-pill"
                        onClick={() => handleOpenAddStop('lodging')}
                        style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
                      >
                        <span>{effectiveStay.isInherited ? 'Change Hotel' : 'Edit Stay'}</span>
                      </button>
                    </div>
                  )}

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
                          index={index}
                          totalStops={activeDay.stops.length}
                          themeColor={activeDay.themeColor}
                          isSelected={stop.id === selectedStopId}
                          onSelect={() => setSelectedStopId(stop.id)}
                          onEdit={(s) => setEditingStop(s)}
                          onMoveUp={() => handleReorderStops(index, index - 1)}
                          onMoveDown={() => handleReorderStops(index, index + 1)}
                          isDragging={draggedStopIdx === index}
                          isDragOver={dragOverStopIdx === index}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDrop(e, index)}
                        />

                        {/* Distance & Transit duration connector */}
                        {index < transitLegs.length &&
                          stop.category !== 'note' &&
                          activeDay.stops[index + 1]?.category !== 'note' && (
                          <DistancePill
                            leg={transitLegs[index]}
                            onToggleMode={handleToggleMode}
                            conflict={activeDayScheduleConflicts[index]}
                          />
                        )}
                      </React.Fragment>
                    ))}

                    {/* Empty Day State */}
                    {activeDay.stops.length === 0 && (
                      <div
                        className="empty-day-card"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-card)',
                          padding: '36px 24px',
                          textAlign: 'center',
                          boxShadow: 'var(--shadow-card)',
                        }}
                      >
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                          Day {activeDay.dayNumber} is wide open
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 20px', lineHeight: '1.5' }}>
                          Start building your day by adding places with Google Places/OSM search, hotels, flights, or quick notes and tips.
                        </p>
                        <div className="flex flex-center gap-2" style={{ flexWrap: 'wrap' }}>
                          <button
                            className="timeline-action-primary"
                            onClick={() => handleOpenAddStop('sight')}
                          >
                            <Plus size={15} />
                            <span>Add Place</span>
                          </button>
                          <button
                            className="timeline-action-pill"
                            onClick={() => handleOpenAddStop('note')}
                          >
                            <FileText size={14} className="text-amber" />
                            <span>+ Note</span>
                          </button>
                          <button
                            className="timeline-action-pill"
                            onClick={() => handleOpenAddStop('lodging')}
                          >
                            <Hotel size={14} className="text-blue" />
                            <span>+ Hotel</span>
                          </button>
                          <button
                            className="timeline-action-pill"
                            onClick={() => handleOpenAddStop('flight')}
                          >
                            <Plane size={14} className="text-emerald" />
                            <span>+ Flight</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* + Add Place / Note / Hotel / Flight Multi-Action Bar */}
                    {activeDay.stops.length > 0 && (
                      <div className="timeline-actions-bar">
                        <button
                          className="timeline-action-primary"
                          onClick={() => handleOpenAddStop('sight')}
                          title="Search and schedule places, sights, or restaurants with Google Places / OSM"
                        >
                          <Plus size={15} />
                          <span>Add Place</span>
                        </button>

                        <button
                          className="timeline-action-pill"
                          onClick={() => handleOpenAddStop('note')}
                          title="Add traveler notes, tips, bullet lists, or packing reminders"
                        >
                          <FileText size={14} className="text-amber" />
                          <span>+ Note</span>
                        </button>

                        <button
                          className="timeline-action-pill"
                          onClick={() => handleOpenAddStop('lodging')}
                          title="Search and add hotel, accommodation, or lodging"
                        >
                          <Hotel size={14} className="text-blue" />
                          <span>+ Hotel</span>
                        </button>

                        <button
                          className="timeline-action-pill"
                          onClick={() => handleOpenAddStop('flight')}
                          title="Schedule a flight, airport transit, or arrival"
                        >
                          <Plane size={14} className="text-emerald" />
                          <span>+ Flight</span>
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {/* RIGHT PANE: Interactive Route Map */}
                <section
                  className={`map-pane ${mobileView === 'timeline' ? 'mobile-hidden' : ''}`}
                >
                  <Suspense fallback={<div className="map-loading-state" aria-label="Loading map" />}>
                    <InteractiveMap
                      day={activeDay}
                      onSelectStop={(s) => setSelectedStopId(s.id)}
                      onEditStop={(s) => setEditingStop(s)}
                      onOptimizeDay={handleOptimizeDay}
                      isOptimized={isDayOptimized}
                      canUndo={canUndo}
                      onUndoOptimization={handleUndoOptimization}
                      transitModes={transitModes}
                      selectedStopId={selectedStopId}
                      tripTitle={trip.title}
                      onBackToTimeline={() => setMobileView('timeline')}
                    />
                  </Suspense>
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
                homeCurrency={trip.homeCurrency}
                travelers={tripTravelerNames}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                onAddTraveler={handleAddTraveler}
                onRenameTraveler={handleRenameTraveler}
                onRemoveTraveler={handleRemoveTraveler}
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
          setActiveDayIdx(0);
          setIsPlacesToVisitActive(false);
          setCurrentView('trip_detail');
        }}
        onCreateTrip={(params) => {
          createTrip(params);
          setActiveDayIdx(0);
          setIsPlacesToVisitActive(false);
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
        stop={editingStop}
        themeColor={activeDay.themeColor}
        days={trip.days}
        currentDayId={activeDay.id}
        onClose={() => setEditingStop(null)}
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
        destination={trip.destination}
        defaultStartTime={getNextSuggestedStartTime(activeDay.stops, trip.startTime || '09:00 AM')}
        fallbackCoordinates={
          activeDay.stops && activeDay.stops.length > 0
            ? activeDay.stops[activeDay.stops.length - 1].coordinates
            : undefined
        }
        onClose={() => setIsAddStopModalOpen(false)}
        onAddStop={handleAddStop}
        defaultCategory={addStopCategory}
      />

      <AuthModal
        isOpen={isAuthOpen}
        activeSession={vaultSession}
        onLoginSuccess={(session) => {
          setVaultSession(session);
        }}
        onLogout={handleLogout}
        onClose={() => {
          setIsAuthOpen(false);
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
