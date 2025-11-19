import React, { useState } from 'react';
import {
  Calendar,
  ExternalLink,
  Navigation2,
  Plane,
  Plus,
  Radio,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import { Flight } from '../types/trip';

interface FlightTrackerProps {
  flights: Flight[];
  onAddFlight: (flight: Flight) => void;
  onDeleteFlight: (id: string) => void;
}

export const FlightTracker: React.FC<FlightTrackerProps> = ({
  flights,
  onAddFlight,
  onDeleteFlight,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flightNumber, setFlightNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [date, setDate] = useState('');
  const [depAirport, setDepAirport] = useState('');
  const [depTime, setDepTime] = useState('');
  const [arrAirport, setArrAirport] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [seat, setSeat] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightNumber || !depAirport || !arrAirport) return;

    const newFlight: Flight = {
      id: `fl_${Date.now()}`,
      flightNumber: flightNumber.toUpperCase().trim(),
      carrier: carrier.trim() || 'Airline',
      date: date || new Date().toISOString().split('T')[0],
      departure: {
        airport: depAirport.toUpperCase().trim(),
        city: depAirport.toUpperCase().trim(),
        time: depTime || '12:00',
      },
      arrival: {
        airport: arrAirport.toUpperCase().trim(),
        city: arrAirport.toUpperCase().trim(),
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
    setDepAirport('');
    setDepTime('');
    setArrAirport('');
    setArrTime('');
    setBookingRef('');
    setSeat('');
    setNotes('');
  };

  return (
    <div className="flights-container">
      {/* Header */}
      <div className="section-toolbar">
        <div>
          <h2 className="section-heading">Flight Boarding Passes</h2>
          <p className="section-subheading">
            Live FlightRadar24 tracking links & boarding pass vault
          </p>
        </div>

        <button className="primary-action-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Add Flight</span>
        </button>
      </div>

      {/* Flight Cards Grid */}
      <div className="flights-grid">
        {flights.length === 0 ? (
          <div className="empty-state-box">
            <Plane size={36} className="text-slate" />
            <p className="empty-state-text">No flights added yet.</p>
            <button className="secondary-action-btn" onClick={() => setIsModalOpen(true)}>
              Add your first flight
            </button>
          </div>
        ) : (
          flights.map((fl) => {
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
                      title="Delete flight"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Airports & Route Line */}
                <div className="pass-route-row">
                  <div className="airport-block">
                    <span className="airport-code">{fl.departure.airport}</span>
                    <span className="airport-time">{fl.departure.time}</span>
                    <span className="airport-meta">
                      {fl.departure.terminal || 'Departure'}
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
                      {fl.arrival.terminal || 'Arrival'}
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
                </div>

                {fl.notes && <div className="pass-notes-strip">{fl.notes}</div>}
              </div>
            );
          })
        )}
      </div>

      {/* Add Flight Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="auth-header-icon">
                  <Plane size={18} className="text-blue" />
                </div>
                <div>
                  <h3 className="modal-title">Add Flight</h3>
                  <p className="modal-subtitle">Auto-links to free FlightRadar24 live radar</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-content-col">
              <div className="form-row-2">
                <div>
                  <label className="form-label">Flight Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JL005, BA178"
                    className="form-input"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Airline / Carrier</label>
                  <input
                    type="text"
                    placeholder="e.g. Japan Airlines"
                    className="form-input"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Departure Airport (IATA) *</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. JFK"
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
                    placeholder="e.g. HND"
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

              <div className="form-row-3">
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
                  <label className="form-label">Booking Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC789"
                    className="form-input"
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Seat</label>
                  <input
                    type="text"
                    placeholder="e.g. 24A"
                    className="form-input"
                    value={seat}
                    onChange={(e) => setSeat(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Terminal 1, includes dinner"
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="primary-modal-btn">
                Save Flight
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
