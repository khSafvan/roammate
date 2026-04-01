import { describe, expect, it } from 'vitest';
import { Trip } from '../src/types/trip';
import { generateIcalendarFeed } from '../src/utils/icalExport';

const mockSampleTrip: Trip = {
  id: 'trip_ical_test',
  title: 'Dubai & Abu Dhabi 2027',
  destination: 'Dubai, UAE',
  dates: '2027-01-08 – 2027-01-14',
  startDate: '2027-01-08',
  endDate: '2027-01-14',
  startTime: '09:00',
  endTime: '21:00',
  baseCurrency: 'AED',
  readinessScore: 85,
  readinessChecklist: [],
  flights: [
    {
      id: 'f1',
      carrier: 'Emirates',
      flightNumber: 'EK 202',
      date: '2027-01-08',
      passengerName: 'Zack Smith',
      bookingRef: 'EK99XYZ',
      seat: '14A',
      departure: {
        airport: 'JFK',
        city: 'New York',
        terminal: 'T4',
        gate: 'B22',
        time: '11:00',
      },
      arrival: {
        airport: 'DXB',
        city: 'Dubai',
        terminal: 'T3',
        gate: 'A1',
        time: '08:15',
        nextDay: true,
      },
      duration: '12h 15m',
    },
  ],
  documents: [
    {
      id: 'doc_hotel_1',
      title: 'Atlantis The Royal Resort',
      category: 'hotel',
      date: '2027-01-09',
      endDate: '2027-01-14',
      location: 'Palm Jumeirah, Dubai',
      confirmationCode: 'ATL-9841',
      passengerOrGuestName: 'Zack Smith',
      cabinOrRoomType: 'Sky Terrace Suite',
      cost: 4500,
      currency: 'AED',
      notes: 'Check-in 3:00 PM, late checkout requested',
    },
  ],
  days: [
    {
      id: 'day_1',
      dayNumber: 1,
      dateStr: '2027-01-09',
      title: 'Iconic Palm & Marina Exploration',
      themeColor: '#3B82F6',
      weather: {
        tempC: 24,
        highC: 26,
        lowC: 18,
        condition: 'sunny',
        conditionText: 'Clear',
        rainProbability: 0,
        humidity: 45,
        uvIndex: 6,
        clothingTip: 'Sunglasses and light attire',
        hourly: [],
      },
      stops: [
        {
          id: 'stop_burj',
          title: 'Burj Khalifa Observation Deck',
          category: 'Sightseeing',
          startTime: '10:00 AM',
          durationMinutes: 90,
          orderIndex: 1,
          coordinates: [55.2744, 25.1972],
          address: 'Downtown Dubai',
          notes: 'Level 148 At the Top tickets booked online',
        },
      ],
    },
  ],
  expenses: [],
};

describe('iCalendar (.ics) RFC 5545 Export (Feature F8)', () => {
  it('generates a valid RFC 5545 VCALENDAR header and footer', () => {
    const ics = generateIcalendarFeed(mockSampleTrip);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//roammate//Travel Itinerary//EN');
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics).toContain('METHOD:PUBLISH');
    expect(ics).toContain('X-WR-CALNAME:Dubai & Abu Dhabi 2027');
    expect(ics).toContain('X-WR-CALDESC:Dubai\\, UAE Itinerary');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('exports flight transit with correct carrier, airports, and metadata', () => {
    const ics = generateIcalendarFeed(mockSampleTrip);

    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:flight_f1_trip_ical_test@roammate.app');
    expect(ics).toContain('SUMMARY:✈️ Flight Emirates EK 202: JFK ➔ DXB');
    expect(ics).toContain('LOCATION:JFK\\, New York');
    expect(ics).toContain('Flight: Emirates EK 202');
    expect(ics).toContain('Passenger: Zack Smith');
    expect(ics).toContain('Booking Ref: EK99XYZ');
    expect(ics).toContain('Seat: 14A');
    expect(ics).toContain('Terminal: T4');
    expect(ics).toContain('Gate: B22');
  });

  it('exports hotel stay with check-in, check-out, and confirmation code', () => {
    const ics = generateIcalendarFeed(mockSampleTrip);

    expect(ics).toContain('UID:hotel_doc_hotel_1_trip_ical_test@roammate.app');
    expect(ics).toContain('SUMMARY:🏨 Hotel Stay: Atlantis The Royal Resort');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270109');
    expect(ics).toContain('DTEND;VALUE=DATE:20270114');
    expect(ics).toContain('LOCATION:Palm Jumeirah\\, Dubai');
    expect(ics).toContain('Confirmation Code: ATL-9841');
    expect(ics).toContain('Room: Sky Terrace Suite');
  });

  it('exports timed itinerary stops with duration and location', () => {
    const ics = generateIcalendarFeed(mockSampleTrip);

    expect(ics).toContain('UID:stop_stop_burj_day_1_trip_ical_test@roammate.app');
    expect(ics).toContain('SUMMARY:Burj Khalifa Observation Deck');
    expect(ics).toContain('LOCATION:Downtown Dubai');
    expect(ics).toContain('Level 148 At the Top tickets booked online');
  });

  it('escapes special RFC 5545 characters such as commas and semicolons', () => {
    const tripWithSpecialChars: Trip = {
      ...mockSampleTrip,
      title: 'Trip; Paris, London & Rome',
      flights: [],
      documents: [],
      days: [],
    };

    const ics = generateIcalendarFeed(tripWithSpecialChars);
    expect(ics).toContain('X-WR-CALNAME:Trip\\; Paris\\, London & Rome');
  });
});
