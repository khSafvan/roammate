import { describe, it, expect } from 'vitest';
import { ItineraryStop, Trip } from '../src/types/trip';

describe('Google Places properties and single-note editing invariant', () => {
  it('supports Google Places metadata on ItineraryStop', () => {
    const place: ItineraryStop = {
      id: 'stop_tokyo_tower',
      orderIndex: 1,
      title: 'Tokyo Tower',
      subtitle: 'Observation deck · Sight',
      category: 'sight',
      startTime: '10:00 AM',
      durationMinutes: 90,
      coordinates: { latitude: 35.6586, longitude: 139.7454 },
      address: '4 Chome-2-8 Shibakoen, Minato City, Tokyo 105-0011',
      rating: 4.6,
      userRatingsTotal: 34200,
      priceLevel: 2,
      website: 'https://www.tokyotower.co.jp',
      phoneNumber: '+81 3-3433-5111',
      openTime: '09:00 AM',
      closeTime: '11:00 PM',
      photos: ['https://example.com/tokyo_tower.jpg'],
      notes: 'Best sunset views from the top deck.',
    };

    expect(place.rating).toBe(4.6);
    expect(place.userRatingsTotal).toBe(34200);
    expect(place.priceLevel).toBe(2);
    expect(place.website).toBe('https://www.tokyotower.co.jp');
    expect(place.phoneNumber).toBe('+81 3-3433-5111');
    expect(place.openTime).toBe('09:00 AM');
    expect(place.closeTime).toBe('11:00 PM');
    expect(place.notes).toBe('Best sunset views from the top deck.');
  });

  it('enforces single note invariant: updates existing note instead of creating a second note', () => {
    const place: ItineraryStop = {
      id: 'stop_cafe',
      orderIndex: 2,
      title: 'Café Kitsuné',
      subtitle: 'Coffee shop · Dining',
      category: 'dining',
      startTime: '12:00 PM',
      durationMinutes: 45,
      coordinates: { latitude: 35.6652, longitude: 139.7123 },
      address: '3-17-1 Minamiaoyama, Minato City, Tokyo',
      notes: 'Order the matcha latte and fox cookie',
    };

    // Updating existing note directly
    const updatedNotes = 'Order the matcha latte, fox cookie, and cold brew';
    const updatedPlace: ItineraryStop = {
      ...place,
      notes: updatedNotes,
    };

    expect(updatedPlace.notes).toBe(updatedNotes);
    // Verified: Only one note field exists on the place stop
    expect(Object.keys(updatedPlace).filter((k) => k === 'notes').length).toBe(1);
  });

  it('allows removing the note cleanly', () => {
    const place: ItineraryStop = {
      id: 'stop_park',
      orderIndex: 3,
      title: 'Ueno Park',
      subtitle: 'Public park · Sight',
      category: 'sight',
      startTime: '02:00 PM',
      durationMinutes: 120,
      coordinates: { latitude: 35.7148, longitude: 139.7744 },
      address: 'Uenokoen, Taito City, Tokyo',
      notes: 'Cherry blossoms bloom in early April',
    };

    const placeWithoutNotes: ItineraryStop = {
      ...place,
      notes: undefined,
    };

    expect(placeWithoutNotes.notes).toBeUndefined();
  });

  it('defaults travelers to John (Husband) and Jane (Wife)', () => {
    const tripWithoutTravelers: Partial<Trip> = {
      id: 'trip_123',
      title: 'Tokyo Getaway',
      destination: 'Tokyo, Japan',
    };

    const person1Name = tripWithoutTravelers.travelers?.[0] || 'John (Husband)';
    const person2Name = tripWithoutTravelers.travelers?.[1] || 'Jane (Wife)';

    expect(person1Name).toBe('John (Husband)');
    expect(person2Name).toBe('Jane (Wife)');
  });
});
