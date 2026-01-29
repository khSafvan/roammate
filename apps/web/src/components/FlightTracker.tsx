import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  Globe,
  Navigation2,
  Plane,
  Plus,
  Radio,
  Tag,
  Ticket,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { Flight } from '../types/trip';

interface FlightTrackerProps {
  flights: Flight[];
  onAddFlight: (flight: Flight) => void;
  onDeleteFlight: (id: string) => void;
}

export const FlightTracker = React.memo<FlightTrackerProps>(function FlightTracker({
  flights,
  onAddFlight,
  onDeleteFlight,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPassengerFilter, setSelectedPassengerFilter] = useState<string>('all');

  // Form states
  const [flightNumber, setFlightNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [date, setDate] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [depAirport, setDepAirport] = useState('');
  const [depTime, setDepTime] = useState('');
  const [arrAirport, setArrAirport] = useState('');
  const [arrCity, setArrCity] = useState('');
  const [arrCountry, setArrCountry] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [cabinClass, setCabinClass] = useState<'Economy' | 'Premium Economy' | 'Business' | 'First'>('Economy');
  const [bookingRef, setBookingRef] = useState('');
  const [eTicketNumber, setETicketNumber] = useState('');
  const [seat, setSeat] = useState('');
  const [notes, setNotes] = useState('');

  // Extract distinct passenger names
  const passengers = useMemo(() => {
    const names = new Set<string>();
    flights.forEach((f) => {
      if (f.passengerName) names.add(f.passengerName);
    });
    return Array.from(names);
  }, [flights]);

  // Filter flights by selected passenger
  const filteredFlights = useMemo(() => {
    if (selectedPassengerFilter === 'all') return flights;
    return flights.filter((f) => f.passengerName === selectedPassengerFilter);
  }, [flights, selectedPassengerFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightNumber || !depAirport || !arrAirport) return;

    const newFlight: Flight = {
      id: `fl_${Date.now()}`,
      flightNumber: flightNumber.toUpperCase().trim(),
      carrier: carrier.trim() || 'Airline',
      date: date || new Date().toISOString().split('T')[0],
      passengerName: passengerName.trim() || undefined,
      originCountry: originCountry.trim() || undefined,
      originCity: originCity.trim() || undefined,
      cabinClass,
      eTicketNumber: eTicketNumber.trim() || undefined,
      departure: {
        airport: depAirport.toUpperCase().trim(),
        city: originCity.trim() || depAirport.toUpperCase().trim(),
        country: originCountry.trim() || undefined,
        time: depTime || '12:00',
      },
      arrival: {
        airport: arrAirport.toUpperCase().trim(),
        city: arrCity.trim() || arrAirport.toUpperCase().trim(),
        country: arrCountry.trim() || undefined,
        time: arrTime || '14:30',
      },
      bookingRef: bookingRef.trim() || undefined,
      seat: seat.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onAddFlight(newFlight);
    setIsModalOpen(false);

    // Reset form
    setFlightNumber('');
    setCarrier('');
    setDate('');
    setPassengerName('');
    setOriginCountry('');
    setOriginCity('');
    setDepAirport('');
    setDepTime('');
    setArrAirport('');
    setArrCity('');
    setArrCountry('');
    setArrTime('');
    setCabinClass('Economy');
    setBookingRef('');
    setETicketNumber('');
    setSeat('');
    setNotes('');
  };

  return (
    <div className="flights-container">
      {/* Header & Companion Multi-Origin Banner */}
      <div className="section-toolbar">
        <div>
          <h2 className="section-heading">Flight Boarding Passes & Tickets</h2>
          <p className="section-subheading">
            Live FlightRadar24 tracking & multi-origin companion arrival passes
          </p>
        </div>

        <button className="primary-action-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Add Flight Ticket</span>
        </button>
      </div>

      {/* Companion Filter Chips (when multi-passenger flights exist) */}
      {passengers.length > 0 && (
        <div className="passenger-filter-bar">
          <span className="passenger-filter-label">
            <Users size={13} />
            <span>Travelers:</span>
          </span>
          <button
            className={`passenger-chip ${selectedPassengerFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedPassengerFilter('all')}
          >
            All Travelers ({flights.length})
          </button>
          {passengers.map((p) => (
            <button
              key={p}
              className={`passenger-chip ${selectedPassengerFilter === p ? 'active' : ''}`}
              onClick={() => setSelectedPassengerFilter(p)}
            >
              <User size={11} />
              <span>{p}</span>
            </button>
          ))}
        </div>
      )}

      {/* Flight Cards Grid */}
      <div className="flights-grid">
        {filteredFlights.length === 0 ? (
          <div className="empty-state-box">
            <Plane size={36} className="text-slate" />
            <p className="empty-state-text">
              {flights.length === 0
                ? 'No flights or airplane tickets added yet.'
                : 'No flights found for this passenger filter.'}
            </p>
            <button className="secondary-action-btn" onClick={() => setIsModalOpen(true)}>
              Add flight boarding pass
            </button>
          </div>
        ) : (
          filteredFlights.map((fl) => {
            const flightTrackerUrl = `https://www.flightradar24.com/data/flights/${fl.flightNumber.toLowerCase()}`;

            return (
              <div key={fl.id} className="boarding-pass-card">
                {/* Boarding Pass Header */}
                <div className="pass-header">
                  <div className="pass-carrier-row">
                    <Plane size={16} className="text-blue" />
                    <span className="pass-carrier">{fl.carrier}</span>
                    <span className="pass-flight-num">{fl.flightNumber}</span>
                  </div>
                  <div className="pass-header-actions">
                    <a
                      href={flightTrackerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="live-radar-tag"
                      title="Open Live FlightRadar24 Tracker"
                    >
                      <Radio size={12} className="radar-pulse" />
                      <span>Live Radar</span>
                      <ExternalLink size={10} />
                    </a>
                    <button
                      className="pass-delete-btn"
                      onClick={() => onDeleteFlight(fl.id)}
                      title="Delete flight ticket"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Multi-Origin Companion Passenger Ribbon */}
                {(fl.passengerName || fl.originCountry || fl.cabinClass) && (
                  <div className="passenger-ticket-ribbon">
                    {fl.passengerName && (
                      <span className="passenger-badge">
                        <User size={12} className="text-blue" />
                        <strong>{fl.passengerName}</strong>
                      </span>
                    )}
                    {(fl.originCountry || fl.originCity) && (
                      <span className="origin-badge">
                        <Globe size={11} className="text-slate" />
                        <span>
                          From {fl.originCity ? `${fl.originCity}, ` : ''}
                          {fl.originCountry || fl.departure.city}
                        </span>
                      </span>
                    )}
                    {fl.cabinClass && (
                      <span className="cabin-badge">
                        <Tag size={11} />
                        <span>{fl.cabinClass}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Airports & Route Line */}
                <div className="pass-route-row">
                  <div className="airport-block">
                    <span className="airport-code">{fl.departure.airport}</span>
                    <span className="airport-time">{fl.departure.time}</span>
                    <span className="airport-meta">
                      {fl.departure.city || fl.departure.terminal || 'Departure'}
                    </span>
                  </div>

                  <div className="route-graphic">
                    <div className="route-line-decor" />
                    <Navigation2 size={18} className="plane-graphic-icon" />
                    <div className="route-line-decor" />
                  </div>

                  <div className="airport-block text-right">
                    <span className="airport-code">{fl.arrival.airport}</span>
                    <span className="airport-time">
                      {fl.arrival.time}
                      {fl.arrival.nextDay && <sup className="next-day-sup">+1d</sup>}
                    </span>
                    <span className="airport-meta">
                      {fl.arrival.city || fl.arrival.terminal || 'Arrival'}
                    </span>
                  </div>
                </div>

                {/* Boarding Pass Tear-Off Footer */}
                <div className="pass-footer">
                  <div className="pass-stub-item">
                    <Calendar size={12} />
                    <span>{fl.date}</span>
                  </div>

                  {fl.seat && (
                    <div className="pass-stub-item">
                      <Ticket size={12} />
                      <span>Seat: {fl.seat}</span>
                    </div>
                  )}

                  {fl.bookingRef && (
                    <div className="pass-stub-item">
                      <span className="stub-ref">Ref: {fl.bookingRef}</span>
                    </div>
                  )}

                  {fl.eTicketNumber && (
                    <div className="pass-stub-item">
                      <span className="stub-eticket font-mono">{fl.eTicketNumber}</span>
                    </div>
                  )}
                </div>

                {fl.notes && <div className="pass-notes-strip">{fl.notes}</div>}
              </div>
            );
          })
        )}
      </div>

      {/* Add Flight Ticket Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px' }}
          >
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="auth-header-icon">
                  <Plane size={18} className="text-blue" />
                </div>
                <div>
                  <h3 className="modal-title">Add Airplane Ticket / Boarding Pass</h3>
                  <p className="modal-subtitle">
                    Supports travelers flying in from different cities &amp; countries
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-content-col">
              {/* Passenger & Origin Details */}
              <div className="form-row-2">
                <div>
                  <label className="form-label">Passenger / Companion Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex, Elena (London), Carlos"
                    className="form-input"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Cabin Class</label>
                  <select
                    className="form-input"
                    value={cabinClass}
                    onChange={(e: any) => setCabinClass(e.target.value)}
                  >
                    <option value="Economy">Economy</option>
                    <option value="Premium Economy">Premium Economy</option>
                    <option value="Business">Business</option>
                    <option value="First">First Class</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Originating Country</label>
                  <input
                    type="text"
                    placeholder="e.g. United Kingdom, Spain, USA"
                    className="form-input"
                    value={originCountry}
                    onChange={(e) => setOriginCountry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Originating City</label>
                  <input
                    type="text"
                    placeholder="e.g. London, Madrid, New York"
                    className="form-input"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                  />
                </div>
              </div>

              {/* Flight Number & Carrier */}
              <div className="form-row-2">
                <div>
                  <label className="form-label">Flight Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JL005, BA007, EK318"
                    className="form-input"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Airline / Carrier</label>
                  <input
                    type="text"
                    placeholder="e.g. Japan Airlines, British Airways"
                    className="form-input"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                  />
                </div>
              </div>

              {/* Airports & Departure / Arrival */}
              <div className="form-row-2">
                <div>
                  <label className="form-label">Departure Airport (IATA) *</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. JFK, LHR, MAD"
                    className="form-input text-uppercase"
                    value={depAirport}
                    onChange={(e) => setDepAirport(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Departure Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 13:15"
                    className="form-input"
                    value={depTime}
                    onChange={(e) => setDepTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Arrival Airport (IATA) *</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. HND, NRT, CDG"
                    className="form-input text-uppercase"
                    value={arrAirport}
                    onChange={(e) => setArrAirport(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Arrival Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 16:30"
                    className="form-input"
                    value={arrTime}
                    onChange={(e) => setArrTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Flight Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Seat Assignment</label>
                  <input
                    type="text"
                    placeholder="e.g. 24A, 31K"
                    className="form-input"
                    value={seat}
                    onChange={(e) => setSeat(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Booking Reference / PNR</label>
                  <input
                    type="text"
                    placeholder="e.g. JAL-NY88"
                    className="form-input"
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">E-Ticket Number</label>
                  <input
                    type="text"
                    placeholder="e.g. ETKT-09284192"
                    className="form-input"
                    value={eTicketNumber}
                    onChange={(e) => setETicketNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Flight Notes / Baggage Rules</label>
                <input
                  type="text"
                  placeholder="e.g. Meet Alex at Terminal 3 arrivals, includes 2 checked bags"
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions-row mt-3">
                <button
                  type="button"
                  className="secondary-action-btn flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-modal-btn flex-1">
                  <Plane size={15} />
                  <span>Save Boarding Pass</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
