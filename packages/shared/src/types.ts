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
  notes?: string; // Day-level notes / scratchpad
}

export type PackingCategory =
  | 'Clothes'
  | 'Toiletries'
  | 'Electronics'
  | 'Documents'
  | 'Essentials';

export interface PackingItem {
  id: string;
  category: PackingCategory;
  name: string;
  packed: boolean;
  quantity?: number;
}

export interface ReadinessItem {
  id: string;
  label: string;
  completed: boolean;
  critical: boolean;
}

// 1. Unified Flight Model with Multi-Origin Passenger Ticket Support
export interface Flight {
  id: string;
  flightNumber: string;
  carrier: string;
  date: string;
  passengerName?: string; // Passenger / companion name (e.g. "Alex (NYC)", "Elena (London)")
  originCountry?: string; // e.g. "United States", "United Kingdom"
  originCity?: string;    // e.g. "New York", "London"
  cabinClass?: 'Economy' | 'Premium Economy' | 'Business' | 'First';
  eTicketNumber?: string;
  departure: {
    airport: string;
    city: string;
    time: string;
    country?: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    city: string;
    time: string;
    country?: string;
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
  splitWith?: string[]; // Array of participant names (defaults to all travelers if omitted or empty)
  notes?: string;
  isSettlement?: boolean; // Marker for debt settlement reimbursement transactions
}

export interface DebtSettlement {
  from: string;
  to: string;
  amount: number;
}

export interface TravelerBalance {
  name: string;
  paid: number;
  share: number;
  net: number; // positive = owed money (+), negative = owes money (-)
}

export type ReservationCategory = 'flight' | 'hotel' | 'activity' | 'transit' | 'doc';

export interface BookingDocument {
  id: string;
  category: ReservationCategory;
  title: string;
  subtitle?: string;
  confirmationCode?: string;
  date?: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  passengerOrGuestName?: string;
  cabinOrRoomType?: string;
  seatOrRoomNumber?: string;
  qrCodeData?: string;
  attachmentName?: string;
  notes?: string;
  flightData?: Flight;
}

// 3. Unified Itinerary Document (Single flexible JSON document)
export interface Trip {
  id: string;
  tripId?: string; // Unified identifier alias
  title: string;
  dates: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  destination: string;
  baseCurrency: string;
  shareToken?: string;
  guestKey?: string;  // Secret guest link key - only persons with this key can view the trip
  readinessScore: number;
  flights: Flight[];
  documents?: BookingDocument[];
  days: TripDay[];
  placesToVisit?: ItineraryStop[]; // Unscheduled Ideas / Places to Visit bucket
  expenses: Expense[];
  readinessChecklist: ReadinessItem[];
  packingList?: PackingItem[]; // Categorized Packing Checklist
  generalNotes?: string; // Scratchpad & general trip notes
  emergencyContacts?: string; // Emergency numbers, embassy contacts, door codes
  createdAt?: number;
  updatedAt?: number;
}

export interface TripSummary {
  id: string;
  title: string;
  destination: string;
  dates: string;
  startDate?: string;
  endDate?: string;
  readinessScore: number;
  daysCount: number;
  flightsCount: number;
  updatedAt?: number;
}


// 4. Cryptographic Vault Session & Edge Sync Result
export interface AuthCredentials {
  uuid: string;
  passwordHash: string;
}

export interface VaultSession {
  userId: string;
  accountTag?: string; // Short preview e.g. "c7a1...0814"
  phraseSnippet?: string; // Legacy mnemonic snippet
  createdAt: number;
  lastAccessedAt: number;
}

export interface SyncResult {
  success: boolean;
  message?: string;
  lastSyncedAt?: number;
}
