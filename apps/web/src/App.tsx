import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  ListFilter,
  Map as MapIcon,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { AddStopModal } from './components/AddStopModal';
import { DayBaseAnchors } from './components/DayBaseAnchors';
import { DayNotesCard } from './components/DayNotesCard';
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
import { PlaceDetailView } from './components/places/PlaceDetailView';
import { TripManagerModal } from './components/TripManagerModal';
import { TripsListPage } from './components/trips/TripsListPage';
import { TripSettingsPage } from './components/trips/TripSettingsPage';
import { WeatherBanner } from './components/WeatherBanner';
import { PackingView } from './components/outfits/PackingView';
import { apiClient } from './auth/syncService';
import { BookingDocument, Expense, Flight, ItineraryStop, Look, PackingCategory, PackingItem, StopCategory, TransitLeg, Trip, TripDay } from './types/trip';
import {
  computeDistanceKm,
  detectTransitConflict,
  estimateDurationMins,
  getDayAnchors,
  getEffectiveStayForDay,
} from '@mojolog/core';
import {
  getNextSuggestedStartTime,
  parseTimeToMinutes,
  recalculateStopTimes,
} from './utils/timeSchedule';
import { fetchHolidaysForRange } from './utils/holidayService';
import { fetchWeeklyForecast, geocodeDestination, tripDayToIso } from './utils/weatherService';
import { isPasswordConfigured } from './auth/syncService';
import {
  useTransitLegs,
  useTripOptimization,
  useVault,
} from './hooks';

const InteractiveMap = lazy(() =>
  import('./components/InteractiveMap').then((module) => ({ default: module.InteractiveMap }))
);

