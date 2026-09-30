import React from 'react';
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

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    onSave({
      id: initialFlight?.id || 'fl_' + Math.random().toString(36).substr(2, 9),
      carrier: data.carrier as string,
      flightNumber: data.flightNumber as string,
      date: data.date as string,
      bookingRef: data.bookingRef as string,
      passengerName: data.passengerName as string,
      departure: { ...initialFlight?.departure, airport: data.depAirport as string, city: '', time: '' },
      arrival: { ...initialFlight?.arrival, airport: data.arrAirport as string, city: '', time: '' }
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
            <input type="text" name="carrier" className="form-input" defaultValue={initialFlight?.carrier} required />
          </div>
          <div className="form-group">
            <label>Flight Number</label>
            <input type="text" name="flightNumber" className="form-input" defaultValue={initialFlight?.flightNumber} required />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" name="date" className="form-input" defaultValue={initialFlight?.date} required />
          </div>
          <div className="form-group">
            <label>Departure Airport Code</label>
            <input type="text" name="depAirport" className="form-input" defaultValue={initialFlight?.departure?.airport} required />
          </div>
          <div className="form-group">
            <label>Arrival Airport Code</label>
            <input type="text" name="arrAirport" className="form-input" defaultValue={initialFlight?.arrival?.airport} required />
          </div>
          <div className="form-group full-span">
            <label>Traveler / Passenger</label>
            <select name="passengerName" className="form-input" defaultValue={initialFlight?.passengerName}>
              <option value="">Select Passenger...</option>
              {travelers.map(t => <option key={t} value={t}>{t}</option>)}
              <option value={travelers.join(' & ')}>Both ({travelers.join(' & ')})</option>
            </select>
          </div>
          <div className="form-group full-span">
            <label>Booking Reference (PNR)</label>
            <input type="text" name="bookingRef" className="form-input" defaultValue={initialFlight?.bookingRef} />
          </div>
          <div className="form-group full-span" style={{ marginTop: '16px' }}>
            <button type="submit" className="primary-action-btn" style={{ width: '100%' }}>Save Flight</button>
          </div>
        </form>
      </div>
    </div>
  );
};
