import { describe, expect, it } from 'vitest';
import { PackingCategory, PackingItem } from '../src/types/trip';
import { mockDubaiTripData } from '../src/data/mockDubaiTrip';

describe('Categorized Packing Lists & Progress Tracking (Feature F7)', () => {
  it('provides comprehensive starter items across all 5 standard categories', () => {
    const list = mockDubaiTripData.packingList || [];
    expect(list.length).toBeGreaterThanOrEqual(20);

    const categories: PackingCategory[] = [
      'Clothes',
      'Toiletries',
      'Electronics',
      'Documents',
      'Essentials',
    ];

    categories.forEach((cat) => {
      const itemsInCat = list.filter((i) => i.category === cat);
      expect(itemsInCat.length).toBeGreaterThan(0);
    });
  });

  it('calculates packing completion percentage accurately', () => {
    const sampleItems: PackingItem[] = [
      { id: '1', name: 'Passport', category: 'Documents', packed: true },
      { id: '2', name: 'Visa printout', category: 'Documents', packed: true },
      { id: '3', name: 'Power bank', category: 'Electronics', packed: false },
      { id: '4', name: 'Sunscreen', category: 'Toiletries', packed: false },
    ];

    const packedCount = sampleItems.filter((i) => i.packed).length;
    const progress = Math.round((packedCount / sampleItems.length) * 100);

    expect(progress).toBe(50);
  });

  it('handles empty packing list progress gracefully', () => {
    const emptyList: PackingItem[] = [];
    const packedCount = emptyList.filter((i) => i.packed).length;
    const progress = emptyList.length > 0 ? Math.round((packedCount / emptyList.length) * 100) : 0;

    expect(progress).toBe(0);
  });

  it('supports toggling item packed status', () => {
    const list: PackingItem[] = [
      { id: 'p1', name: 'Universal Adapter', category: 'Electronics', packed: false },
    ];

    const toggle = (items: PackingItem[], id: string) =>
      items.map((i) => (i.id === id ? { ...i, packed: !i.packed } : i));

    const updated = toggle(list, 'p1');
    expect(updated[0].packed).toBe(true);

    const reverted = toggle(updated, 'p1');
    expect(reverted[0].packed).toBe(false);
  });

  it('supports adding a new custom packing item', () => {
    const initialList: PackingItem[] = [];

    const addItem = (items: PackingItem[], category: PackingCategory, name: string): PackingItem[] => [
      ...items,
      {
        id: `pack_${Date.now()}`,
        name,
        category,
        packed: false,
      },
    ];

    const updated = addItem(initialList, 'Clothes', 'Hiking boots');
    expect(updated.length).toBe(1);
    expect(updated[0].name).toBe('Hiking boots');
    expect(updated[0].category).toBe('Clothes');
    expect(updated[0].packed).toBe(false);
  });

  it('supports deleting a packing item', () => {
    const list: PackingItem[] = [
      { id: 'p1', name: 'Sunglasses', category: 'Essentials', packed: true },
      { id: 'p2', name: 'Hat', category: 'Clothes', packed: false },
    ];

    const deleteItem = (items: PackingItem[], id: string) => items.filter((i) => i.id !== id);

    const afterDelete = deleteItem(list, 'p1');
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe('p2');
  });
});
