export interface AirportInfo {
  iata: string;
  name: string;
  city: string;
  country: string;
  defaultTerminal?: string;
}

export const KNOWN_AIRPORTS: Record<string, AirportInfo> = {
  DXB: { iata: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', defaultTerminal: 'Terminal 3' },
  DWC: { iata: 'DWC', name: 'Al Maktoum International Airport', city: 'Dubai', country: 'United Arab Emirates', defaultTerminal: 'Passenger Terminal' },
  AUH: { iata: 'AUH', name: 'Zayed International Airport', city: 'Abu Dhabi', country: 'United Arab Emirates', defaultTerminal: 'Terminal A' },
  DOH: { iata: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', defaultTerminal: 'Terminal 1' },
  JFK: { iata: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', defaultTerminal: 'Terminal 4' },
  EWR: { iata: 'EWR', name: 'Newark Liberty International Airport', city: 'New York / Newark', country: 'United States', defaultTerminal: 'Terminal B' },
  LGA: { iata: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'United States', defaultTerminal: 'Terminal B' },
  SFO: { iata: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', defaultTerminal: 'International Terminal' },
  LAX: { iata: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', defaultTerminal: 'Tom Bradley Int Terminal' },
  ORD: { iata: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'United States', defaultTerminal: 'Terminal 5' },
  SEA: { iata: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States', defaultTerminal: 'Main Terminal' },
  LHR: { iata: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom', defaultTerminal: 'Terminal 5' },
  LGW: { iata: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'United Kingdom', defaultTerminal: 'South Terminal' },
  CDG: { iata: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', defaultTerminal: 'Terminal 2E' },
  AMS: { iata: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', defaultTerminal: 'Departure Hall 3' },
  FRA: { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', defaultTerminal: 'Terminal 1' },
  MUC: { iata: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany', defaultTerminal: 'Terminal 2' },
  ZRH: { iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', defaultTerminal: 'Terminal 1' },
  FCO: { iata: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy', defaultTerminal: 'Terminal 3' },
  MAD: { iata: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', defaultTerminal: 'Terminal 4' },
  BCN: { iata: 'BCN', name: 'Josep Tarradellas Barcelona-El Prat Airport', city: 'Barcelona', country: 'Spain', defaultTerminal: 'Terminal 1' },
  IST: { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', defaultTerminal: 'Main Terminal' },
  SIN: { iata: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', defaultTerminal: 'Terminal 3' },
  KUL: { iata: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia', defaultTerminal: 'Terminal 1' },
  PEN: { iata: 'PEN', name: 'Penang International Airport', city: 'Penang', country: 'Malaysia', defaultTerminal: 'Main Terminal' },
  BKK: { iata: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', defaultTerminal: 'Main Terminal' },
  DMK: { iata: 'DMK', name: 'Don Mueang International Airport', city: 'Bangkok', country: 'Thailand', defaultTerminal: 'Terminal 1' },
  DPS: { iata: 'DPS', name: 'Ngurah Rai International Airport', city: 'Bali / Denpasar', country: 'Indonesia', defaultTerminal: 'International Terminal' },
  HND: { iata: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', defaultTerminal: 'Terminal 3' },
  NRT: { iata: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', defaultTerminal: 'Terminal 1' },
  KIX: { iata: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'Japan', defaultTerminal: 'Terminal 1' },
  ICN: { iata: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', defaultTerminal: 'Terminal 2' },
  HKG: { iata: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', defaultTerminal: 'Terminal 1' },
  SYD: { iata: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', defaultTerminal: 'Terminal 1' },
  MEL: { iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', defaultTerminal: 'Terminal 2' },
  YVR: { iata: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', defaultTerminal: 'International Terminal' },
  YYZ: { iata: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', defaultTerminal: 'Terminal 1' },
};

export function lookupAirport(codeOrQuery: string): AirportInfo | undefined {
  if (!codeOrQuery) return undefined;
  const q = codeOrQuery.trim().toUpperCase();
  if (KNOWN_AIRPORTS[q]) {
    return KNOWN_AIRPORTS[q];
  }

  // Search by city or name
  const queryLower = codeOrQuery.toLowerCase().trim();
  return Object.values(KNOWN_AIRPORTS).find(
    (a) =>
      a.iata.toLowerCase() === queryLower ||
      a.city.toLowerCase().includes(queryLower) ||
      a.name.toLowerCase().includes(queryLower)
  );
}
