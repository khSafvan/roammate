import React, { useState, useEffect } from 'react';
import { Plane, X } from 'lucide-react';
import { Flight } from '../../types/trip';

interface FlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flight: Flight) => void;
  initialFlight?: Flight;
  travelers?: string[];
}

export const FlightModal: React.FC<FlightModalProps> = ({ isOpen, onClose, onSave, initialFlight, travelers = [] }) => {
  const [carrier, setCarrier] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [date, setDate] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [depAirport, setDepAirport] = useState('');
  const [arrAirport, setArrAirport] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialFlight) {
        setCarrier(initialFlight.carrier || '');
        setFlightNumber(initialFlight.flightNumber || '');
        setBookingRef(initialFlight.bookingRef || '');
        setDate(initialFlight.date || '');
        setPassengerName(initialFlight.passengerName || '');
        setDepAirport(initialFlight.departure?.airport || '');
        setArrAirport(initialFlight.arrival?.airport || '');
      } else {
        setCarrier(''); setFlightNumber(''); setBookingRef(''); setDate(''); setPassengerName(''); setDepAirport(''); setArrAirport('');
      }
    }
  }, [isOpen, initialFlight]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialFlight?.id || 'fl_' + Math.random().toString(36).substr(2, 9),
      carrier,
      flightNumber,
      date,
      bookingRef,
      passengerName,
      departure: { ...initialFlight?.departure, airport: depAirport, city: '', time: '' },
      arrival: { ...initialFlight?.arrival, airport: arrAirport, city: '', time: '' }
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-icon-container">
              <Plane size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">{initialFlight ? 'Edit Flight' : 'Add Flight'}</h3>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="modal-body form-grid">
          <div className="form-group">
            <label>Carrier</label>
            <input type="text" className="form-input" value={carrier} onChange={e => setCarrier(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Flight Number</label>
            <input type="text" className="form-input" value={flightNumber} onChange={e => setFlightNumber(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Departure Airport Code</label>
            <input type="text" className="form-input" value={depAirport} onChange={e => setDepAirport(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Arrival Airport Code</label>
            <input type="text" className="form-input" value={arrAirport} onChange={e => setArrAirport(e.target.value)} required />
          </div>
          <div className="form-group full-span">
            <label>Traveler / Passenger</label>
            <select className="form-input" value={passengerName} onChange={e => setPassengerName(e.target.value)}>
              <option value="">Select Passenger...</option>
              {travelers.map(t => <option key={t} value={t}>{t}</option>)}
              <option value={travelers.join(' & ')}>Both ({travelers.join(' & ')})</option>
            </select>
          </div>
          <div className="form-group full-span">
            <label>Booking Reference (PNR)</label>
            <input type="text" className="form-input" value={bookingRef} onChange={e => setBookingRef(e.target.value)} />
          </div>
          <div className="form-group full-span" style={{ marginTop: '16px' }}>
            <button type="submit" className="primary-action-btn" style={{ width: '100%' }}>Save Flight</button>
          </div>
        </form>
      </div>
    </div>
  );
};
