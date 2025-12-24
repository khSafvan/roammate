export type TransitMode = 'drive' | 'walk' | 'transit';

export type StopCategory = 'flight' | 'lodging' | 'sight' | 'dining' | 'transit';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ItineraryStop {
  id: string;
  orderIndex: number;
  title: string;
  subtitle: string;
  category: StopCategory;
  startTime: string; // e.g. "09:30 AM"
  durationMinutes: number;
  coordinates: Coordinates;
  address: string;
  bookingRef?: string;
  hasTicket?: boolean;
  notes?: string;
  isAnchor?: boolean; // Morning/night anchor (e.g. hotel)
}

export interface TransitLeg {
  fromStopId: string;
  toStopId: string;
  mode: TransitMode;
  distanceKm: number;
  durationMinutes: number;
  isOutlier?: boolean; // High transit warning
}

export type WeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'clear';

export interface HourlyForecast {
  time: string;
  tempC: number;
  condition: WeatherCondition;
  rainChance: number;
}

export interface DayWeather {
  tempC: number;
  highC: number;
  lowC: number;
  condition: WeatherCondition;
  conditionText: string;
  rainProbability: number;
  humidity: number;
  uvIndex: number;
  clothingTip: string;
  hourly: HourlyForecast[];
}

export interface TripDay {
  id: string;
  dayNumber: number;
  dateStr: string;
  title: string;
  themeColor: string;
  weather: DayWeather;
  stops: ItineraryStop[];
}

export interface ReadinessItem {
  id: string;
  label: string;
  completed: boolean;
  critical: boolean;
}

// 1. Unified Flight Model
export interface Flight {
  id: string;
  flightNumber: string;
  carrier: string;
  date: string;
  departure: {
    airport: string;
    city: string;
    time: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    city: string;
    time: string;
    terminal?: string;
    gate?: string;
    nextDay?: boolean;
  };
  bookingRef?: string;
  seat?: string;
  notes?: string;
}

// 2. Unified Expense Model
export const EXPENSE_CATEGORIES = [
  'Flights',
  'Lodging',
  'Food & Drinks',
  'Transport',
  'Activities',
  'Shopping',
  'Miscellaneous',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  paidBy: string;
  notes?: string;
}

// 3. Unified Itinerary Document (Single flexible JSON document)
export interface Trip {
  id: string;
  tripId?: string; // Unified identifier alias
  title: string;
  dates: string;
  destination: string;
  baseCurrency: string;
  shareToken?: string;
  readinessScore: number;
  flights: Flight[];
  days: TripDay[];
  expenses: Expense[];
  readinessChecklist: ReadinessItem[];
}

// 4. Cryptographic Vault Session & Edge Sync Result
export interface VaultSession {
  userId: string;
  phraseSnippet: string;
  createdAt: number;
  lastAccessedAt: number;
}

export interface SyncResult {
  success: boolean;
  message?: string;
  lastSyncedAt?: number;
}
