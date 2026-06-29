import { describe, expect, it } from 'vitest';
import { Look, Trip } from '@mojolog/shared';

describe('Couple Outfit Planner Data Model & State', () => {
  const sampleTrip: Trip = {
    id: 'trip_101',
    title: 'Paris Romance',
    destination: 'Paris, France',
    dates: 'Oct 1 - Oct 5',
    readinessScore: 85,
    baseCurrency: 'EUR',
    travelers: ['Elena', 'Marco'],
    flights: [],
    expenses: [],
    readinessChecklist: [],
    days: [
      {
        id: 'day_1',
        dayNumber: 1,
        date: '2026-10-01',
        theme: 'Arrival & Eiffel Tower',
        stops: [
          {
            id: 'stop_eiffel',
            orderIndex: 1,
            title: 'Eiffel Tower Sunset',
            subtitle: 'Iconic golden hour',
            category: 'sight',
            startTime: '05:30 PM',
            durationMinutes: 90,
            coordinates: { latitude: 48.8584, longitude: 2.2945 },
            address: 'Champ de Mars, Paris',
          },
          {
            id: 'stop_bistro',
            orderIndex: 2,
            title: 'Le Jules Verne Dinner',
            subtitle: 'Romantic fine dining',
            category: 'dining',
            startTime: '08:00 PM',
            durationMinutes: 120,
            coordinates: { latitude: 48.8583, longitude: 2.2944 },
            address: 'Eiffel Tower 2nd Floor',
          },
        ],
      },
    ],
    looks: [
      {
        id: 'look_sunset',
        tripId: 'trip_101',
        eventId: 'stop_eiffel',
        position: 0,
        person1Original: 'https://r2.mojolog.com/outfits/orig_elena.webp',
        person1Cutout: 'https://r2.mojolog.com/outfits/cut_elena.webp',
        person1Label: 'Burgundy Trench & Scarf',
        person1UseCutout: true,
        person2Original: 'https://r2.mojolog.com/outfits/orig_marco.webp',
        person2Cutout: 'https://r2.mojolog.com/outfits/cut_marco.webp',
        person2Label: 'Charcoal Overcoat',
        person2UseCutout: true,
        packed: false,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
      {
        id: 'look_dinner',
        tripId: 'trip_101',
        eventId: 'stop_bistro',
        position: 1,
        person1Original: 'https://r2.mojolog.com/outfits/orig_dress.webp',
        person1Cutout: 'https://r2.mojolog.com/outfits/cut_dress.webp',
        person1Label: 'Silk Evening Gown',
        person1UseCutout: true,
        person2Original: 'https://r2.mojolog.com/outfits/orig_tux.webp',
        person2Cutout: 'https://r2.mojolog.com/outfits/cut_tux.webp',
        person2Label: 'Black Tuxedo',
        person2UseCutout: true,
        packed: true,
        createdAt: 1700000010000,
        updatedAt: 1700000010000,
      },
    ],
  };

  it('correctly maps traveler names to slots', () => {
    const person1Name = sampleTrip.travelers?.[0] || 'Person 1';
    const person2Name = sampleTrip.travelers?.[1] || 'Person 2';

    expect(person1Name).toBe('Elena');
    expect(person2Name).toBe('Marco');
  });

  it('toggles restore/cutout mode without mutating image URLs', () => {
    const originalLook = sampleTrip.looks![0];
    const toggledLook: Look = {
      ...originalLook,
      person1UseCutout: !originalLook.person1UseCutout,
      updatedAt: Date.now(),
    };

    expect(toggledLook.person1UseCutout).toBe(false);
    expect(toggledLook.person1Original).toBe(originalLook.person1Original);
    expect(toggledLook.person1Cutout).toBe(originalLook.person1Cutout);
  });

  it('calculates luggage packing readiness accurately', () => {
    const totalLooks = sampleTrip.looks!.length;
    const packedCount = sampleTrip.looks!.filter((l) => l.packed).length;
    const percentage = Math.round((packedCount / totalLooks) * 100);

    expect(totalLooks).toBe(2);
    expect(packedCount).toBe(1);
    expect(percentage).toBe(50);
  });

  it('cascades deletion of attached looks when an itinerary stop is removed', () => {
    const stopIdToDelete = 'stop_eiffel';

    const remainingStops = sampleTrip.days[0].stops.filter((s) => s.id !== stopIdToDelete);
    const remainingLooks = (sampleTrip.looks || []).filter((l) => l.eventId !== stopIdToDelete);

    expect(remainingStops).toHaveLength(1);
    expect(remainingLooks).toHaveLength(1);
    expect(remainingLooks[0].eventId).toBe('stop_bistro');
  });
});
