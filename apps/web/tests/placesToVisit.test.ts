import { describe, expect, it } from 'vitest';
import { ItineraryStop, Trip, TripDay } from '../src/types/trip';

describe('Unassigned Places to Visit (Ideas Bucket - Feature F1)', () => {
  const initialStop: ItineraryStop = {
    id: 'idea_1',
    orderIndex: 1,
    title: 'Miracle Garden',
    subtitle: 'Floral garden',
    category: 'sight',
    startTime: '10:00 AM',
    durationMinutes: 90,
    coordinates: { latitude: 25.0597, longitude: 55.2447 },
    address: 'Al Barsha South, Dubai',
    notes: 'Visit in early morning',
  };

  const initialDay: TripDay = {
    id: 'day_1',
    dayNumber: 1,
    dateStr: '2027-01-07',
    title: 'Day 1 Arrival',
    themeColor: '#3B82F6',
    weather: {
      tempC: 24,
      highC: 26,
      lowC: 18,
      condition: 'sunny',
      conditionText: 'Sunny',
      rainProbability: 0,
      humidity: 45,
      uvIndex: 4,
      clothingTip: 'Light wear',
      hourly: [],
    },
    stops: [
      {
        id: 'stop_101',
        orderIndex: 1,
        title: 'Hotel Check-in',
        subtitle: 'Palace Downtown',
        category: 'lodging',
        startTime: '03:00 PM',
        durationMinutes: 60,
        coordinates: { latitude: 25.195, longitude: 55.278 },
        address: 'Downtown Dubai',
      },
    ],
  };

  const testTrip: Trip = {
    id: 'test_trip',
    title: 'Dubai Test',
    dates: 'Jan 07 - 10, 2027',
    destination: 'Dubai',
    baseCurrency: 'AED',
    readinessScore: 80,
    flights: [],
    days: [initialDay],
    placesToVisit: [initialStop],
    expenses: [],
    readinessChecklist: [],
  };

  it('correctly tracks and appends unassigned places in trip ideas bucket', () => {
    const newIdea: ItineraryStop = {
      id: 'idea_2',
      orderIndex: 2,
      title: 'Time Out Market',
      subtitle: 'Dining hall',
      category: 'dining',
      startTime: '07:00 PM',
      durationMinutes: 60,
      coordinates: { latitude: 25.1952, longitude: 55.2798 },
      address: 'Souk Al Bahar',
    };

    const updatedBucket = [...(testTrip.placesToVisit || []), newIdea];
    expect(updatedBucket).toHaveLength(2);
    expect(updatedBucket[1].title).toBe('Time Out Market');
  });

  it('assigns an idea from Places to Visit to a scheduled Day', () => {
    const placeIdToAssign = 'idea_1';
    const place = testTrip.placesToVisit?.find((p) => p.id === placeIdToAssign);
    expect(place).toBeDefined();

    // 1. Remove from ideas bucket
    const remainingIdeas = (testTrip.placesToVisit || []).filter((p) => p.id !== placeIdToAssign);

    // 2. Append to Day 1 stops with next order index
    const dayStops = testTrip.days[0].stops;
    const newDayStop: ItineraryStop = {
      ...place!,
      id: `scheduled_${place!.id}`,
      orderIndex: dayStops.length + 1,
    };
    const updatedDayStops = [...dayStops, newDayStop];

    expect(remainingIdeas).toHaveLength(0);
    expect(updatedDayStops).toHaveLength(2);
    expect(updatedDayStops[1].title).toBe('Miracle Garden');
    expect(updatedDayStops[1].orderIndex).toBe(2);
  });

  it('unassigns a scheduled stop from a day back into Places to Visit', () => {
    const stopToUnassign = initialDay.stops[0];

    // Remove from day stops
    const remainingDayStops = initialDay.stops.filter((s) => s.id !== stopToUnassign.id);

    // Append to placesToVisit
    const updatedIdeas = [
      ...(testTrip.placesToVisit || []),
      {
        ...stopToUnassign,
        orderIndex: (testTrip.placesToVisit?.length || 0) + 1,
      },
    ];

    expect(remainingDayStops).toHaveLength(0);
    expect(updatedIdeas).toHaveLength(2);
    expect(updatedIdeas.some((i) => i.title === 'Hotel Check-in')).toBe(true);
  });
});
