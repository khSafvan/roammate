import { Trip } from '../types/trip';
import { mockDubaiTripData } from './mockDubaiTrip';
import { mockMalaysiaTripData } from './mockMalaysiaTrip';

export { mockDubaiTripData, mockMalaysiaTripData };

// Primary Default Sample Trip: Dubai & Abu Dhabi Discovery
export const mockTripData: Trip = mockDubaiTripData;

export const INITIAL_TRIPS_CATALOG: Trip[] = [
  mockDubaiTripData,
  mockMalaysiaTripData,
];
