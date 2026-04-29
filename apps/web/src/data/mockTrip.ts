import { Trip } from '../types/trip';
import { mockDubaiTripData } from './mockDubaiTrip';

export { mockDubaiTripData };

// Canonical editable sample used by demo accounts and first-run tutorials.
export const mockTripData: Trip = mockDubaiTripData;

export const INITIAL_TRIPS_CATALOG: Trip[] = [mockTripData];
