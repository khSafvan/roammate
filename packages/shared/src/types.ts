export type TransitMode = 'drive' | 'walk' | 'transit';

export type StopCategory = 'flight' | 'lodging' | 'sight' | 'dining' | 'transit' | 'note';

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
  openTime?: string; // e.g. "09:00 AM" (opening hours)
  closeTime?: string; // e.g. "05:00 PM" (closing hours)
  isFixedTime?: boolean; // Locked reservation or timed ticket slot
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
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
  sunrise?: string;
  sunset?: string;
  goldenHour?: string;
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
  userId?: string; // Owning account UUID
  tripId?: string; // Unified identifier alias
  title: string;
  dates: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  destination: string;
  countryCode?: string;   // ISO 3166-1 alpha-2 (e.g. "AE", "MY") for public holiday lookup
  baseCurrency: string;   // destination/trip currency
  homeCurrency?: string;  // user's home currency for live conversion
  shareToken?: string;
  guestKey?: string;  // Secret guest link key - only persons with this key can view the trip
  readinessScore: number;
  travelers?: string[];
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
  token?: string;
  expiresAt?: number;
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

// 5. Outbox & Sync Models
export type SyncOperation = 'upsert' | 'delete';

export interface OutboxEntry {
  id: string;
  entity: string; // e.g. 'trip'
  op: SyncOperation;
  payload: any;
  clientTimestamp: number;
}

export interface SyncPushResponse {
  success: boolean;
  applied: number;
  serverTimestamp: number;
}

export interface SyncRecord {
  id: string;
  entity: string;
  op: SyncOperation;
  data: any;
  updatedAt: number;
}

export interface SyncPullResponse {
  serverTimestamp: number;
  records: SyncRecord[];
}

export interface AuthResponse {
  success?: boolean;
  token?: string;
  userId?: string;
  uuid?: string;
  expiresAt?: number;
  lastAccessedAt?: number;
  error?: string;
  status?: string;
}
