import { describe, it, expect } from 'vitest';
import { Look, LookOccasion } from '@roammate/shared';

describe('Outfit & Digital Wardrobe Features', () => {
  it('supports unassigned looks in digital wardrobe closet', () => {
    const unassignedLook: Look = {
      id: 'look_unassigned_1',
      tripId: 'trip_dubai',
      eventId: 'unassigned',
      dayNumber: undefined,
      title: 'Desert Sunset Chic',
      occasion: 'dining',
      person1Label: 'Linen Shirt & Chinos',
      person2Label: 'Terracotta Maxi Dress',
      packed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(unassignedLook.eventId).toBe('unassigned');
    expect(unassignedLook.dayNumber).toBeUndefined();
    expect(unassignedLook.occasion).toBe('dining');
  });

  it('assigns an unassigned wardrobe look to a specific day and place', () => {
    const wardrobeLook: Look = {
      id: 'look_wardrobe_1',
      tripId: 'trip_dubai',
      eventId: 'unassigned',
      dayNumber: undefined,
      title: 'Marina Yacht Glam',
      occasion: 'formal',
      person1Label: 'Navy Blazer & White Trousers',
      person2Label: 'Emerald Silk Dress',
      packed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const targetDayNumber = 3;
    const targetEventId = 'stop_marina_dinner';

    const assignedLook: Look = {
      ...wardrobeLook,
      dayNumber: targetDayNumber,
      eventId: targetEventId,
      updatedAt: Date.now(),
    };

    expect(assignedLook.id).toBe(wardrobeLook.id);
    expect(assignedLook.dayNumber).toBe(3);
    expect(assignedLook.eventId).toBe('stop_marina_dinner');
    expect(assignedLook.occasion).toBe('formal');
  });

  it('duplicates an outfit for wearing again on another day', () => {
    const originalLook: Look = {
      id: 'look_day1_casual',
      tripId: 'trip_dubai',
      eventId: 'day_1',
      dayNumber: 1,
      title: 'Old Dubai Heritage Look',
      occasion: 'cultural',
      person1Label: 'Breathable Cotton Kurta',
      person2Label: 'Modest Linen Abaya Set',
      packed: true,
      createdAt: 1000,
      updatedAt: 1000,
    };

    const targetDayNumber = 4;
    const newLookId = `look_${Date.now()}_wear_again`;

    const duplicatedLook: Look = {
      ...originalLook,
      id: newLookId,
      dayNumber: targetDayNumber,
      eventId: `day_${targetDayNumber}`,
      title: `${originalLook.title} (Wear Again)`,
      packed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(duplicatedLook.id).not.toBe(originalLook.id);
    expect(duplicatedLook.dayNumber).toBe(4);
    expect(duplicatedLook.eventId).toBe('day_4');
    expect(duplicatedLook.title).toContain('Wear Again');
    expect(duplicatedLook.packed).toBe(false); // Reset packed status
    expect(duplicatedLook.person1Label).toBe(originalLook.person1Label);
    expect(duplicatedLook.person2Label).toBe(originalLook.person2Label);
    expect(duplicatedLook.occasion).toBe('cultural');
  });

  it('filters wardrobe looks by occasion and traveler', () => {
    const sampleLooks: Look[] = [
      {
        id: 'look_1',
        tripId: 'trip_dubai',
        eventId: 'unassigned',
        occasion: 'beach',
        person1Label: 'Swim shorts',
        person2Label: 'One-piece swimsuit',
        packed: false,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'look_2',
        tripId: 'trip_dubai',
        eventId: 'day_2',
        dayNumber: 2,
        occasion: 'dining',
        person1Label: 'Oxford shirt',
        packed: false,
        createdAt: 2,
        updatedAt: 2,
      },
      {
        id: 'look_3',
        tripId: 'trip_dubai',
        eventId: 'unassigned',
        occasion: 'cultural',
        person2Label: 'Modest scarf set',
        packed: false,
        createdAt: 3,
        updatedAt: 3,
      },
    ];

    const beachLooks = sampleLooks.filter((l) => l.occasion === 'beach');
    expect(beachLooks).toHaveLength(1);
    expect(beachLooks[0].id).toBe('look_1');

    const unassignedLooks = sampleLooks.filter(
      (l) => !(l.dayNumber && l.eventId && l.eventId !== 'unassigned')
    );
    expect(unassignedLooks).toHaveLength(2);

    const looksWithPerson1 = sampleLooks.filter((l) => Boolean(l.person1Label || l.person1Original || l.person1Cutout));
    expect(looksWithPerson1).toHaveLength(2);
  });
});
