export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface Airline {
  iata: string;
  name: string;
  country: string;
}

export const AIRPORTS: Record<string, Airport> = {
  DXB: { iata: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai' },
  JFK: { iata: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'US', timezone: 'America/New_York' },
  LHR: { iata: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', timezone: 'Europe/London' },
  LAX: { iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US', timezone: 'America/Los_Angeles' },
  SFO: { iata: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'US', timezone: 'America/Los_Angeles' },
  CDG: { iata: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  SIN: { iata: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  NRT: { iata: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  HND: { iata: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  AMS: { iata: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam' },
  FRA: { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin' },
  DOH: { iata: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', timezone: 'Asia/Qatar' },
  ICN: { iata: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul' },
  BKK: { iata: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok' },
  SYD: { iata: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney' },
};

export const AIRLINES: Record<string, Airline> = {
  EK: { iata: 'EK', name: 'Emirates', country: 'UAE' },
  SQ: { iata: 'SQ', name: 'Singapore Airlines', country: 'Singapore' },
  UA: { iata: 'UA', name: 'United Airlines', country: 'US' },
  BA: { iata: 'BA', name: 'British Airways', country: 'UK' },
  AF: { iata: 'AF', name: 'Air France', country: 'France' },
  JL: { iata: 'JL', name: 'Japan Airlines', country: 'Japan' },
  NH: { iata: 'NH', name: 'All Nippon Airways', country: 'Japan' },
  LH: { iata: 'LH', name: 'Lufthansa', country: 'Germany' },
  QR: { iata: 'QR', name: 'Qatar Airways', country: 'Qatar' },
  DL: { iata: 'DL', name: 'Delta Air Lines', country: 'US' },
  AA: { iata: 'AA', name: 'American Airlines', country: 'US' },
  CX: { iata: 'CX', name: 'Cathay Pacific', country: 'Hong Kong' },
  QF: { iata: 'QF', name: 'Qantas', country: 'Australia' },
};

export function parseFlightCode(input: string): { airlineCode: string; flightNum: string } | null {
  const match = input.replace(/\s+/g, '').toUpperCase().match(/^([A-Z0-9]{2})(\d{1,4})$/);
  if (!match) return null;
  return { airlineCode: match[1], flightNum: match[2] };
}

export function resolveFlightNumber(input: string): any {
  const parsed = parseFlightCode(input);
  if (!parsed) return null;

  const airline = AIRLINES[parsed.airlineCode];
  
  // Mock route data for a few known flights for demonstration
  let dep = 'DXB';
  let arr = 'LHR';
  let depTime = '08:00';
  let arrTime = '12:30';
  let duration = 450;
  let airplane = 'Boeing 777-300ER';
  let nextDay = false;

  if (parsed.airlineCode === 'EK' && parsed.flightNum === '318') {
    dep = 'DXB'; arr = 'NRT'; depTime = '02:40'; arrTime = '17:35'; duration = 595; airplane = 'Airbus A380';
  } else if (parsed.airlineCode === 'UA' && parsed.flightNum === '875') {
    dep = 'SFO'; arr = 'HND'; depTime = '10:45'; arrTime = '14:15'; nextDay = true; duration = 690; airplane = 'Boeing 777-200ER';
  } else if (parsed.airlineCode === 'BA' && parsed.flightNum === '117') {
    dep = 'LHR'; arr = 'JFK'; depTime = '08:25'; arrTime = '11:20'; duration = 475; airplane = 'Boeing 777';
  } else if (parsed.airlineCode === 'SQ' && parsed.flightNum === '12') {
    dep = 'SIN'; arr = 'LAX'; depTime = '09:25'; arrTime = '09:05'; duration = 940; airplane = 'Airbus A350-900';
  }

  const depAirport = AIRPORTS[dep] || { name: 'Unknown', city: 'Unknown', country: 'Unknown' };
  const arrAirport = AIRPORTS[arr] || { name: 'Unknown', city: 'Unknown', country: 'Unknown' };

  return {
    carrier: airline ? airline.name : parsed.airlineCode,
    flightNumber: `${parsed.airlineCode}${parsed.flightNum}`,
    durationMinutes: duration,
    airplaneType: airplane,
    departure: {
      airport: dep,
      city: depAirport.city,
      time: depTime,
      country: depAirport.country,
      terminal: '1',
      gate: 'A1'
    },
    arrival: {
      airport: arr,
      city: arrAirport.city,
      time: arrTime,
      country: arrAirport.country,
      terminal: '2',
      gate: 'B2',
      nextDay
    }
  };
}