export function App() {
  const [currentView, setCurrentView] = useState<'trips_list' | 'trip_detail' | 'trip_settings'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('trip') || params.get('share') || params.get('view') === 'detail') {
      return 'trip_detail';
    }
    return 'trips_list';
  });
  const [activeTab, setActiveTab] = useState<'timeline' | 'flights' | 'expenses' | 'outfits'>('timeline');
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0); // Day 1 by default
  const [isPlacesToVisitActive, setIsPlacesToVisitActive] = useState<boolean>(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [activeDetailStopId, setActiveDetailStopId] = useState<string | null>(null);
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

  // Guard against missing PASSWORD environment configuration
  const [isPasswordChecked, setIsPasswordChecked] = useState(false);
  const [isPasswordMissing, setIsPasswordMissing] = useState(false);

  useEffect(() => {
    let mounted = true;
    isPasswordConfigured().then((configured) => {
      if (mounted) {
        setIsPasswordMissing(!configured);
        setIsPasswordChecked(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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
    setIsDeleteDayConfirming(false);
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

  const dayAnchors = useMemo(
    () =>
      getDayAnchors(
        activeDay.dateStr,
        trip?.documents || [],
        activeDayIdx,
        trip?.days?.length || 1,
        trip?.days || []
      ),
    [activeDay.dateStr, trip?.documents, activeDayIdx, trip?.days]
  );

  const effectiveStay = useMemo(
    () => getEffectiveStayForDay(trip?.days || [], activeDayIdx, trip?.documents, trip?.startDate),
    [trip?.days, activeDayIdx, trip?.documents, trip?.startDate]
  );

  // Only place locations to visit inside the day's itinerary stream
  const placeStops = useMemo(
    () => activeDay.stops.filter((s) => s.category !== 'note' && !s.isAnchor),
    [activeDay.stops]
  );

  // Active detail place selected for LHS deep view
  const activeDetailStop = useMemo(() => {
    if (!activeDetailStopId || !trip) return null;
    for (const day of trip.days) {
      const found = day.stops.find((s) => s.id === activeDetailStopId);
      if (found) return found;
    }
    return null;
  }, [activeDetailStopId, trip]);

  // Reset detail view back to day stream when switching days
  useEffect(() => {
    setActiveDetailStopId(null);
  }, [activeDayIdx]);

  // Consolidated day notes (from activeDay.notes or legacy note stops)
  const activeDayNotes = useMemo(() => {
    if (activeDay.notes) return activeDay.notes;
    const legacyNoteStops = activeDay.stops.filter((s) => s.category === 'note');
    if (legacyNoteStops.length > 0) {
      return legacyNoteStops
        .map((n) =>
          n.title && n.title !== 'Note'
            ? `**${n.title}**\n${n.notes || n.subtitle || ''}`
            : n.notes || n.subtitle || ''
        )
        .join('\n\n');
    }
    return '';
  }, [activeDay.notes, activeDay.stops]);

  // Distance & Travel Time from Starting Hotel Anchor to First Place Stop
  const startAnchorLeg: TransitLeg | null = useMemo(() => {
    const startCoord = dayAnchors.startAnchor?.coordinates || effectiveStay?.stay?.coordinates;
    const startId = dayAnchors.startAnchor?.id || effectiveStay?.stay?.id;
    if (!startCoord || !startId) return null;
    const firstPlaceStop = placeStops.find(
      (s) => s.coordinates?.latitude && s.coordinates?.longitude
    );
    if (!firstPlaceStop || !firstPlaceStop.coordinates) return null;

    const fromLat = startCoord.latitude;
    const fromLng = startCoord.longitude;
    const toLat = firstPlaceStop.coordinates.latitude;
    const toLng = firstPlaceStop.coordinates.longitude;

    const distanceKm = computeDistanceKm(fromLat, fromLng, toLat, toLng);
    const key = `${startId}->${firstPlaceStop.id}`;
    const mode = transitModes[key] || 'drive';
    const durationMinutes = estimateDurationMins(distanceKm, mode);

    return {
      fromStopId: startId,
      toStopId: firstPlaceStop.id,
      mode,
      distanceKm,
      durationMinutes,
      isOutlier: durationMinutes > 45 || distanceKm > 20,
    };
  }, [dayAnchors.startAnchor, effectiveStay, placeStops, transitModes]);

  // Distance & Travel Time from Last Place Stop to Ending Hotel Anchor
  const endAnchorLeg: TransitLeg | null = useMemo(() => {
    if (!dayAnchors.endAnchor?.coordinates) return null;
    const lastPlaceStop = [...placeStops]
      .reverse()
      .find((s) => s.coordinates?.latitude && s.coordinates?.longitude);
    if (!lastPlaceStop || !lastPlaceStop.coordinates) return null;

    const fromLat = lastPlaceStop.coordinates.latitude;
    const fromLng = lastPlaceStop.coordinates.longitude;
    const toLat = dayAnchors.endAnchor.coordinates.latitude;
    const toLng = dayAnchors.endAnchor.coordinates.longitude;

    const distanceKm = computeDistanceKm(fromLat, fromLng, toLat, toLng);
    const key = `${lastPlaceStop.id}->${dayAnchors.endAnchor.id}`;
    const mode = transitModes[key] || 'drive';
    const durationMinutes = estimateDurationMins(distanceKm, mode);

    return {
      fromStopId: lastPlaceStop.id,
      toStopId: dayAnchors.endAnchor.id,
      mode,
      distanceKm,
      durationMinutes,
      isOutlier: durationMinutes > 45 || distanceKm > 20,
    };
  }, [dayAnchors.endAnchor, placeStops, transitModes]);

  // Distance & Travel Time between Start and End Hotel Anchors (empty day transition)
  const directTransitionLeg: TransitLeg | null = useMemo(() => {
    if (placeStops.length > 0) return null;
    if (!dayAnchors.startAnchor?.coordinates || !dayAnchors.endAnchor?.coordinates) return null;

    const fromLat = dayAnchors.startAnchor.coordinates.latitude;
    const fromLng = dayAnchors.startAnchor.coordinates.longitude;
    const toLat = dayAnchors.endAnchor.coordinates.latitude;
    const toLng = dayAnchors.endAnchor.coordinates.longitude;

    const distanceKm = computeDistanceKm(fromLat, fromLng, toLat, toLng);
    const key = `${dayAnchors.startAnchor.id}->${dayAnchors.endAnchor.id}`;
    const mode = transitModes[key] || 'drive';
    const durationMinutes = estimateDurationMins(distanceKm, mode);

    return {
      fromStopId: dayAnchors.startAnchor.id,
      toStopId: dayAnchors.endAnchor.id,
      mode,
      distanceKm,
      durationMinutes,
      isOutlier: durationMinutes > 45 || distanceKm > 20,
    };
  }, [dayAnchors.startAnchor, dayAnchors.endAnchor, placeStops.length, transitModes]);

  // Filter flights scheduled on the active itinerary day (from both trip.flights and documents)
  const dayFlights = useMemo(() => {
    const docFlights: Flight[] = (trip?.documents || [])
      .filter((d) => d.category === 'flight' || (d.category === 'transit' && d.flightData))
      .map((d) => d.flightData || {
        id: d.id,
        flightNumber: d.confirmationCode || 'TRANSIT',
        carrier: d.title,
        date: d.date || '',
        departure: { airport: d.location || 'DEP', city: d.location || 'Departure', time: d.time || '12:00' },
        arrival: { airport: 'ARR', city: 'Arrival', time: d.endTime || '15:00' },
      });
    const allFlights = [...(trip?.flights || []), ...docFlights];
    if (allFlights.length === 0) return [];
    return allFlights.filter((f) => {
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
  }, [trip?.flights, trip?.documents, trip?.startDate, activeDay.dateStr, activeDayIdx]);

  // Couple outfit looks indexed by event ID
  const looksByEvent = useMemo(() => {
    const map = new Map<string, Look>();
    (trip?.looks || []).forEach((l) => {
      map.set(l.eventId, l);
    });
    return map;
  }, [trip?.looks]);



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
    setTrip((prev) => {
      const newDocs = [doc, ...(prev.documents || [])];

      // Auto-placement logic for events and activities:
      // "and also event that dosent have place fixed dont add it in itinary or add it if there is place and time both on appropriate place and if no time add last on the day before hotel but can be movable"
      if ((doc.category === 'activity' || doc.category === 'doc') && doc.date) {
        const hasFixedPlace = Boolean(
          (doc.coordinates && (doc.coordinates.latitude !== 0 || doc.coordinates.longitude !== 0)) ||
          (doc.location && doc.location.trim().length > 0)
        );

        if (hasFixedPlace) {
          const docDateTrimmed = doc.date.trim();
          const dayIdx = prev.days.findIndex((d) => {
            const normalizedDayDate = d.dateStr.replace(/^[A-Za-z]+,\s*/, '').trim();
            return (
              d.dateStr === docDateTrimmed ||
              normalizedDayDate === docDateTrimmed ||
              docDateTrimmed.includes(d.dateStr) ||
              d.dateStr.includes(docDateTrimmed)
            );
          });

          if (dayIdx !== -1) {
            const targetDay = prev.days[dayIdx];
            const existingStops = targetDay.stops || [];

            const alreadyExists = existingStops.some(
              (s) =>
                s.documentId === doc.id ||
                (doc.confirmationCode && s.bookingRef === doc.confirmationCode) ||
                s.title.toLowerCase() === doc.title.toLowerCase()
            );

            if (!alreadyExists) {
              const newStop: ItineraryStop = {
                id: `stop_${doc.id}`,
                documentId: doc.id,
                title: doc.title,
                subtitle: doc.subtitle || (doc.ticketCount ? `${doc.ticketCount} Tickets · Booked Event` : 'Booked Event'),
                category: 'sight',
                startTime: doc.time || (existingStops.length > 0 ? getNextSuggestedStartTime(existingStops, prev.startTime || '09:00 AM') : '10:00 AM'),
                durationMinutes: 90,
                coordinates: doc.coordinates || targetDay.stops?.[targetDay.stops.length - 1]?.coordinates || { latitude: 0, longitude: 0 },
                address: doc.location || 'Location confirmed',
                bookingRef: doc.confirmationCode,
                notes: doc.notes,
                orderIndex: existingStops.length + 1,
              };

              let updatedStops: ItineraryStop[];

              if (doc.time) {
                // Has place and time both: insert at appropriate place sorted by time
                const docTimeMins = parseTimeToMinutes(doc.time);
                const insertIdx = existingStops.findIndex((s) => {
                  if (s.category === 'note') return false;
                  return parseTimeToMinutes(s.startTime) > docTimeMins;
                });
                if (insertIdx === -1) {
                  updatedStops = [...existingStops, newStop];
                } else {
                  updatedStops = [
                    ...existingStops.slice(0, insertIdx),
                    newStop,
                    ...existingStops.slice(insertIdx),
                  ];
                }
              } else {
                // Has place but no time: add last on the day before hotel but can be movable
                updatedStops = [...existingStops, newStop];
              }

              updatedStops = updatedStops.map((s, idx) => ({ ...s, orderIndex: idx + 1 }));

              const updatedDays = [...prev.days];
              updatedDays[dayIdx] = {
                ...targetDay,
                stops: updatedStops,
              };

              return {
                ...prev,
                documents: newDocs,
                days: updatedDays,
              };
            }
          }
        }
      }

      return {
        ...prev,
        documents: newDocs,
      };
    });
  }, [setTrip]);

  const handleDeleteDocument = useCallback((id: string) => {
    setTrip((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((d) => d.id !== id),
      days: prev.days.map((day) => ({
        ...day,
        stops: (day.stops || []).filter((s) => s.documentId !== id),
      })),
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
        // Cascade delete looks attached to this stop
        const updatedLooks = (prev.looks || []).filter((l) => l.eventId !== stopId);
        return { ...prev, days: updatedDays, looks: updatedLooks };
      });
      setEditingStop((prev) => (prev?.id === stopId ? null : prev));
      setSelectedStopId((prev) => (prev === stopId ? null : prev));
    },
    [activeDayIdx, setTrip]
  );

  const handleSaveDayNote = useCallback(
    (notes: string) => {
      setTrip((prev) => {
        const updatedDays = [...prev.days];
        const currentDay = updatedDays[activeDayIdx];
        if (!currentDay) return prev;
        updatedDays[activeDayIdx] = {
          ...currentDay,
          notes,
        };
        return { ...prev, days: updatedDays };
      });
    },
    [activeDayIdx, setTrip]
  );

  // Couple Outfit Look Handlers
  const handleSaveLook = useCallback(
    (savedLook: Look) => {
      setTrip((prev) => {
        const existing = prev.looks || [];
        const idx = existing.findIndex((l) => l.id === savedLook.id);
        const updatedLooks =
          idx >= 0
            ? [...existing.slice(0, idx), savedLook, ...existing.slice(idx + 1)]
            : [...existing, savedLook];
        return {
          ...prev,
          looks: updatedLooks,
        };
      });

      if (apiClient) {
        apiClient.patchLook(savedLook.id, savedLook).catch(() => {
          apiClient.createLook(savedLook.tripId, savedLook.eventId, savedLook).catch(() => {});
        });
      }
    },
    [setTrip]
  );

  const handleDeleteLook = useCallback(
    (lookId: string) => {
      setTrip((prev) => ({
        ...prev,
        looks: (prev.looks || []).filter((l) => l.id !== lookId),
      }));
      if (apiClient) {
        apiClient.deleteLook(lookId).catch(() => {});
      }
    },
    [setTrip]
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

        // Fixed Anchor Invariant: anchors at boundary locations cannot be moved or displaced
        const sourceStop = currentDay.stops[sourceIndex];
        const destStop = currentDay.stops[destinationIndex];
        if (sourceStop?.isAnchor) return prev;
        if (destStop?.isAnchor) return prev;
        if (destinationIndex === 0 && currentDay.stops[0]?.isAnchor) return prev;
        const lastIdx = currentDay.stops.length - 1;
        if (destinationIndex === lastIdx && currentDay.stops[lastIdx]?.isAnchor) return prev;

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
    const currentDay = trip?.days?.[activeDayIdx];
    if (currentDay?.stops?.[index]?.isAnchor) {
      e.preventDefault();
      return;
    }
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
    const currentDay = trip?.days?.[activeDayIdx];
    if (
      !isNaN(sourceIndex) &&
      sourceIndex !== targetIndex &&
      !currentDay?.stops?.[sourceIndex]?.isAnchor &&
      !currentDay?.stops?.[targetIndex]?.isAnchor
    ) {
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

  // 0. Hard Block: Missing PASSWORD in .env renders site completely unusable
  if (isPasswordChecked && isPasswordMissing) {
    return (
      <div className="env-error-screen">
        <div className="env-error-card">
          <div className="env-error-icon-box">
            <AlertTriangle size={32} className="text-rose-500" />
          </div>
          <h1 className="env-error-title">PASSWORD Not Found in Environment</h1>
          <p className="env-error-desc">
            The application cannot start because no <strong>PASSWORD</strong> was configured in your <code>.env</code> file.
            This personal vault is completely locked and disabled until a password is set.
          </p>
          <div className="env-error-code-box">
            <p className="env-error-code-label">Add this to your .env file:</p>
            <pre className="env-error-code">PASSWORD=your_secure_password_here</pre>
          </div>
          <p className="env-error-hint">
            Set the password in <code>.env</code> and restart the application or refresh.
          </p>
          <button
            className="env-error-retry-btn"
            onClick={() => window.location.reload()}
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

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
          activeSession={vaultSession}
          onOpenAuth={() => setIsAuthOpen(true)}
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
            looksCount={(trip?.looks || []).length}
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
                  {activeDetailStop ? (
                    <PlaceDetailView
                      stop={activeDetailStop}
                      dayNumber={activeDay.dayNumber}
                      themeColor={activeDay.themeColor}
                      days={trip.days}
                      currentDayId={activeDay.id}
                      weather={activeDay.weather}
                      look={looksByEvent.get(activeDetailStop.id)}
                      tripId={trip.id}
                      person1Name={trip.travelers?.[0] || 'John (Husband)'}
                      person2Name={trip.travelers?.[1] || 'Jane (Wife)'}
                      apiClient={apiClient}
                      onBack={() => setActiveDetailStopId(null)}
                      onUpdateStop={handleUpdateStop}
                      onDeleteStop={(stopId) => {
                        handleDeleteStop(stopId);
                        setActiveDetailStopId(null);
                      }}
                      onMoveStopToDay={(stopId, targetDayId) => {
                        handleMoveStopToDay(stopId, targetDayId);
                        setActiveDetailStopId(null);
                      }}
                      onMoveStopToIdeas={(stop) => {
                        handleMoveStopToIdeas(stop);
                        setActiveDetailStopId(null);
                      }}
                      onSaveLook={handleSaveLook}
                      onDeleteLook={handleDeleteLook}
                    />
                  ) : (
                    <>
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

                  {/* Fixed Daily Base Anchors (Non-draggable Starting & Ending Points) */}
                  <DayBaseAnchors
                    startAnchor={dayAnchors.startAnchor}
                    endAnchor={dayAnchors.endAnchor}
                    effectiveStay={effectiveStay}
                    onNavigateToStay={() => setActiveTab('flights')}
                    onOpenAddLodging={() => handleOpenAddStop('lodging')}
                  />

                  {/* Scheduled Flights for Today (Placed at top of day before itinerary) */}
                  {dayFlights.length > 0 && (
                    <TimelineFlightCard
                      flights={dayFlights}
                      themeColor={activeDay.themeColor}
                      onViewFlightsTab={() => setActiveTab('flights')}
                    />
                  )}

                  {/* Day Notes & Tips */}
                  <DayNotesCard
                    dayNumber={activeDay.dayNumber}
                    notes={activeDayNotes}
                    onSaveNotes={handleSaveDayNote}
                  />

                  {/* Itinerary Stream with Distance Connectors (Places Only) */}
                  <div className="itinerary-stream">
                    {/* Distance from Starting Hotel Anchor to First Location */}
                    {startAnchorLeg && (
                      <DistancePill
                        leg={startAnchorLeg}
                        onToggleMode={handleToggleMode}
                      />
                    )}

                    {/* Direct Distance between Starting and Ending Hotels (0 stops transition) */}
                    {directTransitionLeg && (
                      <DistancePill
                        leg={directTransitionLeg}
                        onToggleMode={handleToggleMode}
                      />
                    )}

                    {placeStops.map((stop, index) => (
                      <React.Fragment key={stop.id}>
                        <TimelineCard
                          stop={stop}
                          index={index}
                          totalStops={placeStops.length}
                          themeColor={activeDay.themeColor}
                          isSelected={stop.id === selectedStopId}
                          look={looksByEvent.get(stop.id)}
                          onSelect={() => {
                            setSelectedStopId(stop.id);
                            setActiveDetailStopId(stop.id);
                          }}
                          onEdit={(s) => setEditingStop(s)}
                          onDeleteStop={handleDeleteStop}
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
                        {index < placeStops.length - 1 &&
                          index < transitLegs.length && (
                            <DistancePill
                              leg={transitLegs[index]}
                              onToggleMode={handleToggleMode}
                              conflict={activeDayScheduleConflicts[index]}
                            />
                        )}
                      </React.Fragment>
                    ))}

                    {/* Empty Day State */}
                    {placeStops.length === 0 && (
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
                          Start building your day by adding places, sights, or restaurants with Google Places / OSM.
                        </p>
                        <div className="flex flex-center">
                          <button
                            className="timeline-action-primary"
                            style={{ width: 'auto', minWidth: '160px' }}
                            onClick={() => handleOpenAddStop('sight')}
                          >
                            <Plus size={15} />
                            <span>Add Place</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Distance from Last Location to Ending Hotel Anchor */}
                    {endAnchorLeg && (
                      <DistancePill
                        leg={endAnchorLeg}
                        onToggleMode={handleToggleMode}
                      />
                    )}

                    {/* + Add Place Action Bar */}
                    {placeStops.length > 0 && (
                      <div className="timeline-actions-bar">
                        <button
                          className="timeline-action-primary"
                          onClick={() => handleOpenAddStop('sight')}
                          title="Search and schedule places, sights, or restaurants with Google Places / OSM"
                        >
                          <Plus size={15} />
                          <span>Add Place</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>

            {/* RIGHT PANE: Interactive Route Map */}
            <section
              className={`map-pane ${mobileView === 'timeline' ? 'mobile-hidden' : ''}`}
            >
              <Suspense fallback={<div className="map-loading-state" aria-label="Loading map" />}>
                <InteractiveMap
                  day={activeDay}
                  onSelectStop={(s) => {
                    setSelectedStopId(s.id);
                    setActiveDetailStopId(s.id);
                    setMobileView('timeline');
                  }}
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
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            </main>
          )}

          {/* TAB 4: COUPLE OUTFIT PLANNER & PACKING HUB */}
          {activeTab === 'outfits' && (
            <main className="subview-workspace">
              <PackingView
                trip={trip}
                looks={trip.looks || []}
                apiClient={apiClient}
                onUpdateLook={handleSaveLook}
                onDeleteLook={handleDeleteLook}
                onNavigateToDay={(dayNum) => {
                  setActiveDayIdx(dayNum - 1);
                  setActiveTab('timeline');
                }}
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
        dayDateStr={activeDay.dateStr}
        defaultStartTime={getNextSuggestedStartTime(activeDay.stops, trip.startTime || '09:00 AM')}
        fallbackCoordinates={
          activeDay.stops && activeDay.stops.length > 0
            ? activeDay.stops[activeDay.stops.length - 1].coordinates
            : undefined
        }
        onClose={() => setIsAddStopModalOpen(false)}
        onAddStop={handleAddStop}
        onAddDocument={handleAddDocument}
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
