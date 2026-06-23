import { describe, expect, it } from 'vitest';
import { getDayAnchors, inferPlaceCategory, isThemeParkOrAttraction } from '../src';
import { BookingDocument } from '@mojolog/shared';

describe('placeCategory', () => {
  it('correctly classifies theme parks and waterparks', () => {
    const ferrari = inferPlaceCategory({ name: 'Ferrari World Abu Dhabi', address: 'Yas Island' });
    expect(ferrari.category).toBe('sight');
    expect(ferrari.subType).toBe('theme_park');
    expect(ferrari.isThemeParkOrAttraction).toBe(true);

    const aqua = inferPlaceCategory({ name: 'Atlantis Aquaventure Waterpark', address: 'Palm Jumeirah' });
    expect(aqua.category).toBe('sight');
    expect(aqua.subType).toBe('water_park');
    expect(aqua.isThemeParkOrAttraction).toBe(true);
  });

  it('correctly classifies hotels and lodging', () => {
    const hotel = inferPlaceCategory({ name: 'The Kuala Lumpur Journal Hotel', address: 'Bukit Bintang' });
    expect(hotel.category).toBe('lodging');
    expect(hotel.isHotel).toBe(true);
    expect(hotel.suggestedStayAnchor).toBe(true);
  });

  it('correctly classifies restaurants and cafes', () => {
    const dining = inferPlaceCategory({ name: 'Nobu Dubai', address: 'Atlantis The Palm' });
    expect(dining.category).toBe('dining');
    expect(dining.subType).toBe('restaurant');
  });

  it('correctly classifies airports', () => {
    const airport = inferPlaceCategory({ name: 'Dubai International Airport (DXB)', address: 'Airport Rd' });
    expect(airport.category).toBe('flight');
    expect(airport.isFlight).toBe(true);
  });
});

describe('getDayAnchors (Wanderlog Hotel Lifecycle)', () => {
  const documents: BookingDocument[] = [
    {
      id: 'h1',
      category: 'hotel',
      title: 'The Kuala Lumpur Journal Hotel',
      date: '2026-11-08',
      endDate: '2026-11-14',
      time: '03:00 PM',
      endTime: '11:00 AM',
      location: 'Bukit Bintang, KL',
    },
    {
      id: 'h2',
      category: 'hotel',
      title: 'The RIYAZ Lavanya Langkawi',
      date: '2026-11-14',
      endDate: '2026-11-20',
      time: '02:00 PM',
      endTime: '12:00 PM',
      location: 'Pantai Tengah, Langkawi',
    },
  ];

  it('Day 1: Initial check-in day sets ending anchor to hotel check-in', () => {
    const anchors = getDayAnchors('2026-11-08', documents);
    expect(anchors.startAnchor).toBeNull();
    expect(anchors.endAnchor).not.toBeNull();
    expect(anchors.endAnchor?.action).toBe('check_in');
    expect(anchors.endAnchor?.title).toBe('The Kuala Lumpur Journal Hotel');
    expect(anchors.isTransitionDay).toBe(false);
  });

  it('Intermediate Day: Sets hotel as both depart and return base anchors', () => {
    const anchors = getDayAnchors('2026-11-10', documents);
    expect(anchors.startAnchor).not.toBeNull();
    expect(anchors.startAnchor?.action).toBe('depart');
    expect(anchors.startAnchor?.title).toBe('The Kuala Lumpur Journal Hotel');
    expect(anchors.endAnchor).not.toBeNull();
    expect(anchors.endAnchor?.action).toBe('return');
    expect(anchors.isTransitionDay).toBe(false);
  });

  it('Hotel Transition Day (Nov 14): Starts with checkout of Hotel 1 and ends with checkin to Hotel 2', () => {
    const anchors = getDayAnchors('2026-11-14', documents);
    expect(anchors.isTransitionDay).toBe(true);
    expect(anchors.startAnchor?.action).toBe('check_out');
    expect(anchors.startAnchor?.title).toBe('The Kuala Lumpur Journal Hotel');
    expect(anchors.endAnchor?.action).toBe('check_in');
    expect(anchors.endAnchor?.title).toBe('The RIYAZ Lavanya Langkawi');
  });

  it('Final Check-out Day (Nov 20): Sets start anchor to checkout and end anchor to null', () => {
    const anchors = getDayAnchors('2026-11-20', documents);
    expect(anchors.startAnchor?.action).toBe('check_out');
    expect(anchors.startAnchor?.title).toBe('The RIYAZ Lavanya Langkawi');
    expect(anchors.endAnchor).toBeNull();
  });
});
