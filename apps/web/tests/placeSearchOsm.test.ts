import { describe, expect, it } from 'vitest';
import { inferCategoryFromOsm } from '../src/components/PlaceSearchInput';

describe('OpenStreetMap / Nominatim Category Inference (Feature F2)', () => {
  it('correctly categorizes dining amenities', () => {
    expect(inferCategoryFromOsm({ class: 'amenity', type: 'restaurant' })).toBe('dining');
    expect(inferCategoryFromOsm({ class: 'amenity', type: 'cafe' })).toBe('dining');
    expect(inferCategoryFromOsm({ class: 'amenity', type: 'fast_food' })).toBe('dining');
    expect(inferCategoryFromOsm({ class: 'amenity', type: 'bar' })).toBe('dining');
  });

  it('correctly categorizes lodging tourism items', () => {
    expect(inferCategoryFromOsm({ class: 'tourism', type: 'hotel' })).toBe('lodging');
    expect(inferCategoryFromOsm({ class: 'tourism', type: 'hostel' })).toBe('lodging');
    expect(inferCategoryFromOsm({ class: 'tourism', type: 'guest_house' })).toBe('lodging');
  });

  it('correctly categorizes aviation and airports', () => {
    expect(inferCategoryFromOsm({ class: 'aeroway', type: 'aerodrome' })).toBe('flight');
    expect(inferCategoryFromOsm({ class: 'aeroway', type: 'terminal' })).toBe('flight');
    expect(inferCategoryFromOsm({ address: { aeroway: 'DXB' } })).toBe('flight');
  });

  it('correctly categorizes transit hubs', () => {
    expect(inferCategoryFromOsm({ class: 'railway', type: 'station' })).toBe('transit');
    expect(inferCategoryFromOsm({ class: 'highway', type: 'bus_station' })).toBe('transit');
    expect(inferCategoryFromOsm({ class: 'amenity', type: 'ferry_terminal' })).toBe('transit');
  });

  it('defaults to sight & attraction for landmarks and unknown POIs', () => {
    expect(inferCategoryFromOsm({ class: 'tourism', type: 'attraction' })).toBe('sight');
    expect(inferCategoryFromOsm({ class: 'historic', type: 'monument' })).toBe('sight');
    expect(inferCategoryFromOsm({})).toBe('sight');
  });
});
